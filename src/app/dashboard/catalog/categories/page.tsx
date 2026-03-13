import { CatalogTabs } from "@/components/admin/module-tabs";
import { CategoryRecordForm } from "@/components/admin/catalog-forms";
import { AdminQuickCreateModal } from "@/components/admin/quick-create-modal";
import { SimpleRecordPage } from "@/components/admin/simple-record-page";
import { AdminLinkButton } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

type CategoriesPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardCatalogCategoriesPage({
  searchParams,
}: CategoriesPageProps) {
  await requirePermission(PERMISSIONS.catalogView);
  const resolvedSearchParams = await searchParams;
  const workspace = await adminWorkspaceService.getSimpleRecordWorkspace(
    "categories",
    resolvedSearchParams,
  );

  return (
    <SimpleRecordPage
      currentPath="/dashboard/catalog/categories"
      description="Manage category structure as operational records, with clear search, activation state, and dedicated edit routes."
      emptyStateBody="Try a broader filter or create a new category."
      headerActions={
        <>
          <AdminQuickCreateModal
            description="Create a category without leaving the list."
            title="Quick Create Category"
            triggerLabel="Quick create"
          >
            <CategoryRecordForm
              categoryOptions={workspace.categoryOptions}
              returnTo="/dashboard/catalog/categories"
            />
          </AdminQuickCreateModal>
          <AdminLinkButton href="/dashboard/catalog/categories/new" tone="primary">
            Create new category
          </AdminLinkButton>
        </>
      }
      itemHrefBuilder={(itemId) => `/dashboard/catalog/categories/${itemId}`}
      searchParams={resolvedSearchParams}
      searchPlaceholder="Category name or slug"
      tabs={<CatalogTabs currentPath="/dashboard/catalog/categories" />}
      title="Categories"
      workspace={workspace}
    />
  );
}
