import { notFound } from "next/navigation";

import { deleteCatalogRecordAction } from "@/app/dashboard/catalog/actions";
import { AdminEditorPage } from "@/components/admin/editor-page";
import { ProductTagForm } from "@/components/admin/domain-record-forms";
import { CatalogTabs } from "@/components/admin/module-tabs";
import { AdminActionButton, AdminPanel, AdminSectionHeader } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

type ProductTagDetailPageProps = {
  params: Promise<{
    productTagId: string;
  }>;
};

export default async function DashboardCatalogProductTagDetailPage({
  params,
}: ProductTagDetailPageProps) {
  await requirePermission(PERMISSIONS.catalogView);
  const { productTagId } = await params;
  const workspace = await adminWorkspaceService.getSimpleRecordWorkspace("product-tags", {
    id: productTagId,
  });
  const record = workspace.selectedRecord;

  if (!record) {
    notFound();
  }

  return (
    <AdminEditorPage
      backHref="/dashboard/catalog/product-tags"
      backLabel="Back to product tags"
      description="Edit reusable product tag records used for filtering, grouping, and merchandising."
      main={
        <AdminPanel>
          <AdminSectionHeader
            title="Product tag record"
            description="Use dedicated record editing for reusable tags instead of mixing edits into the list page."
          />
          <div className="mt-5">
            <ProductTagForm
              record={record}
              returnTo={`/dashboard/catalog/product-tags/${productTagId}`}
              submitLabel="Save product tag"
            />
          </div>
        </AdminPanel>
      }
      aside={
        <AdminPanel>
          <AdminSectionHeader
            title="Record actions"
            description="Tags can only be removed when they are no longer attached to products."
          />
          <form action={deleteCatalogRecordAction} className="mt-5">
            <input name="kind" type="hidden" value="product-tags" />
            <input name="recordId" type="hidden" value={String(record.id)} />
            <input name="returnTo" type="hidden" value="/dashboard/catalog/product-tags" />
            <AdminActionButton tone="rose">Delete unused product tag</AdminActionButton>
          </form>
        </AdminPanel>
      }
      tabs={<CatalogTabs currentPath="/dashboard/catalog/product-tags" />}
      title="Product Tag"
    />
  );
}
