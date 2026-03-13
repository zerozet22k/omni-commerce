import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/mongodb";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import {
  buildHref,
  clampPage,
  readBooleanParam,
  readDateParam,
  readNumberParam,
  readSearchParam,
  toEndOfDay,
  toStartOfDay,
} from "@/modules/admin/admin-query";
import {
  ensureLimit,
  PAGE_LIMIT,
  SIMPLE_RECORD_LIMIT,
} from "@/modules/admin/admin-pagination";
import {
  BrandModel,
  CategoryModel,
  OptionTypeModel,
  OptionValueModel,
  ProductModel,
  ProductTypeModel,
  ProductVariantModel,
  TaxClassModel,
} from "@/modules/catalog/catalog.models";
import {
  getVariantAvailabilityState,
  summarizeProductVariants,
} from "@/modules/catalog/catalog-availability";
import {
  CollectionModel,
  ProductBadgeModel,
  ProductTagModel,
} from "@/modules/catalog/catalog-extra.models";
import { computeProductIssues, type ProductIssue } from "@/modules/catalog/product-issues";
import {
  BannerModel,
  NavigationMenuItemModel,
  NavigationMenuModel,
  PageModel,
} from "@/modules/content/content.models";
import { CountryModel, StateRegionModel } from "@/modules/core/core.models";
import { AddressModel, CustomerGroupModel } from "@/modules/customers/customers.models";
import { ReturnModel } from "@/modules/engagement/engagement.models";
import {
  OrderItemModel,
  OrderModel,
  OrderNoteModel,
  OrderStatusLogModel,
} from "@/modules/orders/orders.models";
import { PaymentMethodModel, PaymentModel } from "@/modules/payments/payments.models";
import {
  CouponUsageLogModel,
  PromotionCustomerGroupModel,
  PromotionModel,
  PromotionProductModel,
  PromotionVariantModel,
  ShippingMethodModel,
  ShippingRateRuleModel,
  ShippingZoneCountryModel,
  ShippingZoneModel,
  TaxRateModel,
} from "@/modules/pricing/pricing.models";
import { ShipmentModel } from "@/modules/shipments/shipments.models";
import {
  RestockOrderItemModel,
  RestockOrderModel,
  SourcingPlatformModel,
  SourcingSourceModel,
  StockAdjustmentModel,
  VariantSourceModel,
} from "@/modules/sourcing/sourcing.models";
import { CustomerProfileModel } from "@/modules/users/customer-profile.model";
import { UserModel } from "@/modules/users/user.model";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toId(value: unknown) {
  return value ? String(value) : "";
}

function toStringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function toNullableString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function toNumberValue(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function toBooleanValue(value: unknown) {
  return Boolean(value);
}

function toDateValue(value: unknown) {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const nextDate = new Date(value);
    return Number.isNaN(nextDate.getTime()) ? null : nextDate;
  }

  return null;
}

function toObjectIdList(values: unknown[]) {
  return values
    .map((value) => (Types.ObjectId.isValid(String(value)) ? new Types.ObjectId(String(value)) : null))
    .filter((value): value is Types.ObjectId => value !== null);
}

function computeProductHealth(input: {
  product: {
    categoryId?: unknown;
    status?: string;
    visibility?: string;
    images?: Array<{ assetId?: unknown; isPrimary?: boolean }>;
  };
  variants: Array<{
    sku?: string;
    unitPrice?: number;
    stockQty?: number;
    reservedQty?: number;
    availableQty?: number;
    trackInventory?: boolean;
    allowBackorder?: boolean;
    isActive?: boolean;
    lowStockThreshold?: number;
    images?: Array<{ assetId?: unknown; isPrimary?: boolean }>;
  }>;
}) {
  const issues = computeProductIssues(input);
  const availability = summarizeProductVariants(input.variants);

  return {
    issues: issues.issues,
    issueCount: issues.issueCount,
    hasIssues: issues.hasIssues,
    availabilityLabel: availability.availabilityLabel,
    totalAvailableQty: availability.totalAvailableQty,
  };
}

async function getProductLabelMap(productIds: string[]) {
  if (productIds.length === 0) {
    return new Map<string, { productName: string; slug: string }>();
  }

  const products = (await ProductModel.find({
    _id: { $in: toObjectIdList(productIds) },
  })
    .select("productName slug")
    .lean()
    .exec()) as Array<{
    _id: unknown;
    productName?: string;
    slug?: string;
  }>;

  return new Map(
    products.map((product) => [
      toId(product._id),
      {
        productName: toStringValue(product.productName),
        slug: toStringValue(product.slug),
      },
    ]),
  );
}

async function getCategoryNameMap(categoryIds: string[]) {
  if (categoryIds.length === 0) {
    return new Map<string, string>();
  }

  const categories = (await CategoryModel.find({
    _id: { $in: toObjectIdList(categoryIds) },
  })
    .select("categoryName fullSlugPath")
    .lean()
    .exec()) as Array<{
    _id: unknown;
    categoryName?: string;
    fullSlugPath?: string;
  }>;

  return new Map(
    categories.map((category) => [
      toId(category._id),
      toStringValue(category.fullSlugPath) || toStringValue(category.categoryName),
    ]),
  );
}

async function getBrandNameMap(brandIds: string[]) {
  if (brandIds.length === 0) {
    return new Map<string, string>();
  }

  const brands = (await BrandModel.find({
    _id: { $in: toObjectIdList(brandIds) },
  })
    .select("brandName")
    .lean()
    .exec()) as Array<{
    _id: unknown;
    brandName?: string;
  }>;

  return new Map(brands.map((brand) => [toId(brand._id), toStringValue(brand.brandName)]));
}

async function getSourceNameMap(sourceIds: string[]) {
  if (sourceIds.length === 0) {
    return new Map<string, string>();
  }

  const sources = (await SourcingSourceModel.find({
    _id: { $in: toObjectIdList(sourceIds) },
  })
    .select("sourceName")
    .lean()
    .exec()) as Array<{
    _id: unknown;
    sourceName?: string;
  }>;

  return new Map(sources.map((source) => [toId(source._id), toStringValue(source.sourceName)]));
}

async function getSelectedRestockRecord(
  selectedRestockId: string,
): Promise<InventoryWorkspace["selectedRestock"]> {
  if (!Types.ObjectId.isValid(selectedRestockId)) {
    return null;
  }

  const restock = (await RestockOrderModel.findById(selectedRestockId)
    .lean()
    .exec()) as
    | {
        _id: unknown;
        restockNo?: string;
        status?: string;
        sourcingSourceId?: unknown;
        trackingNo?: string;
        expectedArrivalAt?: Date;
        grandTotal?: number;
      }
    | null;

  if (!restock) {
    return null;
  }

  const restockItems = (await RestockOrderItemModel.find({
    restockOrderId: selectedRestockId,
  })
    .lean()
    .exec()) as Array<{
    _id: unknown;
    variantId?: unknown;
    orderedQty?: number;
    receivedQty?: number;
    rejectedQty?: number;
    unitCost?: number;
  }>;

  const restockVariantMap = new Map(
    ((await ProductVariantModel.find({
      _id: { $in: toObjectIdList(restockItems.map((item) => toId(item.variantId))) },
    })
      .select("productId sku")
      .lean()
      .exec()) as Array<{
      _id: unknown;
      productId?: unknown;
      sku?: string;
    }>).map((variant) => [toId(variant._id), variant]),
  );

  const restockProducts = await getProductLabelMap(
    Array.from(restockVariantMap.values())
      .map((variant) => toId(variant.productId))
      .filter(Boolean),
  );
  const selectedRestockSourceNameMap = await getSourceNameMap([
    toId(restock.sourcingSourceId),
  ]);

  return {
    id: toId(restock._id),
    restockNo: toStringValue(restock.restockNo),
    status: toStringValue(restock.status),
    sourceName: selectedRestockSourceNameMap.get(toId(restock.sourcingSourceId)) ?? null,
    trackingNo: toNullableString(restock.trackingNo),
    expectedArrivalAt: toDateValue(restock.expectedArrivalAt),
    grandTotal: toNumberValue(restock.grandTotal),
    items: restockItems.map((item) => {
      const variant = restockVariantMap.get(toId(item.variantId));
      const productLabel = variant
        ? restockProducts.get(toId(variant.productId))
        : undefined;

      return {
        id: toId(item._id),
        variantId: toId(item.variantId),
        productName: productLabel?.productName ?? "Product",
        sku: variant ? toStringValue(variant.sku) : "",
        orderedQty: toNumberValue(item.orderedQty),
        receivedQty: toNumberValue(item.receivedQty),
        rejectedQty: toNumberValue(item.rejectedQty),
        unitCost: toNumberValue(item.unitCost),
      };
    }),
  };
}

export type OrdersWorkspace = {
  filters: {
    query: string;
    status: string;
    paymentStatus: string;
    fulfillmentStatus: string;
    sort: string;
    dateFrom: string;
    dateTo: string;
    page: number;
    limit: number;
  };
  metrics: Array<{
    label: string;
    value: number;
    hint: string;
  }>;
  items: Array<{
    id: string;
    customerId: string | null;
    orderNo: string;
    customerName: string | null;
    customerEmail: string | null;
    customerPhone: string | null;
    orderDate: Date | null;
    status: string;
    paymentStatus: string;
    fulfillmentStatus: string;
    grandTotal: number;
    currencyCode: string;
  }>;
  selectedOrder: null | {
    id: string;
    customerId: string | null;
    orderNo: string;
    orderDate: Date | null;
    status: string;
    paymentStatus: string;
    fulfillmentStatus: string;
    shippingMethodName: string | null;
    grandTotal: number;
    currencyCode: string;
    subtotal: number;
    shippingFee: number;
    taxTotal: number;
    note: string | null;
    customerName: string | null;
    customerEmail: string | null;
    customerPhone: string | null;
    items: Array<{
      id: string;
      productName: string;
      sku: string | null;
      variantLabel: string | null;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }>;
    notes: Array<{
      id: string;
      noteType: string;
      note: string;
      createdAt: Date | null;
    }>;
    statusLogs: Array<{
      id: string;
      fromStatus: string | null;
      toStatus: string;
      note: string | null;
      changedAt: Date | null;
    }>;
    payments: Array<{
      id: string;
      amount: number;
      status: string;
      methodName: string;
      transactionRef: string | null;
      paymentDate: Date | null;
    }>;
    shipments: Array<{
      id: string;
      courierName: string | null;
      trackingNo: string | null;
      status: string;
      shippedAt: Date | null;
      deliveredAt: Date | null;
    }>;
  };
  paymentMethods: Array<{
    id: string;
    methodName: string;
    code: string;
  }>;
  shippingMethods: Array<{
    id: string;
    methodName: string;
    code: string;
  }>;
  customerOptions: Array<{
    id: string;
    label: string;
  }>;
  total: number;
  totalPages: number;
  page: number;
};

export type ProductsWorkspace = {
  filters: {
    query: string;
    categoryId: string;
    brandId: string;
    status: string;
    visibility: string;
    featured: string;
    newArrival: string;
    hasIssues: string;
    sort: string;
    page: number;
    limit: number;
  };
  metrics: Array<{
    label: string;
    value: number;
    hint: string;
  }>;
  items: Array<{
    id: string;
    productName: string;
    slug: string;
    categoryName: string | null;
    brandName: string | null;
    status: string;
    visibility: string;
    isFeatured: boolean;
    isNewArrival: boolean;
    variantCount: number;
    defaultSku: string | null;
    defaultPrice: number | null;
    totalAvailableQty: number;
    availabilityLabel: string;
    issueCount: number;
    issueBadges: ProductIssue[];
    createdAt: Date | null;
    updatedAt: Date | null;
  }>;
  productTypes: Array<{ id: string; label: string }>;
  categories: Array<{ id: string; label: string }>;
  brands: Array<{ id: string; label: string }>;
  total: number;
  totalPages: number;
  page: number;
};

export type ProductEditorWorkspace = {
  product: null | {
    id: string;
    productName: string;
    slug: string;
    productTypeId: string;
    categoryId: string;
    brandId: string;
    taxClassId: string;
    shortDescription: string;
    description: string;
    material: string;
    careInstructions: string;
    warrantyInfo: string;
    conditionType: string;
    status: string;
    visibility: string;
    isFeatured: boolean;
    isNewArrival: boolean;
    isBestSeller: boolean;
    seoTitle: string;
    seoDescription: string;
    collectionIds: string[];
    optionTypeIds: string[];
    images: Array<{
      assetId: string;
      isPrimary: boolean;
      sortOrder: number;
    }>;
    specificationsText: string;
    issues: ProductIssue[];
  };
  categories: Array<{ id: string; label: string }>;
  brands: Array<{ id: string; label: string }>;
  productTypes: Array<{ id: string; label: string }>;
  taxClasses: Array<{ id: string; label: string }>;
  collections: Array<{ id: string; label: string }>;
  optionGroups: Array<{
    id: string;
    name: string;
    values: Array<{
      id: string;
      label: string;
    }>;
  }>;
  sourcingSources: Array<{
    id: string;
    label: string;
  }>;
  variants: Array<{
    id: string;
    variantName: string | null;
    sku: string;
    optionSummary: string;
    unitPrice: number;
    compareAtPrice: number | null;
    costPrice: number | null;
    stockQty: number;
    reservedQty: number;
    availableQty: number;
    lowStockThreshold: number;
    trackInventory: boolean;
    allowBackorder: boolean;
    availabilityLabel: string;
    isSellable: boolean;
    isDefault: boolean;
    isActive: boolean;
    sourceCount: number;
    images: Array<{
      assetId: string;
      isPrimary: boolean;
      sortOrder: number;
    }>;
  }>;
  variantSources: Array<{
    id: string;
    variantId: string;
    sourceName: string;
    sourceSku: string | null;
    sourceProductUrl: string;
    sourcePrice: number | null;
    isPreferred: boolean;
    isActive: boolean;
  }>;
};

export type InventoryWorkspace = {
  filters: {
    query: string;
    stockView: string;
    active: string;
    sort: string;
    page: number;
    limit: number;
  };
  metrics: Array<{
    label: string;
    value: number;
    hint: string;
  }>;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    productSlug: string;
    sku: string;
    variantName: string | null;
    stockQty: number;
    reservedQty: number;
    availableQty: number;
    lowStockThreshold: number;
    isActive: boolean;
    sourceCount: number;
    updatedAt: Date | null;
  }>;
  lowStockItems: Array<{
    id: string;
    productName: string;
    sku: string;
    variantName: string | null;
    availableQty: number;
    lowStockThreshold: number;
  }>;
  selectedVariant: null | {
    id: string;
    productId: string;
    productName: string;
    variantName: string | null;
    sku: string;
    stockQty: number;
    reservedQty: number;
    availableQty: number;
    lowStockThreshold: number;
    isActive: boolean;
    sources: Array<{
      id: string;
      sourceName: string;
      sourceSku: string | null;
      sourceProductUrl: string;
      sourcePrice: number | null;
      isPreferred: boolean;
      isActive: boolean;
    }>;
    adjustments: Array<{
      id: string;
      adjustmentType: string;
      quantity: number;
      note: string | null;
      createdAt: Date | null;
    }>;
  };
  restockOrders: Array<{
    id: string;
    restockNo: string;
    status: string;
    sourceName: string | null;
    grandTotal: number;
    expectedArrivalAt: Date | null;
    createdAt: Date | null;
  }>;
  selectedRestock: null | {
    id: string;
    restockNo: string;
    status: string;
    sourceName: string | null;
    trackingNo: string | null;
    expectedArrivalAt: Date | null;
    grandTotal: number;
    items: Array<{
      id: string;
      variantId: string;
      productName: string;
      sku: string;
      orderedQty: number;
      receivedQty: number;
      rejectedQty: number;
      unitCost: number;
    }>;
  };
  sources: Array<{
    id: string;
    sourceName: string;
    platformName: string | null;
    phone: string | null;
    email: string | null;
    isActive: boolean;
    variantSourceCount: number;
  }>;
  sourceOptions: Array<{
    id: string;
    label: string;
  }>;
  platformOptions: Array<{
    id: string;
    label: string;
  }>;
  total: number;
  totalPages: number;
  page: number;
};

export type RestocksWorkspace = {
  filters: {
    query: string;
    status: string;
    sort: string;
    page: number;
    limit: number;
  };
  metrics: Array<{
    label: string;
    value: number;
    hint: string;
  }>;
  items: Array<{
    id: string;
    restockNo: string;
    status: string;
    sourceName: string | null;
    trackingNo: string | null;
    sourceOrderRef: string | null;
    grandTotal: number;
    expectedArrivalAt: Date | null;
    createdAt: Date | null;
  }>;
  selectedRestock: InventoryWorkspace["selectedRestock"];
  sourceOptions: Array<{
    id: string;
    label: string;
  }>;
  total: number;
  totalPages: number;
  page: number;
};

export type SupplierWorkspace = {
  filters: {
    query: string;
    platformId: string;
    active: string;
    sort: string;
    page: number;
    limit: number;
  };
  metrics: Array<{
    label: string;
    value: number;
    hint: string;
  }>;
  items: Array<{
    id: string;
    sourceName: string;
    platformName: string | null;
    contactName: string | null;
    phone: string | null;
    email: string | null;
    isActive: boolean;
    variantSourceCount: number;
    updatedAt: Date | null;
  }>;
  selectedSource: null | {
    id: string;
    sourcingPlatformId: string;
    sourceName: string;
    contactName: string | null;
    phone: string | null;
    email: string | null;
    shopUrl: string | null;
    note: string | null;
    isActive: boolean;
    links: Array<{
      id: string;
      variantId: string;
      variantLabel: string;
      productName: string;
      sourceSku: string | null;
      sourceProductName: string | null;
      sourceProductUrl: string;
      sourcePrice: number | null;
      isPreferred: boolean;
      isActive: boolean;
      updatedAt: Date | null;
    }>;
  };
  sourceOptions: Array<{
    id: string;
    label: string;
  }>;
  platformOptions: Array<{
    id: string;
    label: string;
  }>;
  variantOptions: Array<{
    id: string;
    label: string;
  }>;
  selectedVariantId: string;
  total: number;
  totalPages: number;
  page: number;
};

export type OptionTypesWorkspace = {
  filters: {
    query: string;
    sort: string;
    page: number;
    limit: number;
  };
  metrics: Array<{
    label: string;
    value: number;
    hint: string;
  }>;
  items: Array<{
    id: string;
    optionName: string;
    displayType: string;
    valueCount: number;
    productCount: number;
  }>;
  selectedOptionType: null | {
    id: string;
    optionName: string;
    displayType: string;
    productCount: number;
    values: Array<{
      id: string;
      valueName: string;
      valueCode: string | null;
      swatchHex: string | null;
      sortOrder: number;
      variantCount: number;
    }>;
  };
  total: number;
  totalPages: number;
  page: number;
};

export type PromotionsWorkspace = {
  filters: {
    query: string;
    active: string;
    sort: string;
    page: number;
    limit: number;
  };
  metrics: Array<{
    label: string;
    value: number;
    hint: string;
  }>;
  items: Array<{
    id: string;
    name: string;
    code: string | null;
    promotionType: string;
    discountLabel: string;
    isActive: boolean;
    startsAt: Date | null;
    endsAt: Date | null;
    productCount: number;
    variantCount: number;
    groupCount: number;
  }>;
  selectedPromotion: null | {
    id: string;
    code: string | null;
    name: string;
    description: string | null;
    promotionType: string;
    discountType: string | null;
    discountValue: number | null;
    minOrderAmount: number | null;
    maxDiscountAmount: number | null;
    usageLimit: number | null;
    usageCount: number;
    perCustomerLimit: number | null;
    startsAt: Date | null;
    endsAt: Date | null;
    heroAssetId: string | null;
    isActive: boolean;
    productIds: string[];
    variantIds: string[];
    customerGroupIds: string[];
  };
  selectedProductOptions: Array<{
    id: string;
    label: string;
  }>;
  selectedVariantOptions: Array<{
    id: string;
    label: string;
  }>;
  selectedCustomerGroupOptions: Array<{
    id: string;
    label: string;
  }>;
  total: number;
  totalPages: number;
  page: number;
};

export type UsersWorkspace = {
  filters: {
    query: string;
    segment: string;
    role: string;
    active: string;
    sort: string;
    page: number;
    limit: number;
  };
  metrics: Array<{
    label: string;
    value: number;
    hint: string;
  }>;
  items: Array<{
    id: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    role: string;
    isActive: boolean;
    totalOrders: number;
    totalSpent: number;
    addressCount: number;
    createdAt: Date | null;
    lastLoginAt: Date | null;
  }>;
  selectedUser: null | {
    id: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    role: string;
    isActive: boolean;
    emailVerified: boolean;
    registrationDate: Date | null;
    lastLoginAt: Date | null;
    addressCount: number;
    totalOrders: number;
    totalSpent: number;
    loyaltyPoints: number;
    recentOrders: Array<{
      id: string;
      orderNo: string;
      grandTotal: number;
      status: string;
      orderDate: Date | null;
    }>;
  };
  total: number;
  totalPages: number;
  page: number;
};

export type SimpleRecordKind =
  | "countries"
  | "states-regions"
  | "categories"
  | "brands"
  | "collections"
  | "product-types"
  | "product-tags"
  | "product-badges"
  | "payment-methods"
  | "shipping-zones"
  | "shipping-methods"
  | "shipping-rate-rules"
  | "tax-classes"
  | "tax-rates"
  | "pages"
  | "banners"
  | "navigation-menus";

export type SimpleRecordWorkspace = {
  kind: SimpleRecordKind;
  filters: {
    query: string;
    active: string;
    sort: string;
    page: number;
    limit: number;
  };
  items: Array<{
    id: string;
    title: string;
    slug: string | null;
    code: string | null;
    description: string | null;
    isActive: boolean;
    relatedCount: number;
    updatedAt: Date | null;
    extra: string | null;
  }>;
  selectedRecord:
    | null
    | Record<string, string | number | boolean | null | string[]>;
  categoryOptions: Array<{ id: string; label: string }>;
  countryOptions: Array<{ id: string; label: string }>;
  zoneOptions: Array<{ id: string; label: string }>;
  methodOptions: Array<{ id: string; label: string }>;
  stateOptions: Array<{ id: string; label: string; countryId?: string }>;
  taxClassOptions: Array<{ id: string; label: string }>;
  total: number;
  totalPages: number;
  page: number;
};

class AdminWorkspaceService {
  async getOrdersWorkspace(searchParams: AdminSearchParams): Promise<OrdersWorkspace> {
    await connectToDatabase();

    const query = readSearchParam(searchParams, "q").trim();
    const status = readSearchParam(searchParams, "status");
    const paymentStatus = readSearchParam(searchParams, "paymentStatus");
    const fulfillmentStatus = readSearchParam(searchParams, "fulfillmentStatus");
    const sort = readSearchParam(searchParams, "sort") || "newest";
    const dateFrom = readSearchParam(searchParams, "dateFrom");
    const dateTo = readSearchParam(searchParams, "dateTo");
    const limit = ensureLimit(readNumberParam(searchParams, "limit", PAGE_LIMIT));
    const requestedPage = readNumberParam(searchParams, "page", 1);
    const selectedOrderId = readSearchParam(searchParams, "orderId");

    const filter: Record<string, unknown> = {};

    if (query) {
      const regex = new RegExp(escapeRegex(query), "i");
      filter.$or = [
        { orderNo: regex },
        { customerNameSnapshot: regex },
        { customerEmailSnapshot: regex },
        { customerPhoneSnapshot: regex },
      ];
    }

    if (status) {
      filter.status = status;
    }

    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }

    if (fulfillmentStatus) {
      filter.fulfillmentStatus = fulfillmentStatus;
    }

    const orderDateFilter: Record<string, Date> = {};
    const dateFromValue = readDateParam(searchParams, "dateFrom");
    const dateToValue = readDateParam(searchParams, "dateTo");

    if (dateFromValue) {
      orderDateFilter.$gte = toStartOfDay(dateFromValue);
    }

    if (dateToValue) {
      orderDateFilter.$lte = toEndOfDay(dateToValue);
    }

    if (Object.keys(orderDateFilter).length > 0) {
      filter.orderDate = orderDateFilter;
    }

    const sortMap: Record<string, Record<string, 1 | -1>> = {
      newest: { orderDate: -1, _id: -1 },
      oldest: { orderDate: 1, _id: 1 },
      total_desc: { grandTotal: -1, orderDate: -1 },
      total_asc: { grandTotal: 1, orderDate: -1 },
    };

    const [total, metricsRaw, paymentMethodRows, shippingMethodRows, customerRows] = await Promise.all([
      OrderModel.countDocuments(filter).exec(),
      Promise.all([
        OrderModel.countDocuments({
          status: { $in: ["PENDING", "AWAITING_PAYMENT", "PAID", "PROCESSING"] },
        }).exec(),
        PaymentModel.countDocuments({
          status: { $in: ["SUBMITTED", "AUTHORIZED"] },
        }).exec(),
        ShipmentModel.countDocuments({
          status: { $in: ["PACKING", "OUT_FOR_DELIVERY"] },
        }).exec(),
        ReturnModel.countDocuments({
          status: { $in: ["REQUESTED", "APPROVED", "RECEIVED"] },
        }).exec(),
      ]),
      (await PaymentMethodModel.find({ isActive: true })
        .sort({ methodName: 1 })
        .select("methodName code")
        .lean()
        .exec()) as Array<{
        _id: unknown;
        methodName?: string;
        code?: string;
      }>,
      (await ShippingMethodModel.find({ isActive: true })
        .sort({ methodName: 1 })
        .select("methodName code")
        .lean()
        .exec()) as Array<{
        _id: unknown;
        methodName?: string;
        code?: string;
      }>,
      (await UserModel.find({ role: "CUSTOMER", isActive: true })
        .sort({ fullName: 1 })
        .limit(100)
        .select("fullName email phone")
        .lean()
        .exec()) as Array<{
        _id: unknown;
        fullName?: string;
        email?: string;
        phone?: string;
      }>,
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));
    const page = clampPage(requestedPage, totalPages);

    const orderRows = (await OrderModel.find(filter)
      .sort(sortMap[sort] ?? sortMap.newest)
      .skip((page - 1) * limit)
      .limit(limit)
      .select(
        "customerId orderNo customerNameSnapshot customerEmailSnapshot customerPhoneSnapshot orderDate status paymentStatus fulfillmentStatus grandTotal currencyCode",
      )
      .lean()
      .exec()) as Array<{
      _id: unknown;
      customerId?: unknown;
      orderNo?: string;
      customerNameSnapshot?: string;
      customerEmailSnapshot?: string;
      customerPhoneSnapshot?: string;
      orderDate?: Date;
      status?: string;
      paymentStatus?: string;
      fulfillmentStatus?: string;
      grandTotal?: number;
      currencyCode?: string;
    }>;

    let selectedOrder: OrdersWorkspace["selectedOrder"] = null;

    if (Types.ObjectId.isValid(selectedOrderId)) {
      const order = (await OrderModel.findById(selectedOrderId)
        .lean()
        .exec()) as
        | {
            _id: unknown;
            customerId?: unknown;
            orderNo?: string;
            orderDate?: Date;
            status?: string;
            paymentStatus?: string;
            fulfillmentStatus?: string;
            shippingMethodId?: unknown;
            grandTotal?: number;
            currencyCode?: string;
            subtotal?: number;
            shippingFee?: number;
            taxTotal?: number;
            note?: string;
            customerNameSnapshot?: string;
            customerEmailSnapshot?: string;
            customerPhoneSnapshot?: string;
          }
        | null;

      if (order) {
        const [items, notes, statusLogs, payments, shipments] = await Promise.all([
          (await OrderItemModel.find({ orderId: selectedOrderId })
            .sort({ _id: 1 })
            .lean()
            .exec()) as Array<{
            _id: unknown;
            productNameSnapshot?: string;
            skuSnapshot?: string;
            variantLabelSnapshot?: string;
            quantity?: number;
            unitPrice?: number;
            lineTotal?: number;
          }>,
          (await OrderNoteModel.find({ orderId: selectedOrderId })
            .sort({ createdAt: -1 })
            .lean()
            .exec()) as Array<{
            _id: unknown;
            noteType?: string;
            note?: string;
            createdAt?: Date;
          }>,
          (await OrderStatusLogModel.find({ orderId: selectedOrderId })
            .sort({ changedAt: -1 })
            .lean()
            .exec()) as Array<{
            _id: unknown;
            fromStatus?: string;
            toStatus?: string;
            note?: string;
            changedAt?: Date;
          }>,
          (await PaymentModel.find({ orderId: selectedOrderId })
            .sort({ paymentDate: -1 })
            .lean()
            .exec()) as Array<{
            _id: unknown;
            paymentMethodId?: unknown;
            amount?: number;
            status?: string;
            transactionRef?: string;
            paymentDate?: Date;
          }>,
          (await ShipmentModel.find({ orderId: selectedOrderId })
            .sort({ shippedAt: -1 })
            .lean()
            .exec()) as Array<{
            _id: unknown;
            courierName?: string;
            trackingNo?: string;
            status?: string;
            shippedAt?: Date;
            deliveredAt?: Date;
          }>,
        ]);

        const paymentMethodMap = new Map(
          paymentMethodRows.map((item) => [toId(item._id), toStringValue(item.methodName)]),
        );
        const shippingMethodMap = new Map(
          shippingMethodRows.map((item) => [toId(item._id), toStringValue(item.methodName)]),
        );

        selectedOrder = {
          id: toId(order._id),
          customerId: toId(order.customerId) || null,
          orderNo: toStringValue(order.orderNo),
          orderDate: toDateValue(order.orderDate),
          status: toStringValue(order.status),
          paymentStatus: toStringValue(order.paymentStatus),
          fulfillmentStatus: toStringValue(order.fulfillmentStatus),
          shippingMethodName: shippingMethodMap.get(toId(order.shippingMethodId)) ?? null,
          grandTotal: toNumberValue(order.grandTotal),
          currencyCode: toStringValue(order.currencyCode) || "MMK",
          subtotal: toNumberValue(order.subtotal),
          shippingFee: toNumberValue(order.shippingFee),
          taxTotal: toNumberValue(order.taxTotal),
          note: toNullableString(order.note),
          customerName: toNullableString(order.customerNameSnapshot),
          customerEmail: toNullableString(order.customerEmailSnapshot),
          customerPhone: toNullableString(order.customerPhoneSnapshot),
          items: items.map((item) => ({
            id: toId(item._id),
            productName: toStringValue(item.productNameSnapshot),
            sku: toNullableString(item.skuSnapshot),
            variantLabel: toNullableString(item.variantLabelSnapshot),
            quantity: toNumberValue(item.quantity),
            unitPrice: toNumberValue(item.unitPrice),
            lineTotal: toNumberValue(item.lineTotal),
          })),
          notes: notes.map((note) => ({
            id: toId(note._id),
            noteType: toStringValue(note.noteType),
            note: toStringValue(note.note),
            createdAt: toDateValue(note.createdAt),
          })),
          statusLogs: statusLogs.map((log) => ({
            id: toId(log._id),
            fromStatus: toNullableString(log.fromStatus),
            toStatus: toStringValue(log.toStatus),
            note: toNullableString(log.note),
            changedAt: toDateValue(log.changedAt),
          })),
          payments: payments.map((payment) => ({
            id: toId(payment._id),
            amount: toNumberValue(payment.amount),
            status: toStringValue(payment.status),
            methodName:
              paymentMethodMap.get(toId(payment.paymentMethodId)) ?? "Unknown method",
            transactionRef: toNullableString(payment.transactionRef),
            paymentDate: toDateValue(payment.paymentDate),
          })),
          shipments: shipments.map((shipment) => ({
            id: toId(shipment._id),
            courierName: toNullableString(shipment.courierName),
            trackingNo: toNullableString(shipment.trackingNo),
            status: toStringValue(shipment.status),
            shippedAt: toDateValue(shipment.shippedAt),
            deliveredAt: toDateValue(shipment.deliveredAt),
          })),
        };
      }
    }

    return {
      filters: {
        query,
        status,
        paymentStatus,
        fulfillmentStatus,
        sort,
        dateFrom,
        dateTo,
        page,
        limit,
      },
      metrics: [
        {
          label: "Open orders",
          value: metricsRaw[0],
          hint: "Pending, awaiting payment, paid, or processing",
        },
        {
          label: "Pending payments",
          value: metricsRaw[1],
          hint: "Submitted or authorized payments awaiting confirmation",
        },
        {
          label: "Shipments moving",
          value: metricsRaw[2],
          hint: "Packing or out for delivery",
        },
        {
          label: "Open returns",
          value: metricsRaw[3],
          hint: "Requested, approved, or received returns",
        },
      ],
      items: orderRows.map((order) => ({
        id: toId(order._id),
        customerId: toId(order.customerId) || null,
        orderNo: toStringValue(order.orderNo),
        customerName: toNullableString(order.customerNameSnapshot),
        customerEmail: toNullableString(order.customerEmailSnapshot),
        customerPhone: toNullableString(order.customerPhoneSnapshot),
        orderDate: toDateValue(order.orderDate),
        status: toStringValue(order.status),
        paymentStatus: toStringValue(order.paymentStatus),
        fulfillmentStatus: toStringValue(order.fulfillmentStatus),
        grandTotal: toNumberValue(order.grandTotal),
        currencyCode: toStringValue(order.currencyCode) || "MMK",
      })),
      selectedOrder,
      paymentMethods: paymentMethodRows.map((row) => ({
        id: toId(row._id),
        methodName: toStringValue(row.methodName),
        code: toStringValue(row.code),
      })),
      shippingMethods: shippingMethodRows.map((row) => ({
        id: toId(row._id),
        methodName: toStringValue(row.methodName),
        code: toStringValue(row.code),
      })),
      customerOptions: customerRows.map((row) => ({
        id: toId(row._id),
        label:
          [
            toStringValue(row.fullName),
            toNullableString(row.email),
            toNullableString(row.phone),
          ]
            .filter(Boolean)
            .join(" / ") || "Customer",
      })),
      total,
      totalPages,
      page,
    };
  }

  async getProductsWorkspace(searchParams: AdminSearchParams): Promise<ProductsWorkspace> {
    await connectToDatabase();

    const query = readSearchParam(searchParams, "q").trim();
    const categoryId = readSearchParam(searchParams, "categoryId");
    const brandId = readSearchParam(searchParams, "brandId");
    const status = readSearchParam(searchParams, "status");
    const visibility = readSearchParam(searchParams, "visibility");
    const featured = readSearchParam(searchParams, "featured");
    const newArrival = readSearchParam(searchParams, "newArrival");
    const hasIssues = readSearchParam(searchParams, "hasIssues");
    const sort = readSearchParam(searchParams, "sort") || "newest";
    const limit = ensureLimit(readNumberParam(searchParams, "limit", PAGE_LIMIT));
    const requestedPage = readNumberParam(searchParams, "page", 1);

    const filter: Record<string, unknown> = {};

    if (Types.ObjectId.isValid(categoryId)) {
      filter.categoryId = new Types.ObjectId(categoryId);
    }

    if (Types.ObjectId.isValid(brandId)) {
      filter.brandId = new Types.ObjectId(brandId);
    }

    if (status) {
      filter.status = status;
    }

    if (visibility) {
      filter.visibility = visibility;
    }

    if (featured === "true") {
      filter.isFeatured = true;
    }

    if (featured === "false") {
      filter.isFeatured = false;
    }

    if (newArrival === "true") {
      filter.isNewArrival = true;
    }

    if (newArrival === "false") {
      filter.isNewArrival = false;
    }

    if (query) {
      const regex = new RegExp(escapeRegex(query), "i");
      const matchingVariants = (await ProductVariantModel.find({
        $or: [{ sku: regex }, { variantName: regex }],
      })
        .select("productId")
        .lean()
        .exec()) as Array<{
        productId?: unknown;
      }>;

      const variantProductIds = matchingVariants
        .map((item) => toId(item.productId))
        .filter(Boolean);

      filter.$or = [
        { productName: regex },
        { slug: regex },
        ...(variantProductIds.length > 0
          ? [{ _id: { $in: toObjectIdList(variantProductIds) } }]
          : []),
      ];
    }

    const sortMap: Record<string, Record<string, 1 | -1>> = {
      newest: { createdAt: -1, _id: -1 },
      oldest: { createdAt: 1, _id: 1 },
      name_asc: { productName: 1, createdAt: -1 },
      name_desc: { productName: -1, createdAt: -1 },
      updated: { updatedAt: -1, createdAt: -1 },
    };

    if (hasIssues === "true" || hasIssues === "false") {
      const issueCandidates = (await ProductModel.find(filter)
        .select("categoryId status visibility images")
        .lean()
        .exec()) as Array<{
        _id: unknown;
        categoryId?: unknown;
        status?: string;
        visibility?: string;
        images?: Array<{
          assetId?: unknown;
          isPrimary?: boolean;
        }>;
      }>;
      const candidateIds = issueCandidates.map((product) => toId(product._id)).filter(Boolean);
      const issueVariants = candidateIds.length
        ? ((await ProductVariantModel.find({
            productId: { $in: toObjectIdList(candidateIds) },
          })
            .select(
              "productId sku unitPrice stockQty reservedQty availableQty trackInventory allowBackorder isActive lowStockThreshold images",
            )
            .lean()
            .exec()) as Array<{
            productId?: unknown;
            sku?: string;
            unitPrice?: number;
            stockQty?: number;
            reservedQty?: number;
            availableQty?: number;
            trackInventory?: boolean;
            allowBackorder?: boolean;
            isActive?: boolean;
            lowStockThreshold?: number;
            images?: Array<{
              assetId?: unknown;
              isPrimary?: boolean;
            }>;
          }>)
        : [];
      const issueVariantsByProduct = new Map<string, typeof issueVariants>();

      for (const variant of issueVariants) {
        const productIdValue = toId(variant.productId);
        const currentValue = issueVariantsByProduct.get(productIdValue) ?? [];
        currentValue.push(variant);
        issueVariantsByProduct.set(productIdValue, currentValue);
      }

      const matchingIds = issueCandidates
        .filter((product) => {
          const health = computeProductHealth({
            product,
            variants: issueVariantsByProduct.get(toId(product._id)) ?? [],
          });
          return hasIssues === "true" ? health.hasIssues : !health.hasIssues;
        })
        .map((product) => toId(product._id))
        .filter(Boolean);

      filter._id =
        matchingIds.length > 0 ? { $in: toObjectIdList(matchingIds) } : { $in: [] };
    }

    const [total, counts, categories, brands, productTypes] = await Promise.all([
      ProductModel.countDocuments(filter).exec(),
      Promise.all([
        ProductModel.countDocuments({ status: "ACTIVE" }).exec(),
        ProductModel.countDocuments({ status: "DRAFT" }).exec(),
        ProductModel.countDocuments({ status: "ARCHIVED" }).exec(),
        ProductVariantModel.countDocuments({ isActive: true }).exec(),
      ]),
      (await CategoryModel.find({ isActive: true })
        .sort({ depth: 1, sortOrder: 1, categoryName: 1 })
        .select("categoryName fullSlugPath")
        .lean()
        .exec()) as Array<{
        _id: unknown;
        categoryName?: string;
        fullSlugPath?: string;
      }>,
      (await BrandModel.find({ isActive: true })
        .sort({ brandName: 1 })
        .select("brandName")
        .lean()
        .exec()) as Array<{
        _id: unknown;
        brandName?: string;
      }>,
      (await ProductTypeModel.find()
        .sort({ name: 1 })
        .select("name code")
        .lean()
        .exec()) as Array<{
        _id: unknown;
        name?: string;
        code?: string;
      }>,
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));
    const page = clampPage(requestedPage, totalPages);

    const products = (await ProductModel.find(filter)
      .sort(sortMap[sort] ?? sortMap.newest)
      .skip((page - 1) * limit)
      .limit(limit)
      .select(
        "productName slug categoryId brandId status visibility isFeatured isNewArrival images createdAt updatedAt",
      )
      .lean()
      .exec()) as Array<{
      _id: unknown;
      productName?: string;
      slug?: string;
      categoryId?: unknown;
      brandId?: unknown;
      status?: string;
      visibility?: string;
      isFeatured?: boolean;
      isNewArrival?: boolean;
      images?: Array<{
        assetId?: unknown;
        isPrimary?: boolean;
      }>;
      createdAt?: Date;
      updatedAt?: Date;
    }>;

    const productIds = products.map((product) => toId(product._id));
    const variants = productIds.length
      ? ((await ProductVariantModel.find({
          productId: { $in: toObjectIdList(productIds) },
        })
          .sort({ isDefault: -1, createdAt: 1 })
          .select(
            "productId sku unitPrice stockQty reservedQty availableQty lowStockThreshold trackInventory allowBackorder isDefault isActive images",
          )
          .lean()
          .exec()) as Array<{
          _id: unknown;
          productId?: unknown;
          sku?: string;
          unitPrice?: number;
          stockQty?: number;
          reservedQty?: number;
          availableQty?: number;
          lowStockThreshold?: number;
          trackInventory?: boolean;
          allowBackorder?: boolean;
          isDefault?: boolean;
          isActive?: boolean;
          images?: Array<{
            assetId?: unknown;
            isPrimary?: boolean;
          }>;
        }>)
      : [];

    const variantsByProduct = new Map<string, typeof variants>();

    for (const variant of variants) {
      const productIdValue = toId(variant.productId);
      const currentValue = variantsByProduct.get(productIdValue) ?? [];
      currentValue.push(variant);
      variantsByProduct.set(productIdValue, currentValue);
    }

    const categoryNameMap = await getCategoryNameMap(
      products.map((product) => toId(product.categoryId)).filter(Boolean),
    );
    const brandNameMap = await getBrandNameMap(
      products.map((product) => toId(product.brandId)).filter(Boolean),
    );

    return {
      filters: {
        query,
        categoryId,
        brandId,
        status,
        visibility,
        featured,
        newArrival,
        hasIssues,
        sort,
        page,
        limit,
      },
      metrics: [
        {
          label: "Active products",
          value: counts[0],
          hint: `${counts[3]} active variants linked across the catalog`,
        },
        {
          label: "Draft products",
          value: counts[1],
          hint: "Pending review or incomplete before publication",
        },
        {
          label: "Archived products",
          value: counts[2],
          hint: "Retained in the catalog but hidden from active selling",
        },
      ],
      items: products.map((product) => {
        const productVariants = variantsByProduct.get(toId(product._id)) ?? [];
        const defaultVariant =
          productVariants.find((variant) => toBooleanValue(variant.isDefault)) ??
          productVariants[0];
        const health = computeProductHealth({
          product,
          variants: productVariants,
        });

        return {
          id: toId(product._id),
          productName: toStringValue(product.productName),
          slug: toStringValue(product.slug),
          categoryName: categoryNameMap.get(toId(product.categoryId)) ?? null,
          brandName: brandNameMap.get(toId(product.brandId)) ?? null,
          status: toStringValue(product.status),
          visibility: toStringValue(product.visibility),
          isFeatured: toBooleanValue(product.isFeatured),
          isNewArrival: toBooleanValue(product.isNewArrival),
          variantCount: productVariants.length,
          defaultSku: defaultVariant ? toStringValue(defaultVariant.sku) : null,
          defaultPrice: defaultVariant ? toNumberValue(defaultVariant.unitPrice) : null,
          totalAvailableQty: health.totalAvailableQty,
          availabilityLabel: health.availabilityLabel,
          issueCount: health.issueCount,
          issueBadges: health.issues,
          createdAt: toDateValue(product.createdAt),
          updatedAt: toDateValue(product.updatedAt),
        };
      }),
      productTypes: productTypes.map((productType) => ({
        id: toId(productType._id),
        label: toStringValue(productType.name) || toStringValue(productType.code),
      })),
      categories: categories.map((category) => ({
        id: toId(category._id),
        label: toStringValue(category.fullSlugPath) || toStringValue(category.categoryName),
      })),
      brands: brands.map((brand) => ({
        id: toId(brand._id),
        label: toStringValue(brand.brandName),
      })),
      total,
      totalPages,
      page,
    };
  }

  async getProductEditorWorkspace(productId?: string): Promise<ProductEditorWorkspace> {
    await connectToDatabase();

    const [categories, brands, productTypes, taxClasses, collections, optionTypes, optionValues, sources] =
      await Promise.all([
        (await CategoryModel.find()
          .sort({ depth: 1, sortOrder: 1, categoryName: 1 })
          .select("categoryName fullSlugPath")
          .lean()
          .exec()) as Array<{
          _id: unknown;
          categoryName?: string;
          fullSlugPath?: string;
        }>,
        (await BrandModel.find()
          .sort({ brandName: 1 })
          .select("brandName")
          .lean()
          .exec()) as Array<{
          _id: unknown;
          brandName?: string;
        }>,
        (await ProductTypeModel.find()
          .sort({ name: 1 })
          .select("name code")
          .lean()
          .exec()) as Array<{
          _id: unknown;
          name?: string;
          code?: string;
        }>,
        (await TaxClassModel.find()
          .sort({ taxClassName: 1 })
          .select("taxClassName")
          .lean()
          .exec()) as Array<{
          _id: unknown;
          taxClassName?: string;
        }>,
        (await CollectionModel.find()
          .sort({ collectionName: 1 })
          .select("collectionName")
          .lean()
          .exec()) as Array<{
          _id: unknown;
          collectionName?: string;
        }>,
        (await OptionTypeModel.find()
          .sort({ optionName: 1 })
          .select("optionName")
          .lean()
          .exec()) as Array<{
          _id: unknown;
          optionName?: string;
        }>,
        (await OptionValueModel.find()
          .sort({ sortOrder: 1, valueName: 1 })
          .select("optionTypeId valueName valueCode")
          .lean()
          .exec()) as Array<{
          _id: unknown;
          optionTypeId?: unknown;
          valueName?: string;
          valueCode?: string;
        }>,
        (await SourcingSourceModel.find({ isActive: true })
          .sort({ sourceName: 1 })
          .select("sourceName")
          .lean()
          .exec()) as Array<{
          _id: unknown;
          sourceName?: string;
        }>,
      ]);

    let product: ProductEditorWorkspace["product"] = null;
    let variants: ProductEditorWorkspace["variants"] = [];
    let variantSources: ProductEditorWorkspace["variantSources"] = [];

    if (productId && Types.ObjectId.isValid(productId)) {
      const productDocument = (await ProductModel.findById(productId)
        .lean()
        .exec()) as
        | {
            _id: unknown;
            productName?: string;
            slug?: string;
            productTypeId?: unknown;
            categoryId?: unknown;
            brandId?: unknown;
            taxClassId?: unknown;
            shortDescription?: string;
            description?: string;
            material?: string;
            careInstructions?: string;
            warrantyInfo?: string;
            conditionType?: string;
            status?: string;
            visibility?: string;
            isFeatured?: boolean;
            isNewArrival?: boolean;
            isBestSeller?: boolean;
            seoTitle?: string;
            seoDescription?: string;
            collectionIds?: unknown[];
            optionTypeIds?: unknown[];
            images?: Array<{
              assetId?: unknown;
              isPrimary?: boolean;
              sortOrder?: number;
            }>;
            specifications?: Array<{
              specGroup?: string;
              specKey?: string;
              specValue?: string;
            }>;
          }
        | null;

      if (productDocument) {
        const productIssueDocuments = (await ProductVariantModel.find({ productId })
          .select(
            "sku unitPrice stockQty reservedQty availableQty trackInventory allowBackorder isActive lowStockThreshold images",
          )
          .lean()
          .exec()) as Array<{
          sku?: string;
          unitPrice?: number;
          stockQty?: number;
          reservedQty?: number;
          availableQty?: number;
          trackInventory?: boolean;
          allowBackorder?: boolean;
          isActive?: boolean;
          lowStockThreshold?: number;
          images?: Array<{
            assetId?: unknown;
            isPrimary?: boolean;
          }>;
        }>;
        const productIssues = computeProductIssues({
          product: {
            categoryId: productDocument.categoryId,
            status: productDocument.status,
            visibility: productDocument.visibility,
            images: productDocument.images ?? [],
          },
          variants: productIssueDocuments,
        }).issues;

        product = {
          id: toId(productDocument._id),
          productName: toStringValue(productDocument.productName),
          slug: toStringValue(productDocument.slug),
          productTypeId: toId(productDocument.productTypeId),
          categoryId: toId(productDocument.categoryId),
          brandId: toId(productDocument.brandId),
          taxClassId: toId(productDocument.taxClassId),
          shortDescription: toStringValue(productDocument.shortDescription),
          description: toStringValue(productDocument.description),
          material: toStringValue(productDocument.material),
          careInstructions: toStringValue(productDocument.careInstructions),
          warrantyInfo: toStringValue(productDocument.warrantyInfo),
          conditionType: toStringValue(productDocument.conditionType) || "NEW",
          status: toStringValue(productDocument.status) || "DRAFT",
          visibility: toStringValue(productDocument.visibility) || "PUBLIC",
          isFeatured: toBooleanValue(productDocument.isFeatured),
          isNewArrival: toBooleanValue(productDocument.isNewArrival),
          isBestSeller: toBooleanValue(productDocument.isBestSeller),
          seoTitle: toStringValue(productDocument.seoTitle),
          seoDescription: toStringValue(productDocument.seoDescription),
          collectionIds: (productDocument.collectionIds ?? []).map((value) => toId(value)),
          optionTypeIds: (productDocument.optionTypeIds ?? []).map((value) => toId(value)),
          images: (productDocument.images ?? []).map((image) => ({
            assetId: toId(image.assetId),
            isPrimary: toBooleanValue(image.isPrimary),
            sortOrder: toNumberValue(image.sortOrder),
          })),
          specificationsText: (productDocument.specifications ?? [])
            .map((specification) =>
              [
                toStringValue(specification.specGroup),
                toStringValue(specification.specKey),
                toStringValue(specification.specValue),
              ]
                .filter(Boolean)
                .join(" | "),
            )
            .join("\n"),
          issues: productIssues,
        };

        const variantDocuments = (await ProductVariantModel.find({ productId })
          .sort({ isDefault: -1, createdAt: 1 })
          .lean()
          .exec()) as Array<{
          _id: unknown;
          optionValueIds?: unknown[];
          variantName?: string;
          sku?: string;
          unitPrice?: number;
          compareAtPrice?: number;
          costPrice?: number;
          stockQty?: number;
          reservedQty?: number;
          availableQty?: number;
          lowStockThreshold?: number;
          trackInventory?: boolean;
          allowBackorder?: boolean;
          isDefault?: boolean;
          isActive?: boolean;
          images?: Array<{
            assetId?: unknown;
            isPrimary?: boolean;
            sortOrder?: number;
          }>;
        }>;

        const optionValueMap = new Map(
          optionValues.map((value) => [
            toId(value._id),
            [toStringValue(value.valueName), toStringValue(value.valueCode)]
              .filter(Boolean)
              .join(" "),
          ]),
        );

        variants = variantDocuments.map((variant) => {
          const availability = getVariantAvailabilityState(variant);

          return {
            id: toId(variant._id),
            variantName: toNullableString(variant.variantName),
            sku: toStringValue(variant.sku),
            optionSummary: (variant.optionValueIds ?? [])
              .map((value) => optionValueMap.get(toId(value)))
              .filter((value): value is string => Boolean(value))
              .join(" / "),
            unitPrice: toNumberValue(variant.unitPrice),
            compareAtPrice:
              variant.compareAtPrice === undefined
                ? null
                : toNumberValue(variant.compareAtPrice),
            costPrice:
              variant.costPrice === undefined ? null : toNumberValue(variant.costPrice),
            stockQty: toNumberValue(variant.stockQty),
            reservedQty: toNumberValue(variant.reservedQty),
            availableQty: toNumberValue(variant.availableQty),
            lowStockThreshold: toNumberValue(variant.lowStockThreshold),
            trackInventory: variant.trackInventory !== false,
            allowBackorder: toBooleanValue(variant.allowBackorder),
            availabilityLabel: availability.label,
            isSellable: availability.isSellable,
            isDefault: toBooleanValue(variant.isDefault),
            isActive: toBooleanValue(variant.isActive),
            sourceCount: 0,
            images: (variant.images ?? []).map((image) => ({
              assetId: toId(image.assetId),
              isPrimary: toBooleanValue(image.isPrimary),
              sortOrder: toNumberValue(image.sortOrder),
            })),
          };
        });

        const variantIds = variants.map((variant) => variant.id);
        const sourceDocuments = variantIds.length
          ? ((await VariantSourceModel.find({
              variantId: { $in: toObjectIdList(variantIds) },
            })
              .sort({ isPreferred: -1, createdAt: -1 })
              .lean()
              .exec()) as Array<{
              _id: unknown;
              variantId?: unknown;
              sourcingSourceId?: unknown;
              sourceSku?: string;
              sourceProductUrl?: string;
              sourcePrice?: number;
              isPreferred?: boolean;
              isActive?: boolean;
            }>)
          : [];

        const sourceNameMap = await getSourceNameMap(
          sourceDocuments.map((sourceDocument) => toId(sourceDocument.sourcingSourceId)),
        );

        const sourceCounts = new Map<string, number>();

        for (const sourceDocument of sourceDocuments) {
          const variantIdValue = toId(sourceDocument.variantId);
          sourceCounts.set(variantIdValue, (sourceCounts.get(variantIdValue) ?? 0) + 1);
        }

        variants = variants.map((variant) => ({
          ...variant,
          sourceCount: sourceCounts.get(variant.id) ?? 0,
        }));

        variantSources = sourceDocuments.map((sourceDocument) => ({
          id: toId(sourceDocument._id),
          variantId: toId(sourceDocument.variantId),
          sourceName:
            sourceNameMap.get(toId(sourceDocument.sourcingSourceId)) ?? "Unknown source",
          sourceSku: toNullableString(sourceDocument.sourceSku),
          sourceProductUrl: toStringValue(sourceDocument.sourceProductUrl),
          sourcePrice:
            sourceDocument.sourcePrice === undefined
              ? null
              : toNumberValue(sourceDocument.sourcePrice),
          isPreferred: toBooleanValue(sourceDocument.isPreferred),
          isActive: toBooleanValue(sourceDocument.isActive),
        }));
      }
    }

    const valuesByType = new Map<string, Array<{ id: string; label: string }>>();

    for (const optionValue of optionValues) {
      const optionTypeId = toId(optionValue.optionTypeId);
      const currentValues = valuesByType.get(optionTypeId) ?? [];
      currentValues.push({
        id: toId(optionValue._id),
        label:
          [toStringValue(optionValue.valueName), toStringValue(optionValue.valueCode)]
            .filter(Boolean)
            .join(" "),
      });
      valuesByType.set(optionTypeId, currentValues);
    }

    return {
      product,
      categories: categories.map((category) => ({
        id: toId(category._id),
        label: toStringValue(category.fullSlugPath) || toStringValue(category.categoryName),
      })),
      brands: brands.map((brand) => ({
        id: toId(brand._id),
        label: toStringValue(brand.brandName),
      })),
      productTypes: productTypes.map((productType) => ({
        id: toId(productType._id),
        label: `${toStringValue(productType.name)} (${toStringValue(productType.code)})`,
      })),
      taxClasses: taxClasses.map((taxClass) => ({
        id: toId(taxClass._id),
        label: toStringValue(taxClass.taxClassName),
      })),
      collections: collections.map((collection) => ({
        id: toId(collection._id),
        label: toStringValue(collection.collectionName),
      })),
      optionGroups: optionTypes.map((optionType) => ({
        id: toId(optionType._id),
        name: toStringValue(optionType.optionName),
        values: valuesByType.get(toId(optionType._id)) ?? [],
      })),
      sourcingSources: sources.map((source) => ({
        id: toId(source._id),
        label: toStringValue(source.sourceName),
      })),
      variants,
      variantSources,
    };
  }

  async getInventoryWorkspace(searchParams: AdminSearchParams): Promise<InventoryWorkspace> {
    await connectToDatabase();

    const query = readSearchParam(searchParams, "q").trim();
    const stockView = readSearchParam(searchParams, "stockView") || "all";
    const active = readSearchParam(searchParams, "active") || "active";
    const sort = readSearchParam(searchParams, "sort") || "available_asc";
    const limit = ensureLimit(readNumberParam(searchParams, "limit", PAGE_LIMIT));
    const requestedPage = readNumberParam(searchParams, "page", 1);
    const selectedVariantId = readSearchParam(searchParams, "variantId");
    const selectedRestockId = readSearchParam(searchParams, "restockId");

    const filter: Record<string, unknown> = {};

    if (active === "active") {
      filter.isActive = true;
    }

    if (active === "inactive") {
      filter.isActive = false;
    }

    if (stockView === "low") {
      filter.trackInventory = true;
      filter.$expr = { $lte: ["$availableQty", "$lowStockThreshold"] };
    }

    if (stockView === "out") {
      filter.trackInventory = true;
      filter.availableQty = { $lte: 0 };
    }

    if (query) {
      const regex = new RegExp(escapeRegex(query), "i");
      const matchingProducts = (await ProductModel.find({
        productName: regex,
      })
        .select("_id")
        .lean()
        .exec()) as Array<{ _id: unknown }>;

      filter.$or = [
        { sku: regex },
        { variantName: regex },
        ...(matchingProducts.length > 0
          ? [{ productId: { $in: matchingProducts.map((product) => product._id) } }]
          : []),
      ];
    }

    const sortMap: Record<string, Record<string, 1 | -1>> = {
      available_asc: { availableQty: 1, updatedAt: -1 },
      available_desc: { availableQty: -1, updatedAt: -1 },
      stock_desc: { stockQty: -1, updatedAt: -1 },
      updated: { updatedAt: -1, _id: -1 },
    };

    const [total, counts, lowStockRows, restockRows, sourceRows, platformRows] =
      await Promise.all([
        ProductVariantModel.countDocuments(filter).exec(),
        Promise.all([
          ProductVariantModel.countDocuments({ isActive: true }).exec(),
          ProductVariantModel.countDocuments({
            isActive: true,
            trackInventory: true,
            $expr: { $lte: ["$availableQty", "$lowStockThreshold"] },
          }).exec(),
          ProductVariantModel.countDocuments({
            isActive: true,
            trackInventory: true,
            availableQty: { $lte: 0 },
          }).exec(),
          RestockOrderModel.countDocuments({
            status: { $in: ["ORDERED", "PAID", "IN_TRANSIT", "PARTIALLY_RECEIVED"] },
          }).exec(),
        ]),
        (await ProductVariantModel.find({
          isActive: true,
          trackInventory: true,
          $expr: { $lte: ["$availableQty", "$lowStockThreshold"] },
        })
          .sort({ availableQty: 1, updatedAt: -1 })
          .limit(8)
          .select("productId sku variantName availableQty lowStockThreshold")
          .lean()
          .exec()) as Array<{
          _id: unknown;
          productId?: unknown;
          sku?: string;
          variantName?: string;
          availableQty?: number;
          lowStockThreshold?: number;
        }>,
        (await RestockOrderModel.find()
          .sort({ createdAt: -1 })
          .limit(10)
          .select("restockNo status sourcingSourceId grandTotal expectedArrivalAt createdAt")
          .lean()
          .exec()) as Array<{
          _id: unknown;
          restockNo?: string;
          status?: string;
          sourcingSourceId?: unknown;
          grandTotal?: number;
          expectedArrivalAt?: Date;
          createdAt?: Date;
        }>,
        (await SourcingSourceModel.find()
          .sort({ updatedAt: -1 })
          .limit(10)
          .select("sourceName sourcingPlatformId phone email isActive")
          .lean()
          .exec()) as Array<{
          _id: unknown;
          sourceName?: string;
          sourcingPlatformId?: unknown;
          phone?: string;
          email?: string;
          isActive?: boolean;
        }>,
        (await SourcingPlatformModel.find()
          .sort({ name: 1 })
          .select("name")
          .lean()
          .exec()) as Array<{
          _id: unknown;
          name?: string;
        }>,
      ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));
    const page = clampPage(requestedPage, totalPages);

    const variantRows = (await ProductVariantModel.find(filter)
      .sort(sortMap[sort] ?? sortMap.available_asc)
      .skip((page - 1) * limit)
      .limit(limit)
      .select(
        "productId sku variantName stockQty reservedQty availableQty lowStockThreshold isActive updatedAt",
      )
      .lean()
      .exec()) as Array<{
      _id: unknown;
      productId?: unknown;
      sku?: string;
      variantName?: string;
      stockQty?: number;
      reservedQty?: number;
      availableQty?: number;
      lowStockThreshold?: number;
      isActive?: boolean;
      updatedAt?: Date;
    }>;

    const variantIds = variantRows.map((row) => toId(row._id));
    const productMap = await getProductLabelMap(
      variantRows.map((row) => toId(row.productId)).filter(Boolean),
    );

    const sourceCountsRows =
      variantIds.length > 0
        ? ((await VariantSourceModel.aggregate<{
            _id: Types.ObjectId;
            count: number;
          }>([
            {
              $match: {
                variantId: { $in: toObjectIdList(variantIds) },
              },
            },
            {
              $group: {
                _id: "$variantId",
                count: { $sum: 1 },
              },
            },
          ]).exec()) as Array<{ _id: Types.ObjectId; count: number }>)
        : [];

    const sourceCountMap = new Map(
      sourceCountsRows.map((row) => [toId(row._id), toNumberValue(row.count)]),
    );

    const lowStockProductMap = await getProductLabelMap(
      lowStockRows.map((row) => toId(row.productId)).filter(Boolean),
    );

    const sourceNameMap = await getSourceNameMap(
      restockRows.map((row) => toId(row.sourcingSourceId)).filter(Boolean),
    );

    const platformNameMap = new Map(
      platformRows.map((row) => [toId(row._id), toStringValue(row.name)]),
    );

    const variantSourceCounts =
      sourceRows.length > 0
        ? ((await VariantSourceModel.aggregate<{
            _id: Types.ObjectId;
            count: number;
          }>([
            {
              $match: {
                sourcingSourceId: {
                  $in: toObjectIdList(sourceRows.map((row) => toId(row._id))),
                },
              },
            },
            {
              $group: {
                _id: "$sourcingSourceId",
                count: { $sum: 1 },
              },
            },
          ]).exec()) as Array<{ _id: Types.ObjectId; count: number }>)
        : [];

    const variantSourceCountMap = new Map(
      variantSourceCounts.map((row) => [toId(row._id), toNumberValue(row.count)]),
    );

    let selectedVariant: InventoryWorkspace["selectedVariant"] = null;

    if (Types.ObjectId.isValid(selectedVariantId)) {
      const variant = (await ProductVariantModel.findById(selectedVariantId)
        .lean()
        .exec()) as
        | {
            _id: unknown;
            productId?: unknown;
            variantName?: string;
            sku?: string;
            stockQty?: number;
            reservedQty?: number;
            availableQty?: number;
            lowStockThreshold?: number;
            isActive?: boolean;
          }
        | null;

      if (variant) {
        const [sources, adjustments, selectedVariantProductMap] = await Promise.all([
          (await VariantSourceModel.find({ variantId: selectedVariantId })
            .sort({ isPreferred: -1, updatedAt: -1 })
            .lean()
            .exec()) as Array<{
            _id: unknown;
            sourcingSourceId?: unknown;
            sourceSku?: string;
            sourceProductUrl?: string;
            sourcePrice?: number;
            isPreferred?: boolean;
            isActive?: boolean;
          }>,
          (await StockAdjustmentModel.find({ variantId: selectedVariantId })
            .sort({ createdAt: -1 })
            .limit(8)
            .lean()
            .exec()) as Array<{
            _id: unknown;
            adjustmentType?: string;
            quantity?: number;
            note?: string;
            createdAt?: Date;
          }>,
          getProductLabelMap([toId(variant.productId)]),
        ]);

        const variantSourceNameMap = await getSourceNameMap(
          sources.map((source) => toId(source.sourcingSourceId)),
        );
        const productLabel = selectedVariantProductMap.get(toId(variant.productId));

        selectedVariant = {
          id: toId(variant._id),
          productId: toId(variant.productId),
          productName: productLabel?.productName ?? "Product",
          variantName: toNullableString(variant.variantName),
          sku: toStringValue(variant.sku),
          stockQty: toNumberValue(variant.stockQty),
          reservedQty: toNumberValue(variant.reservedQty),
          availableQty: toNumberValue(variant.availableQty),
          lowStockThreshold: toNumberValue(variant.lowStockThreshold),
          isActive: toBooleanValue(variant.isActive),
          sources: sources.map((source) => ({
            id: toId(source._id),
            sourceName:
              variantSourceNameMap.get(toId(source.sourcingSourceId)) ?? "Unknown source",
            sourceSku: toNullableString(source.sourceSku),
            sourceProductUrl: toStringValue(source.sourceProductUrl),
            sourcePrice:
              source.sourcePrice === undefined ? null : toNumberValue(source.sourcePrice),
            isPreferred: toBooleanValue(source.isPreferred),
            isActive: toBooleanValue(source.isActive),
          })),
          adjustments: adjustments.map((adjustment) => ({
            id: toId(adjustment._id),
            adjustmentType: toStringValue(adjustment.adjustmentType),
            quantity: toNumberValue(adjustment.quantity),
            note: toNullableString(adjustment.note),
            createdAt: toDateValue(adjustment.createdAt),
          })),
        };
      }
    }

    const selectedRestock = await getSelectedRestockRecord(selectedRestockId);

    return {
      filters: {
        query,
        stockView,
        active,
        sort,
        page,
        limit,
      },
      metrics: [
        {
          label: "Active variants",
          value: counts[0],
          hint: "Variants currently available for operations",
        },
        {
          label: "Low stock variants",
          value: counts[1],
          hint: "Available quantity is at or below threshold",
        },
        {
          label: "Out of stock",
          value: counts[2],
          hint: "Available quantity is zero or below",
        },
        {
          label: "Restocks moving",
          value: counts[3],
          hint: "Ordered, paid, in transit, or partially received",
        },
      ],
      items: variantRows.map((row) => {
        const productLabel = productMap.get(toId(row.productId));

        return {
          id: toId(row._id),
          productId: toId(row.productId),
          productName: productLabel?.productName ?? "Product",
          productSlug: productLabel?.slug ?? "",
          sku: toStringValue(row.sku),
          variantName: toNullableString(row.variantName),
          stockQty: toNumberValue(row.stockQty),
          reservedQty: toNumberValue(row.reservedQty),
          availableQty: toNumberValue(row.availableQty),
          lowStockThreshold: toNumberValue(row.lowStockThreshold),
          isActive: toBooleanValue(row.isActive),
          sourceCount: sourceCountMap.get(toId(row._id)) ?? 0,
          updatedAt: toDateValue(row.updatedAt),
        };
      }),
      lowStockItems: lowStockRows.map((row) => ({
        id: toId(row._id),
        productName:
          lowStockProductMap.get(toId(row.productId))?.productName ?? "Product",
        sku: toStringValue(row.sku),
        variantName: toNullableString(row.variantName),
        availableQty: toNumberValue(row.availableQty),
        lowStockThreshold: toNumberValue(row.lowStockThreshold),
      })),
      selectedVariant,
      restockOrders: restockRows.map((row) => ({
        id: toId(row._id),
        restockNo: toStringValue(row.restockNo),
        status: toStringValue(row.status),
        sourceName: sourceNameMap.get(toId(row.sourcingSourceId)) ?? null,
        grandTotal: toNumberValue(row.grandTotal),
        expectedArrivalAt: toDateValue(row.expectedArrivalAt),
        createdAt: toDateValue(row.createdAt),
      })),
      selectedRestock,
      sources: sourceRows.map((row) => ({
        id: toId(row._id),
        sourceName: toStringValue(row.sourceName),
        platformName: platformNameMap.get(toId(row.sourcingPlatformId)) ?? null,
        phone: toNullableString(row.phone),
        email: toNullableString(row.email),
        isActive: toBooleanValue(row.isActive),
        variantSourceCount: variantSourceCountMap.get(toId(row._id)) ?? 0,
      })),
      sourceOptions: sourceRows.map((row) => ({
        id: toId(row._id),
        label: toStringValue(row.sourceName),
      })),
      platformOptions: platformRows.map((row) => ({
        id: toId(row._id),
        label: toStringValue(row.name),
      })),
      total,
      totalPages,
      page,
    };
  }

  async getRestocksWorkspace(searchParams: AdminSearchParams): Promise<RestocksWorkspace> {
    await connectToDatabase();

    const query = readSearchParam(searchParams, "q").trim();
    const status = readSearchParam(searchParams, "status");
    const sort = readSearchParam(searchParams, "sort") || "newest";
    const limit = ensureLimit(readNumberParam(searchParams, "limit", PAGE_LIMIT));
    const requestedPage = readNumberParam(searchParams, "page", 1);
    const selectedRestockId = readSearchParam(searchParams, "restockId");

    const filter: Record<string, unknown> = {};

    if (status) {
      filter.status = status;
    }

    if (query) {
      const regex = new RegExp(escapeRegex(query), "i");
      const matchingSources = (await SourcingSourceModel.find({
        sourceName: regex,
      })
        .select("_id")
        .lean()
        .exec()) as Array<{ _id: unknown }>;

      filter.$or = [
        { restockNo: regex },
        { trackingNo: regex },
        { sourceOrderRef: regex },
        ...(matchingSources.length > 0
          ? [{ sourcingSourceId: { $in: matchingSources.map((source) => source._id) } }]
          : []),
      ];
    }

    const sortMap: Record<string, Record<string, 1 | -1>> = {
      newest: { createdAt: -1, _id: -1 },
      oldest: { createdAt: 1, _id: 1 },
      eta_desc: { expectedArrivalAt: -1, createdAt: -1 },
      eta_asc: { expectedArrivalAt: 1, createdAt: -1 },
    };

    const [total, counts, sourceOptionRows] = await Promise.all([
      RestockOrderModel.countDocuments(filter).exec(),
      Promise.all([
        RestockOrderModel.countDocuments({
          status: { $in: ["ORDERED", "PAID", "IN_TRANSIT", "PARTIALLY_RECEIVED"] },
        }).exec(),
        RestockOrderModel.countDocuments({ status: "RECEIVED" }).exec(),
        RestockOrderModel.countDocuments({ status: "DRAFT" }).exec(),
        RestockOrderModel.countDocuments({ status: "CANCELLED" }).exec(),
      ]),
      (await SourcingSourceModel.find({ isActive: true })
        .sort({ sourceName: 1 })
        .select("sourceName")
        .lean()
        .exec()) as Array<{
        _id: unknown;
        sourceName?: string;
      }>,
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));
    const page = clampPage(requestedPage, totalPages);

    const pagedRows = (await RestockOrderModel.find(filter)
      .sort(sortMap[sort] ?? sortMap.newest)
      .skip((page - 1) * limit)
      .limit(limit)
      .select(
        "restockNo status sourcingSourceId grandTotal expectedArrivalAt createdAt trackingNo sourceOrderRef",
      )
      .lean()
      .exec()) as Array<{
      _id: unknown;
      restockNo?: string;
      status?: string;
      sourcingSourceId?: unknown;
      grandTotal?: number;
      expectedArrivalAt?: Date;
      createdAt?: Date;
      trackingNo?: string;
      sourceOrderRef?: string;
    }>;

    const sourceNameMap = await getSourceNameMap(
      pagedRows.map((row) => toId(row.sourcingSourceId)).filter(Boolean),
    );
    const selectedRestock = await getSelectedRestockRecord(selectedRestockId);

    return {
      filters: {
        query,
        status,
        sort,
        page,
        limit,
      },
      metrics: [
        {
          label: "Moving restocks",
          value: counts[0],
          hint: "Ordered, paid, in transit, or partially received",
        },
        {
          label: "Received",
          value: counts[1],
          hint: "Inbound orders fully received into stock",
        },
        {
          label: "Drafts",
          value: counts[2],
          hint: "Restock orders still being prepared",
        },
        {
          label: "Cancelled",
          value: counts[3],
          hint: "Inbound orders closed without receiving",
        },
      ],
      items: pagedRows.map((row) => ({
        id: toId(row._id),
        restockNo: toStringValue(row.restockNo),
        status: toStringValue(row.status),
        sourceName: sourceNameMap.get(toId(row.sourcingSourceId)) ?? null,
        trackingNo: toNullableString(row.trackingNo),
        sourceOrderRef: toNullableString(row.sourceOrderRef),
        grandTotal: toNumberValue(row.grandTotal),
        expectedArrivalAt: toDateValue(row.expectedArrivalAt),
        createdAt: toDateValue(row.createdAt),
      })),
      selectedRestock,
      sourceOptions: sourceOptionRows.map((row) => ({
        id: toId(row._id),
        label: toStringValue(row.sourceName),
      })),
      total,
      totalPages,
      page,
    };
  }

  async getSupplierWorkspace(searchParams: AdminSearchParams): Promise<SupplierWorkspace> {
    await connectToDatabase();

    const query = readSearchParam(searchParams, "q").trim();
    const platformId = readSearchParam(searchParams, "platformId");
    const active = readSearchParam(searchParams, "active") || "active";
    const sort = readSearchParam(searchParams, "sort") || "updated";
    const limit = ensureLimit(readNumberParam(searchParams, "limit", SIMPLE_RECORD_LIMIT));
    const requestedPage = readNumberParam(searchParams, "page", 1);
    const selectedSourceId = readSearchParam(searchParams, "sourceId");
    const selectedVariantId = readSearchParam(searchParams, "variantId");

    const filter: Record<string, unknown> = {};

    if (query) {
      const regex = new RegExp(escapeRegex(query), "i");
      filter.$or = [
        { sourceName: regex },
        { contactName: regex },
        { email: regex },
        { phone: regex },
      ];
    }

    if (active === "active") {
      filter.isActive = true;
    }

    if (active === "inactive") {
      filter.isActive = false;
    }

    if (platformId && Types.ObjectId.isValid(platformId)) {
      filter.sourcingPlatformId = new Types.ObjectId(platformId);
    }

    const sortMap: Record<string, Record<string, 1 | -1>> = {
      updated: { updatedAt: -1, _id: -1 },
      name_asc: { sourceName: 1, updatedAt: -1 },
      name_desc: { sourceName: -1, updatedAt: -1 },
    };

    const [total, metricsRaw, platformRows, sourceOptionRows] = await Promise.all([
      SourcingSourceModel.countDocuments(filter).exec(),
      Promise.all([
        SourcingSourceModel.countDocuments({ isActive: true }).exec(),
        SourcingPlatformModel.countDocuments({ isActive: true }).exec(),
        VariantSourceModel.countDocuments({ isActive: true }).exec(),
        VariantSourceModel.countDocuments({
          isActive: true,
          isPreferred: true,
        }).exec(),
      ]),
      (await SourcingPlatformModel.find()
        .sort({ name: 1 })
        .select("name")
        .lean()
        .exec()) as Array<{
        _id: unknown;
        name?: string;
      }>,
      (await SourcingSourceModel.find({ isActive: true })
        .sort({ sourceName: 1 })
        .select("sourceName")
        .lean()
        .exec()) as Array<{
        _id: unknown;
        sourceName?: string;
      }>,
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));
    const page = clampPage(requestedPage, totalPages);

    const sourceRows = (await SourcingSourceModel.find(filter)
      .sort(sortMap[sort] ?? sortMap.updated)
      .skip((page - 1) * limit)
      .limit(limit)
      .select("sourceName sourcingPlatformId contactName phone email isActive updatedAt")
      .lean()
      .exec()) as Array<{
      _id: unknown;
      sourceName?: string;
      sourcingPlatformId?: unknown;
      contactName?: string;
      phone?: string;
      email?: string;
      isActive?: boolean;
      updatedAt?: Date;
    }>;

    const platformNameMap = new Map(
      platformRows.map((platform) => [toId(platform._id), toStringValue(platform.name)]),
    );

    const variantSourceCounts =
      sourceRows.length > 0
        ? ((await VariantSourceModel.aggregate<{
            _id: Types.ObjectId;
            count: number;
          }>([
            {
              $match: {
                sourcingSourceId: {
                  $in: toObjectIdList(sourceRows.map((row) => toId(row._id))),
                },
              },
            },
            {
              $group: {
                _id: "$sourcingSourceId",
                count: { $sum: 1 },
              },
            },
          ]).exec()) as Array<{ _id: Types.ObjectId; count: number }>)
        : [];

    const variantSourceCountMap = new Map(
      variantSourceCounts.map((row) => [toId(row._id), toNumberValue(row.count)]),
    );

    let selectedSource: SupplierWorkspace["selectedSource"] = null;

    if (Types.ObjectId.isValid(selectedSourceId)) {
      const source = (await SourcingSourceModel.findById(selectedSourceId)
        .lean()
        .exec()) as
        | {
            _id: unknown;
            sourcingPlatformId?: unknown;
            sourceName?: string;
            contactName?: string;
            phone?: string;
            email?: string;
            shopUrl?: string;
            note?: string;
            isActive?: boolean;
          }
        | null;

      if (source) {
        const linkRows = (await VariantSourceModel.find({
          sourcingSourceId: selectedSourceId,
        })
          .sort({ isPreferred: -1, updatedAt: -1 })
          .lean()
          .exec()) as Array<{
          _id: unknown;
          variantId?: unknown;
          sourceSku?: string;
          sourceProductName?: string;
          sourceProductUrl?: string;
          sourcePrice?: number;
          isPreferred?: boolean;
          isActive?: boolean;
          updatedAt?: Date;
        }>;

        const variants = linkRows.length
          ? ((await ProductVariantModel.find({
              _id: { $in: toObjectIdList(linkRows.map((link) => toId(link.variantId))) },
            })
              .select("productId variantName sku")
              .lean()
              .exec()) as Array<{
              _id: unknown;
              productId?: unknown;
              variantName?: string;
              sku?: string;
            }>)
          : [];
        const variantMap = new Map(variants.map((variant) => [toId(variant._id), variant]));
        const productMap = await getProductLabelMap(
          variants.map((variant) => toId(variant.productId)).filter(Boolean),
        );

        selectedSource = {
          id: toId(source._id),
          sourcingPlatformId: toId(source.sourcingPlatformId),
          sourceName: toStringValue(source.sourceName),
          contactName: toNullableString(source.contactName),
          phone: toNullableString(source.phone),
          email: toNullableString(source.email),
          shopUrl: toNullableString(source.shopUrl),
          note: toNullableString(source.note),
          isActive: toBooleanValue(source.isActive),
          links: linkRows.map((link) => {
            const variant = variantMap.get(toId(link.variantId));
            const productLabel = variant
              ? productMap.get(toId(variant.productId))
              : undefined;

            return {
              id: toId(link._id),
              variantId: toId(link.variantId),
              variantLabel:
                toNullableString(variant?.variantName) ??
                toStringValue(variant?.sku) ??
                "Variant",
              productName: productLabel?.productName ?? "Product",
              sourceSku: toNullableString(link.sourceSku),
              sourceProductName: toNullableString(link.sourceProductName),
              sourceProductUrl: toStringValue(link.sourceProductUrl),
              sourcePrice:
                link.sourcePrice === undefined ? null : toNumberValue(link.sourcePrice),
              isPreferred: toBooleanValue(link.isPreferred),
              isActive: toBooleanValue(link.isActive),
              updatedAt: toDateValue(link.updatedAt),
            };
          }),
        };
      }
    }

    const variantOptionRows = (await ProductVariantModel.find({ isActive: true })
      .sort({ updatedAt: -1 })
      .limit(150)
      .select("productId variantName sku")
      .lean()
      .exec()) as Array<{
      _id: unknown;
      productId?: unknown;
      variantName?: string;
      sku?: string;
    }>;
    const variantProductMap = await getProductLabelMap(
      variantOptionRows.map((variant) => toId(variant.productId)).filter(Boolean),
    );

    return {
      filters: {
        query,
        platformId,
        active,
        sort,
        page,
        limit,
      },
      metrics: [
        {
          label: "Active suppliers",
          value: metricsRaw[0],
          hint: "Sources available for operational purchasing",
        },
        {
          label: "Platforms",
          value: metricsRaw[1],
          hint: "Marketplace or sourcing platform records",
        },
        {
          label: "Active links",
          value: metricsRaw[2],
          hint: "Variant-to-supplier links currently usable",
        },
        {
          label: "Preferred links",
          value: metricsRaw[3],
          hint: "Preferred supplier matches across variants",
        },
      ],
      items: sourceRows.map((row) => ({
        id: toId(row._id),
        sourceName: toStringValue(row.sourceName),
        platformName: platformNameMap.get(toId(row.sourcingPlatformId)) ?? null,
        contactName: toNullableString(row.contactName),
        phone: toNullableString(row.phone),
        email: toNullableString(row.email),
        isActive: toBooleanValue(row.isActive),
        variantSourceCount: variantSourceCountMap.get(toId(row._id)) ?? 0,
        updatedAt: toDateValue(row.updatedAt),
      })),
      selectedSource,
      sourceOptions: sourceOptionRows.map((row) => ({
        id: toId(row._id),
        label: toStringValue(row.sourceName),
      })),
      platformOptions: platformRows.map((row) => ({
        id: toId(row._id),
        label: toStringValue(row.name),
      })),
      variantOptions: variantOptionRows.map((row) => {
        const productLabel = variantProductMap.get(toId(row.productId));
        const variantLabel = toNullableString(row.variantName) ?? toStringValue(row.sku);

        return {
          id: toId(row._id),
          label: `${productLabel?.productName ?? "Product"} - ${variantLabel} (${toStringValue(row.sku)})`,
        };
      }),
      selectedVariantId,
      total,
      totalPages,
      page,
    };
  }

  async getOptionTypesWorkspace(
    searchParams: AdminSearchParams,
  ): Promise<OptionTypesWorkspace> {
    await connectToDatabase();

    const query = readSearchParam(searchParams, "q").trim();
    const sort = readSearchParam(searchParams, "sort") || "name_asc";
    const limit = ensureLimit(readNumberParam(searchParams, "limit", SIMPLE_RECORD_LIMIT));
    const requestedPage = readNumberParam(searchParams, "page", 1);
    const selectedId = readSearchParam(searchParams, "id");

    const filter: Record<string, unknown> = {};

    if (query) {
      const regex = new RegExp(escapeRegex(query), "i");
      filter.optionName = regex;
    }

    const sortMap: Record<string, Record<string, 1 | -1>> = {
      name_asc: { optionName: 1, _id: 1 },
      name_desc: { optionName: -1, _id: -1 },
      display: { displayType: 1, optionName: 1 },
    };

    const [total, metricsRaw] = await Promise.all([
      OptionTypeModel.countDocuments(filter).exec(),
      Promise.all([
        OptionTypeModel.countDocuments().exec(),
        OptionValueModel.countDocuments().exec(),
        ProductModel.countDocuments({ optionTypeIds: { $exists: true, $ne: [] } }).exec(),
      ]),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));
    const page = clampPage(requestedPage, totalPages);

    const optionTypeRows = (await OptionTypeModel.find(filter)
      .sort(sortMap[sort] ?? sortMap.name_asc)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .exec()) as Array<{
      _id: unknown;
      optionName?: string;
      displayType?: string;
    }>;

    const optionTypeIds = toObjectIdList(optionTypeRows.map((row) => toId(row._id)));
    const [valueCounts, productCounts] = await Promise.all([
      optionTypeIds.length > 0
        ? ((await OptionValueModel.aggregate<{
            _id: Types.ObjectId;
            count: number;
          }>([
            { $match: { optionTypeId: { $in: optionTypeIds } } },
            { $group: { _id: "$optionTypeId", count: { $sum: 1 } } },
          ]).exec()) as Array<{ _id: Types.ObjectId; count: number }>)
        : [],
      optionTypeIds.length > 0
        ? ((await ProductModel.aggregate<{
            _id: Types.ObjectId;
            count: number;
          }>([
            { $match: { optionTypeIds: { $in: optionTypeIds } } },
            { $unwind: "$optionTypeIds" },
            { $match: { optionTypeIds: { $in: optionTypeIds } } },
            { $group: { _id: "$optionTypeIds", count: { $sum: 1 } } },
          ]).exec()) as Array<{ _id: Types.ObjectId; count: number }>)
        : [],
    ]);

    const valueCountMap = new Map(
      valueCounts.map((row) => [toId(row._id), toNumberValue(row.count)]),
    );
    const productCountMap = new Map(
      productCounts.map((row) => [toId(row._id), toNumberValue(row.count)]),
    );

    let selectedOptionType: OptionTypesWorkspace["selectedOptionType"] = null;

    if (Types.ObjectId.isValid(selectedId)) {
      const optionType = (await OptionTypeModel.findById(selectedId)
        .lean()
        .exec()) as
        | {
            _id: unknown;
            optionName?: string;
            displayType?: string;
          }
        | null;

      if (optionType) {
        const valueRows = (await OptionValueModel.find({ optionTypeId: selectedId })
          .sort({ sortOrder: 1, valueName: 1 })
          .lean()
          .exec()) as Array<{
          _id: unknown;
          valueName?: string;
          valueCode?: string;
          swatchHex?: string;
          sortOrder?: number;
        }>;

        const valueIds = toObjectIdList(valueRows.map((row) => toId(row._id)));
        const [selectedProductCount, variantCounts] = await Promise.all([
          ProductModel.countDocuments({ optionTypeIds: selectedId }).exec(),
          valueIds.length > 0
            ? ((await ProductVariantModel.aggregate<{
                _id: Types.ObjectId;
                count: number;
              }>([
                { $match: { optionValueIds: { $in: valueIds } } },
                { $unwind: "$optionValueIds" },
                { $match: { optionValueIds: { $in: valueIds } } },
                { $group: { _id: "$optionValueIds", count: { $sum: 1 } } },
              ]).exec()) as Array<{ _id: Types.ObjectId; count: number }>)
            : [],
        ]);
        const variantCountMap = new Map(
          variantCounts.map((row) => [toId(row._id), toNumberValue(row.count)]),
        );

        selectedOptionType = {
          id: toId(optionType._id),
          optionName: toStringValue(optionType.optionName),
          displayType: toStringValue(optionType.displayType) || "TEXT",
          productCount: selectedProductCount,
          values: valueRows.map((row) => ({
            id: toId(row._id),
            valueName: toStringValue(row.valueName),
            valueCode: toNullableString(row.valueCode),
            swatchHex: toNullableString(row.swatchHex),
            sortOrder: toNumberValue(row.sortOrder),
            variantCount: variantCountMap.get(toId(row._id)) ?? 0,
          })),
        };
      }
    }

    return {
      filters: {
        query,
        sort,
        page,
        limit,
      },
      metrics: [
        {
          label: "Option types",
          value: metricsRaw[0],
          hint: "Reusable option groups such as size, color, and storage",
        },
        {
          label: "Option values",
          value: metricsRaw[1],
          hint: "Concrete values that variants can be assigned",
        },
        {
          label: "Products mapped",
          value: metricsRaw[2],
          hint: "Products currently configured with at least one option type",
        },
      ],
      items: optionTypeRows.map((row) => ({
        id: toId(row._id),
        optionName: toStringValue(row.optionName),
        displayType: toStringValue(row.displayType) || "TEXT",
        valueCount: valueCountMap.get(toId(row._id)) ?? 0,
        productCount: productCountMap.get(toId(row._id)) ?? 0,
      })),
      selectedOptionType,
      total,
      totalPages,
      page,
    };
  }

  async getPromotionsWorkspace(
    searchParams: AdminSearchParams,
  ): Promise<PromotionsWorkspace> {
    await connectToDatabase();

    const query = readSearchParam(searchParams, "q").trim();
    const active = readSearchParam(searchParams, "active") || "active";
    const sort = readSearchParam(searchParams, "sort") || "starts_desc";
    const limit = ensureLimit(readNumberParam(searchParams, "limit", SIMPLE_RECORD_LIMIT));
    const requestedPage = readNumberParam(searchParams, "page", 1);
    const selectedPromotionId = readSearchParam(searchParams, "promotionId");

    const filter: Record<string, unknown> = {};

    if (query) {
      const regex = new RegExp(escapeRegex(query), "i");
      filter.$or = [{ name: regex }, { code: regex }, { description: regex }];
    }

    if (active === "active") {
      filter.isActive = true;
    }

    if (active === "inactive") {
      filter.isActive = false;
    }

    const sortMap: Record<string, Record<string, 1 | -1>> = {
      starts_desc: { startsAt: -1, _id: -1 },
      starts_asc: { startsAt: 1, _id: 1 },
      name_asc: { name: 1, _id: 1 },
      name_desc: { name: -1, _id: -1 },
    };

    const now = new Date();
    const [total, metricsRaw] = await Promise.all([
      PromotionModel.countDocuments(filter).exec(),
      Promise.all([
        PromotionModel.countDocuments({ isActive: true }).exec(),
        PromotionModel.countDocuments({
          startsAt: { $gt: now },
        }).exec(),
        PromotionModel.countDocuments({ promotionType: "COUPON" }).exec(),
        CouponUsageLogModel.countDocuments().exec(),
      ]),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));
    const page = clampPage(requestedPage, totalPages);

    const promotionRows = (await PromotionModel.find(filter)
      .sort(sortMap[sort] ?? sortMap.starts_desc)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .exec()) as Array<{
      _id: unknown;
      code?: string;
      name?: string;
      promotionType?: string;
      discountType?: string;
      discountValue?: number;
      isActive?: boolean;
      startsAt?: Date;
      endsAt?: Date;
    }>;

    const promotionIds = toObjectIdList(promotionRows.map((row) => toId(row._id)));
    const [productCounts, variantCounts, groupCounts] = await Promise.all([
      promotionIds.length > 0
        ? ((await PromotionProductModel.aggregate<{
            _id: Types.ObjectId;
            count: number;
          }>([
            { $match: { promotionId: { $in: promotionIds } } },
            { $group: { _id: "$promotionId", count: { $sum: 1 } } },
          ]).exec()) as Array<{ _id: Types.ObjectId; count: number }>)
        : [],
      promotionIds.length > 0
        ? ((await PromotionVariantModel.aggregate<{
            _id: Types.ObjectId;
            count: number;
          }>([
            { $match: { promotionId: { $in: promotionIds } } },
            { $group: { _id: "$promotionId", count: { $sum: 1 } } },
          ]).exec()) as Array<{ _id: Types.ObjectId; count: number }>)
        : [],
      promotionIds.length > 0
        ? ((await PromotionCustomerGroupModel.aggregate<{
            _id: Types.ObjectId;
            count: number;
          }>([
            { $match: { promotionId: { $in: promotionIds } } },
            { $group: { _id: "$promotionId", count: { $sum: 1 } } },
          ]).exec()) as Array<{ _id: Types.ObjectId; count: number }>)
        : [],
    ]);

    const productCountMap = new Map(
      productCounts.map((row) => [toId(row._id), toNumberValue(row.count)]),
    );
    const variantCountMap = new Map(
      variantCounts.map((row) => [toId(row._id), toNumberValue(row.count)]),
    );
    const groupCountMap = new Map(
      groupCounts.map((row) => [toId(row._id), toNumberValue(row.count)]),
    );

    let selectedPromotion: PromotionsWorkspace["selectedPromotion"] = null;
    let selectedProductOptions: PromotionsWorkspace["selectedProductOptions"] = [];
    let selectedVariantOptions: PromotionsWorkspace["selectedVariantOptions"] = [];
    let selectedCustomerGroupOptions: PromotionsWorkspace["selectedCustomerGroupOptions"] = [];

    if (Types.ObjectId.isValid(selectedPromotionId)) {
      const promotion = (await PromotionModel.findById(selectedPromotionId)
        .lean()
        .exec()) as
        | {
            _id: unknown;
            code?: string;
            name?: string;
            description?: string;
            promotionType?: string;
            discountType?: string;
            discountValue?: number;
            minOrderAmount?: number;
            maxDiscountAmount?: number;
            usageLimit?: number;
            usageCount?: number;
            perCustomerLimit?: number;
            startsAt?: Date;
            endsAt?: Date;
            heroAssetId?: unknown;
            isActive?: boolean;
          }
        | null;

      if (promotion) {
        const [promotionProducts, promotionVariants, promotionCustomerGroups] =
          await Promise.all([
            (await PromotionProductModel.find({ promotionId: selectedPromotionId })
              .select("productId")
              .lean()
              .exec()) as Array<{
              productId?: unknown;
            }>,
            (await PromotionVariantModel.find({ promotionId: selectedPromotionId })
              .select("variantId")
              .lean()
              .exec()) as Array<{
              variantId?: unknown;
            }>,
            (await PromotionCustomerGroupModel.find({
              promotionId: selectedPromotionId,
            })
              .select("customerGroupId")
              .lean()
              .exec()) as Array<{
              customerGroupId?: unknown;
            }>,
          ]);

        selectedPromotion = {
          id: toId(promotion._id),
          code: toNullableString(promotion.code),
          name: toStringValue(promotion.name),
          description: toNullableString(promotion.description),
          promotionType: toStringValue(promotion.promotionType) || "COUPON",
          discountType: toNullableString(promotion.discountType),
          discountValue:
            promotion.discountValue === undefined
              ? null
              : toNumberValue(promotion.discountValue),
          minOrderAmount:
            promotion.minOrderAmount === undefined
              ? null
              : toNumberValue(promotion.minOrderAmount),
          maxDiscountAmount:
            promotion.maxDiscountAmount === undefined
              ? null
              : toNumberValue(promotion.maxDiscountAmount),
          usageLimit:
            promotion.usageLimit === undefined ? null : toNumberValue(promotion.usageLimit),
          usageCount: toNumberValue(promotion.usageCount),
          perCustomerLimit:
            promotion.perCustomerLimit === undefined
              ? null
              : toNumberValue(promotion.perCustomerLimit),
          startsAt: toDateValue(promotion.startsAt),
          endsAt: toDateValue(promotion.endsAt),
          heroAssetId: toNullableString(toId(promotion.heroAssetId)),
          isActive: toBooleanValue(promotion.isActive),
          productIds: promotionProducts.map((row) => toId(row.productId)).filter(Boolean),
          variantIds: promotionVariants.map((row) => toId(row.variantId)).filter(Boolean),
          customerGroupIds: promotionCustomerGroups
            .map((row) => toId(row.customerGroupId))
            .filter(Boolean),
        };

        if (selectedPromotion.productIds.length > 0) {
          const selectedProducts = (await ProductModel.find({
            _id: { $in: toObjectIdList(selectedPromotion.productIds) },
          })
            .select("productName slug")
            .lean()
            .exec()) as Array<{
            _id: unknown;
            productName?: string;
            slug?: string;
          }>;

          selectedProductOptions = selectedProducts.map((row) => ({
            id: toId(row._id),
            label: toStringValue(row.slug)
              ? `${toStringValue(row.productName)} (/${toStringValue(row.slug)})`
              : toStringValue(row.productName),
          }));
        }

        if (selectedPromotion.variantIds.length > 0) {
          const selectedVariants = (await ProductVariantModel.find({
            _id: { $in: toObjectIdList(selectedPromotion.variantIds) },
          })
            .select("productId variantName sku")
            .lean()
            .exec()) as Array<{
            _id: unknown;
            productId?: unknown;
            variantName?: string;
            sku?: string;
          }>;
          const selectedVariantProductMap = await getProductLabelMap(
            selectedVariants.map((variant) => toId(variant.productId)).filter(Boolean),
          );

          selectedVariantOptions = selectedVariants.map((row) => {
            const productLabel = selectedVariantProductMap.get(toId(row.productId));
            const variantLabel = toNullableString(row.variantName) ?? toStringValue(row.sku);

            return {
              id: toId(row._id),
              label: `${productLabel?.productName ?? "Product"} - ${variantLabel} (${toStringValue(row.sku)})`,
            };
          });
        }

        if (selectedPromotion.customerGroupIds.length > 0) {
          const selectedCustomerGroups = (await CustomerGroupModel.find({
            _id: { $in: toObjectIdList(selectedPromotion.customerGroupIds) },
          })
            .select("groupName")
            .lean()
            .exec()) as Array<{
            _id: unknown;
            groupName?: string;
          }>;

          selectedCustomerGroupOptions = selectedCustomerGroups.map((row) => ({
            id: toId(row._id),
            label: toStringValue(row.groupName),
          }));
        }
      }
    }

    return {
      filters: {
        query,
        active,
        sort,
        page,
        limit,
      },
      metrics: [
        {
          label: "Active promotions",
          value: metricsRaw[0],
          hint: "Discount campaigns currently enabled",
        },
        {
          label: "Scheduled",
          value: metricsRaw[1],
          hint: "Promotions with a future start date",
        },
        {
          label: "Coupons",
          value: metricsRaw[2],
          hint: "Promotions that rely on a coupon code",
        },
        {
          label: "Coupon uses",
          value: metricsRaw[3],
          hint: "Logged coupon redemption records",
        },
      ],
      items: promotionRows.map((row) => {
        const discountValue =
          row.discountValue === undefined ? null : toNumberValue(row.discountValue);
        const discountLabel =
          row.promotionType === "FREE_SHIPPING"
            ? "Free shipping"
            : row.discountType === "PERCENT" && discountValue !== null
              ? `${discountValue}%`
              : discountValue !== null
                ? `${discountValue.toLocaleString("en")} MMK`
                : "No discount value";

        return {
          id: toId(row._id),
          name: toStringValue(row.name),
          code: toNullableString(row.code),
          promotionType: toStringValue(row.promotionType),
          discountLabel,
          isActive: toBooleanValue(row.isActive),
          startsAt: toDateValue(row.startsAt),
          endsAt: toDateValue(row.endsAt),
          productCount: productCountMap.get(toId(row._id)) ?? 0,
          variantCount: variantCountMap.get(toId(row._id)) ?? 0,
          groupCount: groupCountMap.get(toId(row._id)) ?? 0,
        };
      }),
      selectedPromotion,
      selectedProductOptions,
      selectedVariantOptions,
      selectedCustomerGroupOptions,
      total,
      totalPages,
      page,
    };
  }

  async getUsersWorkspace(searchParams: AdminSearchParams): Promise<UsersWorkspace> {
    await connectToDatabase();

    const query = readSearchParam(searchParams, "q").trim();
    const segment = readSearchParam(searchParams, "segment") || "all";
    const role = readSearchParam(searchParams, "role");
    const active = readSearchParam(searchParams, "active") || "active";
    const sort = readSearchParam(searchParams, "sort") || "newest";
    const limit = ensureLimit(readNumberParam(searchParams, "limit", PAGE_LIMIT));
    const requestedPage = readNumberParam(searchParams, "page", 1);
    const selectedUserId = readSearchParam(searchParams, "userId");

    const filter: Record<string, unknown> = {};

    if (segment === "customers") {
      filter.role = "CUSTOMER";
    }

    if (segment === "staff") {
      filter.role = { $in: ["OWNER", "ADMIN", "STAFF"] };
    }

    if (role) {
      filter.role = role;
    }

    if (active === "active") {
      filter.isActive = true;
    }

    if (active === "inactive") {
      filter.isActive = false;
    }

    if (query) {
      const regex = new RegExp(escapeRegex(query), "i");
      filter.$or = [{ fullName: regex }, { email: regex }, { phone: regex }];
    }

    const sortMap: Record<string, Record<string, 1 | -1>> = {
      newest: { createdAt: -1, _id: -1 },
      oldest: { createdAt: 1, _id: 1 },
      name_asc: { fullName: 1, createdAt: -1 },
      name_desc: { fullName: -1, createdAt: -1 },
      login: { lastLoginAt: -1, createdAt: -1 },
    };

    const [total, counts] = await Promise.all([
      UserModel.countDocuments(filter).exec(),
      Promise.all([
        UserModel.countDocuments({ role: "CUSTOMER" }).exec(),
        UserModel.countDocuments({ role: { $in: ["OWNER", "ADMIN", "STAFF"] } }).exec(),
        UserModel.countDocuments({ isActive: true }).exec(),
      ]),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));
    const page = clampPage(requestedPage, totalPages);

    const userRows = (await UserModel.find(filter)
      .sort(sortMap[sort] ?? sortMap.newest)
      .skip((page - 1) * limit)
      .limit(limit)
      .select("fullName email phone role isActive createdAt lastLoginAt")
      .lean()
      .exec()) as Array<{
      _id: unknown;
      fullName?: string;
      email?: string;
      phone?: string;
      role?: string;
      isActive?: boolean;
      createdAt?: Date;
      lastLoginAt?: Date;
    }>;

    const userIds = userRows.map((row) => toId(row._id));
    const objectIds = toObjectIdList(userIds);

    const [profileRows, addressCounts, orderStats] = await Promise.all([
      objectIds.length > 0
        ? ((await CustomerProfileModel.find({
            userId: { $in: objectIds },
          })
            .lean()
            .exec()) as Array<{
            userId?: unknown;
            totalSpent?: number;
            totalOrders?: number;
            loyaltyPoints?: number;
          }>)
        : [],
      objectIds.length > 0
        ? ((await AddressModel.aggregate<{
            _id: Types.ObjectId;
            count: number;
          }>([
            { $match: { userId: { $in: objectIds } } },
            { $group: { _id: "$userId", count: { $sum: 1 } } },
          ]).exec()) as Array<{ _id: Types.ObjectId; count: number }>)
        : [],
      objectIds.length > 0
        ? ((await OrderModel.aggregate<{
            _id: Types.ObjectId;
            totalOrders: number;
            totalSpent: number;
          }>([
            { $match: { customerId: { $in: objectIds } } },
            {
              $group: {
                _id: "$customerId",
                totalOrders: { $sum: 1 },
                totalSpent: { $sum: "$grandTotal" },
              },
            },
          ]).exec()) as Array<{
            _id: Types.ObjectId;
            totalOrders: number;
            totalSpent: number;
          }>)
        : [],
    ]);

    const profileMap = new Map(
      profileRows.map((row) => [
        toId(row.userId),
        {
          totalSpent: toNumberValue(row.totalSpent),
          totalOrders: toNumberValue(row.totalOrders),
          loyaltyPoints: toNumberValue(row.loyaltyPoints),
        },
      ]),
    );
    const addressCountMap = new Map(
      addressCounts.map((row) => [toId(row._id), toNumberValue(row.count)]),
    );
    const orderStatsMap = new Map(
      orderStats.map((row) => [
        toId(row._id),
        {
          totalOrders: toNumberValue(row.totalOrders),
          totalSpent: toNumberValue(row.totalSpent),
        },
      ]),
    );

    let selectedUser: UsersWorkspace["selectedUser"] = null;

    if (Types.ObjectId.isValid(selectedUserId)) {
      const user = (await UserModel.findById(selectedUserId)
        .select("fullName email phone role isActive emailVerified registrationDate lastLoginAt")
        .lean()
        .exec()) as
        | {
            _id: unknown;
            fullName?: string;
            email?: string;
            phone?: string;
            role?: string;
            isActive?: boolean;
            emailVerified?: boolean;
            registrationDate?: Date;
            lastLoginAt?: Date;
          }
        | null;

      if (user) {
        const [profile, addressCount, recentOrders] = await Promise.all([
          (await CustomerProfileModel.findOne({ userId: selectedUserId })
            .lean()
            .exec()) as
            | {
                totalSpent?: number;
                totalOrders?: number;
                loyaltyPoints?: number;
              }
            | null,
          AddressModel.countDocuments({ userId: selectedUserId }).exec(),
          (await OrderModel.find({ customerId: selectedUserId })
            .sort({ orderDate: -1 })
            .limit(5)
            .select("orderNo grandTotal status orderDate")
            .lean()
            .exec()) as Array<{
            _id: unknown;
            orderNo?: string;
            grandTotal?: number;
            status?: string;
            orderDate?: Date;
          }>,
        ]);

        selectedUser = {
          id: toId(user._id),
          fullName: toStringValue(user.fullName),
          email: toNullableString(user.email),
          phone: toNullableString(user.phone),
          role: toStringValue(user.role),
          isActive: toBooleanValue(user.isActive),
          emailVerified: toBooleanValue(user.emailVerified),
          registrationDate: toDateValue(user.registrationDate),
          lastLoginAt: toDateValue(user.lastLoginAt),
          addressCount,
          totalOrders: toNumberValue(profile?.totalOrders),
          totalSpent: toNumberValue(profile?.totalSpent),
          loyaltyPoints: toNumberValue(profile?.loyaltyPoints),
          recentOrders: recentOrders.map((order) => ({
            id: toId(order._id),
            orderNo: toStringValue(order.orderNo),
            grandTotal: toNumberValue(order.grandTotal),
            status: toStringValue(order.status),
            orderDate: toDateValue(order.orderDate),
          })),
        };
      }
    }

    return {
      filters: {
        query,
        segment,
        role,
        active,
        sort,
        page,
        limit,
      },
      metrics: [
        {
          label: "Customers",
          value: counts[0],
          hint: "Customer accounts in the store",
        },
        {
          label: "Staff and admins",
          value: counts[1],
          hint: "Owner, admin, and staff operator accounts",
        },
        {
          label: "Active users",
          value: counts[2],
          hint: "Accounts currently allowed to sign in",
        },
      ],
      items: userRows.map((row) => {
        const profile = profileMap.get(toId(row._id));
        const orderStatsValue = orderStatsMap.get(toId(row._id));

        return {
          id: toId(row._id),
          fullName: toStringValue(row.fullName),
          email: toNullableString(row.email),
          phone: toNullableString(row.phone),
          role: toStringValue(row.role),
          isActive: toBooleanValue(row.isActive),
          totalOrders: orderStatsValue?.totalOrders ?? profile?.totalOrders ?? 0,
          totalSpent: orderStatsValue?.totalSpent ?? profile?.totalSpent ?? 0,
          addressCount: addressCountMap.get(toId(row._id)) ?? 0,
          createdAt: toDateValue(row.createdAt),
          lastLoginAt: toDateValue(row.lastLoginAt),
        };
      }),
      selectedUser,
      total,
      totalPages,
      page,
    };
  }

  async getSimpleRecordWorkspace(
    kind: SimpleRecordKind,
    searchParams: AdminSearchParams,
  ): Promise<SimpleRecordWorkspace> {
    await connectToDatabase();

    const query = readSearchParam(searchParams, "q").trim();
    const active = readSearchParam(searchParams, "active") || "all";
    const sort = readSearchParam(searchParams, "sort") || "name_asc";
    const limit = ensureLimit(readNumberParam(searchParams, "limit", SIMPLE_RECORD_LIMIT));
    const requestedPage = readNumberParam(searchParams, "page", 1);
    const selectedId = readSearchParam(searchParams, "id");
    const activeFilter = readBooleanParam(searchParams, "active");

    let rows: Array<{
      _id: unknown;
      title: string;
      slug: string | null;
      code: string | null;
      description: string | null;
      isActive: boolean;
      relatedCount: number;
      updatedAt: Date | null;
      extra: string | null;
    }> = [];
    let total = 0;
    let page = 1;
    let selectedRecord: SimpleRecordWorkspace["selectedRecord"] = null;
    let categoryOptions: Array<{ id: string; label: string }> = [];
    let countryOptions: Array<{ id: string; label: string }> = [];
    let zoneOptions: Array<{ id: string; label: string }> = [];
    let methodOptions: Array<{ id: string; label: string }> = [];
    let stateOptions: Array<{ id: string; label: string; countryId?: string }> = [];
    let taxClassOptions: Array<{ id: string; label: string }> = [];

    if (kind === "countries") {
      const filter: Record<string, unknown> = {};

      if (query) {
        const regex = new RegExp(escapeRegex(query), "i");
        filter.$or = [{ countryName: regex }, { isoCode: regex }, { phoneCode: regex }];
      }

      total = await CountryModel.countDocuments(filter).exec();
      page = clampPage(requestedPage, Math.max(1, Math.ceil(total / limit)));
      const data = (await CountryModel.find(filter)
        .sort(sort === "name_desc" ? { countryName: -1 } : { countryName: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec()) as Array<{
        _id: unknown;
        countryName?: string;
        isoCode?: string;
        phoneCode?: string;
      }>;
      const countryIds = data.map((item) => item._id);
      const [
        brandCounts,
        productCounts,
        addressCounts,
        taxRateCounts,
        stateCounts,
        shippingZoneCountryCounts,
      ] =
        countryIds.length > 0
          ? await Promise.all([
              BrandModel.aggregate<{ _id: Types.ObjectId; count: number }>([
                { $match: { originCountryId: { $in: countryIds } } },
                { $group: { _id: "$originCountryId", count: { $sum: 1 } } },
              ]).exec(),
              ProductModel.aggregate<{ _id: Types.ObjectId; count: number }>([
                { $match: { originCountryId: { $in: countryIds } } },
                { $group: { _id: "$originCountryId", count: { $sum: 1 } } },
              ]).exec(),
              AddressModel.aggregate<{ _id: Types.ObjectId; count: number }>([
                { $match: { countryId: { $in: countryIds } } },
                { $group: { _id: "$countryId", count: { $sum: 1 } } },
              ]).exec(),
              TaxRateModel.aggregate<{ _id: Types.ObjectId; count: number }>([
                { $match: { countryId: { $in: countryIds } } },
                { $group: { _id: "$countryId", count: { $sum: 1 } } },
              ]).exec(),
              StateRegionModel.aggregate<{ _id: Types.ObjectId; count: number }>([
                { $match: { countryId: { $in: countryIds } } },
                { $group: { _id: "$countryId", count: { $sum: 1 } } },
              ]).exec(),
              ShippingZoneCountryModel.aggregate<{ _id: Types.ObjectId; count: number }>([
                { $match: { countryId: { $in: countryIds } } },
                { $group: { _id: "$countryId", count: { $sum: 1 } } },
              ]).exec(),
            ])
          : [[], [], [], [], [], []];

      const relatedCountMap = new Map<string, number>();
      for (const row of [
        ...brandCounts,
        ...productCounts,
        ...addressCounts,
        ...taxRateCounts,
        ...stateCounts,
        ...shippingZoneCountryCounts,
      ]) {
        const id = toId(row._id);
        relatedCountMap.set(id, (relatedCountMap.get(id) ?? 0) + toNumberValue(row.count));
      }

      rows = data.map((item) => ({
        _id: item._id,
        title: toStringValue(item.countryName),
        slug: null,
        code: toNullableString(item.isoCode),
        description: null,
        isActive: true,
        relatedCount: relatedCountMap.get(toId(item._id)) ?? 0,
        updatedAt: null,
        extra: toNullableString(item.phoneCode),
      }));

      if (Types.ObjectId.isValid(selectedId)) {
        const item = (await CountryModel.findById(selectedId).lean().exec()) as
          | {
              _id: unknown;
              countryName?: string;
              isoCode?: string;
              phoneCode?: string;
            }
          | null;

        if (item) {
          selectedRecord = {
            id: toId(item._id),
            title: toStringValue(item.countryName),
            code: toStringValue(item.isoCode),
            phoneCode: toStringValue(item.phoneCode),
          };
        }
      }
    } else if (kind === "states-regions") {
      const filter: Record<string, unknown> = {};

      if (query) {
        const regex = new RegExp(escapeRegex(query), "i");
        filter.$or = [{ stateRegionName: regex }, { code: regex }];
      }

      const countries = (await CountryModel.find()
        .sort({ countryName: 1 })
        .select("countryName")
        .lean()
        .exec()) as Array<{
        _id: unknown;
        countryName?: string;
      }>;
      const countryMap = new Map(
        countries.map((country) => [toId(country._id), toStringValue(country.countryName)]),
      );
      zoneOptions = countries.map((country) => ({
        id: toId(country._id),
        label: toStringValue(country.countryName),
      }));

      total = await StateRegionModel.countDocuments(filter).exec();
      page = clampPage(requestedPage, Math.max(1, Math.ceil(total / limit)));
      const data = (await StateRegionModel.find(filter)
        .sort(sort === "name_desc" ? { stateRegionName: -1 } : { stateRegionName: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec()) as Array<{
        _id: unknown;
        countryId?: unknown;
        stateRegionName?: string;
        code?: string;
      }>;
      const stateIds = data.map((item) => item._id);
      const [addressCounts, taxRateCounts] =
        stateIds.length > 0
          ? await Promise.all([
              AddressModel.aggregate<{ _id: Types.ObjectId; count: number }>([
                { $match: { stateRegionId: { $in: stateIds } } },
                { $group: { _id: "$stateRegionId", count: { $sum: 1 } } },
              ]).exec(),
              TaxRateModel.aggregate<{ _id: Types.ObjectId; count: number }>([
                { $match: { stateRegionId: { $in: stateIds } } },
                { $group: { _id: "$stateRegionId", count: { $sum: 1 } } },
              ]).exec(),
            ])
          : [[], []];
      const relatedCountMap = new Map<string, number>();
      for (const row of [...addressCounts, ...taxRateCounts]) {
        const id = toId(row._id);
        relatedCountMap.set(id, (relatedCountMap.get(id) ?? 0) + toNumberValue(row.count));
      }

      rows = data.map((item) => ({
        _id: item._id,
        title: toStringValue(item.stateRegionName),
        slug: null,
        code: toNullableString(item.code),
        description: null,
        isActive: true,
        relatedCount: relatedCountMap.get(toId(item._id)) ?? 0,
        updatedAt: null,
        extra: countryMap.get(toId(item.countryId)) ?? null,
      }));

      if (Types.ObjectId.isValid(selectedId)) {
        const item = (await StateRegionModel.findById(selectedId).lean().exec()) as
          | {
              _id: unknown;
              countryId?: unknown;
              stateRegionName?: string;
              code?: string;
            }
          | null;

        if (item) {
          selectedRecord = {
            id: toId(item._id),
            countryId: toId(item.countryId),
            title: toStringValue(item.stateRegionName),
            code: toStringValue(item.code),
          };
        }
      }
    } else if (kind === "categories") {
      const filter: Record<string, unknown> = {};

      if (query) {
        const regex = new RegExp(escapeRegex(query), "i");
        filter.$or = [{ categoryName: regex }, { slug: regex }, { fullSlugPath: regex }];
      }

      if (activeFilter !== undefined) {
        filter.isActive = activeFilter;
      }

      total = await CategoryModel.countDocuments(filter).exec();
      page = clampPage(requestedPage, Math.max(1, Math.ceil(total / limit)));
      const [data, categories] = await Promise.all([
        (await CategoryModel.find(filter)
          .sort(sort === "updated" ? { updatedAt: -1 } : { fullSlugPath: sort === "name_desc" ? -1 : 1, categoryName: sort === "name_desc" ? -1 : 1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean()
          .exec()) as Array<{
          _id: unknown;
          categoryName?: string;
          slug?: string;
          description?: string;
          isActive?: boolean;
          updatedAt?: Date;
          parentCategoryId?: unknown;
          fullSlugPath?: string;
          depth?: number;
        }>,
        (await CategoryModel.find({})
          .sort({ depth: 1, sortOrder: 1, categoryName: 1 })
          .select("categoryName fullSlugPath")
          .lean()
          .exec()) as Array<{
          _id: unknown;
          categoryName?: string;
          fullSlugPath?: string;
        }>,
      ]);
      categoryOptions = categories.map((category) => ({
        id: toId(category._id),
        label: toStringValue(category.fullSlugPath) || toStringValue(category.categoryName),
      }));
      const counts = await ProductModel.aggregate<{
        _id: Types.ObjectId;
        count: number;
      }>([
        { $match: { categoryId: { $in: data.map((item) => item._id) } } },
        { $group: { _id: "$categoryId", count: { $sum: 1 } } },
      ]).exec();
      const countMap = new Map(counts.map((item) => [toId(item._id), item.count]));

      rows = data.map((item) => ({
        _id: item._id,
        title: toStringValue(item.categoryName),
        slug: toNullableString(item.slug),
        code: null,
        description: toNullableString(item.description),
        isActive: toBooleanValue(item.isActive),
        relatedCount: countMap.get(toId(item._id)) ?? 0,
        updatedAt: toDateValue(item.updatedAt),
        extra: toNullableString(item.fullSlugPath),
      }));

      if (Types.ObjectId.isValid(selectedId)) {
        const item = (await CategoryModel.findById(selectedId).lean().exec()) as
          | {
              _id: unknown;
              categoryName?: string;
              slug?: string;
              description?: string;
              parentCategoryId?: unknown;
              sortOrder?: number;
              seoTitle?: string;
              seoDescription?: string;
              isActive?: boolean;
              fullSlugPath?: string;
              depth?: number;
              ancestorCategoryIds?: unknown[];
            }
          | null;
        if (item) {
          selectedRecord = {
            id: toId(item._id),
            title: toStringValue(item.categoryName),
            slug: toStringValue(item.slug),
            description: toStringValue(item.description),
            parentCategoryId: toId(item.parentCategoryId),
            sortOrder: toNumberValue(item.sortOrder),
            seoTitle: toStringValue(item.seoTitle),
            seoDescription: toStringValue(item.seoDescription),
            isActive: toBooleanValue(item.isActive),
            fullSlugPath: toStringValue(item.fullSlugPath),
            depth: toNumberValue(item.depth),
            ancestorCategoryIds: (item.ancestorCategoryIds ?? []).map((value) => toId(value)),
          };
        }
      }
    } else if (kind === "brands") {
      const filter: Record<string, unknown> = {};

      if (query) {
        const regex = new RegExp(escapeRegex(query), "i");
        filter.$or = [{ brandName: regex }, { slug: regex }];
      }

      if (activeFilter !== undefined) {
        filter.isActive = activeFilter;
      }

      total = await BrandModel.countDocuments(filter).exec();
      page = clampPage(requestedPage, Math.max(1, Math.ceil(total / limit)));
      const [data, countries] = await Promise.all([
        (await BrandModel.find(filter)
          .sort(sort === "updated" ? { updatedAt: -1 } : { brandName: sort === "name_desc" ? -1 : 1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean()
          .exec()) as Array<{
          _id: unknown;
          brandName?: string;
          slug?: string;
          description?: string;
          websiteUrl?: string;
          originCountryId?: unknown;
          isActive?: boolean;
          updatedAt?: Date;
        }>,
        (await CountryModel.find().sort({ countryName: 1 }).select("countryName").lean().exec()) as Array<{
          _id: unknown;
          countryName?: string;
        }>,
      ]);
      const counts = await ProductModel.aggregate<{
        _id: Types.ObjectId;
        count: number;
      }>([
        { $match: { brandId: { $in: data.map((item) => item._id) } } },
        { $group: { _id: "$brandId", count: { $sum: 1 } } },
      ]).exec();
      const countMap = new Map(counts.map((item) => [toId(item._id), item.count]));
      const countryMap = new Map(
        countries.map((country) => [toId(country._id), toStringValue(country.countryName)]),
      );
      zoneOptions = countries.map((country) => ({
        id: toId(country._id),
        label: toStringValue(country.countryName),
      }));

      rows = data.map((item) => ({
        _id: item._id,
        title: toStringValue(item.brandName),
        slug: toNullableString(item.slug),
        code: null,
        description: toNullableString(item.description),
        isActive: toBooleanValue(item.isActive),
        relatedCount: countMap.get(toId(item._id)) ?? 0,
        updatedAt: toDateValue(item.updatedAt),
        extra:
          countryMap.get(toId(item.originCountryId)) ??
          toNullableString(item.websiteUrl),
      }));

      if (Types.ObjectId.isValid(selectedId)) {
        const item = (await BrandModel.findById(selectedId).lean().exec()) as
          | {
              _id: unknown;
              brandName?: string;
              slug?: string;
              description?: string;
              websiteUrl?: string;
              originCountryId?: unknown;
              isActive?: boolean;
            }
          | null;
        if (item) {
          selectedRecord = {
            id: toId(item._id),
            title: toStringValue(item.brandName),
            slug: toStringValue(item.slug),
            description: toStringValue(item.description),
            websiteUrl: toStringValue(item.websiteUrl),
            originCountryId: toId(item.originCountryId),
            isActive: toBooleanValue(item.isActive),
          };
        }
      }
    } else if (kind === "collections") {
      const filter: Record<string, unknown> = {};

      if (query) {
        const regex = new RegExp(escapeRegex(query), "i");
        filter.$or = [{ collectionName: regex }, { slug: regex }];
      }

      if (activeFilter !== undefined) {
        filter.isActive = activeFilter;
      }

      total = await CollectionModel.countDocuments(filter).exec();
      page = clampPage(requestedPage, Math.max(1, Math.ceil(total / limit)));
      const data = (await CollectionModel.find(filter)
        .sort(
          sort === "updated"
            ? { updatedAt: -1 }
            : { collectionName: sort === "name_desc" ? -1 : 1 },
        )
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec()) as Array<{
        _id: unknown;
        collectionName?: string;
        slug?: string;
        description?: string;
        isActive?: boolean;
        updatedAt?: Date;
      }>;
      const counts = await Promise.all(
        data.map((item) =>
          ProductModel.countDocuments({ collectionIds: item._id }).exec(),
        ),
      );

      rows = data.map((item, index) => ({
        _id: item._id,
        title: toStringValue(item.collectionName),
        slug: toNullableString(item.slug),
        code: null,
        description: toNullableString(item.description),
        isActive: toBooleanValue(item.isActive),
        relatedCount: counts[index] ?? 0,
        updatedAt: toDateValue(item.updatedAt),
        extra: null,
      }));

      if (Types.ObjectId.isValid(selectedId)) {
        const item = (await CollectionModel.findById(selectedId).lean().exec()) as
          | {
              _id: unknown;
              collectionName?: string;
              slug?: string;
              description?: string;
              sortOrder?: number;
              isActive?: boolean;
            }
          | null;
        if (item) {
          selectedRecord = {
            id: toId(item._id),
            title: toStringValue(item.collectionName),
            slug: toStringValue(item.slug),
            description: toStringValue(item.description),
            sortOrder: toNumberValue(item.sortOrder),
            isActive: toBooleanValue(item.isActive),
          };
        }
      }
    } else if (kind === "product-types") {
      const filter: Record<string, unknown> = {};

      if (query) {
        const regex = new RegExp(escapeRegex(query), "i");
        filter.$or = [{ name: regex }, { code: regex }];
      }

      total = await ProductTypeModel.countDocuments(filter).exec();
      page = clampPage(requestedPage, Math.max(1, Math.ceil(total / limit)));
      const data = (await ProductTypeModel.find(filter)
        .sort(sort === "name_desc" ? { name: -1 } : { name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec()) as Array<{
        _id: unknown;
        name?: string;
        code?: string;
      }>;
      const counts = await ProductModel.aggregate<{
        _id: Types.ObjectId;
        count: number;
      }>([
        { $match: { productTypeId: { $in: data.map((item) => item._id) } } },
        { $group: { _id: "$productTypeId", count: { $sum: 1 } } },
      ]).exec();
      const countMap = new Map(counts.map((item) => [toId(item._id), item.count]));

      rows = data.map((item) => ({
        _id: item._id,
        title: toStringValue(item.name),
        slug: null,
        code: toNullableString(item.code),
        description: null,
        isActive: true,
        relatedCount: countMap.get(toId(item._id)) ?? 0,
        updatedAt: null,
        extra: null,
      }));

      if (Types.ObjectId.isValid(selectedId)) {
        const item = (await ProductTypeModel.findById(selectedId).lean().exec()) as
          | {
              _id: unknown;
              name?: string;
              code?: string;
            }
          | null;
        if (item) {
          selectedRecord = {
            id: toId(item._id),
            title: toStringValue(item.name),
            code: toStringValue(item.code),
          };
        }
      }
    } else if (kind === "product-tags") {
      const filter: Record<string, unknown> = {};

      if (query) {
        const regex = new RegExp(escapeRegex(query), "i");
        filter.$or = [{ tagName: regex }, { slug: regex }];
      }

      total = await ProductTagModel.countDocuments(filter).exec();
      page = clampPage(requestedPage, Math.max(1, Math.ceil(total / limit)));
      const data = (await ProductTagModel.find(filter)
        .sort(sort === "name_desc" ? { tagName: -1 } : { tagName: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec()) as Array<{
        _id: unknown;
        tagName?: string;
        slug?: string;
      }>;
      const counts = await Promise.all(
        data.map((item) => ProductModel.countDocuments({ tagIds: item._id }).exec()),
      );

      rows = data.map((item, index) => ({
        _id: item._id,
        title: toStringValue(item.tagName),
        slug: toNullableString(item.slug),
        code: null,
        description: null,
        isActive: true,
        relatedCount: counts[index] ?? 0,
        updatedAt: null,
        extra: null,
      }));

      if (Types.ObjectId.isValid(selectedId)) {
        const item = (await ProductTagModel.findById(selectedId).lean().exec()) as
          | {
              _id: unknown;
              tagName?: string;
              slug?: string;
            }
          | null;
        if (item) {
          selectedRecord = {
            id: toId(item._id),
            title: toStringValue(item.tagName),
            slug: toStringValue(item.slug),
          };
        }
      }
    } else if (kind === "product-badges") {
      const filter: Record<string, unknown> = {};

      if (query) {
        const regex = new RegExp(escapeRegex(query), "i");
        filter.$or = [{ badgeName: regex }, { label: regex }, { colorCode: regex }];
      }

      if (activeFilter !== undefined) {
        filter.isActive = activeFilter;
      }

      total = await ProductBadgeModel.countDocuments(filter).exec();
      page = clampPage(requestedPage, Math.max(1, Math.ceil(total / limit)));
      const data = (await ProductBadgeModel.find(filter)
        .sort(sort === "name_desc" ? { badgeName: -1 } : { badgeName: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec()) as Array<{
        _id: unknown;
        badgeName?: string;
        label?: string;
        colorCode?: string;
        isActive?: boolean;
      }>;
      const counts = await Promise.all(
        data.map((item) => ProductModel.countDocuments({ badgeIds: item._id }).exec()),
      );

      rows = data.map((item, index) => ({
        _id: item._id,
        title: toStringValue(item.badgeName),
        slug: null,
        code: toNullableString(item.label),
        description: null,
        isActive: toBooleanValue(item.isActive),
        relatedCount: counts[index] ?? 0,
        updatedAt: null,
        extra: toNullableString(item.colorCode),
      }));

      if (Types.ObjectId.isValid(selectedId)) {
        const item = (await ProductBadgeModel.findById(selectedId).lean().exec()) as
          | {
              _id: unknown;
              badgeName?: string;
              label?: string;
              colorCode?: string;
              isActive?: boolean;
            }
          | null;
        if (item) {
          selectedRecord = {
            id: toId(item._id),
            title: toStringValue(item.badgeName),
            code: toStringValue(item.label),
            colorCode: toStringValue(item.colorCode),
            isActive: toBooleanValue(item.isActive),
          };
        }
      }
    } else if (kind === "payment-methods") {
      const filter: Record<string, unknown> = {};

      if (query) {
        const regex = new RegExp(escapeRegex(query), "i");
        filter.$or = [{ methodName: regex }, { code: regex }, { provider: regex }];
      }

      if (activeFilter !== undefined) {
        filter.isActive = activeFilter;
      }

      total = await PaymentMethodModel.countDocuments(filter).exec();
      page = clampPage(requestedPage, Math.max(1, Math.ceil(total / limit)));
      const data = (await PaymentMethodModel.find(filter)
        .sort({ methodName: sort === "name_desc" ? -1 : 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec()) as Array<{
        _id: unknown;
        methodName?: string;
        code?: string;
        provider?: string;
        receiverPhone?: string;
        isActive?: boolean;
      }>;
      const counts = await PaymentModel.aggregate<{
        _id: Types.ObjectId;
        count: number;
      }>([
        { $match: { paymentMethodId: { $in: data.map((item) => item._id) } } },
        { $group: { _id: "$paymentMethodId", count: { $sum: 1 } } },
      ]).exec();
      const countMap = new Map(counts.map((item) => [toId(item._id), item.count]));

      rows = data.map((item) => ({
        _id: item._id,
        title: toStringValue(item.methodName),
        slug: null,
        code: toNullableString(item.code),
        description: toNullableString(item.provider),
        isActive: toBooleanValue(item.isActive),
        relatedCount: countMap.get(toId(item._id)) ?? 0,
        updatedAt: null,
        extra: toNullableString(item.receiverPhone),
      }));

      if (Types.ObjectId.isValid(selectedId)) {
        const item = (await PaymentMethodModel.findById(selectedId).lean().exec()) as
          | {
              _id: unknown;
              methodName?: string;
              code?: string;
              provider?: string;
              receiverName?: string;
              receiverPhone?: string;
              receiverAccountNo?: string;
              isManual?: boolean;
              isActive?: boolean;
            }
          | null;
        if (item) {
          selectedRecord = {
            id: toId(item._id),
            title: toStringValue(item.methodName),
            code: toStringValue(item.code),
            provider: toStringValue(item.provider),
            receiverName: toStringValue(item.receiverName),
            receiverPhone: toStringValue(item.receiverPhone),
            receiverAccountNo: toStringValue(item.receiverAccountNo),
            isManual: toBooleanValue(item.isManual),
            isActive: toBooleanValue(item.isActive),
          };
        }
      }
    } else if (kind === "shipping-methods") {
      const filter: Record<string, unknown> = {};

      if (query) {
        const regex = new RegExp(escapeRegex(query), "i");
        filter.$or = [{ methodName: regex }, { code: regex }, { description: regex }];
      }

      if (activeFilter !== undefined) {
        filter.isActive = activeFilter;
      }

      total = await ShippingMethodModel.countDocuments(filter).exec();
      page = clampPage(requestedPage, Math.max(1, Math.ceil(total / limit)));
      const data = (await ShippingMethodModel.find(filter)
        .sort({ methodName: sort === "name_desc" ? -1 : 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec()) as Array<{
        _id: unknown;
        methodName?: string;
        code?: string;
        description?: string;
        shippingZoneId?: unknown;
        isActive?: boolean;
        estimatedMinDays?: number;
        estimatedMaxDays?: number;
      }>;
      const [zones, counts] = await Promise.all([
        (await ShippingZoneModel.find()
          .sort({ zoneName: 1 })
          .select("zoneName")
          .lean()
          .exec()) as Array<{
          _id: unknown;
          zoneName?: string;
        }>,
        OrderModel.aggregate<{
          _id: Types.ObjectId;
          count: number;
        }>([
          { $match: { shippingMethodId: { $in: data.map((item) => item._id) } } },
          { $group: { _id: "$shippingMethodId", count: { $sum: 1 } } },
        ]).exec(),
      ]);
      const zoneMap = new Map(zones.map((zone) => [toId(zone._id), toStringValue(zone.zoneName)]));
      const countMap = new Map(counts.map((item) => [toId(item._id), item.count]));
      zoneOptions = zones.map((zone) => ({
        id: toId(zone._id),
        label: toStringValue(zone.zoneName),
      }));

      rows = data.map((item) => ({
        _id: item._id,
        title: toStringValue(item.methodName),
        slug: null,
        code: toNullableString(item.code),
        description: toNullableString(item.description),
        isActive: toBooleanValue(item.isActive),
        relatedCount: countMap.get(toId(item._id)) ?? 0,
        updatedAt: null,
        extra:
          zoneMap.get(toId(item.shippingZoneId)) ??
          ([
            toNumberValue(item.estimatedMinDays),
            toNumberValue(item.estimatedMaxDays),
          ]
            .filter((value) => value > 0)
            .join("-") || null),
      }));

      if (Types.ObjectId.isValid(selectedId)) {
        const item = (await ShippingMethodModel.findById(selectedId).lean().exec()) as
          | {
              _id: unknown;
              methodName?: string;
              code?: string;
              description?: string;
              shippingZoneId?: unknown;
              baseFee?: number;
              freeShippingMinAmount?: number;
              estimatedMinDays?: number;
              estimatedMaxDays?: number;
              isActive?: boolean;
            }
          | null;
        if (item) {
          selectedRecord = {
            id: toId(item._id),
            title: toStringValue(item.methodName),
            code: toStringValue(item.code),
            description: toStringValue(item.description),
            shippingZoneId: toId(item.shippingZoneId),
            baseFee: toNumberValue(item.baseFee),
            freeShippingMinAmount: toNumberValue(item.freeShippingMinAmount),
            estimatedMinDays: toNumberValue(item.estimatedMinDays),
            estimatedMaxDays: toNumberValue(item.estimatedMaxDays),
            isActive: toBooleanValue(item.isActive),
          };
        }
      }
    } else if (kind === "shipping-zones") {
      const filter: Record<string, unknown> = {};

      if (query) {
        const regex = new RegExp(escapeRegex(query), "i");
        filter.$or = [{ zoneName: regex }, { description: regex }];
      }

      if (activeFilter !== undefined) {
        filter.isActive = activeFilter;
      }

      const [countries, totalCount] = await Promise.all([
        (await CountryModel.find()
          .sort({ countryName: 1 })
          .select("countryName")
          .lean()
          .exec()) as Array<{
          _id: unknown;
          countryName?: string;
        }>,
        ShippingZoneModel.countDocuments(filter).exec(),
      ]);

      countryOptions = countries.map((country) => ({
        id: toId(country._id),
        label: toStringValue(country.countryName),
      }));

      total = totalCount;
      page = clampPage(requestedPage, Math.max(1, Math.ceil(total / limit)));
      const data = (await ShippingZoneModel.find(filter)
        .sort(sort === "name_desc" ? { zoneName: -1 } : { zoneName: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec()) as Array<{
        _id: unknown;
        zoneName?: string;
        description?: string;
        isActive?: boolean;
        createdAt?: Date;
      }>;

      const zoneIds = data.map((item) => item._id);
      const [methodCounts, countryCounts] =
        zoneIds.length > 0
          ? await Promise.all([
              ShippingMethodModel.aggregate<{ _id: Types.ObjectId; count: number }>([
                { $match: { shippingZoneId: { $in: zoneIds } } },
                { $group: { _id: "$shippingZoneId", count: { $sum: 1 } } },
              ]).exec(),
              ShippingZoneCountryModel.aggregate<{ _id: Types.ObjectId; count: number }>([
                { $match: { shippingZoneId: { $in: zoneIds } } },
                { $group: { _id: "$shippingZoneId", count: { $sum: 1 } } },
              ]).exec(),
            ])
          : [[], []];
      const methodCountMap = new Map(methodCounts.map((item) => [toId(item._id), item.count]));
      const countryCountMap = new Map(countryCounts.map((item) => [toId(item._id), item.count]));

      rows = data.map((item) => ({
        _id: item._id,
        title: toStringValue(item.zoneName),
        slug: null,
        code: null,
        description: toNullableString(item.description),
        isActive: toBooleanValue(item.isActive),
        relatedCount: methodCountMap.get(toId(item._id)) ?? 0,
        updatedAt: toDateValue(item.createdAt),
        extra: `${countryCountMap.get(toId(item._id)) ?? 0} countries`,
      }));

      if (Types.ObjectId.isValid(selectedId)) {
        const [item, zoneCountries] = await Promise.all([
          ShippingZoneModel.findById(selectedId).lean().exec() as Promise<
            | {
                _id: unknown;
                zoneName?: string;
                description?: string;
                isActive?: boolean;
              }
            | null
          >,
          ShippingZoneCountryModel.find({ shippingZoneId: selectedId })
            .select("countryId")
            .lean()
            .exec() as Promise<Array<{ countryId?: unknown }>>,
        ]);

        if (item) {
          selectedRecord = {
            id: toId(item._id),
            title: toStringValue(item.zoneName),
            description: toStringValue(item.description),
            isActive: toBooleanValue(item.isActive),
            countryIds: zoneCountries.map((zoneCountry) => toId(zoneCountry.countryId)).filter(Boolean),
          };
        }
      }
    } else if (kind === "shipping-rate-rules") {
      const methodRows = (await ShippingMethodModel.find()
        .sort({ methodName: 1 })
        .select("methodName code")
        .lean()
        .exec()) as Array<{
        _id: unknown;
        methodName?: string;
        code?: string;
      }>;
      methodOptions = methodRows.map((method) => ({
        id: toId(method._id),
        label:
          [toStringValue(method.methodName), toNullableString(method.code)]
            .filter(Boolean)
            .join(" / ") || "Shipping method",
      }));

      const matchingMethodIds =
        query.length > 0
          ? methodRows
              .filter((method) => {
                const text = [
                  toStringValue(method.methodName),
                  toStringValue(method.code),
                ]
                  .join(" ")
                  .toLowerCase();

                return text.includes(query.toLowerCase());
              })
              .map((method) => new Types.ObjectId(toId(method._id)))
          : [];

      const filter: Record<string, unknown> = {};

      if (query && matchingMethodIds.length === 0) {
        filter._id = { $in: [] };
      } else if (matchingMethodIds.length > 0) {
        filter.shippingMethodId = { $in: matchingMethodIds };
      }

      if (activeFilter !== undefined) {
        filter.isActive = activeFilter;
      }

      total = await ShippingRateRuleModel.countDocuments(filter).exec();
      page = clampPage(requestedPage, Math.max(1, Math.ceil(total / limit)));
      const data = (await ShippingRateRuleModel.find(filter)
        .sort({ shippingMethodId: 1, fee: 1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec()) as Array<{
        _id: unknown;
        shippingMethodId?: unknown;
        minWeightGrams?: number;
        maxWeightGrams?: number;
        minOrderAmount?: number;
        maxOrderAmount?: number;
        fee?: number;
        isActive?: boolean;
      }>;
      const methodMap = new Map(methodOptions.map((item) => [item.id, item.label]));

      rows = data.map((item) => ({
        _id: item._id,
        title: methodMap.get(toId(item.shippingMethodId)) ?? "Shipping rule",
        slug: null,
        code: `${toNumberValue(item.fee)} fee`,
        description:
          [
            item.minWeightGrams !== undefined || item.maxWeightGrams !== undefined
              ? `Weight ${item.minWeightGrams ?? 0}-${item.maxWeightGrams ?? "any"} g`
              : null,
            item.minOrderAmount !== undefined || item.maxOrderAmount !== undefined
              ? `Order ${item.minOrderAmount ?? 0}-${item.maxOrderAmount ?? "any"}`
              : null,
          ]
            .filter(Boolean)
            .join(" / ") || null,
        isActive: toBooleanValue(item.isActive),
        relatedCount: 0,
        updatedAt: null,
        extra: null,
      }));

      if (Types.ObjectId.isValid(selectedId)) {
        const item = (await ShippingRateRuleModel.findById(selectedId).lean().exec()) as
          | {
              _id: unknown;
              shippingMethodId?: unknown;
              minWeightGrams?: number;
              maxWeightGrams?: number;
              minOrderAmount?: number;
              maxOrderAmount?: number;
              fee?: number;
              isActive?: boolean;
            }
          | null;
        if (item) {
          selectedRecord = {
            id: toId(item._id),
            shippingMethodId: toId(item.shippingMethodId),
            minWeightGrams:
              item.minWeightGrams === undefined ? "" : toNumberValue(item.minWeightGrams),
            maxWeightGrams:
              item.maxWeightGrams === undefined ? "" : toNumberValue(item.maxWeightGrams),
            minOrderAmount:
              item.minOrderAmount === undefined ? "" : toNumberValue(item.minOrderAmount),
            maxOrderAmount:
              item.maxOrderAmount === undefined ? "" : toNumberValue(item.maxOrderAmount),
            fee: toNumberValue(item.fee),
            isActive: toBooleanValue(item.isActive),
          };
        }
      }
    } else if (kind === "tax-classes") {
      const filter: Record<string, unknown> = {};

      if (query) {
        const regex = new RegExp(escapeRegex(query), "i");
        filter.$or = [{ taxClassName: regex }, { description: regex }];
      }

      if (activeFilter !== undefined) {
        filter.isActive = activeFilter;
      }

      total = await TaxClassModel.countDocuments(filter).exec();
      page = clampPage(requestedPage, Math.max(1, Math.ceil(total / limit)));
      const data = (await TaxClassModel.find(filter)
        .sort(sort === "name_desc" ? { taxClassName: -1 } : { taxClassName: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec()) as Array<{
        _id: unknown;
        taxClassName?: string;
        description?: string;
        isActive?: boolean;
      }>;
      const counts = await ProductModel.aggregate<{
        _id: Types.ObjectId;
        count: number;
      }>([
        { $match: { taxClassId: { $in: data.map((item) => item._id) } } },
        { $group: { _id: "$taxClassId", count: { $sum: 1 } } },
      ]).exec();
      const countMap = new Map(counts.map((item) => [toId(item._id), item.count]));

      rows = data.map((item) => ({
        _id: item._id,
        title: toStringValue(item.taxClassName),
        slug: null,
        code: null,
        description: toNullableString(item.description),
        isActive: toBooleanValue(item.isActive),
        relatedCount: countMap.get(toId(item._id)) ?? 0,
        updatedAt: null,
        extra: null,
      }));

      if (Types.ObjectId.isValid(selectedId)) {
        const item = (await TaxClassModel.findById(selectedId).lean().exec()) as
          | {
              _id: unknown;
              taxClassName?: string;
              description?: string;
              isActive?: boolean;
            }
          | null;
        if (item) {
          selectedRecord = {
            id: toId(item._id),
            title: toStringValue(item.taxClassName),
            description: toStringValue(item.description),
            isActive: toBooleanValue(item.isActive),
          };
        }
      }
    } else if (kind === "tax-rates") {
      const filter: Record<string, unknown> = {};

      if (query) {
        const regex = new RegExp(escapeRegex(query), "i");
        filter.$or = [{ rateName: regex }];
      }

      if (activeFilter !== undefined) {
        filter.isActive = activeFilter;
      }

      const [countries, states, taxClasses] = await Promise.all([
        (await CountryModel.find().sort({ countryName: 1 }).select("countryName").lean().exec()) as Array<{
          _id: unknown;
          countryName?: string;
        }>,
        (await StateRegionModel.find()
          .sort({ stateRegionName: 1 })
          .select("stateRegionName countryId")
          .lean()
          .exec()) as Array<{
          _id: unknown;
          stateRegionName?: string;
          countryId?: unknown;
        }>,
        (await TaxClassModel.find({ isActive: true })
          .sort({ taxClassName: 1 })
          .select("taxClassName")
          .lean()
          .exec()) as Array<{
          _id: unknown;
          taxClassName?: string;
        }>,
      ]);

      zoneOptions = countries.map((country) => ({
        id: toId(country._id),
        label: toStringValue(country.countryName),
      }));
      stateOptions = states.map((state) => ({
        id: toId(state._id),
        label: toStringValue(state.stateRegionName),
        countryId: toId(state.countryId),
      }));
      taxClassOptions = taxClasses.map((taxClass) => ({
        id: toId(taxClass._id),
        label: toStringValue(taxClass.taxClassName),
      }));

      total = await TaxRateModel.countDocuments(filter).exec();
      page = clampPage(requestedPage, Math.max(1, Math.ceil(total / limit)));
      const data = (await TaxRateModel.find(filter)
        .sort(sort === "name_desc" ? { rateName: -1 } : { rateName: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec()) as Array<{
        _id: unknown;
        taxClassId?: unknown;
        countryId?: unknown;
        stateRegionId?: unknown;
        rateName?: string;
        ratePercent?: number;
        priority?: number;
        isActive?: boolean;
        startsAt?: Date;
        endsAt?: Date;
      }>;

      const countryMap = new Map(zoneOptions.map((item) => [item.id, item.label]));
      const stateMap = new Map(stateOptions.map((item) => [item.id, item.label]));
      const taxClassMap = new Map(taxClassOptions.map((item) => [item.id, item.label]));

      rows = data.map((item) => ({
        _id: item._id,
        title: toStringValue(item.rateName),
        slug: null,
        code: `${toNumberValue(item.ratePercent)}%`,
        description: taxClassMap.get(toId(item.taxClassId)) ?? null,
        isActive: toBooleanValue(item.isActive),
        relatedCount: 0,
        updatedAt: toDateValue(item.startsAt),
        extra:
          [countryMap.get(toId(item.countryId)), stateMap.get(toId(item.stateRegionId))]
            .filter(Boolean)
            .join(" / ") || null,
      }));

      if (Types.ObjectId.isValid(selectedId)) {
        const item = (await TaxRateModel.findById(selectedId).lean().exec()) as
          | {
              _id: unknown;
              taxClassId?: unknown;
              countryId?: unknown;
              stateRegionId?: unknown;
              rateName?: string;
              ratePercent?: number;
              priority?: number;
              isActive?: boolean;
              startsAt?: Date;
              endsAt?: Date;
            }
          | null;
        if (item) {
          selectedRecord = {
            id: toId(item._id),
            title: toStringValue(item.rateName),
            taxClassId: toId(item.taxClassId),
            countryId: toId(item.countryId),
            stateRegionId: toId(item.stateRegionId),
            ratePercent: toNumberValue(item.ratePercent),
            priority:
              item.priority === undefined ? 1 : toNumberValue(item.priority),
            startsAt: toDateValue(item.startsAt)?.toISOString().slice(0, 10) ?? "",
            endsAt: toDateValue(item.endsAt)?.toISOString().slice(0, 10) ?? "",
            isActive: toBooleanValue(item.isActive),
          };
        }
      }
    } else if (kind === "pages") {
      const filter: Record<string, unknown> = {};

      if (query) {
        const regex = new RegExp(escapeRegex(query), "i");
        filter.$or = [{ title: regex }, { slug: regex }, { seoTitle: regex }];
      }

      total = await PageModel.countDocuments(filter).exec();
      page = clampPage(requestedPage, Math.max(1, Math.ceil(total / limit)));
      const data = (await PageModel.find(filter)
        .sort(sort === "updated" ? { updatedAt: -1 } : { title: sort === "name_desc" ? -1 : 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec()) as Array<{
        _id: unknown;
        title?: string;
        slug?: string;
        content?: string;
        status?: string;
        updatedAt?: Date;
      }>;

      rows = data.map((item) => ({
        _id: item._id,
        title: toStringValue(item.title),
        slug: toNullableString(item.slug),
        code: toNullableString(item.status),
        description: toNullableString(item.content),
        isActive: toStringValue(item.status) !== "ARCHIVED",
        relatedCount: 0,
        updatedAt: toDateValue(item.updatedAt),
        extra: null,
      }));

      if (Types.ObjectId.isValid(selectedId)) {
        const item = (await PageModel.findById(selectedId).lean().exec()) as
          | {
              _id: unknown;
              title?: string;
              slug?: string;
              content?: string;
              seoTitle?: string;
              seoDescription?: string;
              status?: string;
            }
          | null;
        if (item) {
          selectedRecord = {
            id: toId(item._id),
            title: toStringValue(item.title),
            slug: toStringValue(item.slug),
            content: toStringValue(item.content),
            seoTitle: toStringValue(item.seoTitle),
            seoDescription: toStringValue(item.seoDescription),
            status: toStringValue(item.status) || "DRAFT",
          };
        }
      }
    } else if (kind === "banners") {
      const filter: Record<string, unknown> = {};

      if (query) {
        const regex = new RegExp(escapeRegex(query), "i");
        filter.$or = [{ bannerName: regex }, { title: regex }, { subtitle: regex }];
      }

      if (activeFilter !== undefined) {
        filter.isActive = activeFilter;
      }

      total = await BannerModel.countDocuments(filter).exec();
      page = clampPage(requestedPage, Math.max(1, Math.ceil(total / limit)));
      const data = (await BannerModel.find(filter)
        .sort(sort === "updated" ? { sortOrder: 1 } : { bannerName: sort === "name_desc" ? -1 : 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec()) as Array<{
        _id: unknown;
        bannerName?: string;
        bannerType?: string;
        title?: string;
        subtitle?: string;
        isActive?: boolean;
        sortOrder?: number;
      }>;

      rows = data.map((item) => ({
        _id: item._id,
        title: toStringValue(item.bannerName),
        slug: null,
        code: toNullableString(item.bannerType),
        description: toNullableString(item.title ?? item.subtitle),
        isActive: toBooleanValue(item.isActive),
        relatedCount: 0,
        updatedAt: null,
        extra: `Sort ${toNumberValue(item.sortOrder)}`,
      }));

      if (Types.ObjectId.isValid(selectedId)) {
        const item = (await BannerModel.findById(selectedId).lean().exec()) as
          | {
              _id: unknown;
              bannerName?: string;
              bannerType?: string;
              assetId?: unknown;
              linkUrl?: string;
              title?: string;
              subtitle?: string;
              startsAt?: Date;
              endsAt?: Date;
              isActive?: boolean;
              sortOrder?: number;
            }
          | null;
        if (item) {
          selectedRecord = {
            id: toId(item._id),
            title: toStringValue(item.bannerName),
            bannerType: toStringValue(item.bannerType),
            assetId: toId(item.assetId),
            linkUrl: toStringValue(item.linkUrl),
            bannerTitle: toStringValue(item.title),
            subtitle: toStringValue(item.subtitle),
            startsAt: toDateValue(item.startsAt)?.toISOString().slice(0, 10) ?? "",
            endsAt: toDateValue(item.endsAt)?.toISOString().slice(0, 10) ?? "",
            sortOrder: toNumberValue(item.sortOrder),
            isActive: toBooleanValue(item.isActive),
          };
        }
      }
    } else if (kind === "navigation-menus") {
      const filter: Record<string, unknown> = {};

      if (query) {
        const regex = new RegExp(escapeRegex(query), "i");
        filter.$or = [{ menuName: regex }];
      }

      if (activeFilter !== undefined) {
        filter.isActive = activeFilter;
      }

      total = await NavigationMenuModel.countDocuments(filter).exec();
      page = clampPage(requestedPage, Math.max(1, Math.ceil(total / limit)));
      const data = (await NavigationMenuModel.find(filter)
        .sort(sort === "name_desc" ? { menuName: -1 } : { menuName: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec()) as Array<{
        _id: unknown;
        menuName?: string;
        isActive?: boolean;
      }>;
      const counts = await NavigationMenuItemModel.aggregate<{
        _id: Types.ObjectId;
        count: number;
      }>([
        { $match: { navigationMenuId: { $in: data.map((item) => item._id) } } },
        { $group: { _id: "$navigationMenuId", count: { $sum: 1 } } },
      ]).exec();
      const countMap = new Map(counts.map((item) => [toId(item._id), item.count]));

      rows = data.map((item) => ({
        _id: item._id,
        title: toStringValue(item.menuName),
        slug: null,
        code: null,
        description: null,
        isActive: toBooleanValue(item.isActive),
        relatedCount: countMap.get(toId(item._id)) ?? 0,
        updatedAt: null,
        extra: null,
      }));

      if (Types.ObjectId.isValid(selectedId)) {
        const item = (await NavigationMenuModel.findById(selectedId).lean().exec()) as
          | {
              _id: unknown;
              menuName?: string;
              isActive?: boolean;
            }
          | null;
        if (item) {
          selectedRecord = {
            id: toId(item._id),
            title: toStringValue(item.menuName),
            isActive: toBooleanValue(item.isActive),
          };
        }
      }
    }

    return {
      kind,
      filters: { query, active, sort, page, limit },
      items: rows.map((row) => ({
        id: toId(row._id),
        title: row.title,
        slug: row.slug,
        code: row.code,
        description: row.description,
        isActive: row.isActive,
        relatedCount: row.relatedCount,
        updatedAt: row.updatedAt,
        extra: row.extra,
      })),
      selectedRecord,
      categoryOptions,
      countryOptions,
      zoneOptions,
      methodOptions,
      stateOptions,
      taxClassOptions,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      page,
    };
  }

  buildHref(
    pathname: string,
    searchParams: AdminSearchParams,
    overrides: Record<string, string | number | boolean | undefined | null>,
  ) {
    return buildHref(pathname, searchParams, overrides);
  }
}

export const adminWorkspaceService = new AdminWorkspaceService();
