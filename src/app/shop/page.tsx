import type { ReactNode } from "react";
import Link from "next/link";

import { ProductCard } from "@/components/store/product-card";
import { StorefrontBreadcrumbs } from "@/components/store/storefront-breadcrumbs";
import { StorefrontFilterDrawer } from "@/components/store/storefront-filter-drawer";
import { StorefrontPagination } from "@/components/store/storefront-pagination";
import { StorefrontShell } from "@/components/store/storefront-shell";
import { buttonClassName } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";
import {
  buildStorefrontSearchHref,
  parseStorefrontSearchParams,
  type StorefrontSearchParams,
} from "@/modules/storefront/storefront-query";
import { storefrontCatalogService } from "@/modules/storefront/storefront-catalog.service";
import type { StorefrontSearchInput } from "@/modules/storefront/storefront.types";
import { authService } from "@/modules/users/auth.service";

type ShopPageProps = {
  searchParams: Promise<StorefrontSearchParams>;
};

function withListValue(list: string[], value: string) {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

function hiddenQueryInputs(
  query: StorefrontSearchInput,
  exclude: Array<
    | "sort"
    | "page"
    | "minPrice"
    | "maxPrice"
    | "category"
    | "brand"
    | "collection"
    | "tag"
    | "promotion"
    | "country"
    | "option"
    | "spec"
    | "condition"
    | "stock"
    | "sale"
    | "rating"
  > = [],
) {
  const inputs: Array<{ key: string; value: string; id: string }> = [];
  const omit = new Set(exclude);

  if (query.query) {
    inputs.push({ key: "q", value: query.query, id: `q-${query.query}` });
  }

  if (!omit.has("sort") && query.sort !== (query.query ? "relevance" : "featured")) {
    inputs.push({ key: "sort", value: query.sort, id: `sort-${query.sort}` });
  }

  if (!omit.has("page") && query.page > 1) {
    inputs.push({ key: "page", value: String(query.page), id: `page-${query.page}` });
  }

  if (!omit.has("minPrice") && query.minPrice !== null) {
    inputs.push({
      key: "minPrice",
      value: String(query.minPrice),
      id: `minPrice-${query.minPrice}`,
    });
  }

  if (!omit.has("maxPrice") && query.maxPrice !== null) {
    inputs.push({
      key: "maxPrice",
      value: String(query.maxPrice),
      id: `maxPrice-${query.maxPrice}`,
    });
  }

  if (!omit.has("rating") && query.minRating !== null) {
    inputs.push({
      key: "rating",
      value: String(query.minRating),
      id: `rating-${query.minRating}`,
    });
  }

  if (!omit.has("condition") && query.condition) {
    inputs.push({
      key: "condition",
      value: query.condition,
      id: `condition-${query.condition}`,
    });
  }

  if (!omit.has("stock") && query.stock === "in_stock") {
    inputs.push({ key: "stock", value: "in_stock", id: "stock-in_stock" });
  }

  if (!omit.has("sale") && query.onSaleOnly) {
    inputs.push({ key: "sale", value: "1", id: "sale-1" });
  }

  if (!omit.has("category")) {
    for (const value of query.categorySlugs) {
      inputs.push({ key: "category", value, id: `category-${value}` });
    }
  }

  if (!omit.has("brand")) {
    for (const value of query.brandSlugs) {
      inputs.push({ key: "brand", value, id: `brand-${value}` });
    }
  }

  if (!omit.has("collection")) {
    for (const value of query.collectionSlugs) {
      inputs.push({ key: "collection", value, id: `collection-${value}` });
    }
  }

  if (!omit.has("tag")) {
    for (const value of query.tagSlugs) {
      inputs.push({ key: "tag", value, id: `tag-${value}` });
    }
  }

  if (!omit.has("promotion")) {
    for (const value of query.promotionIds) {
      inputs.push({ key: "promotion", value, id: `promotion-${value}` });
    }
  }

  if (!omit.has("country")) {
    for (const value of query.originCountryCodes) {
      inputs.push({ key: "country", value, id: `country-${value}` });
    }
  }

  if (!omit.has("option")) {
    for (const value of query.optionValueIds) {
      inputs.push({ key: "option", value, id: `option-${value}` });
    }
  }

  if (!omit.has("spec")) {
    for (const value of query.specFilters) {
      inputs.push({ key: "spec", value, id: `spec-${value}` });
    }
  }

  return inputs.map((input) => (
    <input key={input.id} name={input.key} type="hidden" value={input.value} />
  ));
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <details
      className="rounded-[1.4rem] border border-border bg-surface p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)]"
      open
    >
      <summary className="cursor-pointer list-none text-sm font-bold text-text">
        {title}
      </summary>
      <div className="mt-4 space-y-2">{children}</div>
    </details>
  );
}

function FilterLink({
  href,
  label,
  count,
  selected = false,
  swatchHex,
}: {
  href: string;
  label: string;
  count?: number;
  selected?: boolean;
  swatchHex?: string | null;
}) {
  return (
    <Link
      className={`flex min-h-10 items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm transition ${selected ? "border-primary bg-primary !text-white hover:!text-white" : "border-border bg-surface text-text-muted hover:bg-surface-alt hover:text-text"}`}
      href={href}
    >
      <span className="inline-flex items-center gap-2">
        {swatchHex ? (
          <span
            className="inline-flex h-4 w-4 rounded-full border border-black/10"
            style={{ backgroundColor: swatchHex }}
          />
        ) : null}
        <span>{label}</span>
      </span>
      {typeof count === "number" ? (
        <span className={`text-xs ${selected ? "text-white/75" : "text-text-muted/70"}`}>
          {count}
        </span>
      ) : null}
    </Link>
  );
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const resolvedSearchParams = await searchParams;
  const query = parseStorefrontSearchParams(resolvedSearchParams);
  const session = await getSession();
  const sessionUser = session ? await authService.getSessionUser(session.id) : null;
  const user =
    sessionUser && sessionUser.isActive
      ? {
          id: sessionUser.id,
          fullName: sessionUser.fullName,
          email: sessionUser.email,
          role: sessionUser.role,
        }
      : null;
  const listing = await storefrontCatalogService.searchCatalog(query);
  const currentHref = buildStorefrontSearchHref(listing.query);
  const clearFiltersHref = buildStorefrontSearchHref(listing.query, {
    page: 1,
    categorySlugs: [],
    brandSlugs: [],
    collectionSlugs: [],
    tagSlugs: [],
    promotionIds: [],
    originCountryCodes: [],
    optionValueIds: [],
    specFilters: [],
    condition: null,
    stock: "all",
    onSaleOnly: false,
    minRating: null,
    minPrice: null,
    maxPrice: null,
  });
  const hasFilters = listing.activeFilters.length > 0;
  const firstResult = listing.total === 0 ? 0 : (listing.page - 1) * listing.pageSize + 1;
  const lastResult = Math.min(listing.page * listing.pageSize, listing.total);
  const filterSidebar = (
    <div className="space-y-3">
      <FilterGroup title="Availability">
        <FilterLink
          href={buildStorefrontSearchHref(listing.query, {
            page: 1,
            stock: listing.query.stock === "in_stock" ? "all" : "in_stock",
          })}
          label="In stock"
          selected={listing.query.stock === "in_stock"}
        />
        <FilterLink
          href={buildStorefrontSearchHref(listing.query, {
            page: 1,
            onSaleOnly: !listing.query.onSaleOnly,
          })}
          label="On sale"
          selected={listing.query.onSaleOnly}
        />
      </FilterGroup>

      {listing.facets.categories.length > 0 ? (
        <FilterGroup title="Categories">
          {listing.facets.categories.slice(0, 10).map((option) => (
            <FilterLink
              key={option.id}
              count={option.count}
              href={buildStorefrontSearchHref(listing.query, {
                page: 1,
                categorySlugs: withListValue(listing.query.categorySlugs, option.slug),
              })}
              label={option.label}
              selected={listing.query.categorySlugs.includes(option.slug)}
            />
          ))}
        </FilterGroup>
      ) : null}

      {listing.facets.showBrandFilter && listing.facets.brands.length > 0 ? (
        <FilterGroup title="Brands">
          {listing.facets.brands.slice(0, 10).map((option) => (
            <FilterLink
              key={option.id}
              count={option.count}
              href={buildStorefrontSearchHref(listing.query, {
                page: 1,
                brandSlugs: withListValue(listing.query.brandSlugs, option.slug),
              })}
              label={option.label}
              selected={listing.query.brandSlugs.includes(option.slug)}
            />
          ))}
        </FilterGroup>
      ) : null}

      {listing.facets.showPriceFilter ? (
        <FilterGroup title="Price">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Under 50,000", min: null, max: 50000 },
              { label: "50,000 - 100,000", min: 50000, max: 100000 },
              { label: "100,000 - 250,000", min: 100000, max: 250000 },
              { label: "250,000+", min: 250000, max: null },
            ].map((band) => {
              const selected =
                listing.query.minPrice === band.min && listing.query.maxPrice === band.max;

              return (
                <FilterLink
                  key={band.label}
                  href={buildStorefrontSearchHref(listing.query, {
                    page: 1,
                    minPrice: selected ? null : band.min,
                    maxPrice: selected ? null : band.max,
                  })}
                  label={band.label}
                  selected={selected}
                />
              );
            })}
          </div>
          <form action="/shop" className="grid gap-2 pt-2" method="get">
            {hiddenQueryInputs(listing.query, ["page", "minPrice", "maxPrice"])}
            <div className="grid grid-cols-2 gap-2">
              <input
                className="h-10 rounded-xl border border-border bg-surface px-3 text-sm text-text focus:border-primary/20 focus:ring-2 focus:ring-focus-ring/15"
                defaultValue={listing.query.minPrice ?? ""}
                min={0}
                name="minPrice"
                placeholder="Min"
                type="number"
              />
              <input
                className="h-10 rounded-xl border border-border bg-surface px-3 text-sm text-text focus:border-primary/20 focus:ring-2 focus:ring-focus-ring/15"
                defaultValue={listing.query.maxPrice ?? ""}
                min={0}
                name="maxPrice"
                placeholder="Max"
                type="number"
              />
            </div>
            <button
              className={buttonClassName({ size: "sm", variant: "primary" })}
              type="submit"
            >
              Apply price
            </button>
          </form>
        </FilterGroup>
      ) : null}

      <FilterGroup title="Rating">
        {[4, 3, 2].map((rating) => (
          <FilterLink
            key={rating}
            href={buildStorefrontSearchHref(listing.query, {
              page: 1,
              minRating: listing.query.minRating === rating ? null : rating,
            })}
            label={`${rating}+ stars`}
            selected={listing.query.minRating === rating}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Condition">
        {[
          { label: "New", value: "NEW" as const },
          { label: "Refurbished", value: "REFURBISHED" as const },
        ].map((option) => (
          <FilterLink
            key={option.value}
            href={buildStorefrontSearchHref(listing.query, {
              page: 1,
              condition: listing.query.condition === option.value ? null : option.value,
            })}
            label={option.label}
            selected={listing.query.condition === option.value}
          />
        ))}
      </FilterGroup>

      {listing.facets.configuredFilters.map((group) => (
        <FilterGroup key={group.key} title={group.label}>
          {group.values.slice(0, 10).map((value) => (
            <FilterLink
              key={value.id}
              count={value.count}
              href={
                group.filterSource === "OPTION_TYPE"
                  ? buildStorefrontSearchHref(listing.query, {
                      page: 1,
                      optionValueIds: withListValue(listing.query.optionValueIds, value.id),
                    })
                  : buildStorefrontSearchHref(listing.query, {
                      page: 1,
                      specFilters: withListValue(listing.query.specFilters, value.slug),
                    })
              }
              label={value.label}
              selected={
                group.filterSource === "OPTION_TYPE"
                  ? listing.query.optionValueIds.includes(value.id)
                  : listing.query.specFilters.includes(value.slug)
              }
              swatchHex={group.displayType === "COLOR_SWATCH" ? value.swatchHex : null}
            />
          ))}
        </FilterGroup>
      ))}
    </div>
  );

  return (
    <StorefrontShell searchValue={listing.query.query}>
      <StorefrontBreadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
          ...(listing.title !== "Shop" ? [{ label: listing.title }] : []),
        ]}
      />

      <section className="rounded-[2rem] border border-border bg-surface px-5 py-6 shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
          Catalog
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-text sm:text-4xl">
          {listing.title}
        </h1>
        {listing.description ? (
          <p className="mt-3 max-w-3xl text-sm leading-7 text-text-muted">
            {listing.description}
          </p>
        ) : null}
      </section>

      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="hidden lg:block">{filterSidebar}</aside>

        <section className="min-w-0 space-y-4">
          <div className="rounded-[1.75rem] border border-border bg-surface p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-text">
                  {listing.total === 0
                    ? "No matching products"
                    : `Showing ${firstResult}-${lastResult} of ${listing.total} products`}
                </p>
                {listing.query.query ? (
                  <p className="mt-1 text-sm text-text-muted">
                    Search query: {listing.query.query}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StorefrontFilterDrawer>{filterSidebar}</StorefrontFilterDrawer>
                <form action="/shop" className="flex items-center gap-2" method="get">
                  {hiddenQueryInputs(listing.query, ["sort", "page"])}
                  <label className="sr-only" htmlFor="sort">
                    Sort products
                  </label>
                  <select
                    className="h-11 rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-text focus:border-primary/20 focus:ring-2 focus:ring-focus-ring/15"
                    defaultValue={listing.query.sort}
                    id="sort"
                    name="sort"
                  >
                    {listing.query.query ? <option value="relevance">Relevance</option> : null}
                    <option value="featured">Featured</option>
                    <option value="newest">Newest</option>
                    <option value="price_asc">Price low to high</option>
                    <option value="price_desc">Price high to low</option>
                    <option value="best_selling">Best selling</option>
                    <option value="rating_desc">Highest rated</option>
                  </select>
                  <button
                    className={buttonClassName({ variant: "primary" })}
                    type="submit"
                  >
                    Apply
                  </button>
                </form>
              </div>
            </div>

            {hasFilters ? (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {listing.activeFilters.map((filter) => (
                  <Link
                    key={filter.key}
                    className={buttonClassName({
                      className: "min-h-9 rounded-full px-3 !text-white",
                      size: "sm",
                      variant: "primary",
                    })}
                    href={filter.href}
                  >
                    {filter.label}
                  </Link>
                ))}
                <Link
                  className="inline-flex min-h-9 items-center rounded-full border border-border bg-surface px-3 text-sm font-semibold whitespace-nowrap text-text-muted hover:bg-surface-alt hover:text-text"
                  href={clearFiltersHref}
                >
                  Clear all
                </Link>
              </div>
            ) : null}
          </div>

          {listing.items.length === 0 ? (
            <section className="rounded-[1.75rem] border border-dashed border-border bg-surface px-6 py-12 text-center shadow-[0_10px_30px_rgba(15,23,42,0.03)]">
              <h2 className="text-2xl font-bold text-text">No products found</h2>
              <p className="mt-3 text-sm leading-7 text-text-muted">
                No products match the current filters.
              </p>
              {hasFilters ? (
                <div className="mt-6">
                  <Link
                    className={buttonClassName({ variant: "primary" })}
                    href={clearFiltersHref}
                  >
                    Clear filters
                  </Link>
                </div>
              ) : null}
            </section>  
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {listing.items.map((product) => (
                  <ProductCard
                    key={product.id}
                    isAuthenticated={Boolean(user)}
                    loginHref={`/login?next=${encodeURIComponent(currentHref)}`}
                    product={product}
                  />
                ))}
              </div>

              <StorefrontPagination
                buildHref={(page) => buildStorefrontSearchHref(listing.query, { page })}
                page={listing.page}
                totalPages={listing.totalPages}
              />
            </>
          )}
        </section>
      </div>
    </StorefrontShell>
  );
}
