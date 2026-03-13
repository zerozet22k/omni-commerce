import { TaxClassForm } from "@/components/admin/domain-record-forms";
import { SettingsTabs } from "@/components/admin/module-tabs";
import { AdminActionNotice } from "@/components/admin/action-notice";
import { AdminLinkButton, AdminPage, AdminPageHeader, AdminPanel, AdminSectionHeader } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { AdminSearchParams } from "@/modules/admin/admin-query";

type DashboardTaxClassCreatePageProps = {
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardTaxClassCreatePage({
  searchParams,
}: DashboardTaxClassCreatePageProps) {
  await requirePermission(PERMISSIONS.settingsManage);
  const resolvedSearchParams = await searchParams;

  return (
    <AdminPage>
      <AdminPageHeader
        actions={
          <AdminLinkButton href="/dashboard/settings/tax-classes" tone="primary">
            Back to tax classes
          </AdminLinkButton>
        }
        title="Create New Tax Class"
        description="Create reusable tax classes from a dedicated settings page."
      />
      <SettingsTabs currentPath="/dashboard/settings/tax-classes/new" />
      <AdminActionNotice searchParams={resolvedSearchParams} />
      <AdminPanel>
        <AdminSectionHeader
          title="Tax class record"
          description="Use tax classes to group products under clear pricing and compliance rules."
        />
        <div className="mt-5">
          <TaxClassForm
            returnTo="/dashboard/settings/tax-classes/new"
            successReturnTo="/dashboard/settings/tax-classes"
            submitLabel="Create tax class"
          />
        </div>
      </AdminPanel>
    </AdminPage>
  );
}
