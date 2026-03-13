import { TaxRateForm } from "@/components/admin/domain-record-forms";
import { SettingsTabs } from "@/components/admin/module-tabs";
import { AdminQuickCreateModal } from "@/components/admin/quick-create-modal";
import { SimpleRecordPage } from "@/components/admin/simple-record-page";
import { AdminLinkButton } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

type TaxRatesPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardTaxRatesPage({
  searchParams,
}: TaxRatesPageProps) {
  await requirePermission(PERMISSIONS.settingsManage);
  const resolvedSearchParams = await searchParams;
  const workspace = await adminWorkspaceService.getSimpleRecordWorkspace(
    "tax-rates",
    resolvedSearchParams,
  );

  return (
    <SimpleRecordPage
      currentPath="/dashboard/settings/tax-rates"
      description="Manage jurisdiction-based tax rates with search, pagination, and dedicated settings ownership."
      headerActions={
        <>
          <AdminQuickCreateModal
            description="Create a tax rate without leaving the list."
            title="Quick Create Tax Rate"
            triggerLabel="Quick create"
          >
            <TaxRateForm
              countryOptions={workspace.zoneOptions}
              returnTo="/dashboard/settings/tax-rates"
              stateOptions={workspace.stateOptions}
              taxClassOptions={workspace.taxClassOptions}
            />
          </AdminQuickCreateModal>
          <AdminLinkButton href="/dashboard/settings/tax-rates/new" tone="primary">
            Create new tax rate
          </AdminLinkButton>
        </>
      }
      itemHrefBuilder={(itemId) => `/dashboard/settings/tax-rates/${itemId}`}
      searchParams={resolvedSearchParams}
      searchPlaceholder="Rate name"
      tabs={<SettingsTabs currentPath="/dashboard/settings/tax-rates" />}
      title="Tax Rates"
      workspace={workspace}
    />
  );
}
