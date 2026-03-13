"use client";

import Link from "next/link";
import type { ColDef, ICellRendererParams } from "ag-grid-community";

import { AdminBadge } from "@/components/admin/workspace";
import { AdminDataGridShell, type AdminGridBulkAction } from "@/components/admin/data-grid-shell";

type RefundGridRow = {
  id: string;
  href: string;
  refundLabel: string;
  createdAtLabel: string;
  orderNo: string;
  customerName: string;
  returnNo: string;
  returnStatus: string;
  status: string;
  amountLabel: string;
};

function getTone(value: string) {
  if (["PAID", "APPROVED"].includes(value)) {
    return "emerald" as const;
  }

  if (["PENDING"].includes(value)) {
    return "amber" as const;
  }

  if (["REJECTED"].includes(value)) {
    return "rose" as const;
  }

  return "slate" as const;
}

const columnDefs: ColDef<RefundGridRow>[] = [
  {
    field: "refundLabel",
    flex: 1.4,
    headerName: "Refund",
    minWidth: 220,
    cellRenderer: ({ data }: ICellRendererParams<RefundGridRow>) =>
      data ? (
        <Link
          className="block rounded-xl px-1 py-1 transition hover:bg-stone-100"
          href={data.href}
        >
          <p className="font-semibold text-slate-950">{data.refundLabel}</p>
          <p className="mt-1 text-xs text-slate-500">{data.createdAtLabel}</p>
        </Link>
      ) : null,
  },
  {
    field: "orderNo",
    flex: 1.1,
    headerName: "Order",
    minWidth: 180,
    cellRenderer: ({ data }: ICellRendererParams<RefundGridRow>) =>
      data ? (
        <div className="px-1 py-1">
          <p className="font-medium text-slate-900">{data.orderNo}</p>
          <p className="mt-1 text-xs text-slate-500">{data.customerName}</p>
        </div>
      ) : null,
  },
  {
    field: "returnNo",
    flex: 1,
    headerName: "Return",
    minWidth: 170,
    cellRenderer: ({ data }: ICellRendererParams<RefundGridRow>) =>
      data ? (
        <div className="px-1 py-1">
          <p className="font-medium text-slate-900">{data.returnNo}</p>
          <p className="mt-1 text-xs text-slate-500">{data.returnStatus}</p>
        </div>
      ) : null,
  },
  {
    field: "status",
    headerName: "Status",
    minWidth: 140,
    cellRenderer: ({ data }: ICellRendererParams<RefundGridRow>) =>
      data ? <AdminBadge label={data.status} tone={getTone(data.status)} /> : null,
  },
  {
    field: "amountLabel",
    headerName: "Amount",
    minWidth: 140,
  },
];

export function AdminRefundsGrid({
  bulkActions,
  rows,
  selectionHint,
  selectionInputName,
  selectionLabel,
}: {
  rows: RefundGridRow[];
  bulkActions?: AdminGridBulkAction[];
  selectionHint?: string;
  selectionInputName?: string;
  selectionLabel?: string;
}) {
  return (
    <AdminDataGridShell
      bulkActions={bulkActions}
      columnDefs={columnDefs}
      emptyStateBody="Adjust the filters or wait for refund records to be created."
      emptyStateTitle="No refunds matched"
      rows={rows}
      selectionHint={selectionHint}
      selectionInputName={selectionInputName}
      selectionLabel={selectionLabel}
    />
  );
}
