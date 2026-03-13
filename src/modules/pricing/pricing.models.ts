import {
  HydratedDocument,
  InferSchemaType,
  Schema,
  model,
  models,
} from "mongoose";

const taxRateSchema = new Schema(
  {
    taxClassId: {
      type: Schema.Types.ObjectId,
      ref: "TaxClass",
      required: true,
      index: true,
    },
    countryId: {
      type: Schema.Types.ObjectId,
      ref: "Country",
      index: true,
    },
    stateRegionId: {
      type: Schema.Types.ObjectId,
      ref: "StateRegion",
      index: true,
    },
    rateName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    ratePercent: {
      type: Number,
      required: true,
      min: 0,
    },
    priority: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    startsAt: Date,
    endsAt: Date,
  },
  {
    collection: "tax_rates",
    timestamps: false,
  },
);

const shippingZoneSchema = new Schema(
  {
    zoneName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 255,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "shipping_zones",
    timestamps: false,
  },
);

const shippingZoneCountrySchema = new Schema(
  {
    shippingZoneId: {
      type: Schema.Types.ObjectId,
      ref: "ShippingZone",
      required: true,
      index: true,
    },
    countryId: {
      type: Schema.Types.ObjectId,
      ref: "Country",
      required: true,
      index: true,
    },
  },
  {
    collection: "shipping_zone_countries",
    timestamps: false,
  },
);

shippingZoneCountrySchema.index({ shippingZoneId: 1, countryId: 1 }, { unique: true });

const shippingMethodSchema = new Schema(
  {
    shippingZoneId: {
      type: Schema.Types.ObjectId,
      ref: "ShippingZone",
      required: true,
      index: true,
    },
    methodName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
      maxlength: 40,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 255,
    },
    baseFee: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    freeShippingMinAmount: {
      type: Number,
      min: 0,
    },
    estimatedMinDays: {
      type: Number,
      min: 0,
    },
    estimatedMaxDays: {
      type: Number,
      min: 0,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    collection: "shipping_methods",
    timestamps: false,
  },
);

const shippingRateRuleSchema = new Schema(
  {
    shippingMethodId: {
      type: Schema.Types.ObjectId,
      ref: "ShippingMethod",
      required: true,
      index: true,
    },
    minWeightGrams: Number,
    maxWeightGrams: Number,
    minOrderAmount: Number,
    maxOrderAmount: Number,
    fee: {
      type: Number,
      required: true,
      min: 0,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    collection: "shipping_rate_rules",
    timestamps: false,
  },
);

const promotionSchema = new Schema(
  {
    code: {
      type: String,
      trim: true,
      uppercase: true,
      unique: true,
      sparse: true,
      maxlength: 50,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      trim: true,
    },
    promotionType: {
      type: String,
      enum: ["COUPON", "FLASH_SALE", "AUTO_DISCOUNT", "FREE_SHIPPING"],
      required: true,
    },
    discountType: {
      type: String,
      enum: ["PERCENT", "AMOUNT"],
    },
    discountValue: Number,
    minOrderAmount: Number,
    maxDiscountAmount: Number,
    usageLimit: Number,
    usageCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    perCustomerLimit: Number,
    startsAt: Date,
    endsAt: Date,
    heroAssetId: {
      type: Schema.Types.ObjectId,
      ref: "MediaAsset",
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    collection: "promotions",
    timestamps: false,
  },
);

const promotionProductSchema = new Schema(
  {
    promotionId: {
      type: Schema.Types.ObjectId,
      ref: "Promotion",
      required: true,
      index: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
  },
  {
    collection: "promotion_products",
    timestamps: false,
  },
);

promotionProductSchema.index({ promotionId: 1, productId: 1 }, { unique: true });

const promotionVariantSchema = new Schema(
  {
    promotionId: {
      type: Schema.Types.ObjectId,
      ref: "Promotion",
      required: true,
      index: true,
    },
    variantId: {
      type: Schema.Types.ObjectId,
      ref: "ProductVariant",
      required: true,
      index: true,
    },
  },
  {
    collection: "promotion_variants",
    timestamps: false,
  },
);

promotionVariantSchema.index({ promotionId: 1, variantId: 1 }, { unique: true });

const promotionCustomerGroupSchema = new Schema(
  {
    promotionId: {
      type: Schema.Types.ObjectId,
      ref: "Promotion",
      required: true,
      index: true,
    },
    customerGroupId: {
      type: Schema.Types.ObjectId,
      ref: "CustomerGroup",
      required: true,
      index: true,
    },
  },
  {
    collection: "promotion_customer_groups",
    timestamps: false,
  },
);

promotionCustomerGroupSchema.index(
  { promotionId: 1, customerGroupId: 1 },
  { unique: true },
);

const couponUsageLogSchema = new Schema(
  {
    promotionId: {
      type: Schema.Types.ObjectId,
      ref: "Promotion",
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      index: true,
    },
    usedCode: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    usedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    collection: "coupon_usage_logs",
    timestamps: false,
  },
);

const giftCardSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
      maxlength: 50,
    },
    initialBalance: {
      type: Number,
      required: true,
      min: 0,
    },
    currentBalance: {
      type: Number,
      required: true,
      min: 0,
    },
    currencyCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      default: "MMK",
      maxlength: 3,
    },
    expiresAt: Date,
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "gift_cards",
    timestamps: false,
  },
);

const giftCardTransactionSchema = new Schema(
  {
    giftCardId: {
      type: Schema.Types.ObjectId,
      ref: "GiftCard",
      required: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    transactionType: {
      type: String,
      enum: ["ISSUE", "REDEEM", "REFUND", "ADJUST"],
      required: true,
    },
    createdAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    collection: "gift_card_transactions",
    timestamps: false,
  },
);

export type TaxRateDocument = HydratedDocument<InferSchemaType<typeof taxRateSchema>>;
export type ShippingZoneDocument = HydratedDocument<InferSchemaType<typeof shippingZoneSchema>>;
export type ShippingZoneCountryDocument = HydratedDocument<
  InferSchemaType<typeof shippingZoneCountrySchema>
>;
export type ShippingMethodDocument = HydratedDocument<InferSchemaType<typeof shippingMethodSchema>>;
export type ShippingRateRuleDocument = HydratedDocument<
  InferSchemaType<typeof shippingRateRuleSchema>
>;
export type PromotionDocument = HydratedDocument<InferSchemaType<typeof promotionSchema>>;
export type PromotionProductDocument = HydratedDocument<
  InferSchemaType<typeof promotionProductSchema>
>;
export type PromotionVariantDocument = HydratedDocument<
  InferSchemaType<typeof promotionVariantSchema>
>;
export type PromotionCustomerGroupDocument = HydratedDocument<
  InferSchemaType<typeof promotionCustomerGroupSchema>
>;
export type CouponUsageLogDocument = HydratedDocument<
  InferSchemaType<typeof couponUsageLogSchema>
>;
export type GiftCardDocument = HydratedDocument<InferSchemaType<typeof giftCardSchema>>;
export type GiftCardTransactionDocument = HydratedDocument<
  InferSchemaType<typeof giftCardTransactionSchema>
>;

export const TaxRateModel =
  models.TaxRate || model("TaxRate", taxRateSchema);
export const ShippingZoneModel =
  models.ShippingZone || model("ShippingZone", shippingZoneSchema);
export const ShippingZoneCountryModel =
  models.ShippingZoneCountry ||
  model("ShippingZoneCountry", shippingZoneCountrySchema);
export const ShippingMethodModel =
  models.ShippingMethod || model("ShippingMethod", shippingMethodSchema);
export const ShippingRateRuleModel =
  models.ShippingRateRule ||
  model("ShippingRateRule", shippingRateRuleSchema);
export const PromotionModel =
  models.Promotion || model("Promotion", promotionSchema);
export const PromotionProductModel =
  models.PromotionProduct ||
  model("PromotionProduct", promotionProductSchema);
export const PromotionVariantModel =
  models.PromotionVariant ||
  model("PromotionVariant", promotionVariantSchema);
export const PromotionCustomerGroupModel =
  models.PromotionCustomerGroup ||
  model("PromotionCustomerGroup", promotionCustomerGroupSchema);
export const CouponUsageLogModel =
  models.CouponUsageLog || model("CouponUsageLog", couponUsageLogSchema);
export const GiftCardModel =
  models.GiftCard || model("GiftCard", giftCardSchema);
export const GiftCardTransactionModel =
  models.GiftCardTransaction ||
  model("GiftCardTransaction", giftCardTransactionSchema);
