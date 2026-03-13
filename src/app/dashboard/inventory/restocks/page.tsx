import {
  createRestockOrderAction,
  receiveRestockOrderAction,
} from "@/app/dashboard/inventory/actions";
import { AdminActionNotice } from "@/components/admin/action-notice";
import { AdminQuickCreateModal } from "@/components/admin/quick-create-modal";
import { AdminRestocksGrid } from "@/components/admin/restocks-grid";
import { AdminRouteOverlay } from "@/components/admin/route-overlay";
import {
  AdminActionButton,
  AdminBadge,
  AdminField,
  AdminFormGrid,
  AdminLinkButton,
  AdminPage,
  AdminPageHeader,
  AdminPagination,
  AdminPanel,
  AdminSectionHeader,
  AdminSelect,
  AdminSummaryStrip,
  AdminTextarea,
  AdminToolbar,
} from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

type InventoryRestocksPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardInventoryRestocksPage({
  searchParams,
}: InventoryRestocksPageProps) {
  await requirePermission(PERMISSIONS.inventoryView);
  const resolvedSearchParams = await searchParams;
  const workspace = await adminWorkspaceService.getRestocksWorkspace(
    resolvedSearchParams,
  );
  const currentHref = adminWorkspaceService.buildHref(
    "/dashboard/inventory/restocks",
    resolvedSearchParams,
    {},
  );
  const closeRestockHref = adminWorkspaceService.buildHref(
    "/dashboard/inventory/restocks",
    resolvedSearchParams,
    { restockId: undefined },
  );

  return (
    <AdminPage>
      <AdminPageHeader
        title="Restocks"
        description="Purchase orders and receiving stay list-first, while opening a restock record now uses an overlay instead of pushing the workflow under the table."
        actions={
          <>
            <AdminQuickCreateModal
              description="Create a restock order without leaving the queue."
              size="xl"
              title="Quick Create Restock Order"
              triggerLabel="Quick create"
            >
              <form action={createRestockOrderAction} className="space-y-4">
                <input name="returnTo" type="hidden" value="/dashboard/inventory/restocks" />
                <AdminSelect
                  label="Supplier"
                  name="sourcingSourceId"
                  options={workspace.sourceOptions}
                />
                <AdminFormGrid columns={2}>
                  <AdminField label="Expected arrival" name="expectedArrivalAt" type="date" />
                  <AdminField
                    label="Source order ref"
                    name="sourceOrderRef"
                    placeholder="Supplier order reference"
                  />
                  <AdminField
                    label="Tracking no"
                    name="trackingNo"
                    placeholder="Inbound tracking number"
                  />
                  <AdminField label="Shipping fee" name="shippingFee" type="number" />
                  <AdminField label="Extra fee" name="extraFee" type="number" />
                </AdminFormGrid>
                <AdminTextarea
                  label="Restock lines"
                  name="restockItems"
                  placeholder="variantId | orderedQty | unitCost | variantSourceId(optional)"
                  rows={6}
                />
                <AdminTextarea label="Note" name="note" rows={3} />
                <AdminActionButton>Create restock order</AdminActionButton>
              </form>
            </AdminQuickCreateModal>
            <AdminLinkButton href="/dashboard/inventory">Open stock</AdminLinkButton>
            <AdminLinkButton href="/dashboard/supplier">Open supplier</AdminLinkButton>
          </>
        }
      />

      <AdminSummaryStrip
        columns={4}
        items={workspace.metrics.map((metric) => ({
          label: metric.label,
          value: metric.value.toLocaleString("en"),
          hint: metric.hint,
        }))}
      />

      <AdminActionNotice searchParams={resolvedSearchParams} />

      <AdminToolbar>
        <form action="/dashboard/inventory/restocks" className="space-y-4" method="get">
          <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr_0.8fr_auto]">
            <AdminField
              defaultValue={workspace.filters.query}
              label="Search"
              name="q"
              placeholder="Restock no, supplier, tracking no, source ref"
            />
            <AdminSelect
              defaultValue={workspace.filters.status}
              label="Status"
              name="status"
              options={[
                { value: "", label: "All statuses" },
                { value: "DRAFT", label: "DRAFT" },
                { value: "ORDERED", label: "ORDERED" },
                { value: "PAID", label: "PAID" },
                { value: "IN_TRANSIT", label: "IN_TRANSIT" },
                { value: "PARTIALLY_RECEIVED", label: "PARTIALLY_RECEIVED" },
                { value: "RECEIVED", label: "RECEIVED" },
                { value: "CANCELLED", label: "CANCELLED" },
              ]}
            />
            <AdminSelect
              defaultValue={workspace.filters.sort}
              label="Sort"
              name="sort"
              options={[
                { value: "newest", label: "Newest first" },
                { value: "oldest", label: "Oldest first" },
                { value: "eta_desc", label: "Latest ETA" },
                { value: "eta_asc", label: "Earliest ETA" },
              ]}
            />
            <div className="flex items-end gap-3">
              <input name="page" type="hidden" value="1" />
              <AdminActionButton>Apply</AdminActionButton>
              <AdminLinkButton href="/dashboard/inventory/restocks">Reset</AdminLinkButton>
            </div>
          </div>
        </form>
      </AdminToolbar>

      <AdminPanel>
        <AdminSectionHeader
          title="Restock orders"
          description="Keep the inbound queue primary. Click a restock order to open receiving and line review in an overlay while the queue state stays intact."
        />
        <div className="mt-5 space-y-4">
          <AdminRestocksGrid
            rows={workspace.items.map((order) => ({
              id: order.id,
              href: adminWorkspaceService.buildHref(
                "/dashboard/inventory/restocks",
                resolvedSearchParams,
                { restockId: order.id },
              ),
              restockNo: order.restockNo,
              createdAtLabel: `Created ${formatDateTime(order.createdAt)}`,
              sourceName: order.sourceName ?? "No supplier",
              status: order.status,
              etaLabel: formatDateTime(order.expectedArrivalAt),
              totalLabel: formatCurrency(order.grandTotal, "MMK"),
            }))}
            selectionHint="Selection is available here for future batch workflows. Destructive bulk actions are intentionally disabled."
            selectionInputName="selectedIds"
            selectionLabel="restock orders"
          />

          <AdminPagination
            hrefBuilder={(page) =>
              adminWorkspaceService.buildHref(
                "/dashboard/inventory/restocks",
                resolvedSearchParams,
                { page },
              )
            }
            page={workspace.page}
            totalPages={workspace.totalPages}
          />
        </div>
      </AdminPanel>

      {workspace.selectedRestock ? (
        <AdminRouteOverlay
          closeHref={closeRestockHref}
          description={workspace.selectedRestock.sourceName ?? "Supplier"}
          title={workspace.selectedRestock.restockNo}
        >
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Status</p>
                <div className="mt-2">
                  <AdminBadge label={workspace.selectedRestock.status} tone="sky" />
                </div>
              </div>
              <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-stone-500">ETA</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">
                  {formatDateTime(workspace.selectedRestock.expectedArrivalAt)}
                </p>
              </div>
              <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Grand total</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">
                  {formatCurrency(workspace.selectedRestock.grandTotal, "MMK")}
                </p>
              </div>
            </div>

            <form action={receiveRestockOrderAction} className="space-y-4">
              <input name="restockOrderId" type="hidden" value={workspace.selectedRestock.id} />
              <input name="returnTo" type="hidden" value={currentHref} />
              {workspace.selectedRestock.items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{item.productName}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.sku} / Ordered {item.orderedQty} / Received {item.receivedQty} /
                        Rejected {item.rejectedQty}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-slate-950">
                      {formatCurrency(item.unitCost, "MMK")}
                    </p>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <AdminField
                      label="Receive qty"
                      name={`receivedQty_${item.id}`}
                      type="number"
                    />
                    <AdminField
                      label="Reject qty"
                      name={`rejectedQty_${item.id}`}
                      type="number"
                    />
                  </div>
                </div>
              ))}
              <AdminActionButton tone="emerald">Receive items</AdminActionButton>
            </form>
          </div>
        </AdminRouteOverlay>
      ) : null}
    </AdminPage>
  );
}
