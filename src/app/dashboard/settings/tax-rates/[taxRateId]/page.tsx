import { notFound } from "next/navigation";

import { deleteSettingsRecordAction } from "@/app/dashboard/settings/actions";
import { TaxRateForm } from "@/components/admin/domain-record-forms";
import { AdminEditorPage } from "@/components/admin/editor-page";
import { SettingsTabs } from "@/components/admin/module-tabs";
import { AdminActionButton, AdminPanel, AdminSectionHeader } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

type DashboardTaxRateDetailPageProps = {
  params: Promise<{
    taxRateId: string;
  }>;
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardTaxRateDetailPage({
  params,
  searchParams,
}: DashboardTaxRateDetailPageProps) {
  await requirePermission(PERMISSIONS.settingsManage);
  const { taxRateId } = await params;
  const resolvedSearchParams = await searchParams;
  const workspace = await adminWorkspaceService.getSimpleRecordWorkspace("tax-rates", {
    id: taxRateId,
  });
  const record = workspace.selectedRecord;

  if (!record) {
    notFound();
  }

  return (
    <AdminEditorPage
      backHref="/dashboard/settings/tax-rates"
      backLabel="Back to tax rates"
      description="Edit the shared tax rate record in a dedicated workspace instead of inside the table page."
      main={
        <AdminPanel>
          <AdminSectionHeader
            title="Tax rate record"
            description="Update the shared jurisdiction-based tax rate used by pricing and tax workflows."
          />
          <div className="mt-5">
            <TaxRateForm
              countryOptions={workspace.zoneOptions}
              record={record}
              returnTo={`/dashboard/settings/tax-rates/${taxRateId}`}
              stateOptions={workspace.stateOptions}
              submitLabel="Save tax rate"
              taxClassOptions={workspace.taxClassOptions}
            />
          </div>
        </AdminPanel>
      }
      aside={
        <AdminPanel>
          <AdminSectionHeader
            title="Record actions"
            description="Tax rates can be activated, deactivated, or deleted without embedding the workflow into the list page."
          />
          <form action={deleteSettingsRecordAction} className="mt-5">
            <input name="kind" type="hidden" value="tax-rates" />
            <input name="recordId" type="hidden" value={String(record.id)} />
            <input name="returnTo" type="hidden" value="/dashboard/settings/tax-rates" />
            <AdminActionButton tone="rose">Delete tax rate</AdminActionButton>
          </form>
        </AdminPanel>
      }
      searchParams={resolvedSearchParams}
      tabs={<SettingsTabs currentPath="/dashboard/settings/tax-rates" />}
      title="Tax Rate"
    />
  );
}
