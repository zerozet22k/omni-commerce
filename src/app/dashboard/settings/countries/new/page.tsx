import { CountryRecordForm } from "@/components/admin/domain-record-forms";
import { SettingsTabs } from "@/components/admin/module-tabs";
import { AdminActionNotice } from "@/components/admin/action-notice";
import {
  AdminLinkButton,
  AdminPage,
  AdminPageHeader,
  AdminPanel,
  AdminSectionHeader,
} from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { AdminSearchParams } from "@/modules/admin/admin-query";

type DashboardCountryCreatePageProps = {
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardCountryCreatePage({
  searchParams,
}: DashboardCountryCreatePageProps) {
  await requirePermission(PERMISSIONS.settingsManage);
  const resolvedSearchParams = await searchParams;

  return (
    <AdminPage>
      <AdminPageHeader
        actions={
          <AdminLinkButton href="/dashboard/settings/countries" tone="primary">
            Back to countries
          </AdminLinkButton>
        }
        title="Create New Country"
        description="Create a country record for addresses, tax scope, shipping coverage, and product origin."
      />
      <SettingsTabs currentPath="/dashboard/settings/countries/new" />
      <AdminActionNotice searchParams={resolvedSearchParams} />
      <AdminPanel>
        <AdminSectionHeader
          title="Country record"
          description="Use country records as the shared reference point for tax rates, states / regions, addresses, and origin selectors."
        />
        <div className="mt-5">
          <CountryRecordForm
            returnTo="/dashboard/settings/countries/new"
            successReturnTo="/dashboard/settings/countries"
            submitLabel="Create country"
          />
        </div>
      </AdminPanel>
    </AdminPage>
  );
}
