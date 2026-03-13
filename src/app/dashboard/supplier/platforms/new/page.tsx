import { AdminEditorPage } from "@/components/admin/editor-page";
import { SupplierTabs } from "@/components/admin/module-tabs";
import { SupplierPlatformForm } from "@/components/admin/supplier-forms";
import { AdminPanel, AdminSectionHeader } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { AdminSearchParams } from "@/modules/admin/admin-query";

type SupplierPlatformCreatePageProps = {
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardSupplierPlatformCreatePage({
  searchParams,
}: SupplierPlatformCreatePageProps) {
  await requirePermission(PERMISSIONS.inventoryView);
  const resolvedSearchParams = await searchParams;

  return (
    <AdminEditorPage
      backHref="/dashboard/supplier/platforms"
      backLabel="Back to platforms"
      description="Create a sourcing platform from a focused editor instead of working inside a cramped list-side form."
      main={
        <AdminPanel>
          <AdminSectionHeader
            title="Platform record"
            description="Platform records define the reusable sourcing destinations attached to supplier accounts."
          />
          <div className="mt-5">
            <SupplierPlatformForm redirectToDetail returnTo="/dashboard/supplier/platforms/new" />
          </div>
        </AdminPanel>
      }
      searchParams={resolvedSearchParams}
      tabs={<SupplierTabs currentPath="/dashboard/supplier/platforms/new" />}
      title="Create Supplier Platform"
    />
  );
}
