import { ProductBadgeForm } from "@/components/admin/domain-record-forms";
import { CatalogTabs } from "@/components/admin/module-tabs";
import { AdminLinkButton, AdminPage, AdminPageHeader, AdminPanel, AdminSectionHeader } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";

export default async function DashboardCatalogProductBadgeCreatePage() {
  await requirePermission(PERMISSIONS.catalogView);

  return (
    <AdminPage>
      <AdminPageHeader
        actions={
          <AdminLinkButton href="/dashboard/catalog/product-badges" tone="primary">
            Back to product badges
          </AdminLinkButton>
        }
        title="Create New Product Badge"
        description="Create reusable product badges from a dedicated page instead of working from the list."
      />
      <CatalogTabs currentPath="/dashboard/catalog/product-badges/new" />
      <AdminPanel>
        <AdminSectionHeader
          title="Product badge record"
          description="Badges help staff flag new, hot, limited, or sale items consistently across the catalog."
        />
        <div className="mt-5">
          <ProductBadgeForm
            returnTo="/dashboard/catalog/product-badges"
            submitLabel="Create product badge"
          />
        </div>
      </AdminPanel>
    </AdminPage>
  );
}
