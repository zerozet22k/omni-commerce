import {
  HydratedDocument,
  InferSchemaType,
  Schema,
  model,
  models,
} from "mongoose";

const customerGroupSchema = new Schema(
  {
    groupName: {
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
    collection: "customer_groups",
    timestamps: false,
  },
);

const customerGroupMemberSchema = new Schema(
  {
    customerGroupId: {
      type: Schema.Types.ObjectId,
      ref: "CustomerGroup",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "customer_group_members",
    timestamps: false,
  },
);

customerGroupMemberSchema.index({ customerGroupId: 1, userId: 1 }, { unique: true });

const addressSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    label: {
      type: String,
      trim: true,
      maxlength: 80,
    },
    receiverName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    receiverPhone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },
    countryId: {
      type: Schema.Types.ObjectId,
      ref: "Country",
      required: true,
    },
    stateRegionId: {
      type: Schema.Types.ObjectId,
      ref: "StateRegion",
    },
    city: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    township: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    postalCode: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    addressLine1: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    addressLine2: {
      type: String,
      trim: true,
      maxlength: 255,
    },
    landmark: {
      type: String,
      trim: true,
      maxlength: 255,
    },
    isDefaultShipping: {
      type: Boolean,
      required: true,
      default: false,
    },
    isDefaultBilling: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    collection: "addresses",
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  },
);

const wishlistSchema = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    collection: "wishlists",
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  },
);

const wishlistItemSchema = new Schema(
  {
    wishlistId: {
      type: Schema.Types.ObjectId,
      ref: "Wishlist",
      required: true,
      index: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "wishlist_items",
    timestamps: false,
  },
);

wishlistItemSchema.index({ wishlistId: 1, productId: 1 }, { unique: true });

const recentlyViewedProductSchema = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    sessionId: {
      type: String,
      trim: true,
      maxlength: 120,
      index: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    viewedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    collection: "recently_viewed_products",
    timestamps: false,
  },
);

const savedSearchSchema = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    searchQuery: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    filtersJson: {
      type: String,
      trim: true,
    },
    createdAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    collection: "saved_searches",
    timestamps: false,
  },
);

export type CustomerGroupSchema = InferSchemaType<typeof customerGroupSchema>;
export type CustomerGroupDocument = HydratedDocument<CustomerGroupSchema>;
export type CustomerGroupMemberSchema = InferSchemaType<typeof customerGroupMemberSchema>;
export type CustomerGroupMemberDocument = HydratedDocument<CustomerGroupMemberSchema>;
export type AddressSchema = InferSchemaType<typeof addressSchema>;
export type AddressDocument = HydratedDocument<AddressSchema>;
export type WishlistSchema = InferSchemaType<typeof wishlistSchema>;
export type WishlistDocument = HydratedDocument<WishlistSchema>;
export type WishlistItemSchema = InferSchemaType<typeof wishlistItemSchema>;
export type WishlistItemDocument = HydratedDocument<WishlistItemSchema>;
export type RecentlyViewedProductSchema = InferSchemaType<typeof recentlyViewedProductSchema>;
export type RecentlyViewedProductDocument = HydratedDocument<RecentlyViewedProductSchema>;
export type SavedSearchSchema = InferSchemaType<typeof savedSearchSchema>;
export type SavedSearchDocument = HydratedDocument<SavedSearchSchema>;

export const CustomerGroupModel =
  models.CustomerGroup ||
  model<CustomerGroupSchema>("CustomerGroup", customerGroupSchema);
export const CustomerGroupMemberModel =
  models.CustomerGroupMember ||
  model<CustomerGroupMemberSchema>("CustomerGroupMember", customerGroupMemberSchema);
export const AddressModel =
  models.Address || model<AddressSchema>("Address", addressSchema);
export const WishlistModel =
  models.Wishlist || model<WishlistSchema>("Wishlist", wishlistSchema);
export const WishlistItemModel =
  models.WishlistItem || model<WishlistItemSchema>("WishlistItem", wishlistItemSchema);
export const RecentlyViewedProductModel =
  models.RecentlyViewedProduct ||
  model<RecentlyViewedProductSchema>(
    "RecentlyViewedProduct",
    recentlyViewedProductSchema,
  );
export const SavedSearchModel =
  models.SavedSearch || model<SavedSearchSchema>("SavedSearch", savedSearchSchema);
