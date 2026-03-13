import { notFound } from "next/navigation";

import { deleteSettingsRecordAction } from "@/app/dashboard/settings/actions";
import { ShippingRateRuleForm } from "@/components/admin/domain-record-forms";
import { AdminEditorPage } from "@/components/admin/editor-page";
import { SettingsTabs } from "@/components/admin/module-tabs";
import { AdminActionButton, AdminPanel, AdminSectionHeader } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

type DashboardShippingRateRuleDetailPageProps = {
  params: Promise<{
    shippingRateRuleId: string;
  }>;
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardShippingRateRuleDetailPage({
  params,
  searchParams,
}: DashboardShippingRateRuleDetailPageProps) {
  await requirePermission(PERMISSIONS.settingsManage);
  const { shippingRateRuleId } = await params;
  const resolvedSearchParams = await searchParams;
  const workspace = await adminWorkspaceService.getSimpleRecordWorkspace(
    "shipping-rate-rules",
    {
      id: shippingRateRuleId,
    },
  );
  const record = workspace.selectedRecord;

  if (!record) {
    notFound();
  }

  return (
    <AdminEditorPage
      backHref="/dashboard/settings/shipping-rate-rules"
      backLabel="Back to shipping rate rules"
      description="Update the shipping rate rule in a dedicated workspace."
      main={
        <AdminPanel>
          <AdminSectionHeader
            title="Shipping rate rule"
            description="Update the delivery-method pricing band without leaving the settings workflow."
          />
          <div className="mt-5">
            <ShippingRateRuleForm
              methodOptions={workspace.methodOptions}
              record={record}
              returnTo={`/dashboard/settings/shipping-rate-rules/${shippingRateRuleId}`}
              submitLabel="Save shipping rate rule"
            />
          </div>
        </AdminPanel>
      }
      aside={
        <AdminPanel>
          <AdminSectionHeader
            title="Record actions"
            description="Shipping rate rules can be safely removed when no longer needed."
          />
          <form action={deleteSettingsRecordAction} className="mt-5">
            <input name="kind" type="hidden" value="shipping-rate-rules" />
            <input name="recordId" type="hidden" value={String(record.id)} />
            <input
              name="returnTo"
              type="hidden"
              value="/dashboard/settings/shipping-rate-rules"
            />
            <AdminActionButton tone="rose">Delete shipping rate rule</AdminActionButton>
          </form>
        </AdminPanel>
      }
      searchParams={resolvedSearchParams}
      tabs={<SettingsTabs currentPath="/dashboard/settings/shipping-rate-rules" />}
      title="Shipping Rate Rule"
    />
  );
}
