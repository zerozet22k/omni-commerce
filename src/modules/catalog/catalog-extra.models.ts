import { Schema, model, models } from "mongoose";

const collectionSchema = new Schema(
  {
    collectionName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
    },
    bannerAssetId: {
      type: Schema.Types.ObjectId,
      ref: "MediaAsset",
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    sortOrder: {
      type: Number,
      required: true,
      default: 0,
    },
    startsAt: {
      type: Date,
    },
    endsAt: {
      type: Date,
    },
  },
  {
    collection: "collections",
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  },
);

const productTagSchema = new Schema(
  {
    tagName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      maxlength: 60,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      maxlength: 80,
    },
  },
  {
    collection: "product_tags",
    timestamps: false,
  },
);

const productBadgeSchema = new Schema(
  {
    badgeName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      maxlength: 60,
    },
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    colorCode: {
      type: String,
      trim: true,
      maxlength: 20,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    collection: "product_badges",
    timestamps: false,
  },
);

const specificationDefinitionSchema = new Schema(
  {
    specKey: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
      maxlength: 80,
    },
    specLabel: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    valueType: {
      type: String,
      enum: ["TEXT", "NUMBER", "BOOLEAN", "ENUM"],
      required: true,
      default: "TEXT",
    },
    unit: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    filterDisplayType: {
      type: String,
      enum: ["CHECKBOX", "RADIO", "RANGE", "COLOR_SWATCH"],
      required: true,
      default: "CHECKBOX",
    },
    isFilterable: {
      type: Boolean,
      required: true,
      default: true,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    collection: "specification_definitions",
    timestamps: false,
  },
);

const categorySpecMapSchema = new Schema(
  {
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    specDefinitionId: {
      type: Schema.Types.ObjectId,
      ref: "SpecificationDefinition",
      required: true,
      index: true,
    },
    isRequired: {
      type: Boolean,
      required: true,
      default: false,
    },
    isFilterable: {
      type: Boolean,
      required: true,
      default: true,
    },
    sortOrder: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    collection: "category_spec_maps",
    timestamps: false,
  },
);

categorySpecMapSchema.index({ categoryId: 1, specDefinitionId: 1 }, { unique: true });
categorySpecMapSchema.index({ categoryId: 1, sortOrder: 1 });

const categoryOptionTypeMapSchema = new Schema(
  {
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    optionTypeId: {
      type: Schema.Types.ObjectId,
      ref: "OptionType",
      required: true,
      index: true,
    },
    isRequired: {
      type: Boolean,
      required: true,
      default: false,
    },
    sortOrder: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    collection: "category_option_type_maps",
    timestamps: false,
  },
);

categoryOptionTypeMapSchema.index({ categoryId: 1, optionTypeId: 1 }, { unique: true });
categoryOptionTypeMapSchema.index({ categoryId: 1, sortOrder: 1 });

const categoryFilterConfigSchema = new Schema(
  {
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    filterKey: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    filterLabel: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    filterSource: {
      type: String,
      enum: ["BRAND", "PRICE", "OPTION_TYPE", "SPECIFICATION"],
      required: true,
      maxlength: 30,
    },
    optionTypeId: {
      type: Schema.Types.ObjectId,
      ref: "OptionType",
    },
    specDefinitionId: {
      type: Schema.Types.ObjectId,
      ref: "SpecificationDefinition",
    },
    displayType: {
      type: String,
      enum: ["CHECKBOX", "RADIO", "RANGE", "COLOR_SWATCH"],
      required: true,
      default: "CHECKBOX",
    },
    sortOrder: {
      type: Number,
      required: true,
      default: 0,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    isInherited: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    collection: "category_filter_configs",
    timestamps: false,
  },
);

categoryFilterConfigSchema.index({ categoryId: 1, filterKey: 1 }, { unique: true });
categoryFilterConfigSchema.index({ categoryId: 1, sortOrder: 1 });

const productSpecificationSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    specDefinitionId: {
      type: Schema.Types.ObjectId,
      ref: "SpecificationDefinition",
      index: true,
    },
    specGroup: {
      type: String,
      trim: true,
      maxlength: 80,
    },
    specKey: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    specValue: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    sortOrder: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    collection: "product_specifications",
    timestamps: false,
  },
);

productSpecificationSchema.index(
  { productId: 1, specKey: 1, specValue: 1 },
  { unique: true },
);

const productFaqSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    question: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    answer: {
      type: String,
      required: true,
      trim: true,
    },
    sortOrder: {
      type: Number,
      required: true,
      default: 0,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    collection: "product_faqs",
    timestamps: false,
  },
);

const productTagMapSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    tagId: {
      type: Schema.Types.ObjectId,
      ref: "ProductTag",
      required: true,
      index: true,
    },
  },
  {
    collection: "product_tag_maps",
    timestamps: false,
  },
);

productTagMapSchema.index({ productId: 1, tagId: 1 }, { unique: true });

const productCollectionMapSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    collectionId: {
      type: Schema.Types.ObjectId,
      ref: "Collection",
      required: true,
      index: true,
    },
  },
  {
    collection: "product_collection_maps",
    timestamps: false,
  },
);

productCollectionMapSchema.index(
  { productId: 1, collectionId: 1 },
  { unique: true },
);

const productBadgeMapSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    badgeId: {
      type: Schema.Types.ObjectId,
      ref: "ProductBadge",
      required: true,
      index: true,
    },
  },
  {
    collection: "product_badge_maps",
    timestamps: false,
  },
);

productBadgeMapSchema.index({ productId: 1, badgeId: 1 }, { unique: true });

const productRelationSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    relatedProductId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    relationType: {
      type: String,
      enum: ["RELATED", "UPSELL", "CROSS_SELL", "SIMILAR"],
      required: true,
      maxlength: 30,
    },
    sortOrder: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    collection: "product_relations",
    timestamps: false,
  },
);

productRelationSchema.index(
  { productId: 1, relatedProductId: 1, relationType: 1 },
  { unique: true },
);

const productImageSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    assetId: {
      type: Schema.Types.ObjectId,
      ref: "MediaAsset",
      required: true,
      index: true,
    },
    sortOrder: {
      type: Number,
      required: true,
      default: 0,
    },
    isPrimary: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    collection: "product_images",
    timestamps: false,
  },
);

productImageSchema.index({ productId: 1, assetId: 1 }, { unique: true });
productImageSchema.index({ productId: 1, sortOrder: 1 });

const productOptionTypeSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    optionTypeId: {
      type: Schema.Types.ObjectId,
      ref: "OptionType",
      required: true,
      index: true,
    },
  },
  {
    collection: "products_option_types",
    timestamps: false,
  },
);

productOptionTypeSchema.index(
  { productId: 1, optionTypeId: 1 },
  { unique: true },
);

const variantOptionValueSchema = new Schema(
  {
    variantId: {
      type: Schema.Types.ObjectId,
      ref: "ProductVariant",
      required: true,
      index: true,
    },
    optionValueId: {
      type: Schema.Types.ObjectId,
      ref: "OptionValue",
      required: true,
      index: true,
    },
  },
  {
    collection: "variant_option_values",
    timestamps: false,
  },
);

variantOptionValueSchema.index(
  { variantId: 1, optionValueId: 1 },
  { unique: true },
);

const variantImageSchema = new Schema(
  {
    variantId: {
      type: Schema.Types.ObjectId,
      ref: "ProductVariant",
      required: true,
      index: true,
    },
    assetId: {
      type: Schema.Types.ObjectId,
      ref: "MediaAsset",
      required: true,
      index: true,
    },
    sortOrder: {
      type: Number,
      required: true,
      default: 0,
    },
    isPrimary: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    collection: "variant_images",
    timestamps: false,
  },
);

variantImageSchema.index({ variantId: 1, assetId: 1 }, { unique: true });
variantImageSchema.index({ variantId: 1, sortOrder: 1 });

const productBundleItemSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    childProductId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    childVariantId: {
      type: Schema.Types.ObjectId,
      ref: "ProductVariant",
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    sortOrder: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    collection: "product_bundle_items",
    timestamps: false,
  },
);

productBundleItemSchema.index(
  { productId: 1, childProductId: 1, childVariantId: 1 },
  { unique: true },
);

export const CollectionModel =
  models.Collection || model("Collection", collectionSchema);
export const ProductTagModel =
  models.ProductTag || model("ProductTag", productTagSchema);
export const ProductBadgeModel =
  models.ProductBadge || model("ProductBadge", productBadgeSchema);
export const SpecificationDefinitionModel =
  models.SpecificationDefinition ||
  model("SpecificationDefinition", specificationDefinitionSchema);
export const CategorySpecMapModel =
  models.CategorySpecMap || model("CategorySpecMap", categorySpecMapSchema);
export const CategoryOptionTypeMapModel =
  models.CategoryOptionTypeMap ||
  model("CategoryOptionTypeMap", categoryOptionTypeMapSchema);
export const CategoryFilterConfigModel =
  models.CategoryFilterConfig ||
  model("CategoryFilterConfig", categoryFilterConfigSchema);
export const ProductSpecificationModel =
  models.ProductSpecification ||
  model("ProductSpecification", productSpecificationSchema);
export const ProductFaqModel =
  models.ProductFaq || model("ProductFaq", productFaqSchema);
export const ProductTagMapModel =
  models.ProductTagMap || model("ProductTagMap", productTagMapSchema);
export const ProductCollectionMapModel =
  models.ProductCollectionMap ||
  model("ProductCollectionMap", productCollectionMapSchema);
export const ProductBadgeMapModel =
  models.ProductBadgeMap || model("ProductBadgeMap", productBadgeMapSchema);
export const ProductRelationModel =
  models.ProductRelation || model("ProductRelation", productRelationSchema);
export const ProductImageModel =
  models.ProductImage || model("ProductImage", productImageSchema);
export const ProductOptionTypeModel =
  models.ProductOptionType ||
  model("ProductOptionType", productOptionTypeSchema);
export const VariantOptionValueModel =
  models.VariantOptionValue ||
  model("VariantOptionValue", variantOptionValueSchema);
export const VariantImageModel =
  models.VariantImage || model("VariantImage", variantImageSchema);
export const ProductBundleItemModel =
  models.ProductBundleItem ||
  model("ProductBundleItem", productBundleItemSchema);
