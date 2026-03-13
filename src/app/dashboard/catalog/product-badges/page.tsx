import { ProductBadgeForm } from "@/components/admin/domain-record-forms";
import { CatalogTabs } from "@/components/admin/module-tabs";
import { AdminQuickCreateModal } from "@/components/admin/quick-create-modal";
import { SimpleRecordPage } from "@/components/admin/simple-record-page";
import { AdminLinkButton } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

type ProductBadgesPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardCatalogProductBadgesPage({
  searchParams,
}: ProductBadgesPageProps) {
  await requirePermission(PERMISSIONS.catalogView);
  const resolvedSearchParams = await searchParams;
  const workspace = await adminWorkspaceService.getSimpleRecordWorkspace(
    "product-badges",
    resolvedSearchParams,
  );

  return (
    <SimpleRecordPage
      currentPath="/dashboard/catalog/product-badges"
      description="Manage reusable badge records with search, activation state, and dedicated edit routes."
      emptyStateBody="Try a broader filter or create a new product badge."
      headerActions={
        <>
          <AdminQuickCreateModal
            description="Create a product badge without leaving the list."
            title="Quick Create Product Badge"
            triggerLabel="Quick create"
          >
            <ProductBadgeForm returnTo="/dashboard/catalog/product-badges" />
          </AdminQuickCreateModal>
          <AdminLinkButton href="/dashboard/catalog/product-badges/new" tone="primary">
            Create new product badge
          </AdminLinkButton>
        </>
      }
      itemHrefBuilder={(itemId) => `/dashboard/catalog/product-badges/${itemId}`}
      searchParams={resolvedSearchParams}
      searchPlaceholder="Badge name, label, or color"
      tabs={<CatalogTabs currentPath="/dashboard/catalog/product-badges" />}
      title="Product Badges"
      workspace={workspace}
    />
  );
}
