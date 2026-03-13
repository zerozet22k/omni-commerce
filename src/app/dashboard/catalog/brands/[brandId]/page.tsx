import { notFound } from "next/navigation";

import { deleteCatalogRecordAction } from "@/app/dashboard/catalog/actions";
import { BrandRecordForm } from "@/components/admin/catalog-forms";
import { AdminEditorPage } from "@/components/admin/editor-page";
import { CatalogTabs } from "@/components/admin/module-tabs";
import { AdminActionButton, AdminPanel, AdminSectionHeader } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

type BrandDetailPageProps = {
  params: Promise<{
    brandId: string;
  }>;
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardCatalogBrandDetailPage({
  params,
  searchParams,
}: BrandDetailPageProps) {
  await requirePermission(PERMISSIONS.catalogView);
  const { brandId } = await params;
  const resolvedSearchParams = await searchParams;
  const workspace = await adminWorkspaceService.getSimpleRecordWorkspace("brands", {
    id: brandId,
  });
  const record = workspace.selectedRecord;

  if (!record) {
    notFound();
  }

  return (
    <AdminEditorPage
      backHref="/dashboard/catalog/brands"
      backLabel="Back to brands"
      description="Edit brand identity, activation state, and reference fields from one focused record screen."
      main={
        <AdminPanel>
          <AdminSectionHeader
            title="Brand record"
            description="Changes here update the brand record used across product attribution and storefront presentation."
          />
          <div className="mt-5">
            <BrandRecordForm
              countryOptions={workspace.zoneOptions}
              record={record}
              returnTo={`/dashboard/catalog/brands/${brandId}`}
              submitLabel="Save brand"
            />
          </div>
        </AdminPanel>
      }
      aside={
        <AdminPanel>
          <AdminSectionHeader
            title="Record actions"
            description="Brands already linked to products are archived instead of being deleted."
          />
          <form action={deleteCatalogRecordAction} className="mt-5">
            <input name="kind" type="hidden" value="brands" />
            <input name="recordId" type="hidden" value={String(record.id)} />
            <input name="returnTo" type="hidden" value="/dashboard/catalog/brands" />
            <AdminActionButton tone="rose">Delete or archive brand</AdminActionButton>
          </form>
        </AdminPanel>
      }
      searchParams={resolvedSearchParams}
      tabs={<CatalogTabs currentPath="/dashboard/catalog/brands" />}
      title="Brand"
    />
  );
}
