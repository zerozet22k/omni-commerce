import { notFound } from "next/navigation";

import { deleteSettingsRecordAction } from "@/app/dashboard/settings/actions";
import { ShippingZoneForm } from "@/components/admin/domain-record-forms";
import { AdminEditorPage } from "@/components/admin/editor-page";
import { SettingsTabs } from "@/components/admin/module-tabs";
import { AdminActionButton, AdminPanel, AdminSectionHeader } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

type DashboardShippingZoneDetailPageProps = {
  params: Promise<{
    shippingZoneId: string;
  }>;
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardShippingZoneDetailPage({
  params,
  searchParams,
}: DashboardShippingZoneDetailPageProps) {
  await requirePermission(PERMISSIONS.settingsManage);
  const { shippingZoneId } = await params;
  const resolvedSearchParams = await searchParams;
  const workspace = await adminWorkspaceService.getSimpleRecordWorkspace("shipping-zones", {
    id: shippingZoneId,
  });
  const record = workspace.selectedRecord;

  if (!record) {
    notFound();
  }

  return (
    <AdminEditorPage
      backHref="/dashboard/settings/shipping-zones"
      backLabel="Back to shipping zones"
      description="Update the shared shipping zone record in a dedicated workspace."
      main={
        <AdminPanel>
          <AdminSectionHeader
            title="Shipping zone record"
            description="Update country coverage and active state without leaving the settings workflow."
          />
          <div className="mt-5">
            <ShippingZoneForm
              countryOptions={workspace.countryOptions}
              record={record}
              returnTo={`/dashboard/settings/shipping-zones/${shippingZoneId}`}
              submitLabel="Save shipping zone"
            />
          </div>
        </AdminPanel>
      }
      aside={
        <AdminPanel>
          <AdminSectionHeader
            title="Record actions"
            description="Shipping zones that already own delivery methods are deactivated instead of being deleted."
          />
          <form action={deleteSettingsRecordAction} className="mt-5">
            <input name="kind" type="hidden" value="shipping-zones" />
            <input name="recordId" type="hidden" value={String(record.id)} />
            <input name="returnTo" type="hidden" value="/dashboard/settings/shipping-zones" />
            <AdminActionButton tone="rose">Delete or deactivate shipping zone</AdminActionButton>
          </form>
        </AdminPanel>
      }
      searchParams={resolvedSearchParams}
      tabs={<SettingsTabs currentPath="/dashboard/settings/shipping-zones" />}
      title="Shipping Zone"
    />
  );
}
