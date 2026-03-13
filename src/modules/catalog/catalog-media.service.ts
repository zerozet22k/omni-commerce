import { unlink } from "fs/promises";
import path from "path";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/mongodb";
import {
  BrandModel,
  CategoryModel,
  ProductModel,
  ProductVariantModel,
} from "@/modules/catalog/catalog.models";
import {
  CollectionModel,
  ProductImageModel,
  VariantImageModel,
} from "@/modules/catalog/catalog-extra.models";
import { BannerModel } from "@/modules/content/content.models";
import { MediaAssetModel, StoreSettingsModel } from "@/modules/core/core.models";
import { ReviewMediaModel } from "@/modules/engagement/engagement.models";
import { PaymentModel } from "@/modules/payments/payments.models";
import { PromotionModel } from "@/modules/pricing/pricing.models";
import { ShipmentPackageModel } from "@/modules/shipments/shipments.models";

function toObjectId(value: string) {
  return Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : null;
}

class CatalogMediaService {
  private async isReferenced(assetId: string) {
    const objectId = toObjectId(assetId);

    if (!objectId) {
      return false;
    }

    await connectToDatabase();

    const counts = await Promise.all([
      StoreSettingsModel.countDocuments({
        $or: [{ logoAssetId: objectId }, { faviconAssetId: objectId }, { heroAssetId: objectId }],
      }).exec(),
      CategoryModel.countDocuments({ imageAssetId: objectId }).exec(),
      BrandModel.countDocuments({ logoAssetId: objectId }).exec(),
      CollectionModel.countDocuments({ bannerAssetId: objectId }).exec(),
      ProductModel.countDocuments({ "images.assetId": objectId }).exec(),
      ProductVariantModel.countDocuments({ "images.assetId": objectId }).exec(),
      ProductImageModel.countDocuments({ assetId: objectId }).exec(),
      VariantImageModel.countDocuments({ assetId: objectId }).exec(),
      BannerModel.countDocuments({ assetId: objectId }).exec(),
      PromotionModel.countDocuments({ heroAssetId: objectId }).exec(),
      ReviewMediaModel.countDocuments({ assetId: objectId }).exec(),
      PaymentModel.countDocuments({ slipAssetId: objectId }).exec(),
      ShipmentPackageModel.countDocuments({ labelAssetId: objectId }).exec(),
    ]);

    return counts.some((count) => count > 0);
  }

  async cleanupUnreferencedAsset(assetId?: string | null) {
    const normalizedAssetId = String(assetId ?? "").trim();
    const objectId = toObjectId(normalizedAssetId);

    if (!objectId) {
      return false;
    }

    await connectToDatabase();

    if (await this.isReferenced(normalizedAssetId)) {
      return false;
    }

    const asset = await MediaAssetModel.findById(objectId).lean().exec();

    if (!asset) {
      return false;
    }

    await MediaAssetModel.findByIdAndDelete(objectId).exec();

    if (typeof asset.url === "string" && asset.url.startsWith("/uploads/")) {
      const absolutePath = path.join(process.cwd(), "public", asset.url.replace(/^\//, ""));

      try {
        await unlink(absolutePath);
      } catch {
        // Missing upload files are tolerated. The DB reference is already gone.
      }
    }

    return true;
  }
}

export const catalogMediaService = new CatalogMediaService();
