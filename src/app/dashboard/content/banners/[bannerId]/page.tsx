import { notFound } from "next/navigation";
import { Types } from "mongoose";

import { deleteContentRecordAction } from "@/app/dashboard/content/actions";
import { BannerRecordForm } from "@/components/admin/domain-record-forms";
import { AdminEditorPage } from "@/components/admin/editor-page";
import { ContentTabs } from "@/components/admin/module-tabs";
import {
  AdminActionButton,
  AdminEmptyState,
  AdminPanel,
  AdminSectionHeader,
} from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";
import { MediaAssetModel } from "@/modules/core/core.models";

type BannerDetailPageProps = {
  params: Promise<{
    bannerId: string;
  }>;
};

export default async function DashboardContentBannerDetailPage({
  params,
}: BannerDetailPageProps) {
  await requirePermission(PERMISSIONS.settingsManage);
  const { bannerId } = await params;
  const workspace = await adminWorkspaceService.getSimpleRecordWorkspace("banners", {
    id: bannerId,
  });
  const record = workspace.selectedRecord;

  if (!record) {
    notFound();
  }

  const assetId = typeof record.assetId === "string" ? record.assetId : "";
  const asset =
    assetId && Types.ObjectId.isValid(assetId)
      ? await MediaAssetModel.findById(assetId)
          .select("url title altText")
          .lean()
          .exec()
      : null;

  return (
    <AdminEditorPage
      backHref="/dashboard/content/banners"
      backLabel="Back to banners"
      description="Edit banner scheduling, messaging, link target, and attached asset from one focused content record screen."
      main={
        <AdminPanel>
          <AdminSectionHeader
            title="Banner record"
            description="Changes here update the scheduled banner record used across storefront content placements."
          />
          <div className="mt-5">
            <BannerRecordForm
              record={record}
              returnTo={`/dashboard/content/banners/${bannerId}`}
              submitLabel="Save banner"
            />
          </div>
        </AdminPanel>
      }
      aside={
        <>
          <AdminPanel>
            <AdminSectionHeader
              title="Current asset"
              description="Banner assets are managed through the banner workflow instead of raw media records."
            />
            <div className="mt-5">
              {asset && typeof asset.url === "string" ? (
                <div className="overflow-hidden rounded-[1rem] border border-stone-200 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={
                      typeof asset.altText === "string" && asset.altText.trim()
                        ? asset.altText
                        : typeof asset.title === "string" && asset.title.trim()
                          ? asset.title
                          : "Banner asset"
                    }
                    className="h-48 w-full bg-stone-100 object-cover"
                    src={asset.url}
                  />
                </div>
              ) : (
                <AdminEmptyState
                  title="No asset attached"
                  body="Upload an image in the form to attach a banner asset."
                />
              )}
            </div>
          </AdminPanel>

          <AdminPanel>
            <AdminSectionHeader title="Record actions" description="Banners are deleted directly from the content workflow." />
            <form action={deleteContentRecordAction} className="mt-5">
              <input name="kind" type="hidden" value="banners" />
              <input name="recordId" type="hidden" value={String(record.id)} />
              <input name="returnTo" type="hidden" value="/dashboard/content/banners" />
              <AdminActionButton tone="rose">Delete banner</AdminActionButton>
            </form>
          </AdminPanel>
        </>
      }
      tabs={<ContentTabs currentPath="/dashboard/content/banners" />}
      title="Banner"
    />
  );
}
