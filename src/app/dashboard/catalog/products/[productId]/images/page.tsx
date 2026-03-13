import { notFound } from "next/navigation";
import { Types } from "mongoose";

import { AdminActionNotice } from "@/components/admin/action-notice";
import { CatalogTabs, ProductTabs } from "@/components/admin/module-tabs";
import {
  AdminActionButton,
  AdminBadge,
  AdminEmptyState,
  AdminField,
  AdminInlineHint,
  AdminLinkButton,
  AdminPage,
  AdminPageHeader,
  AdminPanel,
  AdminSectionHeader,
  AdminSummaryStrip,
  AdminTextarea,
} from "@/components/admin/workspace";
import {
  removeProductImageAction,
  removeVariantImageAction,
  saveProductImagesAction,
  saveVariantImagesAction,
  uploadProductImageAction,
  uploadVariantImageAction,
} from "@/app/dashboard/catalog/actions";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { connectToDatabase } from "@/lib/db/mongodb";
import { formatDateTime } from "@/lib/utils/format";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { ProductModel, ProductVariantModel } from "@/modules/catalog/catalog.models";
import { MediaAssetModel } from "@/modules/core/core.models";

type ProductImagesPageProps = {
  params: Promise<{
    productId: string;
  }>;
  searchParams: Promise<AdminSearchParams>;
};

type AssetSnapshot = {
  id: string;
  url: string;
  title: string | null;
  altText: string | null;
  mimeType: string | null;
  createdAt: Date | null;
};

function toImageLines(
  images: Array<{
    assetId: string;
    sortOrder: number;
    isPrimary: boolean;
  }>,
) {
  return images
    .map((image) =>
      [image.assetId, String(image.sortOrder), image.isPrimary ? "primary" : ""]
        .filter(Boolean)
        .join(" | "),
    )
    .join("\n");
}

function renderAssetPreview(
  asset: AssetSnapshot | null,
  image: {
    assetId: string;
    sortOrder: number;
    isPrimary: boolean;
  },
) {
  if (!asset) {
    return (
      <div className="rounded-[1rem] border border-dashed border-stone-300 bg-stone-50 px-4 py-5">
        <p className="text-sm font-semibold text-slate-900">Asset missing</p>
        <p className="mt-2 break-all text-xs text-slate-500">{image.assetId}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1rem] border border-stone-200 bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={asset.altText ?? asset.title ?? "Catalog image"}
        className="h-40 w-full bg-stone-100 object-cover"
        loading="lazy"
        src={asset.url}
      />
      <div className="space-y-2 px-4 py-3">
        <div className="flex flex-wrap gap-2">
          {image.isPrimary ? <AdminBadge label="PRIMARY" tone="sky" /> : null}
          <AdminBadge label={`SORT ${image.sortOrder}`} tone="slate" />
        </div>
        <p className="break-all text-xs text-slate-500">{image.assetId}</p>
        <p className="text-sm font-medium text-slate-900">{asset.title ?? "Untitled asset"}</p>
        <p className="text-xs text-slate-500">
          {asset.mimeType ?? "Unknown type"} / {formatDateTime(asset.createdAt)}
        </p>
      </div>
    </div>
  );
}

export default async function DashboardProductImagesPage({
  params,
  searchParams,
}: ProductImagesPageProps) {
  await requirePermission(PERMISSIONS.catalogView);
  const { productId } = await params;
  const resolvedSearchParams = await searchParams;

  if (!Types.ObjectId.isValid(productId)) {
    notFound();
  }

  await connectToDatabase();

  const product = (await ProductModel.findById(productId)
    .select("productName slug images updatedAt")
    .lean()
    .exec()) as
    | {
        _id: unknown;
        productName?: string;
        slug?: string;
        updatedAt?: Date;
        images?: Array<{
          assetId?: unknown;
          sortOrder?: number;
          isPrimary?: boolean;
        }>;
      }
    | null;

  if (!product) {
    notFound();
  }

  const variants = (await ProductVariantModel.find({ productId })
    .sort({ isDefault: -1, createdAt: 1 })
    .select("variantName sku images updatedAt isDefault")
    .lean()
    .exec()) as Array<{
    _id: unknown;
    variantName?: string;
    sku?: string;
    updatedAt?: Date;
    isDefault?: boolean;
    images?: Array<{
      assetId?: unknown;
      sortOrder?: number;
      isPrimary?: boolean;
    }>;
  }>;

  const productImages = (product.images ?? []).map((image) => ({
    assetId: String(image.assetId ?? ""),
    sortOrder: Number(image.sortOrder ?? 0),
    isPrimary: Boolean(image.isPrimary),
  }));

  const variantImages = variants.map((variant) => ({
    id: String(variant._id),
    variantName:
      typeof variant.variantName === "string" && variant.variantName.trim()
        ? variant.variantName
        : null,
    sku: typeof variant.sku === "string" ? variant.sku : "SKU",
    isDefault: Boolean(variant.isDefault),
    updatedAt: variant.updatedAt ?? null,
    images: (variant.images ?? []).map((image) => ({
      assetId: String(image.assetId ?? ""),
      sortOrder: Number(image.sortOrder ?? 0),
      isPrimary: Boolean(image.isPrimary),
    })),
  }));

  const assetIds = Array.from(
    new Set(
      [...productImages, ...variantImages.flatMap((variant) => variant.images)]
        .map((image) => image.assetId)
        .filter((assetId) => Types.ObjectId.isValid(assetId)),
    ),
  );

  const assets = assetIds.length
    ? ((await MediaAssetModel.find({
        _id: { $in: assetIds.map((assetId) => new Types.ObjectId(assetId)) },
      })
        .select("url title altText mimeType createdAt")
        .lean()
        .exec()) as Array<{
        _id: unknown;
        url?: string;
        title?: string;
        altText?: string;
        mimeType?: string;
        createdAt?: Date;
      }>)
    : [];

  const assetMap = new Map<string, AssetSnapshot>(
    assets.map((asset) => [
      String(asset._id),
      {
        id: String(asset._id),
        url: typeof asset.url === "string" ? asset.url : "",
        title:
          typeof asset.title === "string" && asset.title.trim() ? asset.title : null,
        altText:
          typeof asset.altText === "string" && asset.altText.trim() ? asset.altText : null,
        mimeType:
          typeof asset.mimeType === "string" && asset.mimeType.trim() ? asset.mimeType : null,
        createdAt: asset.createdAt ?? null,
      },
    ]),
  );

  const totalVariantImages = variantImages.reduce(
    (totalCount, variant) => totalCount + variant.images.length,
    0,
  );
  const currentHref = `/dashboard/catalog/products/${productId}/images`;

  return (
    <AdminPage>
      <AdminPageHeader
        title={`${product.productName ?? "Product"} images`}
        description="Upload image files directly from the dashboard, then reorder and mark primary product or variant imagery from one media workspace."
        actions={
          <>
            <AdminLinkButton href={`/dashboard/catalog/products/${productId}`}>
              Product details
            </AdminLinkButton>
            <AdminLinkButton href="/dashboard/catalog/products" tone="primary">
              Back to products
            </AdminLinkButton>
          </>
        }
      />

      <CatalogTabs currentPath="/dashboard/catalog/products" />
      <ProductTabs currentPath={currentHref} productId={productId} />

      <AdminActionNotice searchParams={resolvedSearchParams} />

      <AdminSummaryStrip
        columns={3}
        items={[
          {
            label: "Product images",
            value: productImages.length.toLocaleString("en"),
            hint: "Main gallery items on the product record",
          },
          {
            label: "Variant images",
            value: totalVariantImages.toLocaleString("en"),
            hint: "Images attached directly to specific option combinations",
          },
          {
            label: "Uploaded assets",
            value: assetIds.length.toLocaleString("en"),
            hint: `Product updated ${formatDateTime(product.updatedAt ?? null)}`,
          },
        ]}
      />

      <div className="space-y-4">
        <AdminPanel>
          <AdminSectionHeader
            title="Product gallery"
            description={`/${product.slug ?? ""}`}
          />

          {productImages.length > 0 ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {productImages.map((image) => (
                <div className="space-y-3" key={`${image.assetId}-${image.sortOrder}`}>
                  {renderAssetPreview(assetMap.get(image.assetId) ?? null, image)}
                  <form action={removeProductImageAction}>
                    <input name="productId" type="hidden" value={productId} />
                    <input name="assetId" type="hidden" value={image.assetId} />
                    <input name="returnTo" type="hidden" value={currentHref} />
                    <AdminActionButton tone="rose">Remove image</AdminActionButton>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4">
              <AdminEmptyState
                title="No product images yet"
                body="Upload the first product image below."
              />
            </div>
          )}

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            <div className="rounded-[1.2rem] border border-stone-200 bg-stone-50/70 p-4">
              <AdminSectionHeader
                title="Upload product image"
                description="Upload directly from your device and attach it to the product gallery in one step."
              />

              <form action={uploadProductImageAction} className="mt-4 space-y-4">
                <input name="productId" type="hidden" value={productId} />
                <input name="returnTo" type="hidden" value={currentHref} />
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-slate-700">Image file</span>
                  <input
                    accept="image/*"
                    className="block w-full rounded-[0.95rem] border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none"
                    name="imageFile"
                    type="file"
                  />
                </label>
                <AdminField label="Title" name="title" placeholder="Front gallery shot" />
                <AdminField
                  label="Alt text"
                  name="altText"
                  placeholder="Omni Trail Pack front view"
                />
                <AdminField label="Sort order" name="sortOrder" placeholder="0" type="number" />
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input name="isPrimary" type="checkbox" />
                  Mark as primary image
                </label>
                <AdminActionButton tone="sky">Upload product image</AdminActionButton>
              </form>
            </div>

            <div className="rounded-[1.2rem] border border-stone-200 bg-stone-50/70 p-4">
              <AdminSectionHeader
                title="Manage product image order"
                description="Edit one line per image using assetId | sortOrder | primary."
              />

              <form action={saveProductImagesAction} className="mt-4 space-y-4">
                <input name="productId" type="hidden" value={productId} />
                <input name="returnTo" type="hidden" value={currentHref} />
                <AdminTextarea
                  defaultValue={toImageLines(productImages)}
                  label="Product image asset lines"
                  name="imageAssetIds"
                  placeholder="assetId | sortOrder | primary"
                  rows={8}
                />
                <AdminActionButton>Save product image order</AdminActionButton>
              </form>
            </div>
          </div>
        </AdminPanel>

        <AdminPanel>
          <AdminSectionHeader
            title="Variant galleries"
            description="Each variant can keep its own image set for color, size, or bundled SKU presentation."
          />

          <div className="mt-4 space-y-4">
            {variantImages.length > 0 ? (
              variantImages.map((variant) => (
                <div
                  key={variant.id}
                  className="rounded-[1.2rem] border border-stone-200 bg-stone-50/70 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-950">
                      {variant.variantName ?? variant.sku}
                    </p>
                    {variant.isDefault ? <AdminBadge label="DEFAULT" tone="sky" /> : null}
                    <AdminBadge label={variant.sku} tone="slate" />
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    Updated {formatDateTime(variant.updatedAt)}
                  </p>

                  {variant.images.length > 0 ? (
                    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {variant.images.map((image) => (
                        <div
                          className="space-y-3"
                          key={`${variant.id}-${image.assetId}-${image.sortOrder}`}
                        >
                          {renderAssetPreview(assetMap.get(image.assetId) ?? null, image)}
                          <form action={removeVariantImageAction}>
                            <input name="productId" type="hidden" value={productId} />
                            <input name="variantId" type="hidden" value={variant.id} />
                            <input name="assetId" type="hidden" value={image.assetId} />
                            <input name="returnTo" type="hidden" value={currentHref} />
                            <AdminActionButton tone="rose">Remove image</AdminActionButton>
                          </form>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4">
                      <AdminInlineHint tone="amber">
                        This variant does not have any uploaded images yet.
                      </AdminInlineHint>
                    </div>
                  )}

                  <div className="mt-6 grid gap-4 xl:grid-cols-2">
                    <div className="rounded-[1rem] border border-stone-200 bg-white p-4">
                      <AdminSectionHeader
                        title="Upload variant image"
                        description={`Attach a new image to ${variant.variantName ?? variant.sku}.`}
                      />

                      <form action={uploadVariantImageAction} className="mt-4 space-y-4">
                        <input name="productId" type="hidden" value={productId} />
                        <input name="variantId" type="hidden" value={variant.id} />
                        <input name="returnTo" type="hidden" value={currentHref} />
                        <label className="grid gap-2">
                          <span className="text-sm font-semibold text-slate-700">Image file</span>
                          <input
                            accept="image/*"
                            className="block w-full rounded-[0.95rem] border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-slate-950 outline-none"
                            name="imageFile"
                            type="file"
                          />
                        </label>
                        <AdminField
                          label="Title"
                          name="title"
                          placeholder={`${variant.sku} image`}
                        />
                        <AdminField
                          label="Alt text"
                          name="altText"
                          placeholder={`${variant.sku} detail shot`}
                        />
                        <AdminField
                          label="Sort order"
                          name="sortOrder"
                          placeholder="0"
                          type="number"
                        />
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input name="isPrimary" type="checkbox" />
                          Mark as primary image
                        </label>
                        <AdminActionButton tone="sky">Upload variant image</AdminActionButton>
                      </form>
                    </div>

                    <div className="rounded-[1rem] border border-stone-200 bg-white p-4">
                      <AdminSectionHeader
                        title="Manage variant image order"
                        description="Edit one line per image using assetId | sortOrder | primary."
                      />

                      <form action={saveVariantImagesAction} className="mt-4 space-y-4">
                        <input name="productId" type="hidden" value={productId} />
                        <input name="variantId" type="hidden" value={variant.id} />
                        <input name="returnTo" type="hidden" value={currentHref} />
                        <AdminTextarea
                          defaultValue={toImageLines(variant.images)}
                          label="Variant image asset lines"
                          name="variantImageAssetIds"
                          placeholder="assetId | sortOrder | primary"
                          rows={6}
                        />
                        <AdminActionButton>Save variant image order</AdminActionButton>
                      </form>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <AdminEmptyState
                title="No variants"
                body="Add variants first before assigning variant-specific images."
              />
            )}
          </div>
        </AdminPanel>
      </div>
    </AdminPage>
  );
}
