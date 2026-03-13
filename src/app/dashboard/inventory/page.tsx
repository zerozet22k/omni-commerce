import {
  bulkInventoryAction,
  createStockAdjustmentAction,
  updateVariantInventoryAction,
} from "@/app/dashboard/inventory/actions";
import { AdminActionNotice } from "@/components/admin/action-notice";
import { AdminInventoryGrid } from "@/components/admin/inventory-grid";
import { AdminRouteOverlay } from "@/components/admin/route-overlay";
import {
  AdminActionButton,
  AdminBadge,
  AdminField,
  AdminFilterGrid,
  AdminInlineHint,
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

type InventoryPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardInventoryPage({
  searchParams,
}: InventoryPageProps) {
  await requirePermission(PERMISSIONS.inventoryView);
  const resolvedSearchParams = await searchParams;
  const workspace = await adminWorkspaceService.getInventoryWorkspace(
    resolvedSearchParams,
  );
  const currentHref = adminWorkspaceService.buildHref(
    "/dashboard/inventory",
    resolvedSearchParams,
    {},
  );
  const closeVariantHref = adminWorkspaceService.buildHref(
    "/dashboard/inventory",
    resolvedSearchParams,
    { variantId: undefined },
  );

  return (
    <AdminPage>
      <AdminPageHeader
        title="Inventory"
        description="Review stock, monitor low inventory, and open variant correction workflows in an overlay instead of dropping forms under the table."
        actions={
          <>
            <AdminLinkButton href="/dashboard/inventory/restocks">
              Open restocks
            </AdminLinkButton>
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
        <form action="/dashboard/inventory" className="space-y-4" method="get">
          <AdminFilterGrid>
            <AdminField
              defaultValue={workspace.filters.query}
              label="Search"
              name="q"
              placeholder="Product, SKU, variant"
            />
            <AdminSelect
              defaultValue={workspace.filters.stockView}
              label="Stock view"
              name="stockView"
              options={[
                { value: "all", label: "All stock" },
                { value: "low", label: "Low stock" },
                { value: "out", label: "Out of stock" },
              ]}
            />
            <AdminSelect
              defaultValue={workspace.filters.active}
              label="Active"
              name="active"
              options={[
                { value: "active", label: "Active only" },
                { value: "inactive", label: "Inactive only" },
                { value: "all", label: "All states" },
              ]}
            />
            <AdminSelect
              defaultValue={workspace.filters.sort}
              label="Sort"
              name="sort"
              options={[
                { value: "available_asc", label: "Lowest available" },
                { value: "available_desc", label: "Highest available" },
                { value: "stock_desc", label: "Highest stock" },
                { value: "updated", label: "Recently updated" },
              ]}
            />
          </AdminFilterGrid>
          <div className="flex flex-wrap gap-3">
            <input name="page" type="hidden" value="1" />
            <AdminActionButton>Apply filters</AdminActionButton>
            <AdminLinkButton href="/dashboard/inventory">Reset</AdminLinkButton>
          </div>
        </form>
      </AdminToolbar>

      <AdminPanel>
        <AdminSectionHeader
          title="Variant stock list"
          description="Keep the stock table primary. Click a variant to open its stock correction and supplier context in an overlay while filters, pagination, and row selection stay intact."
        />
        <form action={bulkInventoryAction} className="mt-5 space-y-4">
          <input name="returnTo" type="hidden" value={currentHref} />

          <AdminInventoryGrid
            bulkActions={[
              { label: "Activate selected", tone: "emerald", value: "activate" },
              { label: "Deactivate selected", tone: "amber", value: "deactivate" },
            ]}
            rows={workspace.items.map((item) => ({
              id: item.id,
              href: adminWorkspaceService.buildHref("/dashboard/inventory", resolvedSearchParams, {
                variantId: item.id,
              }),
              productName: item.productName,
              variantLabel: item.variantName ?? item.sku,
              availableLabel: item.availableQty.toLocaleString("en"),
              stockLabel: `Stock ${item.stockQty.toLocaleString("en")} / Reserved ${item.reservedQty.toLocaleString("en")}`,
              thresholdLabel: item.lowStockThreshold.toLocaleString("en"),
              supplierCountLabel: item.sourceCount.toLocaleString("en"),
              isActive: item.isActive,
              isLow: item.availableQty <= item.lowStockThreshold,
            }))}
            selectionHint="Bulk inventory actions only change variant activation state. Stock values remain explicit row-level edits."
            selectionInputName="selectedIds"
            selectionLabel="variants"
          />

          <AdminPagination
            hrefBuilder={(page) =>
              adminWorkspaceService.buildHref("/dashboard/inventory", resolvedSearchParams, {
                page,
              })
            }
            page={workspace.page}
            totalPages={workspace.totalPages}
          />
        </form>
      </AdminPanel>

      {workspace.selectedVariant ? (
        <AdminRouteOverlay
          closeHref={closeVariantHref}
          description={workspace.selectedVariant.productName}
          title={workspace.selectedVariant.variantName ?? workspace.selectedVariant.sku}
        >
          <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <AdminLinkButton
                  href={`/dashboard/supplier/links/new?variantId=${workspace.selectedVariant.id}`}
                >
                  Add supplier link
                </AdminLinkButton>
                <AdminLinkButton
                  href={`/dashboard/catalog/products/${workspace.selectedVariant.productId}/variants`}
                >
                  Open product variants
                </AdminLinkButton>
              </div>

              <form action={updateVariantInventoryAction} className="space-y-4">
                <input name="variantId" type="hidden" value={workspace.selectedVariant.id} />
                <input name="returnTo" type="hidden" value={currentHref} />
                <div className="grid gap-3 md:grid-cols-2">
                  <AdminField
                    defaultValue={workspace.selectedVariant.stockQty}
                    label="Stock qty"
                    name="stockQty"
                    type="number"
                  />
                  <AdminField
                    defaultValue={workspace.selectedVariant.lowStockThreshold}
                    label="Low stock threshold"
                    name="lowStockThreshold"
                    type="number"
                  />
                </div>
                <label className="flex items-center gap-3 text-sm text-slate-700">
                  <input
                    defaultChecked={workspace.selectedVariant.isActive}
                    name="isActive"
                    type="checkbox"
                  />
                  Active
                </label>
                <AdminTextarea
                  label="Inventory note"
                  name="inventoryNote"
                  placeholder="Reason for direct stock correction"
                  rows={3}
                />
                <AdminActionButton tone="sky">Save stock values</AdminActionButton>
              </form>

              <form action={createStockAdjustmentAction} className="space-y-4">
                <input name="variantId" type="hidden" value={workspace.selectedVariant.id} />
                <input name="returnTo" type="hidden" value={currentHref} />
                <div className="grid gap-3 md:grid-cols-2">
                  <AdminSelect
                    label="Adjustment type"
                    name="adjustmentType"
                    options={[
                      { value: "MANUAL_ADD", label: "MANUAL_ADD" },
                      { value: "MANUAL_DEDUCT", label: "MANUAL_DEDUCT" },
                      { value: "DAMAGE", label: "DAMAGE" },
                      { value: "RETURN_IN", label: "RETURN_IN" },
                      { value: "CORRECTION", label: "CORRECTION" },
                    ]}
                  />
                  <AdminField label="Quantity" name="quantity" type="number" />
                </div>
                <AdminTextarea label="Adjustment note" name="note" rows={3} />
                <AdminActionButton>Create stock adjustment</AdminActionButton>
              </form>
            </div>

            <div className="space-y-4">
              <AdminSectionHeader title="Current supplier links" />
              {workspace.selectedVariant.sources.length > 0 ? (
                workspace.selectedVariant.sources.map((source) => (
                  <div
                    key={source.id}
                    className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <a
                        className="font-medium text-slate-900 underline-offset-2 hover:underline"
                        href={source.sourceProductUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {source.sourceName}
                      </a>
                      <div className="flex flex-wrap gap-2">
                        {source.isPreferred ? (
                          <AdminBadge label="PREFERRED" tone="sky" />
                        ) : null}
                        <AdminBadge
                          label={source.isActive ? "ACTIVE" : "INACTIVE"}
                          tone={source.isActive ? "emerald" : "rose"}
                        />
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {source.sourceSku ?? "No source SKU"} /{" "}
                      {source.sourcePrice !== null
                        ? formatCurrency(source.sourcePrice, "MMK")
                        : "No source price"}
                    </p>
                  </div>
                ))
              ) : (
                <AdminInlineHint tone="sky">
                  No supplier links are attached to this variant yet.
                </AdminInlineHint>
              )}

              <AdminPanel className="border border-stone-200 bg-stone-50">
                <AdminSectionHeader title="Variant snapshot" />
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-[1rem] border border-stone-200 bg-white px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-stone-500">
                      SKU
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      {workspace.selectedVariant.sku}
                    </p>
                  </div>
                  <div className="rounded-[1rem] border border-stone-200 bg-white px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-stone-500">
                      Available
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      {workspace.selectedVariant.availableQty.toLocaleString("en")}
                    </p>
                  </div>
                  <div className="rounded-[1rem] border border-stone-200 bg-white px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-stone-500">
                      Reserved
                    </p>
                    <p className="mt-2 text-sm text-slate-700">
                      {workspace.selectedVariant.reservedQty.toLocaleString("en")}
                    </p>
                  </div>
                  <div className="rounded-[1rem] border border-stone-200 bg-white px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-stone-500">
                      Threshold
                    </p>
                    <p className="mt-2 text-sm text-slate-700">
                      {workspace.selectedVariant.lowStockThreshold.toLocaleString("en")}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                    Recent adjustments
                  </p>
                  <div className="mt-3 space-y-2">
                    {workspace.selectedVariant.adjustments.length > 0 ? (
                      workspace.selectedVariant.adjustments.map((adjustment) => (
                        <div
                          key={adjustment.id}
                          className="rounded-[0.9rem] border border-stone-200 bg-white px-3 py-2 text-sm text-slate-700"
                        >
                          <span className="font-semibold text-slate-950">
                            {adjustment.adjustmentType}
                          </span>{" "}
                          {adjustment.quantity > 0 ? "+" : ""}
                          {adjustment.quantity} / {formatDateTime(adjustment.createdAt)}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-600">No adjustments logged yet.</p>
                    )}
                  </div>
                </div>
              </AdminPanel>
            </div>
          </div>
        </AdminRouteOverlay>
      ) : null}
    </AdminPage>
  );
}
