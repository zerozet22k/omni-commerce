import { notFound } from "next/navigation";

import { saveProductSeoAction } from "@/app/dashboard/catalog/actions";
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

type ProductSeoPageProps = {
  params: Promise<{
    productId: string;
  }>;
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardProductSeoPage({
  params,
  searchParams,
}: ProductSeoPageProps) {
  await requirePermission(PERMISSIONS.catalogView);
  const { productId } = await params;
  const resolvedSearchParams = await searchParams;
  const workspace = await adminProductService.getProductSeoWorkspace(productId);

  if (!workspace) {
    notFound();
  }

  const currentPath = `/dashboard/catalog/products/${productId}/seo`;

  return (
    <AdminPage>
      <AdminPageHeader
        title={`${workspace.product.productName} SEO`}
        description="Keep search metadata on its own page so merchandising and catalog operators are not editing SEO tags in the middle of pricing or inventory work."
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
          title="Search metadata"
          description="Update the SEO title and description used for search snippets and social previews."
        />
        <form action={saveProductSeoAction} className="mt-5 space-y-4">
          <input name="productId" type="hidden" value={productId} />
          <input name="returnTo" type="hidden" value={currentPath} />
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">SEO title</span>
            <input
              className="block w-full rounded-[0.95rem] border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-slate-950 outline-none"
              defaultValue={workspace.product.seoTitle}
              name="seoTitle"
              placeholder="Omni Runner One | Omni Commerce"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">SEO description</span>
            <textarea
              className="block min-h-[160px] w-full rounded-[0.95rem] border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-slate-950 outline-none"
              defaultValue={workspace.product.seoDescription}
              name="seoDescription"
              rows={6}
            />
          </label>
          <AdminActionButton tone="sky">Save SEO</AdminActionButton>
        </form>
      </AdminPanel>
    </AdminPage>
  );
}
