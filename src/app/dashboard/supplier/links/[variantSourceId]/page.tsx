import { notFound } from "next/navigation";

import { ProductModel, ProductVariantModel } from "@/modules/catalog/catalog.models";
import { AdminEditorPage } from "@/components/admin/editor-page";
import { SupplierTabs } from "@/components/admin/module-tabs";
import {
  DeleteSupplierLinkButton,
  SupplierLinkForm,
} from "@/components/admin/supplier-forms";
import { AdminPanel, AdminSectionHeader } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";
import {
  SourcingSourceModel,
  VariantSourceModel,
} from "@/modules/sourcing/sourcing.models";

type SupplierLinkDetailPageProps = {
  params: Promise<{
    variantSourceId: string;
  }>;
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardSupplierLinkDetailPage({
  params,
  searchParams,
}: SupplierLinkDetailPageProps) {
  await requirePermission(PERMISSIONS.inventoryView);
  const { variantSourceId } = await params;
  const resolvedSearchParams = await searchParams;
  const [link, workspace, sourceOptionRows] = await Promise.all([
    VariantSourceModel.findById(variantSourceId).lean().exec(),
    adminWorkspaceService.getSupplierWorkspace({}),
    SourcingSourceModel.find()
      .sort({ sourceName: 1 })
      .select("sourceName isActive")
      .lean()
      .exec(),
  ]);

  if (!link) {
    notFound();
  }

  const variantId = String(link.variantId ?? "");
  const selectedVariant = await ProductVariantModel.findById(variantId)
    .select("productId variantName sku")
    .lean()
    .exec();
  const product =
    selectedVariant && selectedVariant.productId
      ? await ProductModel.findById(String(selectedVariant.productId))
          .select("productName")
          .lean()
          .exec()
      : null;
  const selectedVariantLabel =
    selectedVariant && product
      ? `${typeof product.productName === "string" ? product.productName : "Product"} - ${typeof selectedVariant.variantName === "string" && selectedVariant.variantName ? selectedVariant.variantName : typeof selectedVariant.sku === "string" ? selectedVariant.sku : "Variant"} (${typeof selectedVariant.sku === "string" ? selectedVariant.sku : "No SKU"})`
      : null;
  const variantOptions = workspace.variantOptions.some((option) => option.id === variantId)
    ? workspace.variantOptions
    : selectedVariantLabel
      ? [{ id: variantId, label: selectedVariantLabel }, ...workspace.variantOptions]
      : workspace.variantOptions;
  const sourceOptions = (sourceOptionRows as Array<{
    _id: unknown;
    sourceName?: string;
    isActive?: boolean;
  }>).map((row) => ({
    id: String(row._id),
    label:
      typeof row.sourceName === "string"
        ? `${row.sourceName}${row.isActive ? "" : " (inactive)"}`
        : "Supplier",
  }));

  return (
    <AdminEditorPage
      backHref="/dashboard/supplier/links"
      backLabel="Back to supplier links"
      description="Edit the supplier link in a dedicated screen so validation and operational actions are not cramped into the list view."
      main={
        <AdminPanel>
          <AdminSectionHeader
            title="Supplier link"
            description="Update the linked supplier, target variant, URL, price, and preference state."
          />
          <div className="mt-5">
            <SupplierLinkForm
              record={{
                id: String(link._id),
                variantId,
                sourcingSourceId: String(link.sourcingSourceId ?? ""),
                sourceSku: typeof link.sourceSku === "string" ? link.sourceSku : null,
                sourceProductName:
                  typeof link.sourceProductName === "string" ? link.sourceProductName : null,
                sourceProductUrl:
                  typeof link.sourceProductUrl === "string" ? link.sourceProductUrl : "",
                sourcePrice:
                  typeof link.sourcePrice === "number" ? link.sourcePrice : null,
                isPreferred: Boolean(link.isPreferred),
                isActive: Boolean(link.isActive),
              }}
              returnTo={`/dashboard/supplier/links/${variantSourceId}`}
              sourceOptions={sourceOptions}
              submitLabel="Save supplier link"
              variantOptions={variantOptions}
            />
          </div>
        </AdminPanel>
      }
      aside={
        <AdminPanel>
          <AdminSectionHeader
            title="Record actions"
            description="Delete removes only this supplier-to-variant link and leaves the supplier plus variant records intact."
          />
          <div className="mt-5">
            <DeleteSupplierLinkButton
              returnTo={`/dashboard/supplier/links/${variantSourceId}`}
              variantSourceId={variantSourceId}
            />
          </div>
        </AdminPanel>
      }
      searchParams={resolvedSearchParams}
      tabs={<SupplierTabs currentPath={`/dashboard/supplier/links/${variantSourceId}`} />}
      title="Supplier Link"
    />
  );
}
