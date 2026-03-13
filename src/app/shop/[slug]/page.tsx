import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductCard } from "@/components/store/product-card";
import { ProductDetailClient } from "@/components/store/product-detail-client";
import { StorefrontBreadcrumbs } from "@/components/store/storefront-breadcrumbs";
import { StorefrontImage } from "@/components/store/storefront-image";
import { StorefrontShell } from "@/components/store/storefront-shell";
import { ProductReviewForm } from "@/components/store/product-review-form";
import { STOREFRONT_PRODUCT_PLACEHOLDER_SRC } from "@/lib/storefront/placeholders";
import { formatCompactNumber, formatDate } from "@/lib/utils/format";
import { getSession } from "@/lib/auth/session";
import { systemEventsService } from "@/modules/content/system-events.service";
import { storefrontCatalogService } from "@/modules/storefront/storefront-catalog.service";
import { authService } from "@/modules/users/auth.service";

type ShopProductPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ShopProductPage({
  params,
}: ShopProductPageProps) {
  const { slug } = await params;
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
  const product = await storefrontCatalogService.getProductDetailBySlug(slug, user?.id);

  if (!product) {
    notFound();
  }

  const [initialInWishlist] = await Promise.all([
    user ? storefrontCatalogService.isProductInWishlist(user.id, product.id) : false,
    user ? storefrontCatalogService.trackRecentlyViewed({ userId: user.id, productId: product.id }) : null,
    systemEventsService.recordAnalyticsEvent({
      eventName: "PRODUCT_VIEW",
      userId: user?.id ?? null,
      productId: product.id,
      source: "storefront:pdp",
    }),
  ]);

  return (
    <StorefrontShell>
      <StorefrontBreadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
          ...(product.category
            ? [
                {
                  label: product.category.name,
                  href: `/shop?category=${product.category.fullSlugPath}`,
                },
              ]
            : []),
          { label: product.productName },
        ]}
      />

      <ProductDetailClient
        initialInWishlist={Boolean(initialInWishlist)}
        isAuthenticated={Boolean(user)}
        loginHref={`/login?next=${encodeURIComponent(`/shop/${product.slug}`)}`}
        product={product}
      />

      <section className="rounded-[2rem] border border-border bg-surface p-5 shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap gap-3 border-b border-border pb-4 text-sm font-semibold text-text-muted">
          <a className="hover:text-text" href="#details">
            Details
          </a>
          {product.specifications.length > 0 ? (
            <a className="hover:text-text" href="#specifications">
              Specifications
            </a>
          ) : null}
          {product.faqs.length > 0 ? (
            <a className="hover:text-text" href="#faq">
              FAQ
            </a>
          ) : null}
          <a className="hover:text-text" href="#reviews">
            Reviews
          </a>
          <a className="hover:text-text" href="#shipping">
            Shipping
          </a>
        </div>

        <div className="mt-6 grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_340px]">
          <div className="space-y-8">
            <section id="details" className="space-y-3">
              <h2 className="text-xl font-bold text-text">Product details</h2>
              {product.description ? (
                <div className="whitespace-pre-line text-sm leading-7 text-text-muted">
                  {product.description}
                </div>
              ) : (
                <p className="text-sm text-text-muted">No detailed description published yet.</p>
              )}
            </section>

            {product.specifications.length > 0 ? (
              <section id="specifications" className="space-y-3">
                <h2 className="text-xl font-bold text-text">Specifications</h2>
                <div className="overflow-hidden rounded-[1.5rem] border border-border">
                  <div className="grid divide-y divide-border">
                    {product.specifications.map((specification) => (
                      <div
                        key={specification.id}
                        className="grid gap-2 px-4 py-3 sm:grid-cols-[220px_minmax(0,1fr)]"
                      >
                        <div>
                          {specification.group ? (
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted/70">
                              {specification.group}
                            </p>
                          ) : null}
                          <p className="mt-1 text-sm font-semibold text-text">
                            {specification.key}
                          </p>
                        </div>
                        <p className="text-sm leading-6 text-text-muted">{specification.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}

            {product.faqs.length > 0 ? (
              <section id="faq" className="space-y-3">
                <h2 className="text-xl font-bold text-text">Frequently asked questions</h2>
                <div className="grid gap-3">
                  {product.faqs.map((faq) => (
                    <details
                      key={faq.id}
                      className="rounded-[1.4rem] border border-border bg-surface-alt px-4 py-4"
                    >
                      <summary className="cursor-pointer list-none text-sm font-semibold text-text">
                        {faq.question}
                      </summary>
                      <p className="mt-3 whitespace-pre-line text-sm leading-7 text-text-muted">
                        {faq.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </section>
            ) : null}

            <section id="reviews" className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-text">Customer reviews</h2>
                  <p className="mt-1 text-sm text-text-muted">
                    {product.reviewCount > 0
                      ? `${formatCompactNumber(product.reviewCount)} published reviews`
                      : "No published reviews yet."}
                  </p>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-border bg-surface-alt p-4">
                <ProductReviewForm
                  canSubmit={Boolean(product.reviewSubmission?.canSubmit)}
                  initialMessage={product.reviewSubmission?.message ?? null}
                  isAuthenticated={Boolean(user)}
                  loginHref={`/login?next=${encodeURIComponent(`/shop/${product.slug}`)}`}
                  productId={product.id}
                />
              </div>

              {product.reviews.length > 0 ? (
                <div className="grid gap-4">
                  {product.reviews.map((review) => (
                    <article
                      key={review.id}
                      className="rounded-[1.5rem] border border-border bg-surface p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-text">{review.customerName}</p>
                            {review.isVerifiedPurchase ? (
                              <span className="rounded-full border border-border bg-surface-alt px-2.5 py-1 text-[11px] font-semibold text-text-muted">
                                Verified purchase
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs text-text-muted">
                            {review.createdAt ? formatDate(review.createdAt) : "Recently submitted"}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-text">
                          {review.rating}/5
                        </p>
                      </div>

                      {review.title ? (
                        <h3 className="mt-3 text-base font-semibold text-text">{review.title}</h3>
                      ) : null}
                      {review.comment ? (
                        <p className="mt-2 whitespace-pre-line text-sm leading-7 text-text-muted">
                          {review.comment}
                        </p>
                      ) : null}

                      {review.media.length > 0 ? (
                        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                          {review.media.map((media) => (
                            <div
                              key={media.id}
                              className="relative aspect-square overflow-hidden rounded-xl border border-border bg-surface-alt"
                            >
                              <StorefrontImage
                                alt={review.title ?? product.productName}
                                className="object-cover"
                                fallbackSrc={STOREFRONT_PRODUCT_PLACEHOLDER_SRC}
                                fill
                                sizes="160px"
                                src={media.url}
                              />
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-border bg-surface px-4 py-8 text-center text-sm text-text-muted">
                  No visible reviews have been published for this product yet.
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-4">
            <section className="rounded-[1.5rem] border border-border bg-surface-alt p-4">
              <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-text-muted">
                Storefront summary
              </h2>
              <div className="mt-4 grid gap-3 text-sm text-text-muted">
                {product.brand ? (
                  <Link
                    className="flex items-center justify-between gap-3 hover:text-text"
                    href={`/shop?brand=${product.brand.slug}`}
                  >
                    <span>Brand</span>
                    <span className="font-semibold text-text">{product.brand.name}</span>
                  </Link>
                ) : null}
                {product.category ? (
                  <Link
                    className="flex items-center justify-between gap-3 hover:text-text"
                    href={`/shop?category=${product.category.fullSlugPath}`}
                  >
                    <span>Category</span>
                    <span className="font-semibold text-text">{product.category.name}</span>
                  </Link>
                ) : null}
                {product.originCountry ? (
                  <div className="flex items-center justify-between gap-3">
                    <span>Origin</span>
                    <span className="font-semibold text-text">
                      {product.originCountry.name}
                    </span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-3">
                  <span>Condition</span>
                  <span className="font-semibold text-text">
                    {product.conditionType === "NEW" ? "New" : "Refurbished"}
                  </span>
                </div>
              </div>
            </section>

            <section className="rounded-[1.5rem] border border-border bg-surface-alt p-4" id="shipping">
              <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-text-muted">
                Shipping and support
              </h2>
              <div className="mt-4 grid gap-3 text-sm text-text-muted">
                {product.shippingMethods.map((method) => (
                  <div key={method.id} className="rounded-xl border border-border bg-surface p-3">
                    <p className="font-semibold text-text">{method.methodName}</p>
                    <p className="mt-1 leading-6">
                      {method.description ??
                        (method.estimatedMinDays && method.estimatedMaxDays
                          ? `${method.estimatedMinDays}-${method.estimatedMaxDays} days`
                          : "Active delivery option")}
                    </p>
                  </div>
                ))}
                <p className="leading-6">
                  Orders, delivery updates, and approved returns remain visible from your
                  account after purchase.
                </p>
              </div>
            </section>

            <section className="rounded-[1.5rem] border border-border bg-surface-alt p-4">
              <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-text-muted">
                Reviews
              </h2>
              <div className="mt-4 grid gap-2 text-sm text-text-muted">
                <p className="text-3xl font-black text-text">
                  {product.avgRating > 0 ? product.avgRating.toFixed(1) : "-"}
                </p>
                <p>
                  {product.reviewCount > 0
                    ? `${formatCompactNumber(product.reviewCount)} published reviews`
                    : "No published reviews yet"}
                </p>
                {product.soldCount > 0 ? (
                  <p>{formatCompactNumber(product.soldCount)} sold</p>
                ) : null}
              </div>
            </section>
          </aside>
        </div>
      </section>

      {product.bundleProducts.length > 0 ? (
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
                Bundles
              </p>
              <h2 className="mt-2 text-2xl font-bold text-text">Bundle suggestions</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {product.bundleProducts.map((item) => (
              <ProductCard
                key={item.id}
                isAuthenticated={Boolean(user)}
                loginHref={`/login?next=${encodeURIComponent(`/shop/${product.slug}`)}`}
                product={item}
              />
            ))}
          </div>
        </section>
      ) : null}

      {product.relatedProducts.length > 0 ? (
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
                Related
              </p>
              <h2 className="mt-2 text-2xl font-bold text-text">You may also like</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {product.relatedProducts.map((item) => (
              <ProductCard
                key={item.id}
                isAuthenticated={Boolean(user)}
                loginHref={`/login?next=${encodeURIComponent(`/shop/${product.slug}`)}`}
                product={item}
              />
            ))}
          </div>
        </section>
      ) : null}
    </StorefrontShell>
  );
}
