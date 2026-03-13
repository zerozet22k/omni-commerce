"use client";

import Link from "next/link";
import type { ColDef, ICellRendererParams } from "ag-grid-community";

import { AdminBadge } from "@/components/admin/workspace";
import { AdminDataGridShell, type AdminGridBulkAction } from "@/components/admin/data-grid-shell";

type PromotionGridRow = {
  id: string;
  href: string;
  name: string;
  codeLabel: string;
  discountLabel: string;
  promotionType: string;
  targetsLabel: string;
  variantsLabel: string;
  stateLabel: string;
  startsAtLabel: string;
  isActive: boolean;
};

const columnDefs: ColDef<PromotionGridRow>[] = [
  {
    field: "name",
    flex: 1.8,
    headerName: "Promotion",
    minWidth: 260,
    cellRenderer: ({ data }: ICellRendererParams<PromotionGridRow>) =>
      data ? (
        <Link
          className="block rounded-xl px-1 py-1 transition hover:bg-stone-100"
          href={data.href}
        >
          <p className="font-semibold text-slate-950">{data.name}</p>
          <p className="mt-1 text-xs text-slate-500">{data.codeLabel}</p>
          <p className="mt-1 text-xs text-slate-500">{data.discountLabel}</p>
        </Link>
      ) : null,
  },
  {
    field: "promotionType",
    headerName: "Type",
    minWidth: 150,
    cellRenderer: ({ data }: ICellRendererParams<PromotionGridRow>) =>
      data ? <AdminBadge label={data.promotionType} tone="sky" /> : null,
  },
  {
    field: "targetsLabel",
    flex: 1.1,
    headerName: "Targets",
    minWidth: 170,
    cellRenderer: ({ data }: ICellRendererParams<PromotionGridRow>) =>
      data ? (
        <div className="px-1 py-1">
          <p className="font-semibold text-slate-950">{data.targetsLabel}</p>
          <p className="mt-1 text-xs text-slate-500">{data.variantsLabel}</p>
        </div>
      ) : null,
  },
  {
    field: "stateLabel",
    flex: 1.1,
    headerName: "State",
    minWidth: 160,
    cellRenderer: ({ data }: ICellRendererParams<PromotionGridRow>) =>
      data ? (
        <div className="px-1 py-1">
          <AdminBadge
            label={data.stateLabel}
            tone={data.isActive ? "emerald" : "rose"}
          />
          <p className="mt-2 text-xs text-slate-500">{data.startsAtLabel}</p>
        </div>
      ) : null,
  },
];

export function AdminPromotionsGrid({
  bulkActions,
  rows,
  selectionHint,
  selectionInputName,
  selectionLabel,
}: {
  rows: PromotionGridRow[];
  bulkActions?: AdminGridBulkAction[];
  selectionHint?: string;
  selectionInputName?: string;
  selectionLabel?: string;
}) {
  return (
    <AdminDataGridShell
      bulkActions={bulkActions}
      columnDefs={columnDefs}
      emptyStateBody="Create a promotion to start a new campaign."
      emptyStateTitle="No promotions found"
      rows={rows}
      selectionHint={selectionHint}
      selectionInputName={selectionInputName}
      selectionLabel={selectionLabel}
    />
  );
}
