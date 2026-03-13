"use client";

import Link from "next/link";
import type { ColDef, ICellRendererParams } from "ag-grid-community";

import { AdminBadge } from "@/components/admin/workspace";
import { AdminDataGridShell, type AdminGridBulkAction } from "@/components/admin/data-grid-shell";

type ShipmentGridRow = {
  id: string;
  href: string;
  shipmentLabel: string;
  shippedAtLabel: string;
  orderNo: string;
  customerName: string;
  methodLabel: string;
  status: string;
  feeLabel: string;
};

function getTone(value: string) {
  if (["DELIVERED"].includes(value)) {
    return "emerald" as const;
  }

  if (["PACKING", "OUT_FOR_DELIVERY", "IN_TRANSIT", "PICKED_UP"].includes(value)) {
    return "amber" as const;
  }

  if (["RETURNED"].includes(value)) {
    return "rose" as const;
  }

  return "slate" as const;
}

const columnDefs: ColDef<ShipmentGridRow>[] = [
  {
    field: "shipmentLabel",
    flex: 1.4,
    headerName: "Shipment",
    minWidth: 220,
    cellRenderer: ({ data }: ICellRendererParams<ShipmentGridRow>) =>
      data ? (
        <Link
          className="block rounded-xl px-1 py-1 transition hover:bg-stone-100"
          href={data.href}
        >
          <p className="font-semibold text-slate-950">{data.shipmentLabel}</p>
          <p className="mt-1 text-xs text-slate-500">{data.shippedAtLabel}</p>
        </Link>
      ) : null,
  },
  {
    field: "orderNo",
    flex: 1.1,
    headerName: "Order",
    minWidth: 180,
    cellRenderer: ({ data }: ICellRendererParams<ShipmentGridRow>) =>
      data ? (
        <div className="px-1 py-1">
          <p className="font-medium text-slate-900">{data.orderNo}</p>
          <p className="mt-1 text-xs text-slate-500">{data.customerName}</p>
        </div>
      ) : null,
  },
  {
    field: "methodLabel",
    flex: 1,
    headerName: "Method",
    minWidth: 180,
  },
  {
    field: "status",
    headerName: "Status",
    minWidth: 160,
    cellRenderer: ({ data }: ICellRendererParams<ShipmentGridRow>) =>
      data ? <AdminBadge label={data.status} tone={getTone(data.status)} /> : null,
  },
  {
    field: "feeLabel",
    headerName: "Fee",
    minWidth: 140,
  },
];

export function AdminShipmentsGrid({
  bulkActions,
  rows,
  selectionHint,
  selectionInputName,
  selectionLabel,
}: {
  rows: ShipmentGridRow[];
  bulkActions?: AdminGridBulkAction[];
  selectionHint?: string;
  selectionInputName?: string;
  selectionLabel?: string;
}) {
  return (
    <AdminDataGridShell
      bulkActions={bulkActions}
      columnDefs={columnDefs}
      emptyStateBody="Adjust the filters or wait for fulfillment records to appear."
      emptyStateTitle="No shipments matched"
      rows={rows}
      selectionHint={selectionHint}
      selectionInputName={selectionInputName}
      selectionLabel={selectionLabel}
    />
  );
}
