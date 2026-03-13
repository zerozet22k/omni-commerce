import { ShippingRateRuleForm } from "@/components/admin/domain-record-forms";
import { SettingsTabs } from "@/components/admin/module-tabs";
import { AdminQuickCreateModal } from "@/components/admin/quick-create-modal";
import { SimpleRecordPage } from "@/components/admin/simple-record-page";
import { AdminLinkButton } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

type ShippingRateRulesPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardShippingRateRulesPage({
  searchParams,
}: ShippingRateRulesPageProps) {
  await requirePermission(PERMISSIONS.settingsManage);
  const resolvedSearchParams = await searchParams;
  const workspace = await adminWorkspaceService.getSimpleRecordWorkspace(
    "shipping-rate-rules",
    resolvedSearchParams,
  );

  return (
    <SimpleRecordPage
      currentPath="/dashboard/settings/shipping-rate-rules"
      description="Manage shipping rate rules attached to delivery methods for weight and order-total pricing bands."
      headerActions={
        <>
          <AdminQuickCreateModal
            description="Create a shipping rate rule without leaving the table."
            title="Quick Create Shipping Rate Rule"
            triggerLabel="Quick create"
          >
            <ShippingRateRuleForm
              methodOptions={workspace.methodOptions}
              returnTo="/dashboard/settings/shipping-rate-rules"
            />
          </AdminQuickCreateModal>
          <AdminLinkButton href="/dashboard/settings/shipping-rate-rules/new" tone="primary">
            Create new shipping rate rule
          </AdminLinkButton>
        </>
      }
      itemHrefBuilder={(itemId) => `/dashboard/settings/shipping-rate-rules/${itemId}`}
      searchParams={resolvedSearchParams}
      searchPlaceholder="Delivery method"
      tabs={<SettingsTabs currentPath="/dashboard/settings/shipping-rate-rules" />}
      title="Shipping Rate Rules"
      workspace={workspace}
    />
  );
}
