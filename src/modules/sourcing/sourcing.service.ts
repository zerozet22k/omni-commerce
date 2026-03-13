import { randomUUID } from "crypto";

import { AppError } from "@/lib/errors/app-error";
import { assertObjectId } from "@/lib/utils/object-id";
import { catalogService } from "@/modules/catalog/catalog.service";
import { SourcingRepository } from "@/modules/sourcing/sourcing.repository";

function buildRestockNumber() {
  return `RST-${Date.now()}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

export class SourcingService {
  constructor(private readonly sourcingRepository = new SourcingRepository()) {}

  async createPlatform(input: { code: string; name: string; isActive?: boolean }) {
    return this.sourcingRepository.createPlatform(input);
  }

  async createSource(input: {
    sourcingPlatformId: string;
    sourceName: string;
    contactName?: string;
    phone?: string;
    email?: string;
    shopUrl?: string;
    note?: string;
    isActive?: boolean;
  }) {
    assertObjectId(input.sourcingPlatformId, "sourcing platform id");
    return this.sourcingRepository.createSource(input);
  }

  async createVariantSource(input: {
    variantId: string;
    sourcingSourceId: string;
    sourceSku?: string;
    sourceProductName?: string;
    sourceProductUrl: string;
    sourcePrice?: number;
    sourceCurrencyCode?: string;
    minOrderQty?: number;
    isPreferred?: boolean;
    isActive?: boolean;
  }) {
    assertObjectId(input.variantId, "variant id");
    assertObjectId(input.sourcingSourceId, "sourcing source id");

    const variant = await catalogService.getVariantById(input.variantId);
    const source = await this.sourcingRepository.findSourceById(
      input.sourcingSourceId,
    );

    if (!variant) {
      throw new AppError("Variant not found.", 404);
    }

    if (!source) {
      throw new AppError("Sourcing source not found.", 404);
    }

    return this.sourcingRepository.createVariantSource(input);
  }

  async createRestockOrder(input: {
    sourcingSourceId: string;
    currencyCode?: string;
    shippingFee?: number;
    extraFee?: number;
    sourceOrderRef?: string;
    trackingNo?: string;
    expectedArrivalAt?: Date;
    note?: string;
    createdBy?: string;
    items: Array<{
      variantId: string;
      variantSourceId?: string;
      sourceSkuSnapshot?: string;
      sourceProductNameSnapshot?: string;
      sourceProductUrlSnapshot?: string;
      orderedQty: number;
      unitCost: number;
      note?: string;
    }>;
  }) {
    assertObjectId(input.sourcingSourceId, "sourcing source id");
    if (input.createdBy) {
      assertObjectId(input.createdBy, "created by");
    }

    const source = await this.sourcingRepository.findSourceById(input.sourcingSourceId);

    if (!source) {
      throw new AppError("Sourcing source not found.", 404);
    }

    let subtotal = 0;

    for (const item of input.items) {
      assertObjectId(item.variantId, "variant id");
      if (item.variantSourceId) {
        assertObjectId(item.variantSourceId, "variant source id");
      }

      const variant = await catalogService.getVariantById(item.variantId);

      if (!variant) {
        throw new AppError("Variant not found.", 404);
      }

      subtotal += item.orderedQty * item.unitCost;
    }

    const shippingFee = input.shippingFee ?? 0;
    const extraFee = input.extraFee ?? 0;
    const order = await this.sourcingRepository.createRestockOrder({
      sourcingSourceId: input.sourcingSourceId,
      restockNo: buildRestockNumber(),
      orderDate: new Date(),
      expectedArrivalAt: input.expectedArrivalAt,
      sourceOrderRef: input.sourceOrderRef,
      trackingNo: input.trackingNo,
      currencyCode: input.currencyCode ?? "CNY",
      subtotal,
      shippingFee,
      extraFee,
      grandTotal: subtotal + shippingFee + extraFee,
      note: input.note,
      createdBy: input.createdBy,
    });

    await this.sourcingRepository.createRestockOrderItems(
      input.items.map((item) => ({
        restockOrderId: order.id,
        variantId: item.variantId,
        variantSourceId: item.variantSourceId,
        sourceSkuSnapshot: item.sourceSkuSnapshot,
        sourceProductNameSnapshot: item.sourceProductNameSnapshot,
        sourceProductUrlSnapshot: item.sourceProductUrlSnapshot,
        orderedQty: item.orderedQty,
        unitCost: item.unitCost,
        lineTotal: item.orderedQty * item.unitCost,
        note: item.note,
      })),
    );

    return {
      order,
      items: await this.sourcingRepository.listRestockOrderItems(order.id),
    };
  }

  async receiveRestockOrder(input: {
    restockOrderId: string;
    receivedItems: Array<{
      restockOrderItemId: string;
      receivedQty: number;
      rejectedQty?: number;
    }>;
    createdBy?: string;
  }) {
    assertObjectId(input.restockOrderId, "restock order id");
    if (input.createdBy) {
      assertObjectId(input.createdBy, "created by");
    }

    const order = await this.sourcingRepository.findRestockOrderById(
      input.restockOrderId,
    );

    if (!order) {
      throw new AppError("Restock order not found.", 404);
    }

    let totalReceived = 0;
    const orderItems = await this.sourcingRepository.listRestockOrderItems(order.id);

    for (const item of input.receivedItems) {
      assertObjectId(item.restockOrderItemId, "restock order item id");
      const orderItem = orderItems.find(
        (candidate) => candidate.id === item.restockOrderItemId,
      );

      if (!orderItem) {
        throw new AppError("Restock order item not found.", 404);
      }

      const receivedQty = item.receivedQty;
      const rejectedQty = item.rejectedQty ?? 0;

      if (receivedQty > 0) {
        await catalogService.receiveVariantStock(
          orderItem.variantId.toString(),
          receivedQty,
        );
        await this.sourcingRepository.createStockAdjustment({
          variantId: orderItem.variantId,
          restockOrderId: order.id,
          adjustmentType: "RESTOCK_IN",
          quantity: receivedQty,
          note: "Restock received.",
          createdBy: input.createdBy,
          createdAt: new Date(),
        });
      }

      totalReceived += receivedQty;

      await this.sourcingRepository.updateRestockOrderItem(orderItem.id, {
        receivedQty: orderItem.receivedQty + receivedQty,
        rejectedQty: orderItem.rejectedQty + rejectedQty,
      });
    }

    const refreshedItems = await this.sourcingRepository.listRestockOrderItems(order.id);
    const isFullyReceived = refreshedItems.every(
      (item) => item.receivedQty + item.rejectedQty >= item.orderedQty,
    );

    const updatedOrder = await this.sourcingRepository.updateRestockOrder(order.id, {
      status: isFullyReceived ? "RECEIVED" : "PARTIALLY_RECEIVED",
      receivedAt: totalReceived > 0 ? new Date() : order.receivedAt,
    });

    return {
      order: updatedOrder,
      items: refreshedItems,
    };
  }

  async createManualStockAdjustment(input: {
    variantId: string;
    quantity: number;
    adjustmentType:
      | "MANUAL_ADD"
      | "MANUAL_DEDUCT"
      | "DAMAGE"
      | "RETURN_IN"
      | "CORRECTION";
    note?: string;
    createdBy?: string;
  }) {
    assertObjectId(input.variantId, "variant id");
    if (input.createdBy) {
      assertObjectId(input.createdBy, "created by");
    }

    if (input.quantity === 0) {
      throw new AppError("Quantity must be non-zero.", 400);
    }

    if (input.adjustmentType === "MANUAL_ADD" || input.adjustmentType === "RETURN_IN") {
      await catalogService.receiveVariantStock(input.variantId, Math.abs(input.quantity));
    } else {
      await catalogService.confirmVariantSale(input.variantId, Math.abs(input.quantity));
    }

    return this.sourcingRepository.createStockAdjustment({
      variantId: input.variantId,
      adjustmentType: input.adjustmentType,
      quantity: input.quantity,
      note: input.note,
      createdBy: input.createdBy,
      createdAt: new Date(),
    });
  }
}

export const sourcingService = new SourcingService();
