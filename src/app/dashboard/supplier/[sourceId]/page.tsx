import { notFound } from "next/navigation";

import { AdminEditorPage } from "@/components/admin/editor-page";
import { SupplierTabs } from "@/components/admin/module-tabs";
import {
  DeleteSupplierButton,
  SupplierRecordForm,
} from "@/components/admin/supplier-forms";
import { AdminLinkButton, AdminPanel, AdminSectionHeader } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

type SupplierDetailPageProps = {
  params: Promise<{
    sourceId: string;
  }>;
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardSupplierDetailPage({
  params,
  searchParams,
}: SupplierDetailPageProps) {
  await requirePermission(PERMISSIONS.inventoryView);
  const { sourceId } = await params;
  const resolvedSearchParams = await searchParams;
  const workspace = await adminWorkspaceService.getSupplierWorkspace({ sourceId });
  const record = workspace.selectedSource;

  if (!record) {
    notFound();
  }

  return (
    <AdminEditorPage
      backHref="/dashboard/supplier"
      backLabel="Back to suppliers"
      description="Edit the supplier record in a dedicated workspace, then jump into link management from the same route."
      headerActions={
        <AdminLinkButton href={`/dashboard/supplier/links?sourceId=${sourceId}`}>
          View supplier links
        </AdminLinkButton>
      }
      main={
        <AdminPanel>
          <AdminSectionHeader
            title="Supplier record"
            description="Update the platform, contact details, activation state, and operational notes used by procurement."
          />
          <div className="mt-5">
            <SupplierRecordForm
              platformOptions={workspace.platformOptions}
              record={record}
              returnTo={`/dashboard/supplier/${sourceId}`}
              submitLabel="Save supplier"
            />
          </div>
        </AdminPanel>
      }
      aside={
        <AdminPanel>
          <AdminSectionHeader
            title="Record actions"
            description="Delete is only allowed when the supplier is no longer attached to links or restocks."
          />
          <div className="mt-5 space-y-3">
            <DeleteSupplierButton returnTo={`/dashboard/supplier/${sourceId}`} sourceId={sourceId} />
            <AdminLinkButton href={`/dashboard/supplier/links/new?sourceId=${sourceId}`}>
              Add supplier link
            </AdminLinkButton>
          </div>
        </AdminPanel>
      }
      searchParams={resolvedSearchParams}
      tabs={<SupplierTabs currentPath={`/dashboard/supplier/${sourceId}`} />}
      title={record.sourceName}
    />
  );
}
