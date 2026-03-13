"use client";

import Link from "next/link";
import type { ColDef, ICellRendererParams } from "ag-grid-community";

import { AdminBadge } from "@/components/admin/workspace";
import { AdminDataGridShell, type AdminGridBulkAction } from "@/components/admin/data-grid-shell";

type SupplierGridRow = {
  id: string;
  href: string;
  linksHref: string;
  sourceName: string;
  updatedAtLabel: string;
  platformName: string;
  contactLabel: string;
  isActive: boolean;
  variantSourceCountLabel: string;
};

const columnDefs: ColDef<SupplierGridRow>[] = [
  {
    field: "sourceName",
    flex: 1.5,
    headerName: "Supplier",
    minWidth: 240,
    cellRenderer: ({ data }: ICellRendererParams<SupplierGridRow>) =>
      data ? (
        <Link
          className="block rounded-xl px-1 py-1 transition hover:bg-stone-100"
          href={data.href}
        >
          <p className="font-semibold text-slate-950">{data.sourceName}</p>
          <p className="mt-1 text-xs text-slate-500">{data.updatedAtLabel}</p>
        </Link>
      ) : null,
  },
  {
    field: "platformName",
    headerName: "Platform",
    minWidth: 160,
  },
  {
    field: "contactLabel",
    flex: 1.1,
    headerName: "Contact",
    minWidth: 180,
  },
  {
    field: "isActive",
    flex: 1,
    headerName: "State",
    minWidth: 180,
    cellRenderer: ({ data }: ICellRendererParams<SupplierGridRow>) =>
      data ? (
        <div className="flex flex-wrap gap-2 px-1 py-1">
          <AdminBadge
            label={data.isActive ? "ACTIVE" : "INACTIVE"}
            tone={data.isActive ? "emerald" : "rose"}
          />
          <AdminBadge label={data.variantSourceCountLabel} tone="sky" />
        </div>
      ) : null,
  },
  {
    field: "linksHref",
    headerClass: "justify-end",
    headerName: "Actions",
    minWidth: 190,
    suppressSizeToFit: true,
    cellRenderer: ({ data }: ICellRendererParams<SupplierGridRow>) =>
      data ? (
        <div className="flex flex-wrap justify-end gap-2 px-1 py-1">
          <Link
            className="inline-flex items-center justify-center rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
            href={data.href}
          >
            Edit
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
            href={data.linksHref}
          >
            Links
          </Link>
        </div>
      ) : null,
  },
];

export function AdminSuppliersGrid({
  bulkActions,
  emptyStateBody,
  emptyStateTitle,
  rows,
  selectionHint,
  selectionInputName,
  selectionLabel,
}: {
  rows: SupplierGridRow[];
  emptyStateTitle: string;
  emptyStateBody: string;
  bulkActions?: AdminGridBulkAction[];
  selectionHint?: string;
  selectionInputName?: string;
  selectionLabel?: string;
}) {
  return (
    <AdminDataGridShell
      bulkActions={bulkActions}
      columnDefs={columnDefs}
      emptyStateBody={emptyStateBody}
      emptyStateTitle={emptyStateTitle}
      rows={rows}
      rowHeight={100}
      selectionHint={selectionHint}
      selectionInputName={selectionInputName}
      selectionLabel={selectionLabel}
    />
  );
}
