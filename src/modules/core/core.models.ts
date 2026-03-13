import {
  HydratedDocument,
  InferSchemaType,
  Schema,
  model,
  models,
} from "mongoose";

const countrySchema = new Schema(
  {
    countryName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      maxlength: 100,
    },
    isoCode: {
      type: String,
      trim: true,
      uppercase: true,
      unique: true,
      sparse: true,
      maxlength: 2,
    },
    phoneCode: {
      type: String,
      trim: true,
      maxlength: 10,
    },
  },
  {
    collection: "countries",
    timestamps: false,
  },
);

const stateRegionSchema = new Schema(
  {
    countryId: {
      type: Schema.Types.ObjectId,
      ref: "Country",
      required: true,
      index: true,
    },
    stateRegionName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    code: {
      type: String,
      trim: true,
      maxlength: 20,
    },
  },
  {
    collection: "states_regions",
    timestamps: false,
  },
);

stateRegionSchema.index(
  { countryId: 1, stateRegionName: 1 },
  { unique: true },
);

const mediaAssetSchema = new Schema(
  {
    assetType: {
      type: String,
      enum: ["IMAGE", "VIDEO", "FILE"],
      required: true,
      default: "IMAGE",
    },
    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    altText: {
      type: String,
      trim: true,
      maxlength: 255,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 255,
    },
    mimeType: {
      type: String,
      trim: true,
      maxlength: 80,
    },
    width: {
      type: Number,
      min: 0,
    },
    height: {
      type: Number,
      min: 0,
    },
    durationSec: {
      type: Number,
      min: 0,
    },
    sizeBytes: {
      type: Number,
      min: 0,
    },
  },
  {
    collection: "media_assets",
    timestamps: {
      createdAt: "createdAt",
      updatedAt: false,
    },
  },
);

const storeSettingsSchema = new Schema(
  {
    storeName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    storeSlug: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      maxlength: 120,
    },
    storeEmail: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    storePhone: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    supportEmail: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    supportPhone: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    currencyCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      default: "MMK",
      maxlength: 3,
    },
    locale: {
      type: String,
      required: true,
      trim: true,
      default: "en",
      maxlength: 20,
    },
    timezone: {
      type: String,
      required: true,
      trim: true,
      default: "Asia/Yangon",
      maxlength: 60,
    },
    logoAssetId: {
      type: Schema.Types.ObjectId,
      ref: "MediaAsset",
    },
    faviconAssetId: {
      type: Schema.Types.ObjectId,
      ref: "MediaAsset",
    },
    heroAssetId: {
      type: Schema.Types.ObjectId,
      ref: "MediaAsset",
    },
    allowGuestCheckout: {
      type: Boolean,
      required: true,
      default: false,
    },
    stockPolicy: {
      type: String,
      enum: ["BLOCK_ON_ZERO", "ALLOW_BACKORDER"],
      required: true,
      default: "BLOCK_ON_ZERO",
    },
    orderAutoCancelMinutes: {
      type: Number,
      required: true,
      default: 1440,
      min: 0,
    },
    reviewAutoPublish: {
      type: Boolean,
      required: true,
      default: false,
    },
    maintenanceMode: {
      type: Boolean,
      required: true,
      default: false,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    collection: "store_settings",
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  },
);

export type CountrySchema = InferSchemaType<typeof countrySchema>;
export type CountryDocument = HydratedDocument<CountrySchema>;
export type StateRegionSchema = InferSchemaType<typeof stateRegionSchema>;
export type StateRegionDocument = HydratedDocument<StateRegionSchema>;
export type MediaAssetSchema = InferSchemaType<typeof mediaAssetSchema>;
export type MediaAssetDocument = HydratedDocument<MediaAssetSchema>;
export type StoreSettingsSchema = InferSchemaType<typeof storeSettingsSchema>;
export type StoreSettingsDocument = HydratedDocument<StoreSettingsSchema>;

export const CountryModel =
  models.Country || model<CountrySchema>("Country", countrySchema);
export const StateRegionModel =
  models.StateRegion ||
  model<StateRegionSchema>("StateRegion", stateRegionSchema);
export const MediaAssetModel =
  models.MediaAsset || model<MediaAssetSchema>("MediaAsset", mediaAssetSchema);
export const StoreSettingsModel =
  models.StoreSettings ||
  model<StoreSettingsSchema>("StoreSettings", storeSettingsSchema);
