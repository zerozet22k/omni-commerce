import { notFound } from "next/navigation";

import {
  attachProductBundleItemAction,
  detachProductBundleItemAction,
} from "@/app/dashboard/catalog/actions";
import { AdminActionNotice } from "@/components/admin/action-notice";
import { AdminAsyncTargetPicker } from "@/components/admin/async-target-picker";
import { CatalogTabs, ProductTabs } from "@/components/admin/module-tabs";
import {
  AdminActionButton,
  AdminEmptyState,
  AdminField,
  AdminLinkButton,
  AdminPage,
  AdminPageHeader,
  AdminPagination,
  AdminPanel,
  AdminSectionHeader,
  AdminTable,
  AdminTableBody,
  AdminTableHead,
  AdminTableShell,
  AdminTd,
  AdminTh,
} from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";
import { adminProductService } from "@/modules/catalog/admin-product.service";

type ProductBundlesPageProps = {
  params: Promise<{
    productId: string;
  }>;
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardProductBundlesPage({
  params,
  searchParams,
}: ProductBundlesPageProps) {
  await requirePermission(PERMISSIONS.catalogView);
  const { productId } = await params;
  const resolvedSearchParams = await searchParams;
  const workspace = await adminProductService.getProductBundlesWorkspace(
    productId,
    resolvedSearchParams,
  );

  if (!workspace) {
    notFound();
  }

  const currentPath = `/dashboard/catalog/products/${productId}/bundles`;

  return (
    <AdminPage>
      <AdminPageHeader
        title={`${workspace.product.productName} bundles`}
        description="Attach bundle child products and optional child variants from searchable catalog fields instead of freeform notes."
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

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.12fr)_420px]">
        <AdminPanel>
          <AdminSectionHeader
            title="Bundle items"
            description="Review the currently attached child products and optional variant overrides."
          />
          <div className="mt-4 space-y-4">
            {workspace.items.length > 0 ? (
              <AdminTableShell>
                <AdminTable>
                  <AdminTableHead>
                    <tr>
                      <AdminTh>Child product</AdminTh>
                      <AdminTh>Child variant</AdminTh>
                      <AdminTh>Quantity</AdminTh>
                      <AdminTh />
                    </tr>
                  </AdminTableHead>
                  <AdminTableBody>
                    {workspace.items.map((item) => (
                      <tr key={item.id}>
                        <AdminTd>
                          <p className="font-semibold text-slate-950">{item.productName}</p>
                        </AdminTd>
                        <AdminTd>
                          <p className="text-sm text-slate-700">
                            {item.variantLabel ?? "Any variant"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {item.sku ?? "No SKU override"}
                          </p>
                        </AdminTd>
                        <AdminTd>
                          <p className="font-semibold text-slate-950">{item.quantity}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Sort {item.sortOrder}
                          </p>
                        </AdminTd>
                        <AdminTd>
                          <form action={detachProductBundleItemAction}>
                            <input name="productId" type="hidden" value={productId} />
                            <input name="bundleItemId" type="hidden" value={item.id} />
                            <input name="returnTo" type="hidden" value={currentPath} />
                            <AdminActionButton tone="rose">Remove</AdminActionButton>
                          </form>
                        </AdminTd>
                      </tr>
                    ))}
                  </AdminTableBody>
                </AdminTable>
              </AdminTableShell>
            ) : (
              <AdminEmptyState
                title="No bundle items"
                body="Attach the first child product from the panel on the right."
              />
            )}

            <AdminPagination
              hrefBuilder={(page) =>
                adminWorkspaceService.buildHref(currentPath, resolvedSearchParams, { page })
              }
              page={workspace.page}
              totalPages={workspace.totalPages}
            />
          </div>
        </AdminPanel>

        <AdminPanel>
          <AdminSectionHeader
            title="Attach bundle item"
            description="Search for the child product first, then optionally narrow the bundle to a specific variant."
          />
          <form action={attachProductBundleItemAction} className="mt-4 space-y-4">
            <input name="productId" type="hidden" value={productId} />
            <input name="returnTo" type="hidden" value={currentPath} />
            <AdminAsyncTargetPicker
              description="Search product name, slug, SKU, brand, category, or status."
              label="Child product"
              name="childProductId"
              placeholder="Search product name, slug, SKU, brand, category, status"
              type="products"
            />
            <AdminAsyncTargetPicker
              description="Optional: attach a specific variant for this bundle line."
              label="Child variant"
              name="childVariantId"
              placeholder="Search SKU, variant label, product, brand, category, status"
              type="variants"
            />
            <AdminField label="Quantity" name="quantity" type="number" />
            <AdminField label="Sort order" name="sortOrder" type="number" />
            <AdminActionButton tone="sky">Attach bundle item</AdminActionButton>
          </form>
        </AdminPanel>
      </div>
    </AdminPage>
  );
}
