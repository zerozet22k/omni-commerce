import type { ReactNode } from "react";

import { bulkCatalogRecordAction } from "@/app/dashboard/catalog/actions";
import { bulkContentRecordAction } from "@/app/dashboard/content/actions";
import { bulkSettingsRecordAction } from "@/app/dashboard/settings/actions";
import { AdminActionNotice } from "@/components/admin/action-notice";
import type { AdminGridBulkAction } from "@/components/admin/data-grid-shell";
import { AdminSimpleRecordsGrid } from "@/components/admin/simple-records-grid";
import {
  AdminActionButton,
  AdminField,
  AdminFilterGrid,
  AdminLinkButton,
  AdminPage,
  AdminPageHeader,
  AdminPagination,
  AdminPanel,
  AdminSectionHeader,
  AdminSelect,
  AdminToolbar,
} from "@/components/admin/workspace";
import { formatDateTime } from "@/lib/utils/format";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import type { SimpleRecordWorkspace } from "@/modules/admin/admin-workspace.service";

type SimpleRecordBulkConfig = {
  action: (formData: FormData) => Promise<void>;
  actions: AdminGridBulkAction[];
  selectionLabel: string;
  selectionHint: string;
};

function getSimpleRecordBulkConfig(kind: SimpleRecordWorkspace["kind"]): SimpleRecordBulkConfig {
  if (kind === "categories") {
    return {
      action: bulkCatalogRecordAction,
      actions: [
        { label: "Activate selected", tone: "emerald", value: "activate" },
        { label: "Deactivate selected", tone: "amber", value: "deactivate" },
        { label: "Delete selected", tone: "rose", value: "delete" },
      ],
      selectionLabel: "categories",
      selectionHint:
        "Delete is blocked when selected categories still own products or child categories.",
    };
  }

  if (kind === "brands") {
    return {
      action: bulkCatalogRecordAction,
      actions: [
        { label: "Activate selected", tone: "emerald", value: "activate" },
        { label: "Deactivate selected", tone: "amber", value: "deactivate" },
        { label: "Delete selected", tone: "rose", value: "delete" },
      ],
      selectionLabel: "brands",
      selectionHint:
        "Delete is blocked when selected brands are still linked to catalog products.",
    };
  }

  if (kind === "collections") {
    return {
      action: bulkCatalogRecordAction,
      actions: [
        { label: "Activate selected", tone: "emerald", value: "activate" },
        { label: "Deactivate selected", tone: "amber", value: "deactivate" },
        { label: "Delete selected", tone: "rose", value: "delete" },
      ],
      selectionLabel: "collections",
      selectionHint:
        "Delete is blocked when selected collections are still attached to products.",
    };
  }

  if (kind === "product-types") {
    return {
      action: bulkCatalogRecordAction,
      actions: [{ label: "Delete selected", tone: "rose", value: "delete" }],
      selectionLabel: "product types",
      selectionHint:
        "Delete is blocked when selected product types are still assigned to products.",
    };
  }

  if (kind === "product-tags") {
    return {
      action: bulkCatalogRecordAction,
      actions: [{ label: "Delete selected", tone: "rose", value: "delete" }],
      selectionLabel: "product tags",
      selectionHint:
        "Delete is blocked when selected product tags are still assigned to products.",
    };
  }

  if (kind === "product-badges") {
    return {
      action: bulkCatalogRecordAction,
      actions: [
        { label: "Activate selected", tone: "emerald", value: "activate" },
        { label: "Deactivate selected", tone: "amber", value: "deactivate" },
        { label: "Delete selected", tone: "rose", value: "delete" },
      ],
      selectionLabel: "product badges",
      selectionHint:
        "Delete is blocked when selected badges are still attached to products.",
    };
  }

  if (kind === "payment-methods") {
    return {
      action: bulkSettingsRecordAction,
      actions: [
        { label: "Activate selected", tone: "emerald", value: "activate" },
        { label: "Deactivate selected", tone: "amber", value: "deactivate" },
        { label: "Delete selected", tone: "rose", value: "delete" },
      ],
      selectionLabel: "payment methods",
      selectionHint:
        "Delete is blocked when selected payment methods are already referenced by payments.",
    };
  }

  if (kind === "shipping-methods") {
    return {
      action: bulkSettingsRecordAction,
      actions: [
        { label: "Activate selected", tone: "emerald", value: "activate" },
        { label: "Deactivate selected", tone: "amber", value: "deactivate" },
        { label: "Delete selected", tone: "rose", value: "delete" },
      ],
      selectionLabel: "delivery methods",
      selectionHint:
        "Delete is blocked when selected delivery methods are already used by orders.",
    };
  }

  if (kind === "shipping-zones") {
    return {
      action: bulkSettingsRecordAction,
      actions: [
        { label: "Activate selected", tone: "emerald", value: "activate" },
        { label: "Deactivate selected", tone: "amber", value: "deactivate" },
        { label: "Delete selected", tone: "rose", value: "delete" },
      ],
      selectionLabel: "shipping zones",
      selectionHint:
        "Delete is blocked when selected shipping zones are still used by delivery methods.",
    };
  }

  if (kind === "shipping-rate-rules") {
    return {
      action: bulkSettingsRecordAction,
      actions: [
        { label: "Activate selected", tone: "emerald", value: "activate" },
        { label: "Deactivate selected", tone: "amber", value: "deactivate" },
        { label: "Delete selected", tone: "rose", value: "delete" },
      ],
      selectionLabel: "shipping rate rules",
      selectionHint:
        "Selected shipping rate rules can be activated, deactivated, or deleted together.",
    };
  }

  if (kind === "countries") {
    return {
      action: bulkSettingsRecordAction,
      actions: [{ label: "Delete selected", tone: "rose", value: "delete" }],
      selectionLabel: "countries",
      selectionHint:
        "Delete is blocked when selected countries are referenced by brands, products, addresses, tax rates, or states.",
    };
  }

  if (kind === "states-regions") {
    return {
      action: bulkSettingsRecordAction,
      actions: [{ label: "Delete selected", tone: "rose", value: "delete" }],
      selectionLabel: "states / regions",
      selectionHint:
        "Delete is blocked when selected states or regions are referenced by addresses or tax rates.",
    };
  }

  if (kind === "tax-classes") {
    return {
      action: bulkSettingsRecordAction,
      actions: [
        { label: "Activate selected", tone: "emerald", value: "activate" },
        { label: "Deactivate selected", tone: "amber", value: "deactivate" },
        { label: "Delete selected", tone: "rose", value: "delete" },
      ],
      selectionLabel: "tax classes",
      selectionHint:
        "Delete is blocked when selected tax classes are still attached to products.",
    };
  }

  if (kind === "tax-rates") {
    return {
      action: bulkSettingsRecordAction,
      actions: [
        { label: "Activate selected", tone: "emerald", value: "activate" },
        { label: "Deactivate selected", tone: "amber", value: "deactivate" },
        { label: "Delete selected", tone: "rose", value: "delete" },
      ],
      selectionLabel: "tax rates",
      selectionHint: "Selected tax rates can be activated, deactivated, or deleted together.",
    };
  }

  if (kind === "pages") {
    return {
      action: bulkContentRecordAction,
      actions: [
        { label: "Publish selected", tone: "emerald", value: "publish" },
        { label: "Unpublish selected", tone: "amber", value: "unpublish" },
      ],
      selectionLabel: "pages",
      selectionHint: "Publishing actions update selected page records without leaving the list.",
    };
  }

  if (kind === "banners") {
    return {
      action: bulkContentRecordAction,
      actions: [
        { label: "Activate selected", tone: "emerald", value: "activate" },
        { label: "Deactivate selected", tone: "amber", value: "deactivate" },
      ],
      selectionLabel: "banners",
      selectionHint: "Banner activation changes the selected records only.",
    };
  }

  return {
    action: bulkContentRecordAction,
    actions: [
      { label: "Activate selected", tone: "emerald", value: "activate" },
      { label: "Deactivate selected", tone: "amber", value: "deactivate" },
    ],
    selectionLabel: "navigation menus",
    selectionHint: "Menu activation changes the selected storefront navigation records.",
  };
}

export function SimpleRecordPage({
  title,
  description,
  currentPath,
  tabs,
  headerActions,
  searchPlaceholder,
  workspace,
  searchParams,
  itemHrefBuilder,
  emptyStateTitle,
  emptyStateBody,
  form,
  sidePanelTitle,
  sidePanelDescription,
}: {
  title: string;
  description: string;
  currentPath: string;
  tabs: ReactNode;
  headerActions?: ReactNode;
  searchPlaceholder: string;
  workspace: SimpleRecordWorkspace;
  searchParams: AdminSearchParams;
  itemHrefBuilder?: (itemId: string) => string;
  emptyStateTitle?: string;
  emptyStateBody?: string;
  form?: ReactNode;
  sidePanelTitle?: string;
  sidePanelDescription?: string;
}) {
  const resolveItemHref = (itemId: string) =>
    itemHrefBuilder
      ? itemHrefBuilder(itemId)
      : `${currentPath}?${new URLSearchParams({
          ...Object.fromEntries(
            Object.entries(searchParams).map(([key, value]) => [
              key,
              Array.isArray(value) ? value[0] ?? "" : value ?? "",
            ]),
          ),
          id: itemId,
        }).toString()}`;
  const currentQuery = Object.fromEntries(
    Object.entries(searchParams).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] ?? "" : value ?? "",
    ]),
  );
  const currentQueryString = new URLSearchParams(currentQuery).toString();
  const currentHref = currentQueryString ? `${currentPath}?${currentQueryString}` : currentPath;
  const bulkConfig = getSimpleRecordBulkConfig(workspace.kind);

  const listPanel = (
    <AdminPanel>
      <AdminSectionHeader
        title={title}
        description={`${workspace.total} records matched the current filters. Select rows to run the same safe batch workflow used on products.`}
      />
      <form action={bulkConfig.action} className="mt-5 space-y-4">
        <input name="kind" type="hidden" value={workspace.kind} />
        <input name="returnTo" type="hidden" value={currentHref} />

        <AdminSimpleRecordsGrid
          bulkActions={bulkConfig.actions}
          emptyStateBody={emptyStateBody ?? "Try a broader filter or create a new record."}
          emptyStateTitle={emptyStateTitle ?? `No ${title.toLowerCase()} found`}
          rows={workspace.items.map((item) => ({
            id: item.id,
            href: resolveItemHref(item.id),
            title: item.title,
            codeLabel: item.code ?? item.slug ?? "No code or slug",
            extraLabel: item.extra ?? "",
            updatedAtLabel: item.updatedAt ? formatDateTime(item.updatedAt) : "",
            descriptionLabel: item.description ?? "No description",
            relatedCountLabel: item.relatedCount.toLocaleString("en"),
            isActive: item.isActive,
            isUpdated: Boolean(item.updatedAt),
          }))}
          selectionHint={bulkConfig.selectionHint}
          selectionInputName="selectedIds"
          selectionLabel={bulkConfig.selectionLabel}
        />

        <AdminPagination
          hrefBuilder={(page) =>
            `${currentPath}?${new URLSearchParams({
              ...currentQuery,
              page: String(page),
            }).toString()}`
          }
          page={workspace.page}
          totalPages={workspace.totalPages}
        />
      </form>
    </AdminPanel>
  );

  return (
    <AdminPage>
      <AdminPageHeader actions={headerActions} title={title} description={description} />
      {tabs}
      <AdminActionNotice searchParams={searchParams} />

      <AdminToolbar>
        <form action={currentPath} className="space-y-4" method="get">
          <AdminFilterGrid className="2xl:grid-cols-3">
            <AdminField
              defaultValue={workspace.filters.query}
              label="Search"
              name="q"
              placeholder={searchPlaceholder}
            />
            <AdminSelect
              defaultValue={workspace.filters.active}
              label="Active"
              name="active"
              options={[
                { value: "", label: "All states" },
                { value: "true", label: "Active only" },
                { value: "false", label: "Inactive only" },
              ]}
            />
            <AdminSelect
              defaultValue={workspace.filters.sort}
              label="Sort"
              name="sort"
              options={[
                { value: "name_asc", label: "Name A-Z" },
                { value: "name_desc", label: "Name Z-A" },
                { value: "updated", label: "Recently updated" },
              ]}
            />
          </AdminFilterGrid>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <input name="page" type="hidden" value="1" />
            <AdminActionButton>Apply filters</AdminActionButton>
            <AdminLinkButton href={currentPath}>Reset</AdminLinkButton>
          </div>
        </form>
      </AdminToolbar>

      {form ? (
        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          {listPanel}
          <div className="space-y-5">
            <AdminPanel>
              <AdminSectionHeader
                title={
                  sidePanelTitle ??
                  (workspace.selectedRecord ? "Edit record" : "Create record")
                }
                description={
                  sidePanelDescription ??
                  "Update the selected record here. Records that are already in active use are archived or deactivated instead of being hard-deleted."
                }
              />
              <div className="mt-5">{form}</div>
            </AdminPanel>
          </div>
        </div>
      ) : (
        listPanel
      )}
    </AdminPage>
  );
}
