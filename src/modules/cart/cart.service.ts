import { AppError } from "@/lib/errors/app-error";
import { assertObjectId } from "@/lib/utils/object-id";
import { CartRepository } from "@/modules/cart/cart.repository";
import { catalogService } from "@/modules/catalog/catalog.service";

export class CartService {
  constructor(private readonly cartRepository = new CartRepository()) {}

  async resolveActiveCart(input: {
    customerId?: string;
    sessionId?: string;
    currencyCode?: string;
  }) {
    if (!input.customerId && !input.sessionId) {
      throw new AppError("customerId or sessionId is required.", 400);
    }

    if (input.customerId) {
      assertObjectId(input.customerId, "customer id");
    }

    const existingCart = input.customerId
      ? await this.cartRepository.findActiveCartByCustomer(input.customerId)
      : await this.cartRepository.findActiveCartBySession(input.sessionId!);

    if (existingCart) {
      return existingCart;
    }

    return this.cartRepository.createCart({
      customerId: input.customerId,
      sessionId: input.sessionId,
      currencyCode: input.currencyCode ?? "MMK",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    });
  }

  async getCartSnapshot(cartId: string) {
    assertObjectId(cartId, "cart id");
    const cart = await this.cartRepository.findCartById(cartId);

    if (!cart) {
      throw new AppError("Cart not found.", 404);
    }

    const items = await this.cartRepository.listCartItems(cartId);

    return { cart, items };
  }

  async addItem(input: {
    customerId?: string;
    sessionId?: string;
    productId?: string;
    variantId: string;
    quantity: number;
  }) {
    if (input.quantity <= 0) {
      throw new AppError("Quantity must be greater than zero.", 400);
    }

    assertObjectId(input.variantId, "variant id");
    const variant = await catalogService.getVariantById(input.variantId);

    if (!variant) {
      throw new AppError("Variant not found.", 404);
    }

    const cart = await this.resolveActiveCart({
      customerId: input.customerId,
      sessionId: input.sessionId,
      currencyCode: variant.currencyCode,
    });

    const existingItem = await this.cartRepository.findCartItem(
      cart.id,
      input.variantId,
    );

    const nextQuantity = (existingItem?.quantity ?? 0) + input.quantity;

    if (nextQuantity <= 0) {
      throw new AppError("Quantity must be greater than zero.", 400);
    }

    await this.syncReservation(cart.id, input.variantId, nextQuantity);

    if (existingItem) {
      await this.cartRepository.updateCartItem(existingItem.id, {
        quantity: nextQuantity,
        unitPrice: variant.unitPrice,
        lineTotal: variant.unitPrice * nextQuantity,
      });
    } else {
      await this.cartRepository.createCartItem({
        cartId: cart.id,
        productId: input.productId ?? variant.productId.toString(),
        variantId: input.variantId,
        quantity: nextQuantity,
        unitPrice: variant.unitPrice,
        lineTotal: variant.unitPrice * nextQuantity,
      });
    }

    return this.recalculateCart(cart.id);
  }

  async updateItemQuantity(cartId: string, variantId: string, quantity: number) {
    assertObjectId(cartId, "cart id");
    assertObjectId(variantId, "variant id");

    const existingItem = await this.cartRepository.findCartItem(cartId, variantId);

    if (!existingItem) {
      throw new AppError("Cart item not found.", 404);
    }

    if (quantity <= 0) {
      await this.removeItem(cartId, variantId);
      return this.getCartSnapshot(cartId);
    }

    const variant = await catalogService.getVariantById(variantId);

    if (!variant) {
      throw new AppError("Variant not found.", 404);
    }

    await this.syncReservation(cartId, variantId, quantity);
    await this.cartRepository.updateCartItem(existingItem.id, {
      quantity,
      unitPrice: variant.unitPrice,
      lineTotal: variant.unitPrice * quantity,
    });

    return this.recalculateCart(cartId);
  }

  async removeItem(cartId: string, variantId: string) {
    assertObjectId(cartId, "cart id");
    assertObjectId(variantId, "variant id");
    const existingItem = await this.cartRepository.findCartItem(cartId, variantId);

    if (!existingItem) {
      return this.getCartSnapshot(cartId);
    }

    await this.syncReservation(cartId, variantId, 0);
    await this.cartRepository.deleteCartItem(existingItem.id);

    return this.recalculateCart(cartId);
  }

  async releaseCartReservations(cartId: string) {
    assertObjectId(cartId, "cart id");
    const reservations = await this.cartRepository.listReservationsByCart(cartId);

    for (const reservation of reservations.filter(
      (item) => item.status === "ACTIVE" && item.quantity > 0,
    )) {
      await catalogService.releaseVariantStock(
        reservation.variantId.toString(),
        reservation.quantity,
      );
      await this.cartRepository.updateReservation(reservation.id, {
        status: "RELEASED",
        expiresAt: new Date(),
      });
    }

    return this.recalculateCart(cartId);
  }

  async convertCart(cartId: string, orderId: string) {
    assertObjectId(cartId, "cart id");
    assertObjectId(orderId, "order id");

    await this.cartRepository.updateReservationStatusesByCart(cartId, "CONVERTED", {
      orderId,
      expiresAt: new Date(),
    });

    return this.cartRepository.updateCart(cartId, {
      status: "CONVERTED",
    });
  }

  async markCartExpired(cartId: string) {
    assertObjectId(cartId, "cart id");
    await this.releaseCartReservations(cartId);
    return this.cartRepository.updateCart(cartId, {
      status: "EXPIRED",
      expiresAt: new Date(),
    });
  }

  private async syncReservation(
    cartId: string,
    variantId: string,
    nextQuantity: number,
  ) {
    const existingReservation = await this.cartRepository.findActiveReservation(
      cartId,
      variantId,
    );

    const currentQuantity = existingReservation?.quantity ?? 0;
    const delta = nextQuantity - currentQuantity;

    if (delta > 0) {
      await catalogService.reserveVariantStock(variantId, delta);
    }

    if (delta < 0) {
      await catalogService.releaseVariantStock(variantId, Math.abs(delta));
    }

    if (!existingReservation && nextQuantity > 0) {
      await this.cartRepository.createReservation({
        cartId,
        variantId,
        quantity: nextQuantity,
        status: "ACTIVE",
        expiresAt: new Date(Date.now() + 1000 * 60 * 30),
      });
      return;
    }

    if (existingReservation) {
      await this.cartRepository.updateReservation(existingReservation.id, {
        quantity: nextQuantity,
        status: nextQuantity > 0 ? "ACTIVE" : "RELEASED",
        expiresAt:
          nextQuantity > 0
            ? new Date(Date.now() + 1000 * 60 * 30)
            : new Date(),
      });
    }
  }

  private async recalculateCart(cartId: string) {
    const cart = await this.cartRepository.findCartById(cartId);

    if (!cart) {
      throw new AppError("Cart not found.", 404);
    }

    const items = await this.cartRepository.listCartItems(cartId);
    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const discountTotal = items.reduce((sum, item) => sum + item.discountAmount, 0);
    const taxTotal = items.reduce((sum, item) => sum + item.taxAmount, 0);
    const grandTotal = subtotal - discountTotal + taxTotal + cart.shippingFee;

    const updatedCart = await this.cartRepository.updateCart(cartId, {
      subtotal,
      discountTotal,
      taxTotal,
      grandTotal,
    });

    return {
      cart: updatedCart,
      items,
    };
  }
}

export const cartService = new CartService();
