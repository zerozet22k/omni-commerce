import { CatalogTabs } from "@/components/admin/module-tabs";
import { CollectionRecordForm } from "@/components/admin/catalog-forms";
import { AdminQuickCreateModal } from "@/components/admin/quick-create-modal";
import { SimpleRecordPage } from "@/components/admin/simple-record-page";
import { AdminLinkButton } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

type CollectionsPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardCatalogCollectionsPage({
  searchParams,
}: CollectionsPageProps) {
  await requirePermission(PERMISSIONS.catalogView);
  const resolvedSearchParams = await searchParams;
  const workspace = await adminWorkspaceService.getSimpleRecordWorkspace(
    "collections",
    resolvedSearchParams,
  );

  return (
    <SimpleRecordPage
      currentPath="/dashboard/catalog/collections"
      description="Manage collection records as reusable merchandising units with search, ordering, and dedicated edit routes."
      emptyStateBody="Try a broader filter or create a new collection."
      headerActions={
        <>
          <AdminQuickCreateModal
            description="Create a collection without leaving the list."
            title="Quick Create Collection"
            triggerLabel="Quick create"
          >
            <CollectionRecordForm returnTo="/dashboard/catalog/collections" />
          </AdminQuickCreateModal>
          <AdminLinkButton href="/dashboard/catalog/collections/new" tone="primary">
            Create new collection
          </AdminLinkButton>
        </>
      }
      itemHrefBuilder={(itemId) => `/dashboard/catalog/collections/${itemId}`}
      searchParams={resolvedSearchParams}
      searchPlaceholder="Collection name or slug"
      tabs={<CatalogTabs currentPath="/dashboard/catalog/collections" />}
      title="Collections"
      workspace={workspace}
    />
  );
}
