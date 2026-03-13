import { AdminOrdersGrid } from "@/components/admin/orders-grid";
import { AdminActionNotice } from "@/components/admin/action-notice";
import { SalesTabs } from "@/components/admin/module-tabs";
import {
  AdminActionButton,
  AdminBadge,
  AdminField,
  AdminFilterGrid,
  AdminLinkButton,
  AdminPage,
  AdminPageHeader,
  AdminPagination,
  AdminPanel,
  AdminSectionHeader,
  AdminSelect,
  AdminSummaryStrip,
  AdminToolbar,
} from "@/components/admin/workspace";
import { requireOperationsUser } from "@/lib/auth/guards";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

type OrdersPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

const ORDER_STATUS_OPTIONS = [
  "",
  "PENDING",
  "AWAITING_PAYMENT",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
];

const PAYMENT_STATUS_OPTIONS = [
  "",
  "UNPAID",
  "PARTIAL",
  "SUBMITTED",
  "CONFIRMED",
  "FAILED",
  "REFUNDED",
];

const FULFILLMENT_STATUS_OPTIONS = [
  "",
  "UNFULFILLED",
  "PARTIAL",
  "PACKING",
  "SHIPPED",
  "DELIVERED",
];

export default async function DashboardOrdersPage({ searchParams }: OrdersPageProps) {
  await requireOperationsUser();
  const resolvedSearchParams = await searchParams;
  const workspace = await adminWorkspaceService.getOrdersWorkspace(resolvedSearchParams);

  return (
    <AdminPage>
      <AdminPageHeader
        title="Orders"
        description="Work the order queue from a full-width operational list, then open dedicated detail pages for payment, delivery, notes, and status workflows."
        actions={
          <AdminLinkButton href="/dashboard/orders/new" tone="primary">
            Create manual order
          </AdminLinkButton>
        }
        meta={<AdminBadge label={`${workspace.total} orders`} tone="sky" />}
      />

      <SalesTabs currentPath="/dashboard/orders" />

      <AdminActionNotice searchParams={resolvedSearchParams} />

      <AdminSummaryStrip
        columns={4}
        items={workspace.metrics.map((metric) => ({
          label: metric.label,
          value: metric.value.toLocaleString("en"),
          hint: metric.hint,
        }))}
      />

      <AdminToolbar>
        <form action="/dashboard/orders" className="space-y-3" method="get">
          <AdminFilterGrid>
            <AdminField
              defaultValue={workspace.filters.query}
              label="Search"
              name="q"
              placeholder="Order no, customer, phone, email"
            />
            <AdminSelect
              defaultValue={workspace.filters.status}
              label="Order status"
              name="status"
              options={ORDER_STATUS_OPTIONS.map((value) => ({
                value,
                label: value || "All statuses",
              }))}
            />
            <AdminSelect
              defaultValue={workspace.filters.paymentStatus}
              label="Payment status"
              name="paymentStatus"
              options={PAYMENT_STATUS_OPTIONS.map((value) => ({
                value,
                label: value || "All payment states",
              }))}
            />
            <AdminSelect
              defaultValue={workspace.filters.fulfillmentStatus}
              label="Fulfillment"
              name="fulfillmentStatus"
              options={FULFILLMENT_STATUS_OPTIONS.map((value) => ({
                value,
                label: value || "All fulfillment states",
              }))}
            />
            <AdminField
              defaultValue={workspace.filters.dateFrom}
              label="Date from"
              name="dateFrom"
              type="date"
            />
            <AdminField
              defaultValue={workspace.filters.dateTo}
              label="Date to"
              name="dateTo"
              type="date"
            />
          </AdminFilterGrid>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <AdminSelect
              defaultValue={workspace.filters.sort}
              label="Sort"
              name="sort"
              options={[
                { value: "newest", label: "Newest first" },
                { value: "oldest", label: "Oldest first" },
                { value: "total_desc", label: "Highest total" },
                { value: "total_asc", label: "Lowest total" },
              ]}
            />
            <input name="page" type="hidden" value="1" />
            <AdminActionButton>Apply filters</AdminActionButton>
            <AdminLinkButton href="/dashboard/orders">Reset</AdminLinkButton>
          </div>
        </form>
      </AdminToolbar>

      <AdminPanel className="min-w-0">
        <AdminSectionHeader
          title="Order queue"
          description="Selection stays available for future batch workflows, while all operational work now opens in dedicated order detail pages."
        />

        <div className="mt-5 space-y-4">
          <AdminOrdersGrid
            rows={workspace.items.map((order) => ({
              id: order.id,
              href: `/dashboard/orders/${order.id}`,
              statusHref: `/dashboard/orders/${order.id}#status`,
              deliveryHref: `/dashboard/orders/${order.id}#delivery`,
              notesHref: `/dashboard/orders/${order.id}#timeline`,
              paymentHref: `/dashboard/orders/${order.id}#payment`,
              orderNo: order.orderNo,
              orderDateLabel: formatDateTime(order.orderDate),
              customerLabel: order.customerName ?? "Outside customer",
              contactLabel:
                order.customerEmail ?? order.customerPhone ?? "No contact saved",
              customerTypeLabel: order.customerId ? "ACCOUNT" : "OUTSIDE",
              status: order.status,
              paymentStatus: order.paymentStatus,
              fulfillmentStatus: order.fulfillmentStatus,
              totalLabel: formatCurrency(order.grandTotal, order.currencyCode),
            }))}
            selectionHint="Selection is available here for future batch workflows. Destructive bulk actions are intentionally disabled on orders."
            selectionInputName="selectedIds"
            selectionLabel="orders"
          />

          <AdminPagination
            hrefBuilder={(page) =>
              adminWorkspaceService.buildHref("/dashboard/orders", resolvedSearchParams, {
                page,
              })
            }
            page={workspace.page}
            totalPages={workspace.totalPages}
          />
        </div>
      </AdminPanel>
    </AdminPage>
  );
}
