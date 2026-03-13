"use server";

import { Types } from "mongoose";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { AppError } from "@/lib/errors/app-error";
import { slugify } from "@/lib/utils/slugify";
import { ProductVariantModel } from "@/modules/catalog/catalog.models";
import {
  SourcingPlatformModel,
  RestockOrderModel,
  StockAdjustmentModel,
  SourcingSourceModel,
  VariantSourceModel,
} from "@/modules/sourcing/sourcing.models";
import { sourcingService } from "@/modules/sourcing/sourcing.service";
import {
  failAction,
  finishAction,
  getReturnTo,
  getSuccessReturnTo,
  readCheckbox,
  readIds,
  readNumber,
  readOptionalText,
  readText,
  readTextLines,
} from "@/app/dashboard/action-helpers";

function parseRestockItems(lines: string[]) {
  return lines
    .map((line) => line.split("|").map((part) => part.trim()))
    .filter((parts) => parts.length >= 3 && parts[0] && parts[1] && parts[2])
    .map((parts) => ({
      variantId: parts[0],
      orderedQty: Number(parts[1]),
      unitCost: Number(parts[2]),
      variantSourceId: parts[3] || undefined,
    }))
    .filter((item) => Number.isFinite(item.orderedQty) && Number.isFinite(item.unitCost));
}

function readBulkIds(formData: FormData, returnTo: string) {
  const ids = Array.from(new Set(readIds(formData, "selectedIds").filter(Boolean)));

  if (ids.length === 0) {
    failAction(returnTo, "Select at least one record first.", "amber");
  }

  return ids;
}

function buildSupplierRevalidatePaths(options?: {
  sourceId?: string;
  platformId?: string;
}) {
  return [
    "/dashboard/inventory",
    "/dashboard/inventory/restocks",
    "/dashboard/supplier",
    "/dashboard/supplier/links",
    "/dashboard/supplier/platforms",
    ...(options?.sourceId ? [`/dashboard/supplier/${options.sourceId}`] : []),
    ...(options?.platformId ? [`/dashboard/supplier/platforms/${options.platformId}`] : []),
  ];
}

function humanizeSourcingField(fieldName: string) {
  const overrides: Record<string, string> = {
    code: "Platform code",
    name: "Platform name",
    sourceName: "Supplier name",
    sourcingPlatformId: "Platform",
  };

  if (overrides[fieldName]) {
    return overrides[fieldName];
  }

  return fieldName
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (value) => value.toUpperCase());
}

function resolveSourcingActionError(error: unknown) {
  if (error instanceof AppError) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === 11000
  ) {
    const duplicateError = error as {
      keyPattern?: Record<string, unknown>;
      keyValue?: Record<string, unknown>;
    };
    const duplicateField =
      Object.keys(duplicateError.keyPattern ?? {})[0] ??
      Object.keys(duplicateError.keyValue ?? {})[0];

    if (duplicateField) {
      return `${humanizeSourcingField(duplicateField)} already exists.`;
    }

    return "This record already exists.";
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

function handleSourcingActionFailure(error: unknown, returnTo: string) {
  if (isRedirectError(error)) {
    throw error;
  }

  const message = resolveSourcingActionError(error);

  if (message) {
    failAction(returnTo, message);
  }

  throw error;
}

export async function updateVariantInventoryAction(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.inventoryView);
  const variantId = readText(formData, "variantId");
  const returnTo = getReturnTo(formData, "/dashboard/inventory");

  const variant = await ProductVariantModel.findById(variantId).exec();

  if (!variant) {
    finishAction(returnTo, ["/dashboard/inventory"]);
  }

  const stockQty = readNumber(formData, "stockQty", variant.stockQty);
  const lowStockThreshold = readNumber(
    formData,
    "lowStockThreshold",
    variant.lowStockThreshold,
  );
  const quantityDiff = stockQty - variant.stockQty;

  await ProductVariantModel.findByIdAndUpdate(variantId, {
    stockQty,
    availableQty: stockQty - variant.reservedQty,
    lowStockThreshold,
    isActive: readCheckbox(formData, "isActive"),
  }).exec();

  if (quantityDiff !== 0) {
    await StockAdjustmentModel.create({
      variantId,
      adjustmentType: "CORRECTION",
      quantity: quantityDiff,
      note: readOptionalText(formData, "inventoryNote") ?? "Direct stock edit",
      createdBy: user.id,
      createdAt: new Date(),
    });
  }

  finishAction(returnTo, ["/dashboard/inventory"]);
}

export async function createStockAdjustmentAction(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.inventoryView);
  const returnTo = getReturnTo(formData, "/dashboard/inventory");

  await sourcingService.createManualStockAdjustment({
    variantId: readText(formData, "variantId"),
    quantity: readNumber(formData, "quantity", 0),
    adjustmentType: readText(formData, "adjustmentType") as
      | "MANUAL_ADD"
      | "MANUAL_DEDUCT"
      | "DAMAGE"
      | "RETURN_IN"
      | "CORRECTION",
    note: readOptionalText(formData, "note"),
    createdBy: user.id,
  });

  finishAction(returnTo, ["/dashboard/inventory"]);
}

export async function saveSourcingPlatformAction(formData: FormData) {
  await requirePermission(PERMISSIONS.inventoryView);
  const returnTo = getReturnTo(formData, "/dashboard/supplier/platforms");
  const successReturnTo = getSuccessReturnTo(formData, returnTo);

  try {
    const platformId = readText(formData, "platformId");
    const platformName = readText(formData, "platformName");
    const redirectToDetail = readText(formData, "redirectToDetail") === "true";

    if (!platformName) {
      failAction(returnTo, "Platform name is required.", "amber");
    }

    const code =
      readOptionalText(formData, "platformCode") ??
      slugify(platformName).toUpperCase().replace(/-/g, "_");
    const payload = {
      code,
      name: platformName,
      isActive: readCheckbox(formData, "isActive"),
    };

    if (platformId && Types.ObjectId.isValid(platformId)) {
      const updatedPlatform = await SourcingPlatformModel.findByIdAndUpdate(
        platformId,
        payload,
      ).exec();

      if (!updatedPlatform) {
        failAction(returnTo, "Supplier platform was not found.", "amber");
      }

      finishAction(returnTo, buildSupplierRevalidatePaths({ platformId }));
    }

    const createdPlatform = await sourcingService.createPlatform(payload);
    const nextReturnTo = redirectToDetail
      ? `/dashboard/supplier/platforms/${createdPlatform.id}`
      : successReturnTo;

    finishAction(
      nextReturnTo,
      buildSupplierRevalidatePaths({ platformId: String(createdPlatform.id) }),
    );
  } catch (error) {
    handleSourcingActionFailure(error, returnTo);
  }
}

export async function saveSourceAction(formData: FormData) {
  await requirePermission(PERMISSIONS.inventoryView);
  const returnTo = getReturnTo(formData, "/dashboard/supplier");
  const successReturnTo = getSuccessReturnTo(formData, returnTo);

  try {
    const sourceId = readText(formData, "sourceId");
    const sourcingPlatformId = readText(formData, "sourcingPlatformId");
    const sourceName = readText(formData, "sourceName");
    const redirectToDetail = readText(formData, "redirectToDetail") === "true";

    if (!sourcingPlatformId) {
      failAction(returnTo, "Choose a supplier platform first.", "amber");
    }

    if (!sourceName) {
      failAction(returnTo, "Supplier name is required.", "amber");
    }

    const payload = {
      sourcingPlatformId,
      sourceName,
      contactName: readOptionalText(formData, "contactName"),
      phone: readOptionalText(formData, "phone"),
      email: readOptionalText(formData, "email"),
      shopUrl: readOptionalText(formData, "shopUrl"),
      note: readOptionalText(formData, "note"),
      isActive: readCheckbox(formData, "isActive"),
    };

    if (sourceId && Types.ObjectId.isValid(sourceId)) {
      const updatedSource = await SourcingSourceModel.findByIdAndUpdate(sourceId, payload).exec();

      if (!updatedSource) {
        failAction(returnTo, "Supplier record was not found.", "amber");
      }

      finishAction(returnTo, buildSupplierRevalidatePaths({ sourceId }));
    }

    const createdSource = await sourcingService.createSource(payload);
    const nextReturnTo = redirectToDetail
      ? `/dashboard/supplier/${createdSource.id}`
      : successReturnTo;

    finishAction(nextReturnTo, buildSupplierRevalidatePaths({ sourceId: String(createdSource.id) }));
  } catch (error) {
    handleSourcingActionFailure(error, returnTo);
  }
}

export async function createRestockOrderAction(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.inventoryView);
  const returnTo = getReturnTo(formData, "/dashboard/inventory");
  const items = parseRestockItems(readTextLines(formData, "restockItems"));

  if (items.length === 0) {
    finishAction(returnTo, ["/dashboard/inventory"]);
  }

  await sourcingService.createRestockOrder({
    sourcingSourceId: readText(formData, "sourcingSourceId"),
    expectedArrivalAt: readOptionalText(formData, "expectedArrivalAt")
      ? new Date(readText(formData, "expectedArrivalAt"))
      : undefined,
    shippingFee: readNumber(formData, "shippingFee", 0),
    extraFee: readNumber(formData, "extraFee", 0),
    sourceOrderRef: readOptionalText(formData, "sourceOrderRef"),
    trackingNo: readOptionalText(formData, "trackingNo"),
    note: readOptionalText(formData, "note"),
    createdBy: user.id,
    items,
  });

  finishAction(returnTo, ["/dashboard/inventory"]);
}

export async function receiveRestockOrderAction(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.inventoryView);
  const returnTo = getReturnTo(formData, "/dashboard/inventory");
  const restockOrderId = readText(formData, "restockOrderId");
  const receivedItems = Array.from(formData.keys())
    .filter((key) => key.startsWith("receivedQty_"))
    .map((key) => {
      const restockOrderItemId = key.replace("receivedQty_", "");
      return {
        restockOrderItemId,
        receivedQty: readNumber(formData, key, 0),
        rejectedQty: readNumber(formData, `rejectedQty_${restockOrderItemId}`, 0),
      };
    })
    .filter((item) => item.receivedQty > 0 || item.rejectedQty > 0);

  if (receivedItems.length > 0) {
    await sourcingService.receiveRestockOrder({
      restockOrderId,
      receivedItems,
      createdBy: user.id,
    });
  }

  finishAction(returnTo, ["/dashboard/inventory"]);
}

export async function bulkInventoryAction(formData: FormData) {
  await requirePermission(PERMISSIONS.inventoryView);
  const returnTo = getReturnTo(formData, "/dashboard/inventory");
  const bulkAction = readText(formData, "bulkAction");
  const selectedIds = readBulkIds(formData, returnTo);

  if (bulkAction !== "activate" && bulkAction !== "deactivate") {
    failAction(returnTo, "Unsupported inventory bulk action.", "amber");
  }

  await ProductVariantModel.updateMany(
    { _id: { $in: selectedIds } },
    { isActive: bulkAction === "activate" },
  ).exec();

  finishAction(returnTo, ["/dashboard/inventory", "/dashboard/catalog/products"]);
}

export async function bulkSupplierAction(formData: FormData) {
  await requirePermission(PERMISSIONS.inventoryView);
  const returnTo = getReturnTo(formData, "/dashboard/supplier");
  try {
    const bulkAction = readText(formData, "bulkAction");
    const selectedIds = readBulkIds(formData, returnTo);

    if (bulkAction !== "activate" && bulkAction !== "deactivate") {
      failAction(returnTo, "Unsupported supplier bulk action.", "amber");
    }

    await SourcingSourceModel.updateMany(
      { _id: { $in: selectedIds } },
      { isActive: bulkAction === "activate" },
    ).exec();

    finishAction(returnTo, buildSupplierRevalidatePaths());
  } catch (error) {
    handleSourcingActionFailure(error, returnTo);
  }
}

export async function bulkSourcingPlatformAction(formData: FormData) {
  await requirePermission(PERMISSIONS.inventoryView);
  const returnTo = getReturnTo(formData, "/dashboard/supplier/platforms");
  try {
    const bulkAction = readText(formData, "bulkAction");
    const selectedIds = readBulkIds(formData, returnTo);

    if (bulkAction === "activate" || bulkAction === "deactivate") {
      await SourcingPlatformModel.updateMany(
        { _id: { $in: selectedIds } },
        { isActive: bulkAction === "activate" },
      ).exec();

      finishAction(returnTo, buildSupplierRevalidatePaths());
    }

    if (bulkAction !== "delete") {
      failAction(returnTo, "Unsupported supplier platform bulk action.", "amber");
    }

    const usageCount = await SourcingSourceModel.countDocuments({
      sourcingPlatformId: { $in: selectedIds },
    }).exec();

    if (usageCount > 0) {
      failAction(
        returnTo,
        "One or more selected platforms are attached to suppliers and cannot be deleted.",
      );
    }

    await SourcingPlatformModel.deleteMany({ _id: { $in: selectedIds } }).exec();

    finishAction(returnTo, buildSupplierRevalidatePaths());
  } catch (error) {
    handleSourcingActionFailure(error, returnTo);
  }
}

export async function deleteSourceAction(formData: FormData) {
  await requirePermission(PERMISSIONS.inventoryView);
  const sourceId = readText(formData, "sourceId");
  const returnTo = getReturnTo(formData, "/dashboard/supplier");

  try {
    if (!Types.ObjectId.isValid(sourceId)) {
      finishAction(returnTo, buildSupplierRevalidatePaths());
    }

    const [variantLinkCount, restockCount] = await Promise.all([
      VariantSourceModel.countDocuments({ sourcingSourceId: sourceId }).exec(),
      RestockOrderModel.countDocuments({ sourcingSourceId: sourceId }).exec(),
    ]);

    if (variantLinkCount + restockCount > 0) {
      failAction(
        returnTo,
        "This supplier is still linked to variant sources or restocks and cannot be deleted.",
      );
    }

    await SourcingSourceModel.findByIdAndDelete(sourceId).exec();

    finishAction("/dashboard/supplier", buildSupplierRevalidatePaths());
  } catch (error) {
    handleSourcingActionFailure(error, returnTo);
  }
}

export async function deleteSourcingPlatformAction(formData: FormData) {
  await requirePermission(PERMISSIONS.inventoryView);
  const platformId = readText(formData, "platformId");
  const returnTo = getReturnTo(formData, "/dashboard/supplier/platforms");

  try {
    if (!Types.ObjectId.isValid(platformId)) {
      finishAction(returnTo, buildSupplierRevalidatePaths());
    }

    const usageCount = await SourcingSourceModel.countDocuments({
      sourcingPlatformId: platformId,
    }).exec();

    if (usageCount > 0) {
      failAction(
        returnTo,
        "This platform still has suppliers attached and cannot be deleted.",
      );
    }

    await SourcingPlatformModel.findByIdAndDelete(platformId).exec();

    finishAction("/dashboard/supplier/platforms", buildSupplierRevalidatePaths());
  } catch (error) {
    handleSourcingActionFailure(error, returnTo);
  }
}
