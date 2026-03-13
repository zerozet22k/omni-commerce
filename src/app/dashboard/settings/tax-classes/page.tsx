import { TaxClassForm } from "@/components/admin/domain-record-forms";
import { SettingsTabs } from "@/components/admin/module-tabs";
import { AdminQuickCreateModal } from "@/components/admin/quick-create-modal";
import { SimpleRecordPage } from "@/components/admin/simple-record-page";
import { AdminLinkButton } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

type TaxClassesPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardTaxClassesPage({
  searchParams,
}: TaxClassesPageProps) {
  await requirePermission(PERMISSIONS.settingsManage);
  const resolvedSearchParams = await searchParams;
  const workspace = await adminWorkspaceService.getSimpleRecordWorkspace(
    "tax-classes",
    resolvedSearchParams,
  );

  return (
    <SimpleRecordPage
      currentPath="/dashboard/settings/tax-classes"
      description="Manage reusable tax classes used by products and pricing rules."
      headerActions={
        <>
          <AdminQuickCreateModal
            description="Create a tax class without leaving the list."
            title="Quick Create Tax Class"
            triggerLabel="Quick create"
          >
            <TaxClassForm returnTo="/dashboard/settings/tax-classes" />
          </AdminQuickCreateModal>
          <AdminLinkButton href="/dashboard/settings/tax-classes/new" tone="primary">
            Create new tax class
          </AdminLinkButton>
        </>
      }
      itemHrefBuilder={(itemId) => `/dashboard/settings/tax-classes/${itemId}`}
      searchParams={resolvedSearchParams}
      searchPlaceholder="Tax class name or description"
      tabs={<SettingsTabs currentPath="/dashboard/settings/tax-classes" />}
      title="Tax Classes"
      workspace={workspace}
    />
  );
}
