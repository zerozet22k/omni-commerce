"use client";

import Link from "next/link";
import type { ColDef, ICellRendererParams } from "ag-grid-community";

import { AdminBadge } from "@/components/admin/workspace";
import { AdminDataGridShell, type AdminGridBulkAction } from "@/components/admin/data-grid-shell";

type OptionTypeGridRow = {
  id: string;
  href: string;
  optionName: string;
  productCountLabel: string;
  displayType: string;
  valueCountLabel: string;
};

const columnDefs: ColDef<OptionTypeGridRow>[] = [
  {
    field: "optionName",
    flex: 1.6,
    headerName: "Option type",
    minWidth: 240,
    cellRenderer: ({ data }: ICellRendererParams<OptionTypeGridRow>) =>
      data ? (
        <Link
          className="block rounded-xl px-1 py-1 transition hover:bg-stone-100"
          href={data.href}
        >
          <p className="font-semibold text-slate-950">{data.optionName}</p>
          <p className="mt-1 text-xs text-slate-500">{data.productCountLabel}</p>
        </Link>
      ) : null,
  },
  {
    field: "displayType",
    headerName: "Display",
    minWidth: 140,
    cellRenderer: ({ data }: ICellRendererParams<OptionTypeGridRow>) =>
      data ? <AdminBadge label={data.displayType} tone="sky" /> : null,
  },
  {
    field: "valueCountLabel",
    headerName: "Values",
    minWidth: 120,
  },
  {
    field: "productCountLabel",
    headerName: "Products",
    minWidth: 140,
  },
];

export function AdminOptionTypesGrid({
  bulkActions,
  rows,
  selectionHint,
  selectionInputName,
  selectionLabel,
}: {
  rows: OptionTypeGridRow[];
  bulkActions?: AdminGridBulkAction[];
  selectionHint?: string;
  selectionInputName?: string;
  selectionLabel?: string;
}) {
  return (
    <AdminDataGridShell
      bulkActions={bulkActions}
      columnDefs={columnDefs}
      emptyStateBody="Try a broader filter or create your first option type."
      emptyStateTitle="No option types found"
      rows={rows}
      selectionHint={selectionHint}
      selectionInputName={selectionInputName}
      selectionLabel={selectionLabel}
    />
  );
}
