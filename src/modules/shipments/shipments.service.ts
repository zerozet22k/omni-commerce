import { AppError } from "@/lib/errors/app-error";
import { assertObjectId } from "@/lib/utils/object-id";
import { systemEventsService } from "@/modules/content/system-events.service";
import { OrdersRepository } from "@/modules/orders/orders.repository";
import { ShipmentsRepository } from "@/modules/shipments/shipments.repository";

export class ShipmentsService {
  constructor(
    private readonly shipmentsRepository = new ShipmentsRepository(),
    private readonly ordersRepository = new OrdersRepository(),
  ) {}

  async createShipment(input: {
    orderId: string;
    shippingMethodId?: string;
    courierName?: string;
    trackingNo?: string;
    shippingFee?: number;
    note?: string;
    items: Array<{
      orderItemId: string;
      quantity: number;
    }>;
  }) {
    assertObjectId(input.orderId, "order id");
    if (input.shippingMethodId) {
      assertObjectId(input.shippingMethodId, "shipping method id");
    }

    for (const item of input.items) {
      assertObjectId(item.orderItemId, "order item id");
    }

    const order = await this.ordersRepository.findOrderById(input.orderId);

    if (!order) {
      throw new AppError("Order not found.", 404);
    }

    const shipment = await this.shipmentsRepository.createShipment({
      orderId: input.orderId,
      shippingMethodId: input.shippingMethodId,
      courierName: input.courierName,
      trackingNo: input.trackingNo,
      shippingFee: input.shippingFee ?? order.shippingFee,
      note: input.note,
      status: "PACKING",
      shippedAt: new Date(),
    });

    if (input.items.length > 0) {
      await this.shipmentsRepository.createShipmentItems(
        input.items.map((item) => ({
          shipmentId: shipment.id,
          orderItemId: item.orderItemId,
          quantity: item.quantity,
        })),
      );
    }

    await this.ordersRepository.updateOrder(input.orderId, {
      fulfillmentStatus: "PACKING",
      status: order.status === "PAID" ? "PROCESSING" : order.status,
    });

    await systemEventsService.recordNotification({
      userId: order.customerId?.toString?.() ?? String(order.customerId ?? ""),
      type: "SHIPMENT_UPDATED",
      title: `Shipment started for ${order.orderNo}`,
      body: "Your order is now being packed for delivery.",
      relatedType: "SHIPMENT",
      relatedId: shipment.id,
    });

    return shipment;
  }

  async createShipmentPackage(input: {
    shipmentId: string;
    packageNo?: string;
    weightGrams?: number;
    lengthCm?: number;
    widthCm?: number;
    heightCm?: number;
    labelAssetId?: string;
  }) {
    assertObjectId(input.shipmentId, "shipment id");
    if (input.labelAssetId) {
      assertObjectId(input.labelAssetId, "label asset id");
    }

    const shipment = await this.shipmentsRepository.findShipmentById(input.shipmentId);

    if (!shipment) {
      throw new AppError("Shipment not found.", 404);
    }

    return this.shipmentsRepository.createShipmentPackage(input);
  }

  async addTrackingEvent(input: {
    shipmentId: string;
    status: "PICKED_UP" | "IN_TRANSIT" | "OUT_FOR_DELIVERY" | "DELIVERED";
    location?: string;
    message?: string;
    eventAt?: Date;
  }) {
    assertObjectId(input.shipmentId, "shipment id");
    const shipment = await this.shipmentsRepository.findShipmentById(input.shipmentId);

    if (!shipment) {
      throw new AppError("Shipment not found.", 404);
    }

    const event = await this.shipmentsRepository.createTrackingEvent({
      ...input,
      eventAt: input.eventAt ?? new Date(),
    });

    const nextShipmentStatus =
      input.status === "DELIVERED" ? "DELIVERED" : "OUT_FOR_DELIVERY";

    await this.shipmentsRepository.updateShipment(input.shipmentId, {
      status: nextShipmentStatus,
      deliveredAt: input.status === "DELIVERED" ? new Date() : shipment.deliveredAt,
    });

    await this.ordersRepository.updateOrder(shipment.orderId.toString(), {
      fulfillmentStatus:
        input.status === "DELIVERED" ? "DELIVERED" : "SHIPPED",
      status: input.status === "DELIVERED" ? "COMPLETED" : "SHIPPED",
      completedAt: input.status === "DELIVERED" ? new Date() : undefined,
    });

    const order = await this.ordersRepository.findOrderById(shipment.orderId.toString());
    await systemEventsService.recordNotification({
      userId: order?.customerId?.toString?.() ?? String(order?.customerId ?? ""),
      type: "SHIPMENT_UPDATED",
      title: order ? `Shipment update for ${order.orderNo}` : "Shipment updated",
      body:
        input.status === "DELIVERED"
          ? "Your shipment was delivered."
          : `Shipment status changed to ${input.status}.`,
      relatedType: "SHIPMENT",
      relatedId: shipment.id,
    });

    return event;
  }
}

export const shipmentsService = new ShipmentsService();
