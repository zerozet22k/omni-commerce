import { notFound } from "next/navigation";

import { deleteCatalogRecordAction } from "@/app/dashboard/catalog/actions";
import { AdminEditorPage } from "@/components/admin/editor-page";
import { ProductBadgeForm } from "@/components/admin/domain-record-forms";
import { CatalogTabs } from "@/components/admin/module-tabs";
import { AdminActionButton, AdminPanel, AdminSectionHeader } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

type ProductBadgeDetailPageProps = {
  params: Promise<{
    productBadgeId: string;
  }>;
};

export default async function DashboardCatalogProductBadgeDetailPage({
  params,
}: ProductBadgeDetailPageProps) {
  await requirePermission(PERMISSIONS.catalogView);
  const { productBadgeId } = await params;
  const workspace = await adminWorkspaceService.getSimpleRecordWorkspace("product-badges", {
    id: productBadgeId,
  });
  const record = workspace.selectedRecord;

  if (!record) {
    notFound();
  }

  return (
    <AdminEditorPage
      backHref="/dashboard/catalog/product-badges"
      backLabel="Back to product badges"
      description="Edit reusable badge records used across product cards, lists, and merchandising treatments."
      main={
        <AdminPanel>
          <AdminSectionHeader
            title="Product badge record"
            description="Use dedicated record editing for badge configuration instead of mixing edits into the list page."
          />
          <div className="mt-5">
            <ProductBadgeForm
              record={record}
              returnTo={`/dashboard/catalog/product-badges/${productBadgeId}`}
              submitLabel="Save product badge"
            />
          </div>
        </AdminPanel>
      }
      aside={
        <AdminPanel>
          <AdminSectionHeader
            title="Record actions"
            description="Badges already attached to products are deactivated instead of being deleted."
          />
          <form action={deleteCatalogRecordAction} className="mt-5">
            <input name="kind" type="hidden" value="product-badges" />
            <input name="recordId" type="hidden" value={String(record.id)} />
            <input name="returnTo" type="hidden" value="/dashboard/catalog/product-badges" />
            <AdminActionButton tone="rose">Delete or deactivate badge</AdminActionButton>
          </form>
        </AdminPanel>
      }
      tabs={<CatalogTabs currentPath="/dashboard/catalog/product-badges" />}
      title="Product Badge"
    />
  );
}
