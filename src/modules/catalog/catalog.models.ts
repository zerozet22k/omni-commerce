import {
  HydratedDocument,
  InferSchemaType,
  Schema,
  model,
  models,
} from "mongoose";

const categorySchema = new Schema(
  {
    categoryName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    parentCategoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
    },
    description: {
      type: String,
      trim: true,
    },
    imageAssetId: {
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
    seoTitle: {
      type: String,
      trim: true,
      maxlength: 255,
    },
    seoDescription: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    fullSlugPath: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    depth: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    ancestorCategoryIds: {
      type: [Schema.Types.ObjectId],
      default: [],
    },
  },
  {
    collection: "categories",
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  },
);

categorySchema.index({ slug: 1, parentCategoryId: 1 }, { unique: true });
categorySchema.index({ parentCategoryId: 1, sortOrder: 1 });
categorySchema.index(
  { fullSlugPath: 1 },
  {
    unique: true,
    partialFilterExpression: {
      fullSlugPath: { $type: "string" },
    },
  },
);

const brandSchema = new Schema(
  {
    brandName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      maxlength: 120,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      maxlength: 120,
    },
    originCountryId: {
      type: Schema.Types.ObjectId,
      ref: "Country",
    },
    description: {
      type: String,
      trim: true,
    },
    logoAssetId: {
      type: Schema.Types.ObjectId,
      ref: "MediaAsset",
    },
    websiteUrl: {
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
    collection: "brands",
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  },
);

const productTypeSchema = new Schema(
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
  },
  {
    collection: "product_types",
    timestamps: false,
  },
);

const taxClassSchema = new Schema(
  {
    taxClassName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      maxlength: 80,
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
  },
  {
    collection: "tax_classes",
    timestamps: false,
  },
);

const optionTypeSchema = new Schema(
  {
    optionName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      maxlength: 50,
    },
    displayType: {
      type: String,
      enum: ["TEXT", "COLOR_SWATCH", "BUTTON"],
      required: true,
      default: "TEXT",
    },
  },
  {
    collection: "option_types",
    timestamps: false,
  },
);

const optionValueSchema = new Schema(
  {
    optionTypeId: {
      type: Schema.Types.ObjectId,
      ref: "OptionType",
      required: true,
      index: true,
    },
    valueName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    valueCode: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    swatchHex: {
      type: String,
      trim: true,
      maxlength: 20,
    },
    sortOrder: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    collection: "option_values",
    timestamps: false,
  },
);

optionValueSchema.index({ optionTypeId: 1, valueName: 1 }, { unique: true });

const productSpecificationSchema = new Schema(
  {
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
  { _id: true },
);

const productFaqSchema = new Schema(
  {
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
  { _id: true },
);

const productImageSchema = new Schema(
  {
    assetId: {
      type: Schema.Types.ObjectId,
      ref: "MediaAsset",
      required: true,
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
  { _id: true },
);

const productRelationSchema = new Schema(
  {
    relatedProductId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    relationType: {
      type: String,
      enum: ["RELATED", "UPSELL", "CROSS_SELL", "SIMILAR"],
      required: true,
    },
    sortOrder: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { _id: true },
);

const productBundleItemSchema = new Schema(
  {
    childProductId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    childVariantId: {
      type: Schema.Types.ObjectId,
      ref: "ProductVariant",
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
  { _id: true },
);

const productSchema = new Schema(
  {
    productName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      maxlength: 200,
    },
    productTypeId: {
      type: Schema.Types.ObjectId,
      ref: "ProductType",
      required: true,
      index: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    brandId: {
      type: Schema.Types.ObjectId,
      ref: "Brand",
      index: true,
    },
    taxClassId: {
      type: Schema.Types.ObjectId,
      ref: "TaxClass",
      index: true,
    },
    originCountryId: {
      type: Schema.Types.ObjectId,
      ref: "Country",
    },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    description: {
      type: String,
      trim: true,
    },
    material: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    careInstructions: {
      type: String,
      trim: true,
      maxlength: 255,
    },
    warrantyInfo: {
      type: String,
      trim: true,
      maxlength: 255,
    },
    conditionType: {
      type: String,
      enum: ["NEW", "REFURBISHED"],
      required: true,
      default: "NEW",
    },
    status: {
      type: String,
      enum: ["DRAFT", "ACTIVE", "ARCHIVED"],
      required: true,
      default: "DRAFT",
      index: true,
    },
    visibility: {
      type: String,
      enum: ["PUBLIC", "HIDDEN"],
      required: true,
      default: "PUBLIC",
      index: true,
    },
    isFeatured: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    isNewArrival: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    isBestSeller: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    seoTitle: {
      type: String,
      trim: true,
      maxlength: 255,
    },
    seoDescription: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    avgRating: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    reviewCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    viewCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    soldCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    publishedAt: {
      type: Date,
    },
    tagIds: {
      type: [Schema.Types.ObjectId],
      default: [],
    },
    collectionIds: {
      type: [Schema.Types.ObjectId],
      default: [],
    },
    badgeIds: {
      type: [Schema.Types.ObjectId],
      default: [],
    },
    optionTypeIds: {
      type: [Schema.Types.ObjectId],
      default: [],
    },
    specifications: {
      type: [productSpecificationSchema],
      default: [],
    },
    faqs: {
      type: [productFaqSchema],
      default: [],
    },
    images: {
      type: [productImageSchema],
      default: [],
    },
    relations: {
      type: [productRelationSchema],
      default: [],
    },
    bundleItems: {
      type: [productBundleItemSchema],
      default: [],
    },
  },
  {
    collection: "products",
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  },
);

const variantImageSchema = new Schema(
  {
    assetId: {
      type: Schema.Types.ObjectId,
      ref: "MediaAsset",
      required: true,
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
  { _id: true },
);

const productVariantSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      maxlength: 80,
    },
    barcode: {
      type: String,
      trim: true,
      maxlength: 80,
    },
    variantName: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    compareAtPrice: {
      type: Number,
      min: 0,
    },
    costPrice: {
      type: Number,
      min: 0,
    },
    weightGrams: {
      type: Number,
      min: 0,
    },
    lengthCm: {
      type: Number,
      min: 0,
    },
    widthCm: {
      type: Number,
      min: 0,
    },
    heightCm: {
      type: Number,
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
    stockQty: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    reservedQty: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    availableQty: {
      type: Number,
      required: true,
      default: 0,
    },
    lowStockThreshold: {
      type: Number,
      required: true,
      default: 5,
      min: 0,
    },
    trackInventory: {
      type: Boolean,
      required: true,
      default: true,
    },
    allowBackorder: {
      type: Boolean,
      required: true,
      default: false,
    },
    isDefault: {
      type: Boolean,
      required: true,
      default: false,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
      index: true,
    },
    optionValueIds: {
      type: [Schema.Types.ObjectId],
      default: [],
    },
    images: {
      type: [variantImageSchema],
      default: [],
    },
  },
  {
    collection: "product_variants",
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  },
);

export type CategorySchema = InferSchemaType<typeof categorySchema>;
export type CategoryDocument = HydratedDocument<CategorySchema>;
export type BrandSchema = InferSchemaType<typeof brandSchema>;
export type BrandDocument = HydratedDocument<BrandSchema>;
export type ProductTypeSchema = InferSchemaType<typeof productTypeSchema>;
export type ProductTypeDocument = HydratedDocument<ProductTypeSchema>;
export type TaxClassSchema = InferSchemaType<typeof taxClassSchema>;
export type TaxClassDocument = HydratedDocument<TaxClassSchema>;
export type OptionTypeSchema = InferSchemaType<typeof optionTypeSchema>;
export type OptionTypeDocument = HydratedDocument<OptionTypeSchema>;
export type OptionValueSchema = InferSchemaType<typeof optionValueSchema>;
export type OptionValueDocument = HydratedDocument<OptionValueSchema>;
export type ProductSchema = InferSchemaType<typeof productSchema>;
export type ProductDocument = HydratedDocument<ProductSchema>;
export type ProductVariantSchema = InferSchemaType<typeof productVariantSchema>;
export type ProductVariantDocument = HydratedDocument<ProductVariantSchema>;

export const CategoryModel =
  models.Category || model<CategorySchema>("Category", categorySchema);
export const BrandModel =
  models.Brand || model<BrandSchema>("Brand", brandSchema);
export const ProductTypeModel =
  models.ProductType ||
  model<ProductTypeSchema>("ProductType", productTypeSchema);
export const TaxClassModel =
  models.TaxClass || model<TaxClassSchema>("TaxClass", taxClassSchema);
export const OptionTypeModel =
  models.OptionType || model<OptionTypeSchema>("OptionType", optionTypeSchema);
export const OptionValueModel =
  models.OptionValue ||
  model<OptionValueSchema>("OptionValue", optionValueSchema);
export const ProductModel =
  models.Product || model<ProductSchema>("Product", productSchema);
export const ProductVariantModel =
  models.ProductVariant ||
  model<ProductVariantSchema>("ProductVariant", productVariantSchema);
