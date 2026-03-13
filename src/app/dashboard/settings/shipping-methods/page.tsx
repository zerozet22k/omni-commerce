import { ShippingMethodForm } from "@/components/admin/domain-record-forms";
import { SettingsTabs } from "@/components/admin/module-tabs";
import { AdminQuickCreateModal } from "@/components/admin/quick-create-modal";
import { SimpleRecordPage } from "@/components/admin/simple-record-page";
import { AdminLinkButton } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

type ShippingMethodsPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardShippingMethodsPage({
  searchParams,
}: ShippingMethodsPageProps) {
  await requirePermission(PERMISSIONS.settingsManage);
  const resolvedSearchParams = await searchParams;
  const workspace = await adminWorkspaceService.getSimpleRecordWorkspace(
    "shipping-methods",
    resolvedSearchParams,
  );

  return (
    <SimpleRecordPage
      currentPath="/dashboard/settings/shipping-methods"
      description="Manage delivery methods used by checkout, order routing, and shipment operations."
      headerActions={
        <>
          <AdminQuickCreateModal
            description="Create a delivery method without leaving the table."
            title="Quick Create Delivery Method"
            triggerLabel="Quick create"
          >
            <ShippingMethodForm
              returnTo="/dashboard/settings/shipping-methods"
              zoneOptions={workspace.zoneOptions}
            />
          </AdminQuickCreateModal>
          <AdminLinkButton href="/dashboard/settings/shipping-methods/new" tone="primary">
            Create new delivery method
          </AdminLinkButton>
        </>
      }
      itemHrefBuilder={(itemId) => `/dashboard/settings/shipping-methods/${itemId}`}
      searchParams={resolvedSearchParams}
      searchPlaceholder="Method name, code, description"
      tabs={<SettingsTabs currentPath="/dashboard/settings/shipping-methods" />}
      title="Delivery Methods"
      workspace={workspace}
    />
  );
}
