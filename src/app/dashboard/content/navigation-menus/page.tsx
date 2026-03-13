import { NavigationMenuForm } from "@/components/admin/domain-record-forms";
import { ContentTabs } from "@/components/admin/module-tabs";
import { AdminQuickCreateModal } from "@/components/admin/quick-create-modal";
import { SimpleRecordPage } from "@/components/admin/simple-record-page";
import { AdminLinkButton } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

type NavigationMenusPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardContentNavigationMenusPage({
  searchParams,
}: NavigationMenusPageProps) {
  await requirePermission(PERMISSIONS.settingsManage);
  const resolvedSearchParams = await searchParams;
  const workspace = await adminWorkspaceService.getSimpleRecordWorkspace(
    "navigation-menus",
    resolvedSearchParams,
  );

  return (
    <SimpleRecordPage
      currentPath="/dashboard/content/navigation-menus"
      description="Manage storefront navigation menus as staff-facing records with dedicated menu editors for structure and links."
      emptyStateBody="Try a broader filter or create a new navigation menu."
      headerActions={
        <>
          <AdminQuickCreateModal
            description="Create a navigation menu without leaving the list."
            title="Quick Create Navigation Menu"
            triggerLabel="Quick create"
          >
            <NavigationMenuForm returnTo="/dashboard/content/navigation-menus" />
          </AdminQuickCreateModal>
          <AdminLinkButton href="/dashboard/content/navigation-menus/new" tone="primary">
            Create new navigation menu
          </AdminLinkButton>
        </>
      }
      itemHrefBuilder={(itemId) => `/dashboard/content/navigation-menus/${itemId}`}
      searchParams={resolvedSearchParams}
      searchPlaceholder="Menu name"
      tabs={<ContentTabs currentPath="/dashboard/content/navigation-menus" />}
      title="Navigation Menus"
      workspace={workspace}
    />
  );
}
