import { randomUUID } from "crypto";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/mongodb";
import { AppError } from "@/lib/errors/app-error";
import { slugify } from "@/lib/utils/slugify";
import { ProductModel, ProductVariantModel } from "@/modules/catalog/catalog.models";

function buildUniqueSlugCandidate(baseSlug: string, attempt: number) {
  if (attempt === 0) {
    return baseSlug;
  }

  return `${baseSlug}-${attempt + 1}`;
}

function normalizeSku(value?: string | null) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toUpperCase();
}

class CatalogIdentifiersService {
  private async ensureConnection() {
    await connectToDatabase();
  }

  async resolveProductSlug(input: {
    productName: string;
    requestedSlug?: string | null;
    existingProductId?: string | null;
  }) {
    await this.ensureConnection();

    const source = input.requestedSlug?.trim() || input.productName.trim();
    const baseSlug = slugify(source) || "product";
    const existingObjectId =
      input.existingProductId && Types.ObjectId.isValid(input.existingProductId)
        ? new Types.ObjectId(input.existingProductId)
        : null;

    for (let attempt = 0; attempt < 1000; attempt += 1) {
      const candidate = buildUniqueSlugCandidate(baseSlug, attempt);
      const existingRecord = await ProductModel.findOne({ slug: candidate })
        .select("_id")
        .lean()
        .exec();

      if (!existingRecord || String(existingRecord._id) === String(existingObjectId ?? "")) {
        return candidate;
      }
    }

    return `${baseSlug}-${randomUUID().slice(0, 6).toLowerCase()}`;
  }

  async resolveVariantSku(input: {
    productId: string;
    seed: string;
    requestedSku?: string | null;
    existingVariantId?: string | null;
  }) {
    await this.ensureConnection();

    const existingObjectId =
      input.existingVariantId && Types.ObjectId.isValid(input.existingVariantId)
        ? new Types.ObjectId(input.existingVariantId)
        : null;
    const normalizedRequestedSku = normalizeSku(input.requestedSku);

    if (normalizedRequestedSku) {
      const existingRecord = await ProductVariantModel.findOne({
        sku: normalizedRequestedSku,
      })
        .select("_id")
        .lean()
        .exec();

      if (!existingRecord || String(existingRecord._id) === String(existingObjectId ?? "")) {
        return normalizedRequestedSku;
      }

      throw new AppError("SKU is already in use.", 409);
    }

    const baseSeed = slugify(input.seed).replace(/-/g, "").toUpperCase().slice(0, 10) || "ITEM";
    const productSuffix = input.productId.slice(-4).toUpperCase();

    for (let attempt = 0; attempt < 1000; attempt += 1) {
      const suffix =
        attempt === 0
          ? randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase()
          : String(attempt + 1).padStart(4, "0");
      const candidate = `${baseSeed}-${productSuffix}-${suffix}`;
      const existingRecord = await ProductVariantModel.findOne({ sku: candidate })
        .select("_id")
        .lean()
        .exec();

      if (!existingRecord || String(existingRecord._id) === String(existingObjectId ?? "")) {
        return candidate;
      }
    }

    return `${baseSeed}-${productSuffix}-${randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()}`;
  }
}

export const catalogIdentifiersService = new CatalogIdentifiersService();
