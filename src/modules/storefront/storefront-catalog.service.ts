import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/mongodb";
import { AppError } from "@/lib/errors/app-error";
import { storeUploadedImageAsset } from "@/lib/media/upload";
import { assertObjectId } from "@/lib/utils/object-id";
import {
  BrandModel,
  CategoryModel,
  OptionTypeModel,
  OptionValueModel,
  ProductModel,
  ProductVariantModel,
} from "@/modules/catalog/catalog.models";
import {
  CollectionModel,
  CategoryFilterConfigModel,
  ProductBadgeModel,
  ProductTagModel,
  SpecificationDefinitionModel,
} from "@/modules/catalog/catalog-extra.models";
import {
  getVariantAvailabilityState,
  summarizeProductVariants,
} from "@/modules/catalog/catalog-availability";
import {
  BannerModel,
  NavigationMenuItemModel,
  NavigationMenuModel,
  PageModel,
} from "@/modules/content/content.models";
import {
  RecentlyViewedProductModel,
  WishlistItemModel,
  WishlistModel,
} from "@/modules/customers/customers.models";
import {
  MediaAssetModel,
  CountryModel,
  StoreSettingsModel,
} from "@/modules/core/core.models";
import { ReviewMediaModel, ReviewModel } from "@/modules/engagement/engagement.models";
import { OrderItemModel, OrderModel } from "@/modules/orders/orders.models";
import {
  PromotionModel,
  PromotionProductModel,
  PromotionVariantModel,
  ShippingMethodModel,
  ShippingZoneCountryModel,
} from "@/modules/pricing/pricing.models";
import { buildStorefrontSearchHref } from "@/modules/storefront/storefront-query";
import type {
  StorefrontActiveFilterChip,
  StorefrontBanner,
  StorefrontConfiguredFilterGroup,
  StorefrontFilterOption,
  StorefrontHomePageData,
  StorefrontHomeProductSection,
  StorefrontLink,
  StorefrontPageLink,
  StorefrontProductBadge,
  StorefrontProductCard,
  StorefrontProductDetail,
  StorefrontProductListing,
  StorefrontProductOptionGroup,
  StorefrontProductOptionValue,
  StorefrontProductVariant,
  StorefrontPromotion,
  StorefrontSearchInput,
  StorefrontSessionUser,
  StorefrontShellData,
  StorefrontShippingMethod,
  StorefrontWishlistItem,
} from "@/modules/storefront/storefront.types";
import {
  storefrontEscapeRegex,
  storefrontImageAssetIds,
  storefrontIsInRange,
  storefrontNullableString,
  storefrontNumber,
  storefrontToId,
  storefrontUnique,
} from "@/modules/storefront/storefront-helpers";
import { storefrontService } from "@/modules/storefront/storefront.service";
import { UserModel } from "@/modules/users/user.model";
import { syncProductReviewAggregate } from "@/modules/engagement/review-aggregates";

type ProductRecord = {
  _id: unknown;
  slug?: string;
  productName?: string;
  shortDescription?: string;
  description?: string;
  material?: string;
  careInstructions?: string;
  warrantyInfo?: string;
  conditionType?: "NEW" | "REFURBISHED";
  categoryId?: unknown;
  brandId?: unknown;
  originCountryId?: unknown;
  avgRating?: number;
  reviewCount?: number;
  soldCount?: number;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  tagIds?: unknown[];
  collectionIds?: unknown[];
  badgeIds?: unknown[];
  optionTypeIds?: unknown[];
  specifications?: Array<{
    _id?: unknown;
    specDefinitionId?: unknown;
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
  images?: Array<{
    assetId?: unknown;
    sortOrder?: number;
    isPrimary?: boolean;
  }>;
  relations?: Array<{
    relatedProductId?: unknown;
    relationType?: "RELATED" | "UPSELL" | "CROSS_SELL" | "SIMILAR";
    sortOrder?: number;
  }>;
  bundleItems?: Array<{
    childProductId?: unknown;
    childVariantId?: unknown;
    quantity?: number;
    sortOrder?: number;
  }>;
  createdAt?: Date;
};

type VariantRecord = {
  _id: unknown;
  productId?: unknown;
  sku?: string;
  barcode?: string;
  variantName?: string;
  unitPrice?: number;
  compareAtPrice?: number;
  currencyCode?: string;
  availableQty?: number;
  stockQty?: number;
  reservedQty?: number;
  lowStockThreshold?: number;
  trackInventory?: boolean;
  isDefault?: boolean;
  isActive?: boolean;
  allowBackorder?: boolean;
  optionValueIds?: unknown[];
  images?: Array<{
    assetId?: unknown;
    sortOrder?: number;
    isPrimary?: boolean;
  }>;
  createdAt?: Date;
};

type CatalogRow = {
  product: ProductRecord;
  card: StorefrontProductCard;
  categoryId: string;
  categorySlug: string | null;
  categoryFullSlugPath: string | null;
  ancestorCategoryIds: string[];
  brandSlug: string | null;
  collectionSlugs: string[];
  tagSlugs: string[];
  promotionIds: string[];
  originCountryCode: string | null;
  conditionType: "NEW" | "REFURBISHED";
  optionValueIds: string[];
  specifications: Array<{
    specDefinitionId: string | null;
    specKey: string;
    specValue: string;
  }>;
  availableQty: number;
  availabilityLabel: string;
  hasActiveVariant: boolean;
  hasSellableVariant: boolean;
  hasInStockVariant: boolean;
  createdAt: Date | null;
};

type CatalogContext = {
  rows: CatalogRow[];
  productsById: Map<string, ProductRecord>;
  variantsByProductId: Map<string, VariantRecord[]>;
  categoriesById: Map<string, {
    id: string;
    name: string;
    slug: string;
    fullSlugPath: string;
    description: string | null;
    imageAssetId: string | null;
    parentCategoryId: string | null;
    depth: number;
    ancestorCategoryIds: string[];
  }>;
  categoriesByPath: Map<string, {
    id: string;
    name: string;
    slug: string;
    fullSlugPath: string;
    description: string | null;
    imageAssetId: string | null;
    parentCategoryId: string | null;
    depth: number;
    ancestorCategoryIds: string[];
  }>;
  brandsById: Map<string, { id: string; name: string; slug: string; description: string | null; logoAssetId: string | null; originCountryId: string | null }>;
  collectionsById: Map<string, { id: string; name: string; slug: string; description: string | null; bannerAssetId: string | null }>;
  tagsById: Map<string, { id: string; name: string; slug: string }>;
  badgesById: Map<string, { id: string; label: string; colorCode: string | null }>;
  countriesById: Map<string, { id: string; name: string; code: string | null }>;
  countriesByCode: Map<string, { id: string; name: string; code: string | null }>;
  optionTypesById: Map<string, { id: string; name: string; displayType: "TEXT" | "COLOR_SWATCH" | "BUTTON" }>;
  optionValuesById: Map<string, { id: string; optionTypeId: string; label: string; valueCode: string | null; swatchHex: string | null }>;
  specificationDefinitionsById: Map<string, { id: string; specKey: string; specLabel: string; filterDisplayType: "CHECKBOX" | "RADIO" | "RANGE" | "COLOR_SWATCH" }>;
  categoryFilterConfigsByCategoryId: Map<string, Array<{
    id: string;
    categoryId: string;
    filterKey: string;
    filterLabel: string;
    filterSource: "BRAND" | "PRICE" | "OPTION_TYPE" | "SPECIFICATION";
    optionTypeId: string | null;
    specDefinitionId: string | null;
    displayType: "CHECKBOX" | "RADIO" | "RANGE" | "COLOR_SWATCH";
    sortOrder: number;
    isActive: boolean;
    isInherited: boolean;
  }>>;
  promotionsById: Map<string, StorefrontPromotion>;
};

const DEFAULT_STORE_NAME = "Omni Commerce";

function buildGeneratedBadges(product: ProductRecord) {
  const badges: StorefrontProductBadge[] = [];

  if (product.isFeatured) {
    badges.push({ id: "featured", label: "Featured", colorCode: "#0f766e" });
  }

  if (product.isNewArrival) {
    badges.push({ id: "new-arrival", label: "New", colorCode: "#15803d" });
  }

  if (product.isBestSeller) {
    badges.push({ id: "best-seller", label: "Best seller", colorCode: "#ea580c" });
  }

  return badges;
}

function buildPromotionSummary(
  row: {
    _id: unknown;
    name?: string;
    description?: string;
    promotionType?: "COUPON" | "FLASH_SALE" | "AUTO_DISCOUNT" | "FREE_SHIPPING";
    discountType?: "PERCENT" | "AMOUNT";
    discountValue?: number;
    heroAssetId?: unknown;
  },
  linkedProductCount: number,
): StorefrontPromotion {
  return {
    id: storefrontToId(row._id),
    name: storefrontNullableString(row.name) ?? "Promotion",
    description: storefrontNullableString(row.description),
    promotionType: row.promotionType ?? "AUTO_DISCOUNT",
    discountType: row.discountType ?? null,
    discountValue:
      typeof row.discountValue === "number" && Number.isFinite(row.discountValue)
        ? row.discountValue
        : null,
    heroAssetId: storefrontToId(row.heroAssetId) || null,
    linkedProductCount,
  };
}

type ResolvedNavigationMenuItem = {
  id: string;
  label: string;
  url: string | null;
  parentItemId: string | null;
  sortOrder: number;
};

function buildNavigationTree(
  items: ResolvedNavigationMenuItem[],
): StorefrontLink[] {
  const nodeMap = new Map<string, StorefrontLink>();
  const orderedItems = [...items].sort(
    (left, right) => left.sortOrder - right.sortOrder || left.label.localeCompare(right.label),
  );

  for (const item of orderedItems) {
    nodeMap.set(item.id, {
      id: item.id,
      label: item.label,
      url: item.url,
      children: [],
    });
  }

  const roots: StorefrontLink[] = [];

  for (const item of orderedItems) {
    const node = nodeMap.get(item.id);

    if (!node) {
      continue;
    }

    const parent =
      item.parentItemId && nodeMap.has(item.parentItemId)
        ? nodeMap.get(item.parentItemId)
        : null;

    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const prune = (links: StorefrontLink[]): StorefrontLink[] =>
    links
      .map((link) => ({
        ...link,
        children: prune(link.children),
      }))
      .filter((link) => Boolean(link.url) || link.children.length > 0);

  return prune(roots);
}

export class StorefrontCatalogService {
  async getShellData(
    user: StorefrontSessionUser | null = null,
  ): Promise<StorefrontShellData> {
    await connectToDatabase();

    const [storeSettings, categories, pages, headerLinks, footerLinks] =
      await Promise.all([
        StoreSettingsModel.findOne().sort({ createdAt: -1 }).lean().exec() as Promise<
          | {
              storeName?: string;
              storeEmail?: string;
              storePhone?: string;
              supportEmail?: string;
              supportPhone?: string;
              currencyCode?: string;
              logoAssetId?: unknown;
            }
          | null
        >,
        CategoryModel.find({ isActive: true })
          .sort({ depth: 1, sortOrder: 1, categoryName: 1 })
          .limit(10)
          .lean()
          .exec() as Promise<
          Array<{
            _id: unknown;
            categoryName?: string;
            slug?: string;
            fullSlugPath?: string;
            description?: string;
            imageAssetId?: unknown;
            parentCategoryId?: unknown;
            depth?: number;
          }>
        >,
        this.listPublishedPages(),
        this.getNavigationLinks("header"),
        this.getNavigationLinks("footer"),
      ]);

    const categoryStripSource =
      categories.filter((category) => !category.parentCategoryId) || categories;
    const categoryStrip = (categoryStripSource.length > 0 ? categoryStripSource : categories).map((category) => ({
      id: storefrontToId(category._id),
      categoryName: storefrontNullableString(category.categoryName) ?? "Category",
      slug: storefrontNullableString(category.slug) ?? "",
      fullSlugPath:
        storefrontNullableString(category.fullSlugPath) ??
        storefrontNullableString(category.slug) ??
        "",
      depth: storefrontNumber(category.depth),
      parentCategoryId: storefrontToId(category.parentCategoryId) || null,
      description: storefrontNullableString(category.description),
      imageAssetId: storefrontToId(category.imageAssetId) || null,
      productCount: 0,
    }));
    const cartSnapshot = user ? await storefrontService.getCartForUser(user.id) : null;
    const wishlistCount = user ? await this.getWishlistCount(user.id) : 0;

    return {
      store: {
        storeName: storefrontNullableString(storeSettings?.storeName) ?? DEFAULT_STORE_NAME,
        storeEmail: storefrontNullableString(storeSettings?.storeEmail),
        storePhone: storefrontNullableString(storeSettings?.storePhone),
        supportEmail: storefrontNullableString(storeSettings?.supportEmail),
        supportPhone: storefrontNullableString(storeSettings?.supportPhone),
        currencyCode: storefrontNullableString(storeSettings?.currencyCode) ?? "MMK",
        logoAssetId: storefrontToId(storeSettings?.logoAssetId) || null,
      },
      user,
      cartSnapshot,
      wishlistCount,
      headerLinks:
        headerLinks.length > 0
          ? headerLinks
          : categoryStrip.slice(0, 6).map((category) => ({
              id: category.id,
              label: category.categoryName,
              url: `/shop?category=${category.fullSlugPath}`,
              children: [],
            })),
      footerLinks:
        footerLinks.length > 0
          ? footerLinks
          : pages.slice(0, 6).map((page) => ({
              id: page.id,
              label: page.title,
              url: `/pages/${page.slug}`,
              children: [],
            })),
      categoryStrip,
      pageLinks: pages,
    };
  }

  async getHomePageData(userId?: string): Promise<StorefrontHomePageData> {
    const [banners, context, promotions, recentlyViewed] = await Promise.all([
      this.listActiveBanners(),
      this.loadCatalogContext(),
      this.listActivePromotions(),
      userId ? this.listRecentlyViewedProducts(userId, 10) : Promise.resolve([]),
    ]);

    const heroBanner = banners.find((banner) => banner.bannerType === "HERO") ?? null;
    const sideBanners = banners
      .filter((banner) => banner.bannerType !== "HERO")
      .slice(0, 3);

    const featured = context.rows
      .filter((row) => row.card.isFeatured)
      .slice(0, 10)
      .map((row) => row.card);
    const newArrivals = [...context.rows]
      .sort(
        (left, right) =>
          (right.createdAt?.getTime() ?? 0) - (left.createdAt?.getTime() ?? 0),
      )
      .filter((row) => row.card.isNewArrival)
      .slice(0, 10)
      .map((row) => row.card);
    const bestSellers = [...context.rows]
      .sort((left, right) => right.card.soldCount - left.card.soldCount)
      .filter((row) => row.card.isBestSeller || row.card.soldCount > 0)
      .slice(0, 10)
      .map((row) => row.card);

    const productSections: StorefrontHomeProductSection[] = [];

    if (featured.length > 0) {
      productSections.push({
        id: "featured",
        title: "Featured picks",
        href: "/shop?sort=featured",
        items: featured,
      });
    }

    if (newArrivals.length > 0) {
      productSections.push({
        id: "new-arrivals",
        title: "New arrivals",
        href: "/shop?sort=newest",
        items: newArrivals,
      });
    }

    if (bestSellers.length > 0) {
      productSections.push({
        id: "best-sellers",
        title: "Best sellers",
        href: "/shop?sort=best_selling",
        items: bestSellers,
      });
    }

    for (const promotion of promotions) {
      const promotionItems = context.rows
        .filter((row) => row.promotionIds.includes(promotion.id))
        .slice(0, 10)
        .map((row) => row.card);

      if (promotionItems.length > 0) {
        productSections.push({
          id: `promotion-${promotion.id}`,
          title: promotion.name,
          href: `/shop?promotion=${promotion.id}`,
          items: promotionItems,
        });
        break;
      }
    }

    const collections = this.buildCollectionSummaries(
      context.rows,
      context.collectionsById,
    );
    const collectionSection = collections.find((collection) => collection.productCount > 0);

    if (collectionSection) {
      const collectionItems = context.rows
        .filter((row) => row.collectionSlugs.includes(collectionSection.slug))
        .slice(0, 10)
        .map((row) => row.card);

      if (collectionItems.length > 0) {
        productSections.push({
          id: `collection-${collectionSection.id}`,
          title: collectionSection.collectionName,
          href: `/shop?collection=${collectionSection.slug}`,
          items: collectionItems,
        });
      }
    }

    return {
      heroBanner,
      sideBanners,
      utilityPromotions: promotions.slice(0, 4),
      categories: this.buildCategorySummaries(context.rows, context.categoriesById).slice(0, 10),
      collections: collections.slice(0, 6),
      brands: this.buildBrandSummaries(context.rows, context.brandsById).slice(0, 8),
      productSections,
      recentlyViewed,
    };
  }

  async listActiveBanners(): Promise<StorefrontBanner[]> {
    await connectToDatabase();
    const now = new Date();
    const banners = (await BannerModel.find({ isActive: true })
      .sort({ sortOrder: 1, bannerName: 1 })
      .lean()
      .exec()) as Array<{
      _id: unknown;
      bannerName?: string;
      bannerType?: "HERO" | "PROMO" | "CATEGORY";
      title?: string;
      subtitle?: string;
      linkUrl?: string;
      assetId?: unknown;
      startsAt?: Date | null;
      endsAt?: Date | null;
    }>;

    return banners
      .filter((banner) => storefrontIsInRange(now, banner.startsAt ?? null, banner.endsAt ?? null))
      .map((banner) => ({
        id: storefrontToId(banner._id),
        bannerName: storefrontNullableString(banner.bannerName) ?? "Banner",
        bannerType: banner.bannerType ?? "PROMO",
        title: storefrontNullableString(banner.title),
        subtitle: storefrontNullableString(banner.subtitle),
        linkUrl: storefrontNullableString(banner.linkUrl),
        assetId: storefrontToId(banner.assetId) || null,
      }));
  }

  async listActivePromotions(): Promise<StorefrontPromotion[]> {
    await connectToDatabase();
    const now = new Date();
    const promotions = (await PromotionModel.find({ isActive: true })
      .lean()
      .exec()) as Array<{
      _id: unknown;
      name?: string;
      description?: string;
      promotionType?: "COUPON" | "FLASH_SALE" | "AUTO_DISCOUNT" | "FREE_SHIPPING";
      discountType?: "PERCENT" | "AMOUNT";
      discountValue?: number;
      heroAssetId?: unknown;
      startsAt?: Date | null;
      endsAt?: Date | null;
    }>;

    const activePromotions = promotions.filter((promotion) =>
      storefrontIsInRange(now, promotion.startsAt ?? null, promotion.endsAt ?? null),
    );
    const promotionIds = activePromotions.map((promotion) => new Types.ObjectId(storefrontToId(promotion._id)));
    const [promotionProducts, promotionVariants] = await Promise.all([
      promotionIds.length > 0
        ? (PromotionProductModel.find({ promotionId: { $in: promotionIds } })
            .lean()
            .exec() as Promise<Array<{ promotionId?: unknown }>>)
        : Promise.resolve([]),
      promotionIds.length > 0
        ? (PromotionVariantModel.find({ promotionId: { $in: promotionIds } })
            .lean()
            .exec() as Promise<Array<{ promotionId?: unknown }>>)
        : Promise.resolve([]),
    ]);
    const linkedCountMap = new Map<string, number>();

    for (const row of [...promotionProducts, ...promotionVariants]) {
      const promotionId = storefrontToId(row.promotionId);
      linkedCountMap.set(promotionId, (linkedCountMap.get(promotionId) ?? 0) + 1);
    }

    return activePromotions.map((promotion) =>
      buildPromotionSummary(
        promotion,
        linkedCountMap.get(storefrontToId(promotion._id)) ?? 0,
      ),
    );
  }

  async listPublishedPages(): Promise<StorefrontPageLink[]> {
    await connectToDatabase();
    const pages = (await PageModel.find({ status: "PUBLISHED" })
      .sort({ publishedAt: -1, title: 1 })
      .lean()
      .exec()) as Array<{
      _id: unknown;
      title?: string;
      slug?: string;
    }>;

    return pages
      .map((page) => ({
        id: storefrontToId(page._id),
        title: storefrontNullableString(page.title) ?? "Page",
        slug: storefrontNullableString(page.slug) ?? "",
      }))
      .filter((page) => page.slug);
  }

  async getPublishedPageBySlug(slug: string) {
    await connectToDatabase();
    const trimmedSlug = slug.trim();

    if (!trimmedSlug) {
      return null;
    }

    const page = (await PageModel.findOne({
      slug: trimmedSlug,
      status: "PUBLISHED",
    })
      .lean()
      .exec()) as
      | {
          _id: unknown;
          title?: string;
          slug?: string;
          content?: string;
          seoTitle?: string;
          seoDescription?: string;
          publishedAt?: Date | null;
        }
      | null;

    if (!page) {
      return null;
    }

    return {
      id: storefrontToId(page._id),
      title: storefrontNullableString(page.title) ?? "Page",
      slug: storefrontNullableString(page.slug) ?? trimmedSlug,
      content: storefrontNullableString(page.content),
      seoTitle: storefrontNullableString(page.seoTitle),
      seoDescription: storefrontNullableString(page.seoDescription),
      publishedAt: page.publishedAt ?? null,
    };
  }

  async listShippingMethods(countryId?: string): Promise<StorefrontShippingMethod[]> {
    await connectToDatabase();

    if (countryId) {
      assertObjectId(countryId, "country id");
    }

    const zoneCountryRows = countryId
      ? ((await ShippingZoneCountryModel.find({ countryId })
          .select("shippingZoneId")
          .lean()
          .exec()) as Array<{ shippingZoneId?: unknown }>)
      : [];
    const shippingZoneIds = zoneCountryRows
      .map((row) => storefrontToId(row.shippingZoneId))
      .filter(Boolean);
    const filter =
      countryId && shippingZoneIds.length > 0
        ? { isActive: true, shippingZoneId: { $in: shippingZoneIds } }
        : { isActive: true };
    const methods = (await ShippingMethodModel.find(filter)
      .sort({ methodName: 1 })
      .lean()
      .exec()) as Array<{
      _id: unknown;
      code?: string;
      methodName?: string;
      description?: string;
      baseFee?: number;
      freeShippingMinAmount?: number;
      estimatedMinDays?: number;
      estimatedMaxDays?: number;
    }>;

    return methods.map((method) => ({
      id: storefrontToId(method._id),
      methodName: storefrontNullableString(method.methodName) ?? "Delivery",
      code: storefrontNullableString(method.code) ?? "DELIVERY",
      description: storefrontNullableString(method.description),
      baseFee: storefrontNumber(method.baseFee),
      freeShippingMinAmount:
        typeof method.freeShippingMinAmount === "number"
          ? method.freeShippingMinAmount
          : null,
      estimatedMinDays:
        typeof method.estimatedMinDays === "number" ? method.estimatedMinDays : null,
      estimatedMaxDays:
        typeof method.estimatedMaxDays === "number" ? method.estimatedMaxDays : null,
    }));
  }

  async getWishlistCount(userId: string) {
    assertObjectId(userId, "user id");
    await connectToDatabase();
    const wishlist = (await WishlistModel.findOne({ customerId: userId })
      .select("_id")
      .lean()
      .exec()) as { _id: unknown } | null;

    if (!wishlist) {
      return 0;
    }

    return WishlistItemModel.countDocuments({ wishlistId: wishlist._id }).exec();
  }

  async listWishlistProducts(userId: string): Promise<StorefrontWishlistItem[]> {
    assertObjectId(userId, "user id");
    await connectToDatabase();
    const wishlist = (await WishlistModel.findOne({ customerId: userId })
      .select("_id")
      .lean()
      .exec()) as { _id: unknown } | null;

    if (!wishlist) {
      return [];
    }

    const wishlistItems = (await WishlistItemModel.find({ wishlistId: wishlist._id })
      .sort({ createdAt: -1 })
      .lean()
      .exec()) as Array<{ productId?: unknown }>;
    const context = await this.loadCatalogContext();
    const rowMap = new Map(context.rows.map((row) => [row.card.id, row.card]));

    return wishlistItems
      .map((item) => rowMap.get(storefrontToId(item.productId)))
      .filter((item): item is StorefrontWishlistItem => Boolean(item));
  }

  async toggleWishlist(input: { userId: string; productId: string }) {
    assertObjectId(input.userId, "user id");
    assertObjectId(input.productId, "product id");
    await connectToDatabase();

    let wishlist = await WishlistModel.findOne({ customerId: input.userId }).exec();

    if (!wishlist) {
      wishlist = await WishlistModel.create({ customerId: input.userId });
    }

    const existingItem = await WishlistItemModel.findOne({
      wishlistId: wishlist.id,
      productId: input.productId,
    }).exec();

    if (existingItem) {
      await WishlistItemModel.findByIdAndDelete(existingItem.id).exec();
      return {
        inWishlist: false,
        count: await this.getWishlistCount(input.userId),
      };
    }

    await WishlistItemModel.create({
      wishlistId: wishlist.id,
      productId: input.productId,
      createdAt: new Date(),
    });

    return {
      inWishlist: true,
      count: await this.getWishlistCount(input.userId),
    };
  }

  async isProductInWishlist(userId: string, productId: string) {
    assertObjectId(userId, "user id");
    assertObjectId(productId, "product id");
    await connectToDatabase();

    const wishlist = (await WishlistModel.findOne({ customerId: userId })
      .select("_id")
      .lean()
      .exec()) as { _id: unknown } | null;

    if (!wishlist) {
      return false;
    }

    return Boolean(
      await WishlistItemModel.exists({
        wishlistId: wishlist._id,
        productId,
      }),
    );
  }

  async trackRecentlyViewed(input: { userId?: string; productId: string }) {
    if (!input.userId) {
      return;
    }

    assertObjectId(input.userId, "user id");
    assertObjectId(input.productId, "product id");
    await connectToDatabase();

    await RecentlyViewedProductModel.create({
      customerId: input.userId,
      productId: input.productId,
      viewedAt: new Date(),
    });
  }

  async listRecentlyViewedProducts(
    userId: string,
    limit = 8,
  ): Promise<StorefrontProductCard[]> {
    assertObjectId(userId, "user id");
    await connectToDatabase();
    const recentRows = (await RecentlyViewedProductModel.find({ customerId: userId })
      .sort({ viewedAt: -1 })
      .limit(limit * 3)
      .lean()
      .exec()) as Array<{ productId?: unknown }>;
    const context = await this.loadCatalogContext();
    const rowMap = new Map(context.rows.map((row) => [row.card.id, row.card]));
    const seen = new Set<string>();
    const items: StorefrontProductCard[] = [];

    for (const row of recentRows) {
      const productId = storefrontToId(row.productId);

      if (!productId || seen.has(productId)) {
        continue;
      }

      const product = rowMap.get(productId);

      if (!product) {
        continue;
      }

      seen.add(productId);
      items.push(product);

      if (items.length >= limit) {
        break;
      }
    }

    return items;
  }

  private async getNavigationLinks(menuName: string): Promise<StorefrontLink[]> {
    await connectToDatabase();
    const menu = (await NavigationMenuModel.findOne({
      menuName: new RegExp(`^${storefrontEscapeRegex(menuName)}$`, "i"),
      isActive: true,
    })
      .lean()
      .exec()) as { _id: unknown } | null;

    if (!menu) {
      return [];
    }

    const items = (await NavigationMenuItemModel.find({
      navigationMenuId: menu._id,
      isActive: true,
    })
      .sort({ sortOrder: 1, _id: 1 })
      .lean()
      .exec()) as Array<{
      _id: unknown;
      parentItemId?: unknown;
      label?: string;
      linkType?: "URL" | "CATEGORY" | "COLLECTION" | "PAGE" | "PRODUCT";
      linkValue?: string;
      sortOrder?: number;
    }>;

    const categoryIds = items
      .filter(
        (item): item is typeof item & { linkValue: string } =>
          item.linkType === "CATEGORY" &&
          typeof item.linkValue === "string" &&
          Types.ObjectId.isValid(item.linkValue),
      )
      .map((item) => new Types.ObjectId(item.linkValue));
    const collectionIds = items
      .filter(
        (item): item is typeof item & { linkValue: string } =>
          item.linkType === "COLLECTION" &&
          typeof item.linkValue === "string" &&
          Types.ObjectId.isValid(item.linkValue),
      )
      .map((item) => new Types.ObjectId(item.linkValue));
    const pageIds = items
      .filter(
        (item): item is typeof item & { linkValue: string } =>
          item.linkType === "PAGE" &&
          typeof item.linkValue === "string" &&
          Types.ObjectId.isValid(item.linkValue),
      )
      .map((item) => new Types.ObjectId(item.linkValue));
    const productIds = items
      .filter(
        (item): item is typeof item & { linkValue: string } =>
          item.linkType === "PRODUCT" &&
          typeof item.linkValue === "string" &&
          Types.ObjectId.isValid(item.linkValue),
      )
      .map((item) => new Types.ObjectId(item.linkValue));
    const [categories, collections, pages, products] = await Promise.all([
      categoryIds.length > 0
        ? (CategoryModel.find({ _id: { $in: categoryIds } })
            .select("slug fullSlugPath")
            .lean()
            .exec() as Promise<Array<{ _id: unknown; slug?: string; fullSlugPath?: string }>>)
        : Promise.resolve([]),
      collectionIds.length > 0
        ? (CollectionModel.find({ _id: { $in: collectionIds } })
            .select("slug")
            .lean()
            .exec() as Promise<Array<{ _id: unknown; slug?: string }>>)
        : Promise.resolve([]),
      pageIds.length > 0
        ? (PageModel.find({ _id: { $in: pageIds }, status: "PUBLISHED" })
            .select("slug")
            .lean()
            .exec() as Promise<Array<{ _id: unknown; slug?: string }>>)
        : Promise.resolve([]),
      productIds.length > 0
        ? (ProductModel.find({ _id: { $in: productIds }, status: "ACTIVE", visibility: "PUBLIC" })
            .select("slug")
            .lean()
            .exec() as Promise<Array<{ _id: unknown; slug?: string }>>)
        : Promise.resolve([]),
    ]);
    const categoryMap = new Map(
      categories.map((category) => [
        storefrontToId(category._id),
        storefrontNullableString(category.fullSlugPath) ??
          storefrontNullableString(category.slug) ??
          "",
      ]),
    );
    const collectionMap = new Map(
      collections.map((collection) => [storefrontToId(collection._id), storefrontNullableString(collection.slug) ?? ""]),
    );
    const pageMap = new Map(
      pages.map((page) => [storefrontToId(page._id), storefrontNullableString(page.slug) ?? ""]),
    );
    const productMap = new Map(
      products.map((product) => [storefrontToId(product._id), storefrontNullableString(product.slug) ?? ""]),
    );

    return buildNavigationTree(
      items
      .map((item) => {
        const linkValue = item.linkValue?.trim();

        let url: string | null = null;

        if (item.linkType === "URL" && linkValue) {
          url = linkValue;
        } else if (item.linkType === "CATEGORY" && linkValue) {
          const slug = categoryMap.get(linkValue);
          url = slug ? `/shop?category=${slug}` : null;
        } else if (item.linkType === "COLLECTION" && linkValue) {
          const slug = collectionMap.get(linkValue);
          url = slug ? `/shop?collection=${slug}` : null;
        } else if (item.linkType === "PAGE" && linkValue) {
          const slug = pageMap.get(linkValue);
          url = slug ? `/pages/${slug}` : null;
        } else if (item.linkType === "PRODUCT" && linkValue) {
          const slug = productMap.get(linkValue);
          url = slug ? `/shop/${slug}` : null;
        }

        return {
          id: storefrontToId(item._id),
          label: storefrontNullableString(item.label) ?? "Link",
          url,
          parentItemId: storefrontToId(item.parentItemId) || null,
          sortOrder: storefrontNumber(item.sortOrder),
        };
      })
      .filter(
        (item): item is ResolvedNavigationMenuItem =>
          Boolean(item.id) && Boolean(item.label),
      ),
    );
  }

  async searchCatalog(
    input: StorefrontSearchInput,
  ): Promise<StorefrontProductListing> {
    const context = await this.loadCatalogContext();
    const query = input.query.trim();
    const searchRegex = query ? new RegExp(storefrontEscapeRegex(query), "i") : null;
    const selectedOptionGroups = new Map<string, string[]>();
    const selectedSpecFilters = new Map<string, string[]>();
    const selectedCategories = input.categorySlugs
      .map((categoryPath) => context.categoriesByPath.get(categoryPath))
      .filter((category): category is NonNullable<typeof category> => Boolean(category));
    const categoryFilterState = this.resolveCategoryFilterState(input, context);

    for (const optionValueId of input.optionValueIds) {
      const optionValue = context.optionValuesById.get(optionValueId);

      if (!optionValue) {
        continue;
      }

      const current = selectedOptionGroups.get(optionValue.optionTypeId) ?? [];
      current.push(optionValueId);
      selectedOptionGroups.set(optionValue.optionTypeId, current);
    }

    for (const token of input.specFilters) {
      const parsed = this.parseSpecFilterToken(token);

      if (!parsed) {
        continue;
      }

      const current = selectedSpecFilters.get(parsed.definitionId) ?? [];
      current.push(parsed.specValue);
      selectedSpecFilters.set(parsed.definitionId, current);
    }

    const filteredRows = context.rows.filter((row) => {
      if (searchRegex) {
        const searchableText = [
          row.card.productName,
          row.card.shortDescription ?? "",
          row.card.brandName ?? "",
          row.card.categoryName ?? "",
        ].join(" ");

        if (!searchRegex.test(searchableText)) {
          return false;
        }
      }

      if (!this.rowMatchesCategory(row, selectedCategories)) {
        return false;
      }

      if (
        input.brandSlugs.length > 0 &&
        !input.brandSlugs.includes(row.brandSlug ?? "")
      ) {
        return false;
      }

      if (
        input.collectionSlugs.length > 0 &&
        !row.collectionSlugs.some((slug) => input.collectionSlugs.includes(slug))
      ) {
        return false;
      }

      if (
        input.tagSlugs.length > 0 &&
        !row.tagSlugs.some((slug) => input.tagSlugs.includes(slug))
      ) {
        return false;
      }

      if (
        input.promotionIds.length > 0 &&
        !row.promotionIds.some((promotionId) => input.promotionIds.includes(promotionId))
      ) {
        return false;
      }

      if (
        input.originCountryCodes.length > 0 &&
        !input.originCountryCodes.includes(row.originCountryCode ?? "")
      ) {
        return false;
      }

      if (input.condition && row.conditionType !== input.condition) {
        return false;
      }

      if (input.stock === "in_stock" && !row.hasInStockVariant) {
        return false;
      }

      if (
        input.onSaleOnly &&
        !(
          row.card.price > 0 &&
          row.card.compareAtPrice &&
          row.card.compareAtPrice > row.card.price
        )
      ) {
        return false;
      }

      if (input.minRating !== null && row.card.avgRating < input.minRating) {
        return false;
      }

      if (input.minPrice !== null && row.card.price < input.minPrice) {
        return false;
      }

      if (input.maxPrice !== null && row.card.price > input.maxPrice) {
        return false;
      }

      for (const [optionTypeId, selectedIds] of selectedOptionGroups) {
        const productOptionIds = row.optionValueIds.filter((optionValueId) => {
          const optionValue = context.optionValuesById.get(optionValueId);
          return optionValue?.optionTypeId === optionTypeId;
        });

        if (!productOptionIds.some((optionValueId) => selectedIds.includes(optionValueId))) {
          return false;
        }
      }

      for (const [definitionId, selectedValues] of selectedSpecFilters) {
        const specKey =
          context.specificationDefinitionsById.get(definitionId)?.specKey ?? "";
        const productSpecValues = row.specifications
          .filter(
            (specification) =>
              specification.specDefinitionId === definitionId ||
              (!specification.specDefinitionId &&
                specKey &&
                specification.specKey.trim().toUpperCase() === specKey),
          )
          .map((specification) => specification.specValue);

        if (!productSpecValues.some((specValue) => selectedValues.includes(specValue))) {
          return false;
        }
      }

      return true;
    });

    filteredRows.sort((left, right) =>
      this.compareRows(left, right, input.sort, query),
    );

    const total = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(total / input.pageSize));
    const page = Math.min(Math.max(input.page, 1), totalPages);
    const startIndex = (page - 1) * input.pageSize;

    return {
      title: this.buildListingTitle(input, context),
      description: this.buildListingDescription(input, context),
      query: {
        ...input,
        page,
      },
      total,
      page,
      pageSize: input.pageSize,
      totalPages,
      items: filteredRows
        .slice(startIndex, startIndex + input.pageSize)
        .map((row) => row.card),
      facets: {
        categories: this.buildFacetOptions(
          filteredRows,
          (row) => (row.categoryFullSlugPath ? [row.categoryFullSlugPath] : []),
          (categoryPath) => {
            const category = context.categoriesByPath.get(categoryPath);

            return category
              ? {
                  id: category.id,
                  label: this.buildCategoryPathLabel(category, context),
                  slug: category.fullSlugPath,
                }
              : null;
          },
        ),
        brands: this.buildFacetOptions(
          filteredRows,
          (row) => (row.brandSlug ? [row.brandSlug] : []),
          (slug) => {
            const brand = [...context.brandsById.values()].find(
              (item) => item.slug === slug,
            );

            return brand ? { id: brand.id, label: brand.name, slug: brand.slug } : null;
          },
        ),
        collections: this.buildFacetOptions(
          filteredRows,
          (row) => row.collectionSlugs,
          (slug) => {
            const collection = [...context.collectionsById.values()].find(
              (item) => item.slug === slug,
            );

            return collection
              ? { id: collection.id, label: collection.name, slug: collection.slug }
              : null;
          },
        ),
        tags: this.buildFacetOptions(
          filteredRows,
          (row) => row.tagSlugs,
          (slug) => {
            const tag = [...context.tagsById.values()].find((item) => item.slug === slug);

            return tag ? { id: tag.id, label: tag.name, slug: tag.slug } : null;
          },
        ),
        promotions: this.buildFacetOptions(
          filteredRows,
          (row) => row.promotionIds,
          (id) => {
            const promotion = context.promotionsById.get(id);

            return promotion
              ? { id: promotion.id, label: promotion.name, slug: promotion.id }
              : null;
          },
        ),
        countries: this.buildFacetOptions(
          filteredRows,
          (row) => (row.originCountryCode ? [row.originCountryCode] : []),
          (code) => {
            const country = context.countriesByCode.get(code);

            return country
              ? {
                  id: country.id,
                  label: country.name,
                  slug: country.code ?? country.id,
                }
              : null;
          },
        ),
        optionGroups: this.buildOptionGroupFacets(filteredRows, context),
        configuredFilters: this.buildConfiguredFilterGroups(
          filteredRows,
          categoryFilterState.configs,
          context,
        ),
        showBrandFilter: categoryFilterState.showBrandFilter,
        showPriceFilter: categoryFilterState.showPriceFilter,
        minPrice: (() => {
          const priceRows = filteredRows
            .map((row) => row.card.price)
            .filter((price) => Number.isFinite(price) && price > 0);
          return priceRows.length > 0 ? Math.min(...priceRows) : 0;
        })(),
        maxPrice: (() => {
          const priceRows = filteredRows
            .map((row) => row.card.price)
            .filter((price) => Number.isFinite(price) && price > 0);
          return priceRows.length > 0 ? Math.max(...priceRows) : 0;
        })(),
      },
      activeFilters: this.buildActiveFilterChips(input, context),
    };
  }

  private async listVisibleProductReviews(productId: string) {
    await connectToDatabase();
    const reviews = (await ReviewModel.find({
      productId: new Types.ObjectId(productId),
      isVisible: true,
    })
      .sort({ createdAt: -1, _id: -1 })
      .limit(12)
      .lean()
      .exec()) as Array<{
      _id: unknown;
      customerId?: unknown;
      rating?: number;
      title?: string;
      comment?: string;
      isVerifiedPurchase?: boolean;
      createdAt?: Date | null;
    }>;

    if (reviews.length === 0) {
      return [];
    }

    const customerIds = Array.from(
      new Set(
        reviews
          .map((review) => storefrontToId(review.customerId))
          .filter(Boolean),
      ),
    );
    const reviewIds = reviews.map((review) => new Types.ObjectId(storefrontToId(review._id)));
    const [customers, reviewMedia] = await Promise.all([
      customerIds.length > 0
        ? (UserModel.find({ _id: { $in: customerIds.map((id) => new Types.ObjectId(id)) } })
            .select("fullName")
            .lean()
            .exec() as Promise<Array<{ _id: unknown; fullName?: string }>>)
        : Promise.resolve([]),
      (ReviewMediaModel.find({ reviewId: { $in: reviewIds } })
          .lean()
          .exec() as Promise<Array<{ _id: unknown; reviewId?: unknown; assetId?: unknown }>>),
    ]);

    const assetIds = Array.from(
      new Set(
        reviewMedia
          .map((media) => storefrontToId(media.assetId))
          .filter(Boolean),
      ),
    );
    const assets = assetIds.length > 0
      ? ((await MediaAssetModel.find({
          _id: { $in: assetIds.map((assetId) => new Types.ObjectId(assetId)) },
        })
          .select("url")
          .lean()
          .exec()) as Array<{ _id: unknown; url?: string }>)
      : [];
    const customerMap = new Map(
      customers.map((customer) => [
        storefrontToId(customer._id),
        storefrontNullableString(customer.fullName) ?? "Customer",
      ]),
    );
    const assetMap = new Map(
      assets.map((asset) => [storefrontToId(asset._id), storefrontNullableString(asset.url) ?? ""]),
    );
    const mediaByReviewId = new Map<
      string,
      Array<{
        id: string;
        url: string;
      }>
    >();

    for (const media of reviewMedia) {
      const reviewId = storefrontToId(media.reviewId);
      const assetId = storefrontToId(media.assetId);
      const url = assetMap.get(assetId);

      if (!reviewId || !assetId || !url) {
        continue;
      }

      const current = mediaByReviewId.get(reviewId) ?? [];
      current.push({
        id: storefrontToId(media._id),
        url,
      });
      mediaByReviewId.set(reviewId, current);
    }

    return reviews.map((review) => ({
      id: storefrontToId(review._id),
      customerName:
        customerMap.get(storefrontToId(review.customerId)) ?? "Customer",
      rating: storefrontNumber(review.rating),
      title: storefrontNullableString(review.title),
      comment: storefrontNullableString(review.comment),
      isVerifiedPurchase: Boolean(review.isVerifiedPurchase),
      createdAt: review.createdAt ?? null,
      media: mediaByReviewId.get(storefrontToId(review._id)) ?? [],
    }));
  }

  private async getReviewSubmissionState(
    userId: string | null | undefined,
    productId: string,
  ) {
    if (!userId) {
      return null;
    }

    assertObjectId(userId, "user id");
    await connectToDatabase();

    const existingReview = (await ReviewModel.findOne({
      customerId: userId,
      productId,
    })
      .select("isVisible")
      .lean()
      .exec()) as { isVisible?: boolean } | null;

    if (existingReview) {
      return {
        canSubmit: false,
        message: existingReview.isVisible
          ? "You already published a review for this product."
          : "Your review has already been submitted and is awaiting visibility approval.",
      };
    }

    const eligibleOrders = (await OrderModel.find({
      customerId: userId,
      status: { $in: ["PAID", "PROCESSING", "SHIPPED", "COMPLETED", "REFUNDED"] },
    })
      .select("_id")
      .lean()
      .exec()) as Array<{ _id: unknown }>;

    if (eligibleOrders.length === 0) {
      return {
        canSubmit: false,
        message: "Purchase this product before leaving a review.",
      };
    }

    const eligibleOrderItem = await OrderItemModel.findOne({
      orderId: { $in: eligibleOrders.map((order) => order._id) },
      productId: new Types.ObjectId(productId),
    })
      .select("_id")
      .lean()
      .exec();

    if (!eligibleOrderItem) {
      return {
        canSubmit: false,
        message: "Purchase this product before leaving a review.",
      };
    }

    return {
      canSubmit: true,
      message: null,
    };
  }

  async createProductReview(input: {
    userId: string;
    productId: string;
    rating: number;
    title?: string;
    comment?: string;
    mediaFiles?: File[];
  }) {
    assertObjectId(input.userId, "user id");
    assertObjectId(input.productId, "product id");
    await connectToDatabase();

    const product = await ProductModel.findById(input.productId)
      .select("status visibility productName")
      .lean()
      .exec();

    if (!product || product.status !== "ACTIVE" || product.visibility !== "PUBLIC") {
      throw new AppError("Product was not found.", 404);
    }

    if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
      throw new AppError("Rating must be between 1 and 5.", 400);
    }

    const title = input.title?.trim() || undefined;
    const comment = input.comment?.trim() || undefined;

    if (!title && !comment) {
      throw new AppError("Add a review title or comment before submitting.", 400);
    }

    const existingReview = await ReviewModel.findOne({
      customerId: input.userId,
      productId: input.productId,
    })
      .select("_id isVisible")
      .lean()
      .exec();

    if (existingReview) {
      throw new AppError(
        existingReview.isVisible
          ? "You already published a review for this product."
          : "Your review has already been submitted and is awaiting visibility approval.",
        409,
      );
    }

    const eligibleOrders = (await OrderModel.find({
      customerId: input.userId,
      status: { $in: ["PAID", "PROCESSING", "SHIPPED", "COMPLETED", "REFUNDED"] },
    })
      .select("_id")
      .lean()
      .exec()) as Array<{ _id: unknown }>;

    if (eligibleOrders.length === 0) {
      throw new AppError("Purchase this product before leaving a review.", 403);
    }

    const reviewedOrderItemIds = (await ReviewModel.find({
      customerId: input.userId,
      orderItemId: { $ne: null },
    })
      .select("orderItemId")
      .lean()
      .exec()) as Array<{ orderItemId?: unknown }>;
    const takenOrderItemIds = new Set(
      reviewedOrderItemIds
        .map((review) => storefrontToId(review.orderItemId))
        .filter(Boolean),
    );
    const eligibleOrderItems = (await OrderItemModel.find({
      orderId: { $in: eligibleOrders.map((order) => order._id) },
      productId: new Types.ObjectId(input.productId),
    })
      .sort({ _id: -1 })
      .select("_id")
      .lean()
      .exec()) as Array<{ _id: unknown }>;
    const orderItem = eligibleOrderItems.find(
      (item) => !takenOrderItemIds.has(storefrontToId(item._id)),
    );

    if (!orderItem) {
      throw new AppError("You already reviewed this purchased product.", 409);
    }

    const uploads = (input.mediaFiles ?? []).filter((file) => file.size > 0);

    if (uploads.length > 4) {
      throw new AppError("You can attach up to 4 review images.", 400);
    }

    for (const file of uploads) {
      if (!file.type.startsWith("image/")) {
        throw new AppError("Only image uploads are supported for review media.", 400);
      }
    }

    const storeSettings = await StoreSettingsModel.findOne()
      .sort({ createdAt: -1 })
      .select("reviewAutoPublish")
      .lean()
      .exec();
    const review = await ReviewModel.create({
      productId: input.productId,
      customerId: input.userId,
      orderItemId: orderItem._id,
      rating: input.rating,
      title,
      comment,
      isVerifiedPurchase: true,
      isVisible: Boolean(storeSettings?.reviewAutoPublish),
    });

    if (uploads.length > 0) {
      const assets = await Promise.all(
        uploads.map((file) =>
          storeUploadedImageAsset(file, {
            directory: "reviews",
            title: title ?? storefrontNullableString(product.productName) ?? "Review image",
            altText: title ?? storefrontNullableString(product.productName) ?? "Review image",
          }),
        ),
      );

      await ReviewMediaModel.insertMany(
        assets.map((asset) => ({
          reviewId: review._id,
          assetId: asset._id,
        })),
      );
    }

    await syncProductReviewAggregate(input.productId);

    return {
      id: review.id,
      isVisible: Boolean(review.isVisible),
      message: review.isVisible
        ? "Review published successfully."
        : "Review submitted and is awaiting staff approval.",
    };
  }

  async getProductDetailBySlug(
    slug: string,
    viewerUserId?: string | null,
  ): Promise<StorefrontProductDetail | null> {
    const context = await this.loadCatalogContext();
    const row = context.rows.find((item) => item.card.slug === slug.trim());

    if (!row) {
      return null;
    }

    const productId = row.card.id;
    const product = context.productsById.get(productId);

    if (!product) {
      return null;
    }

    const variants = (context.variantsByProductId.get(productId) ?? [])
      .filter((variant) => variant.isActive)
      .sort((left, right) => {
        const defaultDelta =
          Number(Boolean(right.isDefault)) - Number(Boolean(left.isDefault));

        if (defaultDelta !== 0) {
          return defaultDelta;
        }

        return (left.createdAt?.getTime() ?? 0) - (right.createdAt?.getTime() ?? 0);
      });

    const variantRows: StorefrontProductVariant[] = variants.map((variant) => {
      const availabilityState = getVariantAvailabilityState(variant);
      const optionSelections = (variant.optionValueIds ?? [])
        .map((optionValueId) => context.optionValuesById.get(storefrontToId(optionValueId)))
        .filter((optionValue): optionValue is NonNullable<typeof optionValue> => Boolean(optionValue))
        .map((optionValue) => {
          const optionType = context.optionTypesById.get(optionValue.optionTypeId);

          return {
            optionTypeId: optionValue.optionTypeId,
            optionTypeName: optionType?.name ?? "Option",
            displayType: optionType?.displayType ?? "TEXT",
            optionValueId: optionValue.id,
            optionValueLabel: optionValue.label,
            swatchHex: optionValue.swatchHex,
          };
        });

      return {
        id: storefrontToId(variant._id),
        sku: storefrontNullableString(variant.sku) ?? "SKU",
        barcode: storefrontNullableString(variant.barcode),
        variantName: storefrontNullableString(variant.variantName),
        unitPrice: storefrontNumber(variant.unitPrice),
        compareAtPrice:
          typeof variant.compareAtPrice === "number"
            ? variant.compareAtPrice
            : null,
        currencyCode: storefrontNullableString(variant.currencyCode) ?? row.card.currencyCode,
        availableQty: storefrontNumber(variant.availableQty),
        stockQty: storefrontNumber(variant.stockQty),
        trackInventory: variant.trackInventory !== false,
        isDefault: Boolean(variant.isDefault),
        isActive: Boolean(variant.isActive),
        allowBackorder: Boolean(variant.allowBackorder),
        availabilityLabel: availabilityState.label,
        isPurchasable: availabilityState.isSellable,
        imageAssetIds: storefrontImageAssetIds(variant.images),
        optionValueIds: (variant.optionValueIds ?? [])
          .map((value) => storefrontToId(value))
          .filter(Boolean),
        optionSelections,
      };
    });

    const optionGroups: StorefrontProductOptionGroup[] = (product.optionTypeIds ?? [])
      .map((optionTypeId) => context.optionTypesById.get(storefrontToId(optionTypeId)))
      .filter((optionType): optionType is NonNullable<typeof optionType> => Boolean(optionType))
      .map((optionType) => {
        const values = storefrontUnique(
          variantRows.flatMap((variant) =>
            variant.optionSelections
              .filter((selection) => selection.optionTypeId === optionType.id)
              .map((selection) => selection.optionValueId),
          ),
        )
          .map((valueId) => context.optionValuesById.get(valueId))
          .filter((value): value is NonNullable<typeof value> => Boolean(value))
          .map(
            (value): StorefrontProductOptionValue => ({
              id: value.id,
              label: value.label,
              valueCode: value.valueCode,
              swatchHex: value.swatchHex,
            }),
          );

        return {
          id: optionType.id,
          name: optionType.name,
          displayType: optionType.displayType,
          values,
        };
      })
      .filter((optionGroup) => optionGroup.values.length > 0);

    const imageAssetIds = storefrontUnique([
      ...storefrontImageAssetIds(product.images),
      ...variantRows.flatMap((variant) => variant.imageAssetIds),
    ]);
    const [shippingMethods, reviews, reviewSubmission] = await Promise.all([
      this.listShippingMethods(),
      this.listVisibleProductReviews(productId),
      this.getReviewSubmissionState(viewerUserId, productId),
    ]);

    return {
      id: productId,
      slug: row.card.slug,
      productName: row.card.productName,
      shortDescription: row.card.shortDescription,
      description: storefrontNullableString(product.description),
      material: storefrontNullableString(product.material),
      careInstructions: storefrontNullableString(product.careInstructions),
      warrantyInfo: storefrontNullableString(product.warrantyInfo),
      conditionType: product.conditionType ?? "NEW",
      price: row.card.price,
      compareAtPrice: row.card.compareAtPrice,
      currencyCode: row.card.currencyCode,
      avgRating: row.card.avgRating,
      reviewCount: row.card.reviewCount,
      soldCount: row.card.soldCount,
      isFeatured: row.card.isFeatured,
      isNewArrival: row.card.isNewArrival,
      isBestSeller: row.card.isBestSeller,
      availabilityLabel: row.availabilityLabel,
      hasActiveVariant: row.hasActiveVariant,
      hasSellableVariant: row.hasSellableVariant,
      category: context.categoriesById.get(row.categoryId)
        ? {
            id: row.categoryId,
            name: context.categoriesById.get(row.categoryId)?.name ?? "Category",
            slug: context.categoriesById.get(row.categoryId)?.slug ?? "",
            fullSlugPath:
              context.categoriesById.get(row.categoryId)?.fullSlugPath ??
              context.categoriesById.get(row.categoryId)?.slug ??
              "",
          }
        : null,
      brand: row.card.brandId
        ? {
            id: row.card.brandId,
            name: row.card.brandName ?? "Brand",
            slug: row.card.brandSlug ?? "",
          }
        : null,
      originCountry: (() => {
        const countryId = storefrontToId(product.originCountryId);
        const country = context.countriesById.get(countryId);

        return country
          ? {
              id: country.id,
              name: country.name,
              code: country.code,
            }
          : null;
      })(),
      badges: row.card.badges,
      promotions: row.promotionIds
        .map((promotionId) => context.promotionsById.get(promotionId))
        .filter((promotion): promotion is NonNullable<typeof promotion> => Boolean(promotion))
        .map((promotion) => ({
          id: promotion.id,
          name: promotion.name,
          discountType: promotion.discountType,
          discountValue: promotion.discountValue,
        })),
      imageAssetIds,
      optionGroups,
      variants: variantRows,
      specifications: [...(product.specifications ?? [])]
        .sort(
          (left, right) =>
            storefrontNumber(left.sortOrder) - storefrontNumber(right.sortOrder),
        )
        .map((specification) => ({
          id: storefrontToId(specification._id),
          group: storefrontNullableString(specification.specGroup),
          key: storefrontNullableString(specification.specKey) ?? "Detail",
          value: storefrontNullableString(specification.specValue) ?? "",
        }))
        .filter((specification) => specification.value),
      faqs: [...(product.faqs ?? [])]
        .filter((faq) => faq.isActive !== false)
        .sort(
          (left, right) =>
            storefrontNumber(left.sortOrder) - storefrontNumber(right.sortOrder),
        )
        .map((faq) => ({
          id: storefrontToId(faq._id),
          question: storefrontNullableString(faq.question) ?? "Question",
          answer: storefrontNullableString(faq.answer) ?? "",
        }))
        .filter((faq) => faq.answer),
      collections: (product.collectionIds ?? [])
        .map((collectionId) => context.collectionsById.get(storefrontToId(collectionId)))
        .filter((collection): collection is NonNullable<typeof collection> => Boolean(collection))
        .map((collection) => ({
          id: collection.id,
          name: collection.name,
          slug: collection.slug,
        })),
      tags: (product.tagIds ?? [])
        .map((tagId) => context.tagsById.get(storefrontToId(tagId)))
        .filter((tag): tag is NonNullable<typeof tag> => Boolean(tag))
        .map((tag) => ({
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
        })),
      shippingMethods: shippingMethods.slice(0, 4).map((method) => ({
        id: method.id,
        methodName: method.methodName,
        description: method.description,
        baseFee: method.baseFee,
        freeShippingMinAmount: method.freeShippingMinAmount,
        estimatedMinDays: method.estimatedMinDays,
        estimatedMaxDays: method.estimatedMaxDays,
      })),
      reviews,
      reviewSubmission,
      relatedProducts: this.resolveRelatedRows(row, context).map((item) => item.card),
      bundleProducts: this.resolveBundleRows(row, context).map((item) => item.card),
    };
  }

  private async loadCatalogContext(): Promise<CatalogContext> {
    await connectToDatabase();
    const now = new Date();
    const [
      products,
      variants,
      categories,
      brands,
      countries,
      collections,
      tags,
      badges,
      optionTypes,
      optionValues,
      specificationDefinitions,
      categoryFilterConfigs,
      promotions,
      promotionProducts,
      promotionVariants,
    ] = await Promise.all([
      ProductModel.find({ status: "ACTIVE", visibility: "PUBLIC" })
        .lean()
        .exec() as Promise<ProductRecord[]>,
      ProductVariantModel.find({ isActive: true })
        .lean()
        .exec() as Promise<VariantRecord[]>,
      CategoryModel.find({ isActive: true })
        .sort({ sortOrder: 1, categoryName: 1 })
        .lean()
        .exec() as Promise<
        Array<{
          _id: unknown;
          categoryName?: string;
          slug?: string;
          fullSlugPath?: string;
          description?: string;
          imageAssetId?: unknown;
          parentCategoryId?: unknown;
          depth?: number;
          ancestorCategoryIds?: unknown[];
        }>
      >,
      BrandModel.find({ isActive: true })
        .sort({ brandName: 1 })
        .lean()
        .exec() as Promise<
        Array<{
          _id: unknown;
          brandName?: string;
          slug?: string;
          description?: string;
          logoAssetId?: unknown;
          originCountryId?: unknown;
        }>
      >,
      CountryModel.find({})
        .sort({ countryName: 1 })
        .lean()
        .exec() as Promise<Array<{ _id: unknown; countryName?: string; isoCode?: string }>>,
      CollectionModel.find({ isActive: true })
        .sort({ sortOrder: 1, collectionName: 1 })
        .lean()
        .exec() as Promise<
        Array<{
          _id: unknown;
          collectionName?: string;
          slug?: string;
          description?: string;
          bannerAssetId?: unknown;
          startsAt?: Date | null;
          endsAt?: Date | null;
        }>
      >,
      ProductTagModel.find({})
        .sort({ tagName: 1 })
        .lean()
        .exec() as Promise<Array<{ _id: unknown; tagName?: string; slug?: string }>>,
      ProductBadgeModel.find({ isActive: true })
        .sort({ label: 1 })
        .lean()
        .exec() as Promise<Array<{ _id: unknown; label?: string; colorCode?: string }>>,
      OptionTypeModel.find({})
        .sort({ optionName: 1 })
        .lean()
        .exec() as Promise<
        Array<{
          _id: unknown;
          optionName?: string;
          displayType?: "TEXT" | "COLOR_SWATCH" | "BUTTON";
        }>
      >,
      OptionValueModel.find({})
        .sort({ sortOrder: 1, valueName: 1 })
        .lean()
        .exec() as Promise<
        Array<{
          _id: unknown;
          optionTypeId?: unknown;
          valueName?: string;
          valueCode?: string;
          swatchHex?: string;
        }>
      >,
      SpecificationDefinitionModel.find({ isActive: true })
        .lean()
        .exec() as Promise<
        Array<{
          _id: unknown;
          specKey?: string;
          specLabel?: string;
          filterDisplayType?: "CHECKBOX" | "RADIO" | "RANGE" | "COLOR_SWATCH";
        }>
      >,
      CategoryFilterConfigModel.find({ isActive: true })
        .sort({ sortOrder: 1, filterLabel: 1 })
        .lean()
        .exec() as Promise<
        Array<{
          _id: unknown;
          categoryId?: unknown;
          filterKey?: string;
          filterLabel?: string;
          filterSource?: "BRAND" | "PRICE" | "OPTION_TYPE" | "SPECIFICATION";
          optionTypeId?: unknown;
          specDefinitionId?: unknown;
          displayType?: "CHECKBOX" | "RADIO" | "RANGE" | "COLOR_SWATCH";
          sortOrder?: number;
          isActive?: boolean;
          isInherited?: boolean;
        }>
      >,
      PromotionModel.find({ isActive: true })
        .lean()
        .exec() as Promise<
        Array<{
          _id: unknown;
          name?: string;
          description?: string;
          promotionType?: "COUPON" | "FLASH_SALE" | "AUTO_DISCOUNT" | "FREE_SHIPPING";
          discountType?: "PERCENT" | "AMOUNT";
          discountValue?: number;
          heroAssetId?: unknown;
          startsAt?: Date | null;
          endsAt?: Date | null;
        }>
      >,
      PromotionProductModel.find({})
        .lean()
        .exec() as Promise<Array<{ promotionId?: unknown; productId?: unknown }>>,
      PromotionVariantModel.find({})
        .lean()
        .exec() as Promise<Array<{ promotionId?: unknown; variantId?: unknown }>>,
    ]);

    const categoriesById = new Map(
      categories.map((category) => [
        storefrontToId(category._id),
        {
          id: storefrontToId(category._id),
          name: storefrontNullableString(category.categoryName) ?? "Category",
          slug: storefrontNullableString(category.slug) ?? "",
          fullSlugPath:
            storefrontNullableString(category.fullSlugPath) ??
            storefrontNullableString(category.slug) ??
            "",
          description: storefrontNullableString(category.description),
          imageAssetId: storefrontToId(category.imageAssetId) || null,
          parentCategoryId: storefrontToId(category.parentCategoryId) || null,
          depth: storefrontNumber(category.depth),
          ancestorCategoryIds: (category.ancestorCategoryIds ?? [])
            .map((ancestorCategoryId) => storefrontToId(ancestorCategoryId))
            .filter(Boolean),
        },
      ]),
    );
    const categoriesByPath = new Map(
      [...categoriesById.values()]
        .filter((category) => category.fullSlugPath)
        .map((category) => [category.fullSlugPath, category]),
    );
    const brandsById = new Map(
      brands.map((brand) => [
        storefrontToId(brand._id),
        {
          id: storefrontToId(brand._id),
          name: storefrontNullableString(brand.brandName) ?? "Brand",
          slug: storefrontNullableString(brand.slug) ?? "",
          description: storefrontNullableString(brand.description),
          logoAssetId: storefrontToId(brand.logoAssetId) || null,
          originCountryId: storefrontToId(brand.originCountryId) || null,
        },
      ]),
    );
    const countriesById = new Map(
      countries.map((country) => [
        storefrontToId(country._id),
        {
          id: storefrontToId(country._id),
          name: storefrontNullableString(country.countryName) ?? "Country",
          code: storefrontNullableString(country.isoCode),
        },
      ]),
    );
    const countriesByCode = new Map(
      [...countriesById.values()]
        .filter((country) => country.code)
        .map((country) => [country.code as string, country]),
    );
    const collectionsById = new Map(
      collections
        .filter((collection) =>
          storefrontIsInRange(now, collection.startsAt ?? null, collection.endsAt ?? null),
        )
        .map((collection) => [
          storefrontToId(collection._id),
          {
            id: storefrontToId(collection._id),
            name: storefrontNullableString(collection.collectionName) ?? "Collection",
            slug: storefrontNullableString(collection.slug) ?? "",
            description: storefrontNullableString(collection.description),
            bannerAssetId: storefrontToId(collection.bannerAssetId) || null,
          },
        ]),
    );
    const tagsById = new Map(
      tags.map((tag) => [
        storefrontToId(tag._id),
        {
          id: storefrontToId(tag._id),
          name: storefrontNullableString(tag.tagName) ?? "Tag",
          slug: storefrontNullableString(tag.slug) ?? "",
        },
      ]),
    );
    const badgesById = new Map(
      badges.map((badge) => [
        storefrontToId(badge._id),
        {
          id: storefrontToId(badge._id),
          label: storefrontNullableString(badge.label) ?? "Badge",
          colorCode: storefrontNullableString(badge.colorCode),
        },
      ]),
    );
    const optionTypesById = new Map(
      optionTypes.map((optionType) => [
        storefrontToId(optionType._id),
        {
          id: storefrontToId(optionType._id),
          name: storefrontNullableString(optionType.optionName) ?? "Option",
          displayType: optionType.displayType ?? "TEXT",
        },
      ]),
    );
    const optionValuesById = new Map(
      optionValues.map((optionValue) => [
        storefrontToId(optionValue._id),
        {
          id: storefrontToId(optionValue._id),
          optionTypeId: storefrontToId(optionValue.optionTypeId),
          label: storefrontNullableString(optionValue.valueName) ?? "Value",
          valueCode: storefrontNullableString(optionValue.valueCode),
          swatchHex: storefrontNullableString(optionValue.swatchHex),
        },
      ]),
    );
    const specificationDefinitionsById = new Map(
      specificationDefinitions.map((definition) => [
        storefrontToId(definition._id),
        {
          id: storefrontToId(definition._id),
          specKey: storefrontNullableString(definition.specKey) ?? "",
          specLabel: storefrontNullableString(definition.specLabel) ?? "Specification",
          filterDisplayType: definition.filterDisplayType ?? "CHECKBOX",
        },
      ]),
    );
    const categoryFilterConfigsByCategoryId = new Map<
      string,
      CatalogContext["categoryFilterConfigsByCategoryId"] extends Map<string, infer TValue>
        ? TValue
        : never
    >();

    for (const config of categoryFilterConfigs) {
      const categoryId = storefrontToId(config.categoryId);

      if (!categoryId) {
        continue;
      }

      const current = categoryFilterConfigsByCategoryId.get(categoryId) ?? [];
      current.push({
        id: storefrontToId(config._id),
        categoryId,
        filterKey: storefrontNullableString(config.filterKey) ?? "",
        filterLabel: storefrontNullableString(config.filterLabel) ?? "Filter",
        filterSource: config.filterSource ?? "SPECIFICATION",
        optionTypeId: storefrontToId(config.optionTypeId) || null,
        specDefinitionId: storefrontToId(config.specDefinitionId) || null,
        displayType: config.displayType ?? "CHECKBOX",
        sortOrder: storefrontNumber(config.sortOrder),
        isActive: config.isActive !== false,
        isInherited: config.isInherited !== false,
      });
      categoryFilterConfigsByCategoryId.set(categoryId, current);
    }

    const activePromotions = promotions.filter((promotion) =>
      storefrontIsInRange(now, promotion.startsAt ?? null, promotion.endsAt ?? null),
    );
    const activePromotionIds = new Set(
      activePromotions.map((promotion) => storefrontToId(promotion._id)),
    );
    const promotionIdsByVariant = new Map<string, string[]>();

    for (const row of promotionVariants) {
      const promotionId = storefrontToId(row.promotionId);
      const variantId = storefrontToId(row.variantId);

      if (!promotionId || !variantId || !activePromotionIds.has(promotionId)) {
        continue;
      }

      const current = promotionIdsByVariant.get(variantId) ?? [];
      current.push(promotionId);
      promotionIdsByVariant.set(variantId, current);
    }

    const productPromotionIds = new Map<string, string[]>();

    for (const row of promotionProducts) {
      const promotionId = storefrontToId(row.promotionId);
      const productId = storefrontToId(row.productId);

      if (!promotionId || !productId || !activePromotionIds.has(promotionId)) {
        continue;
      }

      const current = productPromotionIds.get(productId) ?? [];
      current.push(promotionId);
      productPromotionIds.set(productId, current);
    }

    for (const variant of variants) {
      const variantId = storefrontToId(variant._id);
      const productId = storefrontToId(variant.productId);
      const linkedPromotions = promotionIdsByVariant.get(variantId) ?? [];

      if (!productId || linkedPromotions.length === 0) {
        continue;
      }

      const current = productPromotionIds.get(productId) ?? [];
      productPromotionIds.set(productId, [...current, ...linkedPromotions]);
    }

    const promotionsById = new Map(
      activePromotions.map((promotion) => {
        const promotionId = storefrontToId(promotion._id);
        const linkedProductCount = [...productPromotionIds.values()].filter((value) =>
          value.includes(promotionId),
        ).length;

        return [promotionId, buildPromotionSummary(promotion, linkedProductCount)];
      }),
    );
    const productsById = new Map(
      products.map((product) => [storefrontToId(product._id), product]),
    );
    const variantsByProductId = new Map<string, VariantRecord[]>();

    for (const variant of variants) {
      const productId = storefrontToId(variant.productId);

      if (!productId) {
        continue;
      }

      const current = variantsByProductId.get(productId) ?? [];
      current.push(variant);
      variantsByProductId.set(productId, current);
    }

    const rows: CatalogRow[] = [];

    for (const product of products) {
      const productId = storefrontToId(product._id);
      const categoryId = storefrontToId(product.categoryId);
      const category = categoriesById.get(categoryId);
      const brandId = storefrontToId(product.brandId);
      const brand = brandsById.get(brandId);
      const activeVariants = (variantsByProductId.get(productId) ?? [])
        .filter((variant) => variant.isActive)
        .sort((left, right) => {
          const defaultDelta =
            Number(Boolean(right.isDefault)) - Number(Boolean(left.isDefault));

          if (defaultDelta !== 0) {
            return defaultDelta;
          }

          return (left.createdAt?.getTime() ?? 0) - (right.createdAt?.getTime() ?? 0);
        });

      if (!category) {
        continue;
      }

      const defaultVariant =
        activeVariants.find((variant) => variant.isDefault) ?? activeVariants[0] ?? null;
      const availabilitySummary = summarizeProductVariants(activeVariants);

      const imageIds = storefrontUnique([
        ...storefrontImageAssetIds(product.images),
        ...activeVariants.flatMap((variant) => storefrontImageAssetIds(variant.images)),
      ]);
      const collectionSlugs = (product.collectionIds ?? [])
        .map((collectionId) => collectionsById.get(storefrontToId(collectionId))?.slug ?? null)
        .filter((slug): slug is string => Boolean(slug));
      const tagSlugs = (product.tagIds ?? [])
        .map((tagId) => tagsById.get(storefrontToId(tagId))?.slug ?? null)
        .filter((slug): slug is string => Boolean(slug));
      const badgeRows = storefrontUnique([
        ...buildGeneratedBadges(product).map((badge) => JSON.stringify(badge)),
        ...(product.badgeIds ?? [])
          .map((badgeId) => badgesById.get(storefrontToId(badgeId)))
          .filter((badge): badge is NonNullable<typeof badge> => Boolean(badge))
          .map((badge) =>
            JSON.stringify({
              id: badge.id,
              label: badge.label,
              colorCode: badge.colorCode,
            }),
          ),
      ]).map((badge) => JSON.parse(badge) as StorefrontProductBadge);
      const optionValueIds = storefrontUnique(
        activeVariants.flatMap((variant) =>
          (variant.optionValueIds ?? [])
            .map((optionValueId) => storefrontToId(optionValueId))
            .filter(Boolean),
        ),
      );
      const promotionIds = storefrontUnique(
        (productPromotionIds.get(productId) ?? []).filter((promotionId) =>
          promotionsById.has(promotionId),
        ),
      );
      const availableQty = availabilitySummary.totalAvailableQty;
      const country = countriesById.get(storefrontToId(product.originCountryId)) ?? null;

      rows.push({
        product,
        card: {
          id: productId,
          slug: storefrontNullableString(product.slug) ?? "",
          productName: storefrontNullableString(product.productName) ?? "Product",
          shortDescription: storefrontNullableString(product.shortDescription),
          categoryId,
          categoryName: category.name,
          categorySlug: category.slug,
          categoryFullSlugPath: category.fullSlugPath,
          brandId: brand ? brand.id : null,
          brandName: brand?.name ?? null,
          brandSlug: brand?.slug ?? null,
          price: defaultVariant ? storefrontNumber(defaultVariant.unitPrice) : 0,
          compareAtPrice:
            defaultVariant && typeof defaultVariant.compareAtPrice === "number"
              ? defaultVariant.compareAtPrice
              : null,
          currencyCode:
            storefrontNullableString(defaultVariant?.currencyCode) ?? "MMK",
          variantCount: activeVariants.length,
          isFeatured: Boolean(product.isFeatured),
          isNewArrival: Boolean(product.isNewArrival),
          isBestSeller: Boolean(product.isBestSeller),
          avgRating: storefrontNumber(product.avgRating),
          reviewCount: storefrontNumber(product.reviewCount),
          soldCount: storefrontNumber(product.soldCount),
          availableQty,
          availabilityLabel: availabilitySummary.availabilityLabel,
          hasActiveVariant: availabilitySummary.activeVariantCount > 0,
          hasSellableVariant: availabilitySummary.hasSellableVariant,
          hasInStockVariant: availabilitySummary.hasInStockVariant,
          primaryImageAssetId: imageIds[0] ?? null,
          secondaryImageAssetId: imageIds.find((imageId) => imageId !== imageIds[0]) ?? null,
          badges: badgeRows,
          promotionNames: promotionIds
            .map((promotionId) => promotionsById.get(promotionId)?.name ?? null)
            .filter((name): name is string => Boolean(name)),
        },
        categoryId,
        categorySlug: category.slug,
        categoryFullSlugPath: category.fullSlugPath,
        ancestorCategoryIds: category.ancestorCategoryIds,
        brandSlug: brand?.slug ?? null,
        collectionSlugs,
        tagSlugs,
        promotionIds,
        originCountryCode: country?.code ?? null,
        conditionType: product.conditionType ?? "NEW",
        optionValueIds,
        specifications: (product.specifications ?? [])
          .map((specification) => ({
            specDefinitionId: storefrontToId(specification.specDefinitionId) || null,
            specKey: storefrontNullableString(specification.specKey) ?? "",
            specValue: storefrontNullableString(specification.specValue) ?? "",
          }))
          .filter((specification) => specification.specKey && specification.specValue),
        availableQty,
        availabilityLabel: availabilitySummary.availabilityLabel,
        hasActiveVariant: availabilitySummary.activeVariantCount > 0,
        hasSellableVariant: availabilitySummary.hasSellableVariant,
        hasInStockVariant: availabilitySummary.hasInStockVariant,
        createdAt: product.createdAt ?? null,
      });
    }

    return {
      rows,
      productsById,
      variantsByProductId,
      categoriesById,
      categoriesByPath,
      brandsById,
      collectionsById,
      tagsById,
      badgesById,
      countriesById,
      countriesByCode,
      optionTypesById,
      optionValuesById,
      specificationDefinitionsById,
      categoryFilterConfigsByCategoryId,
      promotionsById,
    };
  }

  private compareRows(
    left: CatalogRow,
    right: CatalogRow,
    sort: StorefrontSearchInput["sort"],
    query: string,
  ) {
    if (sort === "newest") {
      return (right.createdAt?.getTime() ?? 0) - (left.createdAt?.getTime() ?? 0);
    }

    if (sort === "price_asc") {
      if (left.card.price <= 0 || right.card.price <= 0) {
        if (left.card.price <= 0 && right.card.price > 0) {
          return 1;
        }

        if (right.card.price <= 0 && left.card.price > 0) {
          return -1;
        }
      }

      return left.card.price - right.card.price;
    }

    if (sort === "price_desc") {
      if (left.card.price <= 0 || right.card.price <= 0) {
        if (left.card.price <= 0 && right.card.price > 0) {
          return 1;
        }

        if (right.card.price <= 0 && left.card.price > 0) {
          return -1;
        }
      }

      return right.card.price - left.card.price;
    }

    if (sort === "best_selling") {
      return (
        right.card.soldCount - left.card.soldCount ||
        right.card.avgRating - left.card.avgRating
      );
    }

    if (sort === "rating_desc") {
      return (
        right.card.avgRating - left.card.avgRating ||
        right.card.reviewCount - left.card.reviewCount
      );
    }

    if (sort === "relevance" && query.trim()) {
      const normalized = query.trim().toLowerCase();
      const leftScore = this.scoreRow(left, normalized);
      const rightScore = this.scoreRow(right, normalized);

      if (leftScore !== rightScore) {
        return rightScore - leftScore;
      }
    }

    return (
      Number(right.card.isFeatured) - Number(left.card.isFeatured) ||
      Number(right.card.isBestSeller) - Number(left.card.isBestSeller) ||
      right.card.soldCount - left.card.soldCount ||
      (right.createdAt?.getTime() ?? 0) - (left.createdAt?.getTime() ?? 0)
    );
  }

  private scoreRow(row: CatalogRow, query: string) {
    const productName = row.card.productName.toLowerCase();
    const brandName = (row.card.brandName ?? "").toLowerCase();
    const categoryName = (row.card.categoryName ?? "").toLowerCase();
    const description = (row.card.shortDescription ?? "").toLowerCase();
    let score = 0;

    if (productName === query) {
      score += 10;
    }

    if (productName.startsWith(query)) {
      score += 6;
    }

    if (productName.includes(query)) {
      score += 4;
    }

    if (brandName.includes(query)) {
      score += 2;
    }

    if (categoryName.includes(query)) {
      score += 1;
    }

    if (description.includes(query)) {
      score += 1;
    }

    return score;
  }

  private parseSpecFilterToken(token: string) {
    const [definitionKey, rawValue] = token.split("::");
    const definitionId = (definitionKey ?? "").trim();
    const specValue = decodeURIComponent((rawValue ?? "").trim());

    if (!definitionId || !specValue) {
      return null;
    }

    return { definitionId, specValue };
  }

  private rowMatchesCategory(
    row: CatalogRow,
    categories: Array<{ id: string; fullSlugPath: string }>,
  ) {
    if (categories.length === 0) {
      return true;
    }

    return categories.some(
      (category) =>
        row.categoryId === category.id ||
        row.ancestorCategoryIds.includes(category.id) ||
        row.categoryFullSlugPath === category.fullSlugPath,
    );
  }

  private buildCategoryPathLabel(
    category: CatalogContext["categoriesById"] extends Map<string, infer TValue> ? TValue : never,
    context: CatalogContext,
  ) {
    const names = category.ancestorCategoryIds
      .map((ancestorId) => context.categoriesById.get(ancestorId)?.name ?? null)
      .filter((name): name is string => Boolean(name));

    return [...names, category.name].join(" / ");
  }

  private resolveCategoryFilterState(
    input: StorefrontSearchInput,
    context: CatalogContext,
  ) {
    const selectedCategory =
      input.categorySlugs.length === 1
        ? context.categoriesByPath.get(input.categorySlugs[0]) ?? null
        : null;

    if (!selectedCategory) {
      return {
        selectedCategory: null,
        configs: [],
        showBrandFilter: true,
        showPriceFilter: true,
      };
    }

    const lineage = [
      ...selectedCategory.ancestorCategoryIds,
      selectedCategory.id,
    ];
    const configMap = new Map<
      string,
      NonNullable<
        CatalogContext["categoryFilterConfigsByCategoryId"] extends Map<string, Array<infer TValue>>
          ? TValue
          : never
      >
    >();

    for (const categoryId of lineage) {
      const configs = context.categoryFilterConfigsByCategoryId.get(categoryId) ?? [];

      for (const config of configs) {
        if (categoryId !== selectedCategory.id && !config.isInherited) {
          continue;
        }

        configMap.set(config.filterKey, config);
      }
    }

    const configs = [...configMap.values()].sort(
      (left, right) =>
        left.sortOrder - right.sortOrder ||
        left.filterLabel.localeCompare(right.filterLabel),
    );
    const hasCategoryConfig = configs.length > 0;

    return {
      selectedCategory,
      configs,
      showBrandFilter:
        !hasCategoryConfig || configs.some((config) => config.filterSource === "BRAND"),
      showPriceFilter:
        !hasCategoryConfig || configs.some((config) => config.filterSource === "PRICE"),
    };
  }

  private buildConfiguredFilterGroups(
    rows: CatalogRow[],
    configs: ReturnType<StorefrontCatalogService["resolveCategoryFilterState"]>["configs"],
    context: CatalogContext,
  ): StorefrontConfiguredFilterGroup[] {
    const groups: StorefrontConfiguredFilterGroup[] = [];

    for (const config of configs) {
      if (!config.isActive || config.filterSource === "BRAND" || config.filterSource === "PRICE") {
        continue;
      }

      if (config.filterSource === "OPTION_TYPE" && config.optionTypeId) {
        const valueCounts = new Map<string, number>();

        for (const row of rows) {
          const seen = new Set<string>();

          for (const optionValueId of row.optionValueIds) {
            const optionValue = context.optionValuesById.get(optionValueId);

            if (!optionValue || optionValue.optionTypeId !== config.optionTypeId) {
              continue;
            }

            if (seen.has(optionValue.id)) {
              continue;
            }

            seen.add(optionValue.id);
            valueCounts.set(optionValue.id, (valueCounts.get(optionValue.id) ?? 0) + 1);
          }
        }

        const values = [...valueCounts.entries()]
          .map(([optionValueId, count]) => {
            const optionValue = context.optionValuesById.get(optionValueId);

            if (!optionValue) {
              return null;
            }

            return {
              id: optionValue.id,
              label: optionValue.label,
              slug: optionValue.id,
              count,
              swatchHex: optionValue.swatchHex,
            };
          })
          .filter((value): value is NonNullable<typeof value> => Boolean(value))
          .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));

        if (values.length > 0) {
          groups.push({
            key: config.filterKey,
            label: config.filterLabel,
            filterSource: config.filterSource,
            displayType: config.displayType,
            values,
          });
        }
      }

      if (config.filterSource === "SPECIFICATION" && config.specDefinitionId) {
        const valueCounts = new Map<string, number>();

        for (const row of rows) {
          const seen = new Set<string>();

          for (const specification of row.specifications) {
            const matches =
              specification.specDefinitionId === config.specDefinitionId ||
              (!specification.specDefinitionId &&
                context.specificationDefinitionsById.get(config.specDefinitionId)?.specKey ===
                  specification.specKey.trim().toUpperCase());

            if (!matches) {
              continue;
            }

            const valueKey = specification.specValue.trim();

            if (!valueKey || seen.has(valueKey)) {
              continue;
            }

            seen.add(valueKey);
            valueCounts.set(valueKey, (valueCounts.get(valueKey) ?? 0) + 1);
          }
        }

        const values = [...valueCounts.entries()]
          .map(([value, count]) => ({
            id: `${config.specDefinitionId}:${value}`,
            label: value,
            slug: `${config.specDefinitionId}::${encodeURIComponent(value)}`,
            count,
          }))
          .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));

        if (values.length > 0) {
          groups.push({
            key: config.filterKey,
            label: config.filterLabel,
            filterSource: config.filterSource,
            displayType: config.displayType,
            values,
          });
        }
      }
    }

    return groups;
  }

  private buildListingTitle(input: StorefrontSearchInput, context: CatalogContext) {
    if (input.query) {
      return `Results for "${input.query}"`;
    }

    if (input.categorySlugs.length === 1) {
      const category = context.categoriesByPath.get(input.categorySlugs[0]);
      if (category) {
        return this.buildCategoryPathLabel(category, context);
      }
    }

    if (input.collectionSlugs.length === 1) {
      const collection = [...context.collectionsById.values()].find(
        (item) => item.slug === input.collectionSlugs[0],
      );
      if (collection) {
        return collection.name;
      }
    }

    if (input.brandSlugs.length === 1) {
      const brand = [...context.brandsById.values()].find(
        (item) => item.slug === input.brandSlugs[0],
      );
      if (brand) {
        return brand.name;
      }
    }

    return "Shop";
  }

  private buildListingDescription(
    input: StorefrontSearchInput,
    context: CatalogContext,
  ) {
    if (input.categorySlugs.length === 1) {
      const category = context.categoriesByPath.get(input.categorySlugs[0]);
      return category?.description ?? null;
    }

    if (input.collectionSlugs.length === 1) {
      const collection = [...context.collectionsById.values()].find(
        (item) => item.slug === input.collectionSlugs[0],
      );
      return collection?.description ?? null;
    }

    return null;
  }

  private buildActiveFilterChips(
    input: StorefrontSearchInput,
    context: CatalogContext,
  ): StorefrontActiveFilterChip[] {
    const chips: StorefrontActiveFilterChip[] = [];
    const pushChip = (
      key: string,
      label: string,
      overrides: Partial<StorefrontSearchInput>,
    ) => {
      chips.push({
        key,
        label,
        href: buildStorefrontSearchHref(input, {
          ...overrides,
          page: 1,
        }),
      });
    };

    for (const slug of input.categorySlugs) {
      const category = context.categoriesByPath.get(slug);
      if (category) {
        pushChip("category:" + slug, this.buildCategoryPathLabel(category, context), {
          categorySlugs: input.categorySlugs.filter((value) => value !== slug),
        });
      }
    }

    for (const slug of input.brandSlugs) {
      const brand = [...context.brandsById.values()].find((item) => item.slug === slug);
      if (brand) {
        pushChip("brand:" + slug, brand.name, {
          brandSlugs: input.brandSlugs.filter((value) => value !== slug),
        });
      }
    }

    for (const slug of input.collectionSlugs) {
      const collection = [...context.collectionsById.values()].find(
        (item) => item.slug === slug,
      );
      if (collection) {
        pushChip("collection:" + slug, collection.name, {
          collectionSlugs: input.collectionSlugs.filter((value) => value !== slug),
        });
      }
    }

    for (const slug of input.tagSlugs) {
      const tag = [...context.tagsById.values()].find((item) => item.slug === slug);
      if (tag) {
        pushChip("tag:" + slug, tag.name, {
          tagSlugs: input.tagSlugs.filter((value) => value !== slug),
        });
      }
    }

    for (const promotionId of input.promotionIds) {
      const promotion = context.promotionsById.get(promotionId);
      if (promotion) {
        pushChip("promotion:" + promotionId, promotion.name, {
          promotionIds: input.promotionIds.filter((value) => value !== promotionId),
        });
      }
    }

    for (const code of input.originCountryCodes) {
      const country = context.countriesByCode.get(code);
      if (country) {
        pushChip("country:" + code, country.name, {
          originCountryCodes: input.originCountryCodes.filter((value) => value !== code),
        });
      }
    }

    for (const optionValueId of input.optionValueIds) {
      const optionValue = context.optionValuesById.get(optionValueId);
      if (optionValue) {
        pushChip("option:" + optionValueId, optionValue.label, {
          optionValueIds: input.optionValueIds.filter((value) => value !== optionValueId),
        });
      }
    }

    for (const token of input.specFilters) {
      const parsed = this.parseSpecFilterToken(token);

      if (!parsed) {
        continue;
      }

      const definition = context.specificationDefinitionsById.get(parsed.definitionId);

      pushChip(
        "spec:" + token,
        `${definition?.specLabel ?? "Spec"}: ${parsed.specValue}`,
        {
          specFilters: input.specFilters.filter((value) => value !== token),
        },
      );
    }

    if (input.condition) {
      pushChip("condition", input.condition === "NEW" ? "New" : "Refurbished", {
        condition: null,
      });
    }

    if (input.stock === "in_stock") {
      pushChip("stock", "In stock", {
        stock: "all",
      });
    }

    if (input.onSaleOnly) {
      pushChip("sale", "On sale", {
        onSaleOnly: false,
      });
    }

    if (input.minRating !== null) {
      pushChip("rating", `${input.minRating}+ stars`, {
        minRating: null,
      });
    }

    if (input.minPrice !== null || input.maxPrice !== null) {
      pushChip("price", `${input.minPrice ?? 0} - ${input.maxPrice ?? "up"}`, {
        minPrice: null,
        maxPrice: null,
      });
    }

    return chips;
  }

  private buildFacetOptions(
    rows: CatalogRow[],
    valueGetter: (row: CatalogRow) => string[],
    resolver: (value: string) => { id: string; label: string; slug: string } | null,
  ): StorefrontFilterOption[] {
    const counts = new Map<string, number>();

    for (const row of rows) {
      for (const value of storefrontUnique(valueGetter(row))) {
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .map(([value, count]) => {
        const resolved = resolver(value);
        return resolved ? { ...resolved, count } : null;
      })
      .filter((item): item is StorefrontFilterOption => Boolean(item))
      .sort(
        (left, right) => right.count - left.count || left.label.localeCompare(right.label),
      );
  }

  private buildOptionGroupFacets(rows: CatalogRow[], context: CatalogContext) {
    const groupedCounts = new Map<string, Map<string, number>>();

    for (const row of rows) {
      const seen = new Set<string>();

      for (const optionValueId of row.optionValueIds) {
        const optionValue = context.optionValuesById.get(optionValueId);

        if (!optionValue) {
          continue;
        }

        const dedupeKey = `${optionValue.optionTypeId}:${optionValue.id}`;

        if (seen.has(dedupeKey)) {
          continue;
        }

        seen.add(dedupeKey);
        const valueCounts = groupedCounts.get(optionValue.optionTypeId) ?? new Map<string, number>();
        valueCounts.set(optionValue.id, (valueCounts.get(optionValue.id) ?? 0) + 1);
        groupedCounts.set(optionValue.optionTypeId, valueCounts);
      }
    }

    return [...groupedCounts.entries()]
      .map(([optionTypeId, valueCounts]) => {
        const optionType = context.optionTypesById.get(optionTypeId);

        if (!optionType) {
          return null;
        }

        return {
          id: optionType.id,
          label: optionType.name,
          displayType: optionType.displayType,
          values: [...valueCounts.entries()]
            .map(([optionValueId, count]) => {
              const optionValue = context.optionValuesById.get(optionValueId);

              if (!optionValue) {
                return null;
              }

              return {
                id: optionValue.id,
                label: optionValue.label,
                swatchHex: optionValue.swatchHex,
                count,
              };
            })
            .filter((item): item is NonNullable<typeof item> => Boolean(item))
            .sort(
              (left, right) =>
                right.count - left.count || left.label.localeCompare(right.label),
            ),
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((left, right) => left.label.localeCompare(right.label));
  }

  private buildCategorySummaries(
    rows: CatalogRow[],
    categoriesById: CatalogContext["categoriesById"],
  ) {
    const counts = new Map<string, number>();

    for (const row of rows) {
      counts.set(row.categoryId, (counts.get(row.categoryId) ?? 0) + 1);
    }

    return [...categoriesById.values()]
      .map((category) => ({
        id: category.id,
        categoryName: category.name,
        slug: category.slug,
        fullSlugPath: category.fullSlugPath,
        depth: category.depth,
        parentCategoryId: category.parentCategoryId,
        description: category.description,
        imageAssetId: category.imageAssetId,
        productCount: counts.get(category.id) ?? 0,
      }))
      .filter((category) => category.productCount > 0)
      .sort(
        (left, right) =>
          right.productCount - left.productCount ||
          left.categoryName.localeCompare(right.categoryName),
      );
  }

  private buildCollectionSummaries(
    rows: CatalogRow[],
    collectionsById: CatalogContext["collectionsById"],
  ) {
    const counts = new Map<string, number>();

    for (const row of rows) {
      for (const slug of row.collectionSlugs) {
        const collection = [...collectionsById.values()].find((item) => item.slug === slug);

        if (!collection) {
          continue;
        }

        counts.set(collection.id, (counts.get(collection.id) ?? 0) + 1);
      }
    }

    return [...collectionsById.values()]
      .map((collection) => ({
        id: collection.id,
        collectionName: collection.name,
        slug: collection.slug,
        description: collection.description,
        bannerAssetId: collection.bannerAssetId,
        productCount: counts.get(collection.id) ?? 0,
      }))
      .filter((collection) => collection.productCount > 0)
      .sort(
        (left, right) =>
          right.productCount - left.productCount ||
          left.collectionName.localeCompare(right.collectionName),
      );
  }

  private buildBrandSummaries(
    rows: CatalogRow[],
    brandsById: CatalogContext["brandsById"],
  ) {
    const counts = new Map<string, number>();

    for (const row of rows) {
      if (!row.card.brandId) {
        continue;
      }

      counts.set(row.card.brandId, (counts.get(row.card.brandId) ?? 0) + 1);
    }

    return [...brandsById.values()]
      .map((brand) => ({
        id: brand.id,
        brandName: brand.name,
        slug: brand.slug,
        description: brand.description,
        logoAssetId: brand.logoAssetId,
        originCountryId: brand.originCountryId,
        productCount: counts.get(brand.id) ?? 0,
      }))
      .filter((brand) => brand.productCount > 0)
      .sort(
        (left, right) =>
          right.productCount - left.productCount ||
          left.brandName.localeCompare(right.brandName),
      );
  }

  private resolveRelatedRows(row: CatalogRow, context: CatalogContext) {
    const rowMap = new Map(context.rows.map((item) => [item.card.id, item]));
    const explicit = storefrontUnique(
      [...(row.product.relations ?? [])]
        .sort(
          (left, right) =>
            storefrontNumber(left.sortOrder) - storefrontNumber(right.sortOrder),
        )
        .map((relation) => rowMap.get(storefrontToId(relation.relatedProductId)))
        .filter((item): item is CatalogRow => Boolean(item)),
    );

    if (explicit.length >= 4) {
      return explicit.slice(0, 8);
    }

    const fallback = context.rows.filter(
      (item) =>
        item.card.id !== row.card.id &&
        (item.categoryId === row.categoryId ||
          item.card.brandId === row.card.brandId ||
          item.collectionSlugs.some((slug) => row.collectionSlugs.includes(slug))),
    );

    return storefrontUnique([...explicit, ...fallback]).slice(0, 8);
  }

  private resolveBundleRows(row: CatalogRow, context: CatalogContext) {
    const rowMap = new Map(context.rows.map((item) => [item.card.id, item]));

    return storefrontUnique(
      [...(row.product.bundleItems ?? [])]
        .sort(
          (left, right) =>
            storefrontNumber(left.sortOrder) - storefrontNumber(right.sortOrder),
        )
        .map((bundleItem) => rowMap.get(storefrontToId(bundleItem.childProductId)))
        .filter((item): item is CatalogRow => Boolean(item)),
    ).slice(0, 6);
  }
}

export const storefrontCatalogService = new StorefrontCatalogService();
