"use client";

import Link from "next/link";
import type { ColDef, ICellRendererParams } from "ag-grid-community";

import { AdminBadge } from "@/components/admin/workspace";
import { AdminDataGridShell, type AdminGridBulkAction } from "@/components/admin/data-grid-shell";

type UserGridRow = {
  id: string;
  href: string;
  fullName: string;
  contactLabel: string;
  lastLoginLabel: string;
  role: string;
  orderSummary: string;
  spendLabel: string;
  addressCountLabel: string;
  isActive: boolean;
};

const columnDefs: ColDef<UserGridRow>[] = [
  {
    field: "fullName",
    flex: 1.5,
    headerName: "User",
    minWidth: 220,
    cellRenderer: ({ data }: ICellRendererParams<UserGridRow>) =>
      data ? (
        <Link
          className="block rounded-xl px-1 py-1 transition hover:bg-stone-100"
          href={data.href}
        >
          <p className="font-semibold text-slate-950">{data.fullName}</p>
          <p className="mt-1 text-xs text-slate-500">{data.contactLabel}</p>
          <p className="mt-1 text-xs text-slate-500">Last login {data.lastLoginLabel}</p>
        </Link>
      ) : null,
  },
  {
    field: "role",
    headerName: "Role",
    minWidth: 130,
    cellRenderer: ({ data }: ICellRendererParams<UserGridRow>) =>
      data ? <AdminBadge label={data.role} tone="sky" /> : null,
  },
  {
    field: "orderSummary",
    flex: 1,
    headerName: "Orders / Spend",
    minWidth: 180,
    cellRenderer: ({ data }: ICellRendererParams<UserGridRow>) =>
      data ? (
        <div className="px-1 py-1">
          <p className="font-medium text-slate-900">{data.orderSummary}</p>
          <p className="mt-1 text-xs text-slate-500">{data.spendLabel}</p>
        </div>
      ) : null,
  },
  {
    field: "addressCountLabel",
    headerName: "Addresses",
    minWidth: 120,
  },
  {
    field: "isActive",
    headerName: "State",
    minWidth: 130,
    cellRenderer: ({ data }: ICellRendererParams<UserGridRow>) =>
      data ? (
        <AdminBadge
          label={data.isActive ? "ACTIVE" : "INACTIVE"}
          tone={data.isActive ? "emerald" : "rose"}
        />
      ) : null,
  },
];

export function AdminUsersGrid({
  bulkActions,
  rows,
  selectionHint,
  selectionInputName,
  selectionLabel,
}: {
  rows: UserGridRow[];
  bulkActions?: AdminGridBulkAction[];
  selectionHint?: string;
  selectionInputName?: string;
  selectionLabel?: string;
}) {
  return (
    <AdminDataGridShell
      bulkActions={bulkActions}
      columnDefs={columnDefs}
      emptyStateBody="Adjust the filters or create a new user."
      emptyStateTitle="No users matched"
      rows={rows}
      selectionHint={selectionHint}
      selectionInputName={selectionInputName}
      selectionLabel={selectionLabel}
    />
  );
}
