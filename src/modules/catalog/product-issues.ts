import {
  isInventoryTracked,
  summarizeProductVariants,
} from "@/modules/catalog/catalog-availability";

type ProductImageLike = {
  assetId?: unknown;
  isPrimary?: boolean;
};

type VariantIssueInput = {
  sku?: string | null;
  unitPrice?: number | null;
  stockQty?: number | null;
  reservedQty?: number | null;
  availableQty?: number | null;
  trackInventory?: boolean | null;
  allowBackorder?: boolean | null;
  isActive?: boolean | null;
  lowStockThreshold?: number | null;
  images?: ProductImageLike[] | null;
};

type ProductIssueInput = {
  categoryId?: unknown;
  status?: string | null;
  visibility?: string | null;
  images?: ProductImageLike[] | null;
};

export type ProductIssue = {
  code:
    | "missing_category"
    | "no_images"
    | "no_primary_image"
    | "hidden_or_draft"
    | "no_active_variants"
    | "no_sellable_variants"
    | "missing_price"
    | "invalid_variant_state";
  label: string;
  tone: "amber" | "rose";
};

function toFiniteNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function hasPrimaryImage(images: ProductImageLike[]) {
  return images.some((image) => Boolean(image.isPrimary));
}

function hasInvalidVariantState(variants: VariantIssueInput[]) {
  return variants.some((variant) => {
    if (variant.isActive === false) {
      return false;
    }

    const unitPrice = toFiniteNumber(variant.unitPrice, 0);
    const stockQty = toFiniteNumber(variant.stockQty, 0);
    const reservedQty = toFiniteNumber(variant.reservedQty, 0);
    const availableQty = toFiniteNumber(variant.availableQty, 0);
    const expectedAvailableQty = stockQty - reservedQty;

    if (!variant.sku || !String(variant.sku).trim()) {
      return true;
    }

    if (unitPrice <= 0) {
      return true;
    }

    if (isInventoryTracked(variant)) {
      if (stockQty < 0 || reservedQty < 0 || reservedQty > stockQty) {
        return true;
      }

      if (availableQty !== expectedAvailableQty) {
        return true;
      }
    }

    return false;
  });
}

export function computeProductIssues(input: {
  product: ProductIssueInput;
  variants: VariantIssueInput[];
}) {
  const issues: ProductIssue[] = [];
  const productImages = input.product.images ?? [];
  const variantImages = input.variants.flatMap((variant) => variant.images ?? []);
  const allImages = [...productImages, ...variantImages];
  const summary = summarizeProductVariants(input.variants);
  const activeVariants = input.variants.filter((variant) => variant.isActive !== false);

  if (!input.product.categoryId) {
    issues.push({
      code: "missing_category",
      label: "Missing category",
      tone: "rose",
    });
  }

  if (allImages.length === 0) {
    issues.push({
      code: "no_images",
      label: "No images",
      tone: "amber",
    });
  } else if (!hasPrimaryImage(allImages)) {
    issues.push({
      code: "no_primary_image",
      label: "No primary image",
      tone: "amber",
    });
  }

  if (input.product.status !== "ACTIVE" || input.product.visibility !== "PUBLIC") {
    issues.push({
      code: "hidden_or_draft",
      label: "Draft or hidden",
      tone: "amber",
    });
  }

  if (summary.activeVariantCount === 0) {
    issues.push({
      code: "no_active_variants",
      label: "No active variants",
      tone: "rose",
    });
  }

  if (summary.activeVariantCount > 0 && summary.sellableVariantCount === 0) {
    issues.push({
      code: "no_sellable_variants",
      label: "No sellable variants",
      tone: "rose",
    });
  }

  if (
    activeVariants.length === 0 ||
    activeVariants.every((variant) => toFiniteNumber(variant.unitPrice, 0) <= 0)
  ) {
    issues.push({
      code: "missing_price",
      label: "Missing price",
      tone: "amber",
    });
  }

  if (hasInvalidVariantState(input.variants)) {
    issues.push({
      code: "invalid_variant_state",
      label: "Invalid variant state",
      tone: "rose",
    });
  }

  return {
    issues,
    issueCount: issues.length,
    hasIssues: issues.length > 0,
  };
}
