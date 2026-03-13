import { notFound } from "next/navigation";

import { deleteSettingsRecordAction } from "@/app/dashboard/settings/actions";
import { PaymentMethodForm } from "@/components/admin/domain-record-forms";
import { AdminEditorPage } from "@/components/admin/editor-page";
import { SettingsTabs } from "@/components/admin/module-tabs";
import { AdminActionButton, AdminPanel, AdminSectionHeader } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

type DashboardPaymentMethodDetailPageProps = {
  params: Promise<{
    paymentMethodId: string;
  }>;
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardPaymentMethodDetailPage({
  params,
  searchParams,
}: DashboardPaymentMethodDetailPageProps) {
  await requirePermission(PERMISSIONS.settingsManage);
  const { paymentMethodId } = await params;
  const resolvedSearchParams = await searchParams;
  const workspace = await adminWorkspaceService.getSimpleRecordWorkspace("payment-methods", {
    id: paymentMethodId,
  });
  const record = workspace.selectedRecord;

  if (!record) {
    notFound();
  }

  return (
    <AdminEditorPage
      backHref="/dashboard/settings/payment-methods"
      backLabel="Back to payment methods"
      description="Edit the shared payment method record in a dedicated workspace instead of inside the list page."
      main={
        <AdminPanel>
          <AdminSectionHeader
            title="Payment method record"
            description="Update the shared payment method used by checkout and payment review workflows."
          />
          <div className="mt-5">
            <PaymentMethodForm
              record={record}
              returnTo={`/dashboard/settings/payment-methods/${paymentMethodId}`}
              submitLabel="Save payment method"
            />
          </div>
        </AdminPanel>
      }
      aside={
        <AdminPanel>
          <AdminSectionHeader
            title="Record actions"
            description="Payment methods already referenced by payments are deactivated instead of being removed."
          />
          <form action={deleteSettingsRecordAction} className="mt-5">
            <input name="kind" type="hidden" value="payment-methods" />
            <input name="recordId" type="hidden" value={String(record.id)} />
            <input name="returnTo" type="hidden" value="/dashboard/settings/payment-methods" />
            <AdminActionButton tone="rose">Delete or deactivate payment method</AdminActionButton>
          </form>
        </AdminPanel>
      }
      searchParams={resolvedSearchParams}
      tabs={<SettingsTabs currentPath="/dashboard/settings/payment-methods" />}
      title="Payment Method"
    />
  );
}
