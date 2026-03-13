import { StorefrontBreadcrumbs } from "@/components/store/storefront-breadcrumbs";
import { CartView } from "@/components/store/cart-view";
import { StorefrontShell } from "@/components/store/storefront-shell";
import { storefrontService } from "@/modules/storefront/storefront.service";
import { requireStorefrontCustomer } from "@/modules/storefront/storefront-session";

export default async function CartPage() {
  const user = await requireStorefrontCustomer("/cart");
  const snapshot = await storefrontService.getCartForUser(user.id);

  return (
    <StorefrontShell cartSnapshot={snapshot}>
      <StorefrontBreadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Cart" },
        ]}
      />

      <section className="rounded-[2rem] border border-border bg-surface px-5 py-6 shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
          Cart
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-text sm:text-4xl">
          Review your items before checkout
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-text-muted">
          Quantity changes update the live cart snapshot and keep the checkout total in sync.
        </p>
      </section>
      <CartView initialSnapshot={snapshot} />
    </StorefrontShell>
  );
}
