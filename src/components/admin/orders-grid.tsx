"use client";

import Link from "next/link";
import type { ColDef, ICellRendererParams } from "ag-grid-community";

import { AdminBadge } from "@/components/admin/workspace";
import {
  AdminDataGridShell,
  type AdminGridBulkAction,
} from "@/components/admin/data-grid-shell";

type OrderGridRow = {
  id: string;
  href: string;
  statusHref: string;
  deliveryHref: string;
  notesHref: string;
  paymentHref: string;
  orderNo: string;
  orderDateLabel: string;
  customerLabel: string;
  contactLabel: string;
  customerTypeLabel: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  totalLabel: string;
};

function getTone(value: string) {
  if (["ACTIVE", "PAID", "CONFIRMED", "COMPLETED", "DELIVERED"].includes(value)) {
    return "emerald" as const;
  }

  if (["PENDING", "AWAITING_PAYMENT", "PACKING", "SUBMITTED", "PARTIAL"].includes(value)) {
    return "amber" as const;
  }

  if (["CANCELLED", "FAILED", "REFUNDED"].includes(value)) {
    return "rose" as const;
  }

  return "slate" as const;
}

function prettifyLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const secondaryActionClass =
  "inline-flex items-center justify-center rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950";

const primaryActionClass =
  "inline-flex items-center justify-center rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950";
const columnDefs: ColDef<OrderGridRow>[] = [
  {
    field: "orderNo",
    flex: 1.45,
    headerName: "Order",
    minWidth: 220,
    cellRenderer: ({ data }: ICellRendererParams<OrderGridRow>) =>
      data ? (
        <div className="px-1 py-1">
          <Link
            className="block rounded-xl px-2 py-2 transition hover:bg-stone-100"
            href={data.href}
          >
            <p className="truncate font-mono text-[13px] font-semibold text-slate-950">
              {data.orderNo}
            </p>
            <p className="mt-1 text-xs text-slate-500">{data.orderDateLabel}</p>
          </Link>

          <div className="mt-2 flex items-center gap-2 px-2 text-[11px] text-slate-500">
            <Link className="hover:text-slate-900" href={data.notesHref}>
              Notes
            </Link>
            <span className="text-slate-300">•</span>
            <Link className="hover:text-slate-900" href={data.paymentHref}>
              Payment
            </Link>
          </div>
        </div>
      ) : null,
  },
  {
    field: "customerLabel",
    flex: 1.35,
    headerName: "Customer",
    minWidth: 240,
    cellRenderer: ({ data }: ICellRendererParams<OrderGridRow>) =>
      data ? (
        <div className="px-1 py-2">
          <p className="truncate font-medium text-slate-900">{data.customerLabel}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{data.contactLabel}</p>

          <div className="mt-2">
            <AdminBadge
              compact
              label={data.customerTypeLabel}
              tone={data.customerTypeLabel === "ACCOUNT" ? "sky" : "slate"}
            />
          </div>
        </div>
      ) : null,
  },
  {
    field: "status",
    headerName: "Status",
    minWidth: 140,
    cellRenderer: ({ data }: ICellRendererParams<OrderGridRow>) =>
      data ? (
        <AdminBadge label={prettifyLabel(data.status)} tone={getTone(data.status)} />
      ) : null,
  },
  {
    field: "paymentStatus",
    headerName: "Payment",
    minWidth: 140,
    cellRenderer: ({ data }: ICellRendererParams<OrderGridRow>) =>
      data ? (
        <AdminBadge
          label={prettifyLabel(data.paymentStatus)}
          tone={getTone(data.paymentStatus)}
        />
      ) : null,
  },
  {
    field: "fulfillmentStatus",
    headerName: "Fulfillment",
    minWidth: 150,
    cellRenderer: ({ data }: ICellRendererParams<OrderGridRow>) =>
      data ? (
        <AdminBadge
          label={prettifyLabel(data.fulfillmentStatus)}
          tone={getTone(data.fulfillmentStatus)}
        />
      ) : null,
  },
  {
    field: "totalLabel",
    headerName: "Total",
    minWidth: 130,
    headerClass: "justify-end",
    cellRenderer: ({ data }: ICellRendererParams<OrderGridRow>) =>
      data ? (
        <div className="px-1 py-2 text-right">
          <p className="whitespace-nowrap font-semibold text-slate-900">{data.totalLabel}</p>
        </div>
      ) : null,
  },
  {
    field: "href",
    headerName: "Actions",
    minWidth: 220,
    suppressSizeToFit: true,
    headerClass: "justify-end",
    cellRenderer: ({ data }: ICellRendererParams<OrderGridRow>) =>
      data ? (
        <div className="flex h-full flex-col items-end justify-center gap-2 px-1 py-2">
          <div className="flex flex-wrap justify-end gap-2">
            <Link className={primaryActionClass} href={data.href}>
              Open
            </Link>
            <Link className={secondaryActionClass} href={data.statusHref}>
              Status
            </Link>
            <Link className={secondaryActionClass} href={data.deliveryHref}>
              Delivery
            </Link>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <Link className="hover:text-slate-900" href={data.paymentHref}>
              Payment
            </Link>
            <Link className="hover:text-slate-900" href={data.notesHref}>
              Notes
            </Link>
          </div>
        </div>
      ) : null,
  },
];

export function AdminOrdersGrid({
  bulkActions,
  rows,
  selectionHint,
  selectionInputName,
  selectionLabel,
}: {
  rows: OrderGridRow[];
  bulkActions?: AdminGridBulkAction[];
  selectionHint?: string;
  selectionInputName?: string;
  selectionLabel?: string;
}) {
  return (
    <AdminDataGridShell
      bulkActions={bulkActions}
      columnDefs={columnDefs}
      emptyStateBody="Try a broader search or create a manual order."
      emptyStateTitle="No orders matched"
      rowHeight={180}
      rows={rows}
      selectionHint={selectionHint}
      selectionInputName={selectionInputName}
      selectionLabel={selectionLabel}
    />
  );
}