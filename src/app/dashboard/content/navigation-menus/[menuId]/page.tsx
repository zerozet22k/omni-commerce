import Link from "next/link";
import { notFound } from "next/navigation";
import { Types } from "mongoose";

import {
  deleteContentRecordAction,
  deleteNavigationMenuItemAction,
  saveNavigationMenuItemAction,
} from "@/app/dashboard/content/actions";
import { NavigationMenuForm } from "@/components/admin/domain-record-forms";
import { AdminEditorPage } from "@/components/admin/editor-page";
import type { AdminLookupOption } from "@/components/admin/lookup-picker";
import { ContentTabs } from "@/components/admin/module-tabs";
import { NavigationMenuItemFields } from "@/components/admin/navigation-menu-item-fields";
import {
  AdminActionButton,
  AdminBadge,
  AdminEmptyState,
  AdminLinkButton,
  AdminPanel,
  AdminSectionHeader,
  AdminTable,
  AdminTableBody,
  AdminTableHead,
  AdminTableShell,
  AdminTd,
  AdminTh,
} from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { readSearchParam, type AdminSearchParams } from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";
import { CategoryModel, ProductModel } from "@/modules/catalog/catalog.models";
import { CollectionModel } from "@/modules/catalog/catalog-extra.models";
import { NavigationMenuItemModel, PageModel } from "@/modules/content/content.models";

type NavigationMenuDetailPageProps = {
  params: Promise<{
    menuId: string;
  }>;
  searchParams: Promise<AdminSearchParams>;
};

type MenuItemRow = {
  id: string;
  parentItemId: string;
  label: string;
  linkType: "URL" | "CATEGORY" | "COLLECTION" | "PAGE" | "PRODUCT";
  linkValue: string;
  sortOrder: number;
  isActive: boolean;
};

function buildDepthMap(items: MenuItemRow[]) {
  const childrenByParent = new Map<string, MenuItemRow[]>();

  for (const item of items) {
    const parentKey = item.parentItemId || "";
    const existingChildren = childrenByParent.get(parentKey) ?? [];
    existingChildren.push(item);
    childrenByParent.set(parentKey, existingChildren);
  }

  for (const children of childrenByParent.values()) {
    children.sort((left, right) => left.sortOrder - right.sortOrder || left.label.localeCompare(right.label));
  }

  const depthMap = new Map<string, number>();

  function visit(parentId: string, depth: number) {
    for (const child of childrenByParent.get(parentId) ?? []) {
      if (depthMap.has(child.id)) {
        continue;
      }

      depthMap.set(child.id, depth);
      visit(child.id, depth + 1);
    }
  }

  visit("", 0);

  for (const item of items) {
    if (!depthMap.has(item.id)) {
      depthMap.set(item.id, 0);
    }
  }

  return depthMap;
}

async function buildLinkLookup(items: MenuItemRow[]) {
  const categoryIds = items
    .filter((item) => item.linkType === "CATEGORY" && Types.ObjectId.isValid(item.linkValue))
    .map((item) => new Types.ObjectId(item.linkValue));
  const collectionIds = items
    .filter((item) => item.linkType === "COLLECTION" && Types.ObjectId.isValid(item.linkValue))
    .map((item) => new Types.ObjectId(item.linkValue));
  const pageIds = items
    .filter((item) => item.linkType === "PAGE" && Types.ObjectId.isValid(item.linkValue))
    .map((item) => new Types.ObjectId(item.linkValue));
  const productIds = items
    .filter((item) => item.linkType === "PRODUCT" && Types.ObjectId.isValid(item.linkValue))
    .map((item) => new Types.ObjectId(item.linkValue));

  const [categories, collections, pages, products] = await Promise.all([
    categoryIds.length
      ? CategoryModel.find({ _id: { $in: categoryIds } })
          .select("categoryName slug fullSlugPath")
          .lean()
          .exec()
      : [],
    collectionIds.length
      ? CollectionModel.find({ _id: { $in: collectionIds } })
          .select("collectionName slug")
          .lean()
          .exec()
      : [],
    pageIds.length
      ? PageModel.find({ _id: { $in: pageIds } })
          .select("title slug")
          .lean()
          .exec()
      : [],
    productIds.length
      ? ProductModel.find({ _id: { $in: productIds } })
          .select("productName slug")
          .lean()
          .exec()
      : [],
  ]);

  const lookup = new Map<string, AdminLookupOption>();

  for (const category of categories as Array<{ _id: unknown; categoryName?: string; slug?: string; fullSlugPath?: string }>) {
    lookup.set(`CATEGORY:${String(category._id)}`, {
      id: String(category._id),
      label: category.categoryName ?? "Category",
      caption: (category.fullSlugPath ?? category.slug)
        ? `/${category.fullSlugPath ?? category.slug}`
        : null,
    });
  }

  for (const collection of collections as Array<{ _id: unknown; collectionName?: string; slug?: string }>) {
    lookup.set(`COLLECTION:${String(collection._id)}`, {
      id: String(collection._id),
      label: collection.collectionName ?? "Collection",
      caption: collection.slug ? `/${collection.slug}` : null,
    });
  }

  for (const page of pages as Array<{ _id: unknown; title?: string; slug?: string }>) {
    lookup.set(`PAGE:${String(page._id)}`, {
      id: String(page._id),
      label: page.title ?? "Page",
      caption: page.slug ? `/${page.slug}` : null,
    });
  }

  for (const product of products as Array<{ _id: unknown; productName?: string; slug?: string }>) {
    lookup.set(`PRODUCT:${String(product._id)}`, {
      id: String(product._id),
      label: product.productName ?? "Product",
      caption: product.slug ? `/${product.slug}` : null,
    });
  }

  return lookup;
}

export default async function DashboardContentNavigationMenuDetailPage({
  params,
  searchParams,
}: NavigationMenuDetailPageProps) {
  await requirePermission(PERMISSIONS.settingsManage);
  const { menuId } = await params;
  const resolvedSearchParams = await searchParams;
  const workspace = await adminWorkspaceService.getSimpleRecordWorkspace("navigation-menus", {
    id: menuId,
  });
  const record = workspace.selectedRecord;

  if (!record) {
    notFound();
  }

  const currentPath = `/dashboard/content/navigation-menus/${menuId}`;
  const selectedItemId = readSearchParam(resolvedSearchParams, "itemId");
  const menuItems = (((await NavigationMenuItemModel.find({ navigationMenuId: menuId })
    .sort({ sortOrder: 1, label: 1 })
    .lean()
    .exec()) as Array<{
    _id: unknown;
    parentItemId?: unknown;
    label?: string;
    linkType?: MenuItemRow["linkType"];
    linkValue?: string;
    sortOrder?: number;
    isActive?: boolean;
  }>).map((item) => ({
    id: String(item._id),
    parentItemId: item.parentItemId ? String(item.parentItemId) : "",
    label: typeof item.label === "string" ? item.label : "",
    linkType: item.linkType ?? "URL",
    linkValue: typeof item.linkValue === "string" ? item.linkValue : "",
    sortOrder: Number(item.sortOrder ?? 0),
    isActive: Boolean(item.isActive),
  })) satisfies MenuItemRow[]);
  const linkLookup = await buildLinkLookup(menuItems);
  const depthMap = buildDepthMap(menuItems);
  const selectedItem = menuItems.find((item) => item.id === selectedItemId) ?? null;
  const selectedItemLookup =
    selectedItem && selectedItem.linkType !== "URL"
      ? linkLookup.get(`${selectedItem.linkType}:${selectedItem.linkValue}`) ?? {
          id: selectedItem.linkValue,
          label: selectedItem.linkValue,
          caption: null,
        }
      : null;
  const parentOptions = [
    { value: "", label: "Top level item" },
    ...menuItems
      .filter((item) => item.id !== selectedItem?.id)
      .map((item) => ({
        value: item.id,
        label: `${"  ".repeat(depthMap.get(item.id) ?? 0)}${item.label}`,
      })),
  ];

  return (
    <AdminEditorPage
      backHref="/dashboard/content/navigation-menus"
      backLabel="Back to navigation menus"
      description="Edit the menu shell and manage its nested items, ordering, activation state, and linked resources from one focused editor."
      headerActions={
        <AdminLinkButton href={`${currentPath}#item-editor`}>
          {selectedItem ? "Add another item" : "Add menu item"}
        </AdminLinkButton>
      }
      main={
        <>
          <AdminPanel>
            <AdminSectionHeader
              title="Menu record"
              description="The menu shell controls the staff-facing record, while the item editor manages the actual navigational structure."
            />
            <div className="mt-5">
              <NavigationMenuForm
                record={record}
                returnTo={currentPath}
                submitLabel="Save navigation menu"
              />
            </div>
          </AdminPanel>

          <AdminPanel>
            <AdminSectionHeader
              title="Menu items"
              description="Nested items are managed here with explicit link types, ordering, and active state."
            />

            <div className="mt-5 space-y-4">
              {menuItems.length > 0 ? (
                <AdminTableShell>
                  <AdminTable>
                    <AdminTableHead>
                      <tr>
                        <AdminTh>Label</AdminTh>
                        <AdminTh>Link</AdminTh>
                        <AdminTh>Structure</AdminTh>
                        <AdminTh>State</AdminTh>
                        <AdminTh>Actions</AdminTh>
                      </tr>
                    </AdminTableHead>
                    <AdminTableBody>
                      {menuItems.map((item) => {
                        const resolvedLink =
                          item.linkType === "URL"
                            ? { label: item.linkValue, caption: null }
                            : linkLookup.get(`${item.linkType}:${item.linkValue}`) ?? {
                                label: item.linkValue,
                                caption: null,
                              };

                        return (
                          <tr key={item.id} className="hover:bg-stone-50/80">
                            <AdminTd>
                              <div style={{ paddingLeft: `${(depthMap.get(item.id) ?? 0) * 16}px` }}>
                                <p className="font-semibold text-slate-950">{item.label}</p>
                                <p className="mt-1 text-xs text-slate-500">
                                  Sort {item.sortOrder}
                                </p>
                              </div>
                            </AdminTd>
                            <AdminTd>
                              <p className="font-medium text-slate-900">{resolvedLink.label}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                {resolvedLink.caption ?? item.linkType}
                              </p>
                            </AdminTd>
                            <AdminTd>
                              <div className="flex flex-wrap gap-2">
                                <AdminBadge label={item.linkType} tone="sky" />
                                {item.parentItemId ? (
                                  <AdminBadge label="CHILD ITEM" tone="slate" />
                                ) : (
                                  <AdminBadge label="TOP LEVEL" tone="emerald" />
                                )}
                              </div>
                            </AdminTd>
                            <AdminTd>
                              <AdminBadge
                                label={item.isActive ? "ACTIVE" : "INACTIVE"}
                                tone={item.isActive ? "emerald" : "rose"}
                              />
                            </AdminTd>
                            <AdminTd>
                              <div className="flex flex-wrap gap-2">
                                <Link
                                  className="inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition"
                                  href={`${currentPath}?itemId=${item.id}#item-editor`}
                                >
                                  Edit
                                </Link>
                                <form action={deleteNavigationMenuItemAction}>
                                  <input name="itemId" type="hidden" value={item.id} />
                                  <input name="returnTo" type="hidden" value={currentPath} />
                                  <AdminActionButton tone="rose">Delete</AdminActionButton>
                                </form>
                              </div>
                            </AdminTd>
                          </tr>
                        );
                      })}
                    </AdminTableBody>
                  </AdminTable>
                </AdminTableShell>
              ) : (
                <AdminEmptyState
                  title="No menu items yet"
                  body="Add the first navigation item to start building this menu."
                />
              )}
            </div>
          </AdminPanel>
        </>
      }
      aside={
        <>
          <AdminPanel>
            <AdminSectionHeader
              title="Record actions"
              description="Menus with items are deactivated instead of being deleted."
            />
            <form action={deleteContentRecordAction} className="mt-5">
              <input name="kind" type="hidden" value="navigation-menus" />
              <input name="recordId" type="hidden" value={String(record.id)} />
              <input name="returnTo" type="hidden" value="/dashboard/content/navigation-menus" />
              <AdminActionButton tone="rose">Delete or deactivate menu</AdminActionButton>
            </form>
          </AdminPanel>

          <div id="item-editor">
            <AdminPanel>
              <AdminSectionHeader
                title={selectedItem ? "Edit menu item" : "Add menu item"}
                description="Choose a direct URL or bind the item to a category, collection, page, or product record."
              />
              <form action={saveNavigationMenuItemAction} className="mt-5 space-y-4">
                <input name="navigationMenuId" type="hidden" value={menuId} />
                <input name="itemId" type="hidden" value={selectedItem?.id ?? ""} />
                <input name="returnTo" type="hidden" value={currentPath} />
                <NavigationMenuItemFields
                  item={
                    selectedItem
                      ? {
                          parentItemId: selectedItem.parentItemId,
                          label: selectedItem.label,
                          linkType: selectedItem.linkType,
                          linkValue: selectedItem.linkValue,
                          sortOrder: selectedItem.sortOrder,
                          isActive: selectedItem.isActive,
                          initialLinkSelection: selectedItemLookup,
                        }
                      : null
                  }
                  parentOptions={parentOptions}
                />
                <AdminActionButton>
                  {selectedItem ? "Save menu item" : "Add menu item"}
                </AdminActionButton>
              </form>
            </AdminPanel>
          </div>
        </>
      }
      tabs={<ContentTabs currentPath="/dashboard/content/navigation-menus" />}
      title="Navigation Menu"
    />
  );
}
