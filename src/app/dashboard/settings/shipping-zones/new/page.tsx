import { ShippingZoneForm } from "@/components/admin/domain-record-forms";
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

type DashboardShippingZoneCreatePageProps = {
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardShippingZoneCreatePage({
  searchParams,
}: DashboardShippingZoneCreatePageProps) {
  await requirePermission(PERMISSIONS.settingsManage);
  const resolvedSearchParams = await searchParams;
  const workspace = await adminWorkspaceService.getSimpleRecordWorkspace("shipping-zones", {});

  return (
    <AdminPage>
      <AdminPageHeader
        actions={
          <AdminLinkButton href="/dashboard/settings/shipping-zones" tone="primary">
            Back to shipping zones
          </AdminLinkButton>
        }
        title="Create Shipping Zone"
        description="Create a shipping zone and map the countries it covers."
      />
      <SettingsTabs currentPath="/dashboard/settings/shipping-zones/new" />
      <AdminActionNotice searchParams={resolvedSearchParams} />
      <AdminPanel>
        <AdminSectionHeader
          title="Shipping zone record"
          description="Use shipping zones to group countries before attaching delivery methods and rate rules."
        />
        <div className="mt-5">
          <ShippingZoneForm
            countryOptions={workspace.countryOptions}
            returnTo="/dashboard/settings/shipping-zones/new"
            successReturnTo="/dashboard/settings/shipping-zones"
            submitLabel="Create shipping zone"
          />
        </div>
      </AdminPanel>
    </AdminPage>
  );
}
