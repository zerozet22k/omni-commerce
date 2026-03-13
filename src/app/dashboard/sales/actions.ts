"use server";

import { Types } from "mongoose";
import { z } from "zod";

import {
  failAction,
  finishAction,
  getReturnTo,
  readCheckbox,
  readIds,
  readOptionalText,
  readText,
} from "@/app/dashboard/action-helpers";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { AppError } from "@/lib/errors/app-error";
import { readOptionalImageUpload, storeUploadedImageAsset } from "@/lib/media/upload";
import { OrderModel } from "@/modules/orders/orders.models";
import { ReviewModel } from "@/modules/engagement/engagement.models";
import { syncProductReviewAggregates } from "@/modules/engagement/review-aggregates";
import { systemEventsService } from "@/modules/content/system-events.service";
import { PaymentModel, PaymentTransactionModel } from "@/modules/payments/payments.models";
import { GiftCardModel, GiftCardTransactionModel } from "@/modules/pricing/pricing.models";
import { ShipmentModel } from "@/modules/shipments/shipments.models";
import { shipmentsService } from "@/modules/shipments/shipments.service";

const SALES_REVALIDATE_PATHS = [
  "/dashboard/orders",
  "/dashboard/orders/returns",
  "/dashboard/sales/payments",
  "/dashboard/sales/shipments",
  "/dashboard/sales/refunds",
  "/dashboard/sales/reviews",
  "/dashboard/sales/gift-cards",
] as const;

function parseSalesSchema<T>(schema: z.ZodType<T>, input: unknown) {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "Invalid sales input.", 400);
  }

  return parsed.data;
}

const paymentUpdateSchema = z.object({
  paymentId: z.string().trim().min(1, "Payment id is required."),
  status: z.enum(["SUBMITTED", "AUTHORIZED", "CONFIRMED", "REJECTED", "REFUNDED"]),
  transactionRef: z.string().trim().max(120).optional(),
  note: z.string().trim().optional(),
});

const shipmentUpdateSchema = z.object({
  shipmentId: z.string().trim().min(1, "Shipment id is required."),
  status: z.enum(["PENDING", "PACKING", "OUT_FOR_DELIVERY", "DELIVERED", "RETURNED"]),
  courierName: z.string().trim().max(100).optional(),
  trackingNo: z.string().trim().max(100).optional(),
  note: z.string().trim().max(255).optional(),
});

const shipmentPackageSchema = z.object({
  shipmentId: z.string().trim().min(1, "Shipment id is required."),
  packageNo: z.string().trim().max(40).optional(),
  weightGrams: z.coerce.number().min(0).optional(),
  lengthCm: z.coerce.number().min(0).optional(),
  widthCm: z.coerce.number().min(0).optional(),
  heightCm: z.coerce.number().min(0).optional(),
});

const shipmentEventSchema = z.object({
  shipmentId: z.string().trim().min(1, "Shipment id is required."),
  status: z.enum(["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"]),
  location: z.string().trim().max(120).optional(),
  message: z.string().trim().max(255).optional(),
});

const refundUpdateSchema = z.object({
  refundId: z.string().trim().min(1, "Refund id is required."),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "PAID"]),
  reason: z.string().trim().max(255).optional(),
});

const reviewUpdateSchema = z.object({
  reviewId: z.string().trim().min(1, "Review id is required."),
  title: z.string().trim().max(120).optional(),
  comment: z.string().trim().optional(),
  isVisible: z.boolean(),
});

const giftCardCreateSchema = z.object({
  code: z.string().trim().min(1, "Gift card code is required.").max(50),
  initialBalance: z.coerce.number().min(0, "Opening balance must be zero or greater."),
  currencyCode: z.string().trim().min(3).max(3),
  expiresAt: z.string().trim().optional(),
  isActive: z.boolean(),
});

const giftCardUpdateSchema = z.object({
  giftCardId: z.string().trim().min(1, "Gift card id is required."),
  code: z.string().trim().min(1, "Gift card code is required.").max(50),
  expiresAt: z.string().trim().optional(),
  isActive: z.boolean(),
});

function parseOptionalDate(value?: string) {
  if (!value) {
    return undefined;
  }

  const nextDate = new Date(value);
  return Number.isNaN(nextDate.getTime()) ? undefined : nextDate;
}

function readBulkIds(formData: FormData, returnTo: string) {
  const ids = Array.from(new Set(readIds(formData, "selectedIds").filter(Boolean)));

  if (ids.length === 0) {
    failAction(returnTo, "Select at least one record first.", "amber");
  }

  return ids;
}

export async function updatePaymentAction(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.ordersView);
  const returnTo = getReturnTo(formData, "/dashboard/sales/payments");
  const payload = parseSalesSchema(paymentUpdateSchema, {
    paymentId: readText(formData, "paymentId"),
    status: readText(formData, "status") || "SUBMITTED",
    transactionRef: readOptionalText(formData, "transactionRef"),
    note: readOptionalText(formData, "note"),
  });

  const payment = await PaymentModel.findById(payload.paymentId).exec();

  if (!payment) {
    throw new AppError("Payment record was not found.", 404);
  }

  await PaymentModel.findByIdAndUpdate(payload.paymentId, {
    status: payload.status,
    transactionRef: payload.transactionRef,
    confirmedAt: payload.status === "CONFIRMED" ? payment.confirmedAt ?? new Date() : payment.confirmedAt,
    confirmedBy: payload.status === "CONFIRMED" ? user.id : payment.confirmedBy,
  }).exec();

  await PaymentTransactionModel.create({
    paymentId: payload.paymentId,
    gatewayName: "Admin",
    gatewayTransactionId: payload.transactionRef,
    transactionType:
      payload.status === "REFUNDED"
        ? "REFUND"
        : payload.status === "CONFIRMED"
          ? "MANUAL_CONFIRM"
          : "AUTH",
    amount: payment.amount,
    currencyCode: payment.currencyCode,
    status:
      payload.status === "REJECTED"
        ? "FAILED"
        : payload.status === "SUBMITTED"
          ? "PENDING"
          : "SUCCESS",
    rawResponse: payload.note,
    createdAt: new Date(),
  });

  await systemEventsService.recordAuditLog({
    actorUserId: user.id,
    action: "PAYMENT_UPDATE",
    entityType: "PAYMENT",
    entityId: payload.paymentId,
    afterData: {
      status: payload.status,
      transactionRef: payload.transactionRef,
    },
  });

  if (payload.status === "CONFIRMED" || payload.status === "REFUNDED") {
    const orderId = payment.orderId?.toString?.() ?? String(payment.orderId ?? "");
    const order = orderId ? await OrderModel.findById(orderId).select("customerId orderNo").lean().exec() : null;
    await systemEventsService.recordNotification({
      userId: order?.customerId?.toString?.() ?? String(order?.customerId ?? ""),
      type: payload.status === "CONFIRMED" ? "PAYMENT_CONFIRMED" : "REFUND_UPDATED",
      title:
        payload.status === "CONFIRMED"
          ? `Payment confirmed for ${order?.orderNo ?? "your order"}`
          : `Payment refunded for ${order?.orderNo ?? "your order"}`,
      body:
        payload.status === "CONFIRMED"
          ? "Your payment has been confirmed."
          : "A payment refund update was recorded for your order.",
      relatedType: "PAYMENT",
      relatedId: payload.paymentId,
    });
  }

  finishAction(returnTo, [...SALES_REVALIDATE_PATHS]);
}

export async function updateShipmentAction(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.ordersView);
  const returnTo = getReturnTo(formData, "/dashboard/sales/shipments");
  const payload = parseSalesSchema(shipmentUpdateSchema, {
    shipmentId: readText(formData, "shipmentId"),
    status: readText(formData, "status") || "PENDING",
    courierName: readOptionalText(formData, "courierName"),
    trackingNo: readOptionalText(formData, "trackingNo"),
    note: readOptionalText(formData, "note"),
  });

  const shipment = await ShipmentModel.findById(payload.shipmentId).exec();

  if (!shipment) {
    throw new AppError("Shipment record was not found.", 404);
  }

  await ShipmentModel.findByIdAndUpdate(payload.shipmentId, {
    status: payload.status,
    courierName: payload.courierName,
    trackingNo: payload.trackingNo,
    note: payload.note,
    shippedAt:
      payload.status === "PACKING" || payload.status === "OUT_FOR_DELIVERY"
        ? shipment.shippedAt ?? new Date()
        : shipment.shippedAt,
    deliveredAt:
      payload.status === "DELIVERED" ? shipment.deliveredAt ?? new Date() : shipment.deliveredAt,
  }).exec();

  await systemEventsService.recordAuditLog({
    actorUserId: user.id,
    action: "SHIPMENT_UPDATE",
    entityType: "SHIPMENT",
    entityId: payload.shipmentId,
    afterData: {
      status: payload.status,
      courierName: payload.courierName,
      trackingNo: payload.trackingNo,
    },
  });

  const order = await OrderModel.findById(shipment.orderId)
    .select("customerId orderNo")
    .lean()
    .exec();
  await systemEventsService.recordNotification({
    userId: order?.customerId?.toString?.() ?? String(order?.customerId ?? ""),
    type: "SHIPMENT_UPDATED",
    title: `Shipment updated for ${order?.orderNo ?? "your order"}`,
    body: `Shipment status changed to ${payload.status}.`,
    relatedType: "SHIPMENT",
    relatedId: payload.shipmentId,
  });

  finishAction(returnTo, [...SALES_REVALIDATE_PATHS]);
}

export async function addShipmentPackageAction(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.ordersView);
  const returnTo = getReturnTo(formData, "/dashboard/sales/shipments");
  const payload = parseSalesSchema(shipmentPackageSchema, {
    shipmentId: readText(formData, "shipmentId"),
    packageNo: readOptionalText(formData, "packageNo"),
    weightGrams: readOptionalText(formData, "weightGrams"),
    lengthCm: readOptionalText(formData, "lengthCm"),
    widthCm: readOptionalText(formData, "widthCm"),
    heightCm: readOptionalText(formData, "heightCm"),
  });

  const existingShipment = await ShipmentModel.findById(payload.shipmentId)
    .select("_id")
    .lean()
    .exec();

  if (!existingShipment) {
    throw new AppError("Shipment record was not found.", 404);
  }

  const labelFile = readOptionalImageUpload(formData, "labelFile");
  const labelAsset = labelFile
    ? await storeUploadedImageAsset(labelFile, {
        directory: "shipments",
        title: payload.packageNo ? `${payload.packageNo} label` : "Shipment label",
        altText: payload.packageNo ? `${payload.packageNo} label` : "Shipment label",
      })
    : null;

  const shipmentPackage = await shipmentsService.createShipmentPackage({
    shipmentId: payload.shipmentId,
    packageNo: payload.packageNo,
    weightGrams: payload.weightGrams,
    lengthCm: payload.lengthCm,
    widthCm: payload.widthCm,
    heightCm: payload.heightCm,
    labelAssetId: labelAsset ? String(labelAsset.id) : undefined,
  });

  await systemEventsService.recordAuditLog({
    actorUserId: user.id,
    action: "SHIPMENT_PACKAGE_CREATE",
    entityType: "SHIPMENT",
    entityId: payload.shipmentId,
    afterData: {
      shipmentPackageId: shipmentPackage.id,
      packageNo: payload.packageNo,
      labelAssetId: labelAsset ? String(labelAsset.id) : null,
    },
  });

  finishAction(returnTo, [...SALES_REVALIDATE_PATHS]);
}

export async function addShipmentTrackingEventAction(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.ordersView);
  const returnTo = getReturnTo(formData, "/dashboard/sales/shipments");
  const payload = parseSalesSchema(shipmentEventSchema, {
    shipmentId: readText(formData, "shipmentId"),
    status: readText(formData, "status") || "IN_TRANSIT",
    location: readOptionalText(formData, "location"),
    message: readOptionalText(formData, "message"),
  });

  const trackingEvent = await shipmentsService.addTrackingEvent({
    shipmentId: payload.shipmentId,
    status: payload.status,
    location: payload.location,
    message: payload.message,
  });

  await systemEventsService.recordAuditLog({
    actorUserId: user.id,
    action: "SHIPMENT_TRACKING_EVENT_CREATE",
    entityType: "SHIPMENT",
    entityId: payload.shipmentId,
    afterData: {
      trackingEventId: trackingEvent.id,
      status: payload.status,
      location: payload.location,
    },
  });

  finishAction(returnTo, [...SALES_REVALIDATE_PATHS]);
}

export async function updateRefundAction(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.ordersView);
  const returnTo = getReturnTo(formData, "/dashboard/sales/refunds");
  const payload = parseSalesSchema(refundUpdateSchema, {
    refundId: readText(formData, "refundId"),
    status: readText(formData, "status") || "PENDING",
    reason: readOptionalText(formData, "reason"),
  });

  const { RefundModel } = await import("@/modules/engagement/engagement.models");
  const refund = await RefundModel.findById(payload.refundId).exec();

  if (!refund) {
    throw new AppError("Refund record was not found.", 404);
  }

  await RefundModel.findByIdAndUpdate(payload.refundId, {
    status: payload.status,
    reason: payload.reason,
    processedAt: payload.status === "PENDING" ? refund.processedAt : refund.processedAt ?? new Date(),
    processedBy: payload.status === "PENDING" ? refund.processedBy : user.id,
  }).exec();

  await systemEventsService.recordAuditLog({
    actorUserId: user.id,
    action: "REFUND_UPDATE",
    entityType: "REFUND",
    entityId: payload.refundId,
    afterData: {
      status: payload.status,
      reason: payload.reason,
    },
  });

  const refundOrder = await OrderModel.findById(refund.orderId)
    .select("customerId orderNo")
    .lean()
    .exec();
  await systemEventsService.recordNotification({
    userId: refundOrder?.customerId?.toString?.() ?? String(refundOrder?.customerId ?? ""),
    type: "REFUND_UPDATED",
    title: `Refund updated for ${refundOrder?.orderNo ?? "your order"}`,
    body: `Refund status changed to ${payload.status}.`,
    relatedType: "REFUND",
    relatedId: payload.refundId,
  });

  finishAction(returnTo, [...SALES_REVALIDATE_PATHS]);
}

export async function updateReviewAction(formData: FormData) {
  await requirePermission(PERMISSIONS.ordersView);
  const returnTo = getReturnTo(formData, "/dashboard/sales/reviews");
  const payload = parseSalesSchema(reviewUpdateSchema, {
    reviewId: readText(formData, "reviewId"),
    title: readOptionalText(formData, "title"),
    comment: readOptionalText(formData, "comment"),
    isVisible: readCheckbox(formData, "isVisible"),
  });

  if (!Types.ObjectId.isValid(payload.reviewId)) {
    throw new AppError("Review record was not found.", 404);
  }

  const existingReview = await ReviewModel.findById(payload.reviewId)
    .select("productId")
    .lean()
    .exec();

  if (!existingReview) {
    throw new AppError("Review record was not found.", 404);
  }

  await ReviewModel.findByIdAndUpdate(payload.reviewId, {
    title: payload.title,
    comment: payload.comment,
    isVisible: payload.isVisible,
  }).exec();

  await syncProductReviewAggregates([String(existingReview.productId ?? "")]);
  finishAction(returnTo, [...SALES_REVALIDATE_PATHS]);
}

export async function bulkReviewAction(formData: FormData) {
  await requirePermission(PERMISSIONS.ordersView);
  const returnTo = getReturnTo(formData, "/dashboard/sales/reviews");
  const bulkAction = readText(formData, "bulkAction");
  const reviewIds = readBulkIds(formData, returnTo);

  if (bulkAction !== "show" && bulkAction !== "hide") {
    failAction(returnTo, "Unsupported review bulk action.", "amber");
  }

  const reviews = (await ReviewModel.find({ _id: { $in: reviewIds } })
    .select("productId")
    .lean()
    .exec()) as Array<{
    productId?: unknown;
  }>;

  await ReviewModel.updateMany(
    { _id: { $in: reviewIds } },
    { isVisible: bulkAction === "show" },
  ).exec();

  await syncProductReviewAggregates(
    reviews.map((review) => String(review.productId ?? "")).filter(Boolean),
  );
  finishAction(returnTo, [...SALES_REVALIDATE_PATHS]);
}

export async function saveGiftCardAction(formData: FormData) {
  await requirePermission(PERMISSIONS.ordersView);
  const giftCardId = readText(formData, "giftCardId");
  const returnTo = getReturnTo(formData, "/dashboard/sales/gift-cards");

  if (giftCardId && Types.ObjectId.isValid(giftCardId)) {
    const payload = parseSalesSchema(giftCardUpdateSchema, {
      giftCardId,
      code: readText(formData, "code").toUpperCase(),
      expiresAt: readOptionalText(formData, "expiresAt"),
      isActive: readCheckbox(formData, "isActive"),
    });

    const existingGiftCard = await GiftCardModel.findById(payload.giftCardId)
      .select("_id")
      .lean()
      .exec();

    if (!existingGiftCard) {
      throw new AppError("Gift card record was not found.", 404);
    }

    await GiftCardModel.findByIdAndUpdate(payload.giftCardId, {
      code: payload.code,
      expiresAt: parseOptionalDate(payload.expiresAt),
      isActive: payload.isActive,
    }).exec();

    finishAction(returnTo, ["/dashboard/sales/gift-cards"]);
  }

  const payload = parseSalesSchema(giftCardCreateSchema, {
    code: readText(formData, "code").toUpperCase(),
    initialBalance: readText(formData, "initialBalance"),
    currencyCode: readText(formData, "currencyCode").toUpperCase(),
    expiresAt: readOptionalText(formData, "expiresAt"),
    isActive: readCheckbox(formData, "isActive"),
  });

  const giftCard = await GiftCardModel.create({
    code: payload.code,
    initialBalance: payload.initialBalance,
    currentBalance: payload.initialBalance,
    currencyCode: payload.currencyCode,
    expiresAt: parseOptionalDate(payload.expiresAt),
    isActive: payload.isActive,
    createdAt: new Date(),
  });

  await GiftCardTransactionModel.create({
    giftCardId: giftCard._id,
    amount: payload.initialBalance,
    transactionType: "ISSUE",
    createdAt: new Date(),
  });

  finishAction(returnTo || `/dashboard/sales/gift-cards/${giftCard.id}`, [
    "/dashboard/sales/gift-cards",
  ]);
}
