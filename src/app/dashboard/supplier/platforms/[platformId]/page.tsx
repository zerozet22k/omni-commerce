import { notFound } from "next/navigation";

import { AdminEditorPage } from "@/components/admin/editor-page";
import { SupplierTabs } from "@/components/admin/module-tabs";
import {
  DeleteSupplierPlatformButton,
  SupplierPlatformForm,
} from "@/components/admin/supplier-forms";
import { AdminPanel, AdminSectionHeader } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import {
  SourcingPlatformModel,
  SourcingSourceModel,
} from "@/modules/sourcing/sourcing.models";

type SupplierPlatformDetailPageProps = {
  params: Promise<{
    platformId: string;
  }>;
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardSupplierPlatformDetailPage({
  params,
  searchParams,
}: SupplierPlatformDetailPageProps) {
  await requirePermission(PERMISSIONS.inventoryView);
  const { platformId } = await params;
  const resolvedSearchParams = await searchParams;
  const [platform, supplierCount] = await Promise.all([
    SourcingPlatformModel.findById(platformId).lean().exec(),
    SourcingSourceModel.countDocuments({ sourcingPlatformId: platformId }).exec(),
  ]);

  if (!platform) {
    notFound();
  }

  return (
    <AdminEditorPage
      backHref="/dashboard/supplier/platforms"
      backLabel="Back to platforms"
      description="Edit the platform record in a dedicated workspace and keep safe delete checks separate from the list page."
      main={
        <AdminPanel>
          <AdminSectionHeader
            title="Platform record"
            description="Update the sourcing platform name, code, and activation state used across supplier records."
          />
          <div className="mt-5">
            <SupplierPlatformForm
              record={{
                id: String(platform._id),
                name: typeof platform.name === "string" ? platform.name : "Platform",
                code: typeof platform.code === "string" ? platform.code : "",
                isActive: Boolean(platform.isActive),
                supplierCount,
              }}
              returnTo={`/dashboard/supplier/platforms/${platformId}`}
              submitLabel="Save platform"
            />
          </div>
        </AdminPanel>
      }
      aside={
        <AdminPanel>
          <AdminSectionHeader
            title="Record actions"
            description={`${supplierCount.toLocaleString("en")} suppliers currently use this platform. Delete is blocked while usage remains.`}
          />
          <div className="mt-5">
            <DeleteSupplierPlatformButton
              platformId={platformId}
              returnTo={`/dashboard/supplier/platforms/${platformId}`}
            />
          </div>
        </AdminPanel>
      }
      searchParams={resolvedSearchParams}
      tabs={<SupplierTabs currentPath={`/dashboard/supplier/platforms/${platformId}`} />}
      title={typeof platform.name === "string" ? platform.name : "Supplier Platform"}
    />
  );
}
