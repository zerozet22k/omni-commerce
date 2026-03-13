import { AdminActionNotice } from "@/components/admin/action-notice";
import { bulkOptionTypeAction } from "@/app/dashboard/catalog/actions";
import { OptionTypeForm } from "@/components/admin/catalog-forms";
import { CatalogTabs } from "@/components/admin/module-tabs";
import { AdminOptionTypesGrid } from "@/components/admin/option-types-grid";
import { AdminQuickCreateModal } from "@/components/admin/quick-create-modal";
import {
  AdminActionButton,
  AdminField,
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
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

type OptionTypesPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardCatalogOptionTypesPage({
  searchParams,
}: OptionTypesPageProps) {
  await requirePermission(PERMISSIONS.catalogView);
  const resolvedSearchParams = await searchParams;
  const workspace = await adminWorkspaceService.getOptionTypesWorkspace(
    resolvedSearchParams,
  );
  const currentHref = adminWorkspaceService.buildHref(
    "/dashboard/catalog/option-types",
    resolvedSearchParams,
    {},
  );

  return (
    <AdminPage>
      <AdminPageHeader
        actions={
          <>
            <AdminQuickCreateModal
              description="Create an option type without leaving the list."
              title="Quick Create Option Type"
              triggerLabel="Quick create"
            >
              <OptionTypeForm returnTo="/dashboard/catalog/option-types" />
            </AdminQuickCreateModal>
            <AdminLinkButton href="/dashboard/catalog/option-types/new" tone="primary">
              Create new option type
            </AdminLinkButton>
          </>
        }
        title="Option Types"
        description="Manage reusable variant structures with dedicated detail routes for values, ordering, and reuse across products."
      />

      <CatalogTabs currentPath="/dashboard/catalog/option-types" />

      <AdminActionNotice searchParams={resolvedSearchParams} />

      <AdminSummaryStrip
        columns={3}
        items={workspace.metrics.map((metric) => ({
          label: metric.label,
          value: metric.value.toLocaleString("en"),
          hint: metric.hint,
        }))}
      />

      <AdminToolbar>
        <form action="/dashboard/catalog/option-types" className="space-y-4" method="get">
          <div className="grid gap-3 md:grid-cols-[1.2fr_0.7fr_auto]">
            <AdminField
              defaultValue={workspace.filters.query}
              label="Search"
              name="q"
              placeholder="Option type name"
            />
            <AdminSelect
              defaultValue={workspace.filters.sort}
              label="Sort"
              name="sort"
              options={[
                { value: "name_asc", label: "Name A-Z" },
                { value: "name_desc", label: "Name Z-A" },
                { value: "display", label: "Display type" },
              ]}
            />
            <div className="flex items-end gap-3">
              <input name="page" type="hidden" value="1" />
              <AdminActionButton>Apply</AdminActionButton>
              <AdminLinkButton href="/dashboard/catalog/option-types">Reset</AdminLinkButton>
            </div>
          </div>
        </form>
      </AdminToolbar>

      <AdminPanel>
        <AdminSectionHeader
          title="Option Types"
          description={`${workspace.total} option types matched the current filters. Safe delete is blocked when any selected type is still in use.`}
        />
        <form action={bulkOptionTypeAction} className="mt-5 space-y-4">
          <input name="returnTo" type="hidden" value={currentHref} />

          <AdminOptionTypesGrid
            bulkActions={[{ label: "Delete selected", tone: "rose", value: "delete" }]}
            rows={workspace.items.map((item) => ({
              id: item.id,
              href: `/dashboard/catalog/option-types/${item.id}`,
              optionName: item.optionName,
              productCountLabel: `${item.productCount.toLocaleString("en")} products mapped`,
              displayType: item.displayType,
              valueCountLabel: item.valueCount.toLocaleString("en"),
            }))}
            selectionHint="Delete is blocked when any selected option type or value is still referenced by products or variants."
            selectionInputName="selectedIds"
            selectionLabel="option types"
          />

          <AdminPagination
            hrefBuilder={(page) =>
              adminWorkspaceService.buildHref(
                "/dashboard/catalog/option-types",
                resolvedSearchParams,
                { page },
              )
            }
            page={workspace.page}
            totalPages={workspace.totalPages}
          />
        </form>
      </AdminPanel>
    </AdminPage>
  );
}
