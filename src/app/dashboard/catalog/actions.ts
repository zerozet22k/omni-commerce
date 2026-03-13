"use server";

import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { Types } from "mongoose";
import { z } from "zod";

import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { AppError } from "@/lib/errors/app-error";
import { slugify } from "@/lib/utils/slugify";
import {
  BrandModel,
  CategoryModel,
  OptionTypeModel,
  OptionValueModel,
  ProductModel,
  ProductTypeModel,
  ProductVariantModel,
} from "@/modules/catalog/catalog.models";
import {
  CollectionModel,
  CategoryFilterConfigModel,
  CategoryOptionTypeMapModel,
  CategorySpecMapModel,
  ProductBadgeModel,
  ProductTagModel,
  SpecificationDefinitionModel,
} from "@/modules/catalog/catalog-extra.models";
import { catalogIdentifiersService } from "@/modules/catalog/catalog-identifiers.service";
import { catalogMediaService } from "@/modules/catalog/catalog-media.service";
import { catalogStandaloneSyncService } from "@/modules/catalog/catalog-standalone-sync.service";
import { categoryTreeService } from "@/modules/catalog/category-tree.service";
import { systemEventsService } from "@/modules/content/system-events.service";
import { CountryModel, MediaAssetModel } from "@/modules/core/core.models";
import { CouponUsageLogModel, PromotionCustomerGroupModel, PromotionModel, PromotionProductModel, PromotionVariantModel } from "@/modules/pricing/pricing.models";
import { catalogService } from "@/modules/catalog/catalog.service";
import { SourcingSourceModel, VariantSourceModel } from "@/modules/sourcing/sourcing.models";
import { sourcingService } from "@/modules/sourcing/sourcing.service";
import {
  failAction,
  finishAction,
  getSuccessReturnTo,
  getReturnTo,
  readCheckbox,
  readIds,
  readNumber,
  readOptionalNumber,
  readOptionalText,
  readText,
  readTextLines,
} from "@/app/dashboard/action-helpers";

function buildProductRevalidatePaths(productId: string) {
  return [
    "/dashboard/catalog/products",
    `/dashboard/catalog/products/${productId}`,
    `/dashboard/catalog/products/${productId}/images`,
    `/dashboard/catalog/products/${productId}/variants`,
    `/dashboard/catalog/products/${productId}/specifications`,
    `/dashboard/catalog/products/${productId}/faq`,
    `/dashboard/catalog/products/${productId}/relations`,
    `/dashboard/catalog/products/${productId}/bundles`,
    `/dashboard/catalog/products/${productId}/seo`,
  ];
}

function buildPromotionRevalidatePaths(promotionId?: string) {
  return [
    "/dashboard",
    "/dashboard/catalog/promotions",
    ...(promotionId ? [`/dashboard/catalog/promotions/${promotionId}`] : []),
  ];
}

function normalizeImages(
  images: Array<{
    assetId: string;
    sortOrder: number;
    isPrimary: boolean;
  }>,
) {
  const orderedImages = images
    .filter((image) => Types.ObjectId.isValid(image.assetId))
    .map((image, index) => ({
      assetId: image.assetId,
      sortOrder: Number.isFinite(image.sortOrder) ? image.sortOrder : index,
      isPrimary: Boolean(image.isPrimary),
    }))
    .sort((left, right) => left.sortOrder - right.sortOrder);

  let hasPrimary = false;
  const nextImages = orderedImages.map((image) => {
    if (image.isPrimary && !hasPrimary) {
      hasPrimary = true;
      return image;
    }

    return {
      ...image,
      isPrimary: false,
    };
  });

  if (!hasPrimary && nextImages.length > 0) {
    nextImages[0] = {
      ...nextImages[0],
      isPrimary: true,
    };
  }

  return nextImages;
}

async function resolveProductSlugValue(input: {
  productId?: string;
  productName: string;
  requestedSlug?: string;
  existingSlug?: string;
}) {
  const requestedSlug = input.requestedSlug?.trim();

  if (requestedSlug) {
    return catalogIdentifiersService.resolveProductSlug({
      productName: input.productName,
      requestedSlug,
      existingProductId: input.productId,
    });
  }

  if (input.existingSlug?.trim()) {
    return input.existingSlug.trim();
  }

  return catalogIdentifiersService.resolveProductSlug({
    productName: input.productName,
    existingProductId: input.productId,
  });
}

async function resolveVariantSkuValue(input: {
  productId: string;
  seed: string;
  requestedSku?: string;
  existingVariantId?: string;
  existingSku?: string;
}) {
  const requestedSku = input.requestedSku?.trim();

  if (requestedSku) {
    return catalogIdentifiersService.resolveVariantSku({
      productId: input.productId,
      seed: input.seed,
      requestedSku,
      existingVariantId: input.existingVariantId,
    });
  }

  if (input.existingSku?.trim()) {
    return input.existingSku.trim();
  }

  return catalogIdentifiersService.resolveVariantSku({
    productId: input.productId,
    seed: input.seed,
    existingVariantId: input.existingVariantId,
  });
}

function readUploadFile(formData: FormData, key: string) {
  const value = formData.get(key);

  if (!value || typeof value === "string" || value.size === 0) {
    throw new AppError("Choose an image file to upload.", 400);
  }

  if (!value.type.startsWith("image/")) {
    throw new AppError("Only image uploads are supported here.", 400);
  }

  return value;
}

function getFileExtension(file: File) {
  const providedExtension = path.extname(file.name).replace(".", "").toLowerCase();

  if (providedExtension) {
    return providedExtension;
  }

  if (file.type === "image/png") {
    return "png";
  }

  if (file.type === "image/webp") {
    return "webp";
  }

  if (file.type === "image/gif") {
    return "gif";
  }

  return "jpg";
}

async function storeUploadedImageAsset(
  file: File,
  metadata: {
    title?: string;
    altText?: string;
  },
) {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const safeBaseName = slugify(path.parse(file.name).name) || "image";
  const extension = getFileExtension(file);
  const relativeDirectory = path.join("uploads", "catalog", year, month);
  const absoluteDirectory = path.join(process.cwd(), "public", relativeDirectory);
  const fileName = `${safeBaseName}-${randomUUID()}.${extension}`;

  await mkdir(absoluteDirectory, { recursive: true });
  await writeFile(
    path.join(absoluteDirectory, fileName),
    Buffer.from(await file.arrayBuffer()),
  );

  return MediaAssetModel.create({
    assetType: "IMAGE",
    url: `/${path.join(relativeDirectory, fileName).replace(/\\/g, "/")}`,
    altText: metadata.altText,
    title: metadata.title,
    mimeType: file.type || undefined,
    sizeBytes: file.size,
  });
}

function parseSpecifications(lines: string[]) {
  return lines
    .map((line, index) => {
      const parts = line.split("|").map((part) => part.trim()).filter(Boolean);

      if (parts.length < 2) {
        return null;
      }

      if (parts.length === 2) {
        return {
          specKey: parts[0],
          specValue: parts[1],
          sortOrder: index,
        };
      }

      return {
        specGroup: parts[0],
        specKey: parts[1],
        specValue: parts.slice(2).join(" | "),
        sortOrder: index,
      };
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value));
}

async function attachSpecificationDefinitionIds(
  specifications: Array<{
    specGroup?: string;
    specKey: string;
    specValue: string;
    sortOrder?: number;
  }>,
) {
  if (specifications.length === 0) {
    return [];
  }

  const specKeys = Array.from(
    new Set(
      specifications
        .map((specification) => specification.specKey.trim().toUpperCase())
        .filter(Boolean),
    ),
  );
  const definitions = (await SpecificationDefinitionModel.find({
    specKey: { $in: specKeys },
    isActive: true,
  })
    .select("specKey")
    .lean()
    .exec()) as Array<{
    _id: unknown;
    specKey?: string;
  }>;
  const definitionMap = new Map(
    definitions.map((definition) => [
      String(definition.specKey ?? "").trim().toUpperCase(),
      String(definition._id),
    ]),
  );

  return specifications.map((specification) => ({
    ...specification,
    specDefinitionId:
      definitionMap.get(specification.specKey.trim().toUpperCase()) ?? undefined,
  }));
}

function parseCategorySpecDefinitions(lines: string[]) {
  return lines
    .map((line, index) => {
      const parts = line.split("|").map((part) => part.trim());
      const specKey = (parts[0] ?? "").toUpperCase();
      const specLabel = parts[1] ?? "";

      if (!specKey || !specLabel) {
        return null;
      }

      return {
        specKey,
        specLabel,
        valueType: (parts[2] || "TEXT").toUpperCase() as
          | "TEXT"
          | "NUMBER"
          | "BOOLEAN"
          | "ENUM",
        filterDisplayType: (parts[3] || "CHECKBOX").toUpperCase() as
          | "CHECKBOX"
          | "RADIO"
          | "RANGE"
          | "COLOR_SWATCH",
        isRequired: /^(true|yes|1|required)$/i.test(parts[4] ?? ""),
        isFilterable: !/^(false|no|0)$/i.test(parts[5] ?? ""),
        sortOrder: parts[6] ? Number(parts[6]) : index,
        unit: parts[7] || undefined,
      };
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value));
}

function parseCategoryOptionTypeMaps(lines: string[]) {
  return lines
    .map((line, index) => {
      const parts = line.split("|").map((part) => part.trim());
      const optionTypeKey = parts[0] ?? "";

      if (!optionTypeKey) {
        return null;
      }

      return {
        optionTypeKey,
        isRequired: /^(true|yes|1|required)$/i.test(parts[1] ?? ""),
        sortOrder: parts[2] ? Number(parts[2]) : index,
      };
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value));
}

function parseCategoryFilterConfigs(lines: string[]) {
  return lines
    .map((line, index) => {
      const parts = line.split("|").map((part) => part.trim());
      const filterKey = parts[0] ?? "";
      const filterLabel = parts[1] ?? "";
      const filterSource = (parts[2] || "").toUpperCase() as
        | "BRAND"
        | "PRICE"
        | "OPTION_TYPE"
        | "SPECIFICATION";

      if (!filterKey || !filterLabel || !filterSource) {
        return null;
      }

      return {
        filterKey,
        filterLabel,
        filterSource,
        sourceKey: parts[3] || undefined,
        displayType: (parts[4] || "CHECKBOX").toUpperCase() as
          | "CHECKBOX"
          | "RADIO"
          | "RANGE"
          | "COLOR_SWATCH",
        sortOrder: parts[5] ? Number(parts[5]) : index,
        isInherited: !/^(false|no|0)$/i.test(parts[6] ?? ""),
        isActive: !/^(false|no|0)$/i.test(parts[7] ?? ""),
      };
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value));
}

function parseImages(lines: string[]) {
  return normalizeImages(
    lines
      .map((line, index) => {
        const [assetId, sortOrderValue, primaryValue] = line
          .split("|")
          .map((part) => part.trim());

        if (!assetId) {
          return null;
        }

        return {
          assetId,
          sortOrder: sortOrderValue ? Number(sortOrderValue) : index,
          isPrimary: primaryValue === "primary" || primaryValue === "true" || index === 0,
        };
      })
      .filter((value): value is NonNullable<typeof value> => Boolean(value)),
  );
}

function parseDateInput(value?: string) {
  if (!value) {
    return undefined;
  }

  const parsedValue = new Date(value);
  return Number.isNaN(parsedValue.getTime()) ? undefined : parsedValue;
}

function uniqueObjectIds(values: string[]) {
  return Array.from(new Set(values.filter((value) => Types.ObjectId.isValid(value))));
}

function parseCatalogSchema<T>(schema: z.ZodType<T>, input: unknown) {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "Invalid catalog input.", 400);
  }

  return parsed.data;
}

function readRequiredNonNegativeNumber(
  formData: FormData,
  key: string,
  label: string,
) {
  const rawValue = readText(formData, key);

  if (!rawValue) {
    throw new AppError(`${label} is required.`, 400);
  }

  const value = Number(rawValue);

  if (!Number.isFinite(value)) {
    throw new AppError(`${label} must be a valid number.`, 400);
  }

  if (value < 0) {
    throw new AppError(`${label} must be zero or greater.`, 400);
  }

  return value;
}

function readOptionalNonNegativeNumber(
  formData: FormData,
  key: string,
  label: string,
) {
  const rawValue = readOptionalText(formData, key);

  if (!rawValue) {
    return undefined;
  }

  const value = Number(rawValue);

  if (!Number.isFinite(value)) {
    throw new AppError(`${label} must be a valid number.`, 400);
  }

  if (value < 0) {
    throw new AppError(`${label} must be zero or greater.`, 400);
  }

  return value;
}

function readNonNegativeIntegerWithFallback(
  formData: FormData,
  key: string,
  label: string,
  fallback: number,
) {
  const rawValue = readOptionalText(formData, key);

  if (!rawValue) {
    return fallback;
  }

  const value = Number(rawValue);

  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw new AppError(`${label} must be a whole number.`, 400);
  }

  if (value < 0) {
    throw new AppError(`${label} must be zero or greater.`, 400);
  }

  return value;
}

function humanizeCatalogField(fieldName: string) {
  const overrides: Record<string, string> = {
    sku: "SKU",
    slug: "Slug",
    code: "Code",
    productName: "Product name",
    variantName: "Variant name",
  };

  if (overrides[fieldName]) {
    return overrides[fieldName];
  }

  return fieldName
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (value) => value.toUpperCase());
}

function resolveCatalogActionError(error: unknown) {
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
      return `${humanizeCatalogField(duplicateField)} already exists.`;
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

function handleCatalogActionFailure(error: unknown, returnTo: string) {
  if (isRedirectError(error)) {
    throw error;
  }

  const message = resolveCatalogActionError(error);

  if (message) {
    failAction(returnTo, message);
  }

  throw error;
}

function readBulkIds(formData: FormData, returnTo: string) {
  const ids = uniqueObjectIds(readIds(formData, "selectedIds"));

  if (ids.length === 0) {
    failAction(returnTo, "Select at least one record first.", "amber");
  }

  return ids;
}

const productTypeInputSchema = z.object({
  title: z.string().trim().min(1, "Product type name is required.").max(80),
  code: z
    .string()
    .trim()
    .min(1, "Product type code is required.")
    .max(30)
    .transform((value) => value.toUpperCase()),
});

const productTagInputSchema = z.object({
  title: z.string().trim().min(1, "Tag name is required.").max(60),
  slug: z.string().trim().min(1, "Tag slug is required.").max(80),
});

const productBadgeInputSchema = z.object({
  title: z.string().trim().min(1, "Badge name is required.").max(60),
  label: z.string().trim().min(1, "Badge label is required.").max(60),
  colorCode: z.string().trim().max(20).optional(),
  isActive: z.boolean(),
});

const productGeneralInputSchema = z.object({
  productId: z.string().trim().optional(),
  productName: z.string().trim().min(1, "Product name is required.").max(200),
  slug: z.string().trim().max(200).optional(),
  productTypeId: z.string().trim().min(1, "Product type is required."),
  categoryId: z.string().trim().min(1, "Category is required."),
  brandId: z.string().trim().optional(),
  taxClassId: z.string().trim().optional(),
  originCountryId: z.string().trim().optional(),
  shortDescription: z.string().trim().max(500).optional(),
  description: z.string().trim().optional(),
  material: z.string().trim().max(120).optional(),
  careInstructions: z.string().trim().max(255).optional(),
  warrantyInfo: z.string().trim().max(255).optional(),
  conditionType: z.enum(["NEW", "REFURBISHED"]),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  visibility: z.enum(["PUBLIC", "HIDDEN"]),
  isFeatured: z.boolean(),
  isNewArrival: z.boolean(),
  isBestSeller: z.boolean(),
  collectionIds: z.array(z.string()),
  tagIds: z.array(z.string()),
  badgeIds: z.array(z.string()),
  optionTypeIds: z.array(z.string()),
});

const productSeoInputSchema = z.object({
  productId: z.string().trim().min(1, "Product id is required."),
  seoTitle: z.string().trim().max(255).optional(),
  seoDescription: z.string().trim().max(500).optional(),
});

const productSpecificationsInputSchema = z.object({
  productId: z.string().trim().min(1, "Product id is required."),
  specificationsText: z.string().trim().optional(),
});

const productFaqInputSchema = z.object({
  productId: z.string().trim().min(1, "Product id is required."),
  faqId: z.string().trim().optional(),
  question: z.string().trim().min(1, "Question is required.").max(255),
  answer: z.string().trim().min(1, "Answer is required."),
  sortOrder: z.coerce.number().int().min(0),
  isActive: z.boolean(),
});

const productFaqDeleteSchema = z.object({
  productId: z.string().trim().min(1, "Product id is required."),
  faqId: z.string().trim().min(1, "FAQ id is required."),
});

const productRelationInputSchema = z.object({
  productId: z.string().trim().min(1, "Product id is required."),
  relatedProductId: z.string().trim().min(1, "Related product is required."),
  relationType: z.enum(["RELATED", "UPSELL", "CROSS_SELL", "SIMILAR"]),
  sortOrder: z.coerce.number().int().min(0),
});

const productRelationDeleteSchema = z.object({
  productId: z.string().trim().min(1, "Product id is required."),
  relationId: z.string().trim().min(1, "Relation id is required."),
});

const productBundleItemInputSchema = z.object({
  productId: z.string().trim().min(1, "Product id is required."),
  childProductId: z.string().trim().min(1, "Bundle product is required."),
  childVariantId: z.string().trim().optional(),
  quantity: z.coerce.number().int().min(1),
  sortOrder: z.coerce.number().int().min(0),
});

const productBundleItemDeleteSchema = z.object({
  productId: z.string().trim().min(1, "Product id is required."),
  bundleItemId: z.string().trim().min(1, "Bundle item id is required."),
});

const promotionInputSchema = z
  .object({
    promotionId: z.string().trim().optional(),
    code: z.string().trim().max(50).optional(),
    name: z.string().trim().min(1, "Promotion name is required.").max(150),
    description: z.string().trim().optional(),
    promotionType: z.enum(["COUPON", "FLASH_SALE", "AUTO_DISCOUNT", "FREE_SHIPPING"]),
    discountType: z.enum(["PERCENT", "AMOUNT"]).optional(),
    discountValue: z.coerce.number().min(0).optional(),
    minOrderAmount: z.coerce.number().min(0).optional(),
    maxDiscountAmount: z.coerce.number().min(0).optional(),
    usageLimit: z.coerce.number().int().min(1).optional(),
    perCustomerLimit: z.coerce.number().int().min(1).optional(),
    startsAt: z.string().trim().optional(),
    endsAt: z.string().trim().optional(),
    heroAssetId: z.string().trim().optional(),
    isActive: z.boolean(),
    redirectToDetail: z.boolean().optional(),
  })
  .superRefine((input, ctx) => {
    if (input.promotionType !== "FREE_SHIPPING" && input.discountValue === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Discount value is required unless the promotion is free shipping.",
        path: ["discountValue"],
      });
    }

    if (input.promotionType === "FREE_SHIPPING" && input.discountType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Free shipping promotions cannot use a discount type.",
        path: ["discountType"],
      });
    }
  });

const promotionTargetInputSchema = z.object({
  promotionId: z.string().trim().min(1, "Promotion id is required."),
  targetType: z.enum(["product", "variant"]),
  targetId: z.string().trim().min(1, "Choose a target before attaching it."),
});

async function findProductOrThrow(productId: string) {
  if (!Types.ObjectId.isValid(productId)) {
    throw new AppError("Product record was not found.", 404);
  }

  const product = await ProductModel.findById(productId).exec();

  if (!product) {
    throw new AppError("Product record was not found.", 404);
  }

  return product;
}

async function ensureOptionalCountryExists(countryId?: string) {
  if (!countryId) {
    return;
  }

  if (!Types.ObjectId.isValid(countryId)) {
    throw new AppError("Origin country is invalid.", 400);
  }

  const country = await CountryModel.findById(countryId).select("_id").lean().exec();

  if (!country) {
    throw new AppError("Origin country was not found.", 404);
  }
}

async function ensureRequiredCategoryOptionTypes(
  categoryId: string,
  selectedOptionTypeIds: string[],
) {
  const requiredMaps = (await CategoryOptionTypeMapModel.find({
    categoryId,
    isRequired: true,
  })
    .select("optionTypeId")
    .lean()
    .exec()) as Array<{ optionTypeId?: unknown }>;

  if (requiredMaps.length === 0) {
    return;
  }

  const selectedSet = new Set(selectedOptionTypeIds);
  const optionTypes = (await OptionTypeModel.find({
    _id: {
      $in: requiredMaps
        .map((item) => String(item.optionTypeId ?? ""))
        .filter((value) => Types.ObjectId.isValid(value))
        .map((value) => new Types.ObjectId(value)),
    },
  })
    .select("optionName")
    .lean()
    .exec()) as Array<{ _id: unknown; optionName?: string }>;

  const missingOptionType = optionTypes.find(
    (optionType) => !selectedSet.has(String(optionType._id)),
  );

  if (missingOptionType) {
    throw new AppError(
      `${String(missingOptionType.optionName ?? "A required option type")} is required for the selected category.`,
      400,
    );
  }
}

export async function saveProductAction(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.catalogView);

  const productId = readText(formData, "productId");
  const returnTo = getReturnTo(formData, "/dashboard/catalog/products");

  try {
    const productName = readText(formData, "productName");
    const conditionType = (readText(formData, "conditionType") || "NEW") as
      | "NEW"
      | "REFURBISHED";
    const status = (readText(formData, "status") || "DRAFT") as
      | "DRAFT"
      | "ACTIVE"
      | "ARCHIVED";
    const visibility = (readText(formData, "visibility") || "PUBLIC") as
      | "PUBLIC"
      | "HIDDEN";
    const specifications = await attachSpecificationDefinitionIds(
      parseSpecifications(readTextLines(formData, "specificationsText")),
    );
    const payload = {
      productName,
      slug: readOptionalText(formData, "slug"),
      productTypeId: readText(formData, "productTypeId"),
      categoryId: readText(formData, "categoryId"),
      brandId: readOptionalText(formData, "brandId"),
      taxClassId: readOptionalText(formData, "taxClassId"),
      originCountryId: readOptionalText(formData, "originCountryId"),
      shortDescription: readOptionalText(formData, "shortDescription"),
      description: readOptionalText(formData, "description"),
      material: readOptionalText(formData, "material"),
      careInstructions: readOptionalText(formData, "careInstructions"),
      warrantyInfo: readOptionalText(formData, "warrantyInfo"),
      conditionType,
      status,
      visibility,
      isFeatured: readCheckbox(formData, "isFeatured"),
      isNewArrival: readCheckbox(formData, "isNewArrival"),
      isBestSeller: readCheckbox(formData, "isBestSeller"),
      seoTitle: readOptionalText(formData, "seoTitle"),
      seoDescription: readOptionalText(formData, "seoDescription"),
      collectionIds: readIds(formData, "collectionIds"),
      optionTypeIds: readIds(formData, "optionTypeIds"),
      specifications,
    };

    const parsed = parseCatalogSchema(productGeneralInputSchema, {
      productId: productId || undefined,
      productName: payload.productName,
      slug: payload.slug,
      productTypeId: payload.productTypeId,
      categoryId: payload.categoryId,
      brandId: payload.brandId,
      taxClassId: payload.taxClassId,
      originCountryId: payload.originCountryId,
      shortDescription: payload.shortDescription,
      description: payload.description,
      material: payload.material,
      careInstructions: payload.careInstructions,
      warrantyInfo: payload.warrantyInfo,
      conditionType: payload.conditionType,
      status: payload.status,
      visibility: payload.visibility,
      isFeatured: payload.isFeatured,
      isNewArrival: payload.isNewArrival,
      isBestSeller: payload.isBestSeller,
      collectionIds: uniqueObjectIds(payload.collectionIds),
      tagIds: [],
      badgeIds: [],
      optionTypeIds: uniqueObjectIds(payload.optionTypeIds),
    });
    const resolvedSlug = await resolveProductSlugValue({
      productId: productId || undefined,
      productName: parsed.productName,
      requestedSlug: parsed.slug,
    });

    await ensureOptionalCountryExists(parsed.originCountryId);
    await ensureRequiredCategoryOptionTypes(parsed.categoryId, parsed.optionTypeIds);

    if (productId && Types.ObjectId.isValid(productId)) {
      const existingProduct = await ProductModel.findById(productId).exec();

      if (existingProduct) {
        await ProductModel.findByIdAndUpdate(
          productId,
          {
            ...payload,
            slug: resolvedSlug,
            publishedAt:
              payload.status === "ACTIVE"
                ? existingProduct.publishedAt ?? new Date()
                : existingProduct.publishedAt,
          },
          {
            runValidators: true,
          },
        ).exec();

        await catalogStandaloneSyncService.syncProductRecords(productId);
        await systemEventsService.recordAuditLog({
          actorUserId: user.id,
          action: "PRODUCT_UPDATE",
          entityType: "PRODUCT",
          entityId: productId,
          afterData: {
            productName: payload.productName,
            slug: resolvedSlug,
            categoryId: payload.categoryId,
            status: payload.status,
          },
        });

        finishAction(returnTo, [
          "/dashboard/catalog/products",
          `/dashboard/catalog/products/${productId}`,
        ]);
      }
    }

    const createdProduct = await catalogService.createProduct({
      ...payload,
      slug: resolvedSlug,
      originCountryId: parsed.originCountryId,
      collectionIds: parsed.collectionIds,
      optionTypeIds: parsed.optionTypeIds,
    });

    await catalogStandaloneSyncService.syncProductRecords(createdProduct.id);
    await systemEventsService.recordAuditLog({
      actorUserId: user.id,
      action: "PRODUCT_CREATE",
      entityType: "PRODUCT",
      entityId: createdProduct.id,
      afterData: {
        productName: createdProduct.productName,
        slug: createdProduct.slug,
        categoryId: createdProduct.categoryId?.toString?.() ?? String(createdProduct.categoryId ?? ""),
      },
    });

    revalidatePath("/dashboard/catalog/products");
    redirect(`/dashboard/catalog/products/${createdProduct.id}`);
  } catch (error) {
    handleCatalogActionFailure(error, returnTo);
  }
}

export async function saveProductGeneralAction(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.catalogView);
  const rawProductId = readOptionalText(formData, "productId");
  const returnTo = getReturnTo(
    formData,
    rawProductId
      ? `/dashboard/catalog/products/${rawProductId}`
      : "/dashboard/catalog/products/new",
  );

  try {
    const parsed = parseCatalogSchema(productGeneralInputSchema, {
      productId: rawProductId,
      productName: readText(formData, "productName"),
      slug: readOptionalText(formData, "slug"),
      productTypeId: readText(formData, "productTypeId"),
      categoryId: readText(formData, "categoryId"),
      brandId: readOptionalText(formData, "brandId"),
      taxClassId: readOptionalText(formData, "taxClassId"),
      originCountryId: readOptionalText(formData, "originCountryId"),
      shortDescription: readOptionalText(formData, "shortDescription"),
      description: readOptionalText(formData, "description"),
      material: readOptionalText(formData, "material"),
      careInstructions: readOptionalText(formData, "careInstructions"),
      warrantyInfo: readOptionalText(formData, "warrantyInfo"),
      conditionType: readText(formData, "conditionType") || "NEW",
      status: readText(formData, "status") || "DRAFT",
      visibility: readText(formData, "visibility") || "PUBLIC",
      isFeatured: readCheckbox(formData, "isFeatured"),
      isNewArrival: readCheckbox(formData, "isNewArrival"),
      isBestSeller: readCheckbox(formData, "isBestSeller"),
      collectionIds: uniqueObjectIds(readIds(formData, "collectionIds")),
      tagIds: uniqueObjectIds(readIds(formData, "tagIds")),
      badgeIds: uniqueObjectIds(readIds(formData, "badgeIds")),
      optionTypeIds: uniqueObjectIds(readIds(formData, "optionTypeIds")),
    });

    await ensureOptionalCountryExists(parsed.originCountryId);
    await ensureRequiredCategoryOptionTypes(parsed.categoryId, parsed.optionTypeIds);

    if (parsed.productId && Types.ObjectId.isValid(parsed.productId)) {
      const product = await findProductOrThrow(parsed.productId);
      const resolvedSlug = await resolveProductSlugValue({
        productId: parsed.productId,
        productName: parsed.productName,
        requestedSlug: parsed.slug,
        existingSlug: typeof product.slug === "string" ? product.slug : undefined,
      });

      await ProductModel.findByIdAndUpdate(
        parsed.productId,
        {
          productName: parsed.productName,
          slug: resolvedSlug,
          productTypeId: parsed.productTypeId,
          categoryId: parsed.categoryId,
          brandId: parsed.brandId,
          taxClassId: parsed.taxClassId,
          originCountryId: parsed.originCountryId,
          shortDescription: parsed.shortDescription,
          description: parsed.description,
          material: parsed.material,
          careInstructions: parsed.careInstructions,
          warrantyInfo: parsed.warrantyInfo,
          conditionType: parsed.conditionType,
          status: parsed.status,
          visibility: parsed.visibility,
          isFeatured: parsed.isFeatured,
          isNewArrival: parsed.isNewArrival,
          isBestSeller: parsed.isBestSeller,
          collectionIds: parsed.collectionIds,
          tagIds: parsed.tagIds,
          badgeIds: parsed.badgeIds,
          optionTypeIds: parsed.optionTypeIds,
          publishedAt:
            parsed.status === "ACTIVE"
              ? product.publishedAt ?? new Date()
              : product.publishedAt,
        },
        {
          runValidators: true,
        },
      ).exec();

      await catalogStandaloneSyncService.syncProductRecords(parsed.productId);
      await systemEventsService.recordAuditLog({
        actorUserId: user.id,
        action: "PRODUCT_UPDATE",
        entityType: "PRODUCT",
        entityId: parsed.productId,
        beforeData: {
          productName: product.productName,
          slug: product.slug,
          status: product.status,
          visibility: product.visibility,
        },
        afterData: {
          productName: parsed.productName,
          slug: parsed.slug,
          status: parsed.status,
          visibility: parsed.visibility,
        },
      });

      finishAction(returnTo, buildProductRevalidatePaths(parsed.productId));
    }

    const resolvedSlug = await resolveProductSlugValue({
      productName: parsed.productName,
      requestedSlug: parsed.slug,
    });

    const createdProduct = await catalogService.createProduct({
      productName: parsed.productName,
      slug: resolvedSlug,
      productTypeId: parsed.productTypeId,
      categoryId: parsed.categoryId,
      brandId: parsed.brandId,
      taxClassId: parsed.taxClassId,
      originCountryId: parsed.originCountryId,
      shortDescription: parsed.shortDescription,
      description: parsed.description,
      material: parsed.material,
      careInstructions: parsed.careInstructions,
      warrantyInfo: parsed.warrantyInfo,
      conditionType: parsed.conditionType,
      status: parsed.status,
      visibility: parsed.visibility,
      isFeatured: parsed.isFeatured,
      isNewArrival: parsed.isNewArrival,
      isBestSeller: parsed.isBestSeller,
      collectionIds: parsed.collectionIds,
      tagIds: parsed.tagIds,
      badgeIds: parsed.badgeIds,
      optionTypeIds: parsed.optionTypeIds,
    });

    await catalogStandaloneSyncService.syncProductRecords(createdProduct.id);
    await systemEventsService.recordAuditLog({
      actorUserId: user.id,
      action: "PRODUCT_CREATE",
      entityType: "PRODUCT",
      entityId: createdProduct.id,
      afterData: {
        productName: createdProduct.productName,
        slug: createdProduct.slug,
      },
    });

    finishAction(
      `/dashboard/catalog/products/${createdProduct.id}`,
      buildProductRevalidatePaths(createdProduct.id),
    );
  } catch (error) {
    handleCatalogActionFailure(error, returnTo);
  }
}

export async function saveProductSeoAction(formData: FormData) {
  await requirePermission(PERMISSIONS.catalogView);
  const productId = readText(formData, "productId");
  const returnTo = getReturnTo(
    formData,
    `/dashboard/catalog/products/${productId}/seo`,
  );

  try {
    const parsed = parseCatalogSchema(productSeoInputSchema, {
      productId,
      seoTitle: readOptionalText(formData, "seoTitle"),
      seoDescription: readOptionalText(formData, "seoDescription"),
    });

    await findProductOrThrow(parsed.productId);
    await ProductModel.findByIdAndUpdate(
      parsed.productId,
      {
        seoTitle: parsed.seoTitle,
        seoDescription: parsed.seoDescription,
      },
      {
        runValidators: true,
      },
    ).exec();

    finishAction(returnTo, buildProductRevalidatePaths(parsed.productId));
  } catch (error) {
    handleCatalogActionFailure(error, returnTo);
  }
}

export async function saveProductSpecificationsAction(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.catalogView);
  const productId = readText(formData, "productId");
  const returnTo = getReturnTo(
    formData,
    `/dashboard/catalog/products/${productId}/specifications`,
  );

  try {
    const parsed = parseCatalogSchema(productSpecificationsInputSchema, {
      productId,
      specificationsText: readText(formData, "specificationsText"),
    });

    await findProductOrThrow(parsed.productId);
    const specifications = await attachSpecificationDefinitionIds(
      parseSpecifications(
        (parsed.specificationsText ?? "")
          .split(/\r?\n/)
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    );
    await ProductModel.findByIdAndUpdate(
      parsed.productId,
      {
        specifications,
      },
      {
        runValidators: true,
      },
    ).exec();

    await catalogStandaloneSyncService.syncProductRecords(parsed.productId);
    await systemEventsService.recordAuditLog({
      actorUserId: user.id,
      action: "PRODUCT_SPECIFICATIONS_UPDATE",
      entityType: "PRODUCT",
      entityId: parsed.productId,
      afterData: {
        specificationCount: specifications.length,
      },
    });

    finishAction(returnTo, buildProductRevalidatePaths(parsed.productId));
  } catch (error) {
    handleCatalogActionFailure(error, returnTo);
  }
}

export async function saveProductFaqAction(formData: FormData) {
  await requirePermission(PERMISSIONS.catalogView);
  const productId = readText(formData, "productId");
  const returnTo = getReturnTo(
    formData,
    `/dashboard/catalog/products/${productId}/faq`,
  );

  try {
    const parsed = parseCatalogSchema(productFaqInputSchema, {
      productId,
      faqId: readOptionalText(formData, "faqId"),
      question: readText(formData, "question"),
      answer: readText(formData, "answer"),
      sortOrder: readText(formData, "sortOrder") || "0",
      isActive: readCheckbox(formData, "isActive"),
    });

    const product = await findProductOrThrow(parsed.productId);
    const faqs = [...(product.faqs ?? [])];
    const existingFaq = parsed.faqId
      ? faqs.find((faq: { _id?: unknown }) => String(faq._id) === parsed.faqId)
      : null;

    if (existingFaq) {
      existingFaq.question = parsed.question;
      existingFaq.answer = parsed.answer;
      existingFaq.sortOrder = parsed.sortOrder;
      existingFaq.isActive = parsed.isActive;
    } else {
      faqs.push({
        _id: new Types.ObjectId(),
        question: parsed.question,
        answer: parsed.answer,
        sortOrder: parsed.sortOrder,
        isActive: parsed.isActive,
      });
    }

    product.faqs = faqs
      .sort((left, right) => Number(left.sortOrder ?? 0) - Number(right.sortOrder ?? 0))
      .map(
        (faq: {
          _id?: unknown;
          question?: string;
          answer?: string;
          sortOrder?: number;
          isActive?: boolean;
        }) => ({
          _id: faq._id,
          question: faq.question,
          answer: faq.answer,
          sortOrder: faq.sortOrder,
          isActive: faq.isActive,
        }),
      );
    await product.save();

    finishAction(returnTo, buildProductRevalidatePaths(parsed.productId));
  } catch (error) {
    handleCatalogActionFailure(error, returnTo);
  }
}

export async function deleteProductFaqAction(formData: FormData) {
  await requirePermission(PERMISSIONS.catalogView);
  const productId = readText(formData, "productId");
  const returnTo = getReturnTo(
    formData,
    `/dashboard/catalog/products/${productId}/faq`,
  );

  try {
    const parsed = parseCatalogSchema(productFaqDeleteSchema, {
      productId,
      faqId: readText(formData, "faqId"),
    });

    const product = await findProductOrThrow(parsed.productId);
    product.faqs = (product.faqs ?? []).filter(
      (faq: { _id?: unknown }) => String(faq._id) !== parsed.faqId,
    );
    await product.save();

    finishAction(returnTo, buildProductRevalidatePaths(parsed.productId));
  } catch (error) {
    handleCatalogActionFailure(error, returnTo);
  }
}

export async function attachProductRelationAction(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.catalogView);
  const productId = readText(formData, "productId");
  const returnTo = getReturnTo(
    formData,
    `/dashboard/catalog/products/${productId}/relations`,
  );

  try {
    const parsed = parseCatalogSchema(productRelationInputSchema, {
      productId,
      relatedProductId: readText(formData, "relatedProductId"),
      relationType: readText(formData, "relationType") || "RELATED",
      sortOrder: readText(formData, "sortOrder") || "0",
    });

    if (parsed.productId === parsed.relatedProductId) {
      throw new AppError("A product cannot relate to itself.", 400);
    }

    await findProductOrThrow(parsed.productId);
    const relatedProduct = await ProductModel.findById(parsed.relatedProductId)
      .select("_id")
      .lean()
      .exec();

    if (!relatedProduct) {
      throw new AppError("Related product was not found.", 404);
    }

    const product = await findProductOrThrow(parsed.productId);
    const exists = (product.relations ?? []).some(
      (relation: { relatedProductId?: unknown; relationType?: string }) =>
        String(relation.relatedProductId) === parsed.relatedProductId &&
        relation.relationType === parsed.relationType,
    );

    if (!exists) {
      product.relations = [
        ...(product.relations ?? []),
        {
          _id: new Types.ObjectId(),
          relatedProductId: new Types.ObjectId(parsed.relatedProductId),
          relationType: parsed.relationType,
          sortOrder: parsed.sortOrder,
        },
      ].sort((left, right) => Number(left.sortOrder ?? 0) - Number(right.sortOrder ?? 0));
      await product.save();
    }

    await catalogStandaloneSyncService.syncProductRecords(parsed.productId);
    await systemEventsService.recordAuditLog({
      actorUserId: user.id,
      action: "PRODUCT_RELATION_ATTACH",
      entityType: "PRODUCT",
      entityId: parsed.productId,
      afterData: {
        relatedProductId: parsed.relatedProductId,
        relationType: parsed.relationType,
      },
    });

    finishAction(returnTo, buildProductRevalidatePaths(parsed.productId));
  } catch (error) {
    handleCatalogActionFailure(error, returnTo);
  }
}

export async function detachProductRelationAction(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.catalogView);
  const productId = readText(formData, "productId");
  const returnTo = getReturnTo(
    formData,
    `/dashboard/catalog/products/${productId}/relations`,
  );

  try {
    const parsed = parseCatalogSchema(productRelationDeleteSchema, {
      productId,
      relationId: readText(formData, "relationId"),
    });

    const product = await findProductOrThrow(parsed.productId);
    product.relations = (product.relations ?? []).filter(
      (relation: { _id?: unknown }) => String(relation._id) !== parsed.relationId,
    );
    await product.save();

    await catalogStandaloneSyncService.syncProductRecords(parsed.productId);
    await systemEventsService.recordAuditLog({
      actorUserId: user.id,
      action: "PRODUCT_RELATION_DETACH",
      entityType: "PRODUCT",
      entityId: parsed.productId,
      afterData: {
        relationId: parsed.relationId,
      },
    });

    finishAction(returnTo, buildProductRevalidatePaths(parsed.productId));
  } catch (error) {
    handleCatalogActionFailure(error, returnTo);
  }
}

export async function attachProductBundleItemAction(formData: FormData) {
  await requirePermission(PERMISSIONS.catalogView);
  const productId = readText(formData, "productId");
  const returnTo = getReturnTo(
    formData,
    `/dashboard/catalog/products/${productId}/bundles`,
  );

  try {
    const parsed = parseCatalogSchema(productBundleItemInputSchema, {
      productId,
      childProductId: readText(formData, "childProductId"),
      childVariantId: readOptionalText(formData, "childVariantId"),
      quantity: readText(formData, "quantity") || "1",
      sortOrder: readText(formData, "sortOrder") || "0",
    });

    if (parsed.productId === parsed.childProductId) {
      throw new AppError("A bundle cannot include itself as a child product.", 400);
    }

    await findProductOrThrow(parsed.productId);
    const childProduct = await ProductModel.findById(parsed.childProductId)
      .select("_id")
      .lean()
      .exec();

    if (!childProduct) {
      throw new AppError("Child product was not found.", 404);
    }

    if (parsed.childVariantId) {
      const childVariant = await ProductVariantModel.findById(parsed.childVariantId)
        .select("productId")
        .lean()
        .exec();

      if (!childVariant) {
        throw new AppError("Child variant was not found.", 404);
      }

      if (String(childVariant.productId ?? "") !== parsed.childProductId) {
        throw new AppError(
          "The selected variant does not belong to the selected child product.",
          400,
        );
      }
    }

    const product = await findProductOrThrow(parsed.productId);
    const exists = (product.bundleItems ?? []).some(
      (item: { childProductId?: unknown; childVariantId?: unknown }) =>
        String(item.childProductId) === parsed.childProductId &&
        String(item.childVariantId ?? "") === (parsed.childVariantId ?? ""),
    );

    if (!exists) {
      product.bundleItems = [
        ...(product.bundleItems ?? []),
        {
          _id: new Types.ObjectId(),
          childProductId: new Types.ObjectId(parsed.childProductId),
          childVariantId: parsed.childVariantId
            ? new Types.ObjectId(parsed.childVariantId)
            : undefined,
          quantity: parsed.quantity,
          sortOrder: parsed.sortOrder,
        },
      ].sort((left, right) => Number(left.sortOrder ?? 0) - Number(right.sortOrder ?? 0));
      await product.save();
    }

    finishAction(returnTo, buildProductRevalidatePaths(parsed.productId));
  } catch (error) {
    handleCatalogActionFailure(error, returnTo);
  }
}

export async function detachProductBundleItemAction(formData: FormData) {
  await requirePermission(PERMISSIONS.catalogView);
  const productId = readText(formData, "productId");
  const returnTo = getReturnTo(
    formData,
    `/dashboard/catalog/products/${productId}/bundles`,
  );

  try {
    const parsed = parseCatalogSchema(productBundleItemDeleteSchema, {
      productId,
      bundleItemId: readText(formData, "bundleItemId"),
    });

    const product = await findProductOrThrow(parsed.productId);
    product.bundleItems = (product.bundleItems ?? []).filter(
      (item: { _id?: unknown }) => String(item._id) !== parsed.bundleItemId,
    );
    await product.save();

    finishAction(returnTo, buildProductRevalidatePaths(parsed.productId));
  } catch (error) {
    handleCatalogActionFailure(error, returnTo);
  }
}

export async function saveProductImagesAction(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.catalogView);

  const productId = readText(formData, "productId");
  const returnTo = getReturnTo(formData, `/dashboard/catalog/products/${productId}/images`);

  try {
    await findProductOrThrow(productId);
    await ProductModel.findByIdAndUpdate(
      productId,
      {
        images: parseImages(readTextLines(formData, "imageAssetIds")),
      },
      {
        runValidators: true,
      },
    ).exec();

    await catalogStandaloneSyncService.syncProductRecords(productId);
    await systemEventsService.recordAuditLog({
      actorUserId: user.id,
      action: "PRODUCT_IMAGES_UPDATE",
      entityType: "PRODUCT",
      entityId: productId,
    });

    finishAction(returnTo, buildProductRevalidatePaths(productId));
  } catch (error) {
    handleCatalogActionFailure(error, returnTo);
  }
}

export async function uploadProductImageAction(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.catalogView);

  const productId = readText(formData, "productId");
  const returnTo = getReturnTo(formData, `/dashboard/catalog/products/${productId}/images`);

  try {
    const file = readUploadFile(formData, "imageFile");
    const product = await findProductOrThrow(productId);

    const asset = await storeUploadedImageAsset(file, {
      title: readOptionalText(formData, "title"),
      altText: readOptionalText(formData, "altText"),
    });

    const nextImages = normalizeImages([
      ...(product.images ?? []).map(
        (image: { assetId?: unknown; sortOrder?: number; isPrimary?: boolean }) => ({
          assetId: String(image.assetId),
          sortOrder: Number(image.sortOrder ?? 0),
          isPrimary: Boolean(image.isPrimary),
        }),
      ),
      {
        assetId: String(asset.id),
        sortOrder: readNonNegativeIntegerWithFallback(
          formData,
          "sortOrder",
          "Sort order",
          product.images?.length ?? 0,
        ),
        isPrimary: readCheckbox(formData, "isPrimary"),
      },
    ]);

    await ProductModel.findByIdAndUpdate(
      productId,
      {
        images: nextImages,
      },
      {
        runValidators: true,
      },
    ).exec();

    await catalogStandaloneSyncService.syncProductRecords(productId);
    await systemEventsService.recordAuditLog({
      actorUserId: user.id,
      action: "PRODUCT_IMAGE_UPLOAD",
      entityType: "PRODUCT",
      entityId: productId,
      afterData: {
        assetId: String(asset.id),
      },
    });

    finishAction(returnTo, buildProductRevalidatePaths(productId));
  } catch (error) {
    handleCatalogActionFailure(error, returnTo);
  }
}

export async function bulkProductAction(formData: FormData) {
  await requirePermission(PERMISSIONS.catalogView);

  const action = readText(formData, "bulkAction");
  const returnTo = getReturnTo(formData, "/dashboard/catalog/products");
  const selectedIds = readIds(formData, "selectedIds");
  const objectIds = selectedIds
    .filter((value) => Types.ObjectId.isValid(value))
    .map((value) => new Types.ObjectId(value));

  if (objectIds.length === 0) {
    finishAction(returnTo, ["/dashboard/catalog/products"]);
  }

  if (action === "publish") {
    await ProductModel.updateMany(
      { _id: { $in: objectIds } },
      { status: "ACTIVE", publishedAt: new Date() },
    ).exec();
  }

  if (action === "archive") {
    await ProductModel.updateMany(
      { _id: { $in: objectIds } },
      { status: "ARCHIVED" },
    ).exec();
  }

  if (action === "delete") {
    const variants = await ProductVariantModel.find({
      productId: { $in: objectIds },
    })
      .select("_id")
      .lean()
      .exec();

    await VariantSourceModel.deleteMany({
      variantId: { $in: variants.map((variant) => variant._id) },
    }).exec();
    await catalogStandaloneSyncService.deleteVariantOptionValueRecords(
      variants.map((variant) => String(variant._id)),
    );
    await catalogStandaloneSyncService.deleteProductRecords(selectedIds);
    await ProductVariantModel.deleteMany({ productId: { $in: objectIds } }).exec();
    await ProductModel.deleteMany({ _id: { $in: objectIds } }).exec();
  }

  finishAction(returnTo, ["/dashboard/catalog/products"]);
}

export async function saveVariantAction(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.catalogView);

  const productId = readText(formData, "productId");
  const variantId = readText(formData, "variantId");
  const returnTo = getReturnTo(formData, `/dashboard/catalog/products/${productId}`);

  try {
    const product = await findProductOrThrow(productId);
    const requestedSku = readOptionalText(formData, "sku");

    const stockQty = readNonNegativeIntegerWithFallback(
      formData,
      "stockQty",
      "Opening stock",
      0,
    );
    const payload = {
      productId,
      variantName: readOptionalText(formData, "variantName"),
      unitPrice: readRequiredNonNegativeNumber(formData, "unitPrice", "Price"),
      compareAtPrice: readOptionalNonNegativeNumber(
        formData,
        "compareAtPrice",
        "Compare price",
      ),
      costPrice: readOptionalNonNegativeNumber(formData, "costPrice", "Cost price"),
      stockQty,
      lowStockThreshold: readNonNegativeIntegerWithFallback(
        formData,
        "lowStockThreshold",
        "Low stock threshold",
        5,
      ),
      trackInventory: readCheckbox(formData, "trackInventory"),
      allowBackorder: readCheckbox(formData, "allowBackorder"),
      isDefault: readCheckbox(formData, "isDefault"),
      isActive: readCheckbox(formData, "isActive"),
      optionValueIds: uniqueObjectIds(readIds(formData, "optionValueIds")),
    };
    const optionValues = payload.optionValueIds.length
      ? ((await OptionValueModel.find({
          _id: { $in: payload.optionValueIds.map((id) => new Types.ObjectId(id)) },
        })
          .select("optionTypeId")
          .lean()
          .exec()) as Array<{ optionTypeId?: unknown }>)
      : [];

    if (optionValues.length !== payload.optionValueIds.length) {
      throw new AppError("One or more selected option values were not found.", 404);
    }

    const allowedOptionTypeIds = new Set(
      (product.optionTypeIds ?? []).map((optionTypeId: unknown) => String(optionTypeId)),
    );
    const seenOptionTypeIds = new Set<string>();

    for (const optionValue of optionValues) {
      const optionTypeId = String(optionValue.optionTypeId ?? "");

      if (!allowedOptionTypeIds.has(optionTypeId)) {
        throw new AppError(
          "Selected option values must belong to this product's configured option types.",
          400,
        );
      }

      if (seenOptionTypeIds.has(optionTypeId)) {
        throw new AppError("Choose only one value per option type for a variant.", 400);
      }

      seenOptionTypeIds.add(optionTypeId);
    }

    if (variantId && Types.ObjectId.isValid(variantId)) {
      const existingVariant = await ProductVariantModel.findById(variantId).exec();

      if (!existingVariant) {
        throw new AppError("Variant record was not found.", 404);
      }

      if (String(existingVariant.productId) !== productId) {
        throw new AppError("Variant record was not found for this product.", 404);
      }

      if (payload.isDefault) {
        await ProductVariantModel.updateMany(
          { productId, _id: { $ne: existingVariant._id } },
          { isDefault: false },
        ).exec();
      }
      const resolvedSku = await resolveVariantSkuValue({
        productId,
        seed: payload.variantName?.trim() || product.productName,
        requestedSku,
        existingVariantId: variantId,
        existingSku: existingVariant.sku,
      });

      await ProductVariantModel.findByIdAndUpdate(
        variantId,
        {
          ...payload,
          sku: resolvedSku,
          reservedQty: existingVariant.reservedQty,
          availableQty: stockQty - existingVariant.reservedQty,
        },
        {
          runValidators: true,
        },
      ).exec();

      await catalogStandaloneSyncService.syncVariantOptionValues(variantId);
      await systemEventsService.recordAuditLog({
        actorUserId: user.id,
        action: "VARIANT_UPDATE",
        entityType: "VARIANT",
        entityId: variantId,
        afterData: {
          sku: resolvedSku,
          productId,
          optionValueIds: payload.optionValueIds,
        },
      });

      finishAction(returnTo, buildProductRevalidatePaths(productId));
    }

    const createdVariant = await catalogService.addVariant({
      ...payload,
      sku: requestedSku,
    });
    await catalogStandaloneSyncService.syncVariantOptionValues(createdVariant.id);
    await systemEventsService.recordAuditLog({
      actorUserId: user.id,
      action: "VARIANT_CREATE",
      entityType: "VARIANT",
      entityId: createdVariant.id,
      afterData: {
        sku: createdVariant.sku,
        productId,
        optionValueIds: payload.optionValueIds,
      },
    });
    finishAction(returnTo, buildProductRevalidatePaths(productId));
  } catch (error) {
    handleCatalogActionFailure(error, returnTo);
  }
}

export async function saveVariantImagesAction(formData: FormData) {
  await requirePermission(PERMISSIONS.catalogView);

  const productId = readText(formData, "productId");
  const variantId = readText(formData, "variantId");
  const returnTo = getReturnTo(formData, `/dashboard/catalog/products/${productId}/images`);

  try {
    if (!Types.ObjectId.isValid(variantId)) {
      throw new AppError("Variant record was not found.", 404);
    }

    const variant = await ProductVariantModel.findById(variantId)
      .select("productId")
      .lean()
      .exec();

    if (!variant) {
      throw new AppError("Variant record was not found.", 404);
    }

    if (String(variant.productId ?? "") !== productId) {
      throw new AppError("Variant record was not found for this product.", 404);
    }

    await ProductVariantModel.findByIdAndUpdate(
      variantId,
      {
        images: parseImages(readTextLines(formData, "variantImageAssetIds")),
      },
      {
        runValidators: true,
      },
    ).exec();

    await catalogStandaloneSyncService.syncVariantImages(variantId);

    finishAction(returnTo, buildProductRevalidatePaths(productId));
  } catch (error) {
    handleCatalogActionFailure(error, returnTo);
  }
}

export async function uploadVariantImageAction(formData: FormData) {
  await requirePermission(PERMISSIONS.catalogView);

  const productId = readText(formData, "productId");
  const variantId = readText(formData, "variantId");
  const returnTo = getReturnTo(formData, `/dashboard/catalog/products/${productId}/images`);

  try {
    if (!Types.ObjectId.isValid(variantId)) {
      throw new AppError("Variant record was not found.", 404);
    }

    const file = readUploadFile(formData, "imageFile");
    const variant = await ProductVariantModel.findById(variantId)
      .select("images productId")
      .exec();

    if (!variant) {
      throw new AppError("Variant record was not found.", 404);
    }

    if (String(variant.productId ?? "") !== productId) {
      throw new AppError("Variant record was not found for this product.", 404);
    }

    const asset = await storeUploadedImageAsset(file, {
      title: readOptionalText(formData, "title"),
      altText: readOptionalText(formData, "altText"),
    });

    const nextImages = normalizeImages([
      ...(variant.images ?? []).map(
        (image: { assetId?: unknown; sortOrder?: number; isPrimary?: boolean }) => ({
          assetId: String(image.assetId),
          sortOrder: Number(image.sortOrder ?? 0),
          isPrimary: Boolean(image.isPrimary),
        }),
      ),
      {
        assetId: String(asset.id),
        sortOrder: readNonNegativeIntegerWithFallback(
          formData,
          "sortOrder",
          "Sort order",
          variant.images?.length ?? 0,
        ),
        isPrimary: readCheckbox(formData, "isPrimary"),
      },
    ]);

    await ProductVariantModel.findByIdAndUpdate(
      variantId,
      {
        images: nextImages,
      },
      {
        runValidators: true,
      },
    ).exec();

    await catalogStandaloneSyncService.syncVariantImages(variantId);

    finishAction(returnTo, buildProductRevalidatePaths(productId));
  } catch (error) {
    handleCatalogActionFailure(error, returnTo);
  }
}

export async function removeProductImageAction(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.catalogView);

  const productId = readText(formData, "productId");
  const assetId = readText(formData, "assetId");
  const returnTo = getReturnTo(formData, `/dashboard/catalog/products/${productId}/images`);

  try {
    const product = await findProductOrThrow(productId);
    const nextImages = normalizeImages(
      (product.images ?? [])
        .map((image: { assetId?: unknown; sortOrder?: number; isPrimary?: boolean }) => ({
          assetId: String(image.assetId ?? ""),
          sortOrder: Number(image.sortOrder ?? 0),
          isPrimary: Boolean(image.isPrimary),
        }))
        .filter((image: { assetId: string }) => image.assetId !== assetId),
    );

    await ProductModel.findByIdAndUpdate(
      productId,
      { images: nextImages },
      { runValidators: true },
    ).exec();

    await catalogStandaloneSyncService.syncProductRecords(productId);
    await catalogMediaService.cleanupUnreferencedAsset(assetId);
    await systemEventsService.recordAuditLog({
      actorUserId: user.id,
      action: "PRODUCT_IMAGE_REMOVE",
      entityType: "PRODUCT",
      entityId: productId,
      afterData: { assetId },
    });

    finishAction(returnTo, buildProductRevalidatePaths(productId));
  } catch (error) {
    handleCatalogActionFailure(error, returnTo);
  }
}

export async function removeVariantImageAction(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.catalogView);

  const productId = readText(formData, "productId");
  const variantId = readText(formData, "variantId");
  const assetId = readText(formData, "assetId");
  const returnTo = getReturnTo(formData, `/dashboard/catalog/products/${productId}/images`);

  try {
    if (!Types.ObjectId.isValid(variantId)) {
      throw new AppError("Variant record was not found.", 404);
    }

    const variant = await ProductVariantModel.findById(variantId)
      .select("images productId sku")
      .exec();

    if (!variant || String(variant.productId ?? "") !== productId) {
      throw new AppError("Variant record was not found for this product.", 404);
    }

    const nextImages = normalizeImages(
      (variant.images ?? [])
        .map((image: { assetId?: unknown; sortOrder?: number; isPrimary?: boolean }) => ({
          assetId: String(image.assetId ?? ""),
          sortOrder: Number(image.sortOrder ?? 0),
          isPrimary: Boolean(image.isPrimary),
        }))
        .filter((image: { assetId: string }) => image.assetId !== assetId),
    );

    await ProductVariantModel.findByIdAndUpdate(
      variantId,
      { images: nextImages },
      { runValidators: true },
    ).exec();

    await catalogStandaloneSyncService.syncVariantImages(variantId);
    await catalogMediaService.cleanupUnreferencedAsset(assetId);
    await systemEventsService.recordAuditLog({
      actorUserId: user.id,
      action: "VARIANT_IMAGE_REMOVE",
      entityType: "VARIANT",
      entityId: variantId,
      afterData: {
        assetId,
        productId,
      },
    });

    finishAction(returnTo, buildProductRevalidatePaths(productId));
  } catch (error) {
    handleCatalogActionFailure(error, returnTo);
  }
}

export async function deleteVariantAction(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.catalogView);

  const productId = readText(formData, "productId");
  const variantId = readText(formData, "variantId");
  const returnTo = getReturnTo(formData, `/dashboard/catalog/products/${productId}`);

  const variant = await ProductVariantModel.findById(variantId).exec();

  if (variant) {
    const variantImageAssetIds = (variant.images ?? [])
      .map((image: { assetId?: unknown }) => String(image.assetId ?? ""))
      .filter(Boolean);

    await VariantSourceModel.deleteMany({ variantId }).exec();
    await catalogStandaloneSyncService.deleteVariantOptionValueRecords([variantId]);
    await catalogStandaloneSyncService.deleteVariantImageRecords([variantId]);
    await ProductVariantModel.findByIdAndDelete(variantId).exec();

    await systemEventsService.recordAuditLog({
      actorUserId: user.id,
      action: "VARIANT_DELETE",
      entityType: "VARIANT",
      entityId: variantId,
      beforeData: {
        sku: variant.sku,
        productId: variant.productId?.toString?.() ?? String(variant.productId ?? ""),
      },
    });

    if (variant.isDefault) {
      const nextVariant = await ProductVariantModel.findOne({ productId })
        .sort({ createdAt: 1 })
        .exec();

      if (nextVariant) {
        await ProductVariantModel.findByIdAndUpdate(nextVariant.id, {
          isDefault: true,
        }).exec();
      }
    }

    for (const assetId of variantImageAssetIds) {
      await catalogMediaService.cleanupUnreferencedAsset(assetId);
    }
  }

  finishAction(returnTo, [
    "/dashboard/catalog/products",
    `/dashboard/catalog/products/${productId}`,
  ]);
}

export async function bulkVariantAction(formData: FormData) {
  await requirePermission(PERMISSIONS.catalogView);

  const productId = readText(formData, "productId");
  const returnTo = getReturnTo(formData, `/dashboard/catalog/products/${productId}`);
  const update: Record<string, unknown> = {};

  const compareAtPrice = readOptionalNumber(formData, "bulkCompareAtPrice");
  const costPrice = readOptionalNumber(formData, "bulkCostPrice");
  const lowStockThreshold = readOptionalNumber(formData, "bulkLowStockThreshold");
  const isActiveValue = readText(formData, "bulkIsActive");

  if (compareAtPrice !== undefined) {
    update.compareAtPrice = compareAtPrice;
  }

  if (costPrice !== undefined) {
    update.costPrice = costPrice;
  }

  if (lowStockThreshold !== undefined) {
    update.lowStockThreshold = lowStockThreshold;
  }

  if (isActiveValue === "true") {
    update.isActive = true;
  }

  if (isActiveValue === "false") {
    update.isActive = false;
  }

  if (Object.keys(update).length > 0) {
    await ProductVariantModel.updateMany({ productId }, update).exec();
  }

  finishAction(returnTo, [
    "/dashboard/catalog/products",
    `/dashboard/catalog/products/${productId}`,
  ]);
}

export async function saveVariantSourceAction(formData: FormData) {
  await requirePermission(PERMISSIONS.inventoryView);

  const variantSourceId = readText(formData, "variantSourceId");
  const returnTo = getReturnTo(formData, "/dashboard/supplier/links");
  const successReturnTo = getSuccessReturnTo(formData, returnTo);

  try {
    const variantId = readText(formData, "variantId");
    const sourcingSourceId = readText(formData, "sourcingSourceId");
    const sourceProductUrl = readText(formData, "sourceProductUrl");
    const sourcePrice = readOptionalNumber(formData, "sourcePrice");
    const redirectToDetail = readText(formData, "redirectToDetail") === "true";

    if (!sourcingSourceId) {
      failAction(returnTo, "Choose a supplier first.", "amber");
    }

    if (!variantId) {
      failAction(returnTo, "Choose a variant first.", "amber");
    }

    if (!sourceProductUrl) {
      failAction(returnTo, "Source product URL is required.", "amber");
    }

    if (sourcePrice !== undefined && sourcePrice < 0) {
      failAction(returnTo, "Source price must be zero or greater.", "amber");
    }

    const payload = {
      variantId,
      sourcingSourceId,
      sourceSku: readOptionalText(formData, "sourceSku"),
      sourceProductName: readOptionalText(formData, "sourceProductName"),
      sourceProductUrl,
      sourcePrice,
      isPreferred: readCheckbox(formData, "isPreferred"),
      isActive: readCheckbox(formData, "isActive"),
    };

    const [variant, source] = await Promise.all([
      ProductVariantModel.findById(variantId).select("_id").lean().exec(),
      SourcingSourceModel.findById(sourcingSourceId).select("_id").lean().exec(),
    ]);

    if (!variant) {
      throw new AppError("Selected variant was not found.", 404);
    }

    if (!source) {
      throw new AppError("Selected supplier was not found.", 404);
    }

    if (variantSourceId && Types.ObjectId.isValid(variantSourceId)) {
      const updatedVariantSource = await VariantSourceModel.findByIdAndUpdate(
        variantSourceId,
        payload,
      ).exec();

      if (!updatedVariantSource) {
        throw new AppError("Supplier link was not found.", 404);
      }

      finishAction(returnTo, [
        "/dashboard/catalog/products",
        "/dashboard/inventory",
        "/dashboard/supplier",
        "/dashboard/supplier/links",
        `/dashboard/supplier/links/${variantSourceId}`,
      ]);
    }

    const createdVariantSource = await sourcingService.createVariantSource(payload);
    const nextReturnTo = redirectToDetail
      ? `/dashboard/supplier/links/${createdVariantSource.id}`
      : successReturnTo;

    finishAction(nextReturnTo, [
      "/dashboard/catalog/products",
      "/dashboard/inventory",
      "/dashboard/supplier",
      "/dashboard/supplier/links",
      `/dashboard/supplier/links/${createdVariantSource.id}`,
    ]);
  } catch (error) {
    handleCatalogActionFailure(error, returnTo);
  }
}

export async function saveCategoryCommerceConfigAction(formData: FormData) {
  await requirePermission(PERMISSIONS.catalogView);

  const categoryId = readText(formData, "categoryId");
  const returnTo = getReturnTo(
    formData,
    `/dashboard/catalog/categories/${categoryId}`,
  );

  try {
    if (!Types.ObjectId.isValid(categoryId)) {
      throw new AppError("Category record was not found.", 404);
    }

    const category = await CategoryModel.findById(categoryId).select("_id").lean().exec();

    if (!category) {
      throw new AppError("Category record was not found.", 404);
    }

    const specificationDefinitions = parseCategorySpecDefinitions(
      readTextLines(formData, "specDefinitionsText"),
    );
    const optionTypeMaps = parseCategoryOptionTypeMaps(
      readTextLines(formData, "categoryOptionTypesText"),
    );
    const filterConfigs = parseCategoryFilterConfigs(
      readTextLines(formData, "categoryFiltersText"),
    );

    for (const definition of specificationDefinitions) {
      await SpecificationDefinitionModel.updateOne(
        { specKey: definition.specKey },
        {
          specKey: definition.specKey,
          specLabel: definition.specLabel,
          valueType: definition.valueType,
          unit: definition.unit,
          filterDisplayType: definition.filterDisplayType,
          isFilterable: definition.isFilterable,
          isActive: true,
        },
        { upsert: true, runValidators: true },
      ).exec();
    }

    const [savedDefinitions, optionTypes] = await Promise.all([
      specificationDefinitions.length > 0
        ? (SpecificationDefinitionModel.find({
            specKey: { $in: specificationDefinitions.map((definition) => definition.specKey) },
          })
            .select("specKey")
            .lean()
            .exec() as Promise<Array<{ _id: unknown; specKey?: string }>>)
        : Promise.resolve([]),
      (OptionTypeModel.find({})
        .select("optionName")
        .lean()
        .exec() as Promise<Array<{ _id: unknown; optionName?: string }>>),
    ]);

    const definitionMap = new Map(
      savedDefinitions.map((definition) => [
        String(definition.specKey ?? "").trim().toUpperCase(),
        String(definition._id),
      ]),
    );
    const optionTypeMap = new Map(
      optionTypes.map((optionType) => [
        String(optionType.optionName ?? "").trim().toUpperCase(),
        String(optionType._id),
      ]),
    );

    for (const item of optionTypeMaps) {
      if (!optionTypeMap.has(item.optionTypeKey.trim().toUpperCase())) {
        throw new AppError(`Option type "${item.optionTypeKey}" was not found.`, 404);
      }
    }

    for (const config of filterConfigs) {
      if (
        config.filterSource === "OPTION_TYPE" &&
        !optionTypeMap.has((config.sourceKey ?? "").trim().toUpperCase())
      ) {
        throw new AppError(
          `Filter "${config.filterLabel}" references an option type that was not found.`,
          404,
        );
      }

      if (
        config.filterSource === "SPECIFICATION" &&
        !definitionMap.has((config.sourceKey ?? "").trim().toUpperCase())
      ) {
        throw new AppError(
          `Filter "${config.filterLabel}" references a specification definition that was not found.`,
          404,
        );
      }
    }

    await Promise.all([
      CategorySpecMapModel.deleteMany({ categoryId }).exec(),
      CategoryOptionTypeMapModel.deleteMany({ categoryId }).exec(),
      CategoryFilterConfigModel.deleteMany({ categoryId }).exec(),
    ]);

    if (specificationDefinitions.length > 0) {
      await CategorySpecMapModel.insertMany(
        specificationDefinitions.map((definition) => ({
          categoryId,
          specDefinitionId: definitionMap.get(definition.specKey)!,
          isRequired: definition.isRequired,
          isFilterable: definition.isFilterable,
          sortOrder: Number.isFinite(definition.sortOrder) ? definition.sortOrder : 0,
        })),
      );
    }

    if (optionTypeMaps.length > 0) {
      await CategoryOptionTypeMapModel.insertMany(
        optionTypeMaps.map((item) => ({
          categoryId,
          optionTypeId: optionTypeMap.get(item.optionTypeKey.trim().toUpperCase())!,
          isRequired: item.isRequired,
          sortOrder: Number.isFinite(item.sortOrder) ? item.sortOrder : 0,
        })),
      );
    }

    if (filterConfigs.length > 0) {
      await CategoryFilterConfigModel.insertMany(
        filterConfigs.map((config) => ({
          categoryId,
          filterKey: config.filterKey,
          filterLabel: config.filterLabel,
          filterSource: config.filterSource,
          optionTypeId:
            config.filterSource === "OPTION_TYPE"
              ? optionTypeMap.get((config.sourceKey ?? "").trim().toUpperCase())
              : undefined,
          specDefinitionId:
            config.filterSource === "SPECIFICATION"
              ? definitionMap.get((config.sourceKey ?? "").trim().toUpperCase())
              : undefined,
          displayType: config.displayType,
          sortOrder: Number.isFinite(config.sortOrder) ? config.sortOrder : 0,
          isInherited: config.isInherited,
          isActive: config.isActive,
        })),
      );
    }

    finishAction(returnTo, [
      "/dashboard/catalog/categories",
      returnTo,
      "/shop",
      "/",
    ]);
  } catch (error) {
    handleCatalogActionFailure(error, returnTo);
  }
}

export async function deleteVariantSourceAction(formData: FormData) {
  await requirePermission(PERMISSIONS.inventoryView);

  const returnTo = getReturnTo(formData, "/dashboard/supplier/links");

  try {
    const variantSourceId = readText(formData, "variantSourceId");

    if (!Types.ObjectId.isValid(variantSourceId)) {
      finishAction(returnTo, [
        "/dashboard/catalog/products",
        "/dashboard/inventory",
        "/dashboard/supplier",
        "/dashboard/supplier/links",
      ]);
    }

    await VariantSourceModel.findByIdAndDelete(variantSourceId).exec();

    finishAction("/dashboard/supplier/links", [
      "/dashboard/catalog/products",
      "/dashboard/inventory",
      "/dashboard/supplier",
      "/dashboard/supplier/links",
    ]);
  } catch (error) {
    handleCatalogActionFailure(error, returnTo);
  }
}

export async function saveCatalogRecordAction(formData: FormData) {
  await requirePermission(PERMISSIONS.catalogView);

  const kind = readText(formData, "kind");
  const recordId = readText(formData, "recordId");
  const returnTo = getReturnTo(formData, "/dashboard/catalog/categories");
  const successReturnTo = getSuccessReturnTo(formData, returnTo);
  const title = readText(formData, "title");
  const slug = readOptionalText(formData, "slug") ?? slugify(title);

  try {
    if (kind === "categories") {
      const payload = {
        categoryId: recordId || undefined,
        categoryName: title,
        slug,
        description: readOptionalText(formData, "description"),
        parentCategoryId: readOptionalText(formData, "parentCategoryId"),
        sortOrder: readNumber(formData, "sortOrder", 0),
        seoTitle: readOptionalText(formData, "seoTitle"),
        seoDescription: readOptionalText(formData, "seoDescription"),
        isActive: readCheckbox(formData, "isActive"),
      };
      await categoryTreeService.saveCategory(payload);
    }

    if (kind === "brands") {
      const originCountryId = readOptionalText(formData, "originCountryId");
      await ensureOptionalCountryExists(originCountryId);

      const payload = {
        brandName: title,
        slug,
        originCountryId,
        description: readOptionalText(formData, "description"),
        websiteUrl: readOptionalText(formData, "websiteUrl"),
        isActive: readCheckbox(formData, "isActive"),
      };

      if (recordId && Types.ObjectId.isValid(recordId)) {
        await BrandModel.findByIdAndUpdate(recordId, payload, {
          runValidators: true,
        }).exec();
      } else {
        await BrandModel.create(payload);
      }
    }

    if (kind === "collections") {
      const payload = {
        collectionName: title,
        slug,
        description: readOptionalText(formData, "description"),
        sortOrder: readNumber(formData, "sortOrder", 0),
        isActive: readCheckbox(formData, "isActive"),
      };

      if (recordId && Types.ObjectId.isValid(recordId)) {
        await CollectionModel.findByIdAndUpdate(recordId, payload, {
          runValidators: true,
        }).exec();
      } else {
        await CollectionModel.create(payload);
      }
    }

    if (kind === "product-types") {
      const payload = parseCatalogSchema(productTypeInputSchema, {
        title,
        code: readText(formData, "code"),
      });

      if (recordId && Types.ObjectId.isValid(recordId)) {
        await ProductTypeModel.findByIdAndUpdate(
          recordId,
          {
            name: payload.title,
            code: payload.code,
          },
          {
            runValidators: true,
          },
        ).exec();
      } else {
        await ProductTypeModel.create({
          name: payload.title,
          code: payload.code,
        });
      }
    }

    if (kind === "product-tags") {
      const payload = parseCatalogSchema(productTagInputSchema, {
        title,
        slug: readOptionalText(formData, "slug") ?? slugify(title),
      });

      if (recordId && Types.ObjectId.isValid(recordId)) {
        await ProductTagModel.findByIdAndUpdate(
          recordId,
          {
            tagName: payload.title,
            slug: payload.slug,
          },
          {
            runValidators: true,
          },
        ).exec();
      } else {
        await ProductTagModel.create({
          tagName: payload.title,
          slug: payload.slug,
        });
      }
    }

    if (kind === "product-badges") {
      const payload = parseCatalogSchema(productBadgeInputSchema, {
        title,
        label: readText(formData, "label"),
        colorCode: readOptionalText(formData, "colorCode"),
        isActive: readCheckbox(formData, "isActive"),
      });

      if (recordId && Types.ObjectId.isValid(recordId)) {
        await ProductBadgeModel.findByIdAndUpdate(
          recordId,
          {
            badgeName: payload.title,
            label: payload.label,
            colorCode: payload.colorCode,
            isActive: payload.isActive,
          },
          {
            runValidators: true,
          },
        ).exec();
      } else {
        await ProductBadgeModel.create({
          badgeName: payload.title,
          label: payload.label,
          colorCode: payload.colorCode,
          isActive: payload.isActive,
        });
      }
    }

    finishAction(successReturnTo, [
      "/dashboard/catalog/categories",
      "/dashboard/catalog/brands",
      "/dashboard/catalog/collections",
      "/dashboard/catalog/product-types",
      "/dashboard/catalog/product-tags",
      "/dashboard/catalog/product-badges",
      "/shop",
      "/",
      successReturnTo.split("?")[0],
    ]);
  } catch (error) {
    handleCatalogActionFailure(error, returnTo);
  }
}

export async function deleteCatalogRecordAction(formData: FormData) {
  await requirePermission(PERMISSIONS.catalogView);

  const kind = readText(formData, "kind");
  const recordId = readText(formData, "recordId");
  const returnTo = getReturnTo(formData, "/dashboard/catalog/categories");

  if (!Types.ObjectId.isValid(recordId)) {
    finishAction(returnTo, [
      "/dashboard/catalog/categories",
      "/dashboard/catalog/brands",
      "/dashboard/catalog/collections",
    ]);
  }

  if (kind === "categories") {
    const [usageCount, childCount] = await Promise.all([
      ProductModel.countDocuments({ categoryId: recordId }).exec(),
      CategoryModel.countDocuments({ parentCategoryId: recordId }).exec(),
    ]);
    if (usageCount + childCount > 0) {
      await CategoryModel.findByIdAndUpdate(recordId, { isActive: false }).exec();
    } else {
      await Promise.all([
        CategorySpecMapModel.deleteMany({ categoryId: recordId }).exec(),
        CategoryOptionTypeMapModel.deleteMany({ categoryId: recordId }).exec(),
        CategoryFilterConfigModel.deleteMany({ categoryId: recordId }).exec(),
        CategoryModel.findByIdAndDelete(recordId).exec(),
      ]);
    }
  }

  if (kind === "brands") {
    const usageCount = await ProductModel.countDocuments({ brandId: recordId }).exec();
    if (usageCount > 0) {
      await BrandModel.findByIdAndUpdate(recordId, { isActive: false }).exec();
    } else {
      await BrandModel.findByIdAndDelete(recordId).exec();
    }
  }

  if (kind === "collections") {
    const usageCount = await ProductModel.countDocuments({ collectionIds: recordId }).exec();
    if (usageCount > 0) {
      await CollectionModel.findByIdAndUpdate(recordId, { isActive: false }).exec();
    } else {
      await CollectionModel.findByIdAndDelete(recordId).exec();
    }
  }

  if (kind === "product-types") {
    const usageCount = await ProductModel.countDocuments({ productTypeId: recordId }).exec();
    if (usageCount === 0) {
      await ProductTypeModel.findByIdAndDelete(recordId).exec();
    }
  }

  if (kind === "product-tags") {
    const usageCount = await ProductModel.countDocuments({ tagIds: recordId }).exec();
    if (usageCount === 0) {
      await ProductTagModel.findByIdAndDelete(recordId).exec();
    }
  }

  if (kind === "product-badges") {
    const usageCount = await ProductModel.countDocuments({ badgeIds: recordId }).exec();
    if (usageCount > 0) {
      await ProductBadgeModel.findByIdAndUpdate(recordId, { isActive: false }).exec();
    } else {
      await ProductBadgeModel.findByIdAndDelete(recordId).exec();
    }
  }

  finishAction(returnTo, [
    "/dashboard/catalog/categories",
    "/dashboard/catalog/brands",
    "/dashboard/catalog/collections",
    "/dashboard/catalog/product-types",
    "/dashboard/catalog/product-tags",
    "/dashboard/catalog/product-badges",
    "/shop",
    "/",
  ]);
}

export async function bulkCatalogRecordAction(formData: FormData) {
  await requirePermission(PERMISSIONS.catalogView);

  const kind = readText(formData, "kind");
  const bulkAction = readText(formData, "bulkAction");
  const returnTo = getReturnTo(formData, "/dashboard/catalog/categories");
  const selectedIds = readBulkIds(formData, returnTo);

  try {
    const objectIds = selectedIds.map((id) => new Types.ObjectId(id));

    if (kind === "categories") {
      if (bulkAction === "activate" || bulkAction === "deactivate") {
        await CategoryModel.updateMany(
          { _id: { $in: objectIds } },
          { isActive: bulkAction === "activate" },
        ).exec();
      } else if (bulkAction === "delete") {
        const [productCount, childCount] = await Promise.all([
          ProductModel.countDocuments({ categoryId: { $in: objectIds } }).exec(),
          CategoryModel.countDocuments({ parentCategoryId: { $in: objectIds } }).exec(),
        ]);

        if (productCount + childCount > 0) {
          failAction(
            returnTo,
            "One or more selected categories are in use and cannot be deleted.",
          );
        }

        await Promise.all([
          CategorySpecMapModel.deleteMany({ categoryId: { $in: objectIds } }).exec(),
          CategoryOptionTypeMapModel.deleteMany({ categoryId: { $in: objectIds } }).exec(),
          CategoryFilterConfigModel.deleteMany({ categoryId: { $in: objectIds } }).exec(),
          CategoryModel.deleteMany({ _id: { $in: objectIds } }).exec(),
        ]);
      } else {
        failAction(returnTo, "Unsupported category bulk action.", "amber");
      }
    }

    if (kind === "brands") {
      if (bulkAction === "activate" || bulkAction === "deactivate") {
        await BrandModel.updateMany(
          { _id: { $in: objectIds } },
          { isActive: bulkAction === "activate" },
        ).exec();
      } else if (bulkAction === "delete") {
        const usageCount = await ProductModel.countDocuments({
          brandId: { $in: objectIds },
        }).exec();

        if (usageCount > 0) {
          failAction(returnTo, "One or more selected brands are in use and cannot be deleted.");
        }

        await BrandModel.deleteMany({ _id: { $in: objectIds } }).exec();
      } else {
        failAction(returnTo, "Unsupported brand bulk action.", "amber");
      }
    }

    if (kind === "collections") {
      if (bulkAction === "activate" || bulkAction === "deactivate") {
        await CollectionModel.updateMany(
          { _id: { $in: objectIds } },
          { isActive: bulkAction === "activate" },
        ).exec();
      } else if (bulkAction === "delete") {
        const usageCount = await ProductModel.countDocuments({
          collectionIds: { $in: objectIds },
        }).exec();

        if (usageCount > 0) {
          failAction(
            returnTo,
            "One or more selected collections are in use and cannot be deleted.",
          );
        }

        await CollectionModel.deleteMany({ _id: { $in: objectIds } }).exec();
      } else {
        failAction(returnTo, "Unsupported collection bulk action.", "amber");
      }
    }

    if (kind === "product-types") {
      if (bulkAction !== "delete") {
        failAction(returnTo, "Product types only support safe bulk delete.", "amber");
      }

      const usageCount = await ProductModel.countDocuments({
        productTypeId: { $in: objectIds },
      }).exec();

      if (usageCount > 0) {
        failAction(
          returnTo,
          "One or more selected product types are in use and cannot be deleted.",
        );
      }

      await ProductTypeModel.deleteMany({ _id: { $in: objectIds } }).exec();
    }

    if (kind === "product-tags") {
      if (bulkAction !== "delete") {
        failAction(returnTo, "Product tags only support safe bulk delete.", "amber");
      }

      const usageCount = await ProductModel.countDocuments({
        tagIds: { $in: objectIds },
      }).exec();

      if (usageCount > 0) {
        failAction(
          returnTo,
          "One or more selected product tags are in use and cannot be deleted.",
        );
      }

      await ProductTagModel.deleteMany({ _id: { $in: objectIds } }).exec();
    }

    if (kind === "product-badges") {
      if (bulkAction === "activate" || bulkAction === "deactivate") {
        await ProductBadgeModel.updateMany(
          { _id: { $in: objectIds } },
          { isActive: bulkAction === "activate" },
        ).exec();
      } else if (bulkAction === "delete") {
        const usageCount = await ProductModel.countDocuments({
          badgeIds: { $in: objectIds },
        }).exec();

        if (usageCount > 0) {
          failAction(
            returnTo,
            "One or more selected product badges are in use and cannot be deleted.",
          );
        }

        await ProductBadgeModel.deleteMany({ _id: { $in: objectIds } }).exec();
      } else {
        failAction(returnTo, "Unsupported product badge bulk action.", "amber");
      }
    }

    finishAction(returnTo, [
      "/dashboard/catalog/categories",
      "/dashboard/catalog/brands",
      "/dashboard/catalog/collections",
      "/dashboard/catalog/product-types",
      "/dashboard/catalog/product-tags",
      "/dashboard/catalog/product-badges",
      "/shop",
      "/",
    ]);
  } catch (error) {
    handleCatalogActionFailure(error, returnTo);
  }
}

export async function saveOptionTypeAction(formData: FormData) {
  await requirePermission(PERMISSIONS.catalogView);

  const optionTypeId = readText(formData, "optionTypeId");
  const returnTo = getReturnTo(formData, "/dashboard/catalog/option-types");
  const payload = {
    optionName: readText(formData, "optionName"),
    displayType: readText(formData, "displayType") as
      | "TEXT"
      | "COLOR_SWATCH"
      | "BUTTON",
  };

  if (optionTypeId && Types.ObjectId.isValid(optionTypeId)) {
    await OptionTypeModel.findByIdAndUpdate(optionTypeId, payload).exec();
  } else {
    await OptionTypeModel.create(payload);
  }

  finishAction(returnTo, [
    "/dashboard/catalog/option-types",
    "/dashboard/catalog/products",
  ]);
}

export async function deleteOptionTypeAction(formData: FormData) {
  await requirePermission(PERMISSIONS.catalogView);

  const optionTypeId = readText(formData, "optionTypeId");
  const returnTo = getReturnTo(formData, "/dashboard/catalog/option-types");

  if (!Types.ObjectId.isValid(optionTypeId)) {
    finishAction(returnTo, [
      "/dashboard/catalog/option-types",
      "/dashboard/catalog/products",
    ]);
  }

  const optionValues = await OptionValueModel.find({ optionTypeId })
    .select("_id")
    .lean()
    .exec();
  const optionValueIds = optionValues.map((optionValue) => String(optionValue._id));
  const [productCount, variantCount] = await Promise.all([
    ProductModel.countDocuments({ optionTypeIds: optionTypeId }).exec(),
    optionValueIds.length > 0
      ? ProductVariantModel.countDocuments({
          optionValueIds: { $in: optionValueIds },
        }).exec()
      : 0,
  ]);

  if (productCount === 0 && variantCount === 0) {
    await Promise.all([
      OptionValueModel.deleteMany({ optionTypeId }).exec(),
      OptionTypeModel.findByIdAndDelete(optionTypeId).exec(),
    ]);
  }

  finishAction(returnTo, [
    "/dashboard/catalog/option-types",
    "/dashboard/catalog/products",
  ]);
}

export async function saveOptionValueAction(formData: FormData) {
  await requirePermission(PERMISSIONS.catalogView);

  const optionTypeId = readText(formData, "optionTypeId");
  const optionValueId = readText(formData, "optionValueId");
  const returnTo = getReturnTo(formData, "/dashboard/catalog/option-types");
  const payload = {
    optionTypeId,
    valueName: readText(formData, "valueName"),
    valueCode: readOptionalText(formData, "valueCode"),
    swatchHex: readOptionalText(formData, "swatchHex"),
    sortOrder: readNumber(formData, "sortOrder", 0),
  };

  if (optionValueId && Types.ObjectId.isValid(optionValueId)) {
    await OptionValueModel.findByIdAndUpdate(optionValueId, payload).exec();
  } else {
    await OptionValueModel.create(payload);
  }

  finishAction(returnTo, [
    "/dashboard/catalog/option-types",
    "/dashboard/catalog/products",
  ]);
}

export async function deleteOptionValueAction(formData: FormData) {
  await requirePermission(PERMISSIONS.catalogView);

  const optionValueId = readText(formData, "optionValueId");
  const returnTo = getReturnTo(formData, "/dashboard/catalog/option-types");

  if (!Types.ObjectId.isValid(optionValueId)) {
    finishAction(returnTo, [
      "/dashboard/catalog/option-types",
      "/dashboard/catalog/products",
    ]);
  }

  const variantCount = await ProductVariantModel.countDocuments({
    optionValueIds: optionValueId,
  }).exec();

  if (variantCount === 0) {
    await OptionValueModel.findByIdAndDelete(optionValueId).exec();
  }

  finishAction(returnTo, [
    "/dashboard/catalog/option-types",
    "/dashboard/catalog/products",
  ]);
}

export async function bulkOptionTypeAction(formData: FormData) {
  await requirePermission(PERMISSIONS.catalogView);

  const returnTo = getReturnTo(formData, "/dashboard/catalog/option-types");
  const bulkAction = readText(formData, "bulkAction");
  const selectedIds = readBulkIds(formData, returnTo);

  try {
    if (bulkAction !== "delete") {
      failAction(returnTo, "Option types only support safe bulk delete.", "amber");
    }

    const objectIds = selectedIds.map((id) => new Types.ObjectId(id));
    const optionValues = await OptionValueModel.find({
      optionTypeId: { $in: objectIds },
    })
      .select("_id")
      .lean()
      .exec();

    const optionValueIds = optionValues.map((optionValue) => String(optionValue._id));
    const [productCount, variantCount] = await Promise.all([
      ProductModel.countDocuments({ optionTypeIds: { $in: objectIds } }).exec(),
      optionValueIds.length > 0
        ? ProductVariantModel.countDocuments({
            optionValueIds: { $in: optionValueIds.map((id) => new Types.ObjectId(id)) },
          }).exec()
        : 0,
    ]);

    if (productCount + variantCount > 0) {
      failAction(
        returnTo,
        "One or more selected option types are in use and cannot be deleted.",
      );
    }

    await Promise.all([
      OptionValueModel.deleteMany({ optionTypeId: { $in: objectIds } }).exec(),
      OptionTypeModel.deleteMany({ _id: { $in: objectIds } }).exec(),
    ]);

    finishAction(returnTo, [
      "/dashboard/catalog/option-types",
      "/dashboard/catalog/products",
    ]);
  } catch (error) {
    handleCatalogActionFailure(error, returnTo);
  }
}

export async function savePromotionAction(formData: FormData) {
  await requirePermission(PERMISSIONS.catalogView);

  const returnTo = getReturnTo(formData, "/dashboard/catalog/promotions");
  const parsed = parseCatalogSchema(promotionInputSchema, {
    promotionId: readOptionalText(formData, "promotionId"),
    code: readOptionalText(formData, "code")?.toUpperCase(),
    name: readText(formData, "name"),
    description: readOptionalText(formData, "description"),
    promotionType: readText(formData, "promotionType") || "COUPON",
    discountType: readOptionalText(formData, "discountType"),
    discountValue: readOptionalText(formData, "discountValue"),
    minOrderAmount: readOptionalText(formData, "minOrderAmount"),
    maxDiscountAmount: readOptionalText(formData, "maxDiscountAmount"),
    usageLimit: readOptionalText(formData, "usageLimit"),
    perCustomerLimit: readOptionalText(formData, "perCustomerLimit"),
    startsAt: readOptionalText(formData, "startsAt"),
    endsAt: readOptionalText(formData, "endsAt"),
    heroAssetId: readOptionalText(formData, "heroAssetId"),
    isActive: readCheckbox(formData, "isActive"),
    redirectToDetail: readText(formData, "redirectToDetail") === "true",
  });

  const payload = {
    code: parsed.code,
    name: parsed.name,
    description: parsed.description,
    promotionType: parsed.promotionType,
    discountType:
      parsed.promotionType === "FREE_SHIPPING" ? undefined : parsed.discountType,
    discountValue:
      parsed.promotionType === "FREE_SHIPPING" ? undefined : parsed.discountValue,
    minOrderAmount: parsed.minOrderAmount,
    maxDiscountAmount: parsed.maxDiscountAmount,
    usageLimit: parsed.usageLimit,
    perCustomerLimit: parsed.perCustomerLimit,
    startsAt: parseDateInput(parsed.startsAt),
    endsAt: parseDateInput(parsed.endsAt),
    heroAssetId: parsed.heroAssetId,
    isActive: parsed.isActive,
  };

  if (parsed.promotionId && Types.ObjectId.isValid(parsed.promotionId)) {
    await PromotionModel.findByIdAndUpdate(parsed.promotionId, payload).exec();
    finishAction(returnTo, buildPromotionRevalidatePaths(parsed.promotionId));
  }

  const createdPromotion = await PromotionModel.create(payload);

  if (parsed.redirectToDetail) {
    finishAction(
      `/dashboard/catalog/promotions/${createdPromotion.id}`,
      buildPromotionRevalidatePaths(createdPromotion.id),
    );
  } else {
    finishAction(returnTo, buildPromotionRevalidatePaths(createdPromotion.id));
  }
}

export async function attachPromotionTargetAction(formData: FormData) {
  await requirePermission(PERMISSIONS.catalogView);

  const returnTo = getReturnTo(formData, "/dashboard/catalog/promotions");
  const payload = parseCatalogSchema(promotionTargetInputSchema, {
    promotionId: readText(formData, "promotionId"),
    targetType: readText(formData, "targetType"),
    targetId: readText(formData, "targetId"),
  });

  if (!Types.ObjectId.isValid(payload.promotionId)) {
    throw new AppError("Promotion record was not found.", 404);
  }

  if (payload.targetType === "product") {
    const product = await ProductModel.findById(payload.targetId).select("_id").lean().exec();

    if (!product) {
      throw new AppError("Product record was not found.", 404);
    }

    await PromotionProductModel.updateOne(
      {
        promotionId: payload.promotionId,
        productId: payload.targetId,
      },
      {
        $setOnInsert: {
          promotionId: payload.promotionId,
          productId: payload.targetId,
        },
      },
      { upsert: true },
    ).exec();
  }

  if (payload.targetType === "variant") {
    const variant = await ProductVariantModel.findById(payload.targetId)
      .select("_id")
      .lean()
      .exec();

    if (!variant) {
      throw new AppError("Variant record was not found.", 404);
    }

    await PromotionVariantModel.updateOne(
      {
        promotionId: payload.promotionId,
        variantId: payload.targetId,
      },
      {
        $setOnInsert: {
          promotionId: payload.promotionId,
          variantId: payload.targetId,
        },
      },
      { upsert: true },
    ).exec();
  }

  finishAction(returnTo, buildPromotionRevalidatePaths(payload.promotionId));
}

export async function detachPromotionTargetAction(formData: FormData) {
  await requirePermission(PERMISSIONS.catalogView);

  const returnTo = getReturnTo(formData, "/dashboard/catalog/promotions");
  const payload = parseCatalogSchema(promotionTargetInputSchema, {
    promotionId: readText(formData, "promotionId"),
    targetType: readText(formData, "targetType"),
    targetId: readText(formData, "targetId"),
  });

  if (payload.targetType === "product") {
    await PromotionProductModel.deleteOne({
      promotionId: payload.promotionId,
      productId: payload.targetId,
    }).exec();
  }

  if (payload.targetType === "variant") {
    await PromotionVariantModel.deleteOne({
      promotionId: payload.promotionId,
      variantId: payload.targetId,
    }).exec();
  }

  finishAction(returnTo, buildPromotionRevalidatePaths(payload.promotionId));
}

export async function deletePromotionAction(formData: FormData) {
  await requirePermission(PERMISSIONS.catalogView);

  const promotionId = readText(formData, "promotionId");
  const returnTo = getReturnTo(formData, "/dashboard/catalog/promotions");

  if (!Types.ObjectId.isValid(promotionId)) {
    finishAction(returnTo, [
      "/dashboard",
      "/dashboard/catalog/promotions",
    ]);
  }

  const usageCount = await CouponUsageLogModel.countDocuments({ promotionId }).exec();

  if (usageCount > 0) {
    await PromotionModel.findByIdAndUpdate(promotionId, { isActive: false }).exec();
  } else {
    await Promise.all([
      PromotionProductModel.deleteMany({ promotionId }).exec(),
      PromotionVariantModel.deleteMany({ promotionId }).exec(),
      PromotionCustomerGroupModel.deleteMany({ promotionId }).exec(),
      PromotionModel.findByIdAndDelete(promotionId).exec(),
    ]);
  }

  finishAction(returnTo, [
    ...buildPromotionRevalidatePaths(),
  ]);
}

export async function bulkPromotionAction(formData: FormData) {
  await requirePermission(PERMISSIONS.catalogView);

  const returnTo = getReturnTo(formData, "/dashboard/catalog/promotions");
  const bulkAction = readText(formData, "bulkAction");
  const selectedIds = readBulkIds(formData, returnTo);

  try {
    const objectIds = selectedIds.map((id) => new Types.ObjectId(id));

    if (bulkAction === "activate" || bulkAction === "deactivate") {
      await PromotionModel.updateMany(
        { _id: { $in: objectIds } },
        { isActive: bulkAction === "activate" },
      ).exec();
      finishAction(returnTo, buildPromotionRevalidatePaths());
    }

    if (bulkAction !== "delete") {
      failAction(returnTo, "Unsupported promotion bulk action.", "amber");
    }

    const usageCount = await CouponUsageLogModel.countDocuments({
      promotionId: { $in: objectIds },
    }).exec();

    if (usageCount > 0) {
      failAction(
        returnTo,
        "One or more selected promotions already have usage and cannot be deleted.",
      );
    }

    await Promise.all([
      PromotionProductModel.deleteMany({ promotionId: { $in: objectIds } }).exec(),
      PromotionVariantModel.deleteMany({ promotionId: { $in: objectIds } }).exec(),
      PromotionCustomerGroupModel.deleteMany({ promotionId: { $in: objectIds } }).exec(),
      PromotionModel.deleteMany({ _id: { $in: objectIds } }).exec(),
    ]);

    finishAction(returnTo, buildPromotionRevalidatePaths());
  } catch (error) {
    handleCatalogActionFailure(error, returnTo);
  }
}
