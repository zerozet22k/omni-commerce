"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { WishlistToggle } from "@/components/store/wishlist-toggle";
import {
  STOREFRONT_PRODUCT_PLACEHOLDER_SRC,
  storefrontAssetUrl,
} from "@/lib/storefront/placeholders";
import { formatCompactNumber, formatCurrency } from "@/lib/utils/format";
import type { StorefrontProductCard } from "@/modules/storefront/storefront.types";

type ProductCardProps = {
  initialInWishlist?: boolean;
  isAuthenticated?: boolean;
  loginHref?: string;
  product: StorefrontProductCard;
};

function getDiscountPercent(price: number, compareAtPrice: number | null) {
  if (!compareAtPrice || compareAtPrice <= price) {
    return null;
  }

  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}

export function ProductCard({
  initialInWishlist = false,
  isAuthenticated = false,
  loginHref = "/login",
  product,
}: ProductCardProps) {
  const discountPercent = getDiscountPercent(product.price, product.compareAtPrice);
  const hasPrice = product.price > 0;
  const shouldShowPricePending = !product.hasActiveVariant || !hasPrice;
  const availabilityToneClass = product.hasSellableVariant
    ? "text-text-muted"
    : "text-warning";

  const initialImageSrc = useMemo(
    () =>
      storefrontAssetUrl(
        product.primaryImageAssetId,
        STOREFRONT_PRODUCT_PLACEHOLDER_SRC,
      ),
    [product.primaryImageAssetId],
  );

  const [imageSrc, setImageSrc] = useState(initialImageSrc);
  const isUnoptimizedImage = imageSrc.startsWith("/api/assets/");

  return (
    <article className="group relative h-full overflow-hidden rounded-2xl border border-border bg-surface transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="absolute right-3 top-3 z-10">
        <WishlistToggle
          initialInWishlist={initialInWishlist}
          isAuthenticated={isAuthenticated}
          loginHref={loginHref}
          productId={product.id}
        />
      </div>

      <Link className="block" href={`/shop/${product.slug}`}>
        <div className="relative aspect-square overflow-hidden bg-surface-alt">
          <Image
            alt={product.productName}
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            src={imageSrc}
            unoptimized={isUnoptimizedImage}
            onError={() => {
              if (imageSrc !== STOREFRONT_PRODUCT_PLACEHOLDER_SRC) {
                setImageSrc(STOREFRONT_PRODUCT_PLACEHOLDER_SRC);
              }
            }}
          />

          <div className="absolute left-3 top-3 flex max-w-[calc(100%-5rem)] flex-wrap gap-1.5">
            {discountPercent ? (
              <span className="rounded-md bg-danger px-2 py-1 text-[11px] font-bold text-white">
                -{discountPercent}%
              </span>
            ) : null}

            {product.badges.slice(0, 2).map((badge) => (
              <span
                key={badge.id}
                className="rounded-md border border-border bg-surface/90 px-2 py-1 text-[11px] font-semibold text-text-muted"
              >
                {badge.label}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-3 p-3.5">
          <div className="space-y-1">
            {product.brandName ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                {product.brandName}
              </p>
            ) : null}

            <h3 className="line-clamp-2 min-h-[2.75rem] text-sm font-semibold leading-5 text-text">
              {product.productName}
            </h3>
          </div>

          <div className="flex items-center justify-between gap-3 text-[11px] text-text-muted">
            <span>
              {product.avgRating > 0
                ? `${product.avgRating.toFixed(1)} (${product.reviewCount})`
                : "No ratings"}
            </span>

            {product.soldCount > 0 ? (
              <span>{formatCompactNumber(product.soldCount)} sold</span>
            ) : null}
          </div>

          <div className="space-y-1">
            <div className="flex items-end gap-2">
              {shouldShowPricePending ? (
                <p className="text-sm font-bold leading-none text-warning">
                  Price pending
                </p>
              ) : (
                <p className="text-lg font-extrabold leading-none text-text">
                  {formatCurrency(product.price, product.currencyCode)}
                </p>
              )}

              {!shouldShowPricePending &&
              product.compareAtPrice &&
              product.compareAtPrice > product.price ? (
                <p className="text-xs line-through text-text-muted/70">
                  {formatCurrency(product.compareAtPrice, product.currencyCode)}
                </p>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className={availabilityToneClass}>{product.availabilityLabel}</span>
              {product.variantCount > 1 ? (
                <span className="text-text-muted">{product.variantCount} options</span>
              ) : null}
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
