import { Types } from "mongoose";

import { AdminEditorPage } from "@/components/admin/editor-page";
import { SupplierTabs } from "@/components/admin/module-tabs";
import { SupplierLinkForm } from "@/components/admin/supplier-forms";
import { AdminPanel, AdminSectionHeader } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { readSearchParam } from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";
import { SourcingSourceModel } from "@/modules/sourcing/sourcing.models";

type SupplierLinkCreatePageProps = {
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardSupplierLinkCreatePage({
  searchParams,
}: SupplierLinkCreatePageProps) {
  await requirePermission(PERMISSIONS.inventoryView);
  const resolvedSearchParams = await searchParams;
  const sourceId = readSearchParam(resolvedSearchParams, "sourceId");
  const variantId = readSearchParam(resolvedSearchParams, "variantId");
  const workspace = await adminWorkspaceService.getSupplierWorkspace({});
  const sourceOptionRows = (await SourcingSourceModel.find()
    .sort({ sourceName: 1 })
    .select("sourceName isActive")
    .lean()
    .exec()) as Array<{
    _id: unknown;
    sourceName?: string;
    isActive?: boolean;
  }>;

  return (
    <AdminEditorPage
      backHref="/dashboard/supplier/links"
      backLabel="Back to supplier links"
      description="Create a supplier link from a focused editor so supplier, variant, and URL validation stay clear and operational."
      main={
        <AdminPanel>
          <AdminSectionHeader
            title="Supplier link"
            description="Bind a supplier record to a specific sellable variant with URL, price, and preference controls."
          />
          <div className="mt-5">
            <SupplierLinkForm
              record={{
                id: "",
                variantId: Types.ObjectId.isValid(variantId) ? variantId : "",
                sourcingSourceId: Types.ObjectId.isValid(sourceId) ? sourceId : "",
                sourceSku: null,
                sourceProductName: null,
                sourceProductUrl: "",
                sourcePrice: null,
                isPreferred: false,
                isActive: true,
              }}
              redirectToDetail
              returnTo="/dashboard/supplier/links/new"
              sourceOptions={sourceOptionRows.map((row) => ({
                id: String(row._id),
                label:
                  typeof row.sourceName === "string"
                    ? `${row.sourceName}${row.isActive ? "" : " (inactive)"}`
                    : "Supplier",
              }))}
              variantOptions={workspace.variantOptions}
            />
          </div>
        </AdminPanel>
      }
      searchParams={resolvedSearchParams}
      tabs={<SupplierTabs currentPath="/dashboard/supplier/links/new" />}
      title="Create Supplier Link"
    />
  );
}
