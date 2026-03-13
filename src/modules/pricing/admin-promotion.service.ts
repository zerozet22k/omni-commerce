import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/mongodb";
import {
  buildHref,
  clampPage,
  readNumberParam,
  readSearchParam,
  type AdminSearchParams,
} from "@/modules/admin/admin-query";
import { OrderModel } from "@/modules/orders/orders.models";
import {
  CouponUsageLogModel,
  PromotionModel,
  PromotionProductModel,
  PromotionVariantModel,
} from "@/modules/pricing/pricing.models";
import { UserModel } from "@/modules/users/user.model";

const TARGET_PAGE_LIMIT = 10;
const USAGE_PAGE_LIMIT = 10;

function toId(value: unknown) {
  return value ? String(value) : "";
}

function toStringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function toNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
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

function toNumberValue(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

export type PromotionDetailWorkspace = {
  promotion: {
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
  };
  productTargets: {
    items: Array<{
      id: string;
      productId: string;
      productName: string;
      slug: string | null;
      brandName: string | null;
      categoryName: string | null;
      status: string | null;
    }>;
    page: number;
    total: number;
    totalPages: number;
  };
  variantTargets: {
    items: Array<{
      id: string;
      variantId: string;
      productId: string;
      productName: string;
      variantName: string | null;
      sku: string | null;
      status: string | null;
    }>;
    page: number;
    total: number;
    totalPages: number;
  };
  couponUsage: {
    items: Array<{
      id: string;
      usedCode: string | null;
      orderId: string | null;
      orderNo: string | null;
      customerName: string | null;
      usedAt: Date | null;
    }>;
    page: number;
    total: number;
    totalPages: number;
  };
};

class AdminPromotionService {
  async getPromotionDetailWorkspace(
    promotionId: string,
    searchParams: AdminSearchParams,
  ): Promise<PromotionDetailWorkspace | null> {
    if (!Types.ObjectId.isValid(promotionId)) {
      return null;
    }

    await connectToDatabase();

    const promotion = (await PromotionModel.findById(promotionId)
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

    if (!promotion) {
      return null;
    }

    const productPage = clampPage(readNumberParam(searchParams, "productPage", 1), Number.MAX_SAFE_INTEGER);
    const variantPage = clampPage(readNumberParam(searchParams, "variantPage", 1), Number.MAX_SAFE_INTEGER);
    const usagePage = clampPage(readNumberParam(searchParams, "usagePage", 1), Number.MAX_SAFE_INTEGER);

    const [productTotal, variantTotal, usageTotal] = await Promise.all([
      PromotionProductModel.countDocuments({ promotionId }).exec(),
      PromotionVariantModel.countDocuments({ promotionId }).exec(),
      CouponUsageLogModel.countDocuments({ promotionId }).exec(),
    ]);

    const productTotalPages = Math.max(1, Math.ceil(productTotal / TARGET_PAGE_LIMIT));
    const variantTotalPages = Math.max(1, Math.ceil(variantTotal / TARGET_PAGE_LIMIT));
    const usageTotalPages = Math.max(1, Math.ceil(usageTotal / USAGE_PAGE_LIMIT));

    const safeProductPage = clampPage(productPage, productTotalPages);
    const safeVariantPage = clampPage(variantPage, variantTotalPages);
    const safeUsagePage = clampPage(usagePage, usageTotalPages);

    const [productTargets, variantTargets, usageRows] = await Promise.all([
      PromotionProductModel.aggregate<{
        _id: Types.ObjectId;
        productId: Types.ObjectId;
        productName?: string;
        slug?: string;
        brandName?: string;
        categoryName?: string;
        status?: string;
      }>([
        { $match: { promotionId: new Types.ObjectId(promotionId) } },
        {
          $lookup: {
            from: "products",
            localField: "productId",
            foreignField: "_id",
            as: "product",
          },
        },
        { $unwind: "$product" },
        {
          $lookup: {
            from: "brands",
            localField: "product.brandId",
            foreignField: "_id",
            as: "brand",
          },
        },
        {
          $lookup: {
            from: "categories",
            localField: "product.categoryId",
            foreignField: "_id",
            as: "category",
          },
        },
        {
          $project: {
            productId: "$product._id",
            productName: "$product.productName",
            slug: "$product.slug",
            status: "$product.status",
            brandName: { $arrayElemAt: ["$brand.brandName", 0] },
            categoryName: { $arrayElemAt: ["$category.categoryName", 0] },
          },
        },
        { $sort: { productName: 1, _id: 1 } },
        { $skip: (safeProductPage - 1) * TARGET_PAGE_LIMIT },
        { $limit: TARGET_PAGE_LIMIT },
      ]).exec(),
      PromotionVariantModel.aggregate<{
        _id: Types.ObjectId;
        variantId: Types.ObjectId;
        productId: Types.ObjectId;
        productName?: string;
        variantName?: string;
        sku?: string;
        status?: string;
      }>([
        { $match: { promotionId: new Types.ObjectId(promotionId) } },
        {
          $lookup: {
            from: "product_variants",
            localField: "variantId",
            foreignField: "_id",
            as: "variant",
          },
        },
        { $unwind: "$variant" },
        {
          $lookup: {
            from: "products",
            localField: "variant.productId",
            foreignField: "_id",
            as: "product",
          },
        },
        { $unwind: "$product" },
        {
          $project: {
            variantId: "$variant._id",
            productId: "$product._id",
            productName: "$product.productName",
            variantName: "$variant.variantName",
            sku: "$variant.sku",
            status: "$product.status",
          },
        },
        { $sort: { productName: 1, sku: 1, _id: 1 } },
        { $skip: (safeVariantPage - 1) * TARGET_PAGE_LIMIT },
        { $limit: TARGET_PAGE_LIMIT },
      ]).exec(),
      CouponUsageLogModel.find({ promotionId })
        .sort({ usedAt: -1, _id: -1 })
        .skip((safeUsagePage - 1) * USAGE_PAGE_LIMIT)
        .limit(USAGE_PAGE_LIMIT)
        .lean()
        .exec(),
    ]);

    const orderIds = usageRows.map((row) => toId(row.orderId)).filter(Boolean);
    const customerIds = usageRows.map((row) => toId(row.customerId)).filter(Boolean);

    const [orders, customers] = await Promise.all([
      orderIds.length > 0
        ? ((await OrderModel.find({
            _id: {
              $in: orderIds
                .filter((orderId) => Types.ObjectId.isValid(orderId))
                .map((orderId) => new Types.ObjectId(orderId)),
            },
          })
            .select("orderNo")
            .lean()
            .exec()) as Array<{ _id: unknown; orderNo?: string }>)
        : [],
      customerIds.length > 0
        ? ((await UserModel.find({
            _id: {
              $in: customerIds
                .filter((customerId) => Types.ObjectId.isValid(customerId))
                .map((customerId) => new Types.ObjectId(customerId)),
            },
          })
            .select("fullName")
            .lean()
            .exec()) as Array<{ _id: unknown; fullName?: string }>)
        : [],
    ]);

    const orderMap = new Map(orders.map((order) => [toId(order._id), toNullableString(order.orderNo)]));
    const customerMap = new Map(
      customers.map((customer) => [toId(customer._id), toNullableString(customer.fullName)]),
    );

    return {
      promotion: {
        id: toId(promotion._id),
        code: toNullableString(promotion.code),
        name: toStringValue(promotion.name),
        description: toNullableString(promotion.description),
        promotionType: toStringValue(promotion.promotionType) || "COUPON",
        discountType: toNullableString(promotion.discountType),
        discountValue:
          promotion.discountValue === undefined ? null : toNumberValue(promotion.discountValue),
        minOrderAmount:
          promotion.minOrderAmount === undefined ? null : toNumberValue(promotion.minOrderAmount),
        maxDiscountAmount:
          promotion.maxDiscountAmount === undefined
            ? null
            : toNumberValue(promotion.maxDiscountAmount),
        usageLimit: promotion.usageLimit === undefined ? null : toNumberValue(promotion.usageLimit),
        usageCount: toNumberValue(promotion.usageCount),
        perCustomerLimit:
          promotion.perCustomerLimit === undefined
            ? null
            : toNumberValue(promotion.perCustomerLimit),
        startsAt: toDateValue(promotion.startsAt),
        endsAt: toDateValue(promotion.endsAt),
        heroAssetId: toNullableString(toId(promotion.heroAssetId)),
        isActive: Boolean(promotion.isActive),
      },
      productTargets: {
        items: productTargets.map((item) => ({
          id: toId(item._id),
          productId: toId(item.productId),
          productName: toStringValue(item.productName) || "Product",
          slug: toNullableString(item.slug),
          brandName: toNullableString(item.brandName),
          categoryName: toNullableString(item.categoryName),
          status: toNullableString(item.status),
        })),
        page: safeProductPage,
        total: productTotal,
        totalPages: productTotalPages,
      },
      variantTargets: {
        items: variantTargets.map((item) => ({
          id: toId(item._id),
          variantId: toId(item.variantId),
          productId: toId(item.productId),
          productName: toStringValue(item.productName) || "Product",
          variantName: toNullableString(item.variantName),
          sku: toNullableString(item.sku),
          status: toNullableString(item.status),
        })),
        page: safeVariantPage,
        total: variantTotal,
        totalPages: variantTotalPages,
      },
      couponUsage: {
        items: usageRows.map((row) => ({
          id: toId(row._id),
          usedCode: toNullableString(row.usedCode),
          orderId: toNullableString(toId(row.orderId)),
          orderNo: orderMap.get(toId(row.orderId)) ?? null,
          customerName: customerMap.get(toId(row.customerId)) ?? null,
          usedAt: toDateValue(row.usedAt),
        })),
        page: safeUsagePage,
        total: usageTotal,
        totalPages: usageTotalPages,
      },
    };
  }

  buildDetailHref(
    promotionId: string,
    searchParams: AdminSearchParams,
    overrides: Record<string, string | number | boolean | undefined | null>,
  ) {
    return buildHref(`/dashboard/catalog/promotions/${promotionId}`, searchParams, overrides);
  }

  getSelectedId(searchParams: AdminSearchParams) {
    return readSearchParam(searchParams, "promotionId");
  }
}

export const adminPromotionService = new AdminPromotionService();
