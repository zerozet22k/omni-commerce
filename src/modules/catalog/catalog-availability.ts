type VariantAvailabilityInput = {
  isActive?: boolean | null;
  trackInventory?: boolean | null;
  allowBackorder?: boolean | null;
  availableQty?: number | null;
  stockQty?: number | null;
  reservedQty?: number | null;
  lowStockThreshold?: number | null;
};

type ProductVariantSummary = {
  activeVariantCount: number;
  sellableVariantCount: number;
  inStockVariantCount: number;
  totalAvailableQty: number;
  hasSellableVariant: boolean;
  hasInStockVariant: boolean;
  availabilityLabel: string;
};

function toFiniteNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

export function isInventoryTracked(variant: VariantAvailabilityInput) {
  return variant.trackInventory !== false;
}

export function hasPositiveVariantStock(variant: VariantAvailabilityInput) {
  if (variant.isActive === false || !isInventoryTracked(variant)) {
    return false;
  }

  return toFiniteNumber(variant.availableQty) > 0;
}

export function isVariantSellable(
  variant: VariantAvailabilityInput,
  quantity = 1,
) {
  if (variant.isActive === false) {
    return false;
  }

  const requestedQuantity =
    Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1;

  if (!isInventoryTracked(variant)) {
    return true;
  }

  if (variant.allowBackorder) {
    return true;
  }

  return toFiniteNumber(variant.availableQty) >= requestedQuantity;
}

export function getVariantAvailabilityState(variant: VariantAvailabilityInput) {
  if (variant.isActive === false) {
    return {
      mode: "INACTIVE",
      label: "Inactive",
      detail: "This variant is not currently purchasable.",
      isSellable: false,
      isInStock: false,
    } as const;
  }

  if (!isInventoryTracked(variant)) {
    return {
      mode: "NOT_TRACKED",
      label: "Available to order",
      detail: "Inventory is not tracked for this variant.",
      isSellable: true,
      isInStock: false,
    } as const;
  }

  const availableQty = toFiniteNumber(variant.availableQty);

  if (availableQty > 0) {
    const lowStockThreshold = Math.max(toFiniteNumber(variant.lowStockThreshold), 0);
    const isLowStock = lowStockThreshold > 0 && availableQty <= lowStockThreshold;

    return {
      mode: isLowStock ? "LOW_STOCK" : "IN_STOCK",
      label: isLowStock ? "Low stock" : "In stock",
      detail: `${availableQty} available for immediate sale.`,
      isSellable: true,
      isInStock: true,
    } as const;
  }

  if (variant.allowBackorder) {
    return {
      mode: "BACKORDER",
      label: "Backorder",
      detail: "This variant can still be sold while stock is unavailable.",
      isSellable: true,
      isInStock: false,
    } as const;
  }

  return {
    mode: "OUT_OF_STOCK",
    label: "Out of stock",
    detail: "This variant is not sellable until stock is replenished.",
    isSellable: false,
    isInStock: false,
  } as const;
}

export function summarizeProductVariants(
  variants: VariantAvailabilityInput[],
): ProductVariantSummary {
  const activeVariants = variants.filter((variant) => variant.isActive !== false);
  const sellableVariants = activeVariants.filter((variant) => isVariantSellable(variant));
  const inStockVariants = activeVariants.filter((variant) => hasPositiveVariantStock(variant));
  const totalAvailableQty = activeVariants
    .filter((variant) => isInventoryTracked(variant))
    .reduce((sum, variant) => sum + toFiniteNumber(variant.availableQty), 0);

  let availabilityLabel = "No active variants";

  if (inStockVariants.length > 0) {
    availabilityLabel = "In stock";
  } else if (sellableVariants.length > 0) {
    const hasOnDemandVariant = sellableVariants.some(
      (variant) => !isInventoryTracked(variant),
    );
    availabilityLabel = hasOnDemandVariant ? "Available to order" : "Backorder";
  } else if (activeVariants.length > 0) {
    availabilityLabel = "Unavailable";
  }

  return {
    activeVariantCount: activeVariants.length,
    sellableVariantCount: sellableVariants.length,
    inStockVariantCount: inStockVariants.length,
    totalAvailableQty,
    hasSellableVariant: sellableVariants.length > 0,
    hasInStockVariant: inStockVariants.length > 0,
    availabilityLabel,
  };
}
