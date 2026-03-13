"use client";

import Link from "next/link";
import type { ColDef, ICellRendererParams } from "ag-grid-community";

import { AdminBadge } from "@/components/admin/workspace";
import { AdminDataGridShell, type AdminGridBulkAction } from "@/components/admin/data-grid-shell";

type SupplierPlatformGridRow = {
  id: string;
  href: string;
  platformName: string;
  platformCode: string;
  supplierCountLabel: string;
  isActive: boolean;
};

const columnDefs: ColDef<SupplierPlatformGridRow>[] = [
  {
    field: "platformName",
    flex: 1.4,
    headerName: "Platform",
    minWidth: 240,
    cellRenderer: ({ data }: ICellRendererParams<SupplierPlatformGridRow>) =>
      data ? (
        <div className="px-1 py-1">
          <p className="font-semibold text-slate-950">{data.platformName}</p>
          <p className="mt-1 text-xs text-slate-500">{data.platformCode}</p>
        </div>
      ) : null,
  },
  {
    field: "supplierCountLabel",
    headerName: "Suppliers",
    minWidth: 150,
  },
  {
    field: "isActive",
    headerName: "State",
    minWidth: 150,
    cellRenderer: ({ data }: ICellRendererParams<SupplierPlatformGridRow>) =>
      data ? (
        <AdminBadge
          label={data.isActive ? "ACTIVE" : "INACTIVE"}
          tone={data.isActive ? "emerald" : "rose"}
        />
      ) : null,
  },
  {
    field: "href",
    headerClass: "justify-end",
    headerName: "Actions",
    minWidth: 120,
    suppressSizeToFit: true,
    cellRenderer: ({ data }: ICellRendererParams<SupplierPlatformGridRow>) =>
      data ? (
        <div className="flex justify-end px-1 py-1">
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

export function AdminSupplierPlatformsGrid({
  bulkActions,
  rows,
  selectionHint,
  selectionInputName,
  selectionLabel,
}: {
  rows: SupplierPlatformGridRow[];
  bulkActions?: AdminGridBulkAction[];
  selectionHint?: string;
  selectionInputName?: string;
  selectionLabel?: string;
}) {
  return (
    <AdminDataGridShell
      bulkActions={bulkActions}
      columnDefs={columnDefs}
      emptyStateBody="Create a platform to start organizing supplier records."
      emptyStateTitle="No platforms matched"
      rows={rows}
      rowHeight={96}
      selectionHint={selectionHint}
      selectionInputName={selectionInputName}
      selectionLabel={selectionLabel}
    />
  );
}
