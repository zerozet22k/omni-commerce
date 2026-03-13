import { notFound } from "next/navigation";

import { deleteCatalogRecordAction } from "@/app/dashboard/catalog/actions";
import { CollectionRecordForm } from "@/components/admin/catalog-forms";
import { AdminEditorPage } from "@/components/admin/editor-page";
import { CatalogTabs } from "@/components/admin/module-tabs";
import { AdminActionButton, AdminPanel, AdminSectionHeader } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

type CollectionDetailPageProps = {
  params: Promise<{
    collectionId: string;
  }>;
};

export default async function DashboardCatalogCollectionDetailPage({
  params,
}: CollectionDetailPageProps) {
  await requirePermission(PERMISSIONS.catalogView);
  const { collectionId } = await params;
  const workspace = await adminWorkspaceService.getSimpleRecordWorkspace("collections", {
    id: collectionId,
  });
  const record = workspace.selectedRecord;

  if (!record) {
    notFound();
  }

  return (
    <AdminEditorPage
      backHref="/dashboard/catalog/collections"
      backLabel="Back to collections"
      description="Edit collection merchandising details, ordering, and activation state from one focused record screen."
      main={
        <AdminPanel>
          <AdminSectionHeader
            title="Collection record"
            description="Changes here update the reusable collection record used across catalog merchandising."
          />
          <div className="mt-5">
            <CollectionRecordForm
              record={record}
              returnTo={`/dashboard/catalog/collections/${collectionId}`}
              submitLabel="Save collection"
            />
          </div>
        </AdminPanel>
      }
      aside={
        <AdminPanel>
          <AdminSectionHeader
            title="Record actions"
            description="Collections already linked to products are archived instead of being deleted."
          />
          <form action={deleteCatalogRecordAction} className="mt-5">
            <input name="kind" type="hidden" value="collections" />
            <input name="recordId" type="hidden" value={String(record.id)} />
            <input name="returnTo" type="hidden" value="/dashboard/catalog/collections" />
            <AdminActionButton tone="rose">Delete or archive collection</AdminActionButton>
          </form>
        </AdminPanel>
      }
      tabs={<CatalogTabs currentPath="/dashboard/catalog/collections" />}
      title="Collection"
    />
  );
}
