import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

import { StorefrontCartDrawer } from "@/components/store/storefront-cart-drawer";
import { StorefrontCartHydrator } from "@/components/store/storefront-cart-hydrator";
import { StorefrontHeaderActions } from "@/components/store/storefront-header-actions";
import { buttonClassName } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";
import { STOREFRONT_CATEGORY_PLACEHOLDER_SRC, storefrontAssetUrl } from "@/lib/storefront/placeholders";
import type { StorefrontCartSnapshot } from "@/modules/storefront/storefront.types";
import { authService } from "@/modules/users/auth.service";
import { storefrontCatalogService } from "@/modules/storefront/storefront-catalog.service";

type StorefrontShellProps = {
  cartSnapshot?: StorefrontCartSnapshot | null;
  children: ReactNode;
  searchValue?: string;
};

export async function StorefrontShell({
  cartSnapshot,
  children,
  searchValue = "",
}: StorefrontShellProps) {
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
  const shellData = await storefrontCatalogService.getShellData(user);
  const accountHref =
    user?.role === "CUSTOMER" ? "/account" : user ? "/dashboard" : "/login";
  const accountLabel =
    user?.role === "CUSTOMER"
      ? "Account"
      : user
        ? "Dashboard"
        : "Account";
  const resolvedCartSnapshot = cartSnapshot ?? shellData.cartSnapshot;
  const initialCartCount =
    resolvedCartSnapshot?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const dedupedHeaderLinks = shellData.headerLinks.filter(
    (link) =>
      !shellData.categoryStrip.some(
        (category) => link.url === `/shop?category=${category.fullSlugPath}`,
      ),
  );
  const navLinks =
    dedupedHeaderLinks.length > 0
      ? dedupedHeaderLinks
      : shellData.pageLinks.map((page) => ({
          id: page.id,
          label: page.title,
          url: `/pages/${page.slug}`,
          children: [],
        }));

  return (
    <div className="min-h-screen bg-background text-text">
      {resolvedCartSnapshot ? (
        <StorefrontCartHydrator snapshot={resolvedCartSnapshot} />
      ) : null}
      <StorefrontCartDrawer />

      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto max-w-[1440px] px-4">
          <div className="flex flex-col gap-3 py-3 lg:flex-row lg:items-center">
            <div className="flex items-center justify-between gap-3 lg:w-[230px] lg:shrink-0">
              <Link className="flex items-center gap-3" href="/">
                <span className="relative inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-primary text-sm font-bold text-white">
                  {shellData.store.logoAssetId ? (
                    <Image
                      alt={shellData.store.storeName}
                      className="object-cover"
                      fill
                      sizes="44px"
                      src={storefrontAssetUrl(
                        shellData.store.logoAssetId,
                        STOREFRONT_CATEGORY_PLACEHOLDER_SRC,
                      )}
                      unoptimized
                    />
                  ) : (
                    shellData.store.storeName.slice(0, 2).toUpperCase()
                  )}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-base font-bold text-text">
                    {shellData.store.storeName}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-muted">
                    Online store
                  </span>
                </span>
              </Link>
            </div>

            <form action="/shop" className="flex w-full flex-1 items-center gap-0" method="get">
              <label className="sr-only" htmlFor="storefront-search">
                Search products
              </label>
              <input
                className="h-12 w-full rounded-l-2xl border border-r-0 border-border bg-surface px-4 text-sm text-text outline-none placeholder:text-text-muted focus:border-primary/20 focus:ring-2 focus:ring-focus-ring/15"
                defaultValue={searchValue}
                id="storefront-search"
                name="q"
                placeholder="Search products, brands, collections, and categories"
                type="search"
              />
              <button
                className={buttonClassName({
                  className:
                    "h-12 shrink-0 rounded-l-none rounded-r-2xl border-primary",
                  size: "lg",
                  variant: "primary",
                })}
                type="submit"
              >
                Search
              </button>
            </form>

            <div className="flex flex-wrap items-center justify-between gap-2 lg:w-[380px] lg:flex-nowrap lg:justify-end">
              <StorefrontHeaderActions
                accountHref={accountHref}
                accountLabel={accountLabel}
                initialCartCount={initialCartCount}
                isAuthenticated={Boolean(user)}
                wishlistCount={shellData.wishlistCount}
              />
              {user ? (
                <form action="/api/auth/logout" method="post">
                  <button
                    className={buttonClassName({
                      className: "hidden shrink-0 lg:inline-flex",
                      variant: "secondary",
                    })}
                    type="submit"
                  >
                    Sign out
                  </button>
                </form>
              ) : null}
            </div>
          </div>

          {navLinks.length > 0 || shellData.categoryStrip.length > 0 ? (
            <nav className="scrollbar-none -mx-4 overflow-x-auto border-t border-border/70 px-4 pb-3">
              <div className="flex min-w-max items-center gap-2 pt-3">
                <Link
                  className={buttonClassName({
                    className: "h-9 rounded-full px-4 !text-white",
                    size: "sm",
                    variant: "primary",
                  })}
                  href="/shop"
                >
                  All products
                </Link>
                {shellData.categoryStrip.slice(0, 6).map((category) => (
                  <Link
                    key={category.id}
                    className={buttonClassName({
                      className: "h-9 rounded-full px-4 font-medium",
                      size: "sm",
                      variant: "secondary",
                    })}
                    href={`/shop?category=${category.fullSlugPath}`}
                  >
                    {category.categoryName}
                  </Link>
                ))}
                {navLinks.slice(0, 6).map((link) => (
                  <div key={link.id} className="flex items-center gap-2">
                    {link.url ? (
                      <Link
                        className={buttonClassName({
                          className: "h-9 rounded-full px-4 font-medium",
                          size: "sm",
                          variant: "secondary",
                        })}
                        href={link.url}
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <span
                        className={buttonClassName({
                          className: "h-9 rounded-full px-4 font-medium",
                          size: "sm",
                          variant: "secondary",
                        })}
                      >
                        {link.label}
                      </span>
                    )}
                    {link.children.slice(0, 4).map((child) =>
                      child.url ? (
                        <Link
                          key={child.id}
                          className={buttonClassName({
                            className: "h-8 rounded-full px-3 text-xs font-medium",
                            size: "sm",
                            variant: "ghost",
                          })}
                          href={child.url}
                        >
                          {child.label}
                        </Link>
                      ) : null,
                    )}
                  </div>
                ))}
              </div>
            </nav>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] space-y-5 px-4 py-5">{children}</main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-10 md:grid-cols-2 xl:grid-cols-4">
          <section>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-text-muted">
              Store
            </p>
            <h2 className="mt-3 text-lg font-bold text-text">
              {shellData.store.storeName}
            </h2>
            <div className="mt-4 space-y-2 text-sm text-text-muted">
              {shellData.store.storeEmail ? (
                <a className="block hover:text-text" href={`mailto:${shellData.store.storeEmail}`}>
                  {shellData.store.storeEmail}
                </a>
              ) : null}
              {shellData.store.storePhone ? (
                <a className="block hover:text-text" href={`tel:${shellData.store.storePhone}`}>
                  {shellData.store.storePhone}
                </a>
              ) : null}
              {shellData.store.supportEmail ? (
                <a className="block hover:text-text" href={`mailto:${shellData.store.supportEmail}`}>
                  Support: {shellData.store.supportEmail}
                </a>
              ) : null}
              {shellData.store.supportPhone ? (
                <a className="block hover:text-text" href={`tel:${shellData.store.supportPhone}`}>
                  Support: {shellData.store.supportPhone}
                </a>
              ) : null}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-text-muted">
              Shop
            </h2>
            <div className="mt-4 space-y-2 text-sm text-text-muted">
              <Link className="block hover:text-text" href="/shop">
                All products
              </Link>
              {shellData.categoryStrip.slice(0, 6).map((category) => (
                <Link
                  key={category.id}
                  className="block hover:text-text"
                  href={`/shop?category=${category.fullSlugPath}`}
                >
                  {category.categoryName}
                </Link>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-text-muted">
              Account
            </h2>
            <div className="mt-4 space-y-2 text-sm text-text-muted">
              <Link className="block hover:text-text" href={accountHref}>
                {accountLabel}
              </Link>
              <Link className="block hover:text-text" href="/cart">
                Cart
              </Link>
              <Link className="block hover:text-text" href="/checkout">
                Checkout
              </Link>
              {user ? (
                <Link className="block hover:text-text" href="/wishlist">
                  Wishlist
                </Link>
              ) : (
                <Link className="block hover:text-text" href="/register">
                  Register
                </Link>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-text-muted">
              Information
            </h2>
            <div className="mt-4 space-y-2 text-sm text-text-muted">
              {shellData.footerLinks.length > 0
                ? shellData.footerLinks.slice(0, 6).map((link) => (
                    <div key={link.id} className="space-y-1">
                      {link.url ? (
                        <Link className="block hover:text-text" href={link.url}>
                          {link.label}
                        </Link>
                      ) : (
                        <p className="font-semibold text-text">{link.label}</p>
                      )}
                      {link.children.map((child) =>
                        child.url ? (
                          <Link
                            key={child.id}
                            className="block pl-3 text-xs hover:text-text"
                            href={child.url}
                          >
                            {child.label}
                          </Link>
                        ) : null,
                      )}
                    </div>
                  ))
                : shellData.pageLinks.slice(0, 6).map((page) => (
                    <Link
                      key={page.id}
                      className="block hover:text-text"
                      href={`/pages/${page.slug}`}
                    >
                      {page.title}
                    </Link>
                  ))}
              {shellData.footerLinks.length === 0 && shellData.pageLinks.length === 0 ? (
                <p className="text-sm text-text-muted">No published pages yet.</p>
              ) : null}
            </div>
          </section>
        </div>
      </footer>
    </div>
  );
}
