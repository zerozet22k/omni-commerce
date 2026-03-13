import { BannerRecordForm } from "@/components/admin/domain-record-forms";
import { ContentTabs } from "@/components/admin/module-tabs";
import { AdminQuickCreateModal } from "@/components/admin/quick-create-modal";
import { SimpleRecordPage } from "@/components/admin/simple-record-page";
import { AdminLinkButton } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

type BannersPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardContentBannersPage({
  searchParams,
}: BannersPageProps) {
  await requirePermission(PERMISSIONS.settingsManage);
  const resolvedSearchParams = await searchParams;
  const workspace = await adminWorkspaceService.getSimpleRecordWorkspace(
    "banners",
    resolvedSearchParams,
  );

  return (
    <SimpleRecordPage
      currentPath="/dashboard/content/banners"
      description="Manage hero, promo, and category banners as scheduled content records with dedicated edit routes."
      emptyStateBody="Try a broader filter or create a new banner."
      headerActions={
        <>
          <AdminQuickCreateModal
            description="Create a banner without leaving the list."
            title="Quick Create Banner"
            triggerLabel="Quick create"
          >
            <BannerRecordForm returnTo="/dashboard/content/banners" />
          </AdminQuickCreateModal>
          <AdminLinkButton href="/dashboard/content/banners/new" tone="primary">
            Create new banner
          </AdminLinkButton>
        </>
      }
      itemHrefBuilder={(itemId) => `/dashboard/content/banners/${itemId}`}
      searchParams={resolvedSearchParams}
      searchPlaceholder="Banner name, headline, or subtitle"
      tabs={<ContentTabs currentPath="/dashboard/content/banners" />}
      title="Banners"
      workspace={workspace}
    />
  );
}
