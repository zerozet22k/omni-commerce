import Link from "next/link";

import { StorefrontAccountShell } from "@/components/store/storefront-account-shell";
import { buttonClassName } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { storefrontAccountService } from "@/modules/storefront/storefront-account.service";
import { requireStorefrontCustomer } from "@/modules/storefront/storefront-session";

export default async function AccountOverviewPage() {
  const user = await requireStorefrontCustomer("/account");
  const overview = await storefrontAccountService.getOverview(user.id);

  return (
    <StorefrontAccountShell
      currentPath="/account"
      description="Review your profile, totals, and recent orders in one place."
      title={`Welcome back, ${overview.profile.fullName}`}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Orders", value: overview.totals.totalOrders },
          {
            label: "Spent",
            value: overview.totals.totalSpent.toLocaleString(),
          },
          { label: "Loyalty points", value: overview.totals.loyaltyPoints },
          { label: "Saved addresses", value: overview.totals.savedAddresses },
          { label: "Wishlist", value: overview.totals.wishlistItems },
        ].map((item) => (
          <article
            key={item.label}
            className="rounded-[1.5rem] border border-border bg-surface p-4 shadow-[0_10px_30px_rgba(15,23,42,0.03)]"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
              {item.label}
            </p>
            <p className="mt-3 text-2xl font-black text-text">{item.value}</p>
          </article>
        ))}
      </div>

      <section className="rounded-[1.75rem] border border-border bg-surface p-5 shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
              Profile
            </p>
            <h2 className="mt-2 text-2xl font-bold text-text">Customer details</h2>
          </div>
          <Link className={buttonClassName({ size: "sm", variant: "secondary" })} href="/account/addresses">
            Manage addresses
          </Link>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-[1.4rem] border border-border bg-surface-alt p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              Contact
            </p>
            <div className="mt-3 space-y-2 text-sm text-text">
              <p>{overview.profile.email ?? "No email"}</p>
              <p>{overview.profile.phone ?? "No phone"}</p>
            </div>
          </div>
          <div className="rounded-[1.4rem] border border-border bg-surface-alt p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              Joined
            </p>
            <p className="mt-3 text-sm text-text">
              {formatDate(overview.profile.joinedAt)}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-border bg-surface p-5 shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
              Recent activity
            </p>
            <h2 className="mt-2 text-2xl font-bold text-text">Recent orders</h2>
          </div>
          <Link className={buttonClassName({ size: "sm", variant: "secondary" })} href="/account/orders">
            View all orders
          </Link>
        </div>

        {overview.recentOrders.length > 0 ? (
          <div className="mt-5 grid gap-3">
            {overview.recentOrders.map((order) => (
              <Link
                key={order.id}
                className="rounded-[1.4rem] border border-border bg-surface-alt p-4 transition hover:bg-surface"
                href={`/account/orders/${order.id}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text">{order.orderNo}</p>
                    <p className="mt-1 text-sm text-text-muted">{formatDate(order.orderDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-text">
                      {formatCurrency(order.grandTotal, order.currencyCode)}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">{order.status}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-5 text-sm text-text-muted">No orders placed yet.</p>
        )}
      </section>
    </StorefrontAccountShell>
  );
}
