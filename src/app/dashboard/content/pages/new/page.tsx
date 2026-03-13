import { PageRecordForm } from "@/components/admin/domain-record-forms";
import { ContentTabs } from "@/components/admin/module-tabs";
import { AdminLinkButton, AdminPage, AdminPageHeader, AdminPanel, AdminSectionHeader } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";

export default async function DashboardContentPageCreatePage() {
  await requirePermission(PERMISSIONS.settingsManage);

  return (
    <AdminPage>
      <AdminPageHeader
        actions={
          <AdminLinkButton href="/dashboard/content/pages" tone="primary">
            Back to pages
          </AdminLinkButton>
        }
        title="Create New Page"
        description="Create storefront pages from a dedicated content workflow."
      />
      <ContentTabs currentPath="/dashboard/content/pages/new" />
      <AdminPanel>
        <AdminSectionHeader
          title="Page record"
          description="Create drafts, publish content, and manage SEO fields from a focused page editor."
        />
        <div className="mt-5">
          <PageRecordForm returnTo="/dashboard/content/pages" submitLabel="Create page" />
        </div>
      </AdminPanel>
    </AdminPage>
  );
}
