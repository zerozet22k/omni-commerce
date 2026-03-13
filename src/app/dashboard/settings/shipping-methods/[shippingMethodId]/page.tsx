import { notFound } from "next/navigation";

import { deleteSettingsRecordAction } from "@/app/dashboard/settings/actions";
import { ShippingMethodForm } from "@/components/admin/domain-record-forms";
import { AdminEditorPage } from "@/components/admin/editor-page";
import { SettingsTabs } from "@/components/admin/module-tabs";
import { AdminActionButton, AdminPanel, AdminSectionHeader } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

type DashboardShippingMethodDetailPageProps = {
  params: Promise<{
    shippingMethodId: string;
  }>;
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardShippingMethodDetailPage({
  params,
  searchParams,
}: DashboardShippingMethodDetailPageProps) {
  await requirePermission(PERMISSIONS.settingsManage);
  const { shippingMethodId } = await params;
  const resolvedSearchParams = await searchParams;
  const workspace = await adminWorkspaceService.getSimpleRecordWorkspace("shipping-methods", {
    id: shippingMethodId,
  });
  const record = workspace.selectedRecord;

  if (!record) {
    notFound();
  }

  return (
    <AdminEditorPage
      backHref="/dashboard/settings/shipping-methods"
      backLabel="Back to delivery methods"
      description="Edit the shared delivery method record in a dedicated workspace instead of inside the table page."
      main={
        <AdminPanel>
          <AdminSectionHeader
            title="Delivery method record"
            description="Update the shared delivery method used by checkout and shipment operations."
          />
          <div className="mt-5">
            <ShippingMethodForm
              record={record}
              returnTo={`/dashboard/settings/shipping-methods/${shippingMethodId}`}
              submitLabel="Save delivery method"
              zoneOptions={workspace.zoneOptions}
            />
          </div>
        </AdminPanel>
      }
      aside={
        <AdminPanel>
          <AdminSectionHeader
            title="Record actions"
            description="Delivery methods already referenced by orders are deactivated instead of being removed."
          />
          <form action={deleteSettingsRecordAction} className="mt-5">
            <input name="kind" type="hidden" value="shipping-methods" />
            <input name="recordId" type="hidden" value={String(record.id)} />
            <input name="returnTo" type="hidden" value="/dashboard/settings/shipping-methods" />
            <AdminActionButton tone="rose">Delete or deactivate delivery method</AdminActionButton>
          </form>
        </AdminPanel>
      }
      searchParams={resolvedSearchParams}
      tabs={<SettingsTabs currentPath="/dashboard/settings/shipping-methods" />}
      title="Delivery Method"
    />
  );
}
