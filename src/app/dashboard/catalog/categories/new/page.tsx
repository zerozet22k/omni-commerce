import { CategoryRecordForm } from "@/components/admin/catalog-forms";
import { CatalogTabs } from "@/components/admin/module-tabs";
import {
  AdminLinkButton,
  AdminPage,
  AdminPageHeader,
  AdminPanel,
  AdminSectionHeader,
} from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

export default async function DashboardCatalogCategoryCreatePage() {
  await requirePermission(PERMISSIONS.catalogView);
  const workspace = await adminWorkspaceService.getSimpleRecordWorkspace("categories", {});

  return (
    <AdminPage>
      <AdminPageHeader
        actions={
          <AdminLinkButton href="/dashboard/catalog/categories" tone="primary">
            Back to categories
          </AdminLinkButton>
        }
        title="Create New Category"
        description="Use the dedicated category page when you need the full record instead of creating it inline from the list."
      />

      <CatalogTabs currentPath="/dashboard/catalog/categories/new" />

      <AdminPanel>
        <AdminSectionHeader
          title="Category record"
          description="Create a new category with structure, ordering, and SEO fields in one place."
        />
        <div className="mt-5">
          <CategoryRecordForm
            categoryOptions={workspace.categoryOptions}
            returnTo="/dashboard/catalog/categories"
            submitLabel="Create category"
          />
        </div>
      </AdminPanel>
    </AdminPage>
  );
}
