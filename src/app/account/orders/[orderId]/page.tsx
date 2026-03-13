import Link from "next/link";
import { notFound } from "next/navigation";

import { StorefrontAccountShell } from "@/components/store/storefront-account-shell";
import { StorefrontBreadcrumbs } from "@/components/store/storefront-breadcrumbs";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils/format";
import { storefrontAccountService } from "@/modules/storefront/storefront-account.service";
import { requireStorefrontCustomer } from "@/modules/storefront/storefront-session";

type AccountOrderDetailPageProps = {
  params: Promise<{
    orderId: string;
  }>;
};

export default async function AccountOrderDetailPage({
  params,
}: AccountOrderDetailPageProps) {
  const { orderId } = await params;
  const user = await requireStorefrontCustomer(`/account/orders/${orderId}`);
  const order = await storefrontAccountService.getOrderDetail(user.id, orderId);

  if (!order) {
    notFound();
  }

  return (
    <StorefrontAccountShell
      currentPath="/account/orders"
      description="Review item, payment, shipment, and address details for this order."
      title={order.orderNo}
    >
      <StorefrontBreadcrumbs
        items={[
          { label: "Orders", href: "/account/orders" },
          { label: order.orderNo },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_360px]">
        <section className="space-y-5">
          <article className="rounded-[1.75rem] border border-border bg-surface p-5 shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
            <h2 className="text-xl font-bold text-text">Items</h2>
            <div className="mt-5 grid gap-3">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[1.4rem] border border-border bg-surface-alt p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      {item.productSlug ? (
                        <Link
                          className="text-sm font-semibold text-text hover:text-accent"
                          href={`/shop/${item.productSlug}`}
                        >
                          {item.productName}
                        </Link>
                      ) : (
                        <p className="text-sm font-semibold text-text">{item.productName}</p>
                      )}
                      <p className="mt-1 text-sm text-text-muted">
                        {item.variantLabel ?? item.sku ?? "Item"}
                      </p>
                    </div>
                    <div className="text-right text-sm text-text-muted">
                      <p>{item.quantity} x {formatCurrency(item.unitPrice, order.currencyCode)}</p>
                      <p className="mt-1 font-semibold text-text">
                        {formatCurrency(item.lineTotal, order.currencyCode)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[1.75rem] border border-border bg-surface p-5 shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
            <h2 className="text-xl font-bold text-text">Timeline</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.4rem] border border-border bg-surface-alt p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  Order date
                </p>
                <p className="mt-2 text-sm text-text">{formatDate(order.orderDate)}</p>
              </div>
              <div className="rounded-[1.4rem] border border-border bg-surface-alt p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  Status
                </p>
                <p className="mt-2 text-sm text-text">{order.status}</p>
              </div>
            </div>
            {order.note ? (
              <div className="mt-4 rounded-[1.4rem] border border-border bg-surface-alt p-4 text-sm leading-7 text-text-muted">
                {order.note}
              </div>
            ) : null}
          </article>
        </section>

        <aside className="space-y-5">
          <article className="rounded-[1.75rem] border border-border bg-surface p-5 shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
            <h2 className="text-xl font-bold text-text">Summary</h2>
            <div className="mt-4 space-y-3 text-sm text-text-muted">
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal, order.currencyCode)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Shipping</span>
                <span>{formatCurrency(order.shippingFee, order.currencyCode)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Tax</span>
                <span>{formatCurrency(order.taxTotal, order.currencyCode)}</span>
              </div>
              {order.giftCardTotal > 0 ? (
                <div className="flex items-center justify-between">
                  <span>Gift card</span>
                  <span>-{formatCurrency(order.giftCardTotal, order.currencyCode)}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between border-t border-border pt-3 text-base font-semibold text-text">
                <span>Total</span>
                <span>{formatCurrency(order.grandTotal, order.currencyCode)}</span>
              </div>
            </div>
          </article>

          <article className="rounded-[1.75rem] border border-border bg-surface p-5 shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
            <h2 className="text-xl font-bold text-text">Payment</h2>
            <div className="mt-4 grid gap-3">
              {order.payments.length > 0 ? (
                order.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="rounded-[1.4rem] border border-border bg-surface-alt p-4 text-sm text-text-muted"
                  >
                    <p className="font-semibold text-text">{payment.methodName}</p>
                    <p className="mt-1">Status: {payment.status}</p>
                    <p className="mt-1">
                      Amount: {formatCurrency(payment.amount, order.currencyCode)}
                    </p>
                    <p className="mt-1">{formatDateTime(payment.paymentDate)}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-text-muted">No payment records yet.</p>
              )}
            </div>
          </article>

          <article className="rounded-[1.75rem] border border-border bg-surface p-5 shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
            <h2 className="text-xl font-bold text-text">Delivery</h2>
            <div className="mt-4 grid gap-3">
              {order.shipments.length > 0 ? (
                order.shipments.map((shipment) => (
                  <div
                    key={shipment.id}
                    className="rounded-[1.4rem] border border-border bg-surface-alt p-4 text-sm text-text-muted"
                  >
                    <p className="font-semibold text-text">{shipment.status}</p>
                    {shipment.courierName ? <p className="mt-1">{shipment.courierName}</p> : null}
                    {shipment.trackingNo ? <p className="mt-1">Tracking: {shipment.trackingNo}</p> : null}
                    {shipment.shippedAt ? <p className="mt-1">Shipped: {formatDateTime(shipment.shippedAt)}</p> : null}
                    {shipment.deliveredAt ? <p className="mt-1">Delivered: {formatDateTime(shipment.deliveredAt)}</p> : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-text-muted">No shipment records yet.</p>
              )}
            </div>
          </article>

          {order.shippingAddress ? (
            <article className="rounded-[1.75rem] border border-border bg-surface p-5 shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
              <h2 className="text-xl font-bold text-text">Shipping address</h2>
              <div className="mt-4 text-sm leading-7 text-text-muted">
                <p className="font-semibold text-text">{order.shippingAddress.receiverName}</p>
                <p>{order.shippingAddress.receiverPhone}</p>
                <p>{order.shippingAddress.addressLine1}</p>
                {order.shippingAddress.addressLine2 ? <p>{order.shippingAddress.addressLine2}</p> : null}
                {order.shippingAddress.city ? <p>{order.shippingAddress.city}</p> : null}
                {order.shippingAddress.township ? <p>{order.shippingAddress.township}</p> : null}
                {order.shippingAddress.stateRegionName ? <p>{order.shippingAddress.stateRegionName}</p> : null}
                {order.shippingAddress.countryName ? <p>{order.shippingAddress.countryName}</p> : null}
                {order.shippingAddress.postalCode ? <p>{order.shippingAddress.postalCode}</p> : null}
              </div>
            </article>
          ) : null}
        </aside>
      </div>
    </StorefrontAccountShell>
  );
}
