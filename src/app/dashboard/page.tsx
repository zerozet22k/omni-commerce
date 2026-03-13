import Link from "next/link";

import {
  AdminBadge,
  AdminEmptyState,
  AdminLinkButton,
  AdminPage,
  AdminPageHeader,
  AdminPanel,
  AdminSectionHeader,
  AdminSummaryStrip,
} from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import { dashboardService } from "@/modules/dashboard/dashboard.service";

export default async function DashboardPage() {
  const user = await requirePermission(PERMISSIONS.dashboardView);
  const overview = await dashboardService.getOverviewData(user);

  const recentOrders = overview.recentOrders.slice(0, 6);

  const formatMetricValue = (label: string, value: number) => {
    if (label.toLowerCase().includes("revenue")) {
      return formatCurrency(value, overview.shell.currencyCode);
    }

    return value.toLocaleString("en");
  };

  return (
    <AdminPage>
      <AdminPageHeader
        title={overview.mode === "operations" ? "Overview" : "My dashboard"}
        description={
          overview.mode === "operations"
            ? "A practical operational view for current orders, stock pressure, restocks, and recent activity."
            : "Keep your recent orders, account status, and shopping activity in one customer dashboard."
        }
      />

      <AdminSummaryStrip
        columns={4}
        items={overview.metrics.map((metric) => ({
          label: metric.label,
          value: formatMetricValue(metric.label, metric.value),
          hint: metric.hint,
        }))}
      />

      {overview.mode === "operations" ? (
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          {(() => {
            if (overview.mode !== "operations") return null;
            const lowStockVariants = overview.lowStockVariants.slice(0, 5);
            const recentRestocks = overview.recentRestocks.slice(0, 3);
            const recentActivity = overview.recentActivity.slice(0, 3);
            return (
              <>
                <AdminPanel>
                  <AdminSectionHeader
                    title="Current order flow"
                    description="Recent orders stay central so the overview behaves like an actual operations screen."
                  />

                  <div className="mt-4 space-y-3">
                    {recentOrders.length > 0 ? (
                      recentOrders.map((order) => (
                        <Link
                          key={order.id}
                          href={`/dashboard/orders/${order.id}`}
                          className="group block rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 transition hover:border-stone-300 hover:bg-white hover:shadow-sm"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-950 transition group-hover:text-slate-900">
                          {order.orderNo}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {order.customerName ?? "Customer"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDateTime(order.orderDate)}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <AdminBadge label={order.status} tone="slate" />
                        <AdminBadge label={order.paymentStatus} tone="amber" />
                        <AdminBadge label={order.fulfillmentStatus} tone="sky" />
                        <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-sm font-semibold text-slate-950">
                          {formatCurrency(order.grandTotal, overview.shell.currencyCode)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <AdminEmptyState
                  title="No recent orders"
                  body="Orders that need attention will appear here."
                />
              )}
            </div>
          </AdminPanel>

          <div className="space-y-4">
            <AdminPanel>
              <AdminSectionHeader
                title="Stock watch"
                description="Variants nearing threshold stay visible here."
              />

              <div className="mt-4 space-y-3">
                {lowStockVariants.length > 0 ? (
                  lowStockVariants.map((variant) => (
                    <Link
                      key={variant.id}
                      href={`/dashboard/inventory?variantId=${variant.id}`}
                      className="group block rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 transition hover:border-stone-300 hover:bg-white hover:shadow-sm"
                    >
                      <p className="font-semibold text-slate-900">
                        {variant.productName}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {variant.variantName ?? variant.sku}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                        <span className="text-slate-700">
                          Available {variant.availableQty}
                        </span>
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          Threshold {variant.lowStockThreshold}
                        </span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <AdminEmptyState
                    title="No low stock alerts"
                    body="Variants that need replenishment will appear here."
                  />
                )}
              </div>
            </AdminPanel>

            <AdminPanel>
              <AdminSectionHeader
                title="Restocks and activity"
                description="Recent intake and operational events are grouped together."
              />

              <div className="mt-4 space-y-4">
                {recentRestocks.length === 0 && recentActivity.length === 0 ? (
                  <AdminEmptyState
                    title="No recent activity"
                    body="Restocks and operational events will appear here."
                  />
                ) : (
                  <>
                    {recentRestocks.length > 0 ? (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                          Recent restocks
                        </p>
                        <div className="space-y-3">
                          {recentRestocks.map((restock) => (
                            <Link
                              key={restock.id}
                              href={`/dashboard/inventory/restocks?restockId=${restock.id}`}
                              className="block rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 transition hover:border-stone-300 hover:bg-white hover:shadow-sm"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <p className="font-semibold text-slate-900">
                                  {restock.restockNo}
                                </p>
                                <AdminBadge label={restock.status} tone="sky" />
                              </div>
                              <p className="mt-2 text-sm text-slate-700">
                                {formatCurrency(restock.grandTotal, overview.shell.currencyCode)}
                              </p>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {recentActivity.length > 0 ? (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                          Recent activity
                        </p>
                        <div className="space-y-3">
                          {recentActivity.map((activity) => (
                            <div
                              key={activity.id}
                              className="rounded-2xl border border-stone-200 bg-white px-4 py-3"
                            >
                              <p className="font-semibold text-slate-900">
                                {activity.action}
                              </p>
                              <p className="mt-1 text-sm text-slate-600">
                                {activity.entityType}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {formatDateTime(activity.createdAt)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </AdminPanel>
          </div>
              </>
            );
          })()}
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <AdminPanel>
            <AdminSectionHeader
              title="Recent orders"
              description="Your latest orders, payment state, and delivery progress."
              actions={
                <AdminLinkButton href="/dashboard/account/orders">View all orders</AdminLinkButton>
              }
            />

            <div className="mt-4 space-y-3">
              {recentOrders.length > 0 ? (
                recentOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/dashboard/account/orders?orderId=${order.id}`}
                    className="block rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 transition hover:border-stone-300 hover:bg-white hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{order.orderNo}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDateTime(order.orderDate)}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-950">
                          {formatCurrency(order.grandTotal, overview.shell.currencyCode)}
                        </p>
                        <div className="mt-2 flex justify-end">
                          <AdminBadge label={order.status} tone="slate" />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <AdminEmptyState
                  title="No recent orders"
                  body="Orders connected to your account will appear here."
                />
              )}
            </div>
          </AdminPanel>

          <div className="space-y-4">
            <AdminPanel>
              <AdminSectionHeader
                title="Recently viewed"
                description="Products you checked most recently from this account."
              />

              <div className="mt-4 space-y-3">
                {overview.recentViews.length > 0 ? (
                  overview.recentViews.map((product) => (
                    <div
                      key={product.id}
                      className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3"
                    >
                      <p className="font-semibold text-slate-900">{product.productName}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Viewed {formatDateTime(product.viewedAt)}
                      </p>
                    </div>
                  ))
                ) : (
                  <AdminEmptyState
                    title="No recent product activity"
                    body="Products you browse in the storefront will appear here."
                  />
                )}
              </div>
            </AdminPanel>

            <AdminPanel>
              <AdminSectionHeader
                title="Account state"
                description="Customer profile checks that matter at a glance."
              />

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                    Email
                  </p>
                  <div className="mt-2">
                    <AdminBadge
                      label={overview.account.emailVerified ? "Verified" : "Pending verification"}
                      tone={overview.account.emailVerified ? "sky" : "amber"}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                    Total spent
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {formatCurrency(overview.account.totalSpent, overview.shell.currencyCode)}
                  </p>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                    Last login
                  </p>
                  <p className="mt-2 text-sm text-slate-700">
                    {overview.account.lastLoginAt
                      ? formatDateTime(overview.account.lastLoginAt)
                      : "No sign-in recorded"}
                  </p>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                    Orders
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {overview.metrics
                      .find((metric) => metric.label.toLowerCase().includes("order"))
                      ?.value.toLocaleString("en") ?? "0"}
                  </p>
                </div>
              </div>
            </AdminPanel>
          </div>
        </div>
      )}
    </AdminPage>
  );
}
