import { notFound } from "next/navigation";

import { deleteSettingsRecordAction } from "@/app/dashboard/settings/actions";
import { TaxClassForm } from "@/components/admin/domain-record-forms";
import { AdminEditorPage } from "@/components/admin/editor-page";
import { SettingsTabs } from "@/components/admin/module-tabs";
import { AdminActionButton, AdminPanel, AdminSectionHeader } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

type DashboardTaxClassDetailPageProps = {
  params: Promise<{
    taxClassId: string;
  }>;
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardTaxClassDetailPage({
  params,
  searchParams,
}: DashboardTaxClassDetailPageProps) {
  await requirePermission(PERMISSIONS.settingsManage);
  const { taxClassId } = await params;
  const resolvedSearchParams = await searchParams;
  const workspace = await adminWorkspaceService.getSimpleRecordWorkspace("tax-classes", {
    id: taxClassId,
  });
  const record = workspace.selectedRecord;

  if (!record) {
    notFound();
  }

  return (
    <AdminEditorPage
      backHref="/dashboard/settings/tax-classes"
      backLabel="Back to tax classes"
      description="Edit the shared tax class record in a dedicated workspace instead of inside the list page."
      main={
        <AdminPanel>
          <AdminSectionHeader
            title="Tax class record"
            description="Update the shared tax class used by product and tax-rate workflows."
          />
          <div className="mt-5">
            <TaxClassForm
              record={record}
              returnTo={`/dashboard/settings/tax-classes/${taxClassId}`}
              submitLabel="Save tax class"
            />
          </div>
        </AdminPanel>
      }
      aside={
        <AdminPanel>
          <AdminSectionHeader
            title="Record actions"
            description="Tax classes already assigned to products are deactivated instead of being removed."
          />
          <form action={deleteSettingsRecordAction} className="mt-5">
            <input name="kind" type="hidden" value="tax-classes" />
            <input name="recordId" type="hidden" value={String(record.id)} />
            <input name="returnTo" type="hidden" value="/dashboard/settings/tax-classes" />
            <AdminActionButton tone="rose">Delete or deactivate tax class</AdminActionButton>
          </form>
        </AdminPanel>
      }
      searchParams={resolvedSearchParams}
      tabs={<SettingsTabs currentPath="/dashboard/settings/tax-classes" />}
      title="Tax Class"
    />
  );
}
