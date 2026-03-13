"use client";

import Link from "next/link";
import type { ColDef, ICellRendererParams } from "ag-grid-community";

import { AdminBadge } from "@/components/admin/workspace";
import { AdminDataGridShell, type AdminGridBulkAction } from "@/components/admin/data-grid-shell";

type InventoryGridRow = {
  id: string;
  href: string;
  productName: string;
  variantLabel: string;
  availableLabel: string;
  stockLabel: string;
  thresholdLabel: string;
  supplierCountLabel: string;
  isActive: boolean;
  isLow: boolean;
};

const columnDefs: ColDef<InventoryGridRow>[] = [
  {
    field: "productName",
    flex: 1.6,
    headerName: "Variant",
    minWidth: 240,
    cellRenderer: ({ data }: ICellRendererParams<InventoryGridRow>) =>
      data ? (
        <Link
          className="block rounded-xl px-1 py-1 transition hover:bg-stone-100"
          href={data.href}
        >
          <p className="font-semibold text-slate-950">{data.productName}</p>
          <p className="mt-1 text-xs text-slate-500">{data.variantLabel}</p>
        </Link>
      ) : null,
  },
  {
    field: "availableLabel",
    headerName: "Available",
    minWidth: 120,
  },
  {
    field: "stockLabel",
    headerName: "Stock",
    minWidth: 180,
  },
  {
    field: "thresholdLabel",
    headerName: "Threshold",
    minWidth: 120,
  },
  {
    field: "supplierCountLabel",
    headerName: "Suppliers",
    minWidth: 120,
  },
  {
    field: "isActive",
    flex: 1,
    headerName: "State",
    minWidth: 180,
    cellRenderer: ({ data }: ICellRendererParams<InventoryGridRow>) =>
      data ? (
        <div className="flex flex-wrap gap-2 px-1 py-1">
          <AdminBadge
            label={data.isActive ? "ACTIVE" : "INACTIVE"}
            tone={data.isActive ? "emerald" : "rose"}
          />
          {data.isLow ? <AdminBadge label="LOW" tone="amber" /> : null}
        </div>
      ) : null,
  },
];

export function AdminInventoryGrid({
  bulkActions,
  rows,
  selectionHint,
  selectionInputName,
  selectionLabel,
}: {
  rows: InventoryGridRow[];
  bulkActions?: AdminGridBulkAction[];
  selectionHint?: string;
  selectionInputName?: string;
  selectionLabel?: string;
}) {
  return (
    <AdminDataGridShell
      bulkActions={bulkActions}
      columnDefs={columnDefs}
      emptyStateBody="Adjust the filters to review variant inventory."
      emptyStateTitle="No variants matched"
      rows={rows}
      selectionHint={selectionHint}
      selectionInputName={selectionInputName}
      selectionLabel={selectionLabel}
    />
  );
}
