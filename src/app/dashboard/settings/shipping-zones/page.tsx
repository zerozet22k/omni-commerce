import { ShippingZoneForm } from "@/components/admin/domain-record-forms";
import { SettingsTabs } from "@/components/admin/module-tabs";
import { AdminQuickCreateModal } from "@/components/admin/quick-create-modal";
import { SimpleRecordPage } from "@/components/admin/simple-record-page";
import { AdminLinkButton } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

type ShippingZonesPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardShippingZonesPage({
  searchParams,
}: ShippingZonesPageProps) {
  await requirePermission(PERMISSIONS.settingsManage);
  const resolvedSearchParams = await searchParams;
  const workspace = await adminWorkspaceService.getSimpleRecordWorkspace(
    "shipping-zones",
    resolvedSearchParams,
  );

  return (
    <SimpleRecordPage
      currentPath="/dashboard/settings/shipping-zones"
      description="Manage shipping zones and the countries they cover for delivery method assignment."
      headerActions={
        <>
          <AdminQuickCreateModal
            description="Create a shipping zone without leaving the list."
            title="Quick Create Shipping Zone"
            triggerLabel="Quick create"
          >
            <ShippingZoneForm
              countryOptions={workspace.countryOptions}
              returnTo="/dashboard/settings/shipping-zones"
            />
          </AdminQuickCreateModal>
          <AdminLinkButton href="/dashboard/settings/shipping-zones/new" tone="primary">
            Create new shipping zone
          </AdminLinkButton>
        </>
      }
      itemHrefBuilder={(itemId) => `/dashboard/settings/shipping-zones/${itemId}`}
      searchParams={resolvedSearchParams}
      searchPlaceholder="Zone name or description"
      tabs={<SettingsTabs currentPath="/dashboard/settings/shipping-zones" />}
      title="Shipping Zones"
      workspace={workspace}
    />
  );
}
