import { notFound } from "next/navigation";

import { deleteCatalogRecordAction } from "@/app/dashboard/catalog/actions";
import { AdminEditorPage } from "@/components/admin/editor-page";
import { ProductTypeForm } from "@/components/admin/domain-record-forms";
import { CatalogTabs } from "@/components/admin/module-tabs";
import { AdminActionButton, AdminPanel, AdminSectionHeader } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

type ProductTypeDetailPageProps = {
  params: Promise<{
    productTypeId: string;
  }>;
};

export default async function DashboardCatalogProductTypeDetailPage({
  params,
}: ProductTypeDetailPageProps) {
  await requirePermission(PERMISSIONS.catalogView);
  const { productTypeId } = await params;
  const workspace = await adminWorkspaceService.getSimpleRecordWorkspace("product-types", {
    id: productTypeId,
  });
  const record = workspace.selectedRecord;

  if (!record) {
    notFound();
  }

  return (
    <AdminEditorPage
      backHref="/dashboard/catalog/product-types"
      backLabel="Back to product types"
      description="Edit reusable product type records used to classify and organize catalog data."
      main={
        <AdminPanel>
          <AdminSectionHeader
            title="Product type record"
            description="Use dedicated record editing for classification changes instead of managing them from the list page."
          />
          <div className="mt-5">
            <ProductTypeForm
              record={record}
              returnTo={`/dashboard/catalog/product-types/${productTypeId}`}
              submitLabel="Save product type"
            />
          </div>
        </AdminPanel>
      }
      aside={
        <AdminPanel>
          <AdminSectionHeader
            title="Record actions"
            description="Product types can only be removed when they are no longer assigned to products."
          />
          <form action={deleteCatalogRecordAction} className="mt-5">
            <input name="kind" type="hidden" value="product-types" />
            <input name="recordId" type="hidden" value={String(record.id)} />
            <input name="returnTo" type="hidden" value="/dashboard/catalog/product-types" />
            <AdminActionButton tone="rose">Delete unused product type</AdminActionButton>
          </form>
        </AdminPanel>
      }
      tabs={<CatalogTabs currentPath="/dashboard/catalog/product-types" />}
      title="Product Type"
    />
  );
}
