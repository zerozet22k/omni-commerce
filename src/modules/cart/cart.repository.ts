import { connectToDatabase } from "@/lib/db/mongodb";
import {
  CartItemModel,
  CartModel,
  StockReservationModel,
  type CartDocument,
  type CartItemDocument,
  type StockReservationDocument,
} from "@/modules/cart/cart.models";

export class CartRepository {
  async findActiveCartByCustomer(
    customerId: string,
  ): Promise<CartDocument | null> {
    await connectToDatabase();
    return CartModel.findOne({ customerId, status: "ACTIVE" })
      .sort({ updatedAt: -1 })
      .exec();
  }

  async findActiveCartBySession(
    sessionId: string,
  ): Promise<CartDocument | null> {
    await connectToDatabase();
    return CartModel.findOne({ sessionId, status: "ACTIVE" })
      .sort({ updatedAt: -1 })
      .exec();
  }

  async findCartById(cartId: string): Promise<CartDocument | null> {
    await connectToDatabase();
    return CartModel.findById(cartId).exec();
  }

  async createCart(input: Record<string, unknown>) {
    await connectToDatabase();
    return CartModel.create(input);
  }

  async updateCart(cartId: string, update: Record<string, unknown>) {
    await connectToDatabase();
    return CartModel.findByIdAndUpdate(cartId, update, { new: true }).exec();
  }

  async listCartItems(cartId: string): Promise<CartItemDocument[]> {
    await connectToDatabase();
    return CartItemModel.find({ cartId }).exec();
  }

  async findCartItem(
    cartId: string,
    variantId: string,
  ): Promise<CartItemDocument | null> {
    await connectToDatabase();
    return CartItemModel.findOne({ cartId, variantId }).exec();
  }

  async createCartItem(input: Record<string, unknown>) {
    await connectToDatabase();
    return CartItemModel.create(input);
  }

  async updateCartItem(cartItemId: string, update: Record<string, unknown>) {
    await connectToDatabase();
    return CartItemModel.findByIdAndUpdate(cartItemId, update, {
      new: true,
    }).exec();
  }

  async deleteCartItem(cartItemId: string) {
    await connectToDatabase();
    return CartItemModel.findByIdAndDelete(cartItemId).exec();
  }

  async findActiveReservation(
    cartId: string,
    variantId: string,
  ): Promise<StockReservationDocument | null> {
    await connectToDatabase();
    return StockReservationModel.findOne({ cartId, variantId, status: "ACTIVE" })
      .sort({ createdAt: -1 })
      .exec();
  }

  async listReservationsByCart(
    cartId: string,
  ): Promise<StockReservationDocument[]> {
    await connectToDatabase();
    return StockReservationModel.find({ cartId }).exec();
  }

  async createReservation(input: Record<string, unknown>) {
    await connectToDatabase();
    return StockReservationModel.create(input);
  }

  async updateReservation(
    reservationId: string,
    update: Record<string, unknown>,
  ) {
    await connectToDatabase();
    return StockReservationModel.findByIdAndUpdate(reservationId, update, {
      new: true,
    }).exec();
  }

  async updateReservationStatusesByCart(
    cartId: string,
    status: "ACTIVE" | "RELEASED" | "CONVERTED" | "EXPIRED",
    extraUpdate: Record<string, unknown> = {},
  ) {
    await connectToDatabase();
    return StockReservationModel.updateMany(
      { cartId, status: "ACTIVE" },
      { status, ...extraUpdate },
    ).exec();
  }
}
