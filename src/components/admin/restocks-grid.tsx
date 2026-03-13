"use client";

import Link from "next/link";
import type { ColDef, ICellRendererParams } from "ag-grid-community";

import { AdminBadge } from "@/components/admin/workspace";
import { AdminDataGridShell, type AdminGridBulkAction } from "@/components/admin/data-grid-shell";

type RestockGridRow = {
  id: string;
  href: string;
  restockNo: string;
  createdAtLabel: string;
  sourceName: string;
  status: string;
  etaLabel: string;
  totalLabel: string;
};

function getTone(value: string) {
  if (["RECEIVED"].includes(value)) {
    return "emerald" as const;
  }

  if (["ORDERED", "PAID", "IN_TRANSIT", "PARTIALLY_RECEIVED"].includes(value)) {
    return "amber" as const;
  }

  if (["CANCELLED"].includes(value)) {
    return "rose" as const;
  }

  return "slate" as const;
}

const columnDefs: ColDef<RestockGridRow>[] = [
  {
    field: "restockNo",
    flex: 1.4,
    headerName: "Restock",
    minWidth: 220,
    cellRenderer: ({ data }: ICellRendererParams<RestockGridRow>) =>
      data ? (
        <Link
          className="block rounded-xl px-1 py-1 transition hover:bg-stone-100"
          href={data.href}
        >
          <p className="font-semibold text-slate-950">{data.restockNo}</p>
          <p className="mt-1 text-xs text-slate-500">{data.createdAtLabel}</p>
        </Link>
      ) : null,
  },
  {
    field: "sourceName",
    flex: 1.1,
    headerName: "Supplier",
    minWidth: 180,
  },
  {
    field: "status",
    headerName: "Status",
    minWidth: 160,
    cellRenderer: ({ data }: ICellRendererParams<RestockGridRow>) =>
      data ? <AdminBadge label={data.status} tone={getTone(data.status)} /> : null,
  },
  {
    field: "etaLabel",
    headerName: "ETA",
    minWidth: 160,
  },
  {
    field: "totalLabel",
    headerName: "Total",
    minWidth: 140,
  },
];

export function AdminRestocksGrid({
  bulkActions,
  rows,
  selectionHint,
  selectionInputName,
  selectionLabel,
}: {
  rows: RestockGridRow[];
  bulkActions?: AdminGridBulkAction[];
  selectionHint?: string;
  selectionInputName?: string;
  selectionLabel?: string;
}) {
  return (
    <AdminDataGridShell
      bulkActions={bulkActions}
      columnDefs={columnDefs}
      emptyStateBody="Adjust the filters or create a restock order."
      emptyStateTitle="No restock orders matched"
      rows={rows}
      selectionHint={selectionHint}
      selectionInputName={selectionInputName}
      selectionLabel={selectionLabel}
    />
  );
}
