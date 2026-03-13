import { StateRegionRecordForm } from "@/components/admin/domain-record-forms";
import { SettingsTabs } from "@/components/admin/module-tabs";
import { AdminQuickCreateModal } from "@/components/admin/quick-create-modal";
import { SimpleRecordPage } from "@/components/admin/simple-record-page";
import { AdminLinkButton } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

type DashboardStatesRegionsPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardStatesRegionsPage({
  searchParams,
}: DashboardStatesRegionsPageProps) {
  await requirePermission(PERMISSIONS.settingsManage);
  const resolvedSearchParams = await searchParams;
  const workspace = await adminWorkspaceService.getSimpleRecordWorkspace(
    "states-regions",
    resolvedSearchParams,
  );

  return (
    <SimpleRecordPage
      currentPath="/dashboard/settings/states-regions"
      description="Manage state and region records with country ownership so address and tax forms stay scoped correctly."
      emptyStateBody="Create the first state or region after countries are configured."
      headerActions={
        <>
          <AdminQuickCreateModal
            description="Create a state or region without leaving the table."
            title="Quick Create State / Region"
            triggerLabel="Quick create"
          >
            <StateRegionRecordForm
              countryOptions={workspace.zoneOptions}
              returnTo="/dashboard/settings/states-regions"
            />
          </AdminQuickCreateModal>
          <AdminLinkButton href="/dashboard/settings/states-regions/new" tone="primary">
            Create new state / region
          </AdminLinkButton>
        </>
      }
      itemHrefBuilder={(itemId) => `/dashboard/settings/states-regions/${itemId}`}
      searchParams={resolvedSearchParams}
      searchPlaceholder="State / region name or code"
      tabs={<SettingsTabs currentPath="/dashboard/settings/states-regions" />}
      title="States / Regions"
      workspace={workspace}
    />
  );
}
