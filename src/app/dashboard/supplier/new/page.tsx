import { AdminEditorPage } from "@/components/admin/editor-page";
import { SupplierTabs } from "@/components/admin/module-tabs";
import { SupplierRecordForm } from "@/components/admin/supplier-forms";
import { AdminPanel, AdminSectionHeader } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

type SupplierCreatePageProps = {
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardSupplierCreatePage({
  searchParams,
}: SupplierCreatePageProps) {
  await requirePermission(PERMISSIONS.inventoryView);
  const resolvedSearchParams = await searchParams;
  const workspace = await adminWorkspaceService.getSupplierWorkspace({});

  return (
    <AdminEditorPage
      backHref="/dashboard/supplier"
      backLabel="Back to suppliers"
      description="Create a supplier record from a focused editor, then continue into link management or restock workflows."
      main={
        <AdminPanel>
          <AdminSectionHeader
            title="Supplier record"
            description="Capture the platform, contact details, and operational notes used by purchasing teams."
          />
          <div className="mt-5">
            <SupplierRecordForm
              platformOptions={workspace.platformOptions}
              redirectToDetail
              returnTo="/dashboard/supplier/new"
            />
          </div>
        </AdminPanel>
      }
      searchParams={resolvedSearchParams}
      tabs={<SupplierTabs currentPath="/dashboard/supplier/new" />}
      title="Create Supplier"
    />
  );
}
