"use client";

import Link from "next/link";
import type { ColDef, ICellRendererParams } from "ag-grid-community";

import { AdminBadge } from "@/components/admin/workspace";
import { AdminDataGridShell, type AdminGridBulkAction } from "@/components/admin/data-grid-shell";

type SimpleRecordGridRow = {
  id: string;
  href: string;
  title: string;
  codeLabel: string;
  extraLabel: string;
  updatedAtLabel: string;
  descriptionLabel: string;
  relatedCountLabel: string;
  isActive: boolean;
  isUpdated: boolean;
};

const columnDefs: ColDef<SimpleRecordGridRow>[] = [
  {
    field: "title",
    flex: 1.7,
    headerName: "Record",
    minWidth: 240,
    cellRenderer: ({ data }: ICellRendererParams<SimpleRecordGridRow>) =>
      data ? (
        <Link
          className="block rounded-xl px-1 py-1 transition hover:bg-stone-100"
          href={data.href}
        >
          <p className="font-semibold text-slate-950">{data.title}</p>
          <p className="mt-1 text-xs text-slate-500">{data.codeLabel}</p>
          {data.extraLabel ? (
            <p className="mt-1 text-xs text-slate-500">{data.extraLabel}</p>
          ) : null}
          {data.updatedAtLabel ? (
            <p className="mt-1 text-xs text-slate-500">Updated {data.updatedAtLabel}</p>
          ) : null}
        </Link>
      ) : null,
  },
  {
    field: "descriptionLabel",
    flex: 1.3,
    headerName: "Description",
    minWidth: 200,
  },
  {
    field: "relatedCountLabel",
    headerName: "Usage",
    minWidth: 110,
  },
  {
    field: "isActive",
    flex: 1,
    headerName: "State",
    minWidth: 170,
    cellRenderer: ({ data }: ICellRendererParams<SimpleRecordGridRow>) =>
      data ? (
        <div className="flex flex-wrap gap-2 px-1 py-1">
          <AdminBadge
            label={data.isActive ? "ACTIVE" : "INACTIVE"}
            tone={data.isActive ? "emerald" : "rose"}
          />
          {data.isUpdated ? <AdminBadge label="UPDATED" tone="slate" /> : null}
        </div>
      ) : null,
  },
];

export function AdminSimpleRecordsGrid({
  bulkActions,
  emptyStateBody,
  emptyStateTitle,
  rows,
  selectionHint,
  selectionInputName,
  selectionLabel,
}: {
  rows: SimpleRecordGridRow[];
  emptyStateTitle: string;
  emptyStateBody: string;
  bulkActions?: AdminGridBulkAction[];
  selectionHint?: string;
  selectionInputName?: string;
  selectionLabel?: string;
}) {
  return (
    <AdminDataGridShell
      bulkActions={bulkActions}
      columnDefs={columnDefs}
      emptyStateBody={emptyStateBody}
      emptyStateTitle={emptyStateTitle}
      rows={rows}
      selectionHint={selectionHint}
      selectionInputName={selectionInputName}
      selectionLabel={selectionLabel}
    />
  );
}
