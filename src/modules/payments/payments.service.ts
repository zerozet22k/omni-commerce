import { AppError } from "@/lib/errors/app-error";
import { assertObjectId } from "@/lib/utils/object-id";
import { systemEventsService } from "@/modules/content/system-events.service";
import { OrdersRepository } from "@/modules/orders/orders.repository";
import { PaymentsRepository } from "@/modules/payments/payments.repository";

export class PaymentsService {
  constructor(
    private readonly paymentsRepository = new PaymentsRepository(),
    private readonly ordersRepository = new OrdersRepository(),
  ) {}

  async createPaymentMethod(input: {
    code: string;
    methodName: string;
    provider?: string;
    receiverName?: string;
    receiverPhone?: string;
    receiverAccountNo?: string;
    isManual?: boolean;
    isActive?: boolean;
  }) {
    return this.paymentsRepository.createPaymentMethod(input);
  }

  async listActivePaymentMethods() {
    return this.paymentsRepository.listActivePaymentMethods();
  }

  async submitPayment(input: {
    orderId: string;
    paymentMethodId: string;
    amount: number;
    currencyCode?: string;
    transactionRef?: string;
    slipAssetId?: string;
  }) {
    assertObjectId(input.orderId, "order id");
    assertObjectId(input.paymentMethodId, "payment method id");
    if (input.slipAssetId) {
      assertObjectId(input.slipAssetId, "slip asset id");
    }

    const [order, paymentMethod] = await Promise.all([
      this.ordersRepository.findOrderById(input.orderId),
      this.paymentsRepository.findPaymentMethodById(input.paymentMethodId),
    ]);

    if (!order) {
      throw new AppError("Order not found.", 404);
    }

    if (!paymentMethod || !paymentMethod.isActive) {
      throw new AppError("Payment method not found.", 404);
    }

    const payment = await this.paymentsRepository.createPayment({
      orderId: input.orderId,
      paymentMethodId: input.paymentMethodId,
      amount: input.amount,
      currencyCode: input.currencyCode ?? order.currencyCode,
      transactionRef: input.transactionRef,
      slipAssetId: input.slipAssetId,
      status: "SUBMITTED",
      paymentDate: new Date(),
    });

    await this.paymentsRepository.createPaymentTransaction({
      paymentId: payment.id,
      gatewayName: paymentMethod.provider,
      gatewayTransactionId: input.transactionRef,
      transactionType: "AUTH",
      amount: payment.amount,
      currencyCode: payment.currencyCode,
      status: "PENDING",
      createdAt: new Date(),
    });

    await this.ordersRepository.updateOrder(input.orderId, {
      paymentStatus: "SUBMITTED",
      status: "AWAITING_PAYMENT",
    });

    return payment;
  }

  async confirmPayment(input: {
    paymentId: string;
    confirmedBy?: string;
    gatewayTransactionId?: string;
    rawResponse?: string;
  }) {
    assertObjectId(input.paymentId, "payment id");
    if (input.confirmedBy) {
      assertObjectId(input.confirmedBy, "confirmed by");
    }

    const payment = await this.paymentsRepository.findPaymentById(input.paymentId);

    if (!payment) {
      throw new AppError("Payment not found.", 404);
    }

    const updatedPayment = await this.paymentsRepository.updatePayment(payment.id, {
      status: "CONFIRMED",
      confirmedAt: new Date(),
      confirmedBy: input.confirmedBy,
    });

    await this.paymentsRepository.createPaymentTransaction({
      paymentId: payment.id,
      gatewayTransactionId: input.gatewayTransactionId,
      transactionType: "MANUAL_CONFIRM",
      amount: payment.amount,
      currencyCode: payment.currencyCode,
      status: "SUCCESS",
      rawResponse: input.rawResponse,
      createdAt: new Date(),
    });

    await this.ordersRepository.updateOrder(payment.orderId.toString(), {
      paymentStatus: "CONFIRMED",
      status: "PAID",
      paidAt: new Date(),
    });

    const order = await this.ordersRepository.findOrderById(payment.orderId.toString());
    await systemEventsService.recordNotification({
      userId: order?.customerId?.toString?.() ?? String(order?.customerId ?? ""),
      type: "PAYMENT_CONFIRMED",
      title: order ? `Payment confirmed for ${order.orderNo}` : "Payment confirmed",
      body: "Your payment has been confirmed.",
      relatedType: "PAYMENT",
      relatedId: payment.id,
    });
    if (input.confirmedBy) {
      await systemEventsService.recordAuditLog({
        actorUserId: input.confirmedBy,
        action: "PAYMENT_CONFIRM",
        entityType: "PAYMENT",
        entityId: payment.id,
        afterData: {
          orderId: payment.orderId?.toString?.() ?? String(payment.orderId ?? ""),
          status: "CONFIRMED",
        },
      });
    }

    return updatedPayment;
  }

  async rejectPayment(input: { paymentId: string; rawResponse?: string }) {
    assertObjectId(input.paymentId, "payment id");
    const payment = await this.paymentsRepository.findPaymentById(input.paymentId);

    if (!payment) {
      throw new AppError("Payment not found.", 404);
    }

    const updatedPayment = await this.paymentsRepository.updatePayment(payment.id, {
      status: "REJECTED",
    });

    await this.paymentsRepository.createPaymentTransaction({
      paymentId: payment.id,
      transactionType: "VOID",
      amount: payment.amount,
      currencyCode: payment.currencyCode,
      status: "FAILED",
      rawResponse: input.rawResponse,
      createdAt: new Date(),
    });

    await this.ordersRepository.updateOrder(payment.orderId.toString(), {
      paymentStatus: "FAILED",
      status: "AWAITING_PAYMENT",
    });

    return updatedPayment;
  }
}

export const paymentsService = new PaymentsService();
