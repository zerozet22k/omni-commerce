import { CountryRecordForm } from "@/components/admin/domain-record-forms";
import { SettingsTabs } from "@/components/admin/module-tabs";
import { AdminQuickCreateModal } from "@/components/admin/quick-create-modal";
import { SimpleRecordPage } from "@/components/admin/simple-record-page";
import { AdminLinkButton } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

type DashboardCountriesPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardCountriesPage({
  searchParams,
}: DashboardCountriesPageProps) {
  await requirePermission(PERMISSIONS.settingsManage);
  const resolvedSearchParams = await searchParams;
  const workspace = await adminWorkspaceService.getSimpleRecordWorkspace(
    "countries",
    resolvedSearchParams,
  );

  return (
    <SimpleRecordPage
      currentPath="/dashboard/settings/countries"
      description="Manage the shared country records used by product origin, addresses, tax rates, and delivery configuration."
      emptyStateBody="Create the first country to power address, tax, and origin selectors."
      headerActions={
        <>
          <AdminQuickCreateModal
            description="Create a country without leaving the table."
            title="Quick Create Country"
            triggerLabel="Quick create"
          >
            <CountryRecordForm returnTo="/dashboard/settings/countries" />
          </AdminQuickCreateModal>
          <AdminLinkButton href="/dashboard/settings/countries/new" tone="primary">
            Create new country
          </AdminLinkButton>
        </>
      }
      itemHrefBuilder={(itemId) => `/dashboard/settings/countries/${itemId}`}
      searchParams={resolvedSearchParams}
      searchPlaceholder="Country name, ISO code, or phone code"
      tabs={<SettingsTabs currentPath="/dashboard/settings/countries" />}
      title="Countries"
      workspace={workspace}
    />
  );
}
