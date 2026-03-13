import { countDashboardNavigationItems, getDashboardNavigation } from "@/lib/auth/navigation";
import type { UserRole } from "@/lib/auth/permissions";
import { connectToDatabase } from "@/lib/db/mongodb";
import { ProductVariantModel, ProductModel, BrandModel, CategoryModel } from "@/modules/catalog/catalog.models";
import { CollectionModel } from "@/modules/catalog/catalog-extra.models";
import {
  BannerModel,
  NavigationMenuModel,
  NotificationModel,
  PageModel,
} from "@/modules/content/content.models";
import { StoreSettingsModel } from "@/modules/core/core.models";
import {
  AddressModel,
  CustomerGroupModel,
  RecentlyViewedProductModel,
  SavedSearchModel,
  WishlistItemModel,
} from "@/modules/customers/customers.models";
import {
  ReturnModel,
} from "@/modules/engagement/engagement.models";
import { OrderModel } from "@/modules/orders/orders.models";
import { PaymentMethodModel, PaymentModel } from "@/modules/payments/payments.models";
import { PromotionModel, ShippingMethodModel } from "@/modules/pricing/pricing.models";
import { ShipmentModel } from "@/modules/shipments/shipments.models";
import { RestockOrderModel, SourcingSourceModel } from "@/modules/sourcing/sourcing.models";
import type { SessionUser } from "@/modules/users/auth.service";
import { CustomerProfileModel } from "@/modules/users/customer-profile.model";
import { UserModel } from "@/modules/users/user.model";

type DashboardMetric = {
  label: string;
  value: number;
  hint: string;
  tone: "slate" | "emerald" | "sky" | "amber";
};

type DashboardOrderItem = {
  id: string;
  orderNo: string;
  status: string;
  customerName: string | null;
  grandTotal: number;
  orderDate: Date | null;
  paymentStatus: string;
  fulfillmentStatus: string;
};

type DashboardLowStockItem = {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  variantName: string | null;
  availableQty: number;
  lowStockThreshold: number;
};

type DashboardRestockItem = {
  id: string;
  restockNo: string;
  status: string;
  grandTotal: number;
  expectedArrivalAt: Date | null;
};

type DashboardActivityItem = {
  id: string;
  action: string;
  entityType: string;
  createdAt: Date | null;
};

type DashboardProductItem = {
  id: string;
  productName: string;
  status: string;
  createdAt: Date | null;
  isFeatured: boolean;
};

type DashboardUserItem = {
  id: string;
  fullName: string;
  role: string;
  email: string | null;
  createdAt: Date | null;
};

type DashboardViewedProductItem = {
  id: string;
  productId: string;
  productName: string;
  viewedAt: Date | null;
};

type DashboardDistributionItem = {
  label: string;
  count: number;
  tone: "slate" | "emerald" | "sky" | "amber";
};

type DashboardShellData = {
  storeName: string;
  storeSlug: string;
  currencyCode: string;
  unreadNotifications: number;
  navigationCount: number;
  navItems: ReturnType<typeof getDashboardNavigation>;
};

type StaffOverviewData = {
  mode: "operations";
  shell: DashboardShellData;
  metrics: DashboardMetric[];
  pipeline: DashboardDistributionItem[];
  recentOrders: DashboardOrderItem[];
  lowStockVariants: DashboardLowStockItem[];
  recentRestocks: DashboardRestockItem[];
  recentActivity: DashboardActivityItem[];
};

type CustomerOverviewData = {
  mode: "customer";
  shell: DashboardShellData;
  metrics: DashboardMetric[];
  recentOrders: DashboardOrderItem[];
  recentViews: DashboardViewedProductItem[];
  account: {
    joinedAt: Date | null;
    lastLoginAt: Date | null;
    emailVerified: boolean;
    totalSpent: number;
    loyaltyPoints: number;
  };
};

type StaffOrdersData = {
  mode: "operations";
  metrics: DashboardMetric[];
  recentOrders: DashboardOrderItem[];
  pendingPayments: number;
  shipmentsInFlight: number;
  returnsOpen: number;
};

type CustomerOrdersData = {
  mode: "customer";
  metrics: DashboardMetric[];
  recentOrders: DashboardOrderItem[];
};

type CatalogPageData = {
  metrics: DashboardMetric[];
  recentProducts: DashboardProductItem[];
};

type InventoryPageData = {
  metrics: DashboardMetric[];
  lowStockVariants: DashboardLowStockItem[];
  recentRestocks: DashboardRestockItem[];
};

type UsersPageData = {
  metrics: DashboardMetric[];
  roleDistribution: DashboardDistributionItem[];
  recentUsers: DashboardUserItem[];
};

type SettingsPageData = {
  store: {
    storeName: string;
    storeSlug: string;
    storeEmail: string | null;
    storePhone: string | null;
    supportEmail: string | null;
    supportPhone: string | null;
    currencyCode: string;
    locale: string;
    timezone: string;
    orderAutoCancelMinutes: number;
    stockPolicy: "BLOCK_ON_ZERO" | "ALLOW_BACKORDER";
    reviewAutoPublish: boolean;
    maintenanceMode: boolean;
    allowGuestCheckout: boolean;
    isActive: boolean;
  } | null;
  metrics: DashboardMetric[];
};

type AccountPageData = {
  profile: {
    totalSpent: number;
    totalOrders: number;
    loyaltyPoints: number;
    marketingOptIn: boolean;
    preferredLanguage: string | null;
  } | null;
  metrics: DashboardMetric[];
  recentOrders: DashboardOrderItem[];
};

function toDate(value: unknown) {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    return new Date(value);
  }

  return null;
}

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function toStringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function toNullableString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function toId(value: unknown) {
  return value ? String(value) : "";
}

async function getStoreShell(user: SessionUser): Promise<DashboardShellData> {
  await connectToDatabase();

  const [storeSettings, unreadNotifications] = await Promise.all([
    StoreSettingsModel.findOne().sort({ createdAt: -1 }).lean().exec() as Promise<
      | {
          storeName?: string;
          storeSlug?: string;
          currencyCode?: string;
        }
      | null
    >,
    NotificationModel.countDocuments({
      userId: user.id,
      isRead: false,
    }).exec(),
  ]);

  return {
    storeName: storeSettings?.storeName ?? "Omni Commerce",
    storeSlug: storeSettings?.storeSlug ?? "omni-commerce",
    currencyCode: storeSettings?.currencyCode ?? "MMK",
    unreadNotifications,
    navigationCount: countDashboardNavigationItems(getDashboardNavigation(user.role)),
    navItems: getDashboardNavigation(user.role),
  };
}

async function listRecentOrders(filter: Record<string, unknown>, limit: number) {
  await connectToDatabase();

  const orders = (await OrderModel.find(filter)
    .sort({ orderDate: -1 })
    .limit(limit)
    .select(
      "orderNo status customerNameSnapshot grandTotal orderDate paymentStatus fulfillmentStatus",
    )
    .lean()
    .exec()) as Array<{
    _id: unknown;
    orderNo?: string;
    status?: string;
    customerNameSnapshot?: string;
    grandTotal?: number;
    orderDate?: Date;
    paymentStatus?: string;
    fulfillmentStatus?: string;
  }>;

  return orders.map((order) => ({
    id: toId(order._id),
    orderNo: toStringValue(order.orderNo),
    status: toStringValue(order.status),
    customerName: toNullableString(order.customerNameSnapshot),
    grandTotal: toNumber(order.grandTotal),
    orderDate: toDate(order.orderDate),
    paymentStatus: toStringValue(order.paymentStatus),
    fulfillmentStatus: toStringValue(order.fulfillmentStatus),
  }));
}

async function listRecentProducts(limit: number) {
  await connectToDatabase();

  const products = (await ProductModel.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("productName status createdAt isFeatured")
    .lean()
    .exec()) as Array<{
    _id: unknown;
    productName?: string;
    status?: string;
    createdAt?: Date;
    isFeatured?: boolean;
  }>;

  return products.map((product) => ({
    id: toId(product._id),
    productName: toStringValue(product.productName),
    status: toStringValue(product.status),
    createdAt: toDate(product.createdAt),
    isFeatured: Boolean(product.isFeatured),
  }));
}

async function listRecentUsers(limit: number) {
  await connectToDatabase();

  const users = (await UserModel.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("fullName role email createdAt")
    .lean()
    .exec()) as Array<{
    _id: unknown;
    fullName?: string;
    role?: string;
    email?: string;
    createdAt?: Date;
  }>;

  return users.map((user) => ({
    id: toId(user._id),
    fullName: toStringValue(user.fullName),
    role: toStringValue(user.role),
    email: toNullableString(user.email),
    createdAt: toDate(user.createdAt),
  }));
}

async function listRecentRestocks(limit: number) {
  await connectToDatabase();

  const restocks = (await RestockOrderModel.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("restockNo status grandTotal expectedArrivalAt")
    .lean()
    .exec()) as Array<{
    _id: unknown;
    restockNo?: string;
    status?: string;
    grandTotal?: number;
    expectedArrivalAt?: Date;
  }>;

  return restocks.map((restock) => ({
    id: toId(restock._id),
    restockNo: toStringValue(restock.restockNo),
    status: toStringValue(restock.status),
    grandTotal: toNumber(restock.grandTotal),
    expectedArrivalAt: toDate(restock.expectedArrivalAt),
  }));
}

async function listRecentActivity(limit: number) {
  await connectToDatabase();

  const { AuditLogModel } = await import("@/modules/content/content.models");
  const auditLogs = (await AuditLogModel.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("action entityType createdAt")
    .lean()
    .exec()) as Array<{
    _id: unknown;
    action?: string;
    entityType?: string;
    createdAt?: Date;
  }>;

  return auditLogs.map((auditLog) => ({
    id: toId(auditLog._id),
    action: toStringValue(auditLog.action),
    entityType: toStringValue(auditLog.entityType),
    createdAt: toDate(auditLog.createdAt),
  }));
}

async function listLowStockVariants(limit: number) {
  await connectToDatabase();

  const variants = (await ProductVariantModel.find({
    isActive: true,
    trackInventory: true,
    $expr: { $lte: ["$availableQty", "$lowStockThreshold"] },
  })
    .sort({ availableQty: 1, updatedAt: -1 })
    .limit(limit)
    .select("productId sku variantName availableQty lowStockThreshold")
    .lean()
    .exec()) as Array<{
    _id: unknown;
    productId?: unknown;
    sku?: string;
    variantName?: string;
    availableQty?: number;
    lowStockThreshold?: number;
  }>;

  const productIds = variants
    .map((variant) => toId(variant.productId))
    .filter(Boolean);

  const products = (await ProductModel.find({
    _id: { $in: productIds },
  })
    .select("productName")
    .lean()
    .exec()) as Array<{
    _id: unknown;
    productName?: string;
  }>;

  const productNameMap = new Map(
    products.map((product) => [toId(product._id), toStringValue(product.productName)]),
  );

  return variants.map((variant) => {
    const productId = toId(variant.productId);

    return {
      id: toId(variant._id),
      productId,
      productName: productNameMap.get(productId) ?? "Unnamed product",
      sku: toStringValue(variant.sku),
      variantName: toNullableString(variant.variantName),
      availableQty: toNumber(variant.availableQty),
      lowStockThreshold: toNumber(variant.lowStockThreshold),
    };
  });
}

async function listRecentlyViewedProducts(userId: string, limit: number) {
  await connectToDatabase();

  const recentlyViewed = (await RecentlyViewedProductModel.find({ customerId: userId })
    .sort({ viewedAt: -1 })
    .limit(limit)
    .select("productId viewedAt")
    .lean()
    .exec()) as Array<{
    _id: unknown;
    productId?: unknown;
    viewedAt?: Date;
  }>;

  const productIds = recentlyViewed
    .map((item) => toId(item.productId))
    .filter(Boolean);

  const products = (await ProductModel.find({
    _id: { $in: productIds },
  })
    .select("productName")
    .lean()
    .exec()) as Array<{
    _id: unknown;
    productName?: string;
  }>;

  const productNameMap = new Map(
    products.map((product) => [toId(product._id), toStringValue(product.productName)]),
  );

  return recentlyViewed.map((item) => {
    const productId = toId(item.productId);

    return {
      id: toId(item._id),
      productId,
      productName: productNameMap.get(productId) ?? "Product",
      viewedAt: toDate(item.viewedAt),
    };
  });
}

async function getStaffMetrics(currencyCode: string): Promise<{
  metrics: DashboardMetric[];
  pipeline: DashboardDistributionItem[];
}> {
  await connectToDatabase();

  const [
    totalOrders,
    activeOrders,
    fulfilledOrders,
    activeProducts,
    lowStockCount,
    customers,
    pendingPayments,
    shipmentsInFlight,
    restocksInTransit,
    revenueAggregation,
  ] = await Promise.all([
    OrderModel.countDocuments().exec(),
    OrderModel.countDocuments({
      status: { $in: ["PENDING", "AWAITING_PAYMENT", "PAID", "PROCESSING"] },
    }).exec(),
    OrderModel.countDocuments({
      status: { $in: ["SHIPPED", "COMPLETED"] },
    }).exec(),
    ProductModel.countDocuments({ status: "ACTIVE" }).exec(),
    ProductVariantModel.countDocuments({
      isActive: true,
      trackInventory: true,
      $expr: { $lte: ["$availableQty", "$lowStockThreshold"] },
    }).exec(),
    UserModel.countDocuments({ role: "CUSTOMER" }).exec(),
    PaymentModel.countDocuments({
      status: { $in: ["SUBMITTED", "AUTHORIZED"] },
    }).exec(),
    ShipmentModel.countDocuments({
      status: { $in: ["PACKING", "OUT_FOR_DELIVERY"] },
    }).exec(),
    RestockOrderModel.countDocuments({
      status: { $in: ["ORDERED", "PAID", "IN_TRANSIT", "PARTIALLY_RECEIVED"] },
    }).exec(),
    OrderModel.aggregate<{ _id: null; totalRevenue: number }>([
      {
        $match: {
          status: { $in: ["PAID", "PROCESSING", "SHIPPED", "COMPLETED"] },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$grandTotal" },
        },
      },
    ]).exec(),
  ]);

  const revenue = revenueAggregation[0]?.totalRevenue ?? 0;

  return {
    metrics: [
      {
        label: `Revenue (${currencyCode})`,
        value: revenue,
        hint: "Captured and progressing order value",
        tone: "slate",
      },
      {
        label: "Open orders",
        value: activeOrders,
        hint: `${totalOrders} total orders tracked`,
        tone: "emerald",
      },
      {
        label: "Active products",
        value: activeProducts,
        hint: `${customers} customers in the system`,
        tone: "sky",
      },
      {
        label: "Low stock variants",
        value: lowStockCount,
        hint: `${restocksInTransit} restocks currently moving`,
        tone: "amber",
      },
    ],
    pipeline: [
      { label: "Open orders", count: activeOrders, tone: "emerald" },
      { label: "Fulfilled", count: fulfilledOrders, tone: "sky" },
      { label: "Pending payments", count: pendingPayments, tone: "amber" },
      { label: "Shipments moving", count: shipmentsInFlight, tone: "slate" },
    ],
  };
}

async function getCustomerMetrics(user: SessionUser): Promise<{
  metrics: DashboardMetric[];
  account: CustomerOverviewData["account"];
}> {
  await connectToDatabase();

  const [
    totalOrders,
    activeOrders,
    wishlistItems,
    addresses,
    recentSearches,
    customerProfile,
  ] = await Promise.all([
    OrderModel.countDocuments({ customerId: user.id }).exec(),
    OrderModel.countDocuments({
      customerId: user.id,
      status: { $in: ["PENDING", "AWAITING_PAYMENT", "PAID", "PROCESSING", "SHIPPED"] },
    }).exec(),
    WishlistItemModel.countDocuments({
      wishlistId: {
        $in: await (async () => {
          const { WishlistModel } = await import("@/modules/customers/customers.models");
          const wishlists = await WishlistModel.find({ customerId: user.id })
            .select("_id")
            .lean()
            .exec();
          return wishlists.map((wishlist) => wishlist._id);
        })(),
      },
    }).exec(),
    AddressModel.countDocuments({ userId: user.id }).exec(),
    SavedSearchModel.countDocuments({ customerId: user.id }).exec(),
    CustomerProfileModel.findOne({ userId: user.id }).lean().exec() as Promise<
      | {
          totalSpent?: number;
          loyaltyPoints?: number;
        }
      | null
    >,
  ]);

  return {
    metrics: [
      {
        label: "Your orders",
        value: totalOrders,
        hint: `${activeOrders} still in progress`,
        tone: "slate",
      },
      {
        label: "Saved items",
        value: wishlistItems,
        hint: "Wishlist products across the store",
        tone: "emerald",
      },
      {
        label: "Addresses",
        value: addresses,
        hint: `${recentSearches} saved searches available`,
        tone: "sky",
      },
      {
        label: "Loyalty points",
        value: toNumber(customerProfile?.loyaltyPoints),
        hint: "Earned from your customer profile",
        tone: "amber",
      },
    ],
    account: {
      joinedAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      emailVerified: user.emailVerified,
      totalSpent: toNumber(customerProfile?.totalSpent),
      loyaltyPoints: toNumber(customerProfile?.loyaltyPoints),
    },
  };
}

export class DashboardService {
  async getShellData(user: SessionUser) {
    return getStoreShell(user);
  }

  async getOverviewData(user: SessionUser): Promise<StaffOverviewData | CustomerOverviewData> {
    const shell = await getStoreShell(user);

    if (user.role === "CUSTOMER") {
      const [customerSnapshot, recentOrders, recentViews] = await Promise.all([
        getCustomerMetrics(user),
        listRecentOrders({ customerId: user.id }, 4),
        listRecentlyViewedProducts(user.id, 4),
      ]);

      return {
        mode: "customer",
        shell,
        metrics: customerSnapshot.metrics,
        recentOrders,
        recentViews,
        account: customerSnapshot.account,
      };
    }

    const [staffMetrics, recentOrders, lowStockVariants, recentRestocks, recentActivity] =
      await Promise.all([
        getStaffMetrics(shell.currencyCode),
        listRecentOrders({}, 5),
        listLowStockVariants(5),
        listRecentRestocks(5),
        listRecentActivity(5),
      ]);

    return {
      mode: "operations",
      shell,
      metrics: staffMetrics.metrics,
      pipeline: staffMetrics.pipeline,
      recentOrders,
      lowStockVariants,
      recentRestocks,
      recentActivity,
    };
  }

  async getOrdersPageData(user: SessionUser): Promise<StaffOrdersData | CustomerOrdersData> {
    await connectToDatabase();

    if (user.role === "CUSTOMER") {
      const [pending, completed, cancelled, recentOrders] = await Promise.all([
        OrderModel.countDocuments({
          customerId: user.id,
          status: { $in: ["PENDING", "AWAITING_PAYMENT", "PAID", "PROCESSING", "SHIPPED"] },
        }).exec(),
        OrderModel.countDocuments({
          customerId: user.id,
          status: "COMPLETED",
        }).exec(),
        OrderModel.countDocuments({
          customerId: user.id,
          status: { $in: ["CANCELLED", "REFUNDED"] },
        }).exec(),
        listRecentOrders({ customerId: user.id }, 6),
      ]);

      return {
        mode: "customer",
        metrics: [
          { label: "Open orders", value: pending, hint: "Still moving through the flow", tone: "emerald" },
          { label: "Completed", value: completed, hint: "Delivered or closed successfully", tone: "sky" },
          { label: "Closed", value: cancelled, hint: "Cancelled or refunded orders", tone: "amber" },
        ],
        recentOrders,
      };
    }

    const [pendingPayments, shipmentsInFlight, returnsOpen, recentOrders] =
      await Promise.all([
        PaymentModel.countDocuments({
          status: { $in: ["SUBMITTED", "AUTHORIZED"] },
        }).exec(),
        ShipmentModel.countDocuments({
          status: { $in: ["PACKING", "OUT_FOR_DELIVERY"] },
        }).exec(),
        ReturnModel.countDocuments({
          status: { $in: ["REQUESTED", "APPROVED", "RECEIVED"] },
        }).exec(),
        listRecentOrders({}, 8),
      ]);

    return {
      mode: "operations",
      metrics: [
        { label: "Pending payments", value: pendingPayments, hint: "Need review or confirmation", tone: "amber" },
        { label: "Shipments moving", value: shipmentsInFlight, hint: "Packing or out for delivery", tone: "sky" },
        { label: "Open returns", value: returnsOpen, hint: "Customer returns awaiting closure", tone: "emerald" },
      ],
      recentOrders,
      pendingPayments,
      shipmentsInFlight,
      returnsOpen,
    };
  }

  async getCatalogPageData(): Promise<CatalogPageData> {
    await connectToDatabase();

    const [activeProducts, draftProducts, archivedProducts, categories, brands, collections, promotions, recentProducts] =
      await Promise.all([
        ProductModel.countDocuments({ status: "ACTIVE" }).exec(),
        ProductModel.countDocuments({ status: "DRAFT" }).exec(),
        ProductModel.countDocuments({ status: "ARCHIVED" }).exec(),
        CategoryModel.countDocuments().exec(),
        BrandModel.countDocuments().exec(),
        CollectionModel.countDocuments().exec(),
        PromotionModel.countDocuments({ isActive: true }).exec(),
        listRecentProducts(6),
      ]);

    return {
      metrics: [
        { label: "Active products", value: activeProducts, hint: `${categories} categories live`, tone: "emerald" },
        { label: "Draft products", value: draftProducts, hint: `${brands} brands connected`, tone: "slate" },
        { label: "Archived products", value: archivedProducts, hint: `${collections} collections available`, tone: "amber" },
        { label: "Active promotions", value: promotions, hint: "Discounts and campaigns currently enabled", tone: "sky" },
      ],
      recentProducts,
    };
  }

  async getInventoryPageData(): Promise<InventoryPageData> {
    await connectToDatabase();

    const [activeVariants, lowStockCount, restocksInTransit, activeSources, lowStockVariants, recentRestocks] =
      await Promise.all([
        ProductVariantModel.countDocuments({ isActive: true }).exec(),
        ProductVariantModel.countDocuments({
          isActive: true,
          trackInventory: true,
          $expr: { $lte: ["$availableQty", "$lowStockThreshold"] },
        }).exec(),
        RestockOrderModel.countDocuments({
          status: { $in: ["ORDERED", "PAID", "IN_TRANSIT", "PARTIALLY_RECEIVED"] },
        }).exec(),
        SourcingSourceModel.countDocuments({ isActive: true }).exec(),
        listLowStockVariants(6),
        listRecentRestocks(6),
      ]);

    return {
      metrics: [
        { label: "Active variants", value: activeVariants, hint: `${activeSources} sourcing sources enabled`, tone: "slate" },
        { label: "Low stock", value: lowStockCount, hint: "Needs replenishment soon", tone: "amber" },
        { label: "Restocks moving", value: restocksInTransit, hint: "Purchase orders in progress", tone: "emerald" },
      ],
      lowStockVariants,
      recentRestocks,
    };
  }

  async getUsersPageData(): Promise<UsersPageData> {
    await connectToDatabase();

    const [customers, staff, admins, groups, profiles, addresses, recentUsers] =
      await Promise.all([
        UserModel.countDocuments({ role: "CUSTOMER" }).exec(),
        UserModel.countDocuments({ role: "STAFF" }).exec(),
        UserModel.countDocuments({ role: { $in: ["OWNER", "ADMIN"] } }).exec(),
        CustomerGroupModel.countDocuments({ isActive: true }).exec(),
        CustomerProfileModel.countDocuments().exec(),
        AddressModel.countDocuments().exec(),
        listRecentUsers(6),
      ]);

    return {
      metrics: [
        { label: "Customers", value: customers, hint: `${profiles} customer profiles linked`, tone: "emerald" },
        { label: "Staff", value: staff, hint: `${admins} elevated operators`, tone: "slate" },
        { label: "Customer groups", value: groups, hint: `${addresses} addresses stored`, tone: "sky" },
      ],
      roleDistribution: [
        { label: "Customers", count: customers, tone: "emerald" },
        { label: "Staff", count: staff, tone: "sky" },
        { label: "Admins", count: admins, tone: "slate" },
      ],
      recentUsers,
    };
  }

  async getSettingsPageData(): Promise<SettingsPageData> {
    await connectToDatabase();

    const [storeSettings, pages, banners, navigationMenus, paymentMethods, shippingMethods] =
      await Promise.all([
        StoreSettingsModel.findOne().sort({ createdAt: -1 }).lean().exec() as Promise<
          | {
              storeName?: string;
              storeSlug?: string;
              storeEmail?: string;
              storePhone?: string;
              supportEmail?: string;
              supportPhone?: string;
              currencyCode?: string;
              locale?: string;
              timezone?: string;
              orderAutoCancelMinutes?: number;
              stockPolicy?: "BLOCK_ON_ZERO" | "ALLOW_BACKORDER";
              reviewAutoPublish?: boolean;
              maintenanceMode?: boolean;
              allowGuestCheckout?: boolean;
              isActive?: boolean;
            }
          | null
        >,
        PageModel.countDocuments().exec(),
        BannerModel.countDocuments({ isActive: true }).exec(),
        NavigationMenuModel.countDocuments({ isActive: true }).exec(),
        PaymentMethodModel.countDocuments({ isActive: true }).exec(),
        ShippingMethodModel.countDocuments({ isActive: true }).exec(),
      ]);

    return {
      store: storeSettings
        ? {
            storeName: storeSettings.storeName ?? "Omni Commerce",
            storeSlug: storeSettings.storeSlug ?? "omni-commerce",
            storeEmail: toNullableString(storeSettings.storeEmail),
            storePhone: toNullableString(storeSettings.storePhone),
            supportEmail: toNullableString(storeSettings.supportEmail),
            supportPhone: toNullableString(storeSettings.supportPhone),
            currencyCode: storeSettings.currencyCode ?? "MMK",
            locale: storeSettings.locale ?? "en",
            timezone: storeSettings.timezone ?? "Asia/Yangon",
            orderAutoCancelMinutes: toNumber(storeSettings.orderAutoCancelMinutes) || 1440,
            stockPolicy: storeSettings.stockPolicy ?? "BLOCK_ON_ZERO",
            reviewAutoPublish: Boolean(storeSettings.reviewAutoPublish),
            maintenanceMode: Boolean(storeSettings.maintenanceMode),
            allowGuestCheckout: Boolean(storeSettings.allowGuestCheckout),
            isActive: storeSettings.isActive !== false,
          }
        : null,
      metrics: [
        { label: "Published pages", value: pages, hint: `${banners} active banners`, tone: "slate" },
        { label: "Navigation menus", value: navigationMenus, hint: `${paymentMethods} payment methods active`, tone: "sky" },
        { label: "Shipping methods", value: shippingMethods, hint: "Store-level commercial configuration", tone: "emerald" },
      ],
    };
  }

  async getAccountPageData(user: SessionUser): Promise<AccountPageData> {
    await connectToDatabase();

    const [profile, addresses, wishlistItems, searches, recentOrders] =
      await Promise.all([
        CustomerProfileModel.findOne({ userId: user.id }).lean().exec() as Promise<
          | {
              totalSpent?: number;
              totalOrders?: number;
              loyaltyPoints?: number;
              marketingOptIn?: boolean;
              preferredLanguage?: string;
            }
          | null
        >,
        AddressModel.countDocuments({ userId: user.id }).exec(),
        WishlistItemModel.countDocuments({
          wishlistId: {
            $in: await (async () => {
              const { WishlistModel } = await import("@/modules/customers/customers.models");
              const wishlists = await WishlistModel.find({ customerId: user.id })
                .select("_id")
                .lean()
                .exec();
              return wishlists.map((wishlist) => wishlist._id);
            })(),
          },
        }).exec(),
        SavedSearchModel.countDocuments({ customerId: user.id }).exec(),
        listRecentOrders({ customerId: user.id }, 4),
      ]);

    return {
      profile: profile
        ? {
            totalSpent: toNumber(profile.totalSpent),
            totalOrders: toNumber(profile.totalOrders),
            loyaltyPoints: toNumber(profile.loyaltyPoints),
            marketingOptIn: Boolean(profile.marketingOptIn),
            preferredLanguage: toNullableString(profile.preferredLanguage),
          }
        : null,
      metrics: [
        { label: "Saved addresses", value: addresses, hint: `${wishlistItems} wishlist products stored`, tone: "slate" },
        { label: "Saved searches", value: searches, hint: "Reusable product discovery shortcuts", tone: "sky" },
        { label: "Loyalty points", value: toNumber(profile?.loyaltyPoints), hint: "Customer profile reward balance", tone: "emerald" },
      ],
      recentOrders,
    };
  }
}

export const dashboardService = new DashboardService();

export function isOperationsRole(role: UserRole) {
  return role === "OWNER" || role === "ADMIN" || role === "STAFF";
}
