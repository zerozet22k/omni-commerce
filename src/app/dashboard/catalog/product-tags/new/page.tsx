import { ProductTagForm } from "@/components/admin/domain-record-forms";
import { CatalogTabs } from "@/components/admin/module-tabs";
import { AdminLinkButton, AdminPage, AdminPageHeader, AdminPanel, AdminSectionHeader } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";

export default async function DashboardCatalogProductTagCreatePage() {
  await requirePermission(PERMISSIONS.catalogView);

  return (
    <AdminPage>
      <AdminPageHeader
        actions={
          <AdminLinkButton href="/dashboard/catalog/product-tags" tone="primary">
            Back to product tags
          </AdminLinkButton>
        }
        title="Create New Product Tag"
        description="Create reusable product tags from a dedicated page instead of mixing creation into the list."
      />
      <CatalogTabs currentPath="/dashboard/catalog/product-tags/new" />
      <AdminPanel>
        <AdminSectionHeader
          title="Product tag record"
          description="Tags support merchandising, search, and lightweight product labeling across the catalog."
        />
        <div className="mt-5">
          <ProductTagForm
            returnTo="/dashboard/catalog/product-tags"
            submitLabel="Create product tag"
          />
        </div>
      </AdminPanel>
    </AdminPage>
  );
}
