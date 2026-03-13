export type StorefrontLink = {
  id: string;
  label: string;
  url: string | null;
  children: StorefrontLink[];
};

export type StorefrontSessionUser = {
  id: string;
  fullName: string;
  email: string | null;
  role: string;
};

export type StorefrontCartSnapshot = {
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

export type StorefrontGiftCardPreview = {
  giftCardId: string;
  code: string;
  currencyCode: string;
  appliedAmount: number;
  remainingBalance: number;
  totalAfterGiftCard: number;
};

export type StorefrontCategory = {
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

export type StorefrontBrand = {
  id: string;
  brandName: string;
  slug: string;
  description: string | null;
  logoAssetId: string | null;
  originCountryId: string | null;
  productCount: number;
};

export type StorefrontCollection = {
  id: string;
  collectionName: string;
  slug: string;
  description: string | null;
  bannerAssetId: string | null;
  productCount: number;
};

export type StorefrontPromotion = {
  id: string;
  name: string;
  description: string | null;
  promotionType: "COUPON" | "FLASH_SALE" | "AUTO_DISCOUNT" | "FREE_SHIPPING";
  discountType: "PERCENT" | "AMOUNT" | null;
  discountValue: number | null;
  heroAssetId: string | null;
  linkedProductCount: number;
};

export type StorefrontPageLink = {
  id: string;
  title: string;
  slug: string;
};

export type StorefrontBanner = {
  id: string;
  bannerName: string;
  bannerType: "HERO" | "PROMO" | "CATEGORY";
  title: string | null;
  subtitle: string | null;
  linkUrl: string | null;
  assetId: string | null;
};

export type StorefrontShellData = {
  store: {
    storeName: string;
    storeEmail: string | null;
    storePhone: string | null;
    supportEmail: string | null;
    supportPhone: string | null;
    currencyCode: string;
    logoAssetId: string | null;
  };
  user: StorefrontSessionUser | null;
  cartSnapshot: StorefrontCartSnapshot | null;
  wishlistCount: number;
  headerLinks: StorefrontLink[];
  footerLinks: StorefrontLink[];
  categoryStrip: StorefrontCategory[];
  pageLinks: StorefrontPageLink[];
};

export type StorefrontProductBadge = {
  id: string;
  label: string;
  colorCode: string | null;
};

export type StorefrontProductCard = {
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
  badges: StorefrontProductBadge[];
  promotionNames: string[];
};

export type StorefrontFilterOption = {
  id: string;
  label: string;
  slug: string;
  count: number;
};

export type StorefrontOptionFilterValue = {
  id: string;
  label: string;
  swatchHex: string | null;
  count: number;
};

export type StorefrontOptionFilterGroup = {
  id: string;
  label: string;
  displayType: "TEXT" | "COLOR_SWATCH" | "BUTTON";
  values: StorefrontOptionFilterValue[];
};

export type StorefrontConfiguredFilterValue = {
  id: string;
  label: string;
  slug: string;
  count: number;
  swatchHex?: string | null;
};

export type StorefrontConfiguredFilterGroup = {
  key: string;
  label: string;
  filterSource: "BRAND" | "PRICE" | "OPTION_TYPE" | "SPECIFICATION";
  displayType: "CHECKBOX" | "RADIO" | "RANGE" | "COLOR_SWATCH";
  values: StorefrontConfiguredFilterValue[];
};

export type StorefrontSearchInput = {
  page: number;
  pageSize: number;
  query: string;
  sort:
    | "featured"
    | "relevance"
    | "newest"
    | "price_asc"
    | "price_desc"
    | "best_selling"
    | "rating_desc";
  categorySlugs: string[];
  brandSlugs: string[];
  collectionSlugs: string[];
  tagSlugs: string[];
  promotionIds: string[];
  originCountryCodes: string[];
  optionValueIds: string[];
  specFilters: string[];
  condition: string | null;
  stock: "all" | "in_stock";
  onSaleOnly: boolean;
  minRating: number | null;
  minPrice: number | null;
  maxPrice: number | null;
};

export type StorefrontActiveFilterChip = {
  key: string;
  label: string;
  href: string;
};

export type StorefrontProductListing = {
  title: string;
  description: string | null;
  query: StorefrontSearchInput;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  items: StorefrontProductCard[];
  facets: {
    categories: StorefrontFilterOption[];
    brands: StorefrontFilterOption[];
    collections: StorefrontFilterOption[];
    tags: StorefrontFilterOption[];
    promotions: StorefrontFilterOption[];
    countries: StorefrontFilterOption[];
    optionGroups: StorefrontOptionFilterGroup[];
    configuredFilters: StorefrontConfiguredFilterGroup[];
    showBrandFilter: boolean;
    showPriceFilter: boolean;
    minPrice: number;
    maxPrice: number;
  };
  activeFilters: StorefrontActiveFilterChip[];
};

export type StorefrontProductOptionValue = {
  id: string;
  label: string;
  valueCode: string | null;
  swatchHex: string | null;
};

export type StorefrontProductOptionGroup = {
  id: string;
  name: string;
  displayType: "TEXT" | "COLOR_SWATCH" | "BUTTON";
  values: StorefrontProductOptionValue[];
};

export type StorefrontProductVariant = {
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
};

export type StorefrontProductDetail = {
  id: string;
  slug: string;
  productName: string;
  shortDescription: string | null;
  description: string | null;
  material: string | null;
  careInstructions: string | null;
  warrantyInfo: string | null;
  conditionType: "NEW" | "REFURBISHED";
  price: number;
  compareAtPrice: number | null;
  currencyCode: string;
  avgRating: number;
  reviewCount: number;
  soldCount: number;
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  availabilityLabel: string;
  hasActiveVariant: boolean;
  hasSellableVariant: boolean;
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
  badges: StorefrontProductBadge[];
  promotions: Array<{
    id: string;
    name: string;
    discountType: "PERCENT" | "AMOUNT" | null;
    discountValue: number | null;
  }>;
  imageAssetIds: string[];
  optionGroups: StorefrontProductOptionGroup[];
  variants: StorefrontProductVariant[];
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
  bundleProducts: StorefrontProductCard[];
};

export type StorefrontHomeProductSection = {
  id: string;
  title: string;
  href: string;
  items: StorefrontProductCard[];
};

export type StorefrontHomePageData = {
  heroBanner: StorefrontBanner | null;
  sideBanners: StorefrontBanner[];
  utilityPromotions: StorefrontPromotion[];
  categories: StorefrontCategory[];
  collections: StorefrontCollection[];
  brands: StorefrontBrand[];
  productSections: StorefrontHomeProductSection[];
  recentlyViewed: StorefrontProductCard[];
};

export type StorefrontWishlistItem = StorefrontProductCard;

export type StorefrontShippingMethod = {
  id: string;
  methodName: string;
  code: string;
  description: string | null;
  baseFee: number;
  freeShippingMinAmount: number | null;
  estimatedMinDays: number | null;
  estimatedMaxDays: number | null;
};

export type StorefrontAccountOverview = {
  profile: {
    fullName: string;
    email: string | null;
    phone: string | null;
    joinedAt: Date | null;
  };
  totals: {
    totalOrders: number;
    totalSpent: number;
    loyaltyPoints: number;
    savedAddresses: number;
    wishlistItems: number;
  };
  recentOrders: Array<{
    id: string;
    orderNo: string;
    orderDate: Date | null;
    status: string;
    paymentStatus: string;
    fulfillmentStatus: string;
    grandTotal: number;
    currencyCode: string;
  }>;
};

export type StorefrontAccountOrderSummary = {
  id: string;
  orderNo: string;
  orderDate: Date | null;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  grandTotal: number;
  currencyCode: string;
  itemCount: number;
};

export type StorefrontAccountOrderDetail = StorefrontAccountOrderSummary & {
  subtotal: number;
  shippingFee: number;
  taxTotal: number;
  giftCardTotal: number;
  note: string | null;
  shippingAddress: {
    receiverName: string | null;
    receiverPhone: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    township: string | null;
    postalCode: string | null;
    countryName: string | null;
    stateRegionName: string | null;
  } | null;
  items: Array<{
    id: string;
    productName: string;
    productSlug: string | null;
    variantLabel: string | null;
    sku: string | null;
    thumbnailAssetId: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  payments: Array<{
    id: string;
    methodName: string;
    status: string;
    amount: number;
    paymentDate: Date | null;
  }>;
  shipments: Array<{
    id: string;
    status: string;
    courierName: string | null;
    trackingNo: string | null;
    shippedAt: Date | null;
    deliveredAt: Date | null;
  }>;
};

export type StorefrontAccountAddress = {
  id: string;
  label: string | null;
  receiverName: string;
  receiverPhone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string | null;
  township: string | null;
  postalCode: string | null;
  landmark: string | null;
  countryId: string;
  countryName: string | null;
  stateRegionId: string | null;
  stateRegionName: string | null;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
};
