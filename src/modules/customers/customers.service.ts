import { AppError } from "@/lib/errors/app-error";
import { assertObjectId } from "@/lib/utils/object-id";
import { CustomersRepository } from "@/modules/customers/customers.repository";

export class CustomersService {
  constructor(private readonly customersRepository = new CustomersRepository()) {}

  async createCustomerGroup(input: {
    groupName: string;
    description?: string;
    isActive?: boolean;
  }) {
    return this.customersRepository.createCustomerGroup(input);
  }

  async addCustomerGroupMember(input: {
    customerGroupId: string;
    userId: string;
  }) {
    assertObjectId(input.customerGroupId, "customer group id");
    assertObjectId(input.userId, "user id");
    return this.customersRepository.createCustomerGroupMember({
      ...input,
      joinedAt: new Date(),
    });
  }

  async createAddress(input: {
    userId: string;
    label?: string;
    receiverName: string;
    receiverPhone: string;
    countryId: string;
    stateRegionId?: string;
    city?: string;
    township?: string;
    postalCode?: string;
    addressLine1: string;
    addressLine2?: string;
    landmark?: string;
    isDefaultShipping?: boolean;
    isDefaultBilling?: boolean;
  }) {
    assertObjectId(input.userId, "user id");
    assertObjectId(input.countryId, "country id");
    if (input.stateRegionId) {
      assertObjectId(input.stateRegionId, "state region id");
    }

    return this.customersRepository.createAddress(input);
  }

  async listAddresses(userId: string) {
    assertObjectId(userId, "user id");
    return this.customersRepository.listAddressesByUser(userId);
  }

  async addToWishlist(input: { customerId: string; productId: string }) {
    assertObjectId(input.customerId, "customer id");
    assertObjectId(input.productId, "product id");

    const existingWishlist = await this.customersRepository.findWishlistByCustomer(
      input.customerId,
    );
    const wishlist =
      existingWishlist ??
      (await this.customersRepository.createWishlist({
        customerId: input.customerId,
      }));

    return this.customersRepository.createWishlistItem({
      wishlistId: wishlist.id,
      productId: input.productId,
      createdAt: new Date(),
    });
  }

  async listWishlist(customerId: string) {
    assertObjectId(customerId, "customer id");
    const wishlist = await this.customersRepository.findWishlistByCustomer(customerId);

    if (!wishlist) {
      return [];
    }

    return this.customersRepository.listWishlistItems(wishlist.id);
  }

  async trackRecentlyViewed(input: {
    customerId?: string;
    sessionId?: string;
    productId: string;
  }) {
    if (!input.customerId && !input.sessionId) {
      throw new AppError("customerId or sessionId is required.", 400);
    }

    if (input.customerId) {
      assertObjectId(input.customerId, "customer id");
    }

    assertObjectId(input.productId, "product id");

    return this.customersRepository.createRecentlyViewed({
      customerId: input.customerId,
      sessionId: input.sessionId,
      productId: input.productId,
      viewedAt: new Date(),
    });
  }

  async listRecentlyViewed(customerId: string) {
    assertObjectId(customerId, "customer id");
    return this.customersRepository.listRecentlyViewedByCustomer(customerId);
  }

  async saveSearch(input: {
    customerId: string;
    searchQuery: string;
    filtersJson?: string;
  }) {
    assertObjectId(input.customerId, "customer id");
    return this.customersRepository.createSavedSearch({
      ...input,
      createdAt: new Date(),
    });
  }

  async listSavedSearches(customerId: string) {
    assertObjectId(customerId, "customer id");
    return this.customersRepository.listSavedSearches(customerId);
  }
}

export const customersService = new CustomersService();
