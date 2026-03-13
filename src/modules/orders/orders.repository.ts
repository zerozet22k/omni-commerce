import { connectToDatabase } from "@/lib/db/mongodb";
import {
  CheckoutSessionModel,
  InvoiceModel,
  OrderItemModel,
  OrderModel,
  OrderNoteModel,
  OrderStatusLogModel,
  type OrderDocument,
  type OrderItemDocument,
} from "@/modules/orders/orders.models";

export class OrdersRepository {
  async createCheckoutSession(input: Record<string, unknown>) {
    await connectToDatabase();
    return CheckoutSessionModel.create(input);
  }

  async createOrder(input: Record<string, unknown>) {
    await connectToDatabase();
    return OrderModel.create(input);
  }

  async findOrderById(orderId: string): Promise<OrderDocument | null> {
    await connectToDatabase();
    return OrderModel.findById(orderId).exec();
  }

  async listOrdersByCustomer(customerId: string): Promise<OrderDocument[]> {
    await connectToDatabase();
    return OrderModel.find({ customerId }).sort({ orderDate: -1 }).exec();
  }

  async updateOrder(orderId: string, update: Record<string, unknown>) {
    await connectToDatabase();
    return OrderModel.findByIdAndUpdate(orderId, update, { new: true }).exec();
  }

  async createOrderItems(input: Array<Record<string, unknown>>) {
    await connectToDatabase();
    return OrderItemModel.insertMany(input);
  }

  async listOrderItems(orderId: string): Promise<OrderItemDocument[]> {
    await connectToDatabase();
    return OrderItemModel.find({ orderId }).exec();
  }

  async createStatusLog(input: Record<string, unknown>) {
    await connectToDatabase();
    return OrderStatusLogModel.create(input);
  }

  async createOrderNote(input: Record<string, unknown>) {
    await connectToDatabase();
    return OrderNoteModel.create(input);
  }

  async createInvoice(input: Record<string, unknown>) {
    await connectToDatabase();
    return InvoiceModel.create(input);
  }
}
