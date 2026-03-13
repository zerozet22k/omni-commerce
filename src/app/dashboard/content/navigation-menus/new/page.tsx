import { NavigationMenuForm } from "@/components/admin/domain-record-forms";
import { ContentTabs } from "@/components/admin/module-tabs";
import { AdminInlineHint, AdminLinkButton, AdminPage, AdminPageHeader, AdminPanel, AdminSectionHeader } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";

export default async function DashboardContentNavigationMenuCreatePage() {
  await requirePermission(PERMISSIONS.settingsManage);

  return (
    <AdminPage>
      <AdminPageHeader
        actions={
          <AdminLinkButton href="/dashboard/content/navigation-menus" tone="primary">
            Back to navigation menus
          </AdminLinkButton>
        }
        title="Create New Navigation Menu"
        description="Create storefront navigation menus from a dedicated content workflow."
      />
      <ContentTabs currentPath="/dashboard/content/navigation-menus/new" />
      <AdminPanel>
        <AdminSectionHeader
          title="Navigation menu record"
          description="Create the menu shell first, then manage top-level and child items from the menu detail screen."
        />
        <div className="mt-5 space-y-4">
          <NavigationMenuForm
            returnTo="/dashboard/content/navigation-menus"
            submitLabel="Create navigation menu"
          />
          <AdminInlineHint tone="sky">
            After saving, open the menu from the list view to attach its navigation items.
          </AdminInlineHint>
        </div>
      </AdminPanel>
    </AdminPage>
  );
}
