import { Types } from "mongoose";

import { AdminActionNotice } from "@/components/admin/action-notice";
import { SupplierLinkForm } from "@/components/admin/supplier-forms";
import { SupplierTabs } from "@/components/admin/module-tabs";
import { AdminQuickCreateModal } from "@/components/admin/quick-create-modal";
import { AdminSupplierLinksGrid } from "@/components/admin/supplier-links-grid";
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
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import {
  clampPage,
  readNumberParam,
  readSearchParam,
  type AdminSearchParams,
} from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";
import { ProductModel, ProductVariantModel } from "@/modules/catalog/catalog.models";
import {
  SourcingSourceModel,
  VariantSourceModel,
} from "@/modules/sourcing/sourcing.models";

type SupplierLinksPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

const PAGE_LIMIT = 15;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default async function DashboardSupplierLinksPage({
  searchParams,
}: SupplierLinksPageProps) {
  await requirePermission(PERMISSIONS.inventoryView);
  const resolvedSearchParams = await searchParams;
  const supplierWorkspace = await adminWorkspaceService.getSupplierWorkspace(resolvedSearchParams);
  const query = readSearchParam(resolvedSearchParams, "q").trim();
  const sourceId = readSearchParam(resolvedSearchParams, "sourceId");
  const platformId = readSearchParam(resolvedSearchParams, "platformId");
  const active = readSearchParam(resolvedSearchParams, "active") || "active";
  const preferred = readSearchParam(resolvedSearchParams, "preferred") || "all";
  const sort = readSearchParam(resolvedSearchParams, "sort") || "updated";
  const requestedPage = readNumberParam(resolvedSearchParams, "page", 1);

  const filter: Record<string, unknown> = {};

  if (active === "active") {
    filter.isActive = true;
  }

  if (active === "inactive") {
    filter.isActive = false;
  }

  if (preferred === "preferred") {
    filter.isPreferred = true;
  }

  if (preferred === "standard") {
    filter.isPreferred = false;
  }

  if (sourceId && Types.ObjectId.isValid(sourceId)) {
    filter.sourcingSourceId = new Types.ObjectId(sourceId);
  } else if (platformId && Types.ObjectId.isValid(platformId)) {
    const platformSourceRows = (await SourcingSourceModel.find({
      sourcingPlatformId: platformId,
    })
      .select("_id")
      .lean()
      .exec()) as Array<{ _id: unknown }>;
    filter.sourcingSourceId = {
      $in: platformSourceRows.map((row) => new Types.ObjectId(String(row._id))),
    };
  }

  if (query) {
    const regex = new RegExp(escapeRegex(query), "i");
    const [matchingSourceRows, matchingProductRows, matchingVariantRows] = await Promise.all([
      SourcingSourceModel.find({
        $or: [
          { sourceName: regex },
          { contactName: regex },
          { email: regex },
          { phone: regex },
        ],
      })
        .select("_id")
        .lean()
        .exec(),
      ProductModel.find({
        $or: [{ productName: regex }, { slug: regex }],
      })
        .select("_id")
        .lean()
        .exec(),
      ProductVariantModel.find({
        $or: [{ sku: regex }, { variantName: regex }],
      })
        .select("_id")
        .lean()
        .exec(),
    ]);

    const productVariantRows =
      matchingProductRows.length > 0
        ? await ProductVariantModel.find({
            productId: {
              $in: matchingProductRows.map((row) => new Types.ObjectId(String(row._id))),
            },
          })
            .select("_id")
            .lean()
            .exec()
        : [];
    const matchedSourceIds = matchingSourceRows.map((row) => new Types.ObjectId(String(row._id)));
    const matchedVariantIds = [
      ...matchingVariantRows.map((row) => new Types.ObjectId(String(row._id))),
      ...productVariantRows.map((row) => new Types.ObjectId(String(row._id))),
    ];
    const searchClauses: Record<string, unknown>[] = [
      { sourceSku: regex },
      { sourceProductName: regex },
      { sourceProductUrl: regex },
    ];

    if (matchedSourceIds.length > 0) {
      searchClauses.push({ sourcingSourceId: { $in: matchedSourceIds } });
    }

    if (matchedVariantIds.length > 0) {
      searchClauses.push({ variantId: { $in: matchedVariantIds } });
    }

    filter.$or = searchClauses;
  }

  const sortMap: Record<string, Record<string, 1 | -1>> = {
    updated: { updatedAt: -1, _id: -1 },
    preferred: { isPreferred: -1, updatedAt: -1 },
    price_desc: { sourcePrice: -1, updatedAt: -1 },
    price_asc: { sourcePrice: 1, updatedAt: -1 },
  };

  const [total, sourceOptionRows] = await Promise.all([
    VariantSourceModel.countDocuments(filter).exec(),
    SourcingSourceModel.find()
      .sort({ sourceName: 1 })
      .select("sourceName isActive")
      .lean()
      .exec(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const page = clampPage(requestedPage, totalPages);
  const pagedLinkRows = (await VariantSourceModel.find(filter)
    .sort(sortMap[sort] ?? sortMap.updated)
    .skip((page - 1) * PAGE_LIMIT)
    .limit(PAGE_LIMIT)
    .lean()
    .exec()) as Array<{
    _id: unknown;
    variantId?: unknown;
    sourcingSourceId?: unknown;
    sourceSku?: string;
    sourceProductName?: string;
    sourceProductUrl?: string;
    sourcePrice?: number;
    isPreferred?: boolean;
    isActive?: boolean;
    updatedAt?: Date;
  }>;
  const sourceIds = pagedLinkRows
    .map((row) => String(row.sourcingSourceId ?? ""))
    .filter((value) => Types.ObjectId.isValid(value));
  const variantIds = pagedLinkRows
    .map((row) => String(row.variantId ?? ""))
    .filter((value) => Types.ObjectId.isValid(value));

  const sourceRows =
    sourceIds.length > 0
      ? ((await SourcingSourceModel.find({
          _id: { $in: sourceIds.map((value) => new Types.ObjectId(value)) },
        })
    .select("sourceName sourcingPlatformId")
    .lean()
    .exec()) as Array<{
          _id: unknown;
          sourceName?: string;
          sourcingPlatformId?: unknown;
        }>)
      : [];
  const sourceMap = new Map(
    sourceRows.map((row) => [
      String(row._id),
      {
        sourceName: row.sourceName ?? "Supplier",
        sourcingPlatformId: String(row.sourcingPlatformId ?? ""),
      },
    ]),
  );
  const platformMap = new Map(
    supplierWorkspace.platformOptions.map((row) => [row.id, row.label]),
  );
  const variantRows =
    variantIds.length > 0
      ? ((await ProductVariantModel.find({
          _id: { $in: variantIds.map((value) => new Types.ObjectId(value)) },
        })
          .select("productId variantName sku")
          .lean()
          .exec()) as Array<{
          _id: unknown;
          productId?: unknown;
          variantName?: string;
          sku?: string;
        }>)
      : [];
  const variantMap = new Map(
    variantRows.map((row) => [
      String(row._id),
      {
        productId: String(row.productId ?? ""),
        variantName: row.variantName ?? null,
        sku: row.sku ?? "",
      },
    ]),
  );
  const productRows =
    variantRows.length > 0
      ? ((await ProductModel.find({
          _id: {
            $in: variantRows
              .map((row) => String(row.productId ?? ""))
              .filter((value) => Types.ObjectId.isValid(value))
              .map((value) => new Types.ObjectId(value)),
          },
        })
          .select("productName")
          .lean()
          .exec()) as Array<{ _id: unknown; productName?: string }>)
      : [];
  const productMap = new Map(
    productRows.map((row) => [String(row._id), row.productName ?? "Product"]),
  );
  const sourceOptions = sourceOptionRows.map((row) => ({
    id: String(row._id),
    label:
      typeof row.sourceName === "string"
        ? `${row.sourceName}${row.isActive ? "" : " (inactive)"}`
        : "Supplier",
  }));

  return (
    <AdminPage>
      <AdminPageHeader
        title="Supplier Variant Links"
        description="Review purchasing links as their own operational table instead of hiding them inside supplier notes or product side panels."
        actions={
          <>
            <AdminQuickCreateModal
              description="Attach a supplier URL to a sellable variant without leaving the list."
              title="Quick Create Supplier Link"
              triggerLabel="Quick create"
            >
              <SupplierLinkForm
                returnTo="/dashboard/supplier/links"
                sourceOptions={sourceOptions}
                variantOptions={supplierWorkspace.variantOptions}
              />
            </AdminQuickCreateModal>
            <AdminLinkButton href="/dashboard/supplier/links/new" tone="primary">
              Create new supplier link
            </AdminLinkButton>
          </>
        }
      />

      <SupplierTabs currentPath="/dashboard/supplier/links" />

      <AdminActionNotice searchParams={resolvedSearchParams} />

      <AdminSummaryStrip
        columns={3}
        items={[
          {
            label: "Active links",
            value: supplierWorkspace.metrics[2]?.value.toLocaleString("en") ?? "0",
            hint: supplierWorkspace.metrics[2]?.hint ?? "Variant links currently active",
          },
          {
            label: "Preferred links",
            value: supplierWorkspace.metrics[3]?.value.toLocaleString("en") ?? "0",
            hint: supplierWorkspace.metrics[3]?.hint ?? "Preferred purchasing matches",
          },
          {
            label: "Suppliers",
            value: supplierWorkspace.total.toLocaleString("en"),
            hint: "Filter the link table to a supplier or platform when needed",
          },
        ]}
      />

      <AdminToolbar>
        <form action="/dashboard/supplier/links" className="space-y-4" method="get">
          <AdminFilterGrid className="2xl:grid-cols-6">
            <AdminField
              defaultValue={query}
              label="Search"
              name="q"
              placeholder="Source title, URL, SKU, supplier, or product"
            />
            <AdminSelect
              defaultValue={sourceId}
              label="Supplier"
              name="sourceId"
              options={[{ value: "", label: "All suppliers" }, ...sourceOptions]}
            />
            <AdminSelect
              defaultValue={platformId}
              label="Platform"
              name="platformId"
              options={[
                { value: "", label: "All platforms" },
                ...supplierWorkspace.platformOptions,
              ]}
            />
            <AdminSelect
              defaultValue={active}
              label="State"
              name="active"
              options={[
                { value: "active", label: "Active only" },
                { value: "inactive", label: "Inactive only" },
                { value: "all", label: "All states" },
              ]}
            />
            <AdminSelect
              defaultValue={preferred}
              label="Preferred"
              name="preferred"
              options={[
                { value: "all", label: "Preferred or not" },
                { value: "preferred", label: "Preferred only" },
                { value: "standard", label: "Non-preferred only" },
              ]}
            />
            <AdminSelect
              defaultValue={sort}
              label="Sort"
              name="sort"
              options={[
                { value: "updated", label: "Recently updated" },
                { value: "preferred", label: "Preferred first" },
                { value: "price_desc", label: "Highest price" },
                { value: "price_asc", label: "Lowest price" },
              ]}
            />
          </AdminFilterGrid>

          <div className="flex items-end gap-3">
            <input name="page" type="hidden" value="1" />
            <AdminActionButton>Apply filters</AdminActionButton>
            <AdminLinkButton href="/dashboard/supplier/links">Reset</AdminLinkButton>
          </div>
        </form>
      </AdminToolbar>

      <AdminPanel className="min-w-0">
        <AdminSectionHeader
          title="Supplier links"
          description={`${total} link records matched the current filters. Selection is available for future batch workflows, but destructive bulk actions stay disabled.`}
        />

        <div className="mt-5 space-y-4">
          <AdminSupplierLinksGrid
            rows={pagedLinkRows.map((link) => {
              const source = sourceMap.get(String(link.sourcingSourceId ?? ""));
              const variant = variantMap.get(String(link.variantId ?? ""));
              const productName = variant
                ? productMap.get(variant.productId) ?? "Product"
                : "Product";

              return {
                id: String(link._id),
                href: `/dashboard/supplier/links/${String(link._id)}`,
                supplierName: source?.sourceName ?? "Supplier",
                platformName:
                  platformMap.get(source?.sourcingPlatformId ?? "") ?? "No platform",
                productName,
                variantLabel:
                  variant?.variantName ?? variant?.sku ?? "Variant",
                sourceTitle:
                  (typeof link.sourceProductName === "string" && link.sourceProductName) ||
                  (typeof link.sourceProductUrl === "string" ? link.sourceProductUrl : "Source product"),
                sourceUrl: typeof link.sourceProductUrl === "string" ? link.sourceProductUrl : "#",
                sourceMeta:
                  (typeof link.sourceSku === "string" && link.sourceSku
                    ? `SKU ${link.sourceSku}`
                    : "No source SKU") +
                  ` / ${formatDateTime(link.updatedAt ?? null)}`,
                priceLabel:
                  typeof link.sourcePrice === "number"
                    ? formatCurrency(link.sourcePrice, "MMK")
                    : "No price",
                updatedAtLabel: formatDateTime(link.updatedAt ?? null),
                isPreferred: Boolean(link.isPreferred),
                isActive: Boolean(link.isActive),
              };
            })}
            selectionHint="Selection is kept here for future batch workflows. Edit and delete remain record-level actions."
            selectionInputName="selectedIds"
            selectionLabel="links"
          />

          <AdminPagination
            hrefBuilder={(nextPage) =>
              adminWorkspaceService.buildHref("/dashboard/supplier/links", resolvedSearchParams, {
                page: nextPage,
              })
            }
            page={page}
            totalPages={totalPages}
          />
        </div>
      </AdminPanel>
    </AdminPage>
  );
}
