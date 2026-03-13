import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type InferSchemaType,
} from "mongoose";

const customerProfileSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    loyaltyPoints: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    totalSpent: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    totalOrders: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    preferredLanguage: {
      type: String,
      trim: true,
      maxlength: 20,
    },
    marketingOptIn: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    collection: "customer_profiles",
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  },
);

export type CustomerProfileSchema = InferSchemaType<typeof customerProfileSchema>;
export type CustomerProfileDocument = HydratedDocument<CustomerProfileSchema>;

export const CustomerProfileModel =
  models.CustomerProfile ||
  model<CustomerProfileSchema>("CustomerProfile", customerProfileSchema);
