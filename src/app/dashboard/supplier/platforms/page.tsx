import { Types } from "mongoose";

import { bulkSourcingPlatformAction } from "@/app/dashboard/inventory/actions";
import { AdminActionNotice } from "@/components/admin/action-notice";
import { SupplierPlatformForm } from "@/components/admin/supplier-forms";
import { SupplierTabs } from "@/components/admin/module-tabs";
import { AdminQuickCreateModal } from "@/components/admin/quick-create-modal";
import { AdminSupplierPlatformsGrid } from "@/components/admin/supplier-platforms-grid";
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
import {
  clampPage,
  readNumberParam,
  readSearchParam,
  type AdminSearchParams,
} from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";
import {
  SourcingPlatformModel,
  SourcingSourceModel,
} from "@/modules/sourcing/sourcing.models";

type SupplierPlatformsPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

const PAGE_LIMIT = 15;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default async function DashboardSupplierPlatformsPage({
  searchParams,
}: SupplierPlatformsPageProps) {
  await requirePermission(PERMISSIONS.inventoryView);
  const resolvedSearchParams = await searchParams;
  const workspace = await adminWorkspaceService.getSupplierWorkspace(resolvedSearchParams);
  const query = readSearchParam(resolvedSearchParams, "q").trim();
  const active = readSearchParam(resolvedSearchParams, "active") || "all";
  const sort = readSearchParam(resolvedSearchParams, "sort") || "name_asc";
  const requestedPage = readNumberParam(resolvedSearchParams, "page", 1);
  const filter: Record<string, unknown> = {};

  if (query) {
    const regex = new RegExp(escapeRegex(query), "i");
    filter.$or = [{ name: regex }, { code: regex }];
  }

  if (active === "active") {
    filter.isActive = true;
  }

  if (active === "inactive") {
    filter.isActive = false;
  }

  const total = await SourcingPlatformModel.countDocuments(filter).exec();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const page = clampPage(requestedPage, totalPages);
  const platformRows = (await SourcingPlatformModel.find(filter)
    .sort(sort === "name_desc" ? { name: -1 } : { name: 1 })
    .skip((page - 1) * PAGE_LIMIT)
    .limit(PAGE_LIMIT)
    .lean()
    .exec()) as Array<{
    _id: unknown;
    name?: string;
    code?: string;
    isActive?: boolean;
  }>;
  const supplierCounts =
    platformRows.length > 0
      ? await SourcingSourceModel.aggregate<{ _id: Types.ObjectId; count: number }>([
          {
            $match: {
              sourcingPlatformId: {
                $in: platformRows.map((row) => new Types.ObjectId(String(row._id))),
              },
            },
          },
          {
            $group: {
              _id: "$sourcingPlatformId",
              count: { $sum: 1 },
            },
          },
        ]).exec()
      : [];
  const supplierCountMap = new Map(
    supplierCounts.map((row) => [String(row._id), row.count]),
  );
  const currentHref = adminWorkspaceService.buildHref(
    "/dashboard/supplier/platforms",
    resolvedSearchParams,
    {},
  );

  return (
    <AdminPage>
      <AdminPageHeader
        title="Supplier Platforms"
        description="Manage sourcing platform records as first-class operational references with shared filtering, selection, and safe batch workflows."
        actions={
          <>
            <AdminQuickCreateModal
              description="Create a sourcing platform without leaving the list."
              title="Quick Create Platform"
              triggerLabel="Quick create"
            >
              <SupplierPlatformForm returnTo="/dashboard/supplier/platforms" />
            </AdminQuickCreateModal>
            <AdminLinkButton href="/dashboard/supplier/platforms/new" tone="primary">
              Create new platform
            </AdminLinkButton>
          </>
        }
      />

      <SupplierTabs currentPath="/dashboard/supplier/platforms" />

      <AdminActionNotice searchParams={resolvedSearchParams} />

      <AdminSummaryStrip
        columns={3}
        items={[
          {
            label: "Platforms",
            value: workspace.metrics[1]?.value.toLocaleString("en") ?? "0",
            hint: workspace.metrics[1]?.hint ?? "Marketplace and sourcing platform records",
          },
          {
            label: "Active suppliers",
            value: workspace.metrics[0]?.value.toLocaleString("en") ?? "0",
            hint: workspace.metrics[0]?.hint ?? "Suppliers currently active",
          },
          {
            label: "Active links",
            value: workspace.metrics[2]?.value.toLocaleString("en") ?? "0",
            hint: workspace.metrics[2]?.hint ?? "Variant links using supplier records",
          },
        ]}
      />

      <AdminToolbar>
        <form action="/dashboard/supplier/platforms" className="space-y-4" method="get">
          <AdminFilterGrid className="2xl:grid-cols-4">
            <AdminField
              defaultValue={query}
              label="Search"
              name="q"
              placeholder="Platform name or code"
            />
            <AdminSelect
              defaultValue={active}
              label="State"
              name="active"
              options={[
                { value: "all", label: "All states" },
                { value: "active", label: "Active only" },
                { value: "inactive", label: "Inactive only" },
              ]}
            />
            <AdminSelect
              defaultValue={sort}
              label="Sort"
              name="sort"
              options={[
                { value: "name_asc", label: "Name A-Z" },
                { value: "name_desc", label: "Name Z-A" },
              ]}
            />
            <div className="flex items-end gap-3">
              <input name="page" type="hidden" value="1" />
              <AdminActionButton>Apply filters</AdminActionButton>
              <AdminLinkButton href="/dashboard/supplier/platforms">Reset</AdminLinkButton>
            </div>
          </AdminFilterGrid>
        </form>
      </AdminToolbar>

      <AdminPanel className="min-w-0">
        <AdminSectionHeader
          title="Platform records"
          description={`${total} platforms matched the current filters. Activation can be batched, while delete stays blocked whenever suppliers are attached.`}
        />

        <form action={bulkSourcingPlatformAction} className="mt-5 space-y-4">
          <input name="returnTo" type="hidden" value={currentHref} />

          <AdminSupplierPlatformsGrid
            bulkActions={[
              { label: "Activate selected", tone: "emerald", value: "activate" },
              { label: "Deactivate selected", tone: "amber", value: "deactivate" },
              { label: "Delete selected", tone: "rose", value: "delete" },
            ]}
            rows={platformRows.map((platform) => ({
              id: String(platform._id),
              href: `/dashboard/supplier/platforms/${String(platform._id)}`,
              platformName: platform.name ?? "Platform",
              platformCode: platform.code ?? "No code",
              supplierCountLabel: `${(supplierCountMap.get(String(platform._id)) ?? 0).toLocaleString("en")} suppliers`,
              isActive: Boolean(platform.isActive),
            }))}
            selectionHint="Delete is blocked when selected platforms still have supplier records attached."
            selectionInputName="selectedIds"
            selectionLabel="platforms"
          />

          <AdminPagination
            hrefBuilder={(nextPage) =>
              adminWorkspaceService.buildHref(
                "/dashboard/supplier/platforms",
                resolvedSearchParams,
                { page: nextPage },
              )
            }
            page={page}
            totalPages={totalPages}
          />
        </form>
      </AdminPanel>
    </AdminPage>
  );
}
