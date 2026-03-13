import { Types } from "mongoose";

import { ProductModel, ProductVariantModel } from "@/modules/catalog/catalog.models";
import {
  ProductImageModel,
  ProductRelationModel,
  ProductSpecificationModel,
  VariantImageModel,
  VariantOptionValueModel,
} from "@/modules/catalog/catalog-extra.models";

function toObjectId(value: unknown) {
  const stringValue = String(value ?? "").trim();
  return Types.ObjectId.isValid(stringValue) ? new Types.ObjectId(stringValue) : null;
}

function dedupeByKey<T>(items: T[], getKey: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

class CatalogStandaloneSyncService {
  async syncProductRecords(productId: string) {
    const objectId = toObjectId(productId);

    if (!objectId) {
      return;
    }

    const product = (await ProductModel.findById(objectId)
      .select("specifications images relations")
      .lean()
      .exec()) as
      | {
          specifications?: Array<{
            specDefinitionId?: unknown;
            specGroup?: string;
            specKey?: string;
            specValue?: string;
            sortOrder?: number;
          }>;
          images?: Array<{
            assetId?: unknown;
            sortOrder?: number;
            isPrimary?: boolean;
          }>;
          relations?: Array<{
            relatedProductId?: unknown;
            relationType?: string;
            sortOrder?: number;
          }>;
        }
      | null;

    if (!product) {
      return;
    }

    const specificationRows = dedupeByKey(
      (product.specifications ?? [])
        .map((specification) => {
          const specKey = specification.specKey?.trim();
          const specValue = specification.specValue?.trim();

          if (!specKey || !specValue) {
            return null;
          }

          return {
            productId: objectId,
            specDefinitionId: toObjectId(specification.specDefinitionId) ?? undefined,
            specGroup: specification.specGroup?.trim() || undefined,
            specKey,
            specValue,
            sortOrder: Number(specification.sortOrder ?? 0),
          };
        })
        .filter((row): row is NonNullable<typeof row> => Boolean(row)),
      (row) => `${row.specKey.toUpperCase()}::${row.specValue}`,
    );

    const imageRows = dedupeByKey(
      (product.images ?? [])
        .map((image) => {
          const assetId = toObjectId(image.assetId);

          if (!assetId) {
            return null;
          }

          return {
            productId: objectId,
            assetId,
            sortOrder: Number(image.sortOrder ?? 0),
            isPrimary: Boolean(image.isPrimary),
          };
        })
        .filter((row): row is NonNullable<typeof row> => Boolean(row)),
      (row) => String(row.assetId),
    );

    const relationRows = dedupeByKey(
      (product.relations ?? [])
        .map((relation) => {
          const relatedProductId = toObjectId(relation.relatedProductId);

          if (!relatedProductId || String(relatedProductId) === productId) {
            return null;
          }

          const relationType =
            relation.relationType === "UPSELL" ||
            relation.relationType === "CROSS_SELL" ||
            relation.relationType === "SIMILAR"
              ? relation.relationType
              : "RELATED";

          return {
            productId: objectId,
            relatedProductId,
            relationType,
            sortOrder: Number(relation.sortOrder ?? 0),
          };
        })
        .filter((row): row is NonNullable<typeof row> => Boolean(row)),
      (row) => `${String(row.relatedProductId)}::${row.relationType}`,
    );

    await Promise.all([
      ProductSpecificationModel.deleteMany({ productId: objectId }).exec(),
      ProductImageModel.deleteMany({ productId: objectId }).exec(),
      ProductRelationModel.deleteMany({ productId: objectId }).exec(),
    ]);

    await Promise.all([
      specificationRows.length > 0
        ? ProductSpecificationModel.insertMany(specificationRows, { ordered: true })
        : Promise.resolve(),
      imageRows.length > 0
        ? ProductImageModel.insertMany(imageRows, { ordered: true })
        : Promise.resolve(),
      relationRows.length > 0
        ? ProductRelationModel.insertMany(relationRows, { ordered: true })
        : Promise.resolve(),
    ]);
  }

  async syncVariantOptionValues(variantId: string) {
    const objectId = toObjectId(variantId);

    if (!objectId) {
      return;
    }

    const variant = (await ProductVariantModel.findById(objectId)
      .select("optionValueIds")
      .lean()
      .exec()) as { optionValueIds?: unknown[] } | null;

    if (!variant) {
      return;
    }

    const rows = dedupeByKey(
      (variant.optionValueIds ?? [])
        .map((optionValueId) => {
          const resolvedId = toObjectId(optionValueId);

          if (!resolvedId) {
            return null;
          }

          return {
            variantId: objectId,
            optionValueId: resolvedId,
          };
        })
        .filter((row): row is NonNullable<typeof row> => Boolean(row)),
      (row) => String(row.optionValueId),
    );

    await VariantOptionValueModel.deleteMany({ variantId: objectId }).exec();

    if (rows.length > 0) {
      await VariantOptionValueModel.insertMany(rows, { ordered: true });
    }
  }

  async syncVariantImages(variantId: string) {
    const objectId = toObjectId(variantId);

    if (!objectId) {
      return;
    }

    const variant = (await ProductVariantModel.findById(objectId)
      .select("images")
      .lean()
      .exec()) as
      | {
          images?: Array<{
            assetId?: unknown;
            sortOrder?: number;
            isPrimary?: boolean;
          }>;
        }
      | null;

    if (!variant) {
      return;
    }

    const rows = dedupeByKey(
      (variant.images ?? [])
        .map((image) => {
          const assetId = toObjectId(image.assetId);

          if (!assetId) {
            return null;
          }

          return {
            variantId: objectId,
            assetId,
            sortOrder: Number(image.sortOrder ?? 0),
            isPrimary: Boolean(image.isPrimary),
          };
        })
        .filter((row): row is NonNullable<typeof row> => Boolean(row)),
      (row) => String(row.assetId),
    );

    await VariantImageModel.deleteMany({ variantId: objectId }).exec();

    if (rows.length > 0) {
      await VariantImageModel.insertMany(rows, { ordered: true });
    }
  }

  async deleteProductRecords(productIds: string[]) {
    const objectIds = productIds
      .map((productId) => toObjectId(productId))
      .filter((value): value is Types.ObjectId => Boolean(value));

    if (objectIds.length === 0) {
      return;
    }

    await Promise.all([
      ProductSpecificationModel.deleteMany({ productId: { $in: objectIds } }).exec(),
      ProductImageModel.deleteMany({ productId: { $in: objectIds } }).exec(),
      ProductRelationModel.deleteMany({
        $or: [{ productId: { $in: objectIds } }, { relatedProductId: { $in: objectIds } }],
      }).exec(),
    ]);
  }

  async deleteVariantOptionValueRecords(variantIds: string[]) {
    const objectIds = variantIds
      .map((variantId) => toObjectId(variantId))
      .filter((value): value is Types.ObjectId => Boolean(value));

    if (objectIds.length === 0) {
      return;
    }

    await VariantOptionValueModel.deleteMany({ variantId: { $in: objectIds } }).exec();
  }

  async deleteVariantImageRecords(variantIds: string[]) {
    const objectIds = variantIds
      .map((variantId) => toObjectId(variantId))
      .filter((value): value is Types.ObjectId => Boolean(value));

    if (objectIds.length === 0) {
      return;
    }

    await VariantImageModel.deleteMany({ variantId: { $in: objectIds } }).exec();
  }
}

export const catalogStandaloneSyncService = new CatalogStandaloneSyncService();
