import {
  HydratedDocument,
  InferSchemaType,
  Schema,
  model,
  models,
} from "mongoose";

const reviewSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    orderItemId: {
      type: Schema.Types.ObjectId,
      ref: "OrderItem",
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    comment: {
      type: String,
      trim: true,
    },
    isVerifiedPurchase: {
      type: Boolean,
      required: true,
      default: false,
    },
    isVisible: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    collection: "reviews",
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  },
);

const reviewMediaSchema = new Schema(
  {
    reviewId: {
      type: Schema.Types.ObjectId,
      ref: "Review",
      required: true,
      index: true,
    },
    assetId: {
      type: Schema.Types.ObjectId,
      ref: "MediaAsset",
      required: true,
      index: true,
    },
  },
  {
    collection: "review_media",
    timestamps: false,
  },
);

reviewMediaSchema.index({ reviewId: 1, assetId: 1 }, { unique: true });

const returnSchema = new Schema(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    returnNo: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      maxlength: 40,
    },
    status: {
      type: String,
      enum: ["REQUESTED", "APPROVED", "REJECTED", "RECEIVED", "REFUNDED", "CLOSED"],
      required: true,
      default: "REQUESTED",
      index: true,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 255,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    requestedAt: Date,
    approvedAt: Date,
    receivedAt: Date,
    closedAt: Date,
  },
  {
    collection: "returns",
    timestamps: false,
  },
);

const returnItemSchema = new Schema(
  {
    returnId: {
      type: Schema.Types.ObjectId,
      ref: "Return",
      required: true,
      index: true,
    },
    orderItemId: {
      type: Schema.Types.ObjectId,
      ref: "OrderItem",
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 255,
    },
    conditionNote: {
      type: String,
      trim: true,
      maxlength: 255,
    },
  },
  {
    collection: "return_items",
    timestamps: false,
  },
);

returnItemSchema.index({ returnId: 1, orderItemId: 1 }, { unique: true });

const refundSchema = new Schema(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
      index: true,
    },
    returnId: {
      type: Schema.Types.ObjectId,
      ref: "Return",
      index: true,
    },
    amount: {
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
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "PAID"],
      required: true,
      default: "PENDING",
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 255,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: Date,
    processedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    collection: "refunds",
    timestamps: false,
  },
);

export type ReviewDocument = HydratedDocument<InferSchemaType<typeof reviewSchema>>;
export type ReviewMediaDocument = HydratedDocument<InferSchemaType<typeof reviewMediaSchema>>;
export type ReturnDocument = HydratedDocument<InferSchemaType<typeof returnSchema>>;
export type ReturnItemDocument = HydratedDocument<InferSchemaType<typeof returnItemSchema>>;
export type RefundDocument = HydratedDocument<InferSchemaType<typeof refundSchema>>;

export const ReviewModel = models.Review || model("Review", reviewSchema);
export const ReviewMediaModel =
  models.ReviewMedia || model("ReviewMedia", reviewMediaSchema);
export const ReturnModel = models.Return || model("Return", returnSchema);
export const ReturnItemModel =
  models.ReturnItem || model("ReturnItem", returnItemSchema);
export const RefundModel = models.Refund || model("Refund", refundSchema);
