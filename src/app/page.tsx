import Link from "next/link";

import { ProductCard } from "@/components/store/product-card";
import { StorefrontImage } from "@/components/store/storefront-image";
import { StorefrontShell } from "@/components/store/storefront-shell";
import { buttonClassName } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";
import {
  STOREFRONT_BANNER_PLACEHOLDER_SRC,
  STOREFRONT_CATEGORY_PLACEHOLDER_SRC,
  storefrontAssetUrl,
} from "@/lib/storefront/placeholders";
import { storefrontCatalogService } from "@/modules/storefront/storefront-catalog.service";
import { authService } from "@/modules/users/auth.service";

function HomeSectionHeading({
  eyebrow,
  title,
  href,
}: {
  eyebrow: string;
  title: string;
  href?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          {title}
        </h2>
      </div>
      {href ? (
        <Link
          className={buttonClassName({ size: "sm", variant: "secondary" })}
          href={href}
        >
          View more
        </Link>
      ) : null}
    </div>
  );
}

export default async function HomePage() {
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

  const data = await storefrontCatalogService.getHomePageData(user?.id);
  const currentHref = "/";

  const utilityCards = [
    {
      title: "Secure checkout",
      description: "Address, payment, and order records stay tied to your account.",
    },
    {
      title: "Live catalog",
      description: "Active products, prices, and availability come from the current store data.",
    },
    {
      title: "Saved shopping",
      description: "Use wishlist and cart flows tied to your signed-in customer account.",
    },
    {
      title: "Order history",
      description: "Placed orders remain available from your account after checkout.",
    },
  ];

  return (
    <StorefrontShell>
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_360px]">
        <div className="relative overflow-hidden rounded-[2rem] border border-border bg-surface p-6 shadow-[0_16px_50px_rgba(15,23,42,0.06)] sm:p-8">
          <div className="absolute inset-0">
            <StorefrontImage
              alt={data.heroBanner?.title ?? data.heroBanner?.bannerName ?? "Storefront banner"}
              className="object-cover opacity-25"
              fallbackSrc={STOREFRONT_BANNER_PLACEHOLDER_SRC}
              fill
              priority
              sizes="(max-width: 1280px) 100vw, 66vw"
              src={storefrontAssetUrl(
                data.heroBanner?.assetId ?? null,
                STOREFRONT_BANNER_PLACEHOLDER_SRC,
              )}
            />
          </div>
          <div className="relative z-10 flex h-full flex-col justify-between gap-6">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                Marketplace storefront
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-text sm:text-5xl">
                {data.heroBanner?.title ?? "Browse the live catalog and shop current inventory."}
              </h1>
              {data.heroBanner?.subtitle ? (
                <p className="mt-4 max-w-2xl text-sm leading-7 text-text-muted sm:text-base">
                  {data.heroBanner.subtitle}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                className={buttonClassName({ size: "lg", variant: "primary" })}
                href={data.heroBanner?.linkUrl ?? "/shop"}
              >
                Shop catalog
              </Link>
              {data.collections[0] ? (
                <Link
                  className={buttonClassName({ size: "lg", variant: "secondary" })}
                  href={`/shop?collection=${data.collections[0].slug}`}
                >
                  Explore {data.collections[0].collectionName}
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          {data.sideBanners.length > 0 ? (
            data.sideBanners.slice(0, 3).map((banner) => (
              <Link
                key={banner.id}
                className="relative overflow-hidden rounded-[1.75rem] border border-border bg-surface p-5 shadow-[0_12px_36px_rgba(15,23,42,0.05)]"
                href={banner.linkUrl ?? "/shop"}
              >
                <div className="absolute inset-0">
                  <StorefrontImage
                    alt={banner.title ?? banner.bannerName}
                    className="object-cover opacity-20"
                    fallbackSrc={STOREFRONT_BANNER_PLACEHOLDER_SRC}
                    fill
                    sizes="360px"
                    src={storefrontAssetUrl(
                      banner.assetId,
                      STOREFRONT_BANNER_PLACEHOLDER_SRC,
                    )}
                  />
                </div>
                <div className="relative z-10">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Banner
                  </p>
                  <h2 className="mt-2 text-lg font-bold text-slate-950">
                    {banner.title ?? banner.bannerName}
                  </h2>
                  {banner.subtitle ? (
                    <p className="mt-2 text-sm leading-6 text-slate-600">{banner.subtitle}</p>
                  ) : null}
                </div>
              </Link>
            ))
          ) : (
            <>
              {data.utilityPromotions.slice(0, 2).map((promotion) => (
                <Link
                  key={promotion.id}
                  className="rounded-[1.75rem] border border-border bg-surface p-5 shadow-[0_12px_36px_rgba(15,23,42,0.05)]"
                  href={`/shop?promotion=${promotion.id}`}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Promotion
                  </p>
                  <h2 className="mt-2 text-lg font-bold text-slate-950">{promotion.name}</h2>
                  {promotion.description ? (
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {promotion.description}
                    </p>
                  ) : null}
                  {promotion.discountValue ? (
                    <p className="mt-3 text-sm font-semibold text-accent">
                      {promotion.discountType === "PERCENT"
                        ? `${promotion.discountValue}% discount`
                        : "Amount discount available"}
                    </p>
                  ) : null}
                </Link>
              ))}
              {data.categories[0] ? (
                <Link
                  className="rounded-[1.75rem] border border-border bg-surface p-5 shadow-[0_12px_36px_rgba(15,23,42,0.05)]"
                  href={`/shop?category=${data.categories[0].fullSlugPath}`}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Top category
                  </p>
                  <h2 className="mt-2 text-lg font-bold text-slate-950">
                    {data.categories[0].categoryName}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {data.categories[0].productCount} active products
                  </p>
                </Link>
              ) : null}
            </>
          )}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {utilityCards.map((item) => (
          <article
            key={item.title}
            className="rounded-[1.4rem] border border-border bg-surface px-4 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
          >
            <h2 className="text-sm font-bold text-slate-950">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
          </article>
        ))}
      </section>

      {data.categories.length > 0 ? (
        <section className="space-y-4">
          <HomeSectionHeading eyebrow="Browse" title="Shop by category" href="/shop" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {data.categories.slice(0, 10).map((category) => (
              <Link
                key={category.id}
                className="group overflow-hidden rounded-[1.5rem] border border-border bg-surface shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
                href={`/shop?category=${category.fullSlugPath}`}
              >
                <div className="relative aspect-[1.1/1] bg-surface-alt">
                  <StorefrontImage
                    alt={category.categoryName}
                    className="object-cover transition duration-300 group-hover:scale-[1.03]"
                    fallbackSrc={STOREFRONT_CATEGORY_PLACEHOLDER_SRC}
                    fill
                    sizes="(max-width: 768px) 50vw, 20vw"
                    src={storefrontAssetUrl(
                      category.imageAssetId,
                      STOREFRONT_CATEGORY_PLACEHOLDER_SRC,
                    )}
                  />
                </div>
                <div className="p-3">
                  <h3 className="line-clamp-2 text-sm font-semibold text-slate-900">
                    {category.categoryName}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {category.productCount} products
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {data.productSections.map((section) =>
        section.items.length > 0 ? (
          <section key={section.id} className="space-y-4">
            <HomeSectionHeading eyebrow="Products" title={section.title} href={section.href} />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
              {section.items.slice(0, 10).map((product) => (
                <ProductCard
                  key={product.id}
                  isAuthenticated={Boolean(user)}
                  loginHref={`/login?next=${encodeURIComponent(currentHref)}`}
                  product={product}
                />
              ))}
            </div>
          </section>
        ) : null,
      )}

      {data.collections.length > 0 || data.brands.length > 0 || data.utilityPromotions.length > 0 ? (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_420px]">
          {data.collections.length > 0 ? (
            <div className="rounded-[2rem] border border-border bg-surface p-5 shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
              <HomeSectionHeading eyebrow="Collections" title="Curated picks" />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {data.collections.slice(0, 4).map((collection) => (
                  <Link
                    key={collection.id}
                    className="group overflow-hidden rounded-[1.5rem] border border-border bg-surface"
                    href={`/shop?collection=${collection.slug}`}
                  >
                    <div className="relative aspect-[1.4/1] bg-surface-alt">
                      <StorefrontImage
                        alt={collection.collectionName}
                        className="object-cover transition duration-300 group-hover:scale-[1.03]"
                        fallbackSrc={STOREFRONT_BANNER_PLACEHOLDER_SRC}
                        fill
                        sizes="(max-width: 1280px) 50vw, 28vw"
                        src={storefrontAssetUrl(
                          collection.bannerAssetId,
                          STOREFRONT_BANNER_PLACEHOLDER_SRC,
                        )}
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="text-base font-bold text-slate-950">
                        {collection.collectionName}
                      </h3>
                      {collection.description ? (
                        <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                          {collection.description}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid gap-4">
            {data.utilityPromotions.slice(0, 2).map((promotion) => (
              <Link
                key={promotion.id}
                className="rounded-[1.75rem] border border-border bg-surface p-5 shadow-[0_12px_36px_rgba(15,23,42,0.04)]"
                href={`/shop?promotion=${promotion.id}`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Promotion
                </p>
                <h2 className="mt-2 text-lg font-bold text-slate-950">{promotion.name}</h2>
                {promotion.description ? (
                  <p className="mt-2 text-sm leading-6 text-slate-600">{promotion.description}</p>
                ) : null}
              </Link>
            ))}

            {data.brands.length > 0 ? (
              <div className="rounded-[1.75rem] border border-border bg-surface p-5 shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
                <HomeSectionHeading eyebrow="Brands" title="Popular brands" href="/shop" />
                <div className="mt-4 grid gap-2">
                  {data.brands.slice(0, 6).map((brand) => (
                    <Link
                      key={brand.id}
                      className="inline-flex min-h-11 items-center justify-between rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-text-muted transition hover:bg-surface-alt hover:text-text"
                      href={`/shop?brand=${brand.slug}`}
                    >
                      <span>{brand.brandName}</span>
                      <span className="text-xs text-slate-400">{brand.productCount}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {user && data.recentlyViewed.length > 0 ? (
        <section className="space-y-4">
          <HomeSectionHeading eyebrow="History" title="Recently viewed" href="/shop" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {data.recentlyViewed.map((product) => (
              <ProductCard
                key={product.id}
                isAuthenticated
                loginHref={`/login?next=${encodeURIComponent(currentHref)}`}
                product={product}
              />
            ))}
          </div>
        </section>
      ) : null}
    </StorefrontShell>
  );
}
