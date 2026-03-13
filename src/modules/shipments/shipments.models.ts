import {
  HydratedDocument,
  InferSchemaType,
  Schema,
  model,
  models,
} from "mongoose";

const shipmentSchema = new Schema(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    shippingMethodId: {
      type: Schema.Types.ObjectId,
      ref: "ShippingMethod",
    },
    courierName: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    trackingNo: {
      type: String,
      trim: true,
      maxlength: 100,
      index: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "PACKING", "OUT_FOR_DELIVERY", "DELIVERED", "RETURNED"],
      required: true,
      default: "PENDING",
    },
    shippedAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    shippingFee: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 255,
    },
  },
  {
    collection: "shipments",
    timestamps: false,
  },
);

const shipmentItemSchema = new Schema(
  {
    shipmentId: {
      type: Schema.Types.ObjectId,
      ref: "Shipment",
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
  },
  {
    collection: "shipment_items",
    timestamps: false,
  },
);

shipmentItemSchema.index({ shipmentId: 1, orderItemId: 1 }, { unique: true });

const shipmentPackageSchema = new Schema(
  {
    shipmentId: {
      type: Schema.Types.ObjectId,
      ref: "Shipment",
      required: true,
      index: true,
    },
    packageNo: {
      type: String,
      trim: true,
      maxlength: 40,
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
    labelAssetId: {
      type: Schema.Types.ObjectId,
      ref: "MediaAsset",
    },
  },
  {
    collection: "shipment_packages",
    timestamps: false,
  },
);

const shipmentTrackingEventSchema = new Schema(
  {
    shipmentId: {
      type: Schema.Types.ObjectId,
      ref: "Shipment",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"],
      required: true,
      maxlength: 40,
    },
    location: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    message: {
      type: String,
      trim: true,
      maxlength: 255,
    },
    eventAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    collection: "shipment_tracking_events",
    timestamps: false,
  },
);

export type ShipmentSchema = InferSchemaType<typeof shipmentSchema>;
export type ShipmentDocument = HydratedDocument<ShipmentSchema>;
export type ShipmentItemSchema = InferSchemaType<typeof shipmentItemSchema>;
export type ShipmentItemDocument = HydratedDocument<ShipmentItemSchema>;
export type ShipmentPackageSchema = InferSchemaType<typeof shipmentPackageSchema>;
export type ShipmentPackageDocument = HydratedDocument<ShipmentPackageSchema>;
export type ShipmentTrackingEventSchema = InferSchemaType<
  typeof shipmentTrackingEventSchema
>;
export type ShipmentTrackingEventDocument = HydratedDocument<ShipmentTrackingEventSchema>;

export const ShipmentModel =
  models.Shipment || model<ShipmentSchema>("Shipment", shipmentSchema);
export const ShipmentItemModel =
  models.ShipmentItem ||
  model<ShipmentItemSchema>("ShipmentItem", shipmentItemSchema);
export const ShipmentPackageModel =
  models.ShipmentPackage ||
  model<ShipmentPackageSchema>("ShipmentPackage", shipmentPackageSchema);
export const ShipmentTrackingEventModel =
  models.ShipmentTrackingEvent ||
  model<ShipmentTrackingEventSchema>(
    "ShipmentTrackingEvent",
    shipmentTrackingEventSchema,
  );
