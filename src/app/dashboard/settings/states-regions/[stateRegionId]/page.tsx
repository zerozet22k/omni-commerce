import { notFound } from "next/navigation";

import { deleteSettingsRecordAction } from "@/app/dashboard/settings/actions";
import { StateRegionRecordForm } from "@/components/admin/domain-record-forms";
import { AdminEditorPage } from "@/components/admin/editor-page";
import { SettingsTabs } from "@/components/admin/module-tabs";
import { AdminActionButton, AdminPanel, AdminSectionHeader } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

type DashboardStateRegionDetailPageProps = {
  params: Promise<{
    stateRegionId: string;
  }>;
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardStateRegionDetailPage({
  params,
  searchParams,
}: DashboardStateRegionDetailPageProps) {
  await requirePermission(PERMISSIONS.settingsManage);
  const { stateRegionId } = await params;
  const resolvedSearchParams = await searchParams;
  const workspace = await adminWorkspaceService.getSimpleRecordWorkspace(
    "states-regions",
    {
      id: stateRegionId,
    },
  );
  const record = workspace.selectedRecord;

  if (!record) {
    notFound();
  }

  return (
    <AdminEditorPage
      backHref="/dashboard/settings/states-regions"
      backLabel="Back to states / regions"
      description="Edit a state or region record and keep its country relationship accurate for addresses and tax scope."
      main={
        <AdminPanel>
          <AdminSectionHeader
            title="State / region record"
            description="Changes here update the shared state or region reference used by address and tax forms."
          />
          <div className="mt-5">
            <StateRegionRecordForm
              countryOptions={workspace.zoneOptions}
              record={record}
              returnTo={`/dashboard/settings/states-regions/${stateRegionId}`}
              submitLabel="Save state / region"
            />
          </div>
        </AdminPanel>
      }
      aside={
        <AdminPanel>
          <AdminSectionHeader
            title="Record actions"
            description="States and regions can only be deleted when no address or tax rate still references them."
          />
          <form action={deleteSettingsRecordAction} className="mt-5">
            <input name="kind" type="hidden" value="states-regions" />
            <input name="recordId" type="hidden" value={String(record.id)} />
            <input name="returnTo" type="hidden" value="/dashboard/settings/states-regions" />
            <AdminActionButton tone="rose">Delete state / region</AdminActionButton>
          </form>
        </AdminPanel>
      }
      searchParams={resolvedSearchParams}
      tabs={<SettingsTabs currentPath="/dashboard/settings/states-regions" />}
      title="State / Region"
    />
  );
}
