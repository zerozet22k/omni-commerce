import { BrandRecordForm } from "@/components/admin/catalog-forms";
import { AdminActionNotice } from "@/components/admin/action-notice";
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
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

type DashboardCatalogBrandCreatePageProps = {
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardCatalogBrandCreatePage({
  searchParams,
}: DashboardCatalogBrandCreatePageProps) {
  await requirePermission(PERMISSIONS.catalogView);
  const resolvedSearchParams = await searchParams;
  const workspace = await adminWorkspaceService.getSimpleRecordWorkspace("brands", {});

  return (
    <AdminPage>
      <AdminPageHeader
        actions={
          <AdminLinkButton href="/dashboard/catalog/brands" tone="primary">
            Back to brands
          </AdminLinkButton>
        }
        title="Create New Brand"
        description="Use the dedicated brand page when you need the full record instead of creating it inline from the list."
      />

      <CatalogTabs currentPath="/dashboard/catalog/brands/new" />

      <AdminActionNotice searchParams={resolvedSearchParams} />

      <AdminPanel>
        <AdminSectionHeader
          title="Brand record"
          description="Create a brand with its public identity, website, and active state in one place."
        />
        <div className="mt-5">
          <BrandRecordForm
            countryOptions={workspace.zoneOptions}
            returnTo="/dashboard/catalog/brands/new"
            successReturnTo="/dashboard/catalog/brands"
            submitLabel="Create brand"
          />
        </div>
      </AdminPanel>
    </AdminPage>
  );
}
