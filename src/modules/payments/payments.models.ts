import {
  HydratedDocument,
  InferSchemaType,
  Schema,
  model,
  models,
} from "mongoose";

const paymentMethodSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
      maxlength: 30,
    },
    methodName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    provider: {
      type: String,
      trim: true,
      maxlength: 80,
    },
    receiverName: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    receiverPhone: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    receiverAccountNo: {
      type: String,
      trim: true,
      maxlength: 40,
    },
    isManual: {
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
    collection: "payment_methods",
    timestamps: false,
  },
);

const paymentSchema = new Schema(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    paymentMethodId: {
      type: Schema.Types.ObjectId,
      ref: "PaymentMethod",
      required: true,
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
    transactionRef: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    slipAssetId: {
      type: Schema.Types.ObjectId,
      ref: "MediaAsset",
    },
    status: {
      type: String,
      enum: ["SUBMITTED", "AUTHORIZED", "CONFIRMED", "REJECTED", "REFUNDED"],
      required: true,
      default: "SUBMITTED",
      index: true,
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    confirmedAt: {
      type: Date,
    },
    confirmedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    collection: "payments",
    timestamps: false,
  },
);

const paymentTransactionSchema = new Schema(
  {
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
      index: true,
    },
    gatewayName: {
      type: String,
      trim: true,
      maxlength: 80,
    },
    gatewayTransactionId: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    transactionType: {
      type: String,
      enum: ["AUTH", "CAPTURE", "VOID", "REFUND", "MANUAL_CONFIRM"],
      required: true,
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
      enum: ["PENDING", "SUCCESS", "FAILED"],
      required: true,
    },
    rawResponse: {
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
    collection: "payment_transactions",
    timestamps: false,
  },
);

export type PaymentMethodSchema = InferSchemaType<typeof paymentMethodSchema>;
export type PaymentMethodDocument = HydratedDocument<PaymentMethodSchema>;
export type PaymentSchema = InferSchemaType<typeof paymentSchema>;
export type PaymentDocument = HydratedDocument<PaymentSchema>;
export type PaymentTransactionSchema = InferSchemaType<typeof paymentTransactionSchema>;
export type PaymentTransactionDocument = HydratedDocument<PaymentTransactionSchema>;

export const PaymentMethodModel =
  models.PaymentMethod ||
  model<PaymentMethodSchema>("PaymentMethod", paymentMethodSchema);
export const PaymentModel =
  models.Payment || model<PaymentSchema>("Payment", paymentSchema);
export const PaymentTransactionModel =
  models.PaymentTransaction ||
  model<PaymentTransactionSchema>("PaymentTransaction", paymentTransactionSchema);
