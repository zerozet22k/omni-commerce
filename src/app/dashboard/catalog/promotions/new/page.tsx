import { PromotionForm } from "@/components/admin/catalog-forms";
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

export default async function DashboardCatalogPromotionCreatePage() {
  await requirePermission(PERMISSIONS.catalogView);

  return (
    <AdminPage>
      <AdminPageHeader
        actions={
          <AdminLinkButton href="/dashboard/catalog/promotions" tone="primary">
            Back to promotions
          </AdminLinkButton>
        }
        title="Create New Promotion"
        description="Use the dedicated promotion page when you need the full discount, schedule, and targeting workflow."
      />

      <CatalogTabs currentPath="/dashboard/catalog/promotions/new" />

      <AdminPanel>
        <AdminSectionHeader
          title="Promotion record"
          description="Create the campaign with full discount rules and searchable targeting instead of trying to manage it from the list view."
        />
        <div className="mt-5">
          <PromotionForm
            redirectToDetail
            returnTo="/dashboard/catalog/promotions"
            submitLabel="Create promotion"
          />
        </div>
      </AdminPanel>
    </AdminPage>
  );
}
