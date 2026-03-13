import { ProductTypeForm } from "@/components/admin/domain-record-forms";
import { CatalogTabs } from "@/components/admin/module-tabs";
import { AdminLinkButton, AdminPage, AdminPageHeader, AdminPanel, AdminSectionHeader } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";

export default async function DashboardCatalogProductTypeCreatePage() {
  await requirePermission(PERMISSIONS.catalogView);

  return (
    <AdminPage>
      <AdminPageHeader
        actions={
          <AdminLinkButton href="/dashboard/catalog/product-types" tone="primary">
            Back to product types
          </AdminLinkButton>
        }
        title="Create New Product Type"
        description="Create a reusable product classification record without working from the list view."
      />
      <CatalogTabs currentPath="/dashboard/catalog/product-types/new" />
      <AdminPanel>
        <AdminSectionHeader
          title="Product type record"
          description="Use product types to keep broad catalog structure consistent across product creation and filtering."
        />
        <div className="mt-5">
          <ProductTypeForm
            returnTo="/dashboard/catalog/product-types"
            submitLabel="Create product type"
          />
        </div>
      </AdminPanel>
    </AdminPage>
  );
}
