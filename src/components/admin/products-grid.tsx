"use client";

import Link from "next/link";
import type { ColDef, ICellRendererParams } from "ag-grid-community";

import { AdminBadge } from "@/components/admin/workspace";
import { AdminDataGridShell, type AdminGridBulkAction } from "@/components/admin/data-grid-shell";
import type { ProductIssue } from "@/modules/catalog/product-issues";

type ProductGridRow = {
  id: string;
  href: string;
  productName: string;
  slug: string;
  updatedAtLabel: string;
  categoryName: string;
  brandName: string;
  priceLabel: string;
  skuLabel: string;
  variantCountLabel: string;
  stockLabel: string;
  availabilityLabel: string;
  status: string;
  visibility: string;
  isFeatured: boolean;
  isNewArrival: boolean;
  issueCount: number;
  issueBadges: ProductIssue[];
};

const columnDefs: ColDef<ProductGridRow>[] = [
  {
    field: "productName",
    flex: 2,
    headerName: "Product",
    minWidth: 240,
    cellRenderer: ({ data }: ICellRendererParams<ProductGridRow>) =>
      data ? (
        <Link
          className="block min-w-0 rounded-xl px-1 py-1 transition hover:bg-stone-100"
          href={data.href}
        >
          <p className="break-words font-semibold text-slate-950">{data.productName}</p>
          <p className="mt-1 break-all text-xs text-slate-500">/{data.slug}</p>
          <p className="mt-1 text-xs text-slate-500">Updated {data.updatedAtLabel}</p>
        </Link>
      ) : null,
  },
  {
    field: "categoryName",
    flex: 1.2,
    headerName: "Category",
    minWidth: 180,
    cellRenderer: ({ data }: ICellRendererParams<ProductGridRow>) =>
      data ? (
        <div className="px-1 py-1">
          <p className="break-words font-medium text-slate-900">{data.categoryName}</p>
          <p className="mt-1 break-words text-xs text-slate-500">{data.brandName}</p>
        </div>
      ) : null,
  },
  {
    field: "priceLabel",
    flex: 1.1,
    headerName: "Price / SKU",
    minWidth: 180,
    cellRenderer: ({ data }: ICellRendererParams<ProductGridRow>) =>
      data ? (
        <div className="px-1 py-1">
          <p className="whitespace-nowrap font-semibold text-slate-950">{data.priceLabel}</p>
          <p className="mt-1 break-words text-xs text-slate-500">
            {data.skuLabel} / {data.variantCountLabel}
          </p>
        </div>
      ) : null,
  },
  {
    field: "stockLabel",
    headerName: "Stock",
    minWidth: 160,
    cellRenderer: ({ data }: ICellRendererParams<ProductGridRow>) =>
      data ? (
        <div className="px-1 py-1">
          <p className="font-semibold text-slate-950">{data.stockLabel}</p>
          <p className="mt-1 text-xs text-slate-500">{data.availabilityLabel}</p>
        </div>
      ) : null,
  },
  {
    field: "issueCount",
    flex: 1,
    headerName: "Health",
    minWidth: 190,
    cellRenderer: ({ data }: ICellRendererParams<ProductGridRow>) =>
      data ? (
        <div className="flex flex-wrap gap-2 px-1 py-1">
          {data.issueCount > 0 ? (
            <>
              <AdminBadge label={`${data.issueCount} issues`} tone="rose" />
              {data.issueBadges.slice(0, 2).map((issue) => (
                <AdminBadge key={issue.code} label={issue.label} tone={issue.tone} />
              ))}
            </>
          ) : (
            <AdminBadge label="Healthy" tone="emerald" />
          )}
        </div>
      ) : null,
  },
  {
    field: "status",
    flex: 1,
    headerName: "Status",
    minWidth: 170,
    cellRenderer: ({ data }: ICellRendererParams<ProductGridRow>) =>
      data ? (
        <div className="flex flex-wrap gap-2 px-1 py-1">
          <AdminBadge
            label={data.status}
            tone={
              data.status === "ACTIVE"
                ? "emerald"
                : data.status === "ARCHIVED"
                  ? "rose"
                  : "amber"
            }
          />
          <AdminBadge
            label={data.visibility}
            tone={data.visibility === "PUBLIC" ? "sky" : "slate"}
          />
        </div>
      ) : null,
  },
  {
    field: "isFeatured",
    flex: 1,
    headerName: "Flags",
    minWidth: 150,
    cellRenderer: ({ data }: ICellRendererParams<ProductGridRow>) =>
      data ? (
        <div className="flex flex-wrap gap-2 px-1 py-1">
          {data.isFeatured ? <AdminBadge label="FEATURED" tone="sky" /> : null}
          {data.isNewArrival ? <AdminBadge label="NEW" tone="amber" /> : null}
        </div>
      ) : null,
  },
];

export function AdminProductsGrid({
  bulkActions,
  rows,
  selectionHint,
  selectionInputName,
  selectionLabel,
}: {
  rows: ProductGridRow[];
  bulkActions?: AdminGridBulkAction[];
  selectionHint?: string;
  selectionInputName?: string;
  selectionLabel?: string;
}) {
  return (
    <AdminDataGridShell
      bulkActions={bulkActions}
      columnDefs={columnDefs}
      emptyStateBody="Try a broader filter or create a new product."
      emptyStateTitle="No products matched"
      rows={rows}
      selectionHint={selectionHint}
      selectionInputName={selectionInputName}
      selectionLabel={selectionLabel}
    />
  );
}
