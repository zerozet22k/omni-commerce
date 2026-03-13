"use client";

import Link from "next/link";
import type { ColDef, ICellRendererParams } from "ag-grid-community";

import { AdminBadge } from "@/components/admin/workspace";
import { AdminDataGridShell, type AdminGridBulkAction } from "@/components/admin/data-grid-shell";

type SupplierLinkGridRow = {
  id: string;
  href: string;
  supplierName: string;
  platformName: string;
  productName: string;
  variantLabel: string;
  sourceTitle: string;
  sourceUrl: string;
  sourceMeta: string;
  priceLabel: string;
  updatedAtLabel: string;
  isPreferred: boolean;
  isActive: boolean;
};

const columnDefs: ColDef<SupplierLinkGridRow>[] = [
  {
    field: "supplierName",
    flex: 1.2,
    headerName: "Supplier",
    minWidth: 220,
    cellRenderer: ({ data }: ICellRendererParams<SupplierLinkGridRow>) =>
      data ? (
        <div className="px-1 py-1">
          <p className="font-semibold text-slate-950">{data.supplierName}</p>
          <p className="mt-1 text-xs text-slate-500">{data.platformName}</p>
        </div>
      ) : null,
  },
  {
    field: "productName",
    flex: 1.3,
    headerName: "Variant",
    minWidth: 250,
    cellRenderer: ({ data }: ICellRendererParams<SupplierLinkGridRow>) =>
      data ? (
        <div className="px-1 py-1">
          <p className="font-semibold text-slate-950">{data.productName}</p>
          <p className="mt-1 text-xs text-slate-500">{data.variantLabel}</p>
        </div>
      ) : null,
  },
  {
    field: "sourceTitle",
    flex: 1.4,
    headerName: "Source record",
    minWidth: 260,
    cellRenderer: ({ data }: ICellRendererParams<SupplierLinkGridRow>) =>
      data ? (
        <div className="px-1 py-1">
          <a
            className="block font-semibold text-slate-950 underline-offset-2 transition hover:text-sky-700 hover:underline"
            href={data.sourceUrl}
            rel="noreferrer"
            target="_blank"
          >
            {data.sourceTitle}
          </a>
          <p className="mt-1 text-xs text-slate-500">{data.sourceMeta}</p>
        </div>
      ) : null,
  },
  {
    field: "priceLabel",
    headerClass: "justify-end",
    headerName: "Price",
    minWidth: 120,
  },
  {
    field: "updatedAtLabel",
    headerName: "Updated",
    minWidth: 170,
  },
  {
    field: "isActive",
    headerName: "State",
    minWidth: 190,
    cellRenderer: ({ data }: ICellRendererParams<SupplierLinkGridRow>) =>
      data ? (
        <div className="flex flex-wrap gap-2 px-1 py-1">
          <AdminBadge
            label={data.isActive ? "ACTIVE" : "INACTIVE"}
            tone={data.isActive ? "emerald" : "rose"}
          />
          {data.isPreferred ? <AdminBadge label="PREFERRED" tone="sky" /> : null}
        </div>
      ) : null,
  },
  {
    field: "href",
    headerClass: "justify-end",
    headerName: "Actions",
    minWidth: 160,
    suppressSizeToFit: true,
    cellRenderer: ({ data }: ICellRendererParams<SupplierLinkGridRow>) =>
      data ? (
        <div className="flex flex-wrap justify-end gap-2 px-1 py-1">
          <Link
            className="inline-flex items-center justify-center rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
            href={data.href}
          >
            Edit
          </Link>
        </div>
      ) : null,
  },
];

export function AdminSupplierLinksGrid({
  bulkActions,
  rows,
  selectionHint,
  selectionInputName,
  selectionLabel,
}: {
  rows: SupplierLinkGridRow[];
  bulkActions?: AdminGridBulkAction[];
  selectionHint?: string;
  selectionInputName?: string;
  selectionLabel?: string;
}) {
  return (
    <AdminDataGridShell
      bulkActions={bulkActions}
      columnDefs={columnDefs}
      emptyStateBody="Try a broader filter or create a new supplier link."
      emptyStateTitle="No supplier links matched"
      rowHeight={108}
      rows={rows}
      selectionHint={selectionHint}
      selectionInputName={selectionInputName}
      selectionLabel={selectionLabel}
    />
  );
}
