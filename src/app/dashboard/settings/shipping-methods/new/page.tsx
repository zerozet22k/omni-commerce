import { ShippingMethodForm } from "@/components/admin/domain-record-forms";
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

type DashboardShippingMethodCreatePageProps = {
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardShippingMethodCreatePage({
  searchParams,
}: DashboardShippingMethodCreatePageProps) {
  await requirePermission(PERMISSIONS.settingsManage);
  const resolvedSearchParams = await searchParams;
  const workspace = await adminWorkspaceService.getSimpleRecordWorkspace("shipping-methods", {});

  return (
    <AdminPage>
      <AdminPageHeader
        actions={
          <AdminLinkButton href="/dashboard/settings/shipping-methods" tone="primary">
            Back to delivery methods
          </AdminLinkButton>
        }
        title="Create Delivery Method"
        description="Create a delivery method record used by checkout, order routing, and shipment operations."
      />
      <SettingsTabs currentPath="/dashboard/settings/shipping-methods/new" />
      <AdminActionNotice searchParams={resolvedSearchParams} />
      <AdminPanel>
        <AdminSectionHeader
          title="Delivery method record"
          description="Use delivery method records as the shared operational reference for checkout, orders, and shipment workflows."
        />
        <div className="mt-5">
          <ShippingMethodForm
            returnTo="/dashboard/settings/shipping-methods/new"
            successReturnTo="/dashboard/settings/shipping-methods"
            submitLabel="Create delivery method"
            zoneOptions={workspace.zoneOptions}
          />
        </div>
      </AdminPanel>
    </AdminPage>
  );
}
