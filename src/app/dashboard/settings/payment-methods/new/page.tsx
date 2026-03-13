import { PaymentMethodForm } from "@/components/admin/domain-record-forms";
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

type DashboardPaymentMethodCreatePageProps = {
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardPaymentMethodCreatePage({
  searchParams,
}: DashboardPaymentMethodCreatePageProps) {
  await requirePermission(PERMISSIONS.settingsManage);
  const resolvedSearchParams = await searchParams;

  return (
    <AdminPage>
      <AdminPageHeader
        actions={
          <AdminLinkButton href="/dashboard/settings/payment-methods" tone="primary">
            Back to payment methods
          </AdminLinkButton>
        }
        title="Create Payment Method"
        description="Create a payment method record used by checkout, order review, and manual payment confirmation."
      />
      <SettingsTabs currentPath="/dashboard/settings/payment-methods/new" />
      <AdminActionNotice searchParams={resolvedSearchParams} />
      <AdminPanel>
        <AdminSectionHeader
          title="Payment method record"
          description="Use payment method records as the shared operational reference for checkout and payment review workflows."
        />
        <div className="mt-5">
          <PaymentMethodForm
            returnTo="/dashboard/settings/payment-methods/new"
            successReturnTo="/dashboard/settings/payment-methods"
            submitLabel="Create payment method"
          />
        </div>
      </AdminPanel>
    </AdminPage>
  );
}
