"use client";

import { startTransition, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  DashboardPanel,
  DashboardSectionHeading,
  DashboardStatusPill,
} from "@/components/dashboard/primitives";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";

type SelectOption = {
  id: string;
  label: string;
};

type CatalogProduct = {
  id: string;
  productName: string;
  slug: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  visibility: "PUBLIC" | "HIDDEN";
  createdAt: string;
  variants: Array<{
    id: string;
    variantName: string | null;
    sku: string;
    unitPrice: number;
    currencyCode: string;
    availableQty: number;
    isDefault: boolean;
  }>;
};

type CatalogWorkspaceProps = {
  canManage: boolean;
  categories: SelectOption[];
  productTypes: SelectOption[];
  taxClasses: SelectOption[];
  products: CatalogProduct[];
  currencyCode: string;
};

type VariantDraftMap = Record<
  string,
  {
    variantName: string;
    sku: string;
    unitPrice: string;
    stockQty: string;
    isDefault: boolean;
  }
>;

function createVariantDrafts(products: CatalogProduct[]): VariantDraftMap {
  return Object.fromEntries(
    products.map((product) => [
      product.id,
      {
        variantName: "",
        sku: "",
        unitPrice: "",
        stockQty: "0",
        isDefault: product.variants.length === 0,
      },
    ]),
  );
}

export function CatalogWorkspace({
  canManage,
  categories,
  productTypes,
  taxClasses,
  products,
  currencyCode,
}: CatalogWorkspaceProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [variantDrafts, setVariantDrafts] = useState<VariantDraftMap>(() =>
    createVariantDrafts(products),
  );

  const defaultCategoryId = categories[0]?.id ?? "";
  const defaultProductTypeId = productTypes[0]?.id ?? "";
  const defaultTaxClassId = taxClasses[0]?.id ?? "";

  const productCards = useMemo(
    () =>
      products.map((product) => ({
        ...product,
        defaultVariant:
          product.variants.find((variant) => variant.isDefault) ?? product.variants[0] ?? null,
      })),
    [products],
  );

  async function submitJson(
    actionKey: string,
    url: string,
    payload?: Record<string, unknown>,
    method = "POST",
  ) {
    if (!canManage) {
      return;
    }

    setPendingAction(actionKey);
    setMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch(url, {
        method,
        headers: payload ? { "Content-Type": "application/json" } : undefined,
        body: payload ? JSON.stringify(payload) : undefined,
      });
      const body = (await response.json().catch(() => null)) as
        | {
            message?: string;
            product?: { productName?: string };
            category?: { categoryName?: string };
          }
        | null;

      if (!response.ok) {
        throw new Error(body?.message ?? "Request failed.");
      }

      if (body?.product?.productName) {
        setMessage(`${body.product.productName} saved successfully.`);
      } else if (body?.category?.categoryName) {
        setMessage(`${body.category.categoryName} created successfully.`);
      } else {
        setMessage("Saved successfully.");
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Request failed.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <DashboardPanel>
          <DashboardSectionHeading
            description="Creates the baseline country, category, product type, tax class, and COD payment method used by the rest of the flows."
            eyebrow="Bootstrap"
            title="Ensure the base commerce records exist"
          />
          <button
            className="mt-6 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canManage || pendingAction === "bootstrap"}
            onClick={() => void submitJson("bootstrap", "/api/admin/catalog/bootstrap")}
            type="button"
          >
            {pendingAction === "bootstrap" ? "Syncing..." : "Run setup bootstrap"}
          </button>
          {!canManage ? (
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Your role can view the catalog surface but cannot write catalog data.
            </p>
          ) : null}
        </DashboardPanel>

        <DashboardPanel>
          <DashboardSectionHeading
            description="Add new categories directly from the catalog dashboard so products do not have to fall back to the default bucket forever."
            eyebrow="Categories"
            title="Create product structure"
          />
          <form
            className="mt-6 grid gap-4 md:grid-cols-[1fr_1.2fr_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const categoryName = String(formData.get("categoryName") ?? "").trim();
              const description = String(formData.get("description") ?? "").trim();

              if (!categoryName) {
                setErrorMessage("Category name is required.");
                return;
              }

              void submitJson("category", "/api/admin/catalog/categories", {
                categoryName,
                description: description || undefined,
              });
              event.currentTarget.reset();
            }}
          >
            <Field label="Category name" name="categoryName" placeholder="Footwear" />
            <Field
              label="Description"
              name="description"
              placeholder="Short internal or merchandising note"
            />
            <button
              className="mt-auto rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 ring-1 ring-stone-200 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canManage || pendingAction === "category"}
              type="submit"
            >
              {pendingAction === "category" ? "Creating..." : "Create category"}
            </button>
          </form>
        </DashboardPanel>
      </div>

      <DashboardPanel>
        <DashboardSectionHeading
          description="Creates a product plus its first variant so it can immediately appear on the public shop and be ordered."
          eyebrow="Quick create"
          title="Launch a sellable product"
        />
        <form
          className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const productName = String(formData.get("productName") ?? "").trim();
            const shortDescription = String(formData.get("shortDescription") ?? "").trim();
            const description = String(formData.get("description") ?? "").trim();
            const unitPrice = Number(formData.get("unitPrice") ?? 0);
            const stockQty = Number(formData.get("stockQty") ?? 0);
            const sku = String(formData.get("sku") ?? "").trim();
            const variantName = String(formData.get("variantName") ?? "").trim();

            if (!productName) {
              setErrorMessage("Product name is required.");
              return;
            }

            void submitJson("product", "/api/admin/catalog/products/quick-create", {
              productName,
              shortDescription: shortDescription || undefined,
              description: description || undefined,
              categoryId: String(formData.get("categoryId") ?? defaultCategoryId),
              productTypeId: String(formData.get("productTypeId") ?? defaultProductTypeId),
              taxClassId: String(formData.get("taxClassId") ?? defaultTaxClassId),
              unitPrice,
              stockQty,
              sku: sku || undefined,
              variantName: variantName || undefined,
              status: String(formData.get("status") ?? "ACTIVE"),
              visibility: String(formData.get("visibility") ?? "PUBLIC"),
              isFeatured: formData.get("isFeatured") === "on",
              isNewArrival: formData.get("isNewArrival") === "on",
            });
            event.currentTarget.reset();
          }}
        >
          <Field label="Product name" name="productName" placeholder="Omni Runner One" />
          <Field
            label="Short description"
            name="shortDescription"
            placeholder="Compact front-of-card copy"
          />
          <Field
            label="Full description"
            name="description"
            placeholder="Optional detail for the product page"
          />
          <SelectField
            defaultValue={defaultCategoryId}
            label="Category"
            name="categoryId"
            options={categories}
          />
          <SelectField
            defaultValue={defaultProductTypeId}
            label="Product type"
            name="productTypeId"
            options={productTypes}
          />
          <SelectField
            defaultValue={defaultTaxClassId}
            label="Tax class"
            name="taxClassId"
            options={taxClasses}
          />
          <Field
            label={`Unit price (${currencyCode})`}
            name="unitPrice"
            placeholder="35000"
            type="number"
          />
          <Field label="Opening stock" name="stockQty" placeholder="8" type="number" />
          <Field label="Variant name" name="variantName" placeholder="Default" />
          <Field label="SKU" name="sku" placeholder="Leave blank to auto-generate" />
          <SelectField
            defaultValue="ACTIVE"
            label="Status"
            name="status"
            options={[
              { id: "ACTIVE", label: "ACTIVE" },
              { id: "DRAFT", label: "DRAFT" },
              { id: "ARCHIVED", label: "ARCHIVED" },
            ]}
          />
          <SelectField
            defaultValue="PUBLIC"
            label="Visibility"
            name="visibility"
            options={[
              { id: "PUBLIC", label: "PUBLIC" },
              { id: "HIDDEN", label: "HIDDEN" },
            ]}
          />
          <label className="flex items-center gap-3 rounded-[1.3rem] border border-stone-200 bg-stone-50/70 px-4 py-3 text-sm font-semibold text-slate-700">
            <input className="h-4 w-4" name="isFeatured" type="checkbox" />
            Featured
          </label>
          <label className="flex items-center gap-3 rounded-[1.3rem] border border-stone-200 bg-stone-50/70 px-4 py-3 text-sm font-semibold text-slate-700">
            <input className="h-4 w-4" name="isNewArrival" type="checkbox" />
            New arrival
          </label>
          <button
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 xl:col-span-2"
            disabled={!canManage || pendingAction === "product"}
            type="submit"
          >
            {pendingAction === "product" ? "Saving..." : "Create product"}
          </button>
        </form>
        {message ? <p className="mt-4 text-sm font-medium text-emerald-700">{message}</p> : null}
        {errorMessage ? <p className="mt-4 text-sm font-medium text-rose-700">{errorMessage}</p> : null}
      </DashboardPanel>

      <DashboardPanel>
        <DashboardSectionHeading
          description="Review published state, default price, and stock. Add extra variants or publish drafts directly from the same workspace."
          eyebrow="Catalog"
          title="Current product inventory"
        />
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {productCards.map((product) => {
            const draft = variantDrafts[product.id] ?? {
              variantName: "",
              sku: "",
              unitPrice: "",
              stockQty: "0",
              isDefault: false,
            };

            return (
              <article
                key={product.id}
                className="rounded-[1.7rem] border border-stone-200 bg-stone-50/70 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xl font-semibold tracking-tight text-slate-950">
                      {product.productName}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">/{product.slug}</p>
                    <p className="mt-3 text-sm text-slate-500">
                      Created {formatDateTime(new Date(product.createdAt))}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <DashboardStatusPill
                      label={product.status}
                      tone={
                        product.status === "ACTIVE"
                          ? "emerald"
                          : product.status === "DRAFT"
                            ? "amber"
                            : "slate"
                      }
                    />
                    <DashboardStatusPill
                      label={product.visibility}
                      tone={product.visibility === "PUBLIC" ? "sky" : "slate"}
                    />
                  </div>
                </div>

                <div className="mt-5 rounded-[1.4rem] border border-white/80 bg-white/90 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
                    Default offer
                  </p>
                  {product.defaultVariant ? (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">
                          {product.defaultVariant.variantName ?? product.defaultVariant.sku}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {product.defaultVariant.sku}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-950">
                          {formatCurrency(
                            product.defaultVariant.unitPrice,
                            product.defaultVariant.currencyCode,
                          )}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {product.defaultVariant.availableQty} in stock
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-600">
                      No variant exists yet for this product.
                    </p>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  {product.status !== "ACTIVE" ? (
                    <button
                      className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!canManage || pendingAction === `publish-${product.id}`}
                      onClick={() =>
                        void submitJson(
                          `publish-${product.id}`,
                          `/api/admin/catalog/products/${product.id}/publish`,
                        )
                      }
                      type="button"
                    >
                      {pendingAction === `publish-${product.id}` ? "Publishing..." : "Publish"}
                    </button>
                  ) : null}
                  <a
                    className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-slate-950"
                    href={`/shop/${product.slug}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    View product
                  </a>
                </div>

                <form
                  className="mt-5 grid gap-3 md:grid-cols-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const currentDraft = variantDrafts[product.id];

                    if (!currentDraft?.unitPrice) {
                      setErrorMessage("Variant price is required.");
                      return;
                    }

                    void submitJson(
                      `variant-${product.id}`,
                      `/api/admin/catalog/products/${product.id}/variants`,
                      {
                        variantName: currentDraft.variantName || undefined,
                        sku: currentDraft.sku || undefined,
                        unitPrice: Number(currentDraft.unitPrice),
                        stockQty: Number(currentDraft.stockQty || "0"),
                        isDefault: currentDraft.isDefault,
                      },
                    );
                  }}
                >
                  <Field
                    label="Variant name"
                    name={`variantName-${product.id}`}
                    onValueChange={(value) =>
                      setVariantDrafts((currentValue) => ({
                        ...currentValue,
                        [product.id]: {
                          ...currentValue[product.id],
                          variantName: value,
                        },
                      }))
                    }
                    placeholder="Red / XL / 128GB"
                    value={draft.variantName}
                  />
                  <Field
                    label="SKU"
                    name={`sku-${product.id}`}
                    onValueChange={(value) =>
                      setVariantDrafts((currentValue) => ({
                        ...currentValue,
                        [product.id]: {
                          ...currentValue[product.id],
                          sku: value,
                        },
                      }))
                    }
                    placeholder="Leave blank to auto-generate"
                    value={draft.sku}
                  />
                  <Field
                    label={`Variant price (${currencyCode})`}
                    name={`unitPrice-${product.id}`}
                    onValueChange={(value) =>
                      setVariantDrafts((currentValue) => ({
                        ...currentValue,
                        [product.id]: {
                          ...currentValue[product.id],
                          unitPrice: value,
                        },
                      }))
                    }
                    placeholder="35000"
                    type="number"
                    value={draft.unitPrice}
                  />
                  <Field
                    label="Variant stock"
                    name={`stockQty-${product.id}`}
                    onValueChange={(value) =>
                      setVariantDrafts((currentValue) => ({
                        ...currentValue,
                        [product.id]: {
                          ...currentValue[product.id],
                          stockQty: value,
                        },
                      }))
                    }
                    placeholder="0"
                    type="number"
                    value={draft.stockQty}
                  />
                  <label className="flex items-center gap-3 rounded-[1.3rem] border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                    <input
                      checked={draft.isDefault}
                      onChange={(event) =>
                        setVariantDrafts((currentValue) => ({
                          ...currentValue,
                          [product.id]: {
                            ...currentValue[product.id],
                            isDefault: event.target.checked,
                          },
                        }))
                      }
                      type="checkbox"
                    />
                    Set as default
                  </label>
                  <button
                    className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 ring-1 ring-stone-200 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!canManage || pendingAction === `variant-${product.id}`}
                    type="submit"
                  >
                    {pendingAction === `variant-${product.id}` ? "Saving..." : "Add variant"}
                  </button>
                </form>
              </article>
            );
          })}
        </div>
      </DashboardPanel>
    </section>
  );
}

function Field({
  label,
  name,
  placeholder,
  type = "text",
  value,
  onValueChange,
}: {
  label: string;
  name: string;
  placeholder: string;
  type?: "text" | "number";
  value?: string;
  onValueChange?: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        className="rounded-[1.2rem] border border-stone-200 bg-white px-4 py-3 text-sm text-slate-950"
        name={name}
        onChange={onValueChange ? (event) => onValueChange(event.target.value) : undefined}
        placeholder={placeholder}
        step={type === "number" ? "any" : undefined}
        type={type}
        value={value}
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  options: SelectOption[];
  defaultValue: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <select
        className="rounded-[1.2rem] border border-stone-200 bg-white px-4 py-3 text-sm text-slate-950"
        defaultValue={defaultValue}
        name={name}
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
