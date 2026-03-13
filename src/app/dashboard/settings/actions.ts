"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { Types } from "mongoose";
import { z } from "zod";

import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { AppError } from "@/lib/errors/app-error";
import { adminCrudServices } from "@/modules/admin/admin-crud.services";
import { BrandModel, ProductModel, TaxClassModel } from "@/modules/catalog/catalog.models";
import { CountryModel, StateRegionModel } from "@/modules/core/core.models";
import { coreService } from "@/modules/core/core.service";
import { AddressModel } from "@/modules/customers/customers.models";
import { PaymentMethodModel, PaymentModel } from "@/modules/payments/payments.models";
import { OrderModel } from "@/modules/orders/orders.models";
import {
  ShippingMethodModel,
  ShippingRateRuleModel,
  ShippingZoneCountryModel,
  ShippingZoneModel,
  TaxRateModel,
} from "@/modules/pricing/pricing.models";
import {
  failAction,
  finishAction,
  getSuccessReturnTo,
  getReturnTo,
  readCheckbox,
  readNumber,
  readOptionalNumber,
  readOptionalText,
  readText,
} from "@/app/dashboard/action-helpers";

function parseSettingsSchema<T>(schema: z.ZodType<T>, input: unknown) {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "Invalid settings input.", 400);
  }

  return parsed.data;
}

const taxClassInputSchema = z.object({
  title: z.string().trim().min(1, "Tax class name is required.").max(80),
  description: z.string().trim().max(255).optional(),
  isActive: z.boolean(),
});

const countryInputSchema = z.object({
  title: z.string().trim().min(1, "Country name is required.").max(100),
  isoCode: z
    .string()
    .trim()
    .max(2, "ISO code must be 2 characters or fewer.")
    .optional(),
  phoneCode: z.string().trim().max(10).optional(),
});

const stateRegionInputSchema = z.object({
  countryId: z.string().trim().min(1, "Country is required."),
  title: z.string().trim().min(1, "State / region name is required.").max(100),
  code: z.string().trim().max(20).optional(),
});

const taxRateInputSchema = z.object({
  title: z.string().trim().min(1, "Rate name is required.").max(100),
  taxClassId: z.string().trim().min(1, "Tax class is required."),
  countryId: z.string().trim().optional(),
  stateRegionId: z.string().trim().optional(),
  ratePercent: z.coerce.number().min(0, "Rate percent must be 0 or greater."),
  priority: z.coerce.number().int().min(1, "Priority must be at least 1."),
  startsAt: z.string().trim().optional(),
  endsAt: z.string().trim().optional(),
  isActive: z.boolean(),
});

const shippingZoneInputSchema = z.object({
  title: z.string().trim().min(1, "Zone name is required.").max(100),
  description: z.string().trim().max(255).optional(),
  isActive: z.boolean(),
});

const shippingRateRuleInputSchema = z
  .object({
    shippingMethodId: z.string().trim().min(1, "Delivery method is required."),
    minWeightGrams: z.coerce.number().min(0).optional(),
    maxWeightGrams: z.coerce.number().min(0).optional(),
    minOrderAmount: z.coerce.number().min(0).optional(),
    maxOrderAmount: z.coerce.number().min(0).optional(),
    fee: z.coerce.number().min(0, "Fee must be zero or greater."),
    isActive: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (
      value.minWeightGrams !== undefined &&
      value.maxWeightGrams !== undefined &&
      value.maxWeightGrams < value.minWeightGrams
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maxWeightGrams"],
        message: "Max weight must be greater than or equal to min weight.",
      });
    }

    if (
      value.minOrderAmount !== undefined &&
      value.maxOrderAmount !== undefined &&
      value.maxOrderAmount < value.minOrderAmount
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maxOrderAmount"],
        message: "Max order amount must be greater than or equal to min order amount.",
      });
    }
  });

function parseOptionalDate(value?: string) {
  if (!value) {
    return undefined;
  }

  const nextDate = new Date(value);
  return Number.isNaN(nextDate.getTime()) ? undefined : nextDate;
}

const SETTINGS_REVALIDATE_PATHS = [
  "/dashboard/settings",
  "/dashboard/settings/payment-methods",
  "/dashboard/settings/shipping-zones",
  "/dashboard/settings/shipping-methods",
  "/dashboard/settings/shipping-rate-rules",
  "/dashboard/settings/tax-classes",
  "/dashboard/settings/tax-rates",
  "/dashboard/settings/countries",
  "/dashboard/settings/states-regions",
] as const;

function buildSettingsRevalidatePaths(successReturnTo: string) {
  const sanitizedSuccessReturnTo = successReturnTo.split("?")[0];

  return sanitizedSuccessReturnTo
    ? [...SETTINGS_REVALIDATE_PATHS, sanitizedSuccessReturnTo]
    : [...SETTINGS_REVALIDATE_PATHS];
}

function humanizeSettingsField(fieldName: string) {
  const overrides: Record<string, string> = {
    isoCode: "ISO code",
    phoneCode: "Phone code",
    taxClassId: "Tax class",
    countryId: "Country",
    stateRegionId: "State / region",
  };

  if (overrides[fieldName]) {
    return overrides[fieldName];
  }

  return fieldName
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (value) => value.toUpperCase());
}

function resolveSettingsActionError(error: unknown) {
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
      return `${humanizeSettingsField(duplicateField)} already exists.`;
    }

    return "This record already exists.";
  }

  if (
    error &&
    typeof error === "object" &&
    "name" in error &&
    error.name === "CastError"
  ) {
    return "One of the selected records is invalid.";
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

    if (firstIssue?.message) {
      return firstIssue.message;
    }

    return "Validation failed.";
  }

  return null;
}

function handleSettingsActionFailure(error: unknown, returnTo: string) {
  if (isRedirectError(error)) {
    throw error;
  }

  const message = resolveSettingsActionError(error);

  if (message) {
    failAction(returnTo, message);
  }

  throw error;
}

function readBulkIds(formData: FormData, returnTo: string) {
  const ids = Array.from(
    new Set(
      formData
        .getAll("selectedIds")
        .map((value) => String(value).trim())
        .filter((value) => Types.ObjectId.isValid(value)),
    ),
  );

  if (ids.length === 0) {
    failAction(returnTo, "Select at least one record first.", "amber");
  }

  return ids;
}

async function ensureDefaultShippingZone() {
  const existingZone = await ShippingZoneModel.findOne().sort({ createdAt: 1 }).exec();

  if (existingZone) {
    return existingZone.id;
  }

  const createdZone = await ShippingZoneModel.create({
    zoneName: "Default Zone",
    description: "Fallback shipping zone for admin-managed methods.",
    isActive: true,
    createdAt: new Date(),
  });

  return createdZone.id;
}

function readObjectIdList(formData: FormData, fieldName: string) {
  return Array.from(
    new Set(
      formData
        .getAll(fieldName)
        .map((value) => String(value).trim())
        .filter((value) => Types.ObjectId.isValid(value)),
    ),
  );
}

async function ensureCountryExists(countryId: string) {
  if (!Types.ObjectId.isValid(countryId)) {
    throw new AppError("Country is invalid.", 400);
  }

  const country = await CountryModel.findById(countryId).select("_id").lean().exec();

  if (!country) {
    throw new AppError("Country was not found.", 404);
  }
}

async function ensureShippingMethodExists(shippingMethodId: string) {
  if (!Types.ObjectId.isValid(shippingMethodId)) {
    throw new AppError("Delivery method is invalid.", 400);
  }

  const shippingMethod = await ShippingMethodModel.findById(shippingMethodId)
    .select("_id")
    .lean()
    .exec();

  if (!shippingMethod) {
    throw new AppError("Delivery method was not found.", 404);
  }
}

async function syncShippingZoneCountries(
  shippingZoneId: string,
  countryIds: string[],
) {
  await Promise.all(countryIds.map((countryId) => ensureCountryExists(countryId)));
  await ShippingZoneCountryModel.deleteMany({ shippingZoneId }).exec();

  if (countryIds.length === 0) {
    return;
  }

  await ShippingZoneCountryModel.insertMany(
    countryIds.map((countryId) => ({
      shippingZoneId,
      countryId,
    })),
  );
}

async function ensureStateRegionExists(
  stateRegionId: string,
  countryId?: string,
) {
  if (!Types.ObjectId.isValid(stateRegionId)) {
    throw new AppError("State / region is invalid.", 400);
  }

  const stateRegion = await StateRegionModel.findById(stateRegionId)
    .select("countryId")
    .lean()
    .exec();

  if (!stateRegion) {
    throw new AppError("State / region was not found.", 404);
  }

  const stateCountryId = String(stateRegion.countryId ?? "");

  if (countryId && stateCountryId !== countryId) {
    throw new AppError("State / region does not belong to the selected country.", 400);
  }

  return stateCountryId;
}

export async function saveSettingsRecordAction(formData: FormData) {
  await requirePermission(PERMISSIONS.settingsManage);

  const kind = readText(formData, "kind");
  const recordId = readText(formData, "recordId");
  const returnTo = getReturnTo(formData, "/dashboard/settings");
  const successReturnTo = getSuccessReturnTo(formData, returnTo);

  try {
    if (kind === "payment-methods") {
      const payload = {
        code: readText(formData, "code").toUpperCase(),
        methodName: readText(formData, "title"),
        provider: readOptionalText(formData, "provider"),
        receiverName: readOptionalText(formData, "receiverName"),
        receiverPhone: readOptionalText(formData, "receiverPhone"),
        receiverAccountNo: readOptionalText(formData, "receiverAccountNo"),
        isManual: readCheckbox(formData, "isManual"),
        isActive: readCheckbox(formData, "isActive"),
      };

      if (recordId && Types.ObjectId.isValid(recordId)) {
        await adminCrudServices.payment_methods.update(recordId, payload);
      } else {
        await adminCrudServices.payment_methods.create(payload);
      }
    }

    if (kind === "shipping-methods") {
      const shippingZoneId =
        readOptionalText(formData, "shippingZoneId") ?? (await ensureDefaultShippingZone());
      const payload = {
        shippingZoneId,
        code: readText(formData, "code").toUpperCase(),
        methodName: readText(formData, "title"),
        description: readOptionalText(formData, "description"),
        baseFee: readNumber(formData, "baseFee", 0),
        freeShippingMinAmount: readOptionalNumber(formData, "freeShippingMinAmount"),
        estimatedMinDays: readOptionalNumber(formData, "estimatedMinDays"),
        estimatedMaxDays: readOptionalNumber(formData, "estimatedMaxDays"),
        isActive: readCheckbox(formData, "isActive"),
      };

      if (recordId && Types.ObjectId.isValid(recordId)) {
        await adminCrudServices.shipping_methods.update(recordId, payload);
      } else {
        await adminCrudServices.shipping_methods.create(payload);
      }
    }

    if (kind === "shipping-zones") {
      const payload = parseSettingsSchema(shippingZoneInputSchema, {
        title: readText(formData, "title"),
        description: readOptionalText(formData, "description"),
        isActive: readCheckbox(formData, "isActive"),
      });
      const countryIds = readObjectIdList(formData, "countryIds");

      if (recordId && Types.ObjectId.isValid(recordId)) {
        await ShippingZoneModel.findByIdAndUpdate(
          recordId,
          {
            zoneName: payload.title,
            description: payload.description,
            isActive: payload.isActive,
          },
          { runValidators: true },
        ).exec();
        await syncShippingZoneCountries(recordId, countryIds);
      } else {
        const zone = await ShippingZoneModel.create({
          zoneName: payload.title,
          description: payload.description,
          isActive: payload.isActive,
          createdAt: new Date(),
        });
        await syncShippingZoneCountries(zone.id, countryIds);
      }
    }

    if (kind === "shipping-rate-rules") {
      const payload = parseSettingsSchema(shippingRateRuleInputSchema, {
        shippingMethodId: readText(formData, "shippingMethodId"),
        minWeightGrams: readOptionalText(formData, "minWeightGrams"),
        maxWeightGrams: readOptionalText(formData, "maxWeightGrams"),
        minOrderAmount: readOptionalText(formData, "minOrderAmount"),
        maxOrderAmount: readOptionalText(formData, "maxOrderAmount"),
        fee: readText(formData, "fee"),
        isActive: readCheckbox(formData, "isActive"),
      });

      await ensureShippingMethodExists(payload.shippingMethodId);

      const rateRuleDocument = {
        shippingMethodId: payload.shippingMethodId,
        minWeightGrams: payload.minWeightGrams,
        maxWeightGrams: payload.maxWeightGrams,
        minOrderAmount: payload.minOrderAmount,
        maxOrderAmount: payload.maxOrderAmount,
        fee: payload.fee,
        isActive: payload.isActive,
      };

      if (recordId && Types.ObjectId.isValid(recordId)) {
        await ShippingRateRuleModel.findByIdAndUpdate(recordId, rateRuleDocument, {
          runValidators: true,
        }).exec();
      } else {
        await ShippingRateRuleModel.create(rateRuleDocument);
      }
    }

    if (kind === "countries") {
      const payload = parseSettingsSchema(countryInputSchema, {
        title: readText(formData, "title"),
        isoCode: readOptionalText(formData, "isoCode")?.toUpperCase(),
        phoneCode: readOptionalText(formData, "phoneCode"),
      });

      const countryDocument = {
        countryName: payload.title,
        isoCode: payload.isoCode,
        phoneCode: payload.phoneCode,
      };

      if (recordId && Types.ObjectId.isValid(recordId)) {
        await CountryModel.findByIdAndUpdate(recordId, countryDocument, {
          runValidators: true,
        }).exec();
      } else {
        await CountryModel.create(countryDocument);
      }
    }

    if (kind === "states-regions") {
      const payload = parseSettingsSchema(stateRegionInputSchema, {
        countryId: readText(formData, "countryId"),
        title: readText(formData, "title"),
        code: readOptionalText(formData, "code"),
      });

      await ensureCountryExists(payload.countryId);

      const stateRegionDocument = {
        countryId: payload.countryId,
        stateRegionName: payload.title,
        code: payload.code,
      };

      if (recordId && Types.ObjectId.isValid(recordId)) {
        await StateRegionModel.findByIdAndUpdate(recordId, stateRegionDocument, {
          runValidators: true,
        }).exec();
      } else {
        await StateRegionModel.create(stateRegionDocument);
      }
    }

    if (kind === "tax-classes") {
      const payload = parseSettingsSchema(taxClassInputSchema, {
        title: readText(formData, "title"),
        description: readOptionalText(formData, "description"),
        isActive: readCheckbox(formData, "isActive"),
      });

      if (recordId && Types.ObjectId.isValid(recordId)) {
        await TaxClassModel.findByIdAndUpdate(
          recordId,
          {
            taxClassName: payload.title,
            description: payload.description,
            isActive: payload.isActive,
          },
          {
            runValidators: true,
          },
        ).exec();
      } else {
        await TaxClassModel.create({
          taxClassName: payload.title,
          description: payload.description,
          isActive: payload.isActive,
        });
      }
    }

    if (kind === "tax-rates") {
      const payload = parseSettingsSchema(taxRateInputSchema, {
        title: readText(formData, "title"),
        taxClassId: readText(formData, "taxClassId"),
        countryId: readOptionalText(formData, "countryId"),
        stateRegionId: readOptionalText(formData, "stateRegionId"),
        ratePercent: readText(formData, "ratePercent"),
        priority: readText(formData, "priority") || "1",
        startsAt: readOptionalText(formData, "startsAt"),
        endsAt: readOptionalText(formData, "endsAt"),
        isActive: readCheckbox(formData, "isActive"),
      });

      if (!Types.ObjectId.isValid(payload.taxClassId)) {
        throw new AppError("Tax class is invalid.", 400);
      }

      const taxClass = await TaxClassModel.findById(payload.taxClassId)
        .select("_id")
        .lean()
        .exec();

      if (!taxClass) {
        throw new AppError("Tax class was not found.", 404);
      }

      let resolvedCountryId = payload.countryId || undefined;

      if (resolvedCountryId) {
        await ensureCountryExists(resolvedCountryId);
      }

      if (payload.stateRegionId) {
        if (!resolvedCountryId) {
          throw new AppError("Select a country before choosing a state / region.", 400);
        }

        resolvedCountryId = await ensureStateRegionExists(
          payload.stateRegionId,
          resolvedCountryId,
        );
      }

      const rateDocument = {
        taxClassId: payload.taxClassId,
        countryId: resolvedCountryId,
        stateRegionId: payload.stateRegionId || undefined,
        rateName: payload.title,
        ratePercent: payload.ratePercent,
        priority: payload.priority,
        startsAt: parseOptionalDate(payload.startsAt),
        endsAt: parseOptionalDate(payload.endsAt),
        isActive: payload.isActive,
      };

      if (recordId && Types.ObjectId.isValid(recordId)) {
        await TaxRateModel.findByIdAndUpdate(recordId, rateDocument, {
          runValidators: true,
        }).exec();
      } else {
        await TaxRateModel.create(rateDocument);
      }
    }

    finishAction(successReturnTo, buildSettingsRevalidatePaths(successReturnTo));
  } catch (error) {
    handleSettingsActionFailure(error, returnTo);
  }
}

export async function saveStoreSettingsAction(formData: FormData) {
  await requirePermission(PERMISSIONS.settingsManage);
  const returnTo = getReturnTo(formData, "/dashboard/settings");

  await coreService.upsertStoreSettings({
    storeName: readText(formData, "storeName"),
    storeSlug: readText(formData, "storeSlug"),
    storeEmail: readOptionalText(formData, "storeEmail"),
    storePhone: readOptionalText(formData, "storePhone"),
    supportEmail: readOptionalText(formData, "supportEmail"),
    supportPhone: readOptionalText(formData, "supportPhone"),
    currencyCode: readText(formData, "currencyCode").toUpperCase(),
    locale: readText(formData, "locale"),
    timezone: readText(formData, "timezone"),
    stockPolicy: readText(formData, "stockPolicy") as
      | "BLOCK_ON_ZERO"
      | "ALLOW_BACKORDER",
    orderAutoCancelMinutes: readNumber(formData, "orderAutoCancelMinutes", 1440),
    allowGuestCheckout: readCheckbox(formData, "allowGuestCheckout"),
    reviewAutoPublish: readCheckbox(formData, "reviewAutoPublish"),
    maintenanceMode: readCheckbox(formData, "maintenanceMode"),
    isActive: readCheckbox(formData, "isActive"),
  });

  finishAction(returnTo, [
    "/dashboard",
    "/dashboard/settings",
  ]);
}

export async function deleteSettingsRecordAction(formData: FormData) {
  await requirePermission(PERMISSIONS.settingsManage);

  const kind = readText(formData, "kind");
  const recordId = readText(formData, "recordId");
  const returnTo = getReturnTo(formData, "/dashboard/settings");

  try {
    if (!recordId || !Types.ObjectId.isValid(recordId)) {
      finishAction(returnTo, buildSettingsRevalidatePaths(returnTo));
    }

    if (kind === "payment-methods") {
      const usageCount = await PaymentModel.countDocuments({ paymentMethodId: recordId }).exec();

      if (usageCount > 0) {
        await adminCrudServices.payment_methods.update(recordId, { isActive: false });
      } else {
        await adminCrudServices.payment_methods.remove(recordId);
      }
    }

    if (kind === "shipping-methods") {
      const usageCount = await OrderModel.countDocuments({ shippingMethodId: recordId }).exec();

      if (usageCount > 0) {
        await adminCrudServices.shipping_methods.update(recordId, { isActive: false });
      } else {
        await adminCrudServices.shipping_methods.remove(recordId);
      }
    }

    if (kind === "shipping-zones") {
      const usageCount = await ShippingMethodModel.countDocuments({
        shippingZoneId: recordId,
      }).exec();

      if (usageCount > 0) {
        await ShippingZoneModel.findByIdAndUpdate(recordId, { isActive: false }).exec();
      } else {
        await ShippingZoneCountryModel.deleteMany({ shippingZoneId: recordId }).exec();
        await ShippingZoneModel.findByIdAndDelete(recordId).exec();
      }
    }

    if (kind === "shipping-rate-rules") {
      await ShippingRateRuleModel.findByIdAndDelete(recordId).exec();
    }

    if (kind === "countries") {
      const [
        brandCount,
        productCount,
        addressCount,
        taxRateCount,
        stateCount,
        shippingZoneCountryCount,
      ] = await Promise.all([
        BrandModel.countDocuments({ originCountryId: recordId }).exec(),
        ProductModel.countDocuments({ originCountryId: recordId }).exec(),
        AddressModel.countDocuments({ countryId: recordId }).exec(),
        TaxRateModel.countDocuments({ countryId: recordId }).exec(),
        StateRegionModel.countDocuments({ countryId: recordId }).exec(),
        ShippingZoneCountryModel.countDocuments({ countryId: recordId }).exec(),
      ]);

      const usageCount =
        brandCount +
        productCount +
        addressCount +
        taxRateCount +
        stateCount +
        shippingZoneCountryCount;

      if (usageCount > 0) {
        throw new AppError("Country is in use and cannot be deleted.", 400);
      }

      await CountryModel.findByIdAndDelete(recordId).exec();
    }

    if (kind === "states-regions") {
      const [addressCount, taxRateCount] = await Promise.all([
        AddressModel.countDocuments({ stateRegionId: recordId }).exec(),
        TaxRateModel.countDocuments({ stateRegionId: recordId }).exec(),
      ]);

      if (addressCount + taxRateCount > 0) {
        throw new AppError("State / region is in use and cannot be deleted.", 400);
      }

      await StateRegionModel.findByIdAndDelete(recordId).exec();
    }

    if (kind === "tax-classes") {
      const usageCount = await ProductModel.countDocuments({ taxClassId: recordId }).exec();

      if (usageCount > 0) {
        await TaxClassModel.findByIdAndUpdate(recordId, { isActive: false }).exec();
      } else {
        await TaxClassModel.findByIdAndDelete(recordId).exec();
      }
    }

    if (kind === "tax-rates") {
      await TaxRateModel.findByIdAndDelete(recordId).exec();
    }

    finishAction(returnTo, buildSettingsRevalidatePaths(returnTo));
  } catch (error) {
    handleSettingsActionFailure(error, returnTo);
  }
}

export async function bulkSettingsRecordAction(formData: FormData) {
  await requirePermission(PERMISSIONS.settingsManage);

  const kind = readText(formData, "kind");
  const bulkAction = readText(formData, "bulkAction");
  const returnTo = getReturnTo(formData, "/dashboard/settings");
  const selectedIds = readBulkIds(formData, returnTo);

  try {
    const objectIds = selectedIds.map((id) => new Types.ObjectId(id));

    if (kind === "payment-methods") {
      if (bulkAction === "activate" || bulkAction === "deactivate") {
        await PaymentMethodModel.updateMany(
          { _id: { $in: objectIds } },
          { isActive: bulkAction === "activate" },
        ).exec();
      } else if (bulkAction === "delete") {
        const usageCount = await PaymentModel.countDocuments({
          paymentMethodId: { $in: objectIds },
        }).exec();

        if (usageCount > 0) {
          failAction(
            returnTo,
            "One or more selected payment methods are in use and cannot be deleted.",
          );
        }

        await PaymentMethodModel.deleteMany({ _id: { $in: objectIds } }).exec();
      } else {
        failAction(returnTo, "Unsupported payment method bulk action.", "amber");
      }
    }

    if (kind === "shipping-methods") {
      if (bulkAction === "activate" || bulkAction === "deactivate") {
        await ShippingMethodModel.updateMany(
          { _id: { $in: objectIds } },
          { isActive: bulkAction === "activate" },
        ).exec();
      } else if (bulkAction === "delete") {
        const usageCount = await OrderModel.countDocuments({
          shippingMethodId: { $in: objectIds },
        }).exec();

        if (usageCount > 0) {
          failAction(
            returnTo,
            "One or more selected delivery methods are in use and cannot be deleted.",
          );
        }

        await ShippingMethodModel.deleteMany({ _id: { $in: objectIds } }).exec();
      } else {
        failAction(returnTo, "Unsupported delivery method bulk action.", "amber");
      }
    }

    if (kind === "shipping-zones") {
      if (bulkAction === "activate" || bulkAction === "deactivate") {
        await ShippingZoneModel.updateMany(
          { _id: { $in: objectIds } },
          { isActive: bulkAction === "activate" },
        ).exec();
      } else if (bulkAction === "delete") {
        const usageCount = await ShippingMethodModel.countDocuments({
          shippingZoneId: { $in: objectIds },
        }).exec();

        if (usageCount > 0) {
          failAction(
            returnTo,
            "One or more selected shipping zones are still used by delivery methods.",
          );
        }

        await ShippingZoneCountryModel.deleteMany({
          shippingZoneId: { $in: objectIds },
        }).exec();
        await ShippingZoneModel.deleteMany({ _id: { $in: objectIds } }).exec();
      } else {
        failAction(returnTo, "Unsupported shipping zone bulk action.", "amber");
      }
    }

    if (kind === "shipping-rate-rules") {
      if (bulkAction === "activate" || bulkAction === "deactivate") {
        await ShippingRateRuleModel.updateMany(
          { _id: { $in: objectIds } },
          { isActive: bulkAction === "activate" },
        ).exec();
      } else if (bulkAction === "delete") {
        await ShippingRateRuleModel.deleteMany({ _id: { $in: objectIds } }).exec();
      } else {
        failAction(returnTo, "Unsupported shipping rate rule bulk action.", "amber");
      }
    }

    if (kind === "countries") {
      if (bulkAction !== "delete") {
        failAction(returnTo, "Countries only support safe bulk delete.", "amber");
      }

      const [
        brandCount,
        productCount,
        addressCount,
        taxRateCount,
        stateCount,
        shippingZoneCountryCount,
      ] = await Promise.all([
        BrandModel.countDocuments({ originCountryId: { $in: objectIds } }).exec(),
        ProductModel.countDocuments({ originCountryId: { $in: objectIds } }).exec(),
        AddressModel.countDocuments({ countryId: { $in: objectIds } }).exec(),
        TaxRateModel.countDocuments({ countryId: { $in: objectIds } }).exec(),
        StateRegionModel.countDocuments({ countryId: { $in: objectIds } }).exec(),
        ShippingZoneCountryModel.countDocuments({ countryId: { $in: objectIds } }).exec(),
      ]);

      if (
        brandCount +
          productCount +
          addressCount +
          taxRateCount +
          stateCount +
          shippingZoneCountryCount >
        0
      ) {
        failAction(
          returnTo,
          "One or more selected countries are in use and cannot be deleted.",
        );
      }

      await CountryModel.deleteMany({ _id: { $in: objectIds } }).exec();
    }

    if (kind === "states-regions") {
      if (bulkAction !== "delete") {
        failAction(returnTo, "States / regions only support safe bulk delete.", "amber");
      }

      const [addressCount, taxRateCount] = await Promise.all([
        AddressModel.countDocuments({ stateRegionId: { $in: objectIds } }).exec(),
        TaxRateModel.countDocuments({ stateRegionId: { $in: objectIds } }).exec(),
      ]);

      if (addressCount + taxRateCount > 0) {
        failAction(
          returnTo,
          "One or more selected states / regions are in use and cannot be deleted.",
        );
      }

      await StateRegionModel.deleteMany({ _id: { $in: objectIds } }).exec();
    }

    if (kind === "tax-classes") {
      if (bulkAction === "activate" || bulkAction === "deactivate") {
        await TaxClassModel.updateMany(
          { _id: { $in: objectIds } },
          { isActive: bulkAction === "activate" },
        ).exec();
      } else if (bulkAction === "delete") {
        const usageCount = await ProductModel.countDocuments({
          taxClassId: { $in: objectIds },
        }).exec();

        if (usageCount > 0) {
          failAction(
            returnTo,
            "One or more selected tax classes are in use and cannot be deleted.",
          );
        }

        await TaxClassModel.deleteMany({ _id: { $in: objectIds } }).exec();
      } else {
        failAction(returnTo, "Unsupported tax class bulk action.", "amber");
      }
    }

    if (kind === "tax-rates") {
      if (bulkAction === "activate" || bulkAction === "deactivate") {
        await TaxRateModel.updateMany(
          { _id: { $in: objectIds } },
          { isActive: bulkAction === "activate" },
        ).exec();
      } else if (bulkAction === "delete") {
        await TaxRateModel.deleteMany({ _id: { $in: objectIds } }).exec();
      } else {
        failAction(returnTo, "Unsupported tax rate bulk action.", "amber");
      }
    }

    finishAction(returnTo, buildSettingsRevalidatePaths(returnTo));
  } catch (error) {
    handleSettingsActionFailure(error, returnTo);
  }
}
