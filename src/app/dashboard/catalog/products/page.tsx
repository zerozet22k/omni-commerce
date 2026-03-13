import { AdminActionNotice } from "@/components/admin/action-notice";
import { ProductQuickCreateForm } from "@/components/admin/catalog-forms";
import { CatalogTabs } from "@/components/admin/module-tabs";
import { AdminProductsGrid } from "@/components/admin/products-grid";
import { AdminQuickCreateModal } from "@/components/admin/quick-create-modal";
import {
  AdminActionButton,
  AdminField,
  AdminFilterGrid,
  AdminLinkButton,
  AdminPage,
  AdminPageHeader,
  AdminPagination,
  AdminPanel,
  AdminSectionHeader,
  AdminSelect,
  AdminSummaryStrip,
  AdminToolbar,
} from "@/components/admin/workspace";
import { bulkProductAction } from "@/app/dashboard/catalog/actions";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

type ProductsPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardCatalogProductsPage({
  searchParams,
}: ProductsPageProps) {
  await requirePermission(PERMISSIONS.catalogView);
  const resolvedSearchParams = await searchParams;
  const workspace = await adminWorkspaceService.getProductsWorkspace(
    resolvedSearchParams,
  );
  const currentHref = adminWorkspaceService.buildHref(
    "/dashboard/catalog/products",
    resolvedSearchParams,
    {},
  );

  return (
    <AdminPage>
      <AdminPageHeader
        title="Catalog"
        description="Manage products as operational records, with filters, stock visibility, publication state, and bulk actions."
        actions={
          <>
            <AdminQuickCreateModal
              description="Create a draft product and then continue in the full editor."
              title="Quick Create Product"
              triggerLabel="Quick create"
            >
              <ProductQuickCreateForm workspace={workspace} />
            </AdminQuickCreateModal>
            <AdminLinkButton href="/dashboard/catalog/products/new" tone="primary">
              Create new product
            </AdminLinkButton>
          </>
        }
      />

      <CatalogTabs currentPath="/dashboard/catalog/products" />

      <AdminActionNotice searchParams={resolvedSearchParams} />

      <AdminSummaryStrip
        columns={3}
        items={workspace.metrics.map((metric) => ({
          label: metric.label,
          value: metric.value.toLocaleString("en"),
          hint: metric.hint,
        }))}
      />

      <AdminToolbar>
        <form action="/dashboard/catalog/products" className="space-y-4" method="get">
          <AdminFilterGrid>
            <AdminField
              defaultValue={workspace.filters.query}
              label="Search"
              name="q"
              placeholder="Product name, slug, SKU"
            />
            <AdminSelect
              defaultValue={workspace.filters.categoryId}
              label="Category"
              name="categoryId"
              options={[
                { value: "", label: "All categories" },
                ...workspace.categories.map((category) => ({
                  value: category.id,
                  label: category.label,
                })),
              ]}
            />
            <AdminSelect
              defaultValue={workspace.filters.brandId}
              label="Brand"
              name="brandId"
              options={[
                { value: "", label: "All brands" },
                ...workspace.brands.map((brand) => ({
                  value: brand.id,
                  label: brand.label,
                })),
              ]}
            />
            <AdminSelect
              defaultValue={workspace.filters.status}
              label="Status"
              name="status"
              options={[
                { value: "", label: "All statuses" },
                { value: "ACTIVE", label: "ACTIVE" },
                { value: "DRAFT", label: "DRAFT" },
                { value: "ARCHIVED", label: "ARCHIVED" },
              ]}
            />
            <AdminSelect
              defaultValue={workspace.filters.visibility}
              label="Visibility"
              name="visibility"
              options={[
                { value: "", label: "All visibility" },
                { value: "PUBLIC", label: "PUBLIC" },
                { value: "HIDDEN", label: "HIDDEN" },
              ]}
            />
            <AdminSelect
              defaultValue={workspace.filters.featured}
              label="Featured"
              name="featured"
              options={[
                { value: "", label: "Featured or not" },
                { value: "true", label: "Featured only" },
                { value: "false", label: "Not featured" },
              ]}
            />
            <AdminSelect
              defaultValue={workspace.filters.hasIssues}
              label="Product health"
              name="hasIssues"
              options={[
                { value: "", label: "Healthy or not" },
                { value: "true", label: "Has issues" },
                { value: "false", label: "Healthy only" },
              ]}
            />
          </AdminFilterGrid>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <AdminSelect
              defaultValue={workspace.filters.newArrival}
              label="New arrival"
              name="newArrival"
              options={[
                { value: "", label: "All new arrival states" },
                { value: "true", label: "New arrivals only" },
                { value: "false", label: "Exclude new arrivals" },
              ]}
            />
            <AdminSelect
              defaultValue={workspace.filters.sort}
              label="Sort"
              name="sort"
              options={[
                { value: "newest", label: "Newest first" },
                { value: "oldest", label: "Oldest first" },
                { value: "name_asc", label: "Name A-Z" },
                { value: "name_desc", label: "Name Z-A" },
                { value: "updated", label: "Recently updated" },
              ]}
            />
            <input name="page" type="hidden" value="1" />
            <AdminActionButton>Apply filters</AdminActionButton>
            <AdminLinkButton href="/dashboard/catalog/products">Reset</AdminLinkButton>
          </div>
        </form>
      </AdminToolbar>

      <AdminPanel className="min-w-0">
        <AdminSectionHeader
          title="Products"
          description="Quickly publish, archive, or remove a selected set of products after filtering the list."
        />

        <form action={bulkProductAction} className="mt-5 space-y-4">
          <input name="returnTo" type="hidden" value={currentHref} />

          <AdminProductsGrid
            bulkActions={[
              { label: "Publish selected", value: "publish" },
              { label: "Archive selected", tone: "amber", value: "archive" },
              { label: "Delete selected", tone: "rose", value: "delete" },
            ]}
            rows={workspace.items.map((item) => ({
              id: item.id,
              href: `/dashboard/catalog/products/${item.id}`,
              productName: item.productName,
              slug: item.slug,
              updatedAtLabel: formatDateTime(item.updatedAt),
              categoryName: item.categoryName ?? "Unassigned",
              brandName: item.brandName ?? "No brand",
              priceLabel:
                item.defaultPrice !== null
                  ? formatCurrency(item.defaultPrice, "MMK")
                  : "No default price",
              skuLabel: item.defaultSku ?? "No SKU",
              variantCountLabel: `${item.variantCount} variants`,
              stockLabel: `${item.totalAvailableQty.toLocaleString("en")} available`,
              availabilityLabel: item.availabilityLabel,
              status: item.status,
              visibility: item.visibility,
              isFeatured: item.isFeatured,
              isNewArrival: item.isNewArrival,
              issueCount: item.issueCount,
              issueBadges: item.issueBadges,
            }))}
            selectionHint="Bulk product actions respect the current page selection and stay server-validated."
            selectionInputName="selectedIds"
            selectionLabel="products"
          />

          <AdminPagination
            hrefBuilder={(page) =>
              adminWorkspaceService.buildHref(
                "/dashboard/catalog/products",
                resolvedSearchParams,
                { page },
              )
            }
            page={workspace.page}
            totalPages={workspace.totalPages}
          />
        </form>
      </AdminPanel>
    </AdminPage>
  );
}
