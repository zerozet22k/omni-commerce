import { PaymentMethodForm } from "@/components/admin/domain-record-forms";
import { SettingsTabs } from "@/components/admin/module-tabs";
import { AdminQuickCreateModal } from "@/components/admin/quick-create-modal";
import { SimpleRecordPage } from "@/components/admin/simple-record-page";
import { AdminLinkButton } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

type PaymentMethodsPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardPaymentMethodsPage({
  searchParams,
}: PaymentMethodsPageProps) {
  await requirePermission(PERMISSIONS.settingsManage);
  const resolvedSearchParams = await searchParams;
  const workspace = await adminWorkspaceService.getSimpleRecordWorkspace(
    "payment-methods",
    resolvedSearchParams,
  );

  return (
    <SimpleRecordPage
      currentPath="/dashboard/settings/payment-methods"
      description="Manage shared payment methods used by checkout, order review, and manual payment confirmation."
      headerActions={
        <>
          <AdminQuickCreateModal
            description="Create a payment method without leaving the table."
            title="Quick Create Payment Method"
            triggerLabel="Quick create"
          >
            <PaymentMethodForm returnTo="/dashboard/settings/payment-methods" />
          </AdminQuickCreateModal>
          <AdminLinkButton href="/dashboard/settings/payment-methods/new" tone="primary">
            Create new payment method
          </AdminLinkButton>
        </>
      }
      itemHrefBuilder={(itemId) => `/dashboard/settings/payment-methods/${itemId}`}
      searchParams={resolvedSearchParams}
      searchPlaceholder="Method name, code, provider"
      tabs={<SettingsTabs currentPath="/dashboard/settings/payment-methods" />}
      title="Payment Methods"
      workspace={workspace}
    />
  );
}
