export const STOREFRONT_PRODUCT_PLACEHOLDER_SRC =
  "/placeholders/store-product.png";

export const STOREFRONT_CATEGORY_PLACEHOLDER_SRC =
  "/placeholders/store-category.svg";

export const STOREFRONT_BANNER_PLACEHOLDER_SRC =
  "/placeholders/store-banner.svg";

export function storefrontPlaceholderForLabel(label?: string | null) {
  const normalized = label?.toLowerCase().trim() ?? "";

  if (
    normalized.includes("hero") ||
    normalized.includes("banner") ||
    normalized.includes("promotion")
  ) {
    return STOREFRONT_BANNER_PLACEHOLDER_SRC;
  }

  if (normalized.includes("category")) {
    return STOREFRONT_CATEGORY_PLACEHOLDER_SRC;
  }

  return STOREFRONT_PRODUCT_PLACEHOLDER_SRC;
}

export function storefrontAssetUrl(
  assetId: string | null | undefined,
  fallbackSrc = STOREFRONT_PRODUCT_PLACEHOLDER_SRC,
) {
  if (!assetId) {
    return fallbackSrc;
  }

  return `/api/assets/${assetId}?fallback=${fallbackSrc}`;
}
