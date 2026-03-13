import { Types } from "mongoose";

import { AppError } from "@/lib/errors/app-error";
import { connectToDatabase } from "@/lib/db/mongodb";
import { assertObjectId } from "@/lib/utils/object-id";
import { cartService } from "@/modules/cart/cart.service";
import {
  getVariantAvailabilityState,
  summarizeProductVariants,
} from "@/modules/catalog/catalog-availability";
import { catalogService } from "@/modules/catalog/catalog.service";
import { CategoryModel } from "@/modules/catalog/catalog.models";
import { CollectionModel } from "@/modules/catalog/catalog-extra.models";
import { contentRepositories } from "@/modules/content/content.repository";
import { systemEventsService } from "@/modules/content/system-events.service";
import { coreService } from "@/modules/core/core.service";
import { customersService } from "@/modules/customers/customers.service";
import { ordersService } from "@/modules/orders/orders.service";
import { paymentsService } from "@/modules/payments/payments.service";
import { pricingRepositories } from "@/modules/pricing/pricing.repository";
import {
  GiftCardModel,
  GiftCardTransactionModel,
} from "@/modules/pricing/pricing.models";
import { setupService } from "@/modules/setup/setup.service";
import type { StorefrontGiftCardPreview } from "@/modules/storefront/storefront.types";
import type { SessionUser } from "@/modules/users/auth.service";

type StorefrontProductCard = {
  id: string;
  slug: string;
  productName: string;
  shortDescription: string | null;
  categoryId: string;
  categoryName: string | null;
  categorySlug: string | null;
  categoryFullSlugPath: string | null;
  brandId: string | null;
  brandName: string | null;
  brandSlug: string | null;
  price: number;
  compareAtPrice: number | null;
  currencyCode: string;
  variantCount: number;
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  avgRating: number;
  reviewCount: number;
  soldCount: number;
  availableQty: number;
  availabilityLabel: string;
  hasActiveVariant: boolean;
  hasSellableVariant: boolean;
  hasInStockVariant: boolean;
  primaryImageAssetId: string | null;
  secondaryImageAssetId: string | null;
  badges: Array<{
    id: string;
    label: string;
    colorCode: string | null;
  }>;
  promotionNames: string[];
};

type StorefrontProductDetail = StorefrontProductCard & {
  description: string | null;
  material: string | null;
  careInstructions: string | null;
  warrantyInfo: string | null;
  conditionType: "NEW" | "REFURBISHED";
  category: {
    id: string;
    name: string;
    slug: string;
    fullSlugPath: string;
  } | null;
  brand: {
    id: string;
    name: string;
    slug: string;
  } | null;
  originCountry: {
    id: string;
    name: string;
    code: string | null;
  } | null;
  promotions: Array<{
    id: string;
    name: string;
    discountType: "PERCENT" | "AMOUNT" | null;
    discountValue: number | null;
  }>;
  imageAssetIds: string[];
  optionGroups: Array<{
    id: string;
    name: string;
    displayType: "TEXT" | "COLOR_SWATCH" | "BUTTON";
    values: Array<{
      id: string;
      label: string;
      valueCode: string | null;
      swatchHex: string | null;
    }>;
  }>;
  variants: Array<{
    id: string;
    sku: string;
    barcode: string | null;
    variantName: string | null;
    unitPrice: number;
    compareAtPrice: number | null;
    currencyCode: string;
    availableQty: number;
    stockQty: number;
    trackInventory: boolean;
    isDefault: boolean;
    isActive: boolean;
    allowBackorder: boolean;
    availabilityLabel: string;
    isPurchasable: boolean;
    imageAssetIds: string[];
    optionValueIds: string[];
    optionSelections: Array<{
      optionTypeId: string;
      optionTypeName: string;
      displayType: "TEXT" | "COLOR_SWATCH" | "BUTTON";
      optionValueId: string;
      optionValueLabel: string;
      swatchHex: string | null;
    }>;
  }>;
  specifications: Array<{
    id: string;
    group: string | null;
    key: string;
    value: string;
  }>;
  faqs: Array<{
    id: string;
    question: string;
    answer: string;
  }>;
  collections: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  tags: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  shippingMethods: Array<{
    id: string;
    methodName: string;
    description: string | null;
    baseFee: number;
    freeShippingMinAmount: number | null;
    estimatedMinDays: number | null;
    estimatedMaxDays: number | null;
  }>;
  reviews: Array<{
    id: string;
    customerName: string;
    rating: number;
    title: string | null;
    comment: string | null;
    isVerifiedPurchase: boolean;
    createdAt: Date | null;
    media: Array<{
      id: string;
      url: string;
    }>;
  }>;
  reviewSubmission: {
    canSubmit: boolean;
    message: string | null;
  } | null;
  relatedProducts: StorefrontProductCard[];
  bundleSuggestions: StorefrontProductCard[];
};

type StorefrontCartSnapshot = {
  cart: {
    id: string;
    currencyCode: string;
    status: string;
    subtotal: number;
    discountTotal: number;
    shippingFee: number;
    taxTotal: number;
    grandTotal: number;
  };
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    productSlug: string;
    variantId: string;
    variantName: string | null;
    sku: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    currencyCode: string;
    availableQty: number;
    availabilityLabel: string;
    trackInventory: boolean;
    isPurchasable: boolean;
    primaryImageAssetId: string | null;
  }>;
};

type CatalogProduct = NonNullable<
  Awaited<ReturnType<typeof catalogService.getProductById>>
>;
type CatalogVariant = NonNullable<
  Awaited<ReturnType<typeof catalogService.getVariantById>>
>;

type StorefrontCategory = {
  id: string;
  categoryName: string;
  slug: string;
  fullSlugPath: string;
  depth: number;
  parentCategoryId: string | null;
  description: string | null;
  imageAssetId: string | null;
  productCount: number;
};

type StorefrontBanner = {
  id: string;
  bannerName: string;
  bannerType: "HERO" | "PROMO" | "CATEGORY";
  title: string | null;
  subtitle: string | null;
  linkUrl: string | null;
  assetId: string | null;
};

type StorefrontCollection = {
  id: string;
  collectionName: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  productCount?: number;
};

type StorefrontPromotion = {
  id: string;
  name: string;
  description: string | null;
  promotionType: "COUPON" | "FLASH_SALE" | "AUTO_DISCOUNT" | "FREE_SHIPPING";
  discountType?: "PERCENT" | "AMOUNT";
  discountValue?: number;
  heroAssetId?: string | null;
  linkedProductCount?: number;
};

type StorefrontBrand = {
  id: string;
  brandName: string;
  slug: string;
  description: string | null;
  logoAssetId?: string | null;
  originCountryId?: string | null;
  productCount?: number;
};

type StorefrontNavigationMenu = {
  id: string;
  menuName: string;
  items: Array<{
    id: string;
    label: string;
    url: string | null;
  }>;
};

function toStorefrontVariant(
  variant: Awaited<ReturnType<typeof catalogService.getVariantById>>,
) {
  if (!variant) {
    return null;
  }

  const availabilityState = getVariantAvailabilityState(variant);

  return {
    id: variant.id,
    sku: variant.sku,
    barcode: variant.barcode ?? null,
    variantName: variant.variantName ?? null,
    unitPrice: variant.unitPrice,
    compareAtPrice: variant.compareAtPrice ?? null,
    currencyCode: variant.currencyCode,
    availableQty: variant.availableQty,
    stockQty: variant.stockQty ?? variant.availableQty,
    trackInventory: variant.trackInventory !== false,
    isDefault: variant.isDefault,
    isActive: variant.isActive,
    allowBackorder: variant.allowBackorder ?? false,
    availabilityLabel: availabilityState.label,
    isPurchasable: availabilityState.isSellable,
    imageAssetIds: (variant.images ?? [])
      .map((image) => image.assetId?.toString() ?? "")
      .filter(Boolean),
    optionValueIds: (variant.optionValueIds ?? [])
      .map((optionValueId) => optionValueId.toString())
      .filter(Boolean),
    optionSelections: [],
  };
}

function getPrimaryImageAssetId(
  product: CatalogProduct,
): string | null {
  if (!product?.images || product.images.length === 0) {
    return null;
  }
  const primaryImage = product.images.find((img) => img.isPrimary);
  return primaryImage?.assetId?.toString() ?? product.images[0]?.assetId?.toString() ?? null;
}

function getSecondaryImageAssetId(product: CatalogProduct): string | null {
  if (!product.images || product.images.length < 2) {
    return null;
  }

  const primaryImageAssetId = getPrimaryImageAssetId(product);
  const secondaryImage = product.images.find(
    (image) =>
      image.assetId?.toString() && image.assetId?.toString() !== primaryImageAssetId,
  );

  return secondaryImage?.assetId?.toString() ?? null;
}

function buildStorefrontProductCard(
  product: CatalogProduct,
  variants: CatalogVariant[],
): StorefrontProductCard {
  const activeVariants = variants.filter((variant) => variant.isActive);
  const defaultVariant =
    activeVariants.find((variant) => variant.isDefault) ?? activeVariants[0] ?? null;
  const availabilitySummary = summarizeProductVariants(activeVariants);

  return {
    id: product.id,
    slug: product.slug,
    productName: product.productName,
    shortDescription: product.shortDescription ?? null,
    categoryId: product.categoryId.toString(),
    categoryName: null,
    categorySlug: null,
    categoryFullSlugPath: null,
    brandId: null,
    brandName: null,
    brandSlug: null,
    price: defaultVariant?.unitPrice ?? 0,
    compareAtPrice: defaultVariant?.compareAtPrice ?? null,
    currencyCode: defaultVariant?.currencyCode ?? "MMK",
    variantCount: activeVariants.length,
    isFeatured: product.isFeatured,
    isNewArrival: product.isNewArrival,
    isBestSeller: product.isBestSeller,
    avgRating: product.avgRating ?? 0,
    reviewCount: product.reviewCount ?? 0,
    soldCount: product.soldCount ?? 0,
    availableQty: availabilitySummary.totalAvailableQty,
    availabilityLabel: availabilitySummary.availabilityLabel,
    hasActiveVariant: availabilitySummary.activeVariantCount > 0,
    hasSellableVariant: availabilitySummary.hasSellableVariant,
    hasInStockVariant: availabilitySummary.hasInStockVariant,
    primaryImageAssetId: getPrimaryImageAssetId(product),
    secondaryImageAssetId: getSecondaryImageAssetId(product),
    badges: [],
    promotionNames: [],
  };
}

export class StorefrontService {
  async listPublicProducts(): Promise<StorefrontProductCard[]> {
    const products = await catalogService.listProducts({
      status: "ACTIVE",
      visibility: "PUBLIC",
    });

    return Promise.all(
      products.map(async (product) => {
        const variants = await catalogService.listVariantsByProduct(product.id);
        return buildStorefrontProductCard(product, variants);
      }),
    );
  }

  async getPublicProductBySlug(slug: string): Promise<StorefrontProductDetail | null> {
    const product = await catalogService.getProductBySlug(slug);

    if (
      !product ||
      product.status !== "ACTIVE" ||
      product.visibility !== "PUBLIC"
    ) {
      return null;
    }

    const variants = await catalogService.listVariantsByProduct(product.id);
    const activeVariants = variants
      .filter((variant) => variant.isActive)
      .map((variant) => toStorefrontVariant(variant))
      .filter(
        (
          variant,
        ): variant is NonNullable<ReturnType<typeof toStorefrontVariant>> =>
          Boolean(variant),
      );
    const defaultVariant =
      activeVariants.find((variant) => variant?.isDefault) ?? activeVariants[0] ?? null;
    const availabilitySummary = summarizeProductVariants(
      variants.filter((variant) => variant.isActive),
    );

    return {
      id: product.id,
      slug: product.slug,
      productName: product.productName,
      shortDescription: product.shortDescription ?? null,
      description: product.description ?? null,
      material: product.material ?? null,
      careInstructions: product.careInstructions ?? null,
      warrantyInfo: product.warrantyInfo ?? null,
      conditionType: product.conditionType ?? "NEW",
      categoryId: product.categoryId.toString(),
      categoryName: null,
      categorySlug: null,
      categoryFullSlugPath: null,
      brandId: null,
      brandName: null,
      brandSlug: null,
      price: defaultVariant?.unitPrice ?? 0,
      compareAtPrice: defaultVariant?.compareAtPrice ?? null,
      currencyCode: defaultVariant?.currencyCode ?? "MMK",
      variantCount: activeVariants.length,
      avgRating: product.avgRating ?? 0,
      reviewCount: product.reviewCount ?? 0,
      soldCount: product.soldCount ?? 0,
      availableQty: availabilitySummary.totalAvailableQty,
      availabilityLabel: availabilitySummary.availabilityLabel,
      hasActiveVariant: availabilitySummary.activeVariantCount > 0,
      hasSellableVariant: availabilitySummary.hasSellableVariant,
      hasInStockVariant: availabilitySummary.hasInStockVariant,
      isFeatured: product.isFeatured,
      isNewArrival: product.isNewArrival,
      isBestSeller: product.isBestSeller,
      primaryImageAssetId: getPrimaryImageAssetId(product),
      secondaryImageAssetId: getSecondaryImageAssetId(product),
      category: null,
      brand: null,
      originCountry: null,
      badges: [],
      promotionNames: [],
      promotions: [],
      imageAssetIds: [
        getPrimaryImageAssetId(product),
        getSecondaryImageAssetId(product),
      ].filter((value): value is string => Boolean(value)),
      optionGroups: [],
      variants: activeVariants,
      specifications: [],
      faqs: [],
      collections: [],
      tags: [],
      relatedProducts: [],
      bundleSuggestions: [],
      shippingMethods: [],
      reviews: [],
      reviewSubmission: null,
    };
  }

  async getCartForUser(userId: string): Promise<StorefrontCartSnapshot> {
    assertObjectId(userId, "user id");
    const cart = await cartService.resolveActiveCart({ customerId: userId });
    return this.buildCartSnapshot(await cartService.getCartSnapshot(cart.id));
  }

  async addToCart(input: { userId: string; variantId: string; quantity: number }) {
    assertObjectId(input.userId, "user id");
    const snapshot = await cartService.addItem({
      customerId: input.userId,
      variantId: input.variantId,
      quantity: input.quantity,
    });
    const result = await this.buildCartSnapshot(snapshot);

    await systemEventsService.recordAnalyticsEvent({
      eventName: "ADD_TO_CART",
      userId: input.userId,
      productId:
        result.items.find((item) => item.variantId === input.variantId)?.productId ?? null,
      variantId: input.variantId,
      source: "storefront:cart",
      metadata: {
        quantity: input.quantity,
        cartId: result.cart.id,
      },
    });

    return result;
  }

  async updateCartItem(input: {
    userId: string;
    variantId: string;
    quantity: number;
  }) {
    assertObjectId(input.userId, "user id");
    const cart = await cartService.resolveActiveCart({ customerId: input.userId });
    const snapshot = await cartService.updateItemQuantity(
      cart.id,
      input.variantId,
      input.quantity,
    );
    return this.buildCartSnapshot(snapshot);
  }

  async removeCartItem(input: { userId: string; variantId: string }) {
    assertObjectId(input.userId, "user id");
    const cart = await cartService.resolveActiveCart({ customerId: input.userId });
    const snapshot = await cartService.removeItem(cart.id, input.variantId);
    return this.buildCartSnapshot(snapshot);
  }

  async listPaymentMethods() {
    await setupService.ensureBaseCommerceSetup();
    return paymentsService.listActivePaymentMethods();
  }

  private async resolveGiftCardPreview(input: {
    code: string;
    currencyCode: string;
    totalAmount: number;
  }): Promise<StorefrontGiftCardPreview> {
    const code = input.code.trim().toUpperCase();

    if (!code) {
      throw new AppError("Gift card code is required.", 400);
    }

    if (input.totalAmount <= 0) {
      throw new AppError("There is no outstanding total to cover with a gift card.", 400);
    }

    await connectToDatabase();

    const giftCard = (await GiftCardModel.findOne({ code })
      .lean()
      .exec()) as
      | {
          _id: unknown;
          code?: string;
          currentBalance?: number;
          currencyCode?: string;
          expiresAt?: Date | null;
          isActive?: boolean;
        }
      | null;

    if (!giftCard || !giftCard.isActive) {
      throw new AppError("Gift card was not found or is inactive.", 404);
    }

    if (giftCard.expiresAt && giftCard.expiresAt.getTime() < Date.now()) {
      throw new AppError("Gift card has expired.", 400);
    }

    const currencyCode = giftCard.currencyCode?.trim().toUpperCase() || input.currencyCode;

    if (currencyCode !== input.currencyCode.trim().toUpperCase()) {
      throw new AppError("Gift card currency does not match this cart.", 400);
    }

    const currentBalance = Number(giftCard.currentBalance ?? 0);

    if (!Number.isFinite(currentBalance) || currentBalance <= 0) {
      throw new AppError("Gift card has no available balance.", 400);
    }

    const appliedAmount = Number(Math.min(currentBalance, input.totalAmount).toFixed(2));

    if (appliedAmount <= 0) {
      throw new AppError("Gift card could not be applied to this cart.", 400);
    }

    return {
      giftCardId: String(giftCard._id),
      code: giftCard.code?.trim().toUpperCase() || code,
      currencyCode,
      appliedAmount,
      remainingBalance: Number((currentBalance - appliedAmount).toFixed(2)),
      totalAfterGiftCard: Number((input.totalAmount - appliedAmount).toFixed(2)),
    };
  }

  async previewGiftCard(input: { userId: string; code: string }) {
    assertObjectId(input.userId, "user id");
    const cart = await cartService.resolveActiveCart({ customerId: input.userId });
    const cartSnapshot = await cartService.getCartSnapshot(cart.id);

    return this.resolveGiftCardPreview({
      code: input.code,
      currencyCode: cartSnapshot.cart.currencyCode,
      totalAmount: cartSnapshot.cart.grandTotal,
    });
  }

  async checkout(
    user: SessionUser,
    input: {
      receiverName: string;
      receiverPhone: string;
      countryId?: string;
      stateRegionId?: string;
      city?: string;
      township?: string;
      postalCode?: string;
      addressLine1: string;
      addressLine2?: string;
      landmark?: string;
      note?: string;
      shippingMethodId?: string;
      paymentMethodId?: string;
      giftCardCode?: string;
    },
  ) {
    const defaults = await setupService.ensureBaseCommerceSetup();
    const cart = await cartService.resolveActiveCart({ customerId: user.id });
    const cartSnapshot = await cartService.getCartSnapshot(cart.id);

    if (cartSnapshot.items.length === 0) {
      throw new AppError("Your cart is empty.", 400);
    }

    const resolvedCountryId = input.countryId?.trim() || defaults.countryId;
    const countries = await coreService.listCountries();
    const countryExists = countries.some((country) => country.id === resolvedCountryId);

    if (!countryExists) {
      throw new AppError("Selected country was not found.", 404);
    }

    if (input.stateRegionId) {
      const stateRegions = await coreService.listStateRegions(resolvedCountryId);
      const stateRegionExists = stateRegions.some(
        (stateRegion) => stateRegion.id === input.stateRegionId,
      );

      if (!stateRegionExists) {
        throw new AppError(
          "Selected state / region does not belong to the chosen country.",
          400,
        );
      }
    }

    const address = await customersService.createAddress({
      userId: user.id,
      label: "Checkout",
      receiverName: input.receiverName,
      receiverPhone: input.receiverPhone,
      countryId: resolvedCountryId,
      stateRegionId: input.stateRegionId,
      city: input.city,
      township: input.township,
      postalCode: input.postalCode,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2,
      landmark: input.landmark,
      isDefaultShipping: false,
      isDefaultBilling: false,
    });

    const giftCardPreview = input.giftCardCode
      ? await this.resolveGiftCardPreview({
          code: input.giftCardCode,
          currencyCode: cartSnapshot.cart.currencyCode,
          totalAmount: cartSnapshot.cart.grandTotal,
        })
      : null;

    await systemEventsService.recordAnalyticsEvent({
      eventName: "CHECKOUT_START",
      userId: user.id,
      source: "storefront:checkout",
      metadata: {
        cartId: cart.id,
        itemCount: cartSnapshot.items.length,
        paymentMethodId: input.paymentMethodId ?? null,
        shippingMethodId: input.shippingMethodId ?? null,
      },
    });

    const orderBundle = await ordersService.placeOrderFromCart({
      cartId: cart.id,
      customerId: user.id,
      shippingAddressId: address.id,
      billingAddressId: address.id,
      shippingMethodId: input.shippingMethodId,
      note: input.note,
      customerNameSnapshot: input.receiverName || user.fullName,
      customerEmailSnapshot: user.email ?? undefined,
      customerPhoneSnapshot: input.receiverPhone,
      giftCardCode: giftCardPreview?.code,
      giftCardTotal: giftCardPreview?.appliedAmount ?? 0,
    });

    if (giftCardPreview) {
      await GiftCardModel.findByIdAndUpdate(giftCardPreview.giftCardId, {
        currentBalance: giftCardPreview.remainingBalance,
      }).exec();
      await GiftCardTransactionModel.create({
        giftCardId: giftCardPreview.giftCardId,
        orderId: orderBundle.order.id,
        amount: giftCardPreview.appliedAmount,
        transactionType: "REDEEM",
        createdAt: new Date(),
      });
    }

    const paymentMethods = await paymentsService.listActivePaymentMethods();
    const paymentMethod =
      paymentMethods.find((method) => method.id === input.paymentMethodId) ??
      paymentMethods.find((method) => method.code === "COD") ??
      paymentMethods[0];

    if (!paymentMethod) {
      throw new AppError("No active payment method is available.", 500);
    }

    const payment = await paymentsService.submitPayment({
      orderId: orderBundle.order.id,
      paymentMethodId: paymentMethod.id,
      amount: orderBundle.order.grandTotal,
      currencyCode: orderBundle.order.currencyCode,
      transactionRef:
        paymentMethod.code === "COD" ? `COD-${Date.now()}` : undefined,
    });

    let confirmedPayment = payment;

    if (paymentMethod.code === "COD" || orderBundle.order.grandTotal <= 0) {
      confirmedPayment =
        (await paymentsService.confirmPayment({
          paymentId: payment.id,
        })) ?? payment;
    }

    const invoice = await ordersService.issueInvoice(orderBundle.order.id);

    return {
      order: {
        id: orderBundle.order.id,
        orderNo: orderBundle.order.orderNo,
        currencyCode: orderBundle.order.currencyCode,
        grandTotal: orderBundle.order.grandTotal,
        giftCardTotal: orderBundle.order.giftCardTotal ?? 0,
      },
      items: orderBundle.items.map((item) => ({
        id: item.id,
        orderId: item.orderId?.toString?.() ?? String(item.orderId ?? ""),
        productId: item.productId?.toString?.() ?? String(item.productId ?? ""),
        variantId: item.variantId?.toString?.() ?? String(item.variantId ?? ""),
        productNameSnapshot: item.productNameSnapshot,
        productSlugSnapshot: item.productSlugSnapshot,
        skuSnapshot: item.skuSnapshot,
        variantLabelSnapshot: item.variantLabelSnapshot,
        thumbnailUrlSnapshot: item.thumbnailUrlSnapshot,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: item.discountAmount,
        taxAmount: item.taxAmount,
        lineTotal: item.lineTotal,
      })),
      payment: {
        id: confirmedPayment.id,
        orderId: confirmedPayment.orderId.toString(),
        paymentMethodId: confirmedPayment.paymentMethodId.toString(),
        amount: confirmedPayment.amount,
        currencyCode: confirmedPayment.currencyCode,
        transactionRef: confirmedPayment.transactionRef,
        status: confirmedPayment.status,
        paymentDate: confirmedPayment.paymentDate,
        confirmedAt: confirmedPayment.confirmedAt,
      },
      invoice: {
        id: invoice.id,
        orderId: invoice.orderId.toString(),
        invoiceNo: invoice.invoiceNo,
        status: invoice.status,
        issuedAt: invoice.issuedAt,
        grandTotal: invoice.grandTotal,
      },
      address: {
        id: address.id,
        receiverName: address.receiverName,
        receiverPhone: address.receiverPhone,
        countryId: address.countryId.toString(),
        stateRegionId: address.stateRegionId?.toString() ?? null,
        city: address.city ?? null,
        township: address.township ?? null,
        postalCode: address.postalCode ?? null,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2 ?? null,
        landmark: address.landmark ?? null,
      },
      giftCard: giftCardPreview,
    };
  }

  private async buildCartSnapshot(
    snapshot: Awaited<ReturnType<typeof cartService.getCartSnapshot>>,
  ): Promise<StorefrontCartSnapshot> {
    const items: StorefrontCartSnapshot["items"] = await Promise.all(
      snapshot.items.map(async (item) => {
        const [product, variant] = await Promise.all([
          catalogService.getProductById(item.productId.toString()),
          catalogService.getVariantById(item.variantId.toString()),
        ]);

        if (!product || !variant) {
          throw new AppError("Cart item source data is missing.", 404);
        }

        const availabilityState = getVariantAvailabilityState(variant);

        return {
          id: item.id,
          productId: product.id,
          productName: product.productName,
          productSlug: product.slug,
          variantId: variant.id,
          variantName: variant.variantName ?? null,
          sku: variant.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
          currencyCode: variant.currencyCode,
          availableQty: variant.availableQty,
          availabilityLabel: availabilityState.label,
          trackInventory: variant.trackInventory !== false,
          isPurchasable: availabilityState.isSellable,
          primaryImageAssetId: getPrimaryImageAssetId(product),
        };
      }),
    );

    return {
      cart: {
        id: snapshot.cart.id,
        currencyCode: snapshot.cart.currencyCode,
        status: snapshot.cart.status,
        subtotal: snapshot.cart.subtotal,
        discountTotal: snapshot.cart.discountTotal,
        shippingFee: snapshot.cart.shippingFee,
        taxTotal: snapshot.cart.taxTotal,
        grandTotal: snapshot.cart.grandTotal,
      },
      items,
    };
  }

  async listFeaturedProducts(limit: number = 6): Promise<StorefrontProductCard[]> {
    const products = await catalogService.listProducts({
      status: "ACTIVE",
      visibility: "PUBLIC",
    });

    const featured = products.filter((p) => p.isFeatured).slice(0, limit);

    const items = await Promise.all(
      featured.map(async (product) => {
        const variants = await catalogService.listVariantsByProduct(product.id);
        return buildStorefrontProductCard(product, variants);
      }),
    );

    return items.slice(0, limit);
  }

  async listNewArrivals(limit: number = 6): Promise<StorefrontProductCard[]> {
    const products = await catalogService.listProducts({
      status: "ACTIVE",
      visibility: "PUBLIC",
    });

    const newArrivals = products
      .filter((p) => p.isNewArrival)
      .slice(0, limit);

    const items = await Promise.all(
      newArrivals.map(async (product) => {
        const variants = await catalogService.listVariantsByProduct(product.id);
        return buildStorefrontProductCard(product, variants);
      }),
    );

    return items.slice(0, limit);
  }

  async listPublicCategories(): Promise<StorefrontCategory[]> {
    const categories = await catalogService.listCategories();
    return categories
      .filter((cat) => cat.isActive)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((cat) => ({
        id: cat.id,
        categoryName: cat.categoryName,
        slug: cat.slug,
        fullSlugPath: cat.fullSlugPath ?? cat.slug,
        depth: cat.depth ?? 0,
        parentCategoryId: cat.parentCategoryId?.toString() ?? null,
        description: cat.description ?? null,
        imageAssetId: cat.imageAssetId?.toString() ?? null,
        productCount: 0,
      }));
  }

  async listActiveBanners(): Promise<StorefrontBanner[]> {
    const now = new Date();
    const banners = (await contentRepositories.banners.list()) as unknown as Array<{
      id: string;
      bannerName: string;
      bannerType: "HERO" | "PROMO" | "CATEGORY";
      title?: string | null;
      subtitle?: string | null;
      linkUrl?: string | null;
      assetId?: { toString(): string } | string | null;
      isActive?: boolean;
      startsAt?: Date | string | null;
      endsAt?: Date | string | null;
      sortOrder?: number | null;
    }>;
    return banners
      .filter((banner) => {
        if (!banner.isActive) return false;
        if (banner.startsAt && new Date(banner.startsAt) > now) return false;
        if (banner.endsAt && new Date(banner.endsAt) < now) return false;
        return true;
      })
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((banner) => ({
        id: banner.id,
        bannerName: banner.bannerName,
        bannerType: banner.bannerType,
        title: banner.title ?? null,
        subtitle: banner.subtitle ?? null,
        linkUrl: banner.linkUrl ?? null,
        assetId: (banner.assetId as { toString(): string } | string | null)?.toString() ?? null,
      }));
  }

  async listBestSellers(limit: number = 6): Promise<StorefrontProductCard[]> {
    const products = await catalogService.listProducts({
      status: "ACTIVE",
      visibility: "PUBLIC",
    });

    const bestSellers = products
      .filter((p) => p.isBestSeller)
      .slice(0, limit);

    const items = await Promise.all(
      bestSellers.map(async (product) => {
        const variants = await catalogService.listVariantsByProduct(product.id);
        return buildStorefrontProductCard(product, variants);
      }),
    );

    return items.slice(0, limit);
  }

  async listPublicCollections(): Promise<
    Array<StorefrontCollection & { productCount: number }>
  > {
    const now = new Date();
    const collections = (await CollectionModel.find({}).exec()) as unknown as Array<{
      id: string;
      collectionName: string;
      slug: string;
      description?: string | null;
      isActive?: boolean;
      startsAt?: Date | string | null;
      endsAt?: Date | string | null;
      sortOrder?: number | null;
    }>;
    
    const active = collections.filter((col) => {
      if (!col.isActive) return false;
      if (col.startsAt && new Date(col.startsAt) > now) return false;
      if (col.endsAt && new Date(col.endsAt) < now) return false;
      return true;
    });

    const withCounts = await Promise.all(
      active.map(async (col) => {
        const products = await catalogService.listProducts({
          status: "ACTIVE",
          visibility: "PUBLIC",
        });
        const count = products.filter((p) =>
          p.collectionIds?.some((collectionId) => String(collectionId) === col.id),
        ).length;

        return {
          id: col.id,
          collectionName: col.collectionName,
          slug: col.slug,
          description: col.description ?? null,
          isActive: Boolean(col.isActive),
          productCount: count,
          sortOrder: col.sortOrder ?? 0,
        };
      }),
    );

    return withCounts
      .filter((col) => col.productCount > 0)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async listPublicBrands(): Promise<StorefrontBrand[]> {
    const brands = await catalogService.listBrands();
    return brands
      .filter((b) => b.isActive)
      .map((b) => ({
        id: b.id,
        brandName: b.brandName,
        slug: b.slug,
        description: b.description ?? null,
      }));
  }

  async listActivePromotions(): Promise<StorefrontPromotion[]> {
    const now = new Date();
    const promotions = (await pricingRepositories.promotions.list()) as unknown as Array<{
      id: string;
      name: string;
      description?: string | null;
      promotionType: "COUPON" | "FLASH_SALE" | "AUTO_DISCOUNT" | "FREE_SHIPPING";
      discountType?: "PERCENT" | "AMOUNT";
      discountValue?: number;
      isActive?: boolean;
      startsAt?: Date | string | null;
      endsAt?: Date | string | null;
    }>;
    
    return promotions
      .filter((promo) => {
        if (!promo.isActive) return false;
        if (promo.startsAt && new Date(promo.startsAt) > now) return false;
        if (promo.endsAt && new Date(promo.endsAt) < now) return false;
        return true;
      })
      .map((promo) => ({
        id: promo.id,
        name: promo.name,
        description: promo.description ?? null,
        promotionType: promo.promotionType,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
      }));
  }

  async getNavigationMenuBySlug(slug: string): Promise<StorefrontNavigationMenu | null> {
    const menus = (await contentRepositories.navigationMenus.list()) as unknown as Array<{
      id: string;
      menuName: string;
    }>;
    const menu = menus.find((m) => m.menuName.toLowerCase() === slug.toLowerCase());

    if (!menu) {
      return null;
    }

    const items = (await contentRepositories.navigationMenuItems.list()) as unknown as Array<{
      id: string;
      navigationMenuId?: { toString(): string } | string | null;
      label: string;
      linkType: "URL" | "CATEGORY" | "COLLECTION" | "PAGE" | "PRODUCT";
      linkValue: string;
      sortOrder?: number | null;
      isActive?: boolean;
    }>;
    const menuItems = items
      .filter((item) => item.navigationMenuId?.toString() === menu.id && item.isActive)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const categoryIds = menuItems
      .filter(
        (item): item is typeof item & { linkValue: string } =>
          item.linkType === "CATEGORY" && Types.ObjectId.isValid(item.linkValue),
      )
      .map((item) => item.linkValue);
    const categories =
      categoryIds.length > 0
        ? await CategoryModel.find({ _id: { $in: categoryIds } })
            .select("slug fullSlugPath")
            .lean()
            .exec()
        : [];
    const categoryMap = new Map(
      categories.map((category) => [
        category._id.toString(),
        category.fullSlugPath ?? category.slug ?? "",
      ]),
    );

    return {
      id: menu.id,
      menuName: menu.menuName,
      items: menuItems.map((item) => {
        let url: string | null = null;
        
        if (item.linkType === "URL") {
          url = item.linkValue;
        } else if (item.linkType === "CATEGORY") {
          const categoryPath = categoryMap.get(item.linkValue);
          url = categoryPath ? `/shop?category=${categoryPath}` : null;
        } else if (item.linkType === "COLLECTION") {
          url = `/shop?collection=${item.linkValue}`;
        } else if (item.linkType === "PAGE") {
          url = `/pages/${item.linkValue}`;
        } else if (item.linkType === "PRODUCT") {
          url = `/shop/${item.linkValue}`;
        }

        return {
          id: item.id,
          label: item.label,
          url,
        };
      }),
    };
  }
}

export const storefrontService = new StorefrontService();
