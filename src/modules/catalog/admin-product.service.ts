import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/mongodb";
import {
  clampPage,
  readNumberParam,
  readSearchParam,
  type AdminSearchParams,
} from "@/modules/admin/admin-query";
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
import { getVariantAvailabilityState } from "@/modules/catalog/catalog-availability";
import {
  CollectionModel,
  ProductBadgeModel,
  ProductTagModel,
} from "@/modules/catalog/catalog-extra.models";
import { computeProductIssues, type ProductIssue } from "@/modules/catalog/product-issues";
import { CountryModel } from "@/modules/core/core.models";
import { VariantSourceModel } from "@/modules/sourcing/sourcing.models";

const VARIANT_PAGE_LIMIT = 15;
const RELATION_PAGE_LIMIT = 12;
const BUNDLE_PAGE_LIMIT = 12;

function toId(value: unknown) {
  return value ? String(value) : "";
}

function toStringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function toNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
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

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type ProductShell = {
  id: string;
  productName: string;
  slug: string;
  status: string;
  visibility: string;
  updatedAt: Date | null;
};

export type ProductGeneralWorkspace = {
  product: null | (ProductShell & {
    productTypeId: string;
    categoryId: string;
    brandId: string;
    taxClassId: string;
    originCountryId: string;
    shortDescription: string;
    description: string;
    material: string;
    careInstructions: string;
    warrantyInfo: string;
    conditionType: string;
    isFeatured: boolean;
    isNewArrival: boolean;
    isBestSeller: boolean;
    collectionIds: string[];
    tagIds: string[];
    badgeIds: string[];
    optionTypeIds: string[];
    issues: ProductIssue[];
  });
  categories: Array<{ id: string; label: string }>;
  brands: Array<{ id: string; label: string }>;
  productTypes: Array<{ id: string; label: string }>;
  taxClasses: Array<{ id: string; label: string }>;
  countryOptions: Array<{ id: string; label: string }>;
  collections: Array<{ id: string; label: string }>;
  productTags: Array<{ id: string; label: string }>;
  productBadges: Array<{ id: string; label: string }>;
  optionTypes: Array<{ id: string; label: string }>;
};

export type ProductVariantsWorkspace = {
  product: ProductShell;
  filters: {
    query: string;
    active: string;
    page: number;
  };
  optionGroups: Array<{
    id: string;
    name: string;
    values: Array<{
      id: string;
      label: string;
    }>;
  }>;
  items: Array<{
    id: string;
    variantName: string | null;
    sku: string;
    optionValueIds: string[];
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
  }>;
  total: number;
  totalPages: number;
  page: number;
};

export type ProductSpecificationsWorkspace = {
  product: ProductShell;
  specificationsText: string;
};

export type ProductFaqWorkspace = {
  product: ProductShell;
  faqs: Array<{
    id: string;
    question: string;
    answer: string;
    sortOrder: number;
    isActive: boolean;
  }>;
};

export type ProductRelationsWorkspace = {
  product: ProductShell;
  items: Array<{
    id: string;
    relatedProductId: string;
    productName: string;
    slug: string | null;
    relationType: string;
    sortOrder: number;
    status: string | null;
  }>;
  total: number;
  totalPages: number;
  page: number;
};

export type ProductBundlesWorkspace = {
  product: ProductShell;
  items: Array<{
    id: string;
    childProductId: string;
    childVariantId: string | null;
    productName: string;
    variantLabel: string | null;
    sku: string | null;
    quantity: number;
    sortOrder: number;
  }>;
  total: number;
  totalPages: number;
  page: number;
};

export type ProductSeoWorkspace = {
  product: ProductShell & {
    seoTitle: string;
    seoDescription: string;
  };
};

type ProductDocumentLike = {
  _id: unknown;
  productName?: string;
  slug?: string;
  status?: string;
  visibility?: string;
  updatedAt?: Date;
  productTypeId?: unknown;
  categoryId?: unknown;
  brandId?: unknown;
  taxClassId?: unknown;
  originCountryId?: unknown;
  shortDescription?: string;
  description?: string;
  material?: string;
  careInstructions?: string;
  warrantyInfo?: string;
  conditionType?: string;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  collectionIds?: unknown[];
  tagIds?: unknown[];
  badgeIds?: unknown[];
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
    sortOrder?: number;
  }>;
  faqs?: Array<{
    _id?: unknown;
    question?: string;
    answer?: string;
    sortOrder?: number;
    isActive?: boolean;
  }>;
  relations?: Array<{
    _id?: unknown;
    relatedProductId?: unknown;
    relationType?: string;
    sortOrder?: number;
  }>;
  bundleItems?: Array<{
    _id?: unknown;
    childProductId?: unknown;
    childVariantId?: unknown;
    quantity?: number;
    sortOrder?: number;
  }>;
  seoTitle?: string;
  seoDescription?: string;
};

class AdminProductService {
  private async findProductDocument(productId: string) {
    if (!Types.ObjectId.isValid(productId)) {
      return null;
    }

    await connectToDatabase();

    return (await ProductModel.findById(productId)
      .lean()
      .exec()) as ProductDocumentLike | null;
  }

  private toProductShell(product: ProductDocumentLike): ProductShell {
    return {
      id: toId(product._id),
      productName: toStringValue(product.productName),
      slug: toStringValue(product.slug),
      status: toStringValue(product.status) || "DRAFT",
      visibility: toStringValue(product.visibility) || "PUBLIC",
      updatedAt: toDateValue(product.updatedAt),
    };
  }

  async getProductGeneralWorkspace(productId?: string): Promise<ProductGeneralWorkspace> {
    await connectToDatabase();

    const [categories, brands, productTypes, taxClasses, countries, collections, tags, badges, optionTypes, product] =
      await Promise.all([
        CategoryModel.find()
          .sort({ depth: 1, sortOrder: 1, categoryName: 1 })
          .select("categoryName fullSlugPath")
          .lean()
          .exec(),
        BrandModel.find().sort({ brandName: 1 }).select("brandName").lean().exec(),
        ProductTypeModel.find().sort({ name: 1 }).select("name code").lean().exec(),
        TaxClassModel.find().sort({ taxClassName: 1 }).select("taxClassName").lean().exec(),
        CountryModel.find().sort({ countryName: 1 }).select("countryName").lean().exec(),
        CollectionModel.find().sort({ collectionName: 1 }).select("collectionName").lean().exec(),
        ProductTagModel.find().sort({ tagName: 1 }).select("tagName").lean().exec(),
        ProductBadgeModel.find({ isActive: true }).sort({ badgeName: 1 }).select("badgeName label").lean().exec(),
        OptionTypeModel.find().sort({ optionName: 1 }).select("optionName").lean().exec(),
        productId && Types.ObjectId.isValid(productId)
          ? ((await ProductModel.findById(productId).lean().exec()) as ProductDocumentLike | null)
          : null,
      ]);

    const productVariants =
      productId && Types.ObjectId.isValid(productId)
        ? ((await ProductVariantModel.find({ productId })
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
          }>)
        : [];

    const productIssues = product
      ? computeProductIssues({
          product: {
            categoryId: product.categoryId,
            status: product.status,
            visibility: product.visibility,
            images: product.images ?? [],
          },
          variants: productVariants,
        }).issues
      : [];

    return {
      product: product
        ? {
            ...this.toProductShell(product),
            productTypeId: toId(product.productTypeId),
            categoryId: toId(product.categoryId),
            brandId: toId(product.brandId),
            taxClassId: toId(product.taxClassId),
            originCountryId: toId(product.originCountryId),
            shortDescription: toStringValue(product.shortDescription),
            description: toStringValue(product.description),
            material: toStringValue(product.material),
            careInstructions: toStringValue(product.careInstructions),
            warrantyInfo: toStringValue(product.warrantyInfo),
            conditionType: toStringValue(product.conditionType) || "NEW",
            isFeatured: toBooleanValue(product.isFeatured),
            isNewArrival: toBooleanValue(product.isNewArrival),
            isBestSeller: toBooleanValue(product.isBestSeller),
            collectionIds: (product.collectionIds ?? []).map((value) => toId(value)),
            tagIds: (product.tagIds ?? []).map((value) => toId(value)),
            badgeIds: (product.badgeIds ?? []).map((value) => toId(value)),
            optionTypeIds: (product.optionTypeIds ?? []).map((value) => toId(value)),
            issues: productIssues,
          }
        : null,
      categories: categories.map((item) => ({
        id: toId(item._id),
        label: toStringValue(item.fullSlugPath) || toStringValue(item.categoryName),
      })),
      brands: brands.map((item) => ({
        id: toId(item._id),
        label: toStringValue(item.brandName),
      })),
      productTypes: productTypes.map((item) => ({
        id: toId(item._id),
        label: [toStringValue(item.name), toStringValue(item.code)].filter(Boolean).join(" / "),
      })),
      taxClasses: taxClasses.map((item) => ({
        id: toId(item._id),
        label: toStringValue(item.taxClassName),
      })),
      countryOptions: countries.map((item) => ({
        id: toId(item._id),
        label: toStringValue(item.countryName),
      })),
      collections: collections.map((item) => ({
        id: toId(item._id),
        label: toStringValue(item.collectionName),
      })),
      productTags: tags.map((item) => ({
        id: toId(item._id),
        label: toStringValue(item.tagName),
      })),
      productBadges: badges.map((item) => ({
        id: toId(item._id),
        label: [toStringValue(item.badgeName), toStringValue(item.label)].filter(Boolean).join(" / "),
      })),
      optionTypes: optionTypes.map((item) => ({
        id: toId(item._id),
        label: toStringValue(item.optionName),
      })),
    };
  }

  async getProductVariantsWorkspace(
    productId: string,
    searchParams: AdminSearchParams,
  ): Promise<ProductVariantsWorkspace | null> {
    await connectToDatabase();

    const product = await this.findProductDocument(productId);

    if (!product) {
      return null;
    }

    const query = readSearchParam(searchParams, "q").trim();
    const active = readSearchParam(searchParams, "active");
    const requestedPage = readNumberParam(searchParams, "page", 1);
    const filter: Record<string, unknown> = {
      productId: new Types.ObjectId(productId),
    };

    if (active === "active") {
      filter.isActive = true;
    }

    if (active === "inactive") {
      filter.isActive = false;
    }

    if (query) {
      const regex = new RegExp(escapeRegex(query), "i");
      filter.$or = [{ sku: regex }, { variantName: regex }];
    }

    const total = await ProductVariantModel.countDocuments(filter).exec();
    const totalPages = Math.max(1, Math.ceil(total / VARIANT_PAGE_LIMIT));
    const page = clampPage(requestedPage, totalPages);

    const [variantRows, optionValues, sourceCounts] = await Promise.all([
      ProductVariantModel.find(filter)
        .sort({ isDefault: -1, createdAt: 1 })
        .skip((page - 1) * VARIANT_PAGE_LIMIT)
        .limit(VARIANT_PAGE_LIMIT)
        .lean()
        .exec(),
      OptionValueModel.find({
        optionTypeId: {
          $in: (product.optionTypeIds ?? [])
            .filter((value) => Types.ObjectId.isValid(String(value)))
            .map((value) => new Types.ObjectId(String(value))),
        },
      })
        .sort({ sortOrder: 1, valueName: 1 })
        .select("optionTypeId valueName valueCode")
        .lean()
        .exec(),
      VariantSourceModel.aggregate<{ _id: Types.ObjectId; count: number }>([
        { $match: { variantId: { $in: [] } } },
      ]).exec(),
    ]);

    const variantIds = variantRows.map((item) => item._id);
    const realSourceCounts =
      variantIds.length > 0
        ? await VariantSourceModel.aggregate<{ _id: Types.ObjectId; count: number }>([
            { $match: { variantId: { $in: variantIds } } },
            { $group: { _id: "$variantId", count: { $sum: 1 } } },
          ]).exec()
        : sourceCounts;

    const optionValueMap = new Map(
      optionValues.map((item) => [
        toId(item._id),
        [toStringValue(item.valueName), toStringValue(item.valueCode)]
          .filter(Boolean)
          .join(" "),
      ]),
    );
    const sourceCountMap = new Map(
      realSourceCounts.map((item) => [toId(item._id), toNumberValue(item.count)]),
    );

    const groupedOptionTypes = await Promise.all(
      (product.optionTypeIds ?? [])
        .map((value) => String(value))
        .filter((value) => Types.ObjectId.isValid(value))
        .map(async (optionTypeId) => {
          const optionType = await OptionTypeModel.findById(optionTypeId)
            .select("optionName")
            .lean()
            .exec();

          if (!optionType) {
            return null;
          }

          return {
            id: String(optionType._id),
            name: toStringValue(optionType.optionName),
            values: optionValues
              .filter((value) => toId(value.optionTypeId) === optionTypeId)
              .map((value) => ({
                id: toId(value._id),
                label:
                  [toStringValue(value.valueName), toStringValue(value.valueCode)]
                    .filter(Boolean)
                    .join(" ") || "Value",
              })),
          };
        }),
    );

    return {
      product: this.toProductShell(product),
      filters: {
        query,
        active,
        page,
      },
      optionGroups: groupedOptionTypes.filter(
        (value): value is NonNullable<typeof value> => Boolean(value),
      ),
      items: variantRows.map((variant) => {
        const availability = getVariantAvailabilityState(variant);

        return {
          id: toId(variant._id),
          variantName: toNullableString(variant.variantName),
          sku: toStringValue(variant.sku),
          optionValueIds: (variant.optionValueIds ?? []).map((value: unknown) => toId(value)),
          optionSummary: (variant.optionValueIds ?? [])
            .map((value: unknown) => optionValueMap.get(toId(value)))
            .filter((value: string | undefined): value is string => Boolean(value))
            .join(" / "),
          unitPrice: toNumberValue(variant.unitPrice),
          compareAtPrice:
            variant.compareAtPrice === undefined ? null : toNumberValue(variant.compareAtPrice),
          costPrice: variant.costPrice === undefined ? null : toNumberValue(variant.costPrice),
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
          sourceCount: sourceCountMap.get(toId(variant._id)) ?? 0,
        };
      }),
      total,
      totalPages,
      page,
    };
  }

  async getProductSpecificationsWorkspace(
    productId: string,
  ): Promise<ProductSpecificationsWorkspace | null> {
    const product = await this.findProductDocument(productId);

    if (!product) {
      return null;
    }

    return {
      product: this.toProductShell(product),
      specificationsText: (product.specifications ?? [])
        .sort((left, right) => toNumberValue(left.sortOrder) - toNumberValue(right.sortOrder))
        .map((item: { specGroup?: string; specKey?: string; specValue?: string }) =>
          [toStringValue(item.specGroup), toStringValue(item.specKey), toStringValue(item.specValue)]
            .filter(Boolean)
            .join(" | "),
        )
        .join("\n"),
    };
  }

  async getProductFaqWorkspace(productId: string): Promise<ProductFaqWorkspace | null> {
    const product = await this.findProductDocument(productId);

    if (!product) {
      return null;
    }

    return {
      product: this.toProductShell(product),
      faqs: (product.faqs ?? [])
        .map((item: { _id?: unknown; question?: string; answer?: string; sortOrder?: number; isActive?: boolean }) => ({
          id: toId(item._id),
          question: toStringValue(item.question),
          answer: toStringValue(item.answer),
          sortOrder: toNumberValue(item.sortOrder),
          isActive: toBooleanValue(item.isActive),
        }))
        .sort((left, right) => left.sortOrder - right.sortOrder),
    };
  }

  async getProductRelationsWorkspace(
    productId: string,
    searchParams: AdminSearchParams,
  ): Promise<ProductRelationsWorkspace | null> {
    const product = await this.findProductDocument(productId);

    if (!product) {
      return null;
    }

    const requestedPage = readNumberParam(searchParams, "page", 1);
    const relationRows = [...(product.relations ?? [])].sort(
      (left, right) => toNumberValue(left.sortOrder) - toNumberValue(right.sortOrder),
    );
    const total = relationRows.length;
    const totalPages = Math.max(1, Math.ceil(total / RELATION_PAGE_LIMIT));
    const page = clampPage(requestedPage, totalPages);
    const pageRows = relationRows.slice(
      (page - 1) * RELATION_PAGE_LIMIT,
      page * RELATION_PAGE_LIMIT,
    );
    const relatedProductIds = pageRows
      .map((row: { relatedProductId?: unknown }) => toId(row.relatedProductId))
      .filter((value: string) => Types.ObjectId.isValid(value));
    const relatedProducts = relatedProductIds.length
      ? await ProductModel.find({
          _id: { $in: relatedProductIds.map((value) => new Types.ObjectId(value)) },
        })
          .select("productName slug status")
          .lean()
          .exec()
      : [];
    const relatedProductMap = new Map(
      relatedProducts.map((item) => [
        toId(item._id),
        {
          productName: toStringValue(item.productName),
          slug: toNullableString(item.slug),
          status: toNullableString(item.status),
        },
      ]),
    );

    return {
      product: this.toProductShell(product),
      items: pageRows.map((row) => ({
        id: toId(row._id),
        relatedProductId: toId(row.relatedProductId),
        productName:
          relatedProductMap.get(toId(row.relatedProductId))?.productName ?? "Product",
        slug: relatedProductMap.get(toId(row.relatedProductId))?.slug ?? null,
        relationType: toStringValue(row.relationType) || "RELATED",
        sortOrder: toNumberValue(row.sortOrder),
        status: relatedProductMap.get(toId(row.relatedProductId))?.status ?? null,
      })),
      total,
      totalPages,
      page,
    };
  }

  async getProductBundlesWorkspace(
    productId: string,
    searchParams: AdminSearchParams,
  ): Promise<ProductBundlesWorkspace | null> {
    const product = await this.findProductDocument(productId);

    if (!product) {
      return null;
    }

    const requestedPage = readNumberParam(searchParams, "page", 1);
    const bundleRows = [...(product.bundleItems ?? [])].sort(
      (left, right) => toNumberValue(left.sortOrder) - toNumberValue(right.sortOrder),
    );
    const total = bundleRows.length;
    const totalPages = Math.max(1, Math.ceil(total / BUNDLE_PAGE_LIMIT));
    const page = clampPage(requestedPage, totalPages);
    const pageRows = bundleRows.slice((page - 1) * BUNDLE_PAGE_LIMIT, page * BUNDLE_PAGE_LIMIT);

    const childProductIds = pageRows
      .map((row: { childProductId?: unknown }) => toId(row.childProductId))
      .filter((value: string) => Types.ObjectId.isValid(value));
    const childVariantIds = pageRows
      .map((row: { childVariantId?: unknown }) => toId(row.childVariantId))
      .filter((value: string) => Types.ObjectId.isValid(value));

    const [childProducts, childVariants] = await Promise.all([
      childProductIds.length > 0
        ? ProductModel.find({
            _id: { $in: childProductIds.map((value) => new Types.ObjectId(value)) },
          })
            .select("productName")
            .lean()
            .exec()
        : [],
      childVariantIds.length > 0
        ? ProductVariantModel.find({
            _id: { $in: childVariantIds.map((value) => new Types.ObjectId(value)) },
          })
            .select("variantName sku")
            .lean()
            .exec()
        : [],
    ]);

    const childProductMap = new Map(
      childProducts.map((item) => [toId(item._id), toStringValue(item.productName)]),
    );
    const childVariantMap = new Map(
      childVariants.map((item) => [
        toId(item._id),
        {
          variantLabel: toNullableString(item.variantName),
          sku: toNullableString(item.sku),
        },
      ]),
    );

    return {
      product: this.toProductShell(product),
      items: pageRows.map((row) => ({
        id: toId(row._id),
        childProductId: toId(row.childProductId),
        childVariantId: toNullableString(toId(row.childVariantId)),
        productName: childProductMap.get(toId(row.childProductId)) ?? "Product",
        variantLabel: childVariantMap.get(toId(row.childVariantId))?.variantLabel ?? null,
        sku: childVariantMap.get(toId(row.childVariantId))?.sku ?? null,
        quantity: toNumberValue(row.quantity),
        sortOrder: toNumberValue(row.sortOrder),
      })),
      total,
      totalPages,
      page,
    };
  }

  async getProductSeoWorkspace(productId: string): Promise<ProductSeoWorkspace | null> {
    const product = await this.findProductDocument(productId);

    if (!product) {
      return null;
    }

    return {
      product: {
        ...this.toProductShell(product),
        seoTitle: toStringValue(product.seoTitle),
        seoDescription: toStringValue(product.seoDescription),
      },
    };
  }
}

export const adminProductService = new AdminProductService();
