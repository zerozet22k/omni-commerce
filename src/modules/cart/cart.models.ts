import {
  HydratedDocument,
  InferSchemaType,
  Schema,
  model,
  models,
} from "mongoose";

const cartSchema = new Schema(
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
      enum: ["ACTIVE", "CONVERTED", "ABANDONED", "EXPIRED"],
      required: true,
      default: "ACTIVE",
      index: true,
    },
    subtotal: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    discountTotal: {
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
    taxTotal: {
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
    couponCode: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    expiresAt: {
      type: Date,
    },
  },
  {
    collection: "carts",
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  },
);

const cartItemSchema = new Schema(
  {
    cartId: {
      type: Schema.Types.ObjectId,
      ref: "Cart",
      required: true,
      index: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    variantId: {
      type: Schema.Types.ObjectId,
      ref: "ProductVariant",
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    discountAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    taxAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    collection: "cart_items",
    timestamps: false,
  },
);

cartItemSchema.index({ cartId: 1, variantId: 1 }, { unique: true });

const stockReservationSchema = new Schema(
  {
    variantId: {
      type: Schema.Types.ObjectId,
      ref: "ProductVariant",
      required: true,
      index: true,
    },
    cartId: {
      type: Schema.Types.ObjectId,
      ref: "Cart",
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "RELEASED", "CONVERTED", "EXPIRED"],
      required: true,
      default: "ACTIVE",
      index: true,
    },
    expiresAt: {
      type: Date,
    },
  },
  {
    collection: "stock_reservations",
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  },
);

export type CartSchema = InferSchemaType<typeof cartSchema>;
export type CartDocument = HydratedDocument<CartSchema>;
export type CartItemSchema = InferSchemaType<typeof cartItemSchema>;
export type CartItemDocument = HydratedDocument<CartItemSchema>;
export type StockReservationSchema = InferSchemaType<typeof stockReservationSchema>;
export type StockReservationDocument = HydratedDocument<StockReservationSchema>;

export const CartModel = models.Cart || model<CartSchema>("Cart", cartSchema);
export const CartItemModel =
  models.CartItem || model<CartItemSchema>("CartItem", cartItemSchema);
export const StockReservationModel =
  models.StockReservation ||
  model<StockReservationSchema>("StockReservation", stockReservationSchema);
