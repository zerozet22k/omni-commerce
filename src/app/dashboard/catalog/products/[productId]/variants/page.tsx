import { notFound } from "next/navigation";

import {
  deleteVariantAction,
  saveVariantAction,
} from "@/app/dashboard/catalog/actions";
import { AdminActionNotice } from "@/components/admin/action-notice";
import { CatalogTabs, ProductTabs } from "@/components/admin/module-tabs";
import {
  AdminActionButton,
  AdminBadge,
  AdminCheckbox,
  AdminEmptyState,
  AdminField,
  AdminFilterGrid,
  AdminFormGrid,
  AdminInlineHint,
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
  AdminToolbar,
} from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { formatCurrency } from "@/lib/utils/format";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";
import { adminProductService } from "@/modules/catalog/admin-product.service";

type ProductVariantsPageProps = {
  params: Promise<{
    productId: string;
  }>;
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardProductVariantsPage({
  params,
  searchParams,
}: ProductVariantsPageProps) {
  await requirePermission(PERMISSIONS.catalogView);
  const { productId } = await params;
  const resolvedSearchParams = await searchParams;
  const workspace = await adminProductService.getProductVariantsWorkspace(
    productId,
    resolvedSearchParams,
  );

  if (!workspace) {
    notFound();
  }

  const currentPath = `/dashboard/catalog/products/${productId}/variants`;

  return (
    <AdminPage>
      <AdminPageHeader
        title={`${workspace.product.productName} variants`}
        description="Search, review, and update product variants from a dedicated page with SKU-focused operational controls."
        actions={
          <>
            <AdminLinkButton href={`/dashboard/catalog/products/${productId}/images`}>
              Media
            </AdminLinkButton>
            <AdminLinkButton href={`/dashboard/catalog/products/${productId}`}>
              General
            </AdminLinkButton>
            <AdminLinkButton href="/dashboard/catalog/products" tone="primary">
              Back to products
            </AdminLinkButton>
          </>
        }
      />

      <CatalogTabs currentPath="/dashboard/catalog/products" />
      <ProductTabs currentPath={currentPath} productId={productId} />

      <AdminActionNotice searchParams={resolvedSearchParams} />

      <AdminToolbar>
        <form action={currentPath} className="space-y-3" method="get">
          <AdminFilterGrid className="xl:grid-cols-[1.35fr_0.8fr]">
            <AdminField
              defaultValue={workspace.filters.query}
              label="Search"
              name="q"
              placeholder="SKU or variant label"
            />
            <AdminSelect
              defaultValue={workspace.filters.active}
              label="Active"
              name="active"
              options={[
                { value: "", label: "All states" },
                { value: "active", label: "Active only" },
                { value: "inactive", label: "Inactive only" },
              ]}
            />
          </AdminFilterGrid>
          <div className="flex flex-wrap gap-3">
            <input name="page" type="hidden" value="1" />
            <AdminActionButton>Apply filters</AdminActionButton>
            <AdminLinkButton href={currentPath}>Reset</AdminLinkButton>
          </div>
        </form>
      </AdminToolbar>

      <AdminPanel>
        <AdminSectionHeader
          title="Variant list"
          description={`${workspace.total} variants matched the current filters.`}
        />
        <div className="mt-4 space-y-4">
          {workspace.items.length > 0 ? (
            <AdminTableShell>
              <AdminTable>
                <AdminTableHead>
                  <tr>
                    <AdminTh>Variant</AdminTh>
                    <AdminTh>Options</AdminTh>
                    <AdminTh>Pricing</AdminTh>
                    <AdminTh>Inventory</AdminTh>
                    <AdminTh>State</AdminTh>
                    <AdminTh>Update</AdminTh>
                  </tr>
                </AdminTableHead>
                <AdminTableBody>
                  {workspace.items.map((item) => (
                    <tr key={item.id}>
                      <AdminTd>
                        <p className="font-semibold text-slate-950">
                          {item.variantName ?? item.sku}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">{item.sku}</p>
                      </AdminTd>
                      <AdminTd>
                        <p className="text-sm text-slate-700">
                          {item.optionSummary || "No option values"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.sourceCount} supplier links
                        </p>
                      </AdminTd>
                      <AdminTd>
                        <p className="font-semibold text-slate-950">
                          {formatCurrency(item.unitPrice, "MMK")}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Compare{" "}
                          {item.compareAtPrice !== null
                            ? formatCurrency(item.compareAtPrice, "MMK")
                            : "none"}{" "}
                          / Cost{" "}
                          {item.costPrice !== null
                            ? formatCurrency(item.costPrice, "MMK")
                            : "none"}
                        </p>
                      </AdminTd>
                      <AdminTd>
                        <p className="font-semibold text-slate-950">
                          {item.availableQty} available
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Stock {item.stockQty} / Reserved {item.reservedQty} / Threshold{" "}
                          {item.lowStockThreshold}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-700">
                          {item.availabilityLabel}
                        </p>
                      </AdminTd>
                      <AdminTd>
                        <div className="flex flex-wrap gap-2">
                          {item.isDefault ? <AdminBadge label="DEFAULT" tone="sky" /> : null}
                          <AdminBadge
                            label={item.isActive ? "ACTIVE" : "INACTIVE"}
                            tone={item.isActive ? "emerald" : "rose"}
                          />
                        </div>
                      </AdminTd>
                      <AdminTd>
                        <div className="space-y-3">
                          <form action={saveVariantAction} className="grid gap-2">
                            <input name="productId" type="hidden" value={productId} />
                            <input name="variantId" type="hidden" value={item.id} />
                            <input name="returnTo" type="hidden" value={currentPath} />
                            {item.optionValueIds.map((optionValueId) => (
                              <input
                                key={`${item.id}-${optionValueId}`}
                                name="optionValueIds"
                                type="hidden"
                                value={optionValueId}
                              />
                            ))}
                            <input
                              className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs"
                              defaultValue={item.variantName ?? ""}
                              name="variantName"
                              placeholder="Variant label"
                            />
                            <input
                              className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs"
                              defaultValue={item.sku}
                              name="sku"
                              placeholder="Leave blank to keep or generate internal SKU"
                            />
                            <input
                              className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs"
                              defaultValue={String(item.unitPrice)}
                              name="unitPrice"
                              placeholder="Price"
                              type="number"
                            />
                            <input
                              className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs"
                              defaultValue={item.compareAtPrice ?? ""}
                              name="compareAtPrice"
                              placeholder="Compare price"
                              type="number"
                            />
                            <input
                              className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs"
                              defaultValue={item.costPrice ?? ""}
                              name="costPrice"
                              placeholder="Cost price"
                              type="number"
                            />
                            <input
                              className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs"
                              defaultValue={String(item.stockQty)}
                              name="stockQty"
                              placeholder="Stock"
                              type="number"
                            />
                            <input
                              className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs"
                              defaultValue={String(item.lowStockThreshold)}
                              name="lowStockThreshold"
                              placeholder="Threshold"
                              type="number"
                            />
                            <div className="grid gap-2 sm:grid-cols-2">
                              <label className="flex items-center gap-2 text-xs text-slate-600">
                                <input
                                  defaultChecked={item.isDefault}
                                  name="isDefault"
                                  type="checkbox"
                                />
                                Default
                              </label>
                              <label className="flex items-center gap-2 text-xs text-slate-600">
                                <input
                                  defaultChecked={item.isActive}
                                  name="isActive"
                                  type="checkbox"
                                />
                                Active
                              </label>
                              <label className="flex items-center gap-2 text-xs text-slate-600">
                                <input
                                  defaultChecked={item.trackInventory}
                                  name="trackInventory"
                                  type="checkbox"
                                />
                                Track inventory
                              </label>
                              <label className="flex items-center gap-2 text-xs text-slate-600">
                                <input
                                  defaultChecked={item.allowBackorder}
                                  name="allowBackorder"
                                  type="checkbox"
                                />
                                Allow backorder
                              </label>
                            </div>
                            <AdminActionButton>Save</AdminActionButton>
                          </form>
                          <form action={deleteVariantAction}>
                            <input name="productId" type="hidden" value={productId} />
                            <input name="variantId" type="hidden" value={item.id} />
                            <input name="returnTo" type="hidden" value={currentPath} />
                            <AdminActionButton tone="rose">Delete</AdminActionButton>
                          </form>
                        </div>
                      </AdminTd>
                    </tr>
                  ))}
                </AdminTableBody>
              </AdminTable>
            </AdminTableShell>
          ) : (
            <AdminEmptyState
              title="No variants matched"
              body="Adjust the filters or add a new variant below."
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
          title="Add variant"
          description="Create a new option combination with pricing, inventory, and option values."
        />
        <form action={saveVariantAction} className="mt-5 space-y-4">
          <input name="productId" type="hidden" value={productId} />
          <input name="returnTo" type="hidden" value={currentPath} />
          <AdminFormGrid columns={3}>
            <AdminField label="Variant name" name="variantName" placeholder="Black / 42" />
            <AdminField
              label="Internal SKU"
              name="sku"
              placeholder="Optional server-generated SKU"
            />
            <AdminField label="Price" name="unitPrice" placeholder="35000" type="number" />
            <AdminField
              label="Compare price"
              name="compareAtPrice"
              placeholder="40000"
              type="number"
            />
            <AdminField
              label="Cost price"
              name="costPrice"
              placeholder="22000"
              type="number"
            />
            <AdminField label="Opening stock" name="stockQty" placeholder="10" type="number" />
            <AdminField
              label="Low stock threshold"
              name="lowStockThreshold"
              placeholder="5"
              type="number"
            />
            <AdminCheckbox
              defaultChecked
              label="Active"
              name="isActive"
            />
            <AdminCheckbox
              defaultChecked
              label="Track inventory"
              name="trackInventory"
            />
            <AdminCheckbox
              label="Allow backorder"
              name="allowBackorder"
            />
            <AdminCheckbox
              defaultChecked={workspace.total === 0}
              label="Default"
              name="isDefault"
            />
          </AdminFormGrid>
          <AdminInlineHint tone="sky">
            Internal SKU stays required in storage, but the server will generate it automatically when left blank on create.
          </AdminInlineHint>

          <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-4">
            <p className="text-sm font-semibold text-slate-900">Option values</p>
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              {workspace.optionGroups.map((group) => (
                <div className="space-y-3" key={group.id}>
                  <p className="text-sm font-medium text-slate-700">{group.name}</p>
                  <div className="grid gap-2 md:grid-cols-2">
                    {group.values.map((value) => (
                      <label className="flex items-center gap-2 text-sm text-slate-600" key={value.id}>
                        <input name="optionValueIds" type="checkbox" value={value.id} />
                        {value.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <AdminActionButton tone="sky">Add variant</AdminActionButton>
        </form>
      </AdminPanel>
    </AdminPage>
  );
}
