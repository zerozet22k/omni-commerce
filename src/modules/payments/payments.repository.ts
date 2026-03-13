import { connectToDatabase } from "@/lib/db/mongodb";
import {
  PaymentMethodModel,
  PaymentModel,
  PaymentTransactionModel,
  type PaymentDocument,
  type PaymentMethodDocument,
} from "@/modules/payments/payments.models";

export class PaymentsRepository {
  async createPaymentMethod(input: Record<string, unknown>) {
    await connectToDatabase();
    return PaymentMethodModel.create(input);
  }

  async listActivePaymentMethods(): Promise<PaymentMethodDocument[]> {
    await connectToDatabase();
    return PaymentMethodModel.find({ isActive: true }).sort({ methodName: 1 }).exec();
  }

  async findPaymentMethodById(
    paymentMethodId: string,
  ): Promise<PaymentMethodDocument | null> {
    await connectToDatabase();
    return PaymentMethodModel.findById(paymentMethodId).exec();
  }

  async createPayment(input: Record<string, unknown>) {
    await connectToDatabase();
    return PaymentModel.create(input);
  }

  async findPaymentById(paymentId: string): Promise<PaymentDocument | null> {
    await connectToDatabase();
    return PaymentModel.findById(paymentId).exec();
  }

  async listPaymentsByOrder(orderId: string): Promise<PaymentDocument[]> {
    await connectToDatabase();
    return PaymentModel.find({ orderId }).sort({ paymentDate: -1 }).exec();
  }

  async updatePayment(paymentId: string, update: Record<string, unknown>) {
    await connectToDatabase();
    return PaymentModel.findByIdAndUpdate(paymentId, update, { new: true }).exec();
  }

  async createPaymentTransaction(input: Record<string, unknown>) {
    await connectToDatabase();
    return PaymentTransactionModel.create(input);
  }
}
