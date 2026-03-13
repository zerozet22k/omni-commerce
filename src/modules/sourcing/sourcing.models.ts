import {
  HydratedDocument,
  InferSchemaType,
  Schema,
  model,
  models,
} from "mongoose";

const sourcingPlatformSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
      maxlength: 30,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    collection: "sourcing_platforms",
    timestamps: false,
  },
);

const sourcingSourceSchema = new Schema(
  {
    sourcingPlatformId: {
      type: Schema.Types.ObjectId,
      ref: "SourcingPlatform",
      required: true,
      index: true,
    },
    sourceName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    contactName: {
      type: String,
      trim: true,
      maxlength: 150,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    email: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    shopUrl: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 255,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    collection: "sourcing_sources",
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  },
);

const variantSourceSchema = new Schema(
  {
    variantId: {
      type: Schema.Types.ObjectId,
      ref: "ProductVariant",
      required: true,
      index: true,
    },
    sourcingSourceId: {
      type: Schema.Types.ObjectId,
      ref: "SourcingSource",
      required: true,
      index: true,
    },
    sourceSku: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    sourceProductName: {
      type: String,
      trim: true,
      maxlength: 255,
    },
    sourceProductUrl: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    sourcePrice: {
      type: Number,
      min: 0,
    },
    sourceCurrencyCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: "CNY",
      maxlength: 3,
    },
    minOrderQty: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    isPreferred: {
      type: Boolean,
      required: true,
      default: false,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    lastCheckedAt: {
      type: Date,
    },
  },
  {
    collection: "variant_sources",
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  },
);

variantSourceSchema.index(
  { variantId: 1, sourcingSourceId: 1, sourceProductUrl: 1 },
  { unique: true },
);

const restockOrderSchema = new Schema(
  {
    sourcingSourceId: {
      type: Schema.Types.ObjectId,
      ref: "SourcingSource",
      required: true,
      index: true,
    },
    restockNo: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      maxlength: 40,
    },
    status: {
      type: String,
      enum: [
        "DRAFT",
        "ORDERED",
        "PAID",
        "IN_TRANSIT",
        "PARTIALLY_RECEIVED",
        "RECEIVED",
        "CANCELLED",
      ],
      required: true,
      default: "DRAFT",
    },
    orderDate: {
      type: Date,
    },
    expectedArrivalAt: {
      type: Date,
    },
    receivedAt: {
      type: Date,
    },
    sourceOrderRef: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    trackingNo: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    currencyCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      default: "CNY",
      maxlength: 3,
    },
    subtotal: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    shippingFee: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    extraFee: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    collection: "restock_orders",
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  },
);

const restockOrderItemSchema = new Schema(
  {
    restockOrderId: {
      type: Schema.Types.ObjectId,
      ref: "RestockOrder",
      required: true,
      index: true,
    },
    variantId: {
      type: Schema.Types.ObjectId,
      ref: "ProductVariant",
      required: true,
      index: true,
    },
    variantSourceId: {
      type: Schema.Types.ObjectId,
      ref: "VariantSource",
    },
    sourceSkuSnapshot: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    sourceProductNameSnapshot: {
      type: String,
      trim: true,
      maxlength: 255,
    },
    sourceProductUrlSnapshot: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    orderedQty: {
      type: Number,
      required: true,
      min: 1,
    },
    receivedQty: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    rejectedQty: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    unitCost: {
      type: Number,
      required: true,
      min: 0,
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 255,
    },
  },
  {
    collection: "restock_order_items",
    timestamps: false,
  },
);

restockOrderItemSchema.index({ restockOrderId: 1, variantId: 1 }, { unique: true });

const stockAdjustmentSchema = new Schema(
  {
    variantId: {
      type: Schema.Types.ObjectId,
      ref: "ProductVariant",
      required: true,
      index: true,
    },
    restockOrderId: {
      type: Schema.Types.ObjectId,
      ref: "RestockOrder",
      index: true,
    },
    adjustmentType: {
      type: String,
      enum: [
        "RESTOCK_IN",
        "MANUAL_ADD",
        "MANUAL_DEDUCT",
        "DAMAGE",
        "RETURN_IN",
        "CORRECTION",
      ],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 255,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    createdAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    collection: "stock_adjustments",
    timestamps: false,
  },
);

export type SourcingPlatformSchema = InferSchemaType<typeof sourcingPlatformSchema>;
export type SourcingPlatformDocument = HydratedDocument<SourcingPlatformSchema>;
export type SourcingSourceSchema = InferSchemaType<typeof sourcingSourceSchema>;
export type SourcingSourceDocument = HydratedDocument<SourcingSourceSchema>;
export type VariantSourceSchema = InferSchemaType<typeof variantSourceSchema>;
export type VariantSourceDocument = HydratedDocument<VariantSourceSchema>;
export type RestockOrderSchema = InferSchemaType<typeof restockOrderSchema>;
export type RestockOrderDocument = HydratedDocument<RestockOrderSchema>;
export type RestockOrderItemSchema = InferSchemaType<typeof restockOrderItemSchema>;
export type RestockOrderItemDocument = HydratedDocument<RestockOrderItemSchema>;
export type StockAdjustmentSchema = InferSchemaType<typeof stockAdjustmentSchema>;
export type StockAdjustmentDocument = HydratedDocument<StockAdjustmentSchema>;

export const SourcingPlatformModel =
  models.SourcingPlatform ||
  model<SourcingPlatformSchema>("SourcingPlatform", sourcingPlatformSchema);
export const SourcingSourceModel =
  models.SourcingSource ||
  model<SourcingSourceSchema>("SourcingSource", sourcingSourceSchema);
export const VariantSourceModel =
  models.VariantSource ||
  model<VariantSourceSchema>("VariantSource", variantSourceSchema);
export const RestockOrderModel =
  models.RestockOrder ||
  model<RestockOrderSchema>("RestockOrder", restockOrderSchema);
export const RestockOrderItemModel =
  models.RestockOrderItem ||
  model<RestockOrderItemSchema>("RestockOrderItem", restockOrderItemSchema);
export const StockAdjustmentModel =
  models.StockAdjustment ||
  model<StockAdjustmentSchema>("StockAdjustment", stockAdjustmentSchema);
