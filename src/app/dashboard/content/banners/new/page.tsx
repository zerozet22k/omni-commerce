import { BannerRecordForm } from "@/components/admin/domain-record-forms";
import { ContentTabs } from "@/components/admin/module-tabs";
import { AdminLinkButton, AdminPage, AdminPageHeader, AdminPanel, AdminSectionHeader } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";

export default async function DashboardContentBannerCreatePage() {
  await requirePermission(PERMISSIONS.settingsManage);

  return (
    <AdminPage>
      <AdminPageHeader
        actions={
          <AdminLinkButton href="/dashboard/content/banners" tone="primary">
            Back to banners
          </AdminLinkButton>
        }
        title="Create New Banner"
        description="Create banner records from a dedicated content workflow."
      />
      <ContentTabs currentPath="/dashboard/content/banners/new" />
      <AdminPanel>
        <AdminSectionHeader
          title="Banner record"
          description="Create hero, promo, or category banners with schedule, copy, and sorting in one place."
        />
        <div className="mt-5">
          <BannerRecordForm returnTo="/dashboard/content/banners" submitLabel="Create banner" />
        </div>
      </AdminPanel>
    </AdminPage>
  );
}
