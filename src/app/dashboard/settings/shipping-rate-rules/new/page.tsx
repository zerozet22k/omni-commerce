import { ShippingRateRuleForm } from "@/components/admin/domain-record-forms";
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
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

type DashboardShippingRateRuleCreatePageProps = {
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardShippingRateRuleCreatePage({
  searchParams,
}: DashboardShippingRateRuleCreatePageProps) {
  await requirePermission(PERMISSIONS.settingsManage);
  const resolvedSearchParams = await searchParams;
  const workspace = await adminWorkspaceService.getSimpleRecordWorkspace(
    "shipping-rate-rules",
    {},
  );

  return (
    <AdminPage>
      <AdminPageHeader
        actions={
          <AdminLinkButton href="/dashboard/settings/shipping-rate-rules" tone="primary">
            Back to shipping rate rules
          </AdminLinkButton>
        }
        title="Create Shipping Rate Rule"
        description="Create a delivery-method pricing rule for weight and order-total conditions."
      />
      <SettingsTabs currentPath="/dashboard/settings/shipping-rate-rules/new" />
      <AdminActionNotice searchParams={resolvedSearchParams} />
      <AdminPanel>
        <AdminSectionHeader
          title="Shipping rate rule"
          description="Use rate rules for conditional delivery pricing instead of editing raw JSON."
        />
        <div className="mt-5">
          <ShippingRateRuleForm
            methodOptions={workspace.methodOptions}
            returnTo="/dashboard/settings/shipping-rate-rules/new"
            successReturnTo="/dashboard/settings/shipping-rate-rules"
            submitLabel="Create shipping rate rule"
          />
        </div>
      </AdminPanel>
    </AdminPage>
  );
}
