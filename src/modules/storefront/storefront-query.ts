import type { StorefrontSearchInput } from "@/modules/storefront/storefront.types";

export type StorefrontSearchParams = Record<
  string,
  string | string[] | undefined
>;

const SORT_OPTIONS = new Set<
  StorefrontSearchInput["sort"]
>([
  "featured",
  "relevance",
  "newest",
  "price_asc",
  "price_desc",
  "best_selling",
  "rating_desc",
]);

function readString(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function readList(value: string | string[] | undefined) {
  const parts = Array.isArray(value) ? value : value ? [value] : [];

  return parts
    .flatMap((part) => part.split(","))
    .map((part) => part.trim())
    .filter(Boolean);
}

function readPositiveNumber(
  value: string | string[] | undefined,
  fallback: number,
) {
  const parsed = Number(readString(value));

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

function readNullableMoney(value: string | string[] | undefined) {
  const raw = readString(value).trim();

  if (!raw) {
    return null;
  }

  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function readNullableRating(value: string | string[] | undefined) {
  const parsed = Number(readString(value));

  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 5) {
    return null;
  }

  return parsed;
}

export function parseStorefrontSearchParams(
  params: StorefrontSearchParams,
): StorefrontSearchInput {
  const query = readString(params.q).trim();
  const requestedSort = readString(params.sort) as StorefrontSearchInput["sort"];
  const sort = SORT_OPTIONS.has(requestedSort)
    ? requestedSort
    : query
      ? "relevance"
      : "featured";

  return {
    page: readPositiveNumber(params.page, 1),
    pageSize: 20,
    query,
    sort,
    categorySlugs: readList(params.category),
    brandSlugs: readList(params.brand),
    collectionSlugs: readList(params.collection),
    tagSlugs: readList(params.tag),
    promotionIds: readList(params.promotion),
    originCountryCodes: readList(params.country),
    optionValueIds: readList(params.option),
    specFilters: readList(params.spec),
    condition: (() => {
      const value = readString(params.condition).trim().toUpperCase();

      return value === "NEW" || value === "REFURBISHED" ? value : null;
    })(),
    stock: readString(params.stock) === "in_stock" ? "in_stock" : "all",
    onSaleOnly: readString(params.sale) === "1",
    minRating: readNullableRating(params.rating),
    minPrice: readNullableMoney(params.minPrice),
    maxPrice: readNullableMoney(params.maxPrice),
  };
}

export function buildStorefrontSearchHref(
  query: StorefrontSearchInput,
  overrides?: Partial<StorefrontSearchInput>,
) {
  const next = {
    ...query,
    ...overrides,
  };
  const searchParams = new URLSearchParams();

  if (next.query) {
    searchParams.set("q", next.query);
  }

  if (next.sort !== (next.query ? "relevance" : "featured")) {
    searchParams.set("sort", next.sort);
  }

  if (next.page > 1) {
    searchParams.set("page", String(next.page));
  }

  if (next.minPrice !== null) {
    searchParams.set("minPrice", String(next.minPrice));
  }

  if (next.maxPrice !== null) {
    searchParams.set("maxPrice", String(next.maxPrice));
  }

  if (next.minRating !== null) {
    searchParams.set("rating", String(next.minRating));
  }

  if (next.condition) {
    searchParams.set("condition", next.condition);
  }

  if (next.stock === "in_stock") {
    searchParams.set("stock", "in_stock");
  }

  if (next.onSaleOnly) {
    searchParams.set("sale", "1");
  }

  for (const category of next.categorySlugs) {
    searchParams.append("category", category);
  }

  for (const brand of next.brandSlugs) {
    searchParams.append("brand", brand);
  }

  for (const collection of next.collectionSlugs) {
    searchParams.append("collection", collection);
  }

  for (const tag of next.tagSlugs) {
    searchParams.append("tag", tag);
  }

  for (const promotionId of next.promotionIds) {
    searchParams.append("promotion", promotionId);
  }

  for (const country of next.originCountryCodes) {
    searchParams.append("country", country);
  }

  for (const optionValueId of next.optionValueIds) {
    searchParams.append("option", optionValueId);
  }

  for (const specFilter of next.specFilters) {
    searchParams.append("spec", specFilter);
  }

  const queryString = searchParams.toString();

  return queryString ? `/shop?${queryString}` : "/shop";
}
