"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { Types } from "mongoose";

import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { AppError } from "@/lib/errors/app-error";
import { ProductVariantModel } from "@/modules/catalog/catalog.models";
import { systemEventsService } from "@/modules/content/system-events.service";
import { RefundModel, ReturnModel } from "@/modules/engagement/engagement.models";
import { OrderItemModel, OrderModel } from "@/modules/orders/orders.models";
import { ordersService } from "@/modules/orders/orders.service";
import { PaymentMethodModel, PaymentModel } from "@/modules/payments/payments.models";
import { paymentsService } from "@/modules/payments/payments.service";
import { ShipmentModel } from "@/modules/shipments/shipments.models";
import { shipmentsService } from "@/modules/shipments/shipments.service";
import { UserModel } from "@/modules/users/user.model";
import {
  failAction,
  finishAction,
  getReturnTo,
  readNumber,
  readOptionalText,
  readText,
  readTextLines,
} from "@/app/dashboard/action-helpers";

const ORDER_REVALIDATE_PATHS = [
  "/dashboard",
  "/dashboard/orders",
  "/dashboard/orders/returns",
  "/dashboard/account",
  "/dashboard/account/orders",
  "/dashboard/account/returns",
  "/dashboard/inventory",
] as const;

const ORDER_STATUS_VALUES = new Set([
  "PENDING",
  "AWAITING_PAYMENT",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
]);

const FULFILLMENT_STATUS_VALUES = new Set([
  "UNFULFILLED",
  "PARTIAL",
  "PACKING",
  "SHIPPED",
  "DELIVERED",
]);

const RETURN_STATUS_VALUES = new Set([
  "REQUESTED",
  "APPROVED",
  "REJECTED",
  "RECEIVED",
  "REFUNDED",
  "CLOSED",
]);

const REFUND_STATUS_VALUES = new Set(["PENDING", "APPROVED", "REJECTED", "PAID"]);

function buildOrderRevalidatePaths(orderId?: string) {
  return [...ORDER_REVALIDATE_PATHS, ...(orderId ? [`/dashboard/orders/${orderId}`] : [])];
}

function resolveOrdersActionError(error: unknown) {
  if (error instanceof AppError) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "name" in error &&
    error.name === "ValidationError"
  ) {
    const validationError = error as {
      errors?: Record<string, { message?: string }>;
    };
    const firstIssue = Object.values(validationError.errors ?? {})[0];
    return firstIssue?.message ?? "Validation failed.";
  }

  if (
    error &&
    typeof error === "object" &&
    "name" in error &&
    error.name === "CastError"
  ) {
    return "One of the selected records is invalid.";
  }

  return null;
}

function handleOrdersActionFailure(error: unknown, returnTo: string) {
  if (isRedirectError(error)) {
    throw error;
  }

  const message = resolveOrdersActionError(error);

  if (message) {
    failAction(returnTo, message);
  }

  throw error;
}

function parseManualOrderLines(lines: string[]) {
  return lines
    .map((line) => line.split("|").map((part) => part.trim()))
    .filter((parts) => parts.length >= 2 && parts[0] && parts[1])
    .map((parts) => ({
      identifier: parts[0],
      quantity: Number(parts[1]),
      unitPrice: parts[2] ? Number(parts[2]) : undefined,
    }))
    .filter((item) => Number.isFinite(item.quantity) && item.quantity > 0);
}

function parseStructuredManualOrderLines(formData: FormData) {
  const variantIds = formData
    .getAll("variantIds")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const quantities = formData
    .getAll("quantities")
    .map((value) => Number(String(value).trim()));
  const unitPrices = formData.getAll("unitPrices").map((value) => String(value).trim());

  return variantIds
    .map((variantId, index) => ({
      variantId,
      quantity: quantities[index] ?? 0,
      unitPrice: unitPrices[index] ? Number(unitPrices[index]) : undefined,
    }))
    .filter(
      (item) =>
        Types.ObjectId.isValid(item.variantId) &&
        Number.isFinite(item.quantity) &&
        item.quantity > 0,
    );
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function createManualOrderAction(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.ordersView);

  const baseReturnTo = getReturnTo(formData, "/dashboard/orders/new");

  try {
    const selectedCustomerId = readOptionalText(formData, "customerId");
    const structuredLines = parseStructuredManualOrderLines(formData);
    const rawLines =
      structuredLines.length > 0
        ? structuredLines.map((line) => ({
            identifier: line.variantId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
          }))
        : parseManualOrderLines(readTextLines(formData, "orderLines"));

    if (rawLines.length === 0) {
      throw new AppError("Add at least one order line using SKU or variant id.", 400);
    }

    const resolvedCustomer =
      selectedCustomerId && selectedCustomerId !== "guest"
        ? await UserModel.findOne({
            _id: selectedCustomerId,
            role: "CUSTOMER",
            isActive: true,
          })
            .select("fullName email phone")
            .lean()
            .exec()
        : null;

    if (selectedCustomerId && selectedCustomerId !== "guest" && !resolvedCustomer) {
      throw new AppError("Selected customer account was not found or is inactive.", 404);
    }

    const customerNameSnapshot =
      readOptionalText(formData, "customerName") ??
      (resolvedCustomer && typeof resolvedCustomer.fullName === "string"
        ? resolvedCustomer.fullName
        : undefined);
    const customerEmailSnapshot =
      readOptionalText(formData, "customerEmail") ??
      (resolvedCustomer && typeof resolvedCustomer.email === "string"
        ? resolvedCustomer.email
        : undefined);
    const customerPhoneSnapshot =
      readOptionalText(formData, "customerPhone") ??
      (resolvedCustomer && typeof resolvedCustomer.phone === "string"
        ? resolvedCustomer.phone
        : undefined);

    if (!customerNameSnapshot && !customerEmailSnapshot && !customerPhoneSnapshot) {
      throw new AppError("Add at least one customer contact field for the order.", 400);
    }

    const resolvedLines = await Promise.all(
      rawLines.map(async (line) => {
        const variant =
          (Types.ObjectId.isValid(line.identifier)
            ? await ProductVariantModel.findById(line.identifier)
                .select("_id")
                .lean()
                .exec()
            : null) ??
          (await ProductVariantModel.findOne({
            sku: new RegExp(`^${escapeRegex(line.identifier)}$`, "i"),
          })
            .select("_id")
            .lean()
            .exec());

        if (!variant) {
          throw new AppError(`Variant not found for "${line.identifier}".`, 404);
        }

        return {
          variantId: String(variant._id),
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        };
      }),
    );

    const result = await ordersService.createManualOrder({
      customerId:
        resolvedCustomer && selectedCustomerId && selectedCustomerId !== "guest"
          ? selectedCustomerId
          : undefined,
      customerNameSnapshot,
      customerEmailSnapshot,
      customerPhoneSnapshot,
      shippingMethodId: readOptionalText(formData, "shippingMethodId"),
      shippingFee: readNumber(formData, "shippingFee", 0),
      discountTotal: readNumber(formData, "discountTotal", 0),
      taxTotal: readNumber(formData, "taxTotal", 0),
      note: readOptionalText(formData, "note"),
      items: resolvedLines,
    });

    for (const path of buildOrderRevalidatePaths(result.order.id)) {
      revalidatePath(path);
    }

    await systemEventsService.recordAuditLog({
      actorUserId: user.id,
      action: "ORDER_CREATE_MANUAL",
      entityType: "ORDER",
      entityId: result.order.id,
      afterData: {
        customerId: result.order.customerId?.toString?.() ?? undefined,
        itemCount: result.items.length,
      },
    });

    redirect(`/dashboard/orders/${result.order.id}`);
  } catch (error) {
    handleOrdersActionFailure(error, baseReturnTo);
  }
}

export async function confirmOrderPaymentAction(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.ordersView);
  const orderId = readText(formData, "orderId");
  const returnTo = getReturnTo(formData, "/dashboard/orders");

  try {
    const order = await OrderModel.findById(orderId).exec();

    if (!order) {
      finishAction("/dashboard/orders", buildOrderRevalidatePaths(orderId));
    }

    let payment = await PaymentModel.findOne({
      orderId,
      status: { $in: ["SUBMITTED", "AUTHORIZED"] },
    })
      .sort({ paymentDate: -1 })
      .exec();

    if (!payment) {
      const selectedPaymentMethodId = readText(formData, "paymentMethodId");
      const paymentMethod =
        (selectedPaymentMethodId
          ? await PaymentMethodModel.findById(selectedPaymentMethodId).exec()
          : await PaymentMethodModel.findOne({ isActive: true }).sort({ methodName: 1 }).exec()) ??
        null;

      if (!paymentMethod || !order) {
        finishAction(returnTo, buildOrderRevalidatePaths(orderId));
      }

      payment = await paymentsService.submitPayment({
        orderId,
        paymentMethodId: String(paymentMethod.id),
        amount: order.grandTotal,
        currencyCode: order.currencyCode,
        transactionRef: readOptionalText(formData, "transactionRef"),
      });
    }

    await paymentsService.confirmPayment({
      paymentId: String(payment.id),
      confirmedBy: user.id,
      gatewayTransactionId: readOptionalText(formData, "transactionRef"),
      rawResponse: readOptionalText(formData, "paymentNote"),
    });

    finishAction(returnTo, buildOrderRevalidatePaths(orderId));
  } catch (error) {
    handleOrdersActionFailure(error, returnTo);
  }
}

export async function updateOrderStatusAction(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.ordersView);
  const orderId = readText(formData, "orderId");
  const returnTo = getReturnTo(formData, "/dashboard/orders");

  try {
    const toStatus = readText(formData, "toStatus");

    if (!ORDER_STATUS_VALUES.has(toStatus)) {
      failAction(returnTo, "Choose a valid order status.", "amber");
    }

    await ordersService.updateOrderStatus({
      orderId,
      toStatus: toStatus as
        | "PENDING"
        | "AWAITING_PAYMENT"
        | "PAID"
        | "PROCESSING"
        | "SHIPPED"
        | "COMPLETED"
        | "CANCELLED"
        | "REFUNDED",
      changedBy: user.id,
      note: readOptionalText(formData, "statusNote"),
    });

    finishAction(returnTo, buildOrderRevalidatePaths(orderId));
  } catch (error) {
    handleOrdersActionFailure(error, returnTo);
  }
}

export async function updateOrderFulfillmentAction(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.ordersView);

  const orderId = readText(formData, "orderId");
  const returnTo = getReturnTo(formData, "/dashboard/orders");
  try {
    const targetStatus = readText(formData, "toFulfillmentStatus");
    const courierName = readOptionalText(formData, "courierName");
    const trackingNo = readOptionalText(formData, "trackingNo");
    const shipmentNote = readOptionalText(formData, "shipmentNote");

    if (!FULFILLMENT_STATUS_VALUES.has(targetStatus)) {
      failAction(returnTo, "Choose a valid fulfillment status.", "amber");
    }

    const order = await OrderModel.findById(orderId).exec();

    if (!order) {
      finishAction("/dashboard/orders", buildOrderRevalidatePaths(orderId));
    }

    const orderItems = await OrderItemModel.find({ orderId }).exec();
    let shipment = await ShipmentModel.findOne({ orderId }).sort({ shippedAt: -1 }).exec();

    if (!shipment && ["PACKING", "SHIPPED", "DELIVERED"].includes(targetStatus)) {
      shipment = await shipmentsService.createShipment({
        orderId,
        shippingMethodId: order.shippingMethodId?.toString(),
        courierName,
        trackingNo,
        note: shipmentNote,
        items: orderItems.map((item) => ({
          orderItemId: String(item.id),
          quantity: item.quantity,
        })),
      });
    }

    if (shipment && (courierName || trackingNo || shipmentNote)) {
      await ShipmentModel.findByIdAndUpdate(shipment.id, {
        courierName: courierName ?? shipment.courierName,
        trackingNo: trackingNo ?? shipment.trackingNo,
        note: shipmentNote ?? shipment.note,
      }).exec();
    }

    if (targetStatus === "PACKING") {
      if (shipment) {
        await ShipmentModel.findByIdAndUpdate(shipment.id, {
          status: "PACKING",
          shippedAt: shipment.shippedAt ?? new Date(),
        }).exec();
      }

      await OrderModel.findByIdAndUpdate(orderId, {
        fulfillmentStatus: "PACKING",
        status: order.status === "PAID" ? "PROCESSING" : order.status,
      }).exec();
    }

    if (targetStatus === "SHIPPED" && shipment) {
      await shipmentsService.addTrackingEvent({
        shipmentId: String(shipment.id),
        status: "OUT_FOR_DELIVERY",
        message: shipmentNote,
      });
    }

    if (targetStatus === "DELIVERED" && shipment) {
      await shipmentsService.addTrackingEvent({
        shipmentId: String(shipment.id),
        status: "DELIVERED",
        message: shipmentNote,
      });
    }

    if (targetStatus === "UNFULFILLED") {
      await OrderModel.findByIdAndUpdate(orderId, {
        fulfillmentStatus: "UNFULFILLED",
      }).exec();

      if (shipment) {
        await ShipmentModel.findByIdAndUpdate(shipment.id, {
          status: "PENDING",
        }).exec();
      }
    }

    await systemEventsService.recordAuditLog({
      actorUserId: user.id,
      action: "ORDER_FULFILLMENT_UPDATE",
      entityType: "ORDER",
      entityId: orderId,
      afterData: {
        fulfillmentStatus: targetStatus,
        shipmentId: shipment?.id ?? null,
      },
    });

    finishAction(returnTo, buildOrderRevalidatePaths(orderId));
  } catch (error) {
    handleOrdersActionFailure(error, returnTo);
  }
}

export async function cancelOrderAction(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.ordersView);
  const returnTo = getReturnTo(formData, "/dashboard/orders");
  const orderId = readText(formData, "orderId");

  try {
    await ordersService.updateOrderStatus({
      orderId,
      toStatus: "CANCELLED",
      changedBy: user.id,
      note: readOptionalText(formData, "cancelNote"),
    });

    finishAction(returnTo, buildOrderRevalidatePaths(orderId));
  } catch (error) {
    handleOrdersActionFailure(error, returnTo);
  }
}

export async function addOrderNoteAction(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.ordersView);
  const returnTo = getReturnTo(formData, "/dashboard/orders");
  const orderId = readText(formData, "orderId");

  try {
    const note = readText(formData, "note");

    if (!note) {
      failAction(returnTo, "Note is required.", "amber");
    }

    await ordersService.addOrderNote({
      orderId,
      noteType: "INTERNAL",
      note,
      createdBy: user.id,
    });

    finishAction(returnTo, buildOrderRevalidatePaths(orderId));
  } catch (error) {
    handleOrdersActionFailure(error, returnTo);
  }
}

export async function updateReturnStatusAction(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.ordersView);

  const returnId = readText(formData, "returnId");
  const returnTo = getReturnTo(formData, "/dashboard/orders/returns");

  try {
    const toStatus = readText(formData, "toStatus");
    const note = readOptionalText(formData, "note");

    if (!RETURN_STATUS_VALUES.has(toStatus)) {
      failAction(returnTo, "Choose a valid return status.", "amber");
    }

    const existingReturn = await ReturnModel.findById(returnId).exec();

    if (!existingReturn) {
      throw new AppError("Return record was not found.", 404);
    }

    const now = new Date();
    const update: Record<string, unknown> = {
      status: toStatus,
    };

    if (note) {
      update.note = note;
    }

    if (toStatus === "APPROVED") {
      update.approvedAt = existingReturn.approvedAt ?? now;
    }

    if (toStatus === "RECEIVED") {
      update.receivedAt = existingReturn.receivedAt ?? now;
    }

    if (toStatus === "REJECTED" || toStatus === "REFUNDED" || toStatus === "CLOSED") {
      update.closedAt = existingReturn.closedAt ?? now;
    }

    await ReturnModel.findByIdAndUpdate(returnId, update).exec();

    await systemEventsService.recordNotification({
      userId:
        existingReturn.customerId?.toString?.() ?? String(existingReturn.customerId ?? ""),
      type: "RETURN_UPDATED",
      title: "Return updated",
      body: `Return status changed to ${toStatus}.`,
      relatedType: "RETURN",
      relatedId: returnId,
    });
    await systemEventsService.recordAuditLog({
      actorUserId: user.id,
      action: "RETURN_STATUS_UPDATE",
      entityType: "RETURN",
      entityId: returnId,
      afterData: {
        status: toStatus,
      },
    });

    finishAction(returnTo, [...ORDER_REVALIDATE_PATHS]);
  } catch (error) {
    handleOrdersActionFailure(error, returnTo);
  }
}

export async function recordReturnRefundAction(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.ordersView);
  const returnId = readText(formData, "returnId");
  const returnTo = getReturnTo(formData, "/dashboard/orders/returns");

  try {
    const refundStatus = readText(formData, "refundStatus");
    const amount = readNumber(formData, "amount", 0);

    if (!REFUND_STATUS_VALUES.has(refundStatus)) {
      failAction(returnTo, "Choose a valid refund status.", "amber");
    }

    if (amount <= 0) {
      throw new AppError("Refund amount must be greater than zero.", 400);
    }

    const existingReturn = await ReturnModel.findById(returnId).exec();

    if (!existingReturn) {
      throw new AppError("Return record was not found.", 404);
    }

    const paymentId = readOptionalText(formData, "paymentId");
    const processedAt =
      refundStatus === "APPROVED" || refundStatus === "REJECTED" || refundStatus === "PAID"
        ? new Date()
        : undefined;

    const createdRefund = await RefundModel.create({
      orderId: existingReturn.orderId,
      paymentId: paymentId && Types.ObjectId.isValid(paymentId) ? paymentId : undefined,
      returnId,
      amount,
      currencyCode: readOptionalText(formData, "currencyCode") ?? "MMK",
      status: refundStatus,
      reason: readOptionalText(formData, "reason"),
      createdAt: new Date(),
      processedAt,
      processedBy: processedAt ? user.id : undefined,
    });

    if (refundStatus === "PAID") {
      await ReturnModel.findByIdAndUpdate(returnId, {
        status: "REFUNDED",
        closedAt: existingReturn.closedAt ?? new Date(),
      }).exec();
    }

    await systemEventsService.recordNotification({
      userId:
        existingReturn.customerId?.toString?.() ?? String(existingReturn.customerId ?? ""),
      type: "REFUND_UPDATED",
      title: "Refund recorded",
      body: `Refund status changed to ${refundStatus}.`,
      relatedType: "RETURN",
      relatedId: returnId,
    });
    await systemEventsService.recordAuditLog({
      actorUserId: user.id,
      action: "REFUND_CREATE",
      entityType: "REFUND",
      entityId: String(createdRefund._id),
      afterData: {
        returnId,
        status: refundStatus,
        amount,
      },
    });

    finishAction(returnTo, [...ORDER_REVALIDATE_PATHS]);
  } catch (error) {
    handleOrdersActionFailure(error, returnTo);
  }
}
