import { CatalogTabs } from "@/components/admin/module-tabs";
import { BrandRecordForm } from "@/components/admin/catalog-forms";
import { AdminQuickCreateModal } from "@/components/admin/quick-create-modal";
import { SimpleRecordPage } from "@/components/admin/simple-record-page";
import { AdminLinkButton } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

type BrandsPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardCatalogBrandsPage({
  searchParams,
}: BrandsPageProps) {
  await requirePermission(PERMISSIONS.catalogView);
  const resolvedSearchParams = await searchParams;
  const workspace = await adminWorkspaceService.getSimpleRecordWorkspace(
    "brands",
    resolvedSearchParams,
  );

  return (
    <SimpleRecordPage
      currentPath="/dashboard/catalog/brands"
      description="Manage brand records with search, activation state, and dedicated edit routes tied to the catalog."
      emptyStateBody="Try a broader filter or create a new brand."
      headerActions={
        <>
          <AdminQuickCreateModal
            description="Create a brand without leaving the list."
            title="Quick Create Brand"
            triggerLabel="Quick create"
          >
            <BrandRecordForm
              countryOptions={workspace.zoneOptions}
              returnTo="/dashboard/catalog/brands"
            />
          </AdminQuickCreateModal>
          <AdminLinkButton href="/dashboard/catalog/brands/new" tone="primary">
            Create new brand
          </AdminLinkButton>
        </>
      }
      itemHrefBuilder={(itemId) => `/dashboard/catalog/brands/${itemId}`}
      searchParams={resolvedSearchParams}
      searchPlaceholder="Brand name or slug"
      tabs={<CatalogTabs currentPath="/dashboard/catalog/brands" />}
      title="Brands"
      workspace={workspace}
    />
  );
}
