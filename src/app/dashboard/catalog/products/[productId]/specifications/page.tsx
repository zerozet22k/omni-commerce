import { notFound } from "next/navigation";

import { saveProductSpecificationsAction } from "@/app/dashboard/catalog/actions";
import { AdminActionNotice } from "@/components/admin/action-notice";
import { CatalogTabs, ProductTabs } from "@/components/admin/module-tabs";
import {
  AdminActionButton,
  AdminLinkButton,
  AdminPage,
  AdminPageHeader,
  AdminPanel,
  AdminSectionHeader,
} from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { adminProductService } from "@/modules/catalog/admin-product.service";

type ProductSpecificationsPageProps = {
  params: Promise<{
    productId: string;
  }>;
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardProductSpecificationsPage({
  params,
  searchParams,
}: ProductSpecificationsPageProps) {
  await requirePermission(PERMISSIONS.catalogView);
  const { productId } = await params;
  const resolvedSearchParams = await searchParams;
  const workspace = await adminProductService.getProductSpecificationsWorkspace(productId);

  if (!workspace) {
    notFound();
  }

  const currentPath = `/dashboard/catalog/products/${productId}/specifications`;

  return (
    <AdminPage>
      <AdminPageHeader
        title={`${workspace.product.productName} specifications`}
        description="Keep technical specifications on a focused page instead of mixing them into the general product form."
        actions={
          <>
            <AdminLinkButton href={`/dashboard/catalog/products/${productId}`}>General</AdminLinkButton>
            <AdminLinkButton href="/dashboard/catalog/products" tone="primary">
              Back to products
            </AdminLinkButton>
          </>
        }
      />

      <CatalogTabs currentPath="/dashboard/catalog/products" />
      <ProductTabs currentPath={currentPath} productId={productId} />

      <AdminActionNotice searchParams={resolvedSearchParams} />

      <AdminPanel>
        <AdminSectionHeader
          title="Specification list"
          description="Use one line per specification. Format: Group | Key | Value. If a group is not needed, use Key | Value."
        />
        <form action={saveProductSpecificationsAction} className="mt-5 space-y-4">
          <input name="productId" type="hidden" value={productId} />
          <input name="returnTo" type="hidden" value={currentPath} />
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">Specifications</span>
            <textarea
              className="block min-h-[320px] w-full rounded-[0.95rem] border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-slate-950 outline-none"
              defaultValue={workspace.specificationsText}
              name="specificationsText"
              placeholder={"General | Weight | 450g\nMaterial | Upper | Mesh"}
              rows={14}
            />
          </label>
          <AdminActionButton tone="sky">Save specifications</AdminActionButton>
        </form>
      </AdminPanel>
    </AdminPage>
  );
}
