import { hash } from "bcryptjs";

import {
  ModelCrudService,
  type CrudListOptions,
  type CrudServiceContract,
} from "@/lib/crud/model-crud.service";
import { AppError } from "@/lib/errors/app-error";
import { assertObjectId } from "@/lib/utils/object-id";
import {
  adminCrudRepositories,
  type AdminCrudResource,
} from "@/modules/admin/admin-crud.repositories";

function createCrudService(
  entityName: string,
  resource: Exclude<AdminCrudResource, "users">,
  defaultSort?: Record<string, 1 | -1>,
) {
  return new ModelCrudService(
    entityName,
    adminCrudRepositories[resource],
    defaultSort,
  );
}

function sanitizeUser(document: unknown) {
  if (
    !document ||
    typeof document !== "object" ||
    !("toObject" in document) ||
    typeof document.toObject !== "function"
  ) {
    return document;
  }

  const sanitizedDocument = document.toObject() as Record<string, unknown>;
  delete sanitizedDocument.passwordHash;
  return sanitizedDocument;
}

function getDocumentId(document: unknown) {
  if (
    !document ||
    typeof document !== "object" ||
    !("_id" in document) ||
    !document._id
  ) {
    throw new AppError("Document id is missing.", 500);
  }

  return String(document._id);
}

function getUserRole(document: unknown) {
  if (
    document &&
    typeof document === "object" &&
    "role" in document &&
    typeof document.role === "string"
  ) {
    return document.role;
  }

  return null;
}

class UserAdminCrudService implements CrudServiceContract {
  private readonly userRepository = adminCrudRepositories.users;

  private async normalizePayload(
    payload: Record<string, unknown>,
    options: { requirePassword: boolean },
  ) {
    if ("passwordHash" in payload) {
      throw new AppError("Use password instead of passwordHash.", 400);
    }

    const nextPayload = { ...payload };
    const password =
      typeof nextPayload.password === "string" ? nextPayload.password : undefined;

    delete nextPayload.password;

    if (options.requirePassword && !password) {
      throw new AppError("Password is required.", 400);
    }

    if (password) {
      if (password.length < 8) {
        throw new AppError("Password must be at least 8 characters long.", 400);
      }

      nextPayload.passwordHash = await hash(password, 12);
    }

    if (options.requirePassword && !nextPayload.registrationDate) {
      nextPayload.registrationDate = new Date();
    }

    return nextPayload;
  }

  private async ensureCustomerProfile(userId: string) {
    const existingProfiles = await adminCrudRepositories.customer_profiles.list({
      userId,
    });

    if (existingProfiles.length === 0) {
      await adminCrudRepositories.customer_profiles.create({ userId });
    }
  }

  async list(
    filter: Record<string, unknown> = {},
    options: CrudListOptions = {},
  ) {
    const users = await this.userRepository.list(filter, {
      sort: options.sort ?? { createdAt: -1 },
      limit: options.limit,
      skip:
        typeof options.skip === "number"
          ? options.skip
          : typeof options.page === "number" &&
              typeof options.limit === "number" &&
              options.page > 0 &&
              options.limit > 0
            ? (options.page - 1) * options.limit
            : undefined,
    });
    return users.map((user) => sanitizeUser(user));
  }

  async count(filter: Record<string, unknown> = {}) {
    return this.userRepository.count(filter);
  }

  async get(id: string) {
    assertObjectId(id, "user id");
    const user = await this.userRepository.getById(id);

    if (!user) {
      throw new AppError("User not found.", 404);
    }

    return sanitizeUser(user);
  }

  async create(payload: Record<string, unknown>) {
    const nextPayload = await this.normalizePayload(payload, {
      requirePassword: true,
    });
    const createdUser = await this.userRepository.create(nextPayload);

    if (getUserRole(createdUser) === "CUSTOMER") {
      await this.ensureCustomerProfile(getDocumentId(createdUser));
    }

    return sanitizeUser(createdUser);
  }

  async update(id: string, payload: Record<string, unknown>) {
    assertObjectId(id, "user id");
    const nextPayload = await this.normalizePayload(payload, {
      requirePassword: false,
    });
    const updatedUser = await this.userRepository.update(id, nextPayload);

    if (!updatedUser) {
      throw new AppError("User not found.", 404);
    }

    if (getUserRole(updatedUser) === "CUSTOMER") {
      await this.ensureCustomerProfile(getDocumentId(updatedUser));
    }

    return sanitizeUser(updatedUser);
  }

  async remove(id: string) {
    assertObjectId(id, "user id");
    const removedUser = await this.userRepository.remove(id);

    if (!removedUser) {
      throw new AppError("User not found.", 404);
    }

    const customerProfiles = await adminCrudRepositories.customer_profiles.list({
      userId: id,
    });

    await Promise.all(
      customerProfiles.map((customerProfile) => {
        const profileId =
          customerProfile && typeof customerProfile === "object" && "_id" in customerProfile
            ? String(customerProfile._id)
            : "";

        if (!profileId) {
          return Promise.resolve();
        }

        return adminCrudRepositories.customer_profiles.remove(profileId);
      }),
    );

    return sanitizeUser(removedUser);
  }
}

export const adminCrudServices = {
  countries: createCrudService("Country", "countries", { countryName: 1 }),
  states_regions: createCrudService("State region", "states_regions", {
    stateRegionName: 1,
  }),
  store_settings: createCrudService("Store setting", "store_settings", {
    createdAt: -1,
  }),
  media_assets: createCrudService("Media asset", "media_assets", {
    createdAt: -1,
  }),

  categories: createCrudService("Category", "categories", {
    sortOrder: 1,
    categoryName: 1,
  }),
  brands: createCrudService("Brand", "brands", { brandName: 1 }),
  collections: createCrudService("Collection", "collections", {
    sortOrder: 1,
    collectionName: 1,
  }),
  product_types: createCrudService("Product type", "product_types", {
    name: 1,
  }),
  product_tags: createCrudService("Product tag", "product_tags", {
    tagName: 1,
  }),
  product_badges: createCrudService("Product badge", "product_badges", {
    badgeName: 1,
  }),
  tax_classes: createCrudService("Tax class", "tax_classes", {
    taxClassName: 1,
  }),
  products: createCrudService("Product", "products", { createdAt: -1 }),
  product_specifications: createCrudService(
    "Product specification",
    "product_specifications",
    { sortOrder: 1 },
  ),
  product_faqs: createCrudService("Product FAQ", "product_faqs", {
    sortOrder: 1,
  }),
  product_tag_maps: createCrudService("Product tag map", "product_tag_maps"),
  product_collection_maps: createCrudService(
    "Product collection map",
    "product_collection_maps",
  ),
  product_badge_maps: createCrudService(
    "Product badge map",
    "product_badge_maps",
  ),
  product_relations: createCrudService("Product relation", "product_relations", {
    sortOrder: 1,
  }),
  product_images: createCrudService("Product image", "product_images", {
    sortOrder: 1,
  }),
  option_types: createCrudService("Option type", "option_types", {
    optionName: 1,
  }),
  option_values: createCrudService("Option value", "option_values", {
    sortOrder: 1,
    valueName: 1,
  }),
  products_option_types: createCrudService(
    "Product option type",
    "products_option_types",
  ),
  product_variants: createCrudService("Product variant", "product_variants", {
    createdAt: -1,
  }),
  variant_option_values: createCrudService(
    "Variant option value",
    "variant_option_values",
  ),
  variant_images: createCrudService("Variant image", "variant_images", {
    sortOrder: 1,
  }),
  product_bundle_items: createCrudService(
    "Product bundle item",
    "product_bundle_items",
    { sortOrder: 1 },
  ),

  sourcing_platforms: createCrudService(
    "Sourcing platform",
    "sourcing_platforms",
    { name: 1 },
  ),
  sourcing_sources: createCrudService("Sourcing source", "sourcing_sources", {
    sourceName: 1,
  }),
  variant_sources: createCrudService("Variant source", "variant_sources", {
    createdAt: -1,
  }),
  restock_orders: createCrudService("Restock order", "restock_orders", {
    createdAt: -1,
  }),
  restock_order_items: createCrudService(
    "Restock order item",
    "restock_order_items",
  ),
  stock_adjustments: createCrudService(
    "Stock adjustment",
    "stock_adjustments",
    { createdAt: -1 },
  ),

  users: new UserAdminCrudService(),
  customer_profiles: createCrudService("Customer profile", "customer_profiles", {
    createdAt: -1,
  }),
  customer_groups: createCrudService("Customer group", "customer_groups", {
    groupName: 1,
  }),
  customer_group_members: createCrudService(
    "Customer group member",
    "customer_group_members",
    { joinedAt: -1 },
  ),
  addresses: createCrudService("Address", "addresses", { createdAt: -1 }),
  wishlists: createCrudService("Wishlist", "wishlists", { createdAt: -1 }),
  wishlist_items: createCrudService("Wishlist item", "wishlist_items", {
    createdAt: -1,
  }),
  recently_viewed_products: createCrudService(
    "Recently viewed product",
    "recently_viewed_products",
    { viewedAt: -1 },
  ),
  saved_searches: createCrudService("Saved search", "saved_searches", {
    createdAt: -1,
  }),

  carts: createCrudService("Cart", "carts", { updatedAt: -1 }),
  cart_items: createCrudService("Cart item", "cart_items"),
  stock_reservations: createCrudService(
    "Stock reservation",
    "stock_reservations",
    { createdAt: -1 },
  ),
  checkout_sessions: createCrudService(
    "Checkout session",
    "checkout_sessions",
    { createdAt: -1 },
  ),

  tax_rates: createCrudService("Tax rate", "tax_rates", {
    priority: 1,
    rateName: 1,
  }),
  shipping_zones: createCrudService("Shipping zone", "shipping_zones", {
    zoneName: 1,
  }),
  shipping_zone_countries: createCrudService(
    "Shipping zone country",
    "shipping_zone_countries",
  ),
  shipping_methods: createCrudService("Shipping method", "shipping_methods", {
    methodName: 1,
  }),
  shipping_rate_rules: createCrudService(
    "Shipping rate rule",
    "shipping_rate_rules",
  ),
  promotions: createCrudService("Promotion", "promotions", {
    startsAt: -1,
    name: 1,
  }),
  promotion_products: createCrudService(
    "Promotion product",
    "promotion_products",
  ),
  promotion_variants: createCrudService(
    "Promotion variant",
    "promotion_variants",
  ),
  promotion_customer_groups: createCrudService(
    "Promotion customer group",
    "promotion_customer_groups",
  ),
  coupon_usage_logs: createCrudService(
    "Coupon usage log",
    "coupon_usage_logs",
    { usedAt: -1 },
  ),
  gift_cards: createCrudService("Gift card", "gift_cards", { createdAt: -1 }),
  gift_card_transactions: createCrudService(
    "Gift card transaction",
    "gift_card_transactions",
    { createdAt: -1 },
  ),

  orders: createCrudService("Order", "orders", { orderDate: -1 }),
  order_items: createCrudService("Order item", "order_items"),
  order_status_logs: createCrudService("Order status log", "order_status_logs", {
    changedAt: -1,
  }),
  order_notes: createCrudService("Order note", "order_notes", {
    createdAt: -1,
  }),
  invoices: createCrudService("Invoice", "invoices", { issuedAt: -1 }),

  payment_methods: createCrudService("Payment method", "payment_methods", {
    methodName: 1,
  }),
  payments: createCrudService("Payment", "payments", { paymentDate: -1 }),
  payment_transactions: createCrudService(
    "Payment transaction",
    "payment_transactions",
    { createdAt: -1 },
  ),

  shipments: createCrudService("Shipment", "shipments", { shippedAt: -1 }),
  shipment_items: createCrudService("Shipment item", "shipment_items"),
  shipment_packages: createCrudService(
    "Shipment package",
    "shipment_packages",
    { packageNo: 1 },
  ),
  shipment_tracking_events: createCrudService(
    "Shipment tracking event",
    "shipment_tracking_events",
    { eventAt: -1 },
  ),

  reviews: createCrudService("Review", "reviews", { createdAt: -1 }),
  review_media: createCrudService("Review media", "review_media"),
  returns: createCrudService("Return", "returns", { requestedAt: -1 }),
  return_items: createCrudService("Return item", "return_items"),
  refunds: createCrudService("Refund", "refunds", { createdAt: -1 }),

  pages: createCrudService("Page", "pages", { createdAt: -1 }),
  banners: createCrudService("Banner", "banners", {
    sortOrder: 1,
    bannerName: 1,
  }),
  navigation_menus: createCrudService("Navigation menu", "navigation_menus", {
    menuName: 1,
  }),
  navigation_menu_items: createCrudService(
    "Navigation menu item",
    "navigation_menu_items",
    { sortOrder: 1, label: 1 },
  ),
  notifications: createCrudService("Notification", "notifications", {
    sentAt: -1,
  }),
  analytics_events: createCrudService("Analytics event", "analytics_events", {
    createdAt: -1,
  }),
  audit_logs: createCrudService("Audit log", "audit_logs", {
    createdAt: -1,
  }),
} satisfies Record<AdminCrudResource, CrudServiceContract>;

export function getAdminCrudService(resource: string) {
  if (!(resource in adminCrudServices)) {
    return null;
  }

  return adminCrudServices[resource as AdminCrudResource];
}
