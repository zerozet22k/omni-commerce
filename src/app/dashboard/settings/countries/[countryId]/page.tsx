import { notFound } from "next/navigation";

import { deleteSettingsRecordAction } from "@/app/dashboard/settings/actions";
import { CountryRecordForm } from "@/components/admin/domain-record-forms";
import { AdminEditorPage } from "@/components/admin/editor-page";
import { SettingsTabs } from "@/components/admin/module-tabs";
import { AdminActionButton, AdminPanel, AdminSectionHeader } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

type DashboardCountryDetailPageProps = {
  params: Promise<{
    countryId: string;
  }>;
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardCountryDetailPage({
  params,
  searchParams,
}: DashboardCountryDetailPageProps) {
  await requirePermission(PERMISSIONS.settingsManage);
  const { countryId } = await params;
  const resolvedSearchParams = await searchParams;
  const workspace = await adminWorkspaceService.getSimpleRecordWorkspace("countries", {
    id: countryId,
  });
  const record = workspace.selectedRecord;

  if (!record) {
    notFound();
  }

  return (
    <AdminEditorPage
      backHref="/dashboard/settings/countries"
      backLabel="Back to countries"
      description="Edit the shared country record used throughout catalog, checkout, and tax workflows."
      main={
        <AdminPanel>
          <AdminSectionHeader
            title="Country record"
            description="Changes here update the shared country reference used by origin selectors, addresses, and pricing rules."
          />
          <div className="mt-5">
            <CountryRecordForm
              record={record}
              returnTo={`/dashboard/settings/countries/${countryId}`}
              submitLabel="Save country"
            />
          </div>
        </AdminPanel>
      }
      aside={
        <AdminPanel>
          <AdminSectionHeader
            title="Record actions"
            description="Countries can only be deleted when they are not referenced by products, brands, addresses, states, tax rates, or shipping zones."
          />
          <form action={deleteSettingsRecordAction} className="mt-5">
            <input name="kind" type="hidden" value="countries" />
            <input name="recordId" type="hidden" value={String(record.id)} />
            <input name="returnTo" type="hidden" value="/dashboard/settings/countries" />
            <AdminActionButton tone="rose">Delete country</AdminActionButton>
          </form>
        </AdminPanel>
      }
      searchParams={resolvedSearchParams}
      tabs={<SettingsTabs currentPath="/dashboard/settings/countries" />}
      title="Country"
    />
  );
}
