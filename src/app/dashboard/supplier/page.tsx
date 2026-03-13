import { bulkSupplierAction } from "@/app/dashboard/inventory/actions";
import { AdminActionNotice } from "@/components/admin/action-notice";
import { SupplierRecordForm } from "@/components/admin/supplier-forms";
import { SupplierTabs } from "@/components/admin/module-tabs";
import { AdminQuickCreateModal } from "@/components/admin/quick-create-modal";
import { AdminSuppliersGrid } from "@/components/admin/supplier-grid";
import {
  AdminActionButton,
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
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { formatDateTime } from "@/lib/utils/format";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

type SupplierPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardSupplierPage({
  searchParams,
}: SupplierPageProps) {
  await requirePermission(PERMISSIONS.inventoryView);
  const resolvedSearchParams = await searchParams;
  const workspace = await adminWorkspaceService.getSupplierWorkspace(
    resolvedSearchParams,
  );
  const currentHref = adminWorkspaceService.buildHref(
    "/dashboard/supplier",
    resolvedSearchParams,
    {},
  );

  return (
    <AdminPage>
      <AdminPageHeader
        title="Suppliers"
        description="Manage source records as operational purchasing data with shared filtering, activation controls, and dedicated edit routes."
        actions={
          <>
            <AdminQuickCreateModal
              description="Add a supplier without leaving the list."
              title="Quick Create Supplier"
              triggerLabel="Quick create"
            >
              <SupplierRecordForm
                platformOptions={workspace.platformOptions}
                returnTo="/dashboard/supplier"
              />
            </AdminQuickCreateModal>
            <AdminLinkButton href="/dashboard/supplier/new" tone="primary">
              Create new supplier
            </AdminLinkButton>
          </>
        }
      />

      <SupplierTabs currentPath="/dashboard/supplier" />

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
        <form action="/dashboard/supplier" className="space-y-4" method="get">
          <AdminFilterGrid className="2xl:grid-cols-5">
            <AdminField
              defaultValue={workspace.filters.query}
              label="Search"
              name="q"
              placeholder="Supplier, contact, email, phone"
            />
            <AdminSelect
              defaultValue={workspace.filters.platformId}
              label="Platform"
              name="platformId"
              options={[
                { value: "", label: "All platforms" },
                ...workspace.platformOptions,
              ]}
            />
            <AdminSelect
              defaultValue={workspace.filters.active}
              label="State"
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
                { value: "updated", label: "Recently updated" },
                { value: "name_asc", label: "Name A-Z" },
                { value: "name_desc", label: "Name Z-A" },
              ]}
            />
            <div className="flex items-end gap-3">
              <input name="page" type="hidden" value="1" />
              <AdminActionButton>Apply filters</AdminActionButton>
              <AdminLinkButton href="/dashboard/supplier">Reset</AdminLinkButton>
            </div>
          </AdminFilterGrid>
        </form>
      </AdminToolbar>

      <AdminPanel className="min-w-0">
        <AdminSectionHeader
          title="Supplier records"
          description={`${workspace.total} suppliers matched the current filters. Activation changes are safe to run in bulk, while delete stays a dedicated record workflow.`}
        />

        <form action={bulkSupplierAction} className="mt-5 space-y-4">
          <input name="returnTo" type="hidden" value={currentHref} />

          <AdminSuppliersGrid
            bulkActions={[
              { label: "Activate selected", tone: "emerald", value: "activate" },
              { label: "Deactivate selected", tone: "amber", value: "deactivate" },
            ]}
            emptyStateBody="Try a broader search or create a new supplier."
            emptyStateTitle="No suppliers found"
            rows={workspace.items.map((item) => ({
              id: item.id,
              href: `/dashboard/supplier/${item.id}`,
              linksHref: `/dashboard/supplier/links?sourceId=${item.id}`,
              sourceName: item.sourceName,
              updatedAtLabel: `Updated ${formatDateTime(item.updatedAt)}`,
              platformName: item.platformName ?? "No platform",
              contactLabel: item.contactName ?? item.email ?? item.phone ?? "No contact",
              isActive: item.isActive,
              variantSourceCountLabel: `${item.variantSourceCount.toLocaleString("en")} links`,
            }))}
            selectionHint="Bulk supplier actions only change activation state. Delete stays a dedicated record workflow."
            selectionInputName="selectedIds"
            selectionLabel="suppliers"
          />

          <AdminPagination
            hrefBuilder={(page) =>
              adminWorkspaceService.buildHref("/dashboard/supplier", resolvedSearchParams, {
                page,
              })
            }
            page={workspace.page}
            totalPages={workspace.totalPages}
          />
        </form>
      </AdminPanel>
    </AdminPage>
  );
}
