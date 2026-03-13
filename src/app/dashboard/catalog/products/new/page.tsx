import { saveProductGeneralAction } from "@/app/dashboard/catalog/actions";
import { AdminActionNotice } from "@/components/admin/action-notice";
import { CatalogTabs } from "@/components/admin/module-tabs";
import {
  AdminActionButton,
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
import { setupService } from "@/modules/setup/setup.service";

type DashboardNewProductPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardNewProductPage({
  searchParams,
}: DashboardNewProductPageProps) {
  await requirePermission(PERMISSIONS.catalogView);
  await setupService.ensureBaseCommerceSetup();
  const resolvedSearchParams = await searchParams;

  const workspace = await adminProductService.getProductGeneralWorkspace();

  return (
    <AdminPage>
      <AdminPageHeader
        title="Create New Product"
        description="Create the base product record first. Variants, images, specifications, FAQ, relations, bundles, and SEO become available on the focused product detail routes after creation."
        actions={
          <AdminLinkButton href="/dashboard/catalog/products" tone="primary">
            Back to products
          </AdminLinkButton>
        }
      />

      <CatalogTabs currentPath="/dashboard/catalog/products" />

      <AdminActionNotice searchParams={resolvedSearchParams} />

      <AdminPanel>
        <AdminSectionHeader
          title="General information"
          description="Start with the product identity, merchandising flags, and taxonomy mappings. The child resources are managed after the product record exists."
        />
        <form action={saveProductGeneralAction} className="mt-5 space-y-8">
          <input name="returnTo" type="hidden" value="/dashboard/catalog/products/new" />
          <section className="space-y-4">
            <AdminSectionHeader title="Identity and description" />
            <AdminFormGrid columns={2}>
              <AdminField label="Product name" name="productName" placeholder="Omni Runner One" />
              <AdminField label="Slug" name="slug" placeholder="Optional generated from the name" />
              <AdminField
                label="Material (legacy descriptive field)"
                name="material"
                placeholder="Prefer specifications unless this is legacy data"
              />
              <AdminField label="Warranty" name="warrantyInfo" placeholder="6 month replacement" />
            </AdminFormGrid>
            <AdminInlineHint tone="sky">
              Slug is generated server-side when left blank. If shoppers must choose material to buy, model it as an option type on variants instead of using this legacy field.
            </AdminInlineHint>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">Short description</span>
              <textarea
                className="block min-h-[96px] w-full rounded-[0.95rem] border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-slate-950 outline-none"
                name="shortDescription"
                rows={3}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">Description</span>
              <textarea
                className="block min-h-[160px] w-full rounded-[0.95rem] border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-slate-950 outline-none"
                name="description"
                rows={6}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">Care instructions</span>
              <textarea
                className="block min-h-[104px] w-full rounded-[0.95rem] border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-slate-950 outline-none"
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
                <select className="block w-full rounded-[0.95rem] border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-slate-950 outline-none" name="productTypeId">
                  {workspace.productTypes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Category</span>
                <select className="block w-full rounded-[0.95rem] border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-slate-950 outline-none" name="categoryId">
                  {workspace.categories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Brand</span>
                <select className="block w-full rounded-[0.95rem] border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-slate-950 outline-none" defaultValue="" name="brandId">
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
                <select className="block w-full rounded-[0.95rem] border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-slate-950 outline-none" defaultValue="" name="taxClassId">
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
                <select className="block w-full rounded-[0.95rem] border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-slate-950 outline-none" defaultValue="" name="originCountryId">
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
                <select className="block w-full rounded-[0.95rem] border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-slate-950 outline-none" defaultValue="NEW" name="conditionType">
                  <option value="NEW">NEW</option>
                  <option value="REFURBISHED">REFURBISHED</option>
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Status</span>
                <select className="block w-full rounded-[0.95rem] border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-slate-950 outline-none" defaultValue="DRAFT" name="status">
                  <option value="DRAFT">DRAFT</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Visibility</span>
                <select className="block w-full rounded-[0.95rem] border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-slate-950 outline-none" defaultValue="PUBLIC" name="visibility">
                  <option value="PUBLIC">PUBLIC</option>
                  <option value="HIDDEN">HIDDEN</option>
                </select>
              </label>
            </AdminFormGrid>

            <div className="grid gap-3 md:grid-cols-3">
              <AdminCheckbox label="Featured" name="isFeatured" />
              <AdminCheckbox label="New arrival" name="isNewArrival" />
              <AdminCheckbox label="Best seller" name="isBestSeller" />
            </div>
          </section>

          <section className="space-y-4">
            <AdminSectionHeader title="Mappings" />
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="space-y-3 rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-4">
                <p className="text-sm font-semibold text-slate-900">Collections</p>
                <div className="grid gap-2 md:grid-cols-2">
                  {workspace.collections.map((item) => (
                    <label className="flex items-center gap-2 text-sm text-slate-700" key={item.id}>
                      <input name="collectionIds" type="checkbox" value={item.id} />
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
                      <input name="optionTypeIds" type="checkbox" value={item.id} />
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
                      <input name="tagIds" type="checkbox" value={item.id} />
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
                      <input name="badgeIds" type="checkbox" value={item.id} />
                      {item.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <AdminActionButton tone="sky">Create product</AdminActionButton>
        </form>
      </AdminPanel>
    </AdminPage>
  );
}
