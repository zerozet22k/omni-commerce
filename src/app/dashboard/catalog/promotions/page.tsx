import {
  PromotionQuickCreateForm,
} from "@/components/admin/catalog-forms";
import { AdminActionNotice } from "@/components/admin/action-notice";
import { CatalogTabs } from "@/components/admin/module-tabs";
import { AdminPromotionsGrid } from "@/components/admin/promotions-grid";
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
import { formatDateTime } from "@/lib/utils/format";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";
import { bulkPromotionAction } from "@/app/dashboard/catalog/actions";

type PromotionsPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardCatalogPromotionsPage({
  searchParams,
}: PromotionsPageProps) {
  await requirePermission(PERMISSIONS.catalogView);
  const resolvedSearchParams = await searchParams;
  const workspace = await adminWorkspaceService.getPromotionsWorkspace(
    resolvedSearchParams,
  );
  const currentHref = adminWorkspaceService.buildHref(
    "/dashboard/catalog/promotions",
    resolvedSearchParams,
    {},
  );

  return (
    <AdminPage>
      <AdminPageHeader
        actions={
          <>
            <AdminQuickCreateModal
              description="Create the base campaign rule, then continue in the dedicated detail workspace for targeting."
              title="Quick Create Promotion"
              triggerLabel="Quick create"
            >
              <PromotionQuickCreateForm returnTo="/dashboard/catalog/promotions" />
            </AdminQuickCreateModal>
            <AdminLinkButton href="/dashboard/catalog/promotions/new" tone="primary">
              Create new promotion
            </AdminLinkButton>
          </>
        }
        title="Promotions"
        description="Run discount campaigns from a dedicated pricing workspace with server-side search, campaign state, and detail routes for targeting."
      />

      <CatalogTabs currentPath="/dashboard/catalog/promotions" />

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
        <form action="/dashboard/catalog/promotions" className="space-y-4" method="get">
          <div className="grid gap-3 md:grid-cols-[1.2fr_0.7fr_0.7fr_auto]">
            <AdminField
              defaultValue={workspace.filters.query}
              label="Search"
              name="q"
              placeholder="Promotion name, code, description"
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
                { value: "starts_desc", label: "Latest start date" },
                { value: "starts_asc", label: "Earliest start date" },
                { value: "name_asc", label: "Name A-Z" },
                { value: "name_desc", label: "Name Z-A" },
              ]}
            />
            <div className="flex items-end gap-3">
              <input name="page" type="hidden" value="1" />
              <AdminActionButton>Apply</AdminActionButton>
              <AdminLinkButton href="/dashboard/catalog/promotions">Reset</AdminLinkButton>
            </div>
          </div>
        </form>
      </AdminToolbar>

      <AdminPanel>
        <AdminSectionHeader
          title="Campaign list"
          description={`${workspace.total} promotions matched the current filters. Safe delete is blocked when any selected promotion already has usage.`}
        />
        <form action={bulkPromotionAction} className="mt-5 space-y-4">
          <input name="returnTo" type="hidden" value={currentHref} />

          <AdminPromotionsGrid
            bulkActions={[
              { label: "Activate selected", tone: "emerald", value: "activate" },
              { label: "Deactivate selected", tone: "amber", value: "deactivate" },
              { label: "Delete selected", tone: "rose", value: "delete" },
            ]}
            rows={workspace.items.map((item) => ({
              id: item.id,
              href: `/dashboard/catalog/promotions/${item.id}`,
              name: item.name,
              codeLabel: item.code ?? "Automatic promotion",
              discountLabel: item.discountLabel,
              promotionType: item.promotionType,
              targetsLabel: `${item.productCount} products`,
              variantsLabel: `${item.variantCount} variants / ${item.groupCount} groups`,
              stateLabel: item.isActive ? "ACTIVE" : "INACTIVE",
              startsAtLabel: formatDateTime(item.startsAt),
              isActive: item.isActive,
            }))}
            selectionHint="Delete is blocked when any selected promotion already has coupon usage history."
            selectionInputName="selectedIds"
            selectionLabel="promotions"
          />

          <AdminPagination
            hrefBuilder={(page) =>
              adminWorkspaceService.buildHref(
                "/dashboard/catalog/promotions",
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
