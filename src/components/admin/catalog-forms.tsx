import {
  saveCatalogRecordAction,
  saveCategoryCommerceConfigAction,
  saveOptionTypeAction,
  saveProductAction,
  savePromotionAction,
} from "@/app/dashboard/catalog/actions";
import {
  AdminActionButton,
  AdminCheckbox,
  AdminField,
  AdminFormGrid,
  AdminInlineHint,
  AdminSectionHeader,
  AdminSelect,
  AdminTextarea,
} from "@/components/admin/workspace";
import type {
  OptionTypesWorkspace,
  ProductsWorkspace,
  SimpleRecordWorkspace,
} from "@/modules/admin/admin-workspace.service";

type SimpleRecordData = NonNullable<SimpleRecordWorkspace["selectedRecord"]>;

function getStringValue(record: SimpleRecordData | null | undefined, key: string) {
  const value = record?.[key];
  return typeof value === "string"
    ? value
    : value === null || value === undefined
      ? ""
      : String(value);
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

function toDateInputValue(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : "";
}

export function CategoryRecordForm({
  record,
  categoryOptions = [],
  returnTo,
  submitLabel,
}: {
  record?: SimpleRecordData | null;
  categoryOptions?: Array<{ id: string; label: string }>;
  returnTo: string;
  submitLabel?: string;
}) {
  const parentOptions = categoryOptions.filter(
    (option) => option.id !== getStringValue(record, "id"),
  );

  return (
    <form action={saveCatalogRecordAction} className="space-y-4">
      <input name="kind" type="hidden" value="categories" />
      <input name="recordId" type="hidden" value={getStringValue(record, "id")} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <AdminFormGrid columns={2}>
        <AdminField
          defaultValue={getStringValue(record, "title")}
          label="Category name"
          name="title"
          placeholder="Footwear"
        />
        <AdminField
          defaultValue={getStringValue(record, "slug")}
          label="Slug"
          name="slug"
          placeholder="footwear"
        />
        <AdminSelect
          defaultValue={getStringValue(record, "parentCategoryId")}
          label="Parent category"
          name="parentCategoryId"
          options={[
            {
              value: "",
              label:
                parentOptions.length > 0 ? "No parent category" : "No other categories available",
            },
            ...parentOptions.map((option) => ({
              value: option.id,
              label: option.label,
            })),
          ]}
        />
        <AdminField
          defaultValue={getNumberValue(record, "sortOrder", 0)}
          label="Sort order"
          name="sortOrder"
          type="number"
        />
      </AdminFormGrid>
      {record ? (
        <AdminFormGrid columns={2}>
          <AdminField
            defaultValue={getStringValue(record, "fullSlugPath")}
            disabled
            label="Full slug path"
            name="fullSlugPathPreview"
          />
          <AdminField
            defaultValue={getNumberValue(record, "depth", 0)}
            disabled
            label="Tree depth"
            name="depthPreview"
            type="number"
          />
        </AdminFormGrid>
      ) : null}
      <AdminTextarea
        defaultValue={getStringValue(record, "description")}
        label="Description"
        name="description"
        rows={4}
      />
      <AdminFormGrid columns={2}>
        <AdminField
          defaultValue={getStringValue(record, "seoTitle")}
          label="SEO title"
          name="seoTitle"
          placeholder="Category SEO title"
        />
        <AdminField
          defaultValue={getStringValue(record, "seoDescription")}
          label="SEO description"
          name="seoDescription"
          placeholder="Category SEO description"
        />
      </AdminFormGrid>
      <AdminCheckbox
        defaultChecked={getBooleanValue(record, "isActive", true)}
        label="Active"
        name="isActive"
      />
      <AdminActionButton>
        {submitLabel ?? (record ? "Save category" : "Create category")}
      </AdminActionButton>
    </form>
  );
}

export function BrandRecordForm({
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
    countryOptions.length > 0 ? "No origin country" : "No countries configured";

  return (
    <form action={saveCatalogRecordAction} className="space-y-4">
      <input name="kind" type="hidden" value="brands" />
      <input name="recordId" type="hidden" value={getStringValue(record, "id")} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <input name="successReturnTo" type="hidden" value={successReturnTo ?? returnTo} />
      <AdminFormGrid columns={2}>
        <AdminField
          defaultValue={getStringValue(record, "title")}
          label="Brand name"
          name="title"
          placeholder="Omni Sport"
        />
        <AdminField
          defaultValue={getStringValue(record, "slug")}
          label="Slug"
          name="slug"
          placeholder="omni-sport"
        />
      </AdminFormGrid>
      <AdminSelect
        defaultValue={getStringValue(record, "originCountryId")}
        label="Origin country"
        name="originCountryId"
        options={[{ value: "", label: countryLabel }, ...countryOptions]}
      />
      <AdminTextarea
        defaultValue={getStringValue(record, "description")}
        label="Description"
        name="description"
        rows={4}
      />
      <AdminField
        defaultValue={getStringValue(record, "websiteUrl")}
        label="Website URL"
        name="websiteUrl"
        placeholder="https://brand.example"
        type="url"
      />
      <AdminCheckbox
        defaultChecked={getBooleanValue(record, "isActive", true)}
        label="Active"
        name="isActive"
      />
      <AdminActionButton>
        {submitLabel ?? (record ? "Save brand" : "Create brand")}
      </AdminActionButton>
    </form>
  );
}

export function CollectionRecordForm({
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
      <input name="kind" type="hidden" value="collections" />
      <input name="recordId" type="hidden" value={getStringValue(record, "id")} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <AdminFormGrid columns={2}>
        <AdminField
          defaultValue={getStringValue(record, "title")}
          label="Collection name"
          name="title"
          placeholder="Spring drop"
        />
        <AdminField
          defaultValue={getStringValue(record, "slug")}
          label="Slug"
          name="slug"
          placeholder="spring-drop"
        />
      </AdminFormGrid>
      <AdminTextarea
        defaultValue={getStringValue(record, "description")}
        label="Description"
        name="description"
        rows={4}
      />
      <AdminField
        defaultValue={getNumberValue(record, "sortOrder", 0)}
        label="Sort order"
        name="sortOrder"
        type="number"
      />
      <AdminCheckbox
        defaultChecked={getBooleanValue(record, "isActive", true)}
        label="Active"
        name="isActive"
      />
      <AdminActionButton>
        {submitLabel ?? (record ? "Save collection" : "Create collection")}
      </AdminActionButton>
    </form>
  );
}

export function OptionTypeForm({
  optionType,
  returnTo,
  submitLabel,
}: {
  optionType?: OptionTypesWorkspace["selectedOptionType"];
  returnTo: string;
  submitLabel?: string;
}) {
  return (
    <form action={saveOptionTypeAction} className="space-y-4">
      <input name="optionTypeId" type="hidden" value={optionType?.id ?? ""} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <AdminField
        defaultValue={optionType?.optionName ?? ""}
        label="Option name"
        name="optionName"
        placeholder="SIZE"
      />
      <AdminSelect
        defaultValue={optionType?.displayType ?? "TEXT"}
        label="Display type"
        name="displayType"
        options={[
          { value: "TEXT", label: "TEXT" },
          { value: "COLOR_SWATCH", label: "COLOR_SWATCH" },
          { value: "BUTTON", label: "BUTTON" },
        ]}
      />
      <AdminActionButton>
        {submitLabel ?? (optionType ? "Save option type" : "Create option type")}
      </AdminActionButton>
    </form>
  );
}

export function ProductQuickCreateForm({
  workspace,
}: {
  workspace: Pick<ProductsWorkspace, "productTypes" | "categories" | "brands">;
}) {
  const hasRequiredOptions =
    workspace.productTypes.length > 0 && workspace.categories.length > 0;

  if (!hasRequiredOptions) {
    return (
      <AdminInlineHint tone="amber">
        Product types and categories must exist before a draft product can be created.
      </AdminInlineHint>
    );
  }

  return (
    <form action={saveProductAction} className="space-y-4">
      <input name="returnTo" type="hidden" value="/dashboard/catalog/products" />
      <AdminFormGrid columns={2}>
        <AdminField label="Product name" name="productName" placeholder="Omni Runner One" />
        <AdminField label="Slug" name="slug" placeholder="Optional generated from the name" />
        <AdminSelect
          label="Product type"
          name="productTypeId"
          options={workspace.productTypes}
        />
        <AdminSelect
          label="Category"
          name="categoryId"
          options={workspace.categories}
        />
        <AdminSelect
          label="Brand"
          name="brandId"
          options={[{ value: "", label: "No brand" }, ...workspace.brands]}
        />
        <AdminSelect
          defaultValue="DRAFT"
          label="Status"
          name="status"
          options={[
            { value: "DRAFT", label: "DRAFT" },
            { value: "ACTIVE", label: "ACTIVE" },
          ]}
        />
      </AdminFormGrid>
      <AdminInlineHint tone="sky">
        Quick create makes the draft and sends you to the full editor for variants, collections, images, and supplier links.
      </AdminInlineHint>
      <AdminActionButton>Create draft product</AdminActionButton>
    </form>
  );
}

export function CategoryCommerceConfigForm({
  categoryId,
  returnTo,
  specDefinitionsText,
  categoryOptionTypesText,
  categoryFiltersText,
}: {
  categoryId: string;
  returnTo: string;
  specDefinitionsText: string;
  categoryOptionTypesText: string;
  categoryFiltersText: string;
}) {
  return (
    <form action={saveCategoryCommerceConfigAction} className="space-y-4">
      <input name="categoryId" type="hidden" value={categoryId} />
      <input name="returnTo" type="hidden" value={returnTo} />

      <AdminInlineHint tone="sky">
        Specs format: <code>SPEC_KEY|Label|TEXT|CHECKBOX|required|filterable|0|unit</code>
      </AdminInlineHint>
      <AdminTextarea
        defaultValue={specDefinitionsText}
        label="Specification definitions"
        name="specDefinitionsText"
        rows={6}
      />

      <AdminInlineHint tone="sky">
        Option map format: <code>OPTION_TYPE|required|0</code>
      </AdminInlineHint>
      <AdminTextarea
        defaultValue={categoryOptionTypesText}
        label="Category option types"
        name="categoryOptionTypesText"
        rows={4}
      />

      <AdminInlineHint tone="sky">
        Filter format: <code>filterKey|Label|BRAND or PRICE or OPTION_TYPE or SPECIFICATION|sourceKey|CHECKBOX|0|inherit|active</code>
      </AdminInlineHint>
      <AdminTextarea
        defaultValue={categoryFiltersText}
        label="Category listing filters"
        name="categoryFiltersText"
        rows={6}
      />

      <AdminActionButton>Save category commerce config</AdminActionButton>
    </form>
  );
}

export function PromotionQuickCreateForm({
  returnTo,
}: {
  returnTo: string;
}) {
  return (
    <form action={savePromotionAction} className="space-y-4">
      <input name="returnTo" type="hidden" value={returnTo} />
      <AdminFormGrid columns={2}>
        <AdminField label="Promotion name" name="name" placeholder="Summer launch" />
        <AdminField
          label="Coupon code"
          name="code"
          placeholder="Optional for automatic promotions"
        />
        <AdminSelect
          defaultValue="COUPON"
          label="Promotion type"
          name="promotionType"
          options={[
            { value: "COUPON", label: "COUPON" },
            { value: "FLASH_SALE", label: "FLASH_SALE" },
            { value: "AUTO_DISCOUNT", label: "AUTO_DISCOUNT" },
            { value: "FREE_SHIPPING", label: "FREE_SHIPPING" },
          ]}
        />
        <AdminSelect
          defaultValue="PERCENT"
          label="Discount type"
          name="discountType"
          options={[
            { value: "PERCENT", label: "PERCENT" },
            { value: "AMOUNT", label: "AMOUNT" },
          ]}
        />
        <AdminField
          label="Discount value"
          name="discountValue"
          placeholder="10 or 5000"
          type="number"
        />
        <AdminField
          label="Minimum order amount"
          name="minOrderAmount"
          placeholder="Optional"
          type="number"
        />
      </AdminFormGrid>
      <AdminCheckbox defaultChecked label="Active" name="isActive" />
      <AdminInlineHint tone="sky">
        Quick create only captures the base discount. Use the full create page for targeting, schedule, and limits.
      </AdminInlineHint>
      <AdminActionButton>Create promotion</AdminActionButton>
    </form>
  );
}

export function PromotionForm({
  promotion,
  returnTo,
  submitLabel,
  redirectToDetail = false,
}: {
  promotion?: {
    id: string;
    code: string | null;
    name: string;
    description: string | null;
    promotionType: string;
    discountType: string | null;
    discountValue: number | null;
    minOrderAmount: number | null;
    maxDiscountAmount: number | null;
    usageLimit: number | null;
    perCustomerLimit: number | null;
    startsAt: Date | null;
    endsAt: Date | null;
    heroAssetId: string | null;
    isActive: boolean;
  } | null;
  returnTo: string;
  submitLabel?: string;
  redirectToDetail?: boolean;
}) {
  return (
    <form action={savePromotionAction} className="space-y-6">
      <input name="promotionId" type="hidden" value={promotion?.id ?? ""} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <input
        name="redirectToDetail"
        type="hidden"
        value={redirectToDetail ? "true" : "false"}
      />

      <section className="space-y-4">
        <AdminSectionHeader
          title="Basic info"
          description="Promotion records control discount rules, coupon settings, scheduling, and campaign state."
        />
        <div className="grid gap-3 md:grid-cols-2">
          <AdminField
            defaultValue={promotion?.name ?? ""}
            label="Promotion name"
            name="name"
            placeholder="Summer launch"
          />
          <AdminField
            defaultValue={promotion?.code ?? ""}
            label="Coupon code"
            name="code"
            placeholder="Optional for automatic promotions"
          />
          <AdminSelect
            defaultValue={promotion?.promotionType ?? "COUPON"}
            label="Promotion type"
            name="promotionType"
            options={[
              { value: "COUPON", label: "COUPON" },
              { value: "FLASH_SALE", label: "FLASH_SALE" },
              { value: "AUTO_DISCOUNT", label: "AUTO_DISCOUNT" },
              { value: "FREE_SHIPPING", label: "FREE_SHIPPING" },
            ]}
          />
          <AdminField
            defaultValue={promotion?.heroAssetId ?? ""}
            label="Hero asset id"
            name="heroAssetId"
            placeholder="Optional media asset id"
          />
        </div>
        <AdminTextarea
          defaultValue={promotion?.description ?? ""}
          label="Description"
          name="description"
          rows={4}
        />
      </section>

      <section className="space-y-4">
        <AdminSectionHeader title="Discount rules" />
        <div className="grid gap-3 md:grid-cols-2">
          <AdminSelect
            defaultValue={promotion?.discountType ?? "PERCENT"}
            label="Discount type"
            name="discountType"
            options={[
              { value: "PERCENT", label: "PERCENT" },
              { value: "AMOUNT", label: "AMOUNT" },
            ]}
          />
          <AdminField
            defaultValue={promotion?.discountValue ?? ""}
            label="Discount value"
            name="discountValue"
            placeholder="10 or 5000"
            type="number"
          />
          <AdminField
            defaultValue={promotion?.minOrderAmount ?? ""}
            label="Minimum order amount"
            name="minOrderAmount"
            type="number"
          />
          <AdminField
            defaultValue={promotion?.maxDiscountAmount ?? ""}
            label="Maximum discount amount"
            name="maxDiscountAmount"
            type="number"
          />
          <AdminField
            defaultValue={promotion?.usageLimit ?? ""}
            label="Usage limit"
            name="usageLimit"
            type="number"
          />
          <AdminField
            defaultValue={promotion?.perCustomerLimit ?? ""}
            label="Per customer limit"
            name="perCustomerLimit"
            type="number"
          />
        </div>
      </section>

      <section className="space-y-4">
        <AdminSectionHeader title="Availability" />
        <div className="grid gap-3 md:grid-cols-2">
          <AdminField
            defaultValue={toDateInputValue(promotion?.startsAt)}
            label="Starts at"
            name="startsAt"
            type="date"
          />
          <AdminField
            defaultValue={toDateInputValue(promotion?.endsAt)}
            label="Ends at"
            name="endsAt"
            type="date"
          />
        </div>
        <AdminCheckbox
          defaultChecked={promotion?.isActive ?? true}
          label="Active"
          name="isActive"
        />
      </section>

      <AdminActionButton>
        {submitLabel ?? (promotion ? "Save promotion" : "Create promotion")}
      </AdminActionButton>
    </form>
  );
}
