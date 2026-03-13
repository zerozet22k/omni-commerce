import { StateRegionRecordForm } from "@/components/admin/domain-record-forms";
import { SettingsTabs } from "@/components/admin/module-tabs";
import { AdminActionNotice } from "@/components/admin/action-notice";
import {
  AdminInlineHint,
  AdminLinkButton,
  AdminPage,
  AdminPageHeader,
  AdminPanel,
  AdminSectionHeader,
} from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

type DashboardStateRegionCreatePageProps = {
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardStateRegionCreatePage({
  searchParams,
}: DashboardStateRegionCreatePageProps) {
  await requirePermission(PERMISSIONS.settingsManage);
  const resolvedSearchParams = await searchParams;
  const workspace = await adminWorkspaceService.getSimpleRecordWorkspace(
    "states-regions",
    {},
  );

  return (
    <AdminPage>
      <AdminPageHeader
        actions={
          <AdminLinkButton href="/dashboard/settings/states-regions" tone="primary">
            Back to states / regions
          </AdminLinkButton>
        }
        title="Create New State / Region"
        description="Create a state or region record and bind it to a country for downstream address and tax workflows."
      />
      <SettingsTabs currentPath="/dashboard/settings/states-regions/new" />
      <AdminActionNotice searchParams={resolvedSearchParams} />
      <AdminPanel>
        <AdminSectionHeader
          title="State / region record"
          description="States and regions are scoped to countries so forms can filter them correctly."
        />
        {workspace.zoneOptions.length === 0 ? (
          <div className="mt-5">
            <AdminInlineHint tone="amber">
              Create at least one country before adding states or regions.
            </AdminInlineHint>
          </div>
        ) : (
          <div className="mt-5">
            <StateRegionRecordForm
              countryOptions={workspace.zoneOptions}
              returnTo="/dashboard/settings/states-regions/new"
              successReturnTo="/dashboard/settings/states-regions"
              submitLabel="Create state / region"
            />
          </div>
        )}
      </AdminPanel>
    </AdminPage>
  );
}
