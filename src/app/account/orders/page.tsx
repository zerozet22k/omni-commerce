import Link from "next/link";

import { StorefrontAccountShell } from "@/components/store/storefront-account-shell";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { storefrontAccountService } from "@/modules/storefront/storefront-account.service";
import { requireStorefrontCustomer } from "@/modules/storefront/storefront-session";

export default async function AccountOrdersPage() {
  const user = await requireStorefrontCustomer("/account/orders");
  const orders = await storefrontAccountService.listOrders(user.id);

  return (
    <StorefrontAccountShell
      currentPath="/account/orders"
      description="Track order status, payment progress, and fulfillment without leaving the storefront."
      title="Your orders"
    >
      <section className="rounded-[1.75rem] border border-border bg-surface p-5 shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
        {orders.length > 0 ? (
          <div className="grid gap-3">
            {orders.map((order) => (
              <Link
                key={order.id}
                className="rounded-[1.4rem] border border-border bg-surface-alt p-4 transition hover:bg-surface"
                href={`/account/orders/${order.id}`}
              >
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_180px] lg:items-center">
                  <div>
                    <p className="text-sm font-semibold text-text">{order.orderNo}</p>
                    <p className="mt-1 text-sm text-text-muted">{formatDate(order.orderDate)}</p>
                  </div>
                  <div className="text-sm text-text-muted">
                    <p>Status: {order.status}</p>
                    <p className="mt-1">Payment: {order.paymentStatus}</p>
                    <p className="mt-1">Delivery: {order.fulfillmentStatus}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-text">
                      {formatCurrency(order.grandTotal, order.currencyCode)}
                    </p>
                    <p className="mt-1 text-sm text-text-muted">
                      {order.itemCount} items
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted">No orders placed yet.</p>
        )}
      </section>
    </StorefrontAccountShell>
  );
}
