import { PageRecordForm } from "@/components/admin/domain-record-forms";
import { ContentTabs } from "@/components/admin/module-tabs";
import { AdminQuickCreateModal } from "@/components/admin/quick-create-modal";
import { SimpleRecordPage } from "@/components/admin/simple-record-page";
import { AdminLinkButton } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

type ContentPagesPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardContentPagesPage({
  searchParams,
}: ContentPagesPageProps) {
  await requirePermission(PERMISSIONS.settingsManage);
  const resolvedSearchParams = await searchParams;
  const workspace = await adminWorkspaceService.getSimpleRecordWorkspace(
    "pages",
    resolvedSearchParams,
  );

  return (
    <SimpleRecordPage
      currentPath="/dashboard/content/pages"
      description="Manage storefront page records with publication state, slugs, SEO fields, and dedicated edit routes."
      emptyStateBody="Try a broader filter or create a new page."
      headerActions={
        <>
          <AdminQuickCreateModal
            description="Create a page without leaving the list."
            title="Quick Create Page"
            triggerLabel="Quick create"
          >
            <PageRecordForm returnTo="/dashboard/content/pages" />
          </AdminQuickCreateModal>
          <AdminLinkButton href="/dashboard/content/pages/new" tone="primary">
            Create new page
          </AdminLinkButton>
        </>
      }
      itemHrefBuilder={(itemId) => `/dashboard/content/pages/${itemId}`}
      searchParams={resolvedSearchParams}
      searchPlaceholder="Page title, slug, or SEO title"
      tabs={<ContentTabs currentPath="/dashboard/content/pages" />}
      title="Pages"
      workspace={workspace}
    />
  );
}
