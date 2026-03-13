import { TaxRateForm } from "@/components/admin/domain-record-forms";
import { SettingsTabs } from "@/components/admin/module-tabs";
import { AdminActionNotice } from "@/components/admin/action-notice";
import { AdminLinkButton, AdminPage, AdminPageHeader, AdminPanel, AdminSectionHeader } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

type DashboardTaxRateCreatePageProps = {
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardTaxRateCreatePage({
  searchParams,
}: DashboardTaxRateCreatePageProps) {
  await requirePermission(PERMISSIONS.settingsManage);
  const resolvedSearchParams = await searchParams;
  const workspace = await adminWorkspaceService.getSimpleRecordWorkspace("tax-rates", {});

  return (
    <AdminPage>
      <AdminPageHeader
        actions={
          <AdminLinkButton href="/dashboard/settings/tax-rates" tone="primary">
            Back to tax rates
          </AdminLinkButton>
        }
        title="Create New Tax Rate"
        description="Create jurisdiction-based tax rates from a dedicated settings page."
      />
      <SettingsTabs currentPath="/dashboard/settings/tax-rates/new" />
      <AdminActionNotice searchParams={resolvedSearchParams} />
      <AdminPanel>
        <AdminSectionHeader
          title="Tax rate record"
          description="Use tax rates to define active percentages for specific countries, states, and tax classes."
        />
        <div className="mt-5">
          <TaxRateForm
            countryOptions={workspace.zoneOptions}
            returnTo="/dashboard/settings/tax-rates/new"
            successReturnTo="/dashboard/settings/tax-rates"
            stateOptions={workspace.stateOptions}
            submitLabel="Create tax rate"
            taxClassOptions={workspace.taxClassOptions}
          />
        </div>
      </AdminPanel>
    </AdminPage>
  );
}
