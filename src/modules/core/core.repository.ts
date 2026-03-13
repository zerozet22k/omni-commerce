import { connectToDatabase } from "@/lib/db/mongodb";
import {
  CountryModel,
  MediaAssetModel,
  StateRegionModel,
  StoreSettingsModel,
  type CountryDocument,
  type MediaAssetDocument,
  type StateRegionDocument,
  type StoreSettingsDocument,
} from "@/modules/core/core.models";

type CreateCountryInput = {
  countryName: string;
  isoCode?: string;
  phoneCode?: string;
};

type CreateStateRegionInput = {
  countryId: string;
  stateRegionName: string;
  code?: string;
};

type CreateMediaAssetInput = {
  assetType?: "IMAGE" | "VIDEO" | "FILE";
  url: string;
  altText?: string;
  title?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  durationSec?: number;
  sizeBytes?: number;
};

type UpsertStoreSettingsInput = Partial<{
  storeName: string;
  storeSlug: string;
  storeEmail: string;
  storePhone: string;
  supportEmail: string;
  supportPhone: string;
  currencyCode: string;
  locale: string;
  timezone: string;
  logoAssetId: string;
  faviconAssetId: string;
  heroAssetId: string;
  allowGuestCheckout: boolean;
  stockPolicy: "BLOCK_ON_ZERO" | "ALLOW_BACKORDER";
  orderAutoCancelMinutes: number;
  reviewAutoPublish: boolean;
  maintenanceMode: boolean;
  isActive: boolean;
}>;

export class CoreRepository {
  async listCountries(): Promise<CountryDocument[]> {
    await connectToDatabase();
    return CountryModel.find().sort({ countryName: 1 }).exec();
  }

  async findCountryById(countryId: string): Promise<CountryDocument | null> {
    await connectToDatabase();
    return CountryModel.findById(countryId).exec();
  }

  async createCountry(input: CreateCountryInput): Promise<CountryDocument> {
    await connectToDatabase();
    return CountryModel.create(input);
  }

  async listStateRegions(countryId?: string): Promise<StateRegionDocument[]> {
    await connectToDatabase();
    return StateRegionModel.find(countryId ? { countryId } : {})
      .sort({ stateRegionName: 1 })
      .exec();
  }

  async createStateRegion(
    input: CreateStateRegionInput,
  ): Promise<StateRegionDocument> {
    await connectToDatabase();
    return StateRegionModel.create(input);
  }

  async createMediaAsset(
    input: CreateMediaAssetInput,
  ): Promise<MediaAssetDocument> {
    await connectToDatabase();
    return MediaAssetModel.create(input);
  }

  async findMediaAssetById(assetId: string): Promise<MediaAssetDocument | null> {
    await connectToDatabase();
    return MediaAssetModel.findById(assetId).exec();
  }

  async getStoreSettings(): Promise<StoreSettingsDocument | null> {
    await connectToDatabase();
    return StoreSettingsModel.findOne().sort({ createdAt: -1 }).exec();
  }

  async upsertStoreSettings(
    input: UpsertStoreSettingsInput,
  ): Promise<StoreSettingsDocument> {
    await connectToDatabase();

    return (
      (await StoreSettingsModel.findOneAndUpdate({}, input, {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }).exec()) as StoreSettingsDocument
    );
  }
}
