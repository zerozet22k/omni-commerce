import { connectToDatabase } from "@/lib/db/mongodb";
import {
  RestockOrderItemModel,
  RestockOrderModel,
  SourcingPlatformModel,
  SourcingSourceModel,
  StockAdjustmentModel,
  VariantSourceModel,
  type RestockOrderDocument,
  type RestockOrderItemDocument,
  type SourcingSourceDocument,
  type VariantSourceDocument,
} from "@/modules/sourcing/sourcing.models";

export class SourcingRepository {
  async createPlatform(input: Record<string, unknown>) {
    await connectToDatabase();
    return SourcingPlatformModel.create(input);
  }

  async createSource(input: Record<string, unknown>) {
    await connectToDatabase();
    return SourcingSourceModel.create(input);
  }

  async findSourceById(
    sourcingSourceId: string,
  ): Promise<SourcingSourceDocument | null> {
    await connectToDatabase();
    return SourcingSourceModel.findById(sourcingSourceId).exec();
  }

  async createVariantSource(input: Record<string, unknown>) {
    await connectToDatabase();
    return VariantSourceModel.create(input);
  }

  async findVariantSourceById(
    variantSourceId: string,
  ): Promise<VariantSourceDocument | null> {
    await connectToDatabase();
    return VariantSourceModel.findById(variantSourceId).exec();
  }

  async createRestockOrder(input: Record<string, unknown>) {
    await connectToDatabase();
    return RestockOrderModel.create(input);
  }

  async findRestockOrderById(
    restockOrderId: string,
  ): Promise<RestockOrderDocument | null> {
    await connectToDatabase();
    return RestockOrderModel.findById(restockOrderId).exec();
  }

  async updateRestockOrder(
    restockOrderId: string,
    update: Record<string, unknown>,
  ) {
    await connectToDatabase();
    return RestockOrderModel.findByIdAndUpdate(restockOrderId, update, {
      new: true,
    }).exec();
  }

  async createRestockOrderItems(items: Array<Record<string, unknown>>) {
    await connectToDatabase();
    return RestockOrderItemModel.insertMany(items);
  }

  async listRestockOrderItems(
    restockOrderId: string,
  ): Promise<RestockOrderItemDocument[]> {
    await connectToDatabase();
    return RestockOrderItemModel.find({ restockOrderId }).exec();
  }

  async findRestockOrderItemById(
    restockOrderItemId: string,
  ): Promise<RestockOrderItemDocument | null> {
    await connectToDatabase();
    return RestockOrderItemModel.findById(restockOrderItemId).exec();
  }

  async updateRestockOrderItem(
    restockOrderItemId: string,
    update: Record<string, unknown>,
  ) {
    await connectToDatabase();
    return RestockOrderItemModel.findByIdAndUpdate(restockOrderItemId, update, {
      new: true,
    }).exec();
  }

  async createStockAdjustment(input: Record<string, unknown>) {
    await connectToDatabase();
    return StockAdjustmentModel.create(input);
  }

  async listStockAdjustmentsByVariant(variantId: string) {
    await connectToDatabase();
    return StockAdjustmentModel.find({ variantId }).sort({ createdAt: -1 }).exec();
  }
}
