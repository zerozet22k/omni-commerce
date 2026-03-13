"use client";

import Link from "next/link";
import type { ColDef, ICellRendererParams } from "ag-grid-community";

import { AdminBadge } from "@/components/admin/workspace";
import { AdminDataGridShell, type AdminGridBulkAction } from "@/components/admin/data-grid-shell";

type ReviewGridRow = {
  id: string;
  href: string;
  title: string;
  commentLabel: string;
  productName: string;
  productSlug: string;
  customerName: string;
  customerEmail: string;
  visibilityLabel: string;
  isVisible: boolean;
  isVerifiedPurchase: boolean;
  ratingLabel: string;
  createdAtLabel: string;
};

const columnDefs: ColDef<ReviewGridRow>[] = [
  {
    field: "title",
    flex: 1.5,
    headerName: "Review",
    minWidth: 240,
    cellRenderer: ({ data }: ICellRendererParams<ReviewGridRow>) =>
      data ? (
        <Link
          className="block rounded-xl px-1 py-1 transition hover:bg-stone-100"
          href={data.href}
        >
          <p className="break-words font-semibold text-slate-950">{data.title}</p>
          <p className="mt-1 line-clamp-2 text-xs text-slate-500">{data.commentLabel}</p>
        </Link>
      ) : null,
  },
  {
    field: "productName",
    flex: 1.2,
    headerName: "Product",
    minWidth: 180,
    cellRenderer: ({ data }: ICellRendererParams<ReviewGridRow>) =>
      data ? (
        <div className="px-1 py-1">
          <p className="font-medium text-slate-900">{data.productName}</p>
          <p className="mt-1 text-xs text-slate-500">{data.productSlug}</p>
        </div>
      ) : null,
  },
  {
    field: "customerName",
    flex: 1.1,
    headerName: "Customer",
    minWidth: 180,
    cellRenderer: ({ data }: ICellRendererParams<ReviewGridRow>) =>
      data ? (
        <div className="px-1 py-1">
          <p className="font-medium text-slate-900">{data.customerName}</p>
          <p className="mt-1 text-xs text-slate-500">{data.customerEmail}</p>
        </div>
      ) : null,
  },
  {
    field: "visibilityLabel",
    headerName: "State",
    minWidth: 170,
    cellRenderer: ({ data }: ICellRendererParams<ReviewGridRow>) =>
      data ? (
        <div className="flex flex-wrap gap-2 px-1 py-1">
          <AdminBadge
            label={data.visibilityLabel}
            tone={data.isVisible ? "emerald" : "amber"}
          />
          {data.isVerifiedPurchase ? <AdminBadge label="VERIFIED" tone="sky" /> : null}
        </div>
      ) : null,
  },
  {
    field: "ratingLabel",
    minWidth: 110,
    headerName: "Rating",
  },
  {
    field: "createdAtLabel",
    minWidth: 170,
    headerName: "Created",
  },
];

export function AdminReviewsGrid({
  bulkActions,
  rows,
  selectionHint,
  selectionInputName,
  selectionLabel,
}: {
  rows: ReviewGridRow[];
  bulkActions?: AdminGridBulkAction[];
  selectionHint?: string;
  selectionInputName?: string;
  selectionLabel?: string;
}) {
  return (
    <AdminDataGridShell
      bulkActions={bulkActions}
      columnDefs={columnDefs}
      emptyStateBody="Adjust the filters or wait for new product reviews."
      emptyStateTitle="No reviews matched"
      rows={rows}
      selectionHint={selectionHint}
      selectionInputName={selectionInputName}
      selectionLabel={selectionLabel}
    />
  );
}
