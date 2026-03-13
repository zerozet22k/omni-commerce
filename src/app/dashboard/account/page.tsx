import Link from "next/link";

import { AccountTabs } from "@/components/admin/module-tabs";
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
import {
  formatCompactNumber,
  formatCurrency,
  formatDateTime,
} from "@/lib/utils/format";
import { dashboardService } from "@/modules/dashboard/dashboard.service";

export default async function DashboardAccountPage() {
  const user = await requirePermission(PERMISSIONS.accountView);

  if (user.role !== "CUSTOMER") {
    const quickLinks = [
      user.permissions.includes(PERMISSIONS.ordersView)
        ? { href: "/dashboard/orders", label: "Orders" }
        : null,
      user.permissions.includes(PERMISSIONS.catalogView)
        ? { href: "/dashboard/catalog", label: "Catalog" }
        : null,
      user.permissions.includes(PERMISSIONS.inventoryView)
        ? { href: "/dashboard/inventory", label: "Inventory" }
        : null,
      user.permissions.includes(PERMISSIONS.inventoryView)
        ? { href: "/dashboard/supplier", label: "Supplier" }
        : null,
      user.permissions.includes(PERMISSIONS.usersManage)
        ? { href: "/dashboard/users", label: "Users" }
        : null,
      user.permissions.includes(PERMISSIONS.settingsManage)
        ? { href: "/dashboard/settings", label: "Settings" }
        : null,
    ].filter((item): item is { href: string; label: string } => item !== null);

    return (
      <AdminPage>
        <AdminPageHeader
          title="Account"
          description="Signed-in operator details and access scope."
          meta={<AdminBadge label={user.role} tone="sky" />}
        />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <AdminPanel>
            <AdminSectionHeader title="Signed-in record" />
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Full name</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">{user.fullName}</p>
              </div>
              <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Email</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">
                  {user.email ?? "Not provided"}
                </p>
              </div>
              <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Phone</p>
                <p className="mt-2 text-sm text-slate-700">{user.phone ?? "Not provided"}</p>
              </div>
              <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Role</p>
                <div className="mt-2">
                  <AdminBadge label={user.role} tone="sky" />
                </div>
              </div>
              <div className="rounded-[1rem] border border-stone-200 bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Last login</p>
                <p className="mt-2 text-sm text-slate-700">{formatDateTime(user.lastLoginAt)}</p>
              </div>
              <div className="rounded-[1rem] border border-stone-200 bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Joined</p>
                <p className="mt-2 text-sm text-slate-700">{formatDateTime(user.createdAt)}</p>
              </div>
              <div className="rounded-[1rem] border border-stone-200 bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Email state</p>
                <div className="mt-2">
                  <AdminBadge
                    label={user.emailVerified ? "VERIFIED" : "PENDING"}
                    tone={user.emailVerified ? "emerald" : "amber"}
                  />
                </div>
              </div>
              <div className="rounded-[1rem] border border-stone-200 bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Account state</p>
                <div className="mt-2">
                  <AdminBadge
                    label={user.isActive ? "ACTIVE" : "INACTIVE"}
                    tone={user.isActive ? "emerald" : "rose"}
                  />
                </div>
              </div>
            </div>
          </AdminPanel>

          <div className="space-y-4">
            <AdminPanel>
              <AdminSectionHeader title="Access scope" />
              <div className="mt-4 flex flex-wrap gap-2">
                {user.permissions.map((permission) => (
                  <AdminBadge key={permission} label={permission} tone="slate" />
                ))}
              </div>
            </AdminPanel>

            <AdminPanel>
              <AdminSectionHeader title="Quick links" />
              {quickLinks.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-3">
                  {quickLinks.map((link) => (
                    <AdminLinkButton key={link.href} href={link.href}>
                      {link.label}
                    </AdminLinkButton>
                  ))}
                </div>
              ) : (
                <div className="mt-4">
                  <AdminEmptyState
                    title="No extra shortcuts"
                    body="This account only has access to the routes shown in the sidebar."
                  />
                </div>
              )}
            </AdminPanel>
          </div>
        </div>
      </AdminPage>
    );
  }

  const [data, shell] = await Promise.all([
    dashboardService.getAccountPageData(user),
    dashboardService.getShellData(user),
  ]);

  return (
    <AdminPage>
      <AdminPageHeader
        title="My account"
        description="Profile details, customer totals, and recent order activity."
        meta={<AdminBadge label="CUSTOMER" tone="sky" />}
      />

      <AccountTabs currentPath="/dashboard/account" />

      <AdminSummaryStrip
        columns={3}
        items={data.metrics.map((metric) => ({
          label: metric.label,
          value: formatCompactNumber(metric.value),
          hint: metric.hint,
        }))}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <AdminPanel>
          <AdminSectionHeader title="Profile" />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Full name</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">{user.fullName}</p>
            </div>
            <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Email</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">
                {user.email ?? "Not provided"}
              </p>
            </div>
            <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Phone</p>
              <p className="mt-2 text-sm text-slate-700">{user.phone ?? "Not provided"}</p>
            </div>
            <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Email state</p>
              <div className="mt-2">
                <AdminBadge
                  label={user.emailVerified ? "VERIFIED" : "PENDING"}
                  tone={user.emailVerified ? "emerald" : "amber"}
                />
              </div>
            </div>
            <div className="rounded-[1rem] border border-stone-200 bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Joined</p>
              <p className="mt-2 text-sm text-slate-700">{formatDateTime(user.createdAt)}</p>
            </div>
            <div className="rounded-[1rem] border border-stone-200 bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Last login</p>
              <p className="mt-2 text-sm text-slate-700">{formatDateTime(user.lastLoginAt)}</p>
            </div>
            <div className="rounded-[1rem] border border-stone-200 bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Preferred language</p>
              <p className="mt-2 text-sm text-slate-700">
                {data.profile?.preferredLanguage ?? "System default"}
              </p>
            </div>
            <div className="rounded-[1rem] border border-stone-200 bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Marketing</p>
              <p className="mt-2 text-sm text-slate-700">
                {data.profile?.marketingOptIn ? "Opted in" : "Not subscribed"}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-[1rem] border border-stone-200 bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Total spent</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">
                {formatCurrency(data.profile?.totalSpent ?? 0, shell.currencyCode)}
              </p>
            </div>
            <div className="rounded-[1rem] border border-stone-200 bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Total orders</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">
                {formatCompactNumber(data.profile?.totalOrders ?? 0)}
              </p>
            </div>
            <div className="rounded-[1rem] border border-stone-200 bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Loyalty points</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">
                {formatCompactNumber(data.profile?.loyaltyPoints ?? 0)}
              </p>
            </div>
          </div>
        </AdminPanel>

        <AdminPanel>
          <AdminSectionHeader
            title="Recent orders"
            actions={<AdminLinkButton href="/dashboard/account/orders">View all</AdminLinkButton>}
          />
          <div className="mt-4 space-y-3">
            {data.recentOrders.length > 0 ? (
              data.recentOrders.map((order) => (
                <Link
                  key={order.id}
                  className="block rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3 transition hover:bg-white"
                  href={`/dashboard/account/orders?orderId=${order.id}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{order.orderNo}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDateTime(order.orderDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <AdminBadge label={order.status} tone="sky" />
                      <span className="text-sm font-semibold text-slate-950">
                        {formatCurrency(order.grandTotal, shell.currencyCode)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <AdminEmptyState
                title="No recent orders"
                body="Orders connected to this account will appear here."
              />
            )}
          </div>
        </AdminPanel>
      </div>
    </AdminPage>
  );
}
