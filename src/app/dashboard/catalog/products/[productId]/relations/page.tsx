import { notFound } from "next/navigation";

import {
  attachProductRelationAction,
  detachProductRelationAction,
} from "@/app/dashboard/catalog/actions";
import { AdminActionNotice } from "@/components/admin/action-notice";
import { AdminAsyncTargetPicker } from "@/components/admin/async-target-picker";
import { CatalogTabs, ProductTabs } from "@/components/admin/module-tabs";
import {
  AdminActionButton,
  AdminBadge,
  AdminEmptyState,
  AdminField,
  AdminLinkButton,
  AdminPage,
  AdminPageHeader,
  AdminPagination,
  AdminPanel,
  AdminSectionHeader,
  AdminSelect,
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

type ProductRelationsPageProps = {
  params: Promise<{
    productId: string;
  }>;
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardProductRelationsPage({
  params,
  searchParams,
}: ProductRelationsPageProps) {
  await requirePermission(PERMISSIONS.catalogView);
  const { productId } = await params;
  const resolvedSearchParams = await searchParams;
  const workspace = await adminProductService.getProductRelationsWorkspace(
    productId,
    resolvedSearchParams,
  );

  if (!workspace) {
    notFound();
  }

  const currentPath = `/dashboard/catalog/products/${productId}/relations`;

  return (
    <AdminPage>
      <AdminPageHeader
        title={`${workspace.product.productName} relations`}
        description="Attach related, upsell, cross-sell, and similar products through searchable product search instead of large preloaded selectors."
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
            title="Attached relations"
            description="The relation table is paginated and focused on the products already attached to this record."
          />
          <div className="mt-4 space-y-4">
            {workspace.items.length > 0 ? (
              <AdminTableShell>
                <AdminTable>
                  <AdminTableHead>
                    <tr>
                      <AdminTh>Product</AdminTh>
                      <AdminTh>Relation type</AdminTh>
                      <AdminTh>Status</AdminTh>
                      <AdminTh />
                    </tr>
                  </AdminTableHead>
                  <AdminTableBody>
                    {workspace.items.map((item) => (
                      <tr key={item.id}>
                        <AdminTd>
                          <p className="font-semibold text-slate-950">{item.productName}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {item.slug ? `/${item.slug}` : "No slug"}
                          </p>
                        </AdminTd>
                        <AdminTd>
                          <AdminBadge label={item.relationType} tone="sky" />
                          <p className="mt-2 text-xs text-slate-500">
                            Sort {item.sortOrder}
                          </p>
                        </AdminTd>
                        <AdminTd>
                          <AdminBadge
                            label={item.status ?? "UNKNOWN"}
                            tone={item.status === "ACTIVE" ? "emerald" : "amber"}
                          />
                        </AdminTd>
                        <AdminTd>
                          <form action={detachProductRelationAction}>
                            <input name="productId" type="hidden" value={productId} />
                            <input name="relationId" type="hidden" value={item.id} />
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
                title="No related products"
                body="Attach the first related product from the panel on the right."
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
            title="Attach relation"
            description="Search the product catalog and attach only the records that matter for this merchandising rule."
          />
          <form action={attachProductRelationAction} className="mt-4 space-y-4">
            <input name="productId" type="hidden" value={productId} />
            <input name="returnTo" type="hidden" value={currentPath} />
            <AdminAsyncTargetPicker
              description="Search by product name, slug, SKU, brand, category, or status."
              label="Related product"
              name="relatedProductId"
              placeholder="Search product name, slug, SKU, brand, category, status"
              type="products"
            />
            <AdminSelect
              label="Relation type"
              name="relationType"
              options={[
                { value: "RELATED", label: "RELATED" },
                { value: "UPSELL", label: "UPSELL" },
                { value: "CROSS_SELL", label: "CROSS_SELL" },
                { value: "SIMILAR", label: "SIMILAR" },
              ]}
            />
            <AdminField label="Sort order" name="sortOrder" type="number" />
            <AdminActionButton tone="sky">Attach relation</AdminActionButton>
          </form>
        </AdminPanel>
      </div>
    </AdminPage>
  );
}
