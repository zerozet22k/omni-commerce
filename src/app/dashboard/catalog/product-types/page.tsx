import { ProductTypeForm } from "@/components/admin/domain-record-forms";
import { CatalogTabs } from "@/components/admin/module-tabs";
import { AdminQuickCreateModal } from "@/components/admin/quick-create-modal";
import { SimpleRecordPage } from "@/components/admin/simple-record-page";
import { AdminLinkButton } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

type ProductTypesPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardCatalogProductTypesPage({
  searchParams,
}: ProductTypesPageProps) {
  await requirePermission(PERMISSIONS.catalogView);
  const resolvedSearchParams = await searchParams;
  const workspace = await adminWorkspaceService.getSimpleRecordWorkspace(
    "product-types",
    resolvedSearchParams,
  );

  return (
    <SimpleRecordPage
      currentPath="/dashboard/catalog/product-types"
      description="Manage reusable product classification records with search, state visibility, and dedicated edit routes."
      emptyStateBody="Try a broader filter or create a new product type."
      headerActions={
        <>
          <AdminQuickCreateModal
            description="Create a product type without leaving the list."
            title="Quick Create Product Type"
            triggerLabel="Quick create"
          >
            <ProductTypeForm returnTo="/dashboard/catalog/product-types" />
          </AdminQuickCreateModal>
          <AdminLinkButton href="/dashboard/catalog/product-types/new" tone="primary">
            Create new product type
          </AdminLinkButton>
        </>
      }
      itemHrefBuilder={(itemId) => `/dashboard/catalog/product-types/${itemId}`}
      searchParams={resolvedSearchParams}
      searchPlaceholder="Product type name or code"
      tabs={<CatalogTabs currentPath="/dashboard/catalog/product-types" />}
      title="Product Types"
      workspace={workspace}
    />
  );
}
