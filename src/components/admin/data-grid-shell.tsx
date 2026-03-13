"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
  type SelectionChangedEvent,
} from "ag-grid-community";

import {
  AdminActionButton,
  type AdminButtonTone,
  AdminEmptyState,
  AdminInlineHint,
} from "@/components/admin/workspace";

ModuleRegistry.registerModules([AllCommunityModule]);

type GridRow = {
  id: string;
};

export type AdminGridBulkAction = {
  label: string;
  name?: string;
  tone?: AdminButtonTone;
  value: string;
};

export function AdminDataGridShell<RowData extends GridRow>({
  rows,
  columnDefs,
  emptyStateBody,
  emptyStateTitle,
  bulkActions,
  selectionHint,
  selectionLabel = "rows",
  selectionInputName,
  rowHeight = 72,
}: {
  rows: RowData[];
  columnDefs: ColDef<RowData>[];
  emptyStateBody: string;
  emptyStateTitle: string;
  bulkActions?: AdminGridBulkAction[];
  selectionHint?: string;
  selectionLabel?: string;
  selectionInputName?: string;
  rowHeight?: number;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const hasSelection = selectedIds.length > 0;
  const isSelectable = Boolean(selectionInputName);
  const hasBulkActions = Boolean(bulkActions && bulkActions.length > 0);

  const shouldShowSelectionPanel = isSelectable && (hasSelection || hasBulkActions);

  const mergedColumnDefs = useMemo<ColDef<RowData>[]>(() => {
    return columnDefs.map((columnDef) => ({
      sortable: false,
      resizable: false,
      suppressMovable: true,
      ...columnDef,
    }));
  }, [columnDefs]);

  if (rows.length === 0) {
    return <AdminEmptyState body={emptyStateBody} title={emptyStateTitle} />;
  }

  function handleSelectionChanged(event: SelectionChangedEvent<RowData>) {
    if (!isSelectable) return;

    setSelectedIds(
      event.api
        .getSelectedRows()
        .map((row) => row.id)
        .filter(Boolean),
    );
  }

  const gridThemeStyle = {
    "--ag-font-size": "13px",
    "--ag-font-family": "inherit",
    "--ag-border-color": "#e7e5e4",
    "--ag-row-border-color": "#f1f5f9",
    "--ag-header-background-color": "#fafaf9",
    "--ag-header-column-separator-color": "#e7e5e4",
    "--ag-row-hover-color": "#fafaf9",
    "--ag-selected-row-background-color": "#f8fafc",
    "--ag-odd-row-background-color": "#ffffff",
    "--ag-background-color": "#ffffff",
    "--ag-cell-horizontal-padding": "14px",
    "--ag-header-height": "44px",
    "--ag-list-item-height": "36px",
    "--ag-wrapper-border-radius": "14px",
  } as CSSProperties;

  return (
    <>
      {shouldShowSelectionPanel ? (
        <div className="mb-4 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-950">
                {hasSelection
                  ? `${selectedIds.length} ${selectionLabel} selected on this page.`
                  : `Select ${selectionLabel} to enable batch actions.`}
              </p>

              {selectionHint ? (
                <p className="mt-1 text-xs text-slate-500">{selectionHint}</p>
              ) : null}
            </div>

            {hasBulkActions ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {bulkActions!.map((bulkAction) => (
                  <AdminActionButton
                    key={`${bulkAction.name ?? "bulkAction"}:${bulkAction.value}`}
                    disabled={!hasSelection}
                    name={bulkAction.name ?? "bulkAction"}
                    tone={bulkAction.tone ?? "slate"}
                    value={bulkAction.value}
                  >
                    {bulkAction.label}
                  </AdminActionButton>
                ))}
              </div>
            ) : null}
          </div>

          {hasSelection && selectionHint ? (
            <div className="mt-3">
              <AdminInlineHint tone="sky">
                Actions apply only to the {selectedIds.length} selected {selectionLabel}.
              </AdminInlineHint>
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        className="
          ag-theme-quartz overflow-hidden rounded-2xl border border-stone-200 bg-white
          [&_.ag-root-wrapper]:border-0
          [&_.ag-header]:border-b [&_.ag-header]:border-stone-200
          [&_.ag-header-cell]:text-xs [&_.ag-header-cell]:font-semibold [&_.ag-header-cell]:text-slate-600
          [&_.ag-row]:border-b [&_.ag-row]:border-slate-100
          [&_.ag-row:last-child]:border-b-0
          [&_.ag-cell]:flex [&_.ag-cell]:items-center
          [&_.ag-cell]:text-[13px] [&_.ag-cell]:text-slate-700
          [&_.ag-cell-wrapper]:w-full
          [&_.ag-checkbox-input-wrapper]:scale-90
          [&_.ag-center-cols-clipper]:min-h-0
        "
        style={gridThemeStyle}
      >
        <AgGridReact<RowData>
          rowData={rows}
          columnDefs={mergedColumnDefs}
          defaultColDef={{
            sortable: false,
            resizable: false,
            suppressHeaderMenuButton: true,
            suppressMovable: true,
          }}
          domLayout="autoHeight"
          getRowId={(params) => params.data.id}
          headerHeight={44}
          rowHeight={rowHeight}
          animateRows={false}
          suppressCellFocus
          suppressColumnMoveAnimation
          onSelectionChanged={handleSelectionChanged}
          rowSelection={
            isSelectable
              ? {
                  mode: "multiRow",
                  headerCheckbox: true,
                  checkboxes: true,
                  checkboxLocation: "selectionColumn",
                  enableClickSelection: false,
                  selectAll: "currentPage",
                }
              : undefined
          }
          selectionColumnDef={
            isSelectable
              ? {
                  width: 44,
                  minWidth: 44,
                  maxWidth: 44,
                  resizable: false,
                  sortable: false,
                  pinned: "left",
                }
              : undefined
          }
          theme="legacy"
        />
      </div>

      {selectionInputName
        ? selectedIds.map((selectedId) => (
            <input
              key={selectedId}
              name={selectionInputName}
              type="hidden"
              value={selectedId}
            />
          ))
        : null}
    </>
  );
}