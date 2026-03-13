import { CollectionRecordForm } from "@/components/admin/catalog-forms";
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

export default async function DashboardCatalogCollectionCreatePage() {
  await requirePermission(PERMISSIONS.catalogView);

  return (
    <AdminPage>
      <AdminPageHeader
        actions={
          <AdminLinkButton href="/dashboard/catalog/collections" tone="primary">
            Back to collections
          </AdminLinkButton>
        }
        title="Create New Collection"
        description="Use the dedicated collection page when you need the full record instead of creating it inline from the list."
      />

      <CatalogTabs currentPath="/dashboard/catalog/collections/new" />

      <AdminPanel>
        <AdminSectionHeader
          title="Collection record"
          description="Create a collection with merchandising copy, sorting, and active state in one place."
        />
        <div className="mt-5">
          <CollectionRecordForm
            returnTo="/dashboard/catalog/collections"
            submitLabel="Create collection"
          />
        </div>
      </AdminPanel>
    </AdminPage>
  );
}
