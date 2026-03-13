import { ProductTagForm } from "@/components/admin/domain-record-forms";
import { CatalogTabs } from "@/components/admin/module-tabs";
import { AdminQuickCreateModal } from "@/components/admin/quick-create-modal";
import { SimpleRecordPage } from "@/components/admin/simple-record-page";
import { AdminLinkButton } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

type ProductTagsPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardCatalogProductTagsPage({
  searchParams,
}: ProductTagsPageProps) {
  await requirePermission(PERMISSIONS.catalogView);
  const resolvedSearchParams = await searchParams;
  const workspace = await adminWorkspaceService.getSimpleRecordWorkspace(
    "product-tags",
    resolvedSearchParams,
  );

  return (
    <SimpleRecordPage
      currentPath="/dashboard/catalog/product-tags"
      description="Manage reusable product tags with search, usage visibility, and dedicated edit routes."
      emptyStateBody="Try a broader filter or create a new product tag."
      headerActions={
        <>
          <AdminQuickCreateModal
            description="Create a product tag without leaving the list."
            title="Quick Create Product Tag"
            triggerLabel="Quick create"
          >
            <ProductTagForm returnTo="/dashboard/catalog/product-tags" />
          </AdminQuickCreateModal>
          <AdminLinkButton href="/dashboard/catalog/product-tags/new" tone="primary">
            Create new product tag
          </AdminLinkButton>
        </>
      }
      itemHrefBuilder={(itemId) => `/dashboard/catalog/product-tags/${itemId}`}
      searchParams={resolvedSearchParams}
      searchPlaceholder="Tag name or slug"
      tabs={<CatalogTabs currentPath="/dashboard/catalog/product-tags" />}
      title="Product Tags"
      workspace={workspace}
    />
  );
}
