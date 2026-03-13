import Link from "next/link";
import { redirect } from "next/navigation";

import { CheckoutForm } from "@/components/store/checkout-form";
import { StorefrontBreadcrumbs } from "@/components/store/storefront-breadcrumbs";
import { StorefrontShell } from "@/components/store/storefront-shell";
import { buttonClassName } from "@/components/ui/button";
import { coreService } from "@/modules/core/core.service";
import { setupService } from "@/modules/setup/setup.service";
import { storefrontCatalogService } from "@/modules/storefront/storefront-catalog.service";
import { storefrontService } from "@/modules/storefront/storefront.service";
import { requireStorefrontCustomer } from "@/modules/storefront/storefront-session";

export default async function CheckoutPage() {
  const user = await requireStorefrontCustomer("/checkout");
  const defaults = await setupService.ensureBaseCommerceSetup();
  const [snapshot, paymentMethods, countries, states, shippingMethods] = await Promise.all([
    storefrontService.getCartForUser(user.id),
    storefrontService.listPaymentMethods(),
    coreService.listCountries(),
    coreService.listStateRegions(),
    storefrontCatalogService.listShippingMethods(defaults.countryId),
  ]);

  if (snapshot.items.length === 0) {
    redirect("/cart");
  }

  return (
    <StorefrontShell cartSnapshot={snapshot}>
      <StorefrontBreadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Cart", href: "/cart" },
          { label: "Checkout" },
        ]}
      />

      <section className="flex flex-wrap items-end justify-between gap-4 rounded-[2rem] border border-border bg-surface px-5 py-6 shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
            Checkout
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-text sm:text-4xl">
            Confirm delivery, payment, and order details
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-text-muted">
            Finish the order with your saved customer account and the current cart totals.
          </p>
        </div>
        <Link className={buttonClassName({ variant: "secondary" })} href="/cart">
          Back to cart
        </Link>
      </section>
      <CheckoutForm
        cart={snapshot.cart}
        countries={countries.map((country) => ({
          id: country.id,
          label: country.countryName,
        }))}
        defaultCountryId={defaults.countryId}
        initialCustomer={{
          fullName: user.fullName,
          phone: user.phone,
        }}
        paymentMethods={paymentMethods.map((method) => ({
          id: method.id,
          code: method.code,
          methodName: method.methodName,
          provider: method.provider ?? null,
        }))}
        shippingMethods={shippingMethods.map((method) => ({
          id: method.id,
          methodName: method.methodName,
          code: method.code,
          description: method.description ?? null,
          baseFee: method.baseFee,
          estimatedMinDays: method.estimatedMinDays ?? null,
          estimatedMaxDays: method.estimatedMaxDays ?? null,
        }))}
        states={states.map((state) => ({
          id: state.id,
          label: state.stateRegionName,
          countryId: String(state.countryId),
        }))}
      />
    </StorefrontShell>
  );
}
