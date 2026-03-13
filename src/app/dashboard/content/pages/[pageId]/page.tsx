import { notFound } from "next/navigation";

import { deleteContentRecordAction } from "@/app/dashboard/content/actions";
import { PageRecordForm } from "@/components/admin/domain-record-forms";
import { AdminEditorPage } from "@/components/admin/editor-page";
import { ContentTabs } from "@/components/admin/module-tabs";
import { AdminActionButton, AdminPanel, AdminSectionHeader } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

type ContentPageDetailPageProps = {
  params: Promise<{
    pageId: string;
  }>;
};

export default async function DashboardContentPageDetailPage({
  params,
}: ContentPageDetailPageProps) {
  await requirePermission(PERMISSIONS.settingsManage);
  const { pageId } = await params;
  const workspace = await adminWorkspaceService.getSimpleRecordWorkspace("pages", {
    id: pageId,
  });
  const record = workspace.selectedRecord;

  if (!record) {
    notFound();
  }

  return (
    <AdminEditorPage
      backHref="/dashboard/content/pages"
      backLabel="Back to pages"
      description="Edit page content, publication state, slug, and SEO fields from one focused content record screen."
      main={
        <AdminPanel>
          <AdminSectionHeader
            title="Page record"
            description="Changes here update the live page record used across storefront content and linked navigation."
          />
          <div className="mt-5">
            <PageRecordForm
              record={record}
              returnTo={`/dashboard/content/pages/${pageId}`}
              submitLabel="Save page"
            />
          </div>
        </AdminPanel>
      }
      aside={
        <AdminPanel>
          <AdminSectionHeader
            title="Record actions"
            description="Pages linked into navigation are archived instead of being deleted."
          />
          <form action={deleteContentRecordAction} className="mt-5">
            <input name="kind" type="hidden" value="pages" />
            <input name="recordId" type="hidden" value={String(record.id)} />
            <input name="returnTo" type="hidden" value="/dashboard/content/pages" />
            <AdminActionButton tone="rose">Delete or archive page</AdminActionButton>
          </form>
        </AdminPanel>
      }
      tabs={<ContentTabs currentPath="/dashboard/content/pages" />}
      title="Page"
    />
  );
}
