import {
  HydratedDocument,
  InferSchemaType,
  Schema,
  model,
  models,
} from "mongoose";

const checkoutSessionSchema = new Schema(
  {
    cartId: {
      type: Schema.Types.ObjectId,
      ref: "Cart",
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "EXPIRED"],
      required: true,
      default: "PENDING",
    },
    shippingAddressId: {
      type: Schema.Types.ObjectId,
      ref: "Address",
    },
    billingAddressId: {
      type: Schema.Types.ObjectId,
      ref: "Address",
    },
    selectedShippingMethodId: {
      type: Schema.Types.ObjectId,
      ref: "ShippingMethod",
    },
    selectedPaymentMethodId: {
      type: Schema.Types.ObjectId,
      ref: "PaymentMethod",
    },
    expiresAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    collection: "checkout_sessions",
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  },
);

const orderSchema = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    orderNo: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      maxlength: 40,
    },
    orderDate: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        "PENDING",
        "AWAITING_PAYMENT",
        "PAID",
        "PROCESSING",
        "SHIPPED",
        "COMPLETED",
        "CANCELLED",
        "REFUNDED",
      ],
      required: true,
      default: "PENDING",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["UNPAID", "PARTIAL", "SUBMITTED", "CONFIRMED", "FAILED", "REFUNDED"],
      required: true,
      default: "UNPAID",
    },
    fulfillmentStatus: {
      type: String,
      enum: ["UNFULFILLED", "PARTIAL", "PACKING", "SHIPPED", "DELIVERED"],
      required: true,
      default: "UNFULFILLED",
    },
    currencyCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      default: "MMK",
      maxlength: 3,
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
    giftCardTotal: {
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
    customerNameSnapshot: {
      type: String,
      trim: true,
      maxlength: 150,
    },
    customerEmailSnapshot: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    customerPhoneSnapshot: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    shippingAddressId: {
      type: Schema.Types.ObjectId,
      ref: "Address",
    },
    billingAddressId: {
      type: Schema.Types.ObjectId,
      ref: "Address",
    },
    shippingMethodId: {
      type: Schema.Types.ObjectId,
      ref: "ShippingMethod",
    },
    note: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    placedAt: {
      type: Date,
    },
    paidAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
  },
  {
    collection: "orders",
    timestamps: false,
  },
);

const orderItemSchema = new Schema(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
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
      index: true,
    },
    productNameSnapshot: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    productSlugSnapshot: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    skuSnapshot: {
      type: String,
      trim: true,
      maxlength: 80,
    },
    variantLabelSnapshot: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    thumbnailUrlSnapshot: {
      type: String,
      trim: true,
      maxlength: 500,
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
    collection: "order_items",
    timestamps: false,
  },
);

const orderStatusLogSchema = new Schema(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    fromStatus: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    toStatus: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 255,
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    changedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    collection: "order_status_logs",
    timestamps: false,
  },
);

const orderNoteSchema = new Schema(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    noteType: {
      type: String,
      enum: ["INTERNAL", "CUSTOMER_VISIBLE"],
      required: true,
      default: "INTERNAL",
    },
    note: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
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
    collection: "order_notes",
    timestamps: false,
  },
);

const invoiceSchema = new Schema(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    invoiceNo: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      maxlength: 40,
    },
    status: {
      type: String,
      enum: ["ISSUED", "VOID"],
      required: true,
      default: "ISSUED",
    },
    issuedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discountTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    shippingFee: {
      type: Number,
      required: true,
      min: 0,
    },
    taxTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    collection: "invoices",
    timestamps: false,
  },
);

export type CheckoutSessionSchema = InferSchemaType<typeof checkoutSessionSchema>;
export type CheckoutSessionDocument = HydratedDocument<CheckoutSessionSchema>;
export type OrderSchema = InferSchemaType<typeof orderSchema>;
export type OrderDocument = HydratedDocument<OrderSchema>;
export type OrderItemSchema = InferSchemaType<typeof orderItemSchema>;
export type OrderItemDocument = HydratedDocument<OrderItemSchema>;
export type OrderStatusLogSchema = InferSchemaType<typeof orderStatusLogSchema>;
export type OrderStatusLogDocument = HydratedDocument<OrderStatusLogSchema>;
export type OrderNoteSchema = InferSchemaType<typeof orderNoteSchema>;
export type OrderNoteDocument = HydratedDocument<OrderNoteSchema>;
export type InvoiceSchema = InferSchemaType<typeof invoiceSchema>;
export type InvoiceDocument = HydratedDocument<InvoiceSchema>;

export const CheckoutSessionModel =
  models.CheckoutSession ||
  model<CheckoutSessionSchema>("CheckoutSession", checkoutSessionSchema);
export const OrderModel =
  models.Order || model<OrderSchema>("Order", orderSchema);
export const OrderItemModel =
  models.OrderItem || model<OrderItemSchema>("OrderItem", orderItemSchema);
export const OrderStatusLogModel =
  models.OrderStatusLog ||
  model<OrderStatusLogSchema>("OrderStatusLog", orderStatusLogSchema);
export const OrderNoteModel =
  models.OrderNote || model<OrderNoteSchema>("OrderNote", orderNoteSchema);
export const InvoiceModel =
  models.Invoice || model<InvoiceSchema>("Invoice", invoiceSchema);
