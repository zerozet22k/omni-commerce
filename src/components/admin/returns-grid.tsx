"use client";

import Link from "next/link";
import type { ColDef, ICellRendererParams } from "ag-grid-community";

import { AdminBadge } from "@/components/admin/workspace";
import { AdminDataGridShell, type AdminGridBulkAction } from "@/components/admin/data-grid-shell";

type ReturnGridRow = {
  id: string;
  href: string;
  returnNo: string;
  requestedAtLabel: string;
  orderNo: string;
  reasonLabel: string;
  customerName: string;
  customerEmail: string;
  refundTotalLabel: string;
  status: string;
};

function getTone(value: string) {
  if (["APPROVED", "REFUNDED", "CLOSED"].includes(value)) {
    return "emerald" as const;
  }

  if (["REQUESTED", "RECEIVED"].includes(value)) {
    return "amber" as const;
  }

  if (["REJECTED"].includes(value)) {
    return "rose" as const;
  }

  return "slate" as const;
}

const columnDefs: ColDef<ReturnGridRow>[] = [
  {
    field: "returnNo",
    flex: 1.4,
    headerName: "Return",
    minWidth: 220,
    cellRenderer: ({ data }: ICellRendererParams<ReturnGridRow>) =>
      data ? (
        <Link
          className="block rounded-xl px-1 py-1 transition hover:bg-stone-100"
          href={data.href}
        >
          <p className="font-semibold text-slate-950">{data.returnNo}</p>
          <p className="mt-1 text-xs text-slate-500">{data.requestedAtLabel}</p>
        </Link>
      ) : null,
  },
  {
    field: "orderNo",
    flex: 1.15,
    headerName: "Order",
    minWidth: 180,
    cellRenderer: ({ data }: ICellRendererParams<ReturnGridRow>) =>
      data ? (
        <div className="px-1 py-1">
          <p className="font-medium text-slate-900">{data.orderNo}</p>
          <p className="mt-1 text-xs text-slate-500">{data.reasonLabel}</p>
        </div>
      ) : null,
  },
  {
    field: "customerName",
    flex: 1.1,
    headerName: "Customer",
    minWidth: 180,
    cellRenderer: ({ data }: ICellRendererParams<ReturnGridRow>) =>
      data ? (
        <div className="px-1 py-1">
          <p className="font-medium text-slate-900">{data.customerName}</p>
          <p className="mt-1 text-xs text-slate-500">{data.customerEmail}</p>
        </div>
      ) : null,
  },
  {
    field: "refundTotalLabel",
    headerName: "Refunds",
    minWidth: 140,
  },
  {
    field: "status",
    headerName: "Status",
    minWidth: 150,
    cellRenderer: ({ data }: ICellRendererParams<ReturnGridRow>) =>
      data ? <AdminBadge label={data.status} tone={getTone(data.status)} /> : null,
  },
];

export function AdminReturnsGrid({
  bulkActions,
  rows,
  selectionHint,
  selectionInputName,
  selectionLabel,
}: {
  rows: ReturnGridRow[];
  bulkActions?: AdminGridBulkAction[];
  selectionHint?: string;
  selectionInputName?: string;
  selectionLabel?: string;
}) {
  return (
    <AdminDataGridShell
      bulkActions={bulkActions}
      columnDefs={columnDefs}
      emptyStateBody="Adjust filters or wait for new customer return requests."
      emptyStateTitle="No returns matched"
      rows={rows}
      selectionHint={selectionHint}
      selectionInputName={selectionInputName}
      selectionLabel={selectionLabel}
    />
  );
}
