import { saveCatalogRecordAction } from "@/app/dashboard/catalog/actions";
import { saveContentRecordAction } from "@/app/dashboard/content/actions";
import { saveSettingsRecordAction } from "@/app/dashboard/settings/actions";
import { AdminCountryStateSelectFields } from "@/components/admin/admin-country-state-fields";
import {
  AdminActionButton,
  AdminCheckbox,
  AdminField,
  AdminFormGrid,
  AdminInlineHint,
  AdminSelect,
  AdminTextarea,
} from "@/components/admin/workspace";
import type { SimpleRecordWorkspace } from "@/modules/admin/admin-workspace.service";

type SimpleRecordData = NonNullable<SimpleRecordWorkspace["selectedRecord"]>;

function getStringValue(record: SimpleRecordData | null | undefined, key: string) {
  const value = record?.[key];

  if (typeof value === "string") {
    return value;
  }

  return value === null || value === undefined ? "" : String(value);
}

function getNumberValue(
  record: SimpleRecordData | null | undefined,
  key: string,
  fallback = 0,
) {
  const value = record?.[key];
  return typeof value === "number" ? value : fallback;
}

function getBooleanValue(
  record: SimpleRecordData | null | undefined,
  key: string,
  fallback = false,
) {
  const value = record?.[key];
  return typeof value === "boolean" ? value : fallback;
}

export function ProductTypeForm({
  record,
  returnTo,
  submitLabel,
}: {
  record?: SimpleRecordData | null;
  returnTo: string;
  submitLabel?: string;
}) {
  return (
    <form action={saveCatalogRecordAction} className="space-y-4">
      <input name="kind" type="hidden" value="product-types" />
      <input name="recordId" type="hidden" value={getStringValue(record, "id")} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <AdminFormGrid columns={2}>
        <AdminField
          defaultValue={getStringValue(record, "title")}
          label="Product type name"
          name="title"
          placeholder="Accessory"
        />
        <AdminField
          defaultValue={getStringValue(record, "code")}
          label="Code"
          name="code"
          placeholder="ACCESSORY"
        />
      </AdminFormGrid>
      <AdminActionButton>
        {submitLabel ?? (record ? "Save product type" : "Create product type")}
      </AdminActionButton>
    </form>
  );
}

export function ProductTagForm({
  record,
  returnTo,
  submitLabel,
}: {
  record?: SimpleRecordData | null;
  returnTo: string;
  submitLabel?: string;
}) {
  return (
    <form action={saveCatalogRecordAction} className="space-y-4">
      <input name="kind" type="hidden" value="product-tags" />
      <input name="recordId" type="hidden" value={getStringValue(record, "id")} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <AdminFormGrid columns={2}>
        <AdminField
          defaultValue={getStringValue(record, "title")}
          label="Tag name"
          name="title"
          placeholder="Trail"
        />
        <AdminField
          defaultValue={getStringValue(record, "slug")}
          label="Slug"
          name="slug"
          placeholder="trail"
        />
      </AdminFormGrid>
      <AdminActionButton>
        {submitLabel ?? (record ? "Save product tag" : "Create product tag")}
      </AdminActionButton>
    </form>
  );
}

export function ProductBadgeForm({
  record,
  returnTo,
  submitLabel,
}: {
  record?: SimpleRecordData | null;
  returnTo: string;
  submitLabel?: string;
}) {
  return (
    <form action={saveCatalogRecordAction} className="space-y-4">
      <input name="kind" type="hidden" value="product-badges" />
      <input name="recordId" type="hidden" value={getStringValue(record, "id")} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <AdminFormGrid columns={2}>
        <AdminField
          defaultValue={getStringValue(record, "title")}
          label="Badge name"
          name="title"
          placeholder="LIMITED"
        />
        <AdminField
          defaultValue={getStringValue(record, "code")}
          label="Label"
          name="label"
          placeholder="Limited"
        />
        <AdminField
          defaultValue={getStringValue(record, "colorCode")}
          label="Color code"
          name="colorCode"
          placeholder="#0f172a"
        />
      </AdminFormGrid>
      <AdminCheckbox
        defaultChecked={getBooleanValue(record, "isActive", true)}
        label="Active"
        name="isActive"
      />
      <AdminActionButton>
        {submitLabel ?? (record ? "Save product badge" : "Create product badge")}
      </AdminActionButton>
    </form>
  );
}

export function TaxClassForm({
  record,
  returnTo,
  successReturnTo,
  submitLabel,
}: {
  record?: SimpleRecordData | null;
  returnTo: string;
  successReturnTo?: string;
  submitLabel?: string;
}) {
  return (
    <form action={saveSettingsRecordAction} className="space-y-4">
      <input name="kind" type="hidden" value="tax-classes" />
      <input name="recordId" type="hidden" value={getStringValue(record, "id")} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <input name="successReturnTo" type="hidden" value={successReturnTo ?? returnTo} />
      <AdminField
        defaultValue={getStringValue(record, "title")}
        label="Tax class name"
        name="title"
        placeholder="STANDARD"
      />
      <AdminTextarea
        defaultValue={getStringValue(record, "description")}
        label="Description"
        name="description"
        rows={4}
      />
      <AdminCheckbox
        defaultChecked={getBooleanValue(record, "isActive", true)}
        label="Active"
        name="isActive"
      />
      <AdminActionButton>
        {submitLabel ?? (record ? "Save tax class" : "Create tax class")}
      </AdminActionButton>
    </form>
  );
}

export function PaymentMethodForm({
  record,
  returnTo,
  successReturnTo,
  submitLabel,
}: {
  record?: SimpleRecordData | null;
  returnTo: string;
  successReturnTo?: string;
  submitLabel?: string;
}) {
  return (
    <form action={saveSettingsRecordAction} className="space-y-4">
      <input name="kind" type="hidden" value="payment-methods" />
      <input name="recordId" type="hidden" value={getStringValue(record, "id")} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <input name="successReturnTo" type="hidden" value={successReturnTo ?? returnTo} />
      <AdminFormGrid columns={2}>
        <AdminField
          defaultValue={getStringValue(record, "title")}
          label="Method name"
          name="title"
          placeholder="Cash on Delivery"
        />
        <AdminField
          defaultValue={getStringValue(record, "code")}
          label="Code"
          name="code"
          placeholder="COD"
        />
        <AdminField
          defaultValue={getStringValue(record, "provider")}
          label="Provider"
          name="provider"
          placeholder="Manual / KBZPay / Stripe"
        />
        <AdminField
          defaultValue={getStringValue(record, "receiverName")}
          label="Receiver name"
          name="receiverName"
          placeholder="Optional receiver name"
        />
        <AdminField
          defaultValue={getStringValue(record, "receiverPhone")}
          label="Receiver phone"
          name="receiverPhone"
          placeholder="Optional receiver phone"
        />
        <AdminField
          defaultValue={getStringValue(record, "receiverAccountNo")}
          label="Receiver account no"
          name="receiverAccountNo"
          placeholder="Optional account number"
        />
      </AdminFormGrid>
      <div className="grid gap-3 md:grid-cols-2">
        <AdminCheckbox
          defaultChecked={getBooleanValue(record, "isManual", true)}
          label="Manual method"
          name="isManual"
        />
        <AdminCheckbox
          defaultChecked={getBooleanValue(record, "isActive", true)}
          label="Active"
          name="isActive"
        />
      </div>
      <AdminActionButton>
        {submitLabel ?? (record ? "Save payment method" : "Create payment method")}
      </AdminActionButton>
    </form>
  );
}

export function ShippingMethodForm({
  record,
  returnTo,
  zoneOptions,
  successReturnTo,
  submitLabel,
}: {
  record?: SimpleRecordData | null;
  returnTo: string;
  zoneOptions: Array<{ id: string; label: string }>;
  successReturnTo?: string;
  submitLabel?: string;
}) {
  return (
    <form action={saveSettingsRecordAction} className="space-y-4">
      <input name="kind" type="hidden" value="shipping-methods" />
      <input name="recordId" type="hidden" value={getStringValue(record, "id")} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <input name="successReturnTo" type="hidden" value={successReturnTo ?? returnTo} />
      <AdminFormGrid columns={2}>
        <AdminField
          defaultValue={getStringValue(record, "title")}
          label="Method name"
          name="title"
          placeholder="Standard Shipping"
        />
        <AdminField
          defaultValue={getStringValue(record, "code")}
          label="Code"
          name="code"
          placeholder="STANDARD"
        />
        <AdminSelect
          defaultValue={getStringValue(record, "shippingZoneId")}
          label="Shipping zone"
          name="shippingZoneId"
          options={zoneOptions}
        />
        <AdminField
          defaultValue={getNumberValue(record, "baseFee", 0)}
          label="Base fee"
          name="baseFee"
          type="number"
        />
        <AdminField
          defaultValue={getStringValue(record, "freeShippingMinAmount")}
          label="Free shipping min"
          name="freeShippingMinAmount"
          type="number"
        />
        <AdminField
          defaultValue={getStringValue(record, "estimatedMinDays")}
          label="Estimated min days"
          name="estimatedMinDays"
          type="number"
        />
        <AdminField
          defaultValue={getStringValue(record, "estimatedMaxDays")}
          label="Estimated max days"
          name="estimatedMaxDays"
          type="number"
        />
      </AdminFormGrid>
      <AdminTextarea
        defaultValue={getStringValue(record, "description")}
        label="Description"
        name="description"
        rows={4}
      />
      <AdminCheckbox
        defaultChecked={getBooleanValue(record, "isActive", true)}
        label="Active"
        name="isActive"
      />
      <AdminActionButton>
        {submitLabel ?? (record ? "Save delivery method" : "Create delivery method")}
      </AdminActionButton>
    </form>
  );
}

export function CountryRecordForm({
  record,
  returnTo,
  successReturnTo,
  submitLabel,
}: {
  record?: SimpleRecordData | null;
  returnTo: string;
  successReturnTo?: string;
  submitLabel?: string;
}) {
  return (
    <form action={saveSettingsRecordAction} className="space-y-4">
      <input name="kind" type="hidden" value="countries" />
      <input name="recordId" type="hidden" value={getStringValue(record, "id")} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <input name="successReturnTo" type="hidden" value={successReturnTo ?? returnTo} />
      <AdminFormGrid columns={2}>
        <AdminField
          defaultValue={getStringValue(record, "title")}
          label="Country name"
          name="title"
          placeholder="Myanmar"
        />
        <AdminField
          defaultValue={getStringValue(record, "code")}
          label="ISO code"
          name="isoCode"
          placeholder="MM"
        />
        <AdminField
          defaultValue={getStringValue(record, "phoneCode")}
          label="Phone code"
          name="phoneCode"
          placeholder="+95"
        />
      </AdminFormGrid>
      <AdminActionButton>
        {submitLabel ?? (record ? "Save country" : "Create country")}
      </AdminActionButton>
    </form>
  );
}

export function ShippingZoneForm({
  record,
  returnTo,
  countryOptions,
  successReturnTo,
  submitLabel,
}: {
  record?: SimpleRecordData | null;
  returnTo: string;
  countryOptions: Array<{ id: string; label: string }>;
  successReturnTo?: string;
  submitLabel?: string;
}) {
  const selectedCountryIds = new Set(
    Array.isArray(record?.countryIds)
      ? record.countryIds.map((value) => String(value))
      : [],
  );

  return (
    <form action={saveSettingsRecordAction} className="space-y-4">
      <input name="kind" type="hidden" value="shipping-zones" />
      <input name="recordId" type="hidden" value={getStringValue(record, "id")} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <input name="successReturnTo" type="hidden" value={successReturnTo ?? returnTo} />
      <AdminField
        defaultValue={getStringValue(record, "title")}
        label="Zone name"
        name="title"
        placeholder="Myanmar Mainland"
      />
      <AdminTextarea
        defaultValue={getStringValue(record, "description")}
        label="Description"
        name="description"
        rows={4}
      />
      <div className="space-y-3 rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-4">
        <p className="text-sm font-semibold text-slate-900">Covered countries</p>
        {countryOptions.length > 0 ? (
          <div className="grid gap-2 md:grid-cols-2">
            {countryOptions.map((country) => (
              <label className="flex items-center gap-2 text-sm text-slate-700" key={country.id}>
                <input
                  defaultChecked={selectedCountryIds.has(country.id)}
                  name="countryIds"
                  type="checkbox"
                  value={country.id}
                />
                {country.label}
              </label>
            ))}
          </div>
        ) : (
          <AdminInlineHint tone="amber">
            Add countries first before attaching them to a shipping zone.
          </AdminInlineHint>
        )}
      </div>
      <AdminCheckbox
        defaultChecked={getBooleanValue(record, "isActive", true)}
        label="Active"
        name="isActive"
      />
      <AdminActionButton>
        {submitLabel ?? (record ? "Save shipping zone" : "Create shipping zone")}
      </AdminActionButton>
    </form>
  );
}

export function ShippingRateRuleForm({
  record,
  returnTo,
  methodOptions,
  successReturnTo,
  submitLabel,
}: {
  record?: SimpleRecordData | null;
  returnTo: string;
  methodOptions: Array<{ id: string; label: string }>;
  successReturnTo?: string;
  submitLabel?: string;
}) {
  return (
    <form action={saveSettingsRecordAction} className="space-y-4">
      <input name="kind" type="hidden" value="shipping-rate-rules" />
      <input name="recordId" type="hidden" value={getStringValue(record, "id")} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <input name="successReturnTo" type="hidden" value={successReturnTo ?? returnTo} />
      <AdminFormGrid columns={2}>
        <AdminSelect
          defaultValue={getStringValue(record, "shippingMethodId")}
          label="Delivery method"
          name="shippingMethodId"
          options={methodOptions}
        />
        <AdminField
          defaultValue={getStringValue(record, "fee")}
          label="Fee"
          name="fee"
          placeholder="3000"
          type="number"
        />
        <AdminField
          defaultValue={getStringValue(record, "minWeightGrams")}
          label="Min weight (g)"
          name="minWeightGrams"
          placeholder="0"
          type="number"
        />
        <AdminField
          defaultValue={getStringValue(record, "maxWeightGrams")}
          label="Max weight (g)"
          name="maxWeightGrams"
          placeholder="5000"
          type="number"
        />
        <AdminField
          defaultValue={getStringValue(record, "minOrderAmount")}
          label="Min order amount"
          name="minOrderAmount"
          placeholder="0"
          type="number"
        />
        <AdminField
          defaultValue={getStringValue(record, "maxOrderAmount")}
          label="Max order amount"
          name="maxOrderAmount"
          placeholder="100000"
          type="number"
        />
      </AdminFormGrid>
      <AdminCheckbox
        defaultChecked={getBooleanValue(record, "isActive", true)}
        label="Active"
        name="isActive"
      />
      <AdminActionButton>
        {submitLabel ?? (record ? "Save shipping rate rule" : "Create shipping rate rule")}
      </AdminActionButton>
    </form>
  );
}

export function StateRegionRecordForm({
  record,
  returnTo,
  countryOptions,
  successReturnTo,
  submitLabel,
}: {
  record?: SimpleRecordData | null;
  returnTo: string;
  countryOptions: Array<{ id: string; label: string }>;
  successReturnTo?: string;
  submitLabel?: string;
}) {
  const countryLabel =
    countryOptions.length > 0 ? "Select country" : "No countries configured";

  return (
    <form action={saveSettingsRecordAction} className="space-y-4">
      <input name="kind" type="hidden" value="states-regions" />
      <input name="recordId" type="hidden" value={getStringValue(record, "id")} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <input name="successReturnTo" type="hidden" value={successReturnTo ?? returnTo} />
      <AdminFormGrid columns={2}>
        <AdminSelect
          defaultValue={getStringValue(record, "countryId")}
          label="Country"
          name="countryId"
          options={[{ value: "", label: countryLabel }, ...countryOptions]}
        />
        <AdminField
          defaultValue={getStringValue(record, "title")}
          label="State / region name"
          name="title"
          placeholder="Yangon Region"
        />
        <AdminField
          defaultValue={getStringValue(record, "code")}
          label="Code"
          name="code"
          placeholder="YGN"
        />
      </AdminFormGrid>
      <AdminActionButton>
        {submitLabel ?? (record ? "Save state / region" : "Create state / region")}
      </AdminActionButton>
    </form>
  );
}

export function TaxRateForm({
  record,
  returnTo,
  taxClassOptions,
  countryOptions,
  stateOptions,
  successReturnTo,
  submitLabel,
}: {
  record?: SimpleRecordData | null;
  returnTo: string;
  taxClassOptions: Array<{ id: string; label: string }>;
  countryOptions: Array<{ id: string; label: string }>;
  stateOptions: Array<{ id: string; label: string; countryId?: string }>;
  successReturnTo?: string;
  submitLabel?: string;
}) {
  return (
    <form action={saveSettingsRecordAction} className="space-y-4">
      <input name="kind" type="hidden" value="tax-rates" />
      <input name="recordId" type="hidden" value={getStringValue(record, "id")} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <input name="successReturnTo" type="hidden" value={successReturnTo ?? returnTo} />
      <AdminFormGrid columns={2}>
        <AdminField
          defaultValue={getStringValue(record, "title")}
          label="Rate name"
          name="title"
          placeholder="Myanmar standard"
        />
        <AdminSelect
          defaultValue={getStringValue(record, "taxClassId")}
          label="Tax class"
          name="taxClassId"
          options={taxClassOptions}
        />
        <AdminCountryStateSelectFields
          anyCountryLabel="Any country"
          anyStateLabel="Any state / region"
          countryOptions={countryOptions}
          defaultCountryId={getStringValue(record, "countryId")}
          defaultStateId={getStringValue(record, "stateRegionId")}
          stateOptions={stateOptions}
        />
        <AdminField
          defaultValue={getNumberValue(record, "ratePercent", 0)}
          label="Rate percent"
          name="ratePercent"
          type="number"
        />
        <AdminField
          defaultValue={getNumberValue(record, "priority", 1)}
          label="Priority"
          name="priority"
          type="number"
        />
        <AdminField
          defaultValue={getStringValue(record, "startsAt")}
          label="Starts at"
          name="startsAt"
          type="date"
        />
        <AdminField
          defaultValue={getStringValue(record, "endsAt")}
          label="Ends at"
          name="endsAt"
          type="date"
        />
      </AdminFormGrid>
      <AdminCheckbox
        defaultChecked={getBooleanValue(record, "isActive", true)}
        label="Active"
        name="isActive"
      />
      <AdminActionButton>
        {submitLabel ?? (record ? "Save tax rate" : "Create tax rate")}
      </AdminActionButton>
    </form>
  );
}

export function PageRecordForm({
  record,
  returnTo,
  submitLabel,
}: {
  record?: SimpleRecordData | null;
  returnTo: string;
  submitLabel?: string;
}) {
  return (
    <form action={saveContentRecordAction} className="space-y-4">
      <input name="kind" type="hidden" value="pages" />
      <input name="recordId" type="hidden" value={getStringValue(record, "id")} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <AdminFormGrid columns={2}>
        <AdminField
          defaultValue={getStringValue(record, "title")}
          label="Page title"
          name="title"
          placeholder="About Omni"
        />
        <AdminField
          defaultValue={getStringValue(record, "slug")}
          label="Slug"
          name="slug"
          placeholder="about-omni"
        />
      </AdminFormGrid>
      <AdminTextarea
        defaultValue={getStringValue(record, "content")}
        label="Content"
        name="content"
        rows={10}
      />
      <AdminFormGrid columns={2}>
        <AdminField
          defaultValue={getStringValue(record, "seoTitle")}
          label="SEO title"
          name="seoTitle"
        />
        <AdminField
          defaultValue={getStringValue(record, "seoDescription")}
          label="SEO description"
          name="seoDescription"
        />
      </AdminFormGrid>
      <AdminSelect
        defaultValue={getStringValue(record, "status") || "DRAFT"}
        label="Status"
        name="status"
        options={[
          { value: "DRAFT", label: "DRAFT" },
          { value: "PUBLISHED", label: "PUBLISHED" },
          { value: "ARCHIVED", label: "ARCHIVED" },
        ]}
      />
      <AdminActionButton>
        {submitLabel ?? (record ? "Save page" : "Create page")}
      </AdminActionButton>
    </form>
  );
}

export function BannerRecordForm({
  record,
  returnTo,
  submitLabel,
}: {
  record?: SimpleRecordData | null;
  returnTo: string;
  submitLabel?: string;
}) {
  return (
    <form action={saveContentRecordAction} className="space-y-4">
      <input name="kind" type="hidden" value="banners" />
      <input name="recordId" type="hidden" value={getStringValue(record, "id")} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <AdminFormGrid columns={2}>
        <AdminField
          defaultValue={getStringValue(record, "title")}
          label="Banner name"
          name="title"
          placeholder="Homepage hero"
        />
        <AdminSelect
          defaultValue={getStringValue(record, "bannerType") || "HERO"}
          label="Banner type"
          name="bannerType"
          options={[
            { value: "HERO", label: "HERO" },
            { value: "PROMO", label: "PROMO" },
            { value: "CATEGORY", label: "CATEGORY" },
          ]}
        />
        <AdminField
          defaultValue={getStringValue(record, "linkUrl")}
          label="Link URL"
          name="linkUrl"
          placeholder="/shop"
        />
        <AdminField
          defaultValue={getStringValue(record, "bannerTitle")}
          label="Headline"
          name="bannerTitle"
          placeholder="New arrivals"
        />
        <AdminField
          defaultValue={getStringValue(record, "subtitle")}
          label="Subtitle"
          name="subtitle"
          placeholder="Seasonal promo copy"
        />
        <AdminField
          defaultValue={getStringValue(record, "startsAt")}
          label="Starts at"
          name="startsAt"
          type="date"
        />
        <AdminField
          defaultValue={getStringValue(record, "endsAt")}
          label="Ends at"
          name="endsAt"
          type="date"
        />
        <AdminField
          defaultValue={getNumberValue(record, "sortOrder", 0)}
          label="Sort order"
          name="sortOrder"
          type="number"
        />
      </AdminFormGrid>
      <input name="assetId" type="hidden" value={getStringValue(record, "assetId")} />
      <label className="grid min-w-0 gap-2">
        <span className="text-sm font-semibold text-slate-700">Banner asset</span>
        <input
          accept="image/*"
          className="block w-full min-w-0 rounded-[0.95rem] border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-slate-950 outline-none"
          name="imageFile"
          type="file"
        />
      </label>
      <AdminInlineHint tone="sky">
        Upload an image to attach or replace the banner asset. Existing assets stay attached when no new file is uploaded.
      </AdminInlineHint>
      <AdminCheckbox
        defaultChecked={getBooleanValue(record, "isActive", true)}
        label="Active"
        name="isActive"
      />
      <AdminActionButton>
        {submitLabel ?? (record ? "Save banner" : "Create banner")}
      </AdminActionButton>
    </form>
  );
}

export function NavigationMenuForm({
  record,
  returnTo,
  submitLabel,
}: {
  record?: SimpleRecordData | null;
  returnTo: string;
  submitLabel?: string;
}) {
  return (
    <form action={saveContentRecordAction} className="space-y-4">
      <input name="kind" type="hidden" value="navigation-menus" />
      <input name="recordId" type="hidden" value={getStringValue(record, "id")} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <AdminField
        defaultValue={getStringValue(record, "title")}
        label="Menu name"
        name="title"
        placeholder="HEADER"
      />
      <AdminCheckbox
        defaultChecked={getBooleanValue(record, "isActive", true)}
        label="Active"
        name="isActive"
      />
      <AdminActionButton>
        {submitLabel ?? (record ? "Save menu" : "Create menu")}
      </AdminActionButton>
    </form>
  );
}
