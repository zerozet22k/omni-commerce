import { notFound } from "next/navigation";

import {
  attachPromotionTargetAction,
  deletePromotionAction,
  detachPromotionTargetAction,
} from "@/app/dashboard/catalog/actions";
import { PromotionForm } from "@/components/admin/catalog-forms";
import { AdminAsyncTargetPicker } from "@/components/admin/async-target-picker";
import { CatalogTabs } from "@/components/admin/module-tabs";
import {
  AdminActionButton,
  AdminBadge,
  AdminEmptyState,
  AdminLinkButton,
  AdminPage,
  AdminPageHeader,
  AdminPagination,
  AdminPanel,
  AdminSectionHeader,
  AdminSummaryStrip,
  AdminTable,
  AdminTableBody,
  AdminTableHead,
  AdminTableShell,
  AdminTd,
  AdminTh,
} from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { formatDateTime } from "@/lib/utils/format";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { adminPromotionService } from "@/modules/pricing/admin-promotion.service";

type PromotionDetailPageProps = {
  params: Promise<{
    promotionId: string;
  }>;
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardCatalogPromotionDetailPage({
  params,
  searchParams,
}: PromotionDetailPageProps) {
  await requirePermission(PERMISSIONS.catalogView);
  const { promotionId } = await params;
  const resolvedSearchParams = await searchParams;
  const workspace = await adminPromotionService.getPromotionDetailWorkspace(
    promotionId,
    resolvedSearchParams,
  );

  if (!workspace) {
    notFound();
  }

  const currentHref = adminPromotionService.buildDetailHref(
    promotionId,
    resolvedSearchParams,
    {},
  );

  return (
    <AdminPage>
      <AdminPageHeader
        title={workspace.promotion.name}
        description="Manage the campaign rule set, then attach products and variants from searchable staff-facing targeting panels."
        actions={
          <>
            <AdminLinkButton href="/dashboard/catalog/promotions">
              Back to promotions
            </AdminLinkButton>
            <form action={deletePromotionAction}>
              <input name="promotionId" type="hidden" value={workspace.promotion.id} />
              <input
                name="returnTo"
                type="hidden"
                value="/dashboard/catalog/promotions"
              />
              <AdminActionButton tone="rose">
                {workspace.promotion.usageCount > 0
                  ? "Deactivate promotion"
                  : "Delete promotion"}
              </AdminActionButton>
            </form>
          </>
        }
        meta={
          <div className="flex flex-wrap gap-2">
            <AdminBadge label={workspace.promotion.promotionType} tone="sky" />
            <AdminBadge
              label={workspace.promotion.isActive ? "ACTIVE" : "INACTIVE"}
              tone={workspace.promotion.isActive ? "emerald" : "rose"}
            />
          </div>
        }
      />

      <CatalogTabs currentPath="/dashboard/catalog/promotions" />

      <AdminSummaryStrip
        columns={4}
        items={[
          {
            label: "Product targets",
            value: workspace.productTargets.total.toLocaleString("en"),
            hint: "Products directly attached to this campaign",
          },
          {
            label: "Variant targets",
            value: workspace.variantTargets.total.toLocaleString("en"),
            hint: "Variant-level overrides or focused SKU promotions",
          },
          {
            label: "Coupon usage",
            value: workspace.couponUsage.total.toLocaleString("en"),
            hint: "Read-only usage audit for the campaign",
          },
          {
            label: "Usage count",
            value: workspace.promotion.usageCount.toLocaleString("en"),
            hint: "Stored usage counter on the promotion record",
          },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_420px]">
        <div className="space-y-4">
          <AdminPanel>
            <AdminSectionHeader
              title="Promotion rules"
              description="Base discount settings are edited here. Product and variant targeting stays in the dedicated sections below."
            />
            <div className="mt-4">
              <PromotionForm
                promotion={workspace.promotion}
                returnTo={currentHref}
                submitLabel="Save promotion"
              />
            </div>
          </AdminPanel>

          <AdminPanel>
            <AdminSectionHeader
              title="Targeted products"
              description="Attach products from async search, then review the attached set in a paginated table."
            />
            <form action={attachPromotionTargetAction} className="mt-4 space-y-4">
              <input name="promotionId" type="hidden" value={workspace.promotion.id} />
              <input name="targetType" type="hidden" value="product" />
              <input name="returnTo" type="hidden" value={currentHref} />
              <AdminAsyncTargetPicker
                description="Search by product name, slug, SKU, brand, category, or status."
                label="Attach product"
                name="targetId"
                placeholder="Search product name, slug, SKU, brand, category, status"
                type="products"
              />
              <AdminActionButton tone="sky">Attach product</AdminActionButton>
            </form>

            <div className="mt-5 space-y-4">
              {workspace.productTargets.items.length > 0 ? (
                <AdminTableShell>
                  <AdminTable>
                    <AdminTableHead>
                      <tr>
                        <AdminTh>Product</AdminTh>
                        <AdminTh>Brand / category</AdminTh>
                        <AdminTh>Status</AdminTh>
                        <AdminTh />
                      </tr>
                    </AdminTableHead>
                    <AdminTableBody>
                      {workspace.productTargets.items.map((item) => (
                        <tr key={item.id}>
                          <AdminTd>
                            <p className="font-semibold text-slate-950">{item.productName}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {item.slug ? `/${item.slug}` : "No slug"}
                            </p>
                          </AdminTd>
                          <AdminTd>
                            <p className="text-sm text-slate-700">
                              {item.brandName ?? "No brand"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {item.categoryName ?? "No category"}
                            </p>
                          </AdminTd>
                          <AdminTd>
                            <AdminBadge
                              label={item.status ?? "UNKNOWN"}
                              tone={item.status === "ACTIVE" ? "emerald" : "amber"}
                            />
                          </AdminTd>
                          <AdminTd>
                            <form action={detachPromotionTargetAction}>
                              <input name="promotionId" type="hidden" value={workspace.promotion.id} />
                              <input name="targetType" type="hidden" value="product" />
                              <input name="targetId" type="hidden" value={item.productId} />
                              <input name="returnTo" type="hidden" value={currentHref} />
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
                  title="No product targets"
                  body="Attach products from the async search above when this campaign should only apply to specific catalog records."
                />
              )}

              <AdminPagination
                hrefBuilder={(page) =>
                  adminPromotionService.buildDetailHref(promotionId, resolvedSearchParams, {
                    productPage: page,
                  })
                }
                page={workspace.productTargets.page}
                totalPages={workspace.productTargets.totalPages}
              />
            </div>
          </AdminPanel>

          <AdminPanel>
            <AdminSectionHeader
              title="Targeted variants"
              description="Attach SKU-level targets without preloading the entire variant catalog into the page."
            />
            <form action={attachPromotionTargetAction} className="mt-4 space-y-4">
              <input name="promotionId" type="hidden" value={workspace.promotion.id} />
              <input name="targetType" type="hidden" value="variant" />
              <input name="returnTo" type="hidden" value={currentHref} />
              <AdminAsyncTargetPicker
                description="Search by SKU, variant label, product name, slug, brand, category, or product status."
                label="Attach variant"
                name="targetId"
                placeholder="Search SKU, variant label, product, brand, category, status"
                type="variants"
              />
              <AdminActionButton tone="sky">Attach variant</AdminActionButton>
            </form>

            <div className="mt-5 space-y-4">
              {workspace.variantTargets.items.length > 0 ? (
                <AdminTableShell>
                  <AdminTable>
                    <AdminTableHead>
                      <tr>
                        <AdminTh>Variant</AdminTh>
                        <AdminTh>Product</AdminTh>
                        <AdminTh>Status</AdminTh>
                        <AdminTh />
                      </tr>
                    </AdminTableHead>
                    <AdminTableBody>
                      {workspace.variantTargets.items.map((item) => (
                        <tr key={item.id}>
                          <AdminTd>
                            <p className="font-semibold text-slate-950">
                              {item.variantName ?? item.sku ?? "Variant"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {item.sku ?? "No SKU"}
                            </p>
                          </AdminTd>
                          <AdminTd>
                            <p className="text-sm text-slate-700">{item.productName}</p>
                          </AdminTd>
                          <AdminTd>
                            <AdminBadge
                              label={item.status ?? "UNKNOWN"}
                              tone={item.status === "ACTIVE" ? "emerald" : "amber"}
                            />
                          </AdminTd>
                          <AdminTd>
                            <form action={detachPromotionTargetAction}>
                              <input name="promotionId" type="hidden" value={workspace.promotion.id} />
                              <input name="targetType" type="hidden" value="variant" />
                              <input name="targetId" type="hidden" value={item.variantId} />
                              <input name="returnTo" type="hidden" value={currentHref} />
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
                  title="No variant targets"
                  body="Attach variants from async search when the promotion should reach only selected SKUs."
                />
              )}

              <AdminPagination
                hrefBuilder={(page) =>
                  adminPromotionService.buildDetailHref(promotionId, resolvedSearchParams, {
                    variantPage: page,
                  })
                }
                page={workspace.variantTargets.page}
                totalPages={workspace.variantTargets.totalPages}
              />
            </div>
          </AdminPanel>
        </div>

        <div className="space-y-4">
          <AdminPanel>
            <AdminSectionHeader
              title="Campaign state"
              description="Read-only summary of the current timing and coupon configuration."
            />
            <div className="mt-4 grid gap-3">
              <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Coupon code</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">
                  {workspace.promotion.code ?? "Automatic promotion"}
                </p>
              </div>
              <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Schedule</p>
                <p className="mt-2 text-sm text-slate-700">
                  Starts {formatDateTime(workspace.promotion.startsAt)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Ends {formatDateTime(workspace.promotion.endsAt)}
                </p>
              </div>
            </div>
          </AdminPanel>

          <AdminPanel>
            <AdminSectionHeader
              title="Coupon usage log"
              description="Read-only audit trail for campaign usage."
            />
            <div className="mt-4 space-y-3">
              {workspace.couponUsage.items.length > 0 ? (
                workspace.couponUsage.items.map((item) => (
                  <div
                    className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3"
                    key={item.id}
                  >
                    <p className="font-medium text-slate-900">
                      {item.usedCode ?? workspace.promotion.code ?? "Promotion usage"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.customerName ?? "Unknown customer"} /{" "}
                      {item.orderNo ?? "No order"} / {formatDateTime(item.usedAt)}
                    </p>
                  </div>
                ))
              ) : (
                <AdminEmptyState
                  title="No usage yet"
                  body="Coupon usage logs will appear here when customers start redeeming the promotion."
                />
              )}

              <AdminPagination
                hrefBuilder={(page) =>
                  adminPromotionService.buildDetailHref(promotionId, resolvedSearchParams, {
                    usagePage: page,
                  })
                }
                page={workspace.couponUsage.page}
                totalPages={workspace.couponUsage.totalPages}
              />
            </div>
          </AdminPanel>
        </div>
      </div>
    </AdminPage>
  );
}
