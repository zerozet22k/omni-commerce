"use client";

import Link from "next/link";
import type { ColDef, ICellRendererParams } from "ag-grid-community";

import { AdminBadge } from "@/components/admin/workspace";
import { AdminDataGridShell, type AdminGridBulkAction } from "@/components/admin/data-grid-shell";

type PaymentGridRow = {
  id: string;
  href: string;
  paymentLabel: string;
  paymentDateLabel: string;
  orderNo: string;
  customerName: string;
  methodLabel: string;
  status: string;
  amountLabel: string;
};

function getTone(value: string) {
  if (["CONFIRMED"].includes(value)) {
    return "emerald" as const;
  }

  if (["SUBMITTED", "AUTHORIZED"].includes(value)) {
    return "amber" as const;
  }

  if (["REJECTED", "REFUNDED"].includes(value)) {
    return "rose" as const;
  }

  return "slate" as const;
}

const columnDefs: ColDef<PaymentGridRow>[] = [
  {
    field: "paymentLabel",
    flex: 1.5,
    headerName: "Payment",
    minWidth: 240,
    cellRenderer: ({ data }: ICellRendererParams<PaymentGridRow>) =>
      data ? (
        <Link
          className="block rounded-xl px-1 py-1 transition hover:bg-stone-100"
          href={data.href}
        >
          <p className="break-words font-semibold text-slate-950">{data.paymentLabel}</p>
          <p className="mt-1 text-xs text-slate-500">{data.paymentDateLabel}</p>
        </Link>
      ) : null,
  },
  {
    field: "orderNo",
    flex: 1.2,
    headerName: "Order",
    minWidth: 180,
    cellRenderer: ({ data }: ICellRendererParams<PaymentGridRow>) =>
      data ? (
        <div className="px-1 py-1">
          <p className="font-medium text-slate-900">{data.orderNo}</p>
          <p className="mt-1 text-xs text-slate-500">{data.customerName}</p>
        </div>
      ) : null,
  },
  {
    field: "methodLabel",
    flex: 1.1,
    headerName: "Method",
    minWidth: 180,
  },
  {
    field: "status",
    headerName: "Status",
    minWidth: 150,
    cellRenderer: ({ data }: ICellRendererParams<PaymentGridRow>) =>
      data ? <AdminBadge label={data.status} tone={getTone(data.status)} /> : null,
  },
  {
    field: "amountLabel",
    headerClass: "justify-end",
    minWidth: 140,
  },
];

export function AdminPaymentsGrid({
  bulkActions,
  rows,
  selectionHint,
  selectionInputName,
  selectionLabel,
}: {
  rows: PaymentGridRow[];
  bulkActions?: AdminGridBulkAction[];
  selectionHint?: string;
  selectionInputName?: string;
  selectionLabel?: string;
}) {
  return (
    <AdminDataGridShell
      bulkActions={bulkActions}
      columnDefs={columnDefs}
      emptyStateBody="Adjust the filters or wait for new payment submissions."
      emptyStateTitle="No payments matched"
      rows={rows}
      selectionHint={selectionHint}
      selectionInputName={selectionInputName}
      selectionLabel={selectionLabel}
    />
  );
}
