import {
  saveVariantSourceAction,
  deleteVariantSourceAction,
} from "@/app/dashboard/catalog/actions";
import {
  deleteSourcingPlatformAction,
  deleteSourceAction,
  saveSourcingPlatformAction,
  saveSourceAction,
} from "@/app/dashboard/inventory/actions";
import {
  AdminActionButton,
  AdminCheckbox,
  AdminField,
  AdminFormGrid,
  AdminInlineHint,
  AdminSelect,
  AdminTextarea,
} from "@/components/admin/workspace";

type SupplierOption = {
  id: string;
  label: string;
};

type SupplierRecord = {
  id: string;
  sourcingPlatformId: string;
  sourceName: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  shopUrl: string | null;
  note: string | null;
  isActive: boolean;
};

type SupplierPlatformRecord = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  supplierCount: number;
};

type SupplierLinkRecord = {
  id: string;
  variantId: string;
  sourcingSourceId: string;
  sourceSku: string | null;
  sourceProductName: string | null;
  sourceProductUrl: string;
  sourcePrice: number | null;
  isPreferred: boolean;
  isActive: boolean;
};

export function SupplierRecordForm({
  platformOptions,
  record,
  redirectToDetail = false,
  returnTo,
  submitLabel,
}: {
  platformOptions: SupplierOption[];
  record?: SupplierRecord | null;
  redirectToDetail?: boolean;
  returnTo: string;
  submitLabel?: string;
}) {
  if (platformOptions.length === 0) {
    return (
      <AdminInlineHint tone="amber">
        Create at least one supplier platform before adding supplier records.
      </AdminInlineHint>
    );
  }

  return (
    <form action={saveSourceAction} className="space-y-4">
      <input name="sourceId" type="hidden" value={record?.id ?? ""} />
      <input name="redirectToDetail" type="hidden" value={redirectToDetail ? "true" : "false"} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <AdminSelect
        defaultValue={record?.sourcingPlatformId ?? ""}
        label="Platform"
        name="sourcingPlatformId"
        options={platformOptions}
      />
      <AdminFormGrid columns={2}>
        <AdminField
          defaultValue={record?.sourceName ?? ""}
          label="Supplier name"
          name="sourceName"
          placeholder="Shop or seller name"
        />
        <AdminField
          defaultValue={record?.contactName ?? ""}
          label="Contact name"
          name="contactName"
          placeholder="Optional contact"
        />
        <AdminField
          defaultValue={record?.phone ?? ""}
          label="Phone"
          name="phone"
          placeholder="Optional phone"
        />
        <AdminField
          defaultValue={record?.email ?? ""}
          label="Email"
          name="email"
          placeholder="Optional email"
          type="email"
        />
      </AdminFormGrid>
      <AdminField
        defaultValue={record?.shopUrl ?? ""}
        label="Shop URL"
        name="shopUrl"
        placeholder="https://supplier.example/store"
        type="url"
      />
      <AdminTextarea
        defaultValue={record?.note ?? ""}
        label="Operational note"
        name="note"
        rows={4}
      />
      <AdminCheckbox
        defaultChecked={record?.isActive ?? true}
        label="Active"
        name="isActive"
      />
      <AdminActionButton tone="sky">
        {submitLabel ?? (record ? "Save supplier" : "Create supplier")}
      </AdminActionButton>
    </form>
  );
}

export function SupplierPlatformForm({
  record,
  redirectToDetail = false,
  returnTo,
  submitLabel,
}: {
  record?: SupplierPlatformRecord | null;
  redirectToDetail?: boolean;
  returnTo: string;
  submitLabel?: string;
}) {
  return (
    <form action={saveSourcingPlatformAction} className="space-y-4">
      <input name="platformId" type="hidden" value={record?.id ?? ""} />
      <input name="redirectToDetail" type="hidden" value={redirectToDetail ? "true" : "false"} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <AdminFormGrid columns={2}>
        <AdminField
          defaultValue={record?.name ?? ""}
          label="Platform name"
          name="platformName"
          placeholder="Taobao / 1688 / Local vendor"
        />
        <AdminField
          defaultValue={record?.code ?? ""}
          label="Platform code"
          name="platformCode"
          placeholder="Generated from the name when omitted"
        />
      </AdminFormGrid>
      <AdminCheckbox
        defaultChecked={record?.isActive ?? true}
        label="Active"
        name="isActive"
      />
      <AdminActionButton tone="sky">
        {submitLabel ?? (record ? "Save platform" : "Create platform")}
      </AdminActionButton>
    </form>
  );
}

export function SupplierLinkForm({
  record,
  redirectToDetail = false,
  returnTo,
  sourceOptions,
  submitLabel,
  variantOptions,
}: {
  record?: SupplierLinkRecord | null;
  redirectToDetail?: boolean;
  returnTo: string;
  sourceOptions: SupplierOption[];
  submitLabel?: string;
  variantOptions: SupplierOption[];
}) {
  if (sourceOptions.length === 0) {
    return (
      <AdminInlineHint tone="amber">
        Create a supplier first before attaching variant purchase links.
      </AdminInlineHint>
    );
  }

  if (variantOptions.length === 0) {
    return (
      <AdminInlineHint tone="amber">
        Active product variants are required before supplier links can be created.
      </AdminInlineHint>
    );
  }

  return (
    <form action={saveVariantSourceAction} className="space-y-4">
      <input name="variantSourceId" type="hidden" value={record?.id ?? ""} />
      <input name="redirectToDetail" type="hidden" value={redirectToDetail ? "true" : "false"} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <AdminSelect
        defaultValue={record?.sourcingSourceId ?? ""}
        label="Supplier"
        name="sourcingSourceId"
        options={sourceOptions}
      />
      <AdminSelect
        defaultValue={record?.variantId ?? ""}
        label="Variant"
        name="variantId"
        options={variantOptions}
      />
      <AdminFormGrid columns={2}>
        <AdminField
          defaultValue={record?.sourceSku ?? ""}
          label="Source SKU"
          name="sourceSku"
          placeholder="Optional source SKU"
        />
        <AdminField
          defaultValue={record?.sourcePrice ?? ""}
          label="Source price"
          name="sourcePrice"
          placeholder="Optional source price"
          type="number"
        />
      </AdminFormGrid>
      <AdminField
        defaultValue={record?.sourceProductName ?? ""}
        label="Source product name"
        name="sourceProductName"
        placeholder="Optional supplier title"
      />
      <AdminField
        defaultValue={record?.sourceProductUrl ?? ""}
        label="Source product URL"
        name="sourceProductUrl"
        placeholder="https://supplier.example/item"
        type="url"
      />
      <AdminFormGrid columns={2}>
        <AdminCheckbox
          defaultChecked={record?.isPreferred ?? false}
          label="Preferred purchase link"
          name="isPreferred"
        />
        <AdminCheckbox
          defaultChecked={record?.isActive ?? true}
          label="Active"
          name="isActive"
        />
      </AdminFormGrid>
      <AdminActionButton tone="sky">
        {submitLabel ?? (record ? "Save supplier link" : "Create supplier link")}
      </AdminActionButton>
    </form>
  );
}

export function DeleteSupplierButton({
  returnTo,
  sourceId,
}: {
  returnTo: string;
  sourceId: string;
}) {
  return (
    <form action={deleteSourceAction}>
      <input name="sourceId" type="hidden" value={sourceId} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <AdminActionButton tone="rose">Delete supplier</AdminActionButton>
    </form>
  );
}

export function DeleteSupplierPlatformButton({
  platformId,
  returnTo,
}: {
  platformId: string;
  returnTo: string;
}) {
  return (
    <form action={deleteSourcingPlatformAction}>
      <input name="platformId" type="hidden" value={platformId} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <AdminActionButton tone="rose">Delete platform</AdminActionButton>
    </form>
  );
}

export function DeleteSupplierLinkButton({
  returnTo,
  variantSourceId,
}: {
  returnTo: string;
  variantSourceId: string;
}) {
  return (
    <form action={deleteVariantSourceAction}>
      <input name="variantSourceId" type="hidden" value={variantSourceId} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <AdminActionButton tone="rose">Delete supplier link</AdminActionButton>
    </form>
  );
}
