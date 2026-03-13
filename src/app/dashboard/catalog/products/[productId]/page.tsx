import { notFound } from "next/navigation";

import { saveProductGeneralAction } from "@/app/dashboard/catalog/actions";
import { AdminActionNotice } from "@/components/admin/action-notice";
import { CatalogTabs, ProductTabs } from "@/components/admin/module-tabs";
import {
  AdminActionButton,
  AdminBadge,
  AdminCheckbox,
  AdminField,
  AdminFormGrid,
  AdminInlineHint,
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

type ProductGeneralPageProps = {
  params: Promise<{
    productId: string;
  }>;
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardProductGeneralPage({
  params,
  searchParams,
}: ProductGeneralPageProps) {
  await requirePermission(PERMISSIONS.catalogView);
  const { productId } = await params;
  const resolvedSearchParams = await searchParams;
  const workspace = await adminProductService.getProductGeneralWorkspace(productId);

  if (!workspace.product) {
    notFound();
  }

  const product = workspace.product;

  return (
    <AdminPage>
      <AdminPageHeader
        title={product.productName}
        description="Edit the core product record here, then move to the focused media, variant, specification, FAQ, relation, bundle, and SEO pages from the product tabs."
        actions={
          <>
            <AdminLinkButton href={`/dashboard/catalog/products/${product.id}/images`}>
              Media
            </AdminLinkButton>
            <AdminLinkButton href="/dashboard/catalog/products" tone="primary">
              Back to products
            </AdminLinkButton>
          </>
        }
        meta={
          <div className="flex flex-wrap gap-2">
            <AdminBadge label={product.status} tone={product.status === "ACTIVE" ? "emerald" : "amber"} />
            <AdminBadge label={product.visibility} tone={product.visibility === "PUBLIC" ? "sky" : "slate"} />
            {product.issues.length > 0 ? (
              <AdminBadge label={`${product.issues.length} issues`} tone="rose" />
            ) : (
              <AdminBadge label="Healthy" tone="emerald" />
            )}
          </div>
        }
      />

      <CatalogTabs currentPath="/dashboard/catalog/products" />
      <ProductTabs currentPath={`/dashboard/catalog/products/${product.id}`} productId={product.id} />

      <AdminActionNotice searchParams={resolvedSearchParams} />

      <AdminPanel>
        <AdminSectionHeader
          title="Catalog health"
          description="Products stay visible even when variants or stock become incomplete. Use these warnings to fix broken sellability instead of losing the record."
        />
        <div className="mt-4 flex flex-wrap gap-2">
          {product.issues.length > 0 ? (
            product.issues.map((issue) => (
              <AdminBadge key={issue.code} label={issue.label} tone={issue.tone} />
            ))
          ) : (
            <AdminBadge label="No product issues detected" tone="emerald" />
          )}
        </div>
      </AdminPanel>

      <AdminPanel>
        <AdminSectionHeader
          title="General information"
          description="Keep base merchandising, tax, and classification data focused on this page so staff are not editing variants, FAQ, and SEO from the same screen."
        />
        <form action={saveProductGeneralAction} className="mt-5 space-y-8">
          <input name="productId" type="hidden" value={product.id} />
          <input
            name="returnTo"
            type="hidden"
            value={`/dashboard/catalog/products/${product.id}`}
          />

          <section className="space-y-4">
            <AdminSectionHeader title="Identity and description" />
            <AdminFormGrid columns={2}>
              <AdminField
                defaultValue={product.productName}
                label="Product name"
                name="productName"
                placeholder="Omni Runner One"
              />
              <AdminField
                defaultValue={product.slug}
                label="Slug"
                name="slug"
                placeholder="omni-runner-one"
              />
              <AdminField
                defaultValue={product.material}
                label="Material (legacy descriptive field)"
                name="material"
                placeholder="Prefer specifications unless this is legacy data"
              />
              <AdminField
                defaultValue={product.warrantyInfo}
                label="Warranty"
                name="warrantyInfo"
                placeholder="6 month replacement"
              />
            </AdminFormGrid>
            <AdminInlineHint tone="sky">
              Leave slug blank on new records to generate it server-side. If material is a shopper choice, move it into option types and variants instead of relying on this legacy field.
            </AdminInlineHint>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">Short description</span>
              <textarea
                className="block min-h-[96px] w-full rounded-[0.95rem] border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-slate-950 outline-none"
                defaultValue={product.shortDescription}
                name="shortDescription"
                rows={3}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">Description</span>
              <textarea
                className="block min-h-[160px] w-full rounded-[0.95rem] border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-slate-950 outline-none"
                defaultValue={product.description}
                name="description"
                rows={6}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">Care instructions</span>
              <textarea
                className="block min-h-[104px] w-full rounded-[0.95rem] border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-slate-950 outline-none"
                defaultValue={product.careInstructions}
                name="careInstructions"
                rows={4}
              />
            </label>
          </section>

          <section className="space-y-4">
            <AdminSectionHeader title="Classification and status" />
            <AdminFormGrid columns={3}>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Product type</span>
                <select
                  className="block w-full rounded-[0.95rem] border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-slate-950 outline-none"
                  defaultValue={product.productTypeId}
                  name="productTypeId"
                >
                  {workspace.productTypes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Category</span>
                <select
                  className="block w-full rounded-[0.95rem] border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-slate-950 outline-none"
                  defaultValue={product.categoryId}
                  name="categoryId"
                >
                  {workspace.categories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Brand</span>
                <select
                  className="block w-full rounded-[0.95rem] border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-slate-950 outline-none"
                  defaultValue={product.brandId}
                  name="brandId"
                >
                  <option value="">No brand</option>
                  {workspace.brands.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Tax class</span>
                <select
                  className="block w-full rounded-[0.95rem] border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-slate-950 outline-none"
                  defaultValue={product.taxClassId}
                  name="taxClassId"
                >
                  <option value="">No tax class</option>
                  {workspace.taxClasses.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Origin country</span>
                <select
                  className="block w-full rounded-[0.95rem] border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-slate-950 outline-none"
                  defaultValue={product.originCountryId}
                  name="originCountryId"
                >
                  <option value="">No origin country</option>
                  {workspace.countryOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Condition</span>
                <select
                  className="block w-full rounded-[0.95rem] border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-slate-950 outline-none"
                  defaultValue={product.conditionType}
                  name="conditionType"
                >
                  <option value="NEW">NEW</option>
                  <option value="REFURBISHED">REFURBISHED</option>
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Status</span>
                <select
                  className="block w-full rounded-[0.95rem] border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-slate-950 outline-none"
                  defaultValue={product.status}
                  name="status"
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Visibility</span>
                <select
                  className="block w-full rounded-[0.95rem] border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-slate-950 outline-none"
                  defaultValue={product.visibility}
                  name="visibility"
                >
                  <option value="PUBLIC">PUBLIC</option>
                  <option value="HIDDEN">HIDDEN</option>
                </select>
              </label>
            </AdminFormGrid>

            <div className="grid gap-3 md:grid-cols-3">
              <AdminCheckbox
                defaultChecked={product.isFeatured}
                label="Featured"
                name="isFeatured"
              />
              <AdminCheckbox
                defaultChecked={product.isNewArrival}
                label="New arrival"
                name="isNewArrival"
              />
              <AdminCheckbox
                defaultChecked={product.isBestSeller}
                label="Best seller"
                name="isBestSeller"
              />
            </div>
          </section>

          <section className="space-y-4">
            <AdminSectionHeader title="Mappings" description="Attach lightweight taxonomy and merchandising records here. Heavy product and variant relationships live on their own pages." />
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="space-y-3 rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-4">
                <p className="text-sm font-semibold text-slate-900">Collections</p>
                <div className="grid gap-2 md:grid-cols-2">
                  {workspace.collections.map((item) => (
                    <label className="flex items-center gap-2 text-sm text-slate-700" key={item.id}>
                      <input
                        defaultChecked={product.collectionIds.includes(item.id)}
                        name="collectionIds"
                        type="checkbox"
                        value={item.id}
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3 rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-4">
                <p className="text-sm font-semibold text-slate-900">Option types</p>
                <div className="grid gap-2 md:grid-cols-2">
                  {workspace.optionTypes.map((item) => (
                    <label className="flex items-center gap-2 text-sm text-slate-700" key={item.id}>
                      <input
                        defaultChecked={product.optionTypeIds.includes(item.id)}
                        name="optionTypeIds"
                        type="checkbox"
                        value={item.id}
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3 rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-4">
                <p className="text-sm font-semibold text-slate-900">Product tags</p>
                <div className="grid gap-2 md:grid-cols-2">
                  {workspace.productTags.map((item) => (
                    <label className="flex items-center gap-2 text-sm text-slate-700" key={item.id}>
                      <input
                        defaultChecked={product.tagIds.includes(item.id)}
                        name="tagIds"
                        type="checkbox"
                        value={item.id}
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3 rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-4">
                <p className="text-sm font-semibold text-slate-900">Product badges</p>
                <div className="grid gap-2 md:grid-cols-2">
                  {workspace.productBadges.map((item) => (
                    <label className="flex items-center gap-2 text-sm text-slate-700" key={item.id}>
                      <input
                        defaultChecked={product.badgeIds.includes(item.id)}
                        name="badgeIds"
                        type="checkbox"
                        value={item.id}
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <AdminActionButton tone="sky">Save product</AdminActionButton>
        </form>
      </AdminPanel>
    </AdminPage>
  );
}
