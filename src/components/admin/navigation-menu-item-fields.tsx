"use client";

import { useState } from "react";

import type { AdminLookupOption } from "@/components/admin/lookup-picker";
import { AdminLookupPicker } from "@/components/admin/lookup-picker";
import {
  AdminCheckbox,
  AdminField,
  AdminFormGrid,
  AdminSelect,
} from "@/components/admin/workspace";

type NavigationMenuLinkType = "URL" | "CATEGORY" | "COLLECTION" | "PAGE" | "PRODUCT";

const LOOKUP_TYPES: Record<Exclude<NavigationMenuLinkType, "URL">, "categories" | "collections" | "pages" | "products"> =
  {
    CATEGORY: "categories",
    COLLECTION: "collections",
    PAGE: "pages",
    PRODUCT: "products",
  };

export function NavigationMenuItemFields({
  item,
  parentOptions,
}: {
  item?: {
    parentItemId: string;
    label: string;
    linkType: NavigationMenuLinkType;
    linkValue: string;
    sortOrder: number;
    isActive: boolean;
    initialLinkSelection?: AdminLookupOption | null;
  } | null;
  parentOptions: Array<{ value: string; label: string }>;
}) {
  const [linkType, setLinkType] = useState<NavigationMenuLinkType>(item?.linkType ?? "URL");

  return (
    <>
      <AdminFormGrid columns={2}>
        <AdminField
          defaultValue={item?.label ?? ""}
          label="Label"
          name="label"
          placeholder="Shop"
        />
        <AdminSelect
          defaultValue={item?.parentItemId ?? ""}
          label="Parent item"
          name="parentItemId"
          options={parentOptions}
        />
        <label className="grid min-w-0 gap-2">
          <span className="text-sm font-semibold text-slate-700">Link type</span>
          <select
            className="block w-full min-w-0 rounded-[0.95rem] border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-slate-950 outline-none"
            defaultValue={item?.linkType ?? "URL"}
            name="linkType"
            onChange={(event) => setLinkType(event.target.value as NavigationMenuLinkType)}
          >
            <option value="URL">URL</option>
            <option value="CATEGORY">CATEGORY</option>
            <option value="COLLECTION">COLLECTION</option>
            <option value="PAGE">PAGE</option>
            <option value="PRODUCT">PRODUCT</option>
          </select>
        </label>
        <AdminField
          defaultValue={item?.sortOrder ?? 0}
          label="Sort order"
          name="sortOrder"
          type="number"
        />
      </AdminFormGrid>

      {linkType === "URL" ? (
        <AdminField
          defaultValue={item?.linkType === "URL" ? item.linkValue : ""}
          label="Link URL"
          name="linkValue"
          placeholder="/shop"
        />
      ) : (
        <AdminLookupPicker
          initialSelection={
            item?.linkType === linkType ? item.initialLinkSelection ?? null : null
          }
          key={`${item?.linkValue ?? "new"}-${linkType}`}
          label="Linked resource"
          name="linkValue"
          placeholder="Search linked resource"
          type={LOOKUP_TYPES[linkType]}
        />
      )}

      <AdminCheckbox
        defaultChecked={item?.isActive ?? true}
        label="Active"
        name="isActive"
      />
    </>
  );
}
