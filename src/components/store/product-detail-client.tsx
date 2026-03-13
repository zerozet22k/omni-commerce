"use client";

import Image from "next/image";
import { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { WishlistToggle } from "@/components/store/wishlist-toggle";
import { buttonClassName } from "@/components/ui/button";
import {
  STOREFRONT_PRODUCT_PLACEHOLDER_SRC,
  storefrontAssetUrl,
} from "@/lib/storefront/placeholders";
import { useAppDispatch } from "@/lib/store/hooks";
import { succeedCartMutation } from "@/lib/store/slices/cart-slice";
import { formatCompactNumber, formatCurrency } from "@/lib/utils/format";
import type { StorefrontProductDetail } from "@/modules/storefront/storefront.types";

type ProductDetailClientProps = {
  initialInWishlist: boolean;
  isAuthenticated: boolean;
  loginHref: string;
  product: StorefrontProductDetail;
};

function getDiscountPercent(price: number, compareAtPrice: number | null) {
  if (!compareAtPrice || compareAtPrice <= price) {
    return null;
  }

  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}

function getVariantSelectionMap(variant: StorefrontProductDetail["variants"][number]) {
  return new Map(
    variant.optionSelections.map((selection) => [
      selection.optionTypeId,
      selection.optionValueId,
    ]),
  );
}

export function ProductDetailClient({
  initialInWishlist,
  isAuthenticated,
  loginHref,
  product,
}: ProductDetailClientProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const defaultVariant =
    product.variants.find((variant) => variant.isDefault) ?? product.variants[0] ?? null;
  const [selectedVariantId, setSelectedVariantId] = useState(defaultVariant?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [activeImageAssetId, setActiveImageAssetId] = useState(
    defaultVariant?.imageAssetIds[0] ?? product.imageAssetIds[0] ?? "",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const selectedVariant =
    product.variants.find((variant) => variant.id === selectedVariantId) ?? defaultVariant;
  const selectedSelections = useMemo(
    () => (selectedVariant ? getVariantSelectionMap(selectedVariant) : new Map<string, string>()),
    [selectedVariant],
  );
  const canPurchaseSelectedVariant = Boolean(selectedVariant?.isPurchasable);
  const maxQuantity =
    selectedVariant && canPurchaseSelectedVariant && selectedVariant.trackInventory && !selectedVariant.allowBackorder
      ? Math.max(selectedVariant.availableQty, 1)
      : 999;
  const galleryImages = Array.from(
    new Set([...(selectedVariant?.imageAssetIds ?? []), ...product.imageAssetIds]),
  );
  const discountPercent = getDiscountPercent(
    selectedVariant?.unitPrice ?? product.price,
    selectedVariant?.compareAtPrice ?? product.compareAtPrice,
  );

  useEffect(() => {
    const nextImage =
      selectedVariant?.imageAssetIds[0] ?? product.imageAssetIds[0] ?? "";
    setActiveImageAssetId(nextImage);
  }, [product.imageAssetIds, selectedVariant]);

  useEffect(() => {
    setQuantity((current) => Math.min(current, maxQuantity));
  }, [maxQuantity]);

  function findVariantForSelections(nextSelections: Map<string, string>) {
    return (
      product.variants.find((variant) => {
        const variantSelections = getVariantSelectionMap(variant);

        for (const group of product.optionGroups) {
          const expectedValue = nextSelections.get(group.id);

          if (expectedValue && variantSelections.get(group.id) !== expectedValue) {
            return false;
          }
        }

        return true;
      }) ?? null
    );
  }

  function handleOptionSelect(optionTypeId: string, optionValueId: string) {
    const nextSelections = new Map(selectedSelections);
    nextSelections.set(optionTypeId, optionValueId);

    const nextVariant =
      findVariantForSelections(nextSelections) ??
      product.variants.find((variant) =>
        variant.optionSelections.some(
          (selection) =>
            selection.optionTypeId === optionTypeId &&
            selection.optionValueId === optionValueId,
        ),
      ) ??
      selectedVariant;

    if (!nextVariant) {
      return;
    }

    setSelectedVariantId(nextVariant.id);
  }

  function getCandidateVariant(optionTypeId: string, optionValueId: string) {
    const nextSelections = new Map(selectedSelections);
    nextSelections.set(optionTypeId, optionValueId);
    return findVariantForSelections(nextSelections);
  }

  async function submitAddToCart(redirectToCheckout: boolean) {
    if (!selectedVariant) {
      setMessage("This product does not have a purchasable variant yet.");
      return;
    }

    if (!isAuthenticated) {
      router.push(loginHref);
      return;
    }

    if (!selectedVariant.isPurchasable) {
      setMessage(`This variant is currently ${selectedVariant.availabilityLabel.toLowerCase()}.`);
      return;
    }

    setIsPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/store/cart/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          variantId: selectedVariant.id,
          quantity,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to add item to cart.");
      }

      dispatch(
        succeedCartMutation({
          snapshot: payload,
          message: redirectToCheckout ? null : "Added to cart.",
          openDrawer: !redirectToCheckout,
        }),
      );

      startTransition(() => {
        if (redirectToCheckout) {
          router.push("/checkout");
        } else {
          router.refresh();
        }
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to add to cart.");
    } finally {
      setIsPending(false);
    }
  }

  const activeImage = activeImageAssetId || galleryImages[0] || "";
  const galleryImageIds = galleryImages.length > 0 ? galleryImages : [""];
  const activeImageSrc = storefrontAssetUrl(
    activeImage || null,
    STOREFRONT_PRODUCT_PLACEHOLDER_SRC,
  );
  const isActiveImageUnoptimized = activeImageSrc.startsWith("/api/assets/");
  const selectedAvailabilityLabel =
    selectedVariant?.availabilityLabel ?? product.availabilityLabel;
  const shouldShowPricePending = !product.hasActiveVariant || (selectedVariant?.unitPrice ?? product.price) <= 0;

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,460px)]">
      <div className="grid gap-4 lg:grid-cols-[88px_minmax(0,1fr)]">
        <div className="order-2 flex gap-2 overflow-x-auto lg:order-1 lg:flex-col">
          {galleryImageIds.map((imageAssetId, index) => (
            <button
              key={imageAssetId || `placeholder-${index}`}
              className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border bg-surface ${activeImage === imageAssetId || (!activeImage && !imageAssetId) ? "border-primary" : "border-border"}`}
              onClick={() => setActiveImageAssetId(imageAssetId)}
              type="button"
            >
              <Image
                alt={product.productName}
                className="object-cover"
                fill
                sizes="80px"
                src={storefrontAssetUrl(imageAssetId || null, STOREFRONT_PRODUCT_PLACEHOLDER_SRC)}
                unoptimized={Boolean(imageAssetId)}
              />
            </button>
          ))}
        </div>

        <div className="order-1 overflow-hidden rounded-2xl border border-border bg-surface lg:order-2">
          <div className="relative aspect-square bg-surface-alt">
            {activeImage ? (
              <Image
                alt={product.productName}
                className="object-cover"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 56vw"
                src={activeImageSrc}
                unoptimized={isActiveImageUnoptimized}
              />
            ) : (
              <Image
                alt={product.productName}
                className="object-cover"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 56vw"
                src={STOREFRONT_PRODUCT_PLACEHOLDER_SRC}
              />
            )}
          </div>
        </div>
      </div>

      <div className="space-y-5 rounded-2xl border border-border bg-surface p-5 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {product.badges.map((badge) => (
              <span
                key={badge.id}
                className="rounded-md border border-border bg-surface-alt px-2.5 py-1 text-[11px] font-semibold text-text-muted"
              >
                {badge.label}
              </span>
            ))}
            {product.promotions.map((promotion) => (
              <span
                key={promotion.id}
                className="rounded-md bg-primary px-2.5 py-1 text-[11px] font-semibold text-white"
              >
                {promotion.name}
              </span>
            ))}
          </div>
          <WishlistToggle
            initialInWishlist={initialInWishlist}
            isAuthenticated={isAuthenticated}
            loginHref={loginHref}
            productId={product.id}
          />
        </div>

        <div>
          <h1 className="text-2xl font-bold leading-tight text-text md:text-3xl">
            {product.productName}
          </h1>
          {product.shortDescription ? (
            <p className="mt-3 text-sm leading-7 text-text-muted">
              {product.shortDescription}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-text-muted">
            <span>
              {product.avgRating > 0
                ? `${product.avgRating.toFixed(1)} rating`
                : "No ratings yet"}
            </span>
            {product.reviewCount > 0 ? (
              <span>{formatCompactNumber(product.reviewCount)} reviews</span>
            ) : null}
            {product.soldCount > 0 ? (
              <span>{formatCompactNumber(product.soldCount)} sold</span>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface-alt p-4">
          <div className="flex flex-wrap items-end gap-3">
            {shouldShowPricePending ? (
              <p className="text-base font-bold text-warning">Price pending</p>
            ) : (
              <p className="text-3xl font-extrabold text-text">
                {formatCurrency(
                  selectedVariant?.unitPrice ?? product.price,
                  selectedVariant?.currencyCode ?? product.currencyCode,
                )}
              </p>
            )}
            {!shouldShowPricePending &&
            (selectedVariant?.compareAtPrice ?? product.compareAtPrice) ? (
              <p className="text-sm text-text-muted/70 line-through">
                {formatCurrency(
                  selectedVariant?.compareAtPrice ?? product.compareAtPrice ?? 0,
                  selectedVariant?.currencyCode ?? product.currencyCode,
                )}
              </p>
            ) : null}
            {discountPercent ? (
              <span className="rounded-md bg-danger px-2 py-1 text-xs font-bold text-white">
                Save {discountPercent}%
              </span>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-text-muted">
            <span className={canPurchaseSelectedVariant ? "text-text-muted" : "text-warning"}>
              {selectedVariant?.trackInventory && selectedVariant.availableQty > 0
                ? `${selectedVariant.availableQty} in stock`
                : selectedAvailabilityLabel}
            </span>
            {selectedVariant?.sku ? <span>SKU {selectedVariant.sku}</span> : null}
          </div>
        </div>

        {!product.hasActiveVariant ? (
          <p className="rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
            This product is visible in the catalog, but it does not have an active variant configured yet.
          </p>
        ) : null}

        {product.optionGroups.map((group) => (
          <div key={group.id} className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-text">{group.name}</p>
              <p className="text-xs text-text-muted">
                {selectedVariant?.optionSelections.find(
                  (selection) => selection.optionTypeId === group.id,
                )?.optionValueLabel ?? "Select"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {group.values.map((value) => {
                const candidateVariant = getCandidateVariant(group.id, value.id);
                const isSelected = selectedSelections.get(group.id) === value.id;
                const isDisabled = !candidateVariant;

                return (
                  <button
                    key={value.id}
                    className={`inline-flex min-h-10 items-center justify-center rounded-xl border px-3 text-sm font-semibold transition ${isSelected ? "border-primary bg-primary !text-white hover:!text-white" : "border-border bg-surface text-text-muted"} ${isDisabled ? "cursor-not-allowed opacity-40" : "hover:bg-surface-alt hover:text-text"}`}
                    disabled={isDisabled}
                    onClick={() => handleOptionSelect(group.id, value.id)}
                    type="button"
                  >
                    {group.displayType === "COLOR_SWATCH" && value.swatchHex ? (
                      <span
                        className="mr-2 inline-flex h-4 w-4 rounded-full border border-black/10"
                        style={{ backgroundColor: value.swatchHex }}
                      />
                    ) : null}
                    {value.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="space-y-2">
          <p className="text-sm font-semibold text-text">Quantity</p>
          <div className="inline-flex items-center rounded-xl border border-border bg-surface-alt">
            <button
              className="h-11 w-11 text-lg font-bold text-text-muted"
              disabled={quantity <= 1}
              onClick={() => setQuantity((current) => Math.max(1, current - 1))}
              type="button"
            >
              -
            </button>
            <span className="min-w-10 text-center text-sm font-semibold text-text">
              {quantity}
            </span>
            <button
              className="h-11 w-11 text-lg font-bold text-text-muted"
              disabled={!canPurchaseSelectedVariant || quantity >= maxQuantity}
              onClick={() =>
                setQuantity((current) => Math.min(maxQuantity, current + 1))
              }
              type="button"
            >
              +
            </button>
          </div>
        </div>

        {message ? (
          <p className="rounded-xl border border-border bg-surface-alt px-3 py-2 text-sm text-text-muted">
            {message}
          </p>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            className={buttonClassName({ block: true, size: "lg", variant: "primary" })}
            disabled={
              isPending ||
              !selectedVariant ||
              !selectedVariant.isPurchasable
            }
            onClick={() => void submitAddToCart(false)}
            type="button"
          >
            {isPending ? "Adding..." : "Add to cart"}
          </button>
          <button
            className={buttonClassName({ block: true, size: "lg", variant: "secondary" })}
            disabled={
              isPending ||
              !selectedVariant ||
              !selectedVariant.isPurchasable
            }
            onClick={() => void submitAddToCart(true)}
            type="button"
          >
            Buy now
          </button>
        </div>

        <div className="grid gap-3 rounded-2xl border border-border bg-surface-alt p-4 text-sm text-text-muted">
          {product.shippingMethods.slice(0, 3).map((method) => (
            <div key={method.id} className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-text">{method.methodName}</p>
                <p className="mt-1">
                  {method.estimatedMinDays && method.estimatedMaxDays
                    ? `${method.estimatedMinDays}-${method.estimatedMaxDays} days`
                    : method.description ?? "Delivery method"}
                </p>
              </div>
              <span className="font-semibold text-text">
                {formatCurrency(method.baseFee, product.currencyCode)}
              </span>
            </div>
          ))}
          <div className="rounded-xl border border-border bg-surface px-3 py-3 text-sm">
            Customer orders, payments, and approved returns remain available from the account area after checkout.
          </div>
        </div>
      </div>
    </section>
  );
}
