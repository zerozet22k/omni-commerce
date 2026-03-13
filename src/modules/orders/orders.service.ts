import { randomUUID } from "crypto";

import { AppError } from "@/lib/errors/app-error";
import { assertObjectId } from "@/lib/utils/object-id";
import { cartService } from "@/modules/cart/cart.service";
import { catalogService } from "@/modules/catalog/catalog.service";
import { systemEventsService } from "@/modules/content/system-events.service";
import { OrdersRepository } from "@/modules/orders/orders.repository";
import { couponUsageService } from "@/modules/pricing/coupon-usage.service";

function buildOrderNumber() {
  return `ORD-${Date.now()}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

function buildInvoiceNumber() {
  return `INV-${Date.now()}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

export class OrdersService {
  constructor(private readonly ordersRepository = new OrdersRepository()) {}

  private distributeAmount(
    totalAmount: number,
    items: Array<{ baseAmount: number }>,
    index: number,
  ): number {
    if (totalAmount <= 0 || items.length === 0) {
      return 0;
    }

    const subtotal = items.reduce((sum, item) => sum + item.baseAmount, 0);

    if (subtotal <= 0) {
      return 0;
    }

    if (index === items.length - 1) {
      const allocated = items
        .slice(0, index)
        .reduce(
          (sum, item, itemIndex) =>
            sum + this.distributeAmount(totalAmount, items, itemIndex),
          0,
        );

      return Number((totalAmount - allocated).toFixed(2));
    }

    return Number((((items[index]?.baseAmount ?? 0) / subtotal) * totalAmount).toFixed(2));
  }

  async createCheckoutSession(input: {
    cartId: string;
    customerId?: string;
    shippingAddressId?: string;
    billingAddressId?: string;
    selectedShippingMethodId?: string;
    selectedPaymentMethodId?: string;
    expiresAt?: Date;
  }) {
    assertObjectId(input.cartId, "cart id");

    for (const [key, value] of Object.entries({
      customerId: input.customerId,
      shippingAddressId: input.shippingAddressId,
      billingAddressId: input.billingAddressId,
      selectedShippingMethodId: input.selectedShippingMethodId,
      selectedPaymentMethodId: input.selectedPaymentMethodId,
    })) {
      if (value) {
        assertObjectId(value, key);
      }
    }

    return this.ordersRepository.createCheckoutSession({
      ...input,
      expiresAt: input.expiresAt ?? new Date(Date.now() + 1000 * 60 * 30),
    });
  }

  async placeOrderFromCart(input: {
    cartId: string;
    customerId?: string;
    shippingAddressId?: string;
    billingAddressId?: string;
    shippingMethodId?: string;
    note?: string;
    customerNameSnapshot?: string;
    customerEmailSnapshot?: string;
    customerPhoneSnapshot?: string;
    giftCardCode?: string;
    giftCardTotal?: number;
  }) {
    assertObjectId(input.cartId, "cart id");

    const { cart, items } = await cartService.getCartSnapshot(input.cartId);

    if (cart.status !== "ACTIVE") {
      throw new AppError("Only active carts can be converted into orders.", 409);
    }

    if (items.length === 0) {
      throw new AppError("Cart is empty.", 400);
    }

    const giftCardTotal = Number(
      Math.min(Math.max(input.giftCardTotal ?? 0, 0), cart.grandTotal).toFixed(2),
    );
    const orderGrandTotal = Number((cart.grandTotal - giftCardTotal).toFixed(2));

    const order = await this.ordersRepository.createOrder({
      customerId: input.customerId,
      orderNo: buildOrderNumber(),
      orderDate: new Date(),
      currencyCode: cart.currencyCode,
      subtotal: cart.subtotal,
      discountTotal: cart.discountTotal,
      shippingFee: cart.shippingFee,
      taxTotal: cart.taxTotal,
      giftCardTotal,
      grandTotal: orderGrandTotal,
      couponCode: input.giftCardCode ?? cart.couponCode,
      customerNameSnapshot: input.customerNameSnapshot,
      customerEmailSnapshot: input.customerEmailSnapshot,
      customerPhoneSnapshot: input.customerPhoneSnapshot,
      shippingAddressId: input.shippingAddressId,
      billingAddressId: input.billingAddressId,
      shippingMethodId: input.shippingMethodId,
      note: input.note,
      placedAt: new Date(),
    });

    const orderItems = [];

    for (const item of items) {
      const product = await catalogService.getProductById(item.productId.toString());
      const variant = await catalogService.getVariantById(item.variantId.toString());

      if (!product || !variant) {
        throw new AppError("Product or variant snapshot source not found.", 404);
      }

      orderItems.push({
        orderId: order.id,
        productId: item.productId,
        variantId: item.variantId,
        productNameSnapshot: product.productName,
        productSlugSnapshot: product.slug,
        skuSnapshot: variant.sku,
        variantLabelSnapshot: variant.variantName,
        thumbnailUrlSnapshot:
          product.images.find((image) => image.isPrimary)?.assetId?.toString() ??
          undefined,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: item.discountAmount,
        taxAmount: item.taxAmount,
        lineTotal: item.lineTotal,
      });
    }

    await this.ordersRepository.createOrderItems(orderItems);

    for (const item of items) {
      await catalogService.confirmVariantSale(item.variantId.toString(), item.quantity);
    }

    await cartService.convertCart(cart.id, order.id);
    await this.ordersRepository.createStatusLog({
      orderId: order.id,
      toStatus: "PENDING",
      note: "Order created from cart.",
      changedAt: new Date(),
    });

    await couponUsageService.recordUsage({
      code: cart.couponCode,
      customerId: input.customerId,
      orderId: order.id,
    });
    await systemEventsService.recordNotification({
      userId: input.customerId,
      type: "ORDER_CREATED",
      title: `Order ${order.orderNo} created`,
      body: "Your order has been placed and is waiting for processing.",
      relatedType: "ORDER",
      relatedId: order.id,
    });
    await systemEventsService.recordAnalyticsEvent({
      eventName: "ORDER_CREATED",
      userId: input.customerId,
      orderId: order.id,
      source: "storefront:checkout",
      metadata: {
        cartId: input.cartId,
        itemCount: items.length,
        couponCode: cart.couponCode || undefined,
        giftCardTotal,
      },
    });

    return {
      order,
      items: await this.ordersRepository.listOrderItems(order.id),
    };
  }

  async createManualOrder(input: {
    customerId?: string;
    customerNameSnapshot?: string;
    customerEmailSnapshot?: string;
    customerPhoneSnapshot?: string;
    shippingMethodId?: string;
    shippingFee?: number;
    discountTotal?: number;
    taxTotal?: number;
    note?: string;
    items: Array<{
      variantId: string;
      quantity: number;
      unitPrice?: number;
    }>;
  }) {
    if (input.customerId) {
      assertObjectId(input.customerId, "customer id");
    }

    if (input.shippingMethodId) {
      assertObjectId(input.shippingMethodId, "shipping method id");
    }

    if (input.items.length === 0) {
      throw new AppError("At least one order line is required.", 400);
    }

    const lines = [] as Array<{
      productId: string;
      variantId: string;
      productName: string;
      productSlug: string;
      sku: string;
      variantLabel: string | undefined;
      thumbnailUrlSnapshot: string | undefined;
      currencyCode: string;
      quantity: number;
      unitPrice: number;
      baseAmount: number;
    }>;

    for (const item of input.items) {
      assertObjectId(item.variantId, "variant id");

      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        throw new AppError("Order line quantity must be greater than zero.", 400);
      }

      const variant = await catalogService.getVariantById(item.variantId);

      if (!variant) {
        throw new AppError("Variant not found.", 404);
      }

      const product = await catalogService.getProductById(variant.productId.toString());

      if (!product) {
        throw new AppError("Product not found.", 404);
      }

      const unitPrice = item.unitPrice ?? variant.unitPrice;

      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new AppError("Unit price must be zero or greater.", 400);
      }

      lines.push({
        productId: product.id,
        variantId: variant.id,
        productName: product.productName,
        productSlug: product.slug,
        sku: variant.sku,
        variantLabel: variant.variantName ?? undefined,
        thumbnailUrlSnapshot:
          product.images.find((image) => image.isPrimary)?.assetId?.toString() ?? undefined,
        currencyCode: variant.currencyCode ?? "MMK",
        quantity: item.quantity,
        unitPrice,
        baseAmount: Number((unitPrice * item.quantity).toFixed(2)),
      });
    }

    const subtotal = Number(
      lines.reduce((sum, item) => sum + item.baseAmount, 0).toFixed(2),
    );
    const discountTotal = Math.min(
      Number(Math.max(input.discountTotal ?? 0, 0).toFixed(2)),
      subtotal,
    );
    const taxTotal = Number(Math.max(input.taxTotal ?? 0, 0).toFixed(2));
    const shippingFee = Number(Math.max(input.shippingFee ?? 0, 0).toFixed(2));
    const grandTotal = Number(
      (subtotal - discountTotal + taxTotal + shippingFee).toFixed(2),
    );
    const currencyCode = lines[0]?.currencyCode ?? "MMK";
    const orderDate = new Date();

    const order = await this.ordersRepository.createOrder({
      customerId: input.customerId,
      orderNo: buildOrderNumber(),
      orderDate,
      currencyCode,
      subtotal,
      discountTotal,
      shippingFee,
      taxTotal,
      grandTotal,
      customerNameSnapshot: input.customerNameSnapshot,
      customerEmailSnapshot: input.customerEmailSnapshot,
      customerPhoneSnapshot: input.customerPhoneSnapshot,
      shippingMethodId: input.shippingMethodId,
      note: input.note,
      placedAt: orderDate,
      status: "PENDING",
      paymentStatus: "UNPAID",
      fulfillmentStatus: "UNFULFILLED",
    });

    await this.ordersRepository.createOrderItems(
      lines.map((item, index) => {
        const discountAmount = this.distributeAmount(discountTotal, lines, index);
        const taxAmount = this.distributeAmount(taxTotal, lines, index);

        return {
          orderId: order.id,
          productId: item.productId,
          variantId: item.variantId,
          productNameSnapshot: item.productName,
          productSlugSnapshot: item.productSlug,
          skuSnapshot: item.sku,
          variantLabelSnapshot: item.variantLabel,
          thumbnailUrlSnapshot: item.thumbnailUrlSnapshot,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount,
          taxAmount,
          lineTotal: Number((item.baseAmount - discountAmount + taxAmount).toFixed(2)),
        };
      }),
    );

    for (const item of lines) {
      await catalogService.confirmVariantSale(item.variantId, item.quantity);
    }

    await this.ordersRepository.createStatusLog({
      orderId: order.id,
      toStatus: "PENDING",
      note: "Manual order created from dashboard.",
      changedAt: orderDate,
    });

    await systemEventsService.recordNotification({
      userId: input.customerId,
      type: "ORDER_CREATED",
      title: `Order ${order.orderNo} created`,
      body: "A staff member created an order for your account.",
      relatedType: "ORDER",
      relatedId: order.id,
    });

    return {
      order,
      items: await this.ordersRepository.listOrderItems(order.id),
    };
  }

  async getOrderById(orderId: string) {
    assertObjectId(orderId, "order id");
    const order = await this.ordersRepository.findOrderById(orderId);

    if (!order) {
      throw new AppError("Order not found.", 404);
    }

    return {
      order,
      items: await this.ordersRepository.listOrderItems(orderId),
    };
  }

  async listOrdersByCustomer(customerId: string) {
    assertObjectId(customerId, "customer id");
    return this.ordersRepository.listOrdersByCustomer(customerId);
  }

  async updateOrderStatus(input: {
    orderId: string;
    toStatus:
      | "PENDING"
      | "AWAITING_PAYMENT"
      | "PAID"
      | "PROCESSING"
      | "SHIPPED"
      | "COMPLETED"
      | "CANCELLED"
      | "REFUNDED";
    changedBy?: string;
    note?: string;
  }) {
    assertObjectId(input.orderId, "order id");
    if (input.changedBy) {
      assertObjectId(input.changedBy, "changed by");
    }

    const order = await this.ordersRepository.findOrderById(input.orderId);

    if (!order) {
      throw new AppError("Order not found.", 404);
    }

    const updatedOrder = await this.ordersRepository.updateOrder(input.orderId, {
      status: input.toStatus,
      completedAt: input.toStatus === "COMPLETED" ? new Date() : order.completedAt,
      cancelledAt: input.toStatus === "CANCELLED" ? new Date() : order.cancelledAt,
    });

    await this.ordersRepository.createStatusLog({
      orderId: input.orderId,
      fromStatus: order.status,
      toStatus: input.toStatus,
      note: input.note,
      changedBy: input.changedBy,
      changedAt: new Date(),
    });

    await systemEventsService.recordNotification({
      userId: order.customerId?.toString?.() ?? String(order.customerId ?? ""),
      type: "ORDER_STATUS_UPDATED",
      title: `Order ${order.orderNo} updated`,
      body: `Order status changed to ${input.toStatus}.`,
      relatedType: "ORDER",
      relatedId: input.orderId,
    });
    if (input.changedBy) {
      await systemEventsService.recordAuditLog({
        actorUserId: input.changedBy,
        action: "ORDER_STATUS_UPDATE",
        entityType: "ORDER",
        entityId: input.orderId,
        beforeData: {
          status: order.status,
        },
        afterData: {
          status: input.toStatus,
        },
      });
    }

    return updatedOrder;
  }

  async addOrderNote(input: {
    orderId: string;
    noteType?: "INTERNAL" | "CUSTOMER_VISIBLE";
    note: string;
    createdBy?: string;
  }) {
    assertObjectId(input.orderId, "order id");
    if (input.createdBy) {
      assertObjectId(input.createdBy, "created by");
    }

    return this.ordersRepository.createOrderNote({
      ...input,
      noteType: input.noteType ?? "INTERNAL",
      createdAt: new Date(),
    });
  }

  async issueInvoice(orderId: string) {
    assertObjectId(orderId, "order id");
    const order = await this.ordersRepository.findOrderById(orderId);

    if (!order) {
      throw new AppError("Order not found.", 404);
    }

    return this.ordersRepository.createInvoice({
      orderId,
      invoiceNo: buildInvoiceNumber(),
      issuedAt: new Date(),
      subtotal: order.subtotal,
      discountTotal: order.discountTotal,
      shippingFee: order.shippingFee,
      taxTotal: order.taxTotal,
      grandTotal: order.grandTotal,
    });
  }
}

export const ordersService = new OrdersService();
