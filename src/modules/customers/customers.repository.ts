import { connectToDatabase } from "@/lib/db/mongodb";
import {
  AddressModel,
  CustomerGroupMemberModel,
  CustomerGroupModel,
  RecentlyViewedProductModel,
  SavedSearchModel,
  WishlistItemModel,
  WishlistModel,
  type AddressDocument,
  type WishlistDocument,
  type WishlistItemDocument,
} from "@/modules/customers/customers.models";

export class CustomersRepository {
  async createCustomerGroup(input: Record<string, unknown>) {
    await connectToDatabase();
    return CustomerGroupModel.create(input);
  }

  async createCustomerGroupMember(input: Record<string, unknown>) {
    await connectToDatabase();
    return CustomerGroupMemberModel.create(input);
  }

  async createAddress(input: Record<string, unknown>) {
    await connectToDatabase();
    return AddressModel.create(input);
  }

  async listAddressesByUser(userId: string): Promise<AddressDocument[]> {
    await connectToDatabase();
    return AddressModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  async findWishlistByCustomer(customerId: string): Promise<WishlistDocument | null> {
    await connectToDatabase();
    return WishlistModel.findOne({ customerId }).exec();
  }

  async createWishlist(input: Record<string, unknown>) {
    await connectToDatabase();
    return WishlistModel.create(input);
  }

  async createWishlistItem(input: Record<string, unknown>) {
    await connectToDatabase();
    return WishlistItemModel.create(input);
  }

  async listWishlistItems(wishlistId: string): Promise<WishlistItemDocument[]> {
    await connectToDatabase();
    return WishlistItemModel.find({ wishlistId }).sort({ createdAt: -1 }).exec();
  }

  async createRecentlyViewed(input: Record<string, unknown>) {
    await connectToDatabase();
    return RecentlyViewedProductModel.create(input);
  }

  async listRecentlyViewedByCustomer(customerId: string) {
    await connectToDatabase();
    return RecentlyViewedProductModel.find({ customerId })
      .sort({ viewedAt: -1 })
      .limit(20)
      .exec();
  }

  async createSavedSearch(input: Record<string, unknown>) {
    await connectToDatabase();
    return SavedSearchModel.create(input);
  }

  async listSavedSearches(customerId: string) {
    await connectToDatabase();
    return SavedSearchModel.find({ customerId }).sort({ createdAt: -1 }).exec();
  }
}
