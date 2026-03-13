import { connectToDatabase } from "@/lib/db/mongodb";
import {
  ShipmentItemModel,
  ShipmentModel,
  ShipmentPackageModel,
  ShipmentTrackingEventModel,
  type ShipmentDocument,
} from "@/modules/shipments/shipments.models";

export class ShipmentsRepository {
  async createShipment(input: Record<string, unknown>) {
    await connectToDatabase();
    return ShipmentModel.create(input);
  }

  async findShipmentById(shipmentId: string): Promise<ShipmentDocument | null> {
    await connectToDatabase();
    return ShipmentModel.findById(shipmentId).exec();
  }

  async listShipmentsByOrder(orderId: string): Promise<ShipmentDocument[]> {
    await connectToDatabase();
    return ShipmentModel.find({ orderId }).sort({ shippedAt: -1 }).exec();
  }

  async updateShipment(shipmentId: string, update: Record<string, unknown>) {
    await connectToDatabase();
    return ShipmentModel.findByIdAndUpdate(shipmentId, update, { new: true }).exec();
  }

  async createShipmentItems(items: Array<Record<string, unknown>>) {
    await connectToDatabase();
    return ShipmentItemModel.insertMany(items);
  }

  async createShipmentPackage(input: Record<string, unknown>) {
    await connectToDatabase();
    return ShipmentPackageModel.create(input);
  }

  async createTrackingEvent(input: Record<string, unknown>) {
    await connectToDatabase();
    return ShipmentTrackingEventModel.create(input);
  }
}
