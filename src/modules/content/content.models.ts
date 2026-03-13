import {
  HydratedDocument,
  InferSchemaType,
  Schema,
  model,
  models,
} from "mongoose";

const pageSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      maxlength: 150,
    },
    content: {
      type: String,
      trim: true,
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
    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED", "ARCHIVED"],
      required: true,
      default: "DRAFT",
    },
    publishedAt: Date,
  },
  {
    collection: "pages",
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  },
);

const bannerSchema = new Schema(
  {
    bannerName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    bannerType: {
      type: String,
      enum: ["HERO", "PROMO", "CATEGORY"],
      required: true,
    },
    assetId: {
      type: Schema.Types.ObjectId,
      ref: "MediaAsset",
      required: true,
      index: true,
    },
    linkUrl: {
      type: String,
      trim: true,
      maxlength: 255,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 150,
    },
    subtitle: {
      type: String,
      trim: true,
      maxlength: 255,
    },
    startsAt: Date,
    endsAt: Date,
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
  },
  {
    collection: "banners",
    timestamps: false,
  },
);

const navigationMenuSchema = new Schema(
  {
    menuName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      maxlength: 80,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    collection: "navigation_menus",
    timestamps: false,
  },
);

const navigationMenuItemSchema = new Schema(
  {
    navigationMenuId: {
      type: Schema.Types.ObjectId,
      ref: "NavigationMenu",
      required: true,
      index: true,
    },
    parentItemId: {
      type: Schema.Types.ObjectId,
      ref: "NavigationMenuItem",
    },
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    linkType: {
      type: String,
      enum: ["URL", "CATEGORY", "COLLECTION", "PAGE", "PRODUCT"],
      required: true,
    },
    linkValue: {
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
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    collection: "navigation_menu_items",
    timestamps: false,
  },
);

const notificationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    channel: {
      type: String,
      enum: ["IN_APP", "EMAIL", "SMS"],
      required: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    body: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    isRead: {
      type: Boolean,
      required: true,
      default: false,
    },
    sentAt: Date,
    readAt: Date,
    relatedType: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    relatedId: {
      type: Schema.Types.ObjectId,
    },
  },
  {
    collection: "notifications",
    timestamps: false,
  },
);

notificationSchema.index({ userId: 1, isRead: 1 });

const analyticsEventSchema = new Schema(
  {
    eventName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
      index: true,
    },
    userId: {
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
      index: true,
    },
    variantId: {
      type: Schema.Types.ObjectId,
      ref: "ProductVariant",
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      index: true,
    },
    source: {
      type: String,
      trim: true,
      maxlength: 60,
    },
    metadataJson: {
      type: String,
      trim: true,
    },
    createdAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
  },
  {
    collection: "analytics_events",
    timestamps: false,
  },
);

const auditLogSchema = new Schema(
  {
    actorUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    entityType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
      index: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    beforeData: {
      type: String,
      trim: true,
    },
    afterData: {
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
    collection: "audit_logs",
    timestamps: false,
  },
);

auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ actorUserId: 1, createdAt: -1 });

export type PageDocument = HydratedDocument<InferSchemaType<typeof pageSchema>>;
export type BannerDocument = HydratedDocument<InferSchemaType<typeof bannerSchema>>;
export type NavigationMenuDocument = HydratedDocument<
  InferSchemaType<typeof navigationMenuSchema>
>;
export type NavigationMenuItemDocument = HydratedDocument<
  InferSchemaType<typeof navigationMenuItemSchema>
>;
export type NotificationDocument = HydratedDocument<
  InferSchemaType<typeof notificationSchema>
>;
export type AnalyticsEventDocument = HydratedDocument<
  InferSchemaType<typeof analyticsEventSchema>
>;
export type AuditLogDocument = HydratedDocument<InferSchemaType<typeof auditLogSchema>>;

export const PageModel = models.Page || model("Page", pageSchema);
export const BannerModel = models.Banner || model("Banner", bannerSchema);
export const NavigationMenuModel =
  models.NavigationMenu || model("NavigationMenu", navigationMenuSchema);
export const NavigationMenuItemModel =
  models.NavigationMenuItem ||
  model("NavigationMenuItem", navigationMenuItemSchema);
export const NotificationModel =
  models.Notification || model("Notification", notificationSchema);
export const AnalyticsEventModel =
  models.AnalyticsEvent || model("AnalyticsEvent", analyticsEventSchema);
export const AuditLogModel =
  models.AuditLog || model("AuditLog", auditLogSchema);
