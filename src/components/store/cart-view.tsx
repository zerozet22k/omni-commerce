"use client";

import Image from "next/image";
import Link from "next/link";
import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { buttonClassName } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  STOREFRONT_PRODUCT_PLACEHOLDER_SRC,
  storefrontAssetUrl,
} from "@/lib/storefront/placeholders";
import {
  failCartMutation,
  hydrateCart,
  setCartMessage,
  startCartMutation,
  succeedCartMutation,
} from "@/lib/store/slices/cart-slice";
import { formatCurrency } from "@/lib/utils/format";
import type { StorefrontCartSnapshot } from "@/modules/storefront/storefront.types";

type CartViewProps = {
  initialSnapshot: StorefrontCartSnapshot;
};

export function CartView({ initialSnapshot }: CartViewProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const snapshot = useAppSelector((state) => state.cart.snapshot) ?? initialSnapshot;
  const message = useAppSelector((state) => state.cart.message);
  const [quantities, setQuantities] = useState<Record<string, string>>(
    Object.fromEntries(
      initialSnapshot.items.map((item) => [item.variantId, String(item.quantity)]),
    ),
  );
  const [busyVariantId, setBusyVariantId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(hydrateCart(initialSnapshot));
  }, [dispatch, initialSnapshot]);

  useEffect(() => {
    setQuantities(
      Object.fromEntries(
        snapshot.items.map((item) => [item.variantId, String(item.quantity)]),
      ),
    );
  }, [snapshot]);

  async function updateQuantity(variantId: string, quantity: number) {
    setBusyVariantId(variantId);
    dispatch(startCartMutation());

    try {
      const response = await fetch(`/api/store/cart/items/${variantId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ quantity }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to update cart item.");
      }

      dispatch(succeedCartMutation({ snapshot: payload }));
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      dispatch(
        failCartMutation(
          error instanceof Error ? error.message : "Unable to update cart.",
        ),
      );
    } finally {
      setBusyVariantId(null);
    }
  }

  async function removeItem(variantId: string) {
    setBusyVariantId(variantId);
    dispatch(startCartMutation());

    try {
      const response = await fetch(`/api/store/cart/items/${variantId}`, {
        method: "DELETE",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to remove cart item.");
      }

      dispatch(succeedCartMutation({ snapshot: payload }));
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      dispatch(
        failCartMutation(
          error instanceof Error ? error.message : "Unable to remove item.",
        ),
      );
    } finally {
      setBusyVariantId(null);
    }
  }

  if (snapshot.items.length === 0) {
    return (
      <section className="rounded-[1.75rem] border border-dashed border-border bg-surface px-6 py-12 text-center shadow-[0_10px_30px_rgba(15,23,42,0.03)]">
        <h2 className="text-2xl font-bold text-text">Your cart is empty</h2>
        <p className="mt-3 text-sm leading-7 text-text-muted">
          Add products from the catalog and they will appear here with live pricing
          and stock checks.
        </p>
        <div className="mt-6">
          <Link className={buttonClassName({ variant: "primary" })} href="/shop">
            Browse products
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_360px]">
      <div className="space-y-4">
        {snapshot.items.map((item) => (
          <article
            key={item.id}
            className="rounded-[1.75rem] border border-border bg-surface p-5 shadow-[0_12px_36px_rgba(15,23,42,0.04)]"
          >
            <div className="flex gap-4">
              <div className="relative h-[104px] w-[104px] shrink-0 overflow-hidden rounded-[1.25rem] bg-surface-alt">
                <Image
                  alt={item.productName}
                  className="object-cover"
                  fill
                  sizes="104px"
                  src={storefrontAssetUrl(
                    item.primaryImageAssetId,
                    STOREFRONT_PRODUCT_PLACEHOLDER_SRC,
                  )}
                  unoptimized={Boolean(item.primaryImageAssetId)}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link
                      className="line-clamp-2 text-base font-bold text-text hover:text-accent"
                      href={`/shop/${item.productSlug}`}
                    >
                      {item.productName}
                    </Link>
                    <p className="mt-2 text-sm text-text-muted">
                      {item.variantName ?? item.sku}
                    </p>
                    <p
                      className={`mt-1 text-sm ${item.isPurchasable ? "text-text-muted" : "text-warning"}`}
                    >
                      {item.trackInventory && item.availableQty > 0
                        ? `${item.availableQty} available right now`
                        : item.availabilityLabel}
                    </p>
                  </div>
                  <p className="text-right text-base font-bold text-text">
                    {formatCurrency(item.lineTotal, snapshot.cart.currencyCode)}
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex items-center rounded-xl border border-border bg-surface-alt">
                    <button
                      className="h-10 w-10 text-lg font-bold text-text-muted"
                      disabled={busyVariantId === item.variantId || item.quantity <= 1}
                      onClick={() =>
                        setQuantities((current) => ({
                          ...current,
                          [item.variantId]: String(
                            Math.max(1, Number(current[item.variantId] ?? item.quantity) - 1),
                          ),
                        }))
                      }
                      type="button"
                    >
                      -
                    </button>
                    <input
                      className="h-10 w-14 bg-transparent text-center text-sm font-semibold text-text outline-none"
                      disabled={busyVariantId === item.variantId}
                      min={1}
                      onChange={(event) =>
                        setQuantities((current) => ({
                          ...current,
                          [item.variantId]: event.target.value,
                        }))
                      }
                      type="number"
                      value={quantities[item.variantId] ?? String(item.quantity)}
                    />
                    <button
                      className="h-10 w-10 text-lg font-bold text-text-muted"
                      disabled={busyVariantId === item.variantId}
                      onClick={() =>
                        setQuantities((current) => ({
                          ...current,
                          [item.variantId]: String(
                            Number(current[item.variantId] ?? item.quantity) + 1,
                          ),
                        }))
                      }
                      type="button"
                    >
                      +
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      className={buttonClassName({ size: "sm", variant: "secondary" })}
                      disabled={busyVariantId === item.variantId}
                      onClick={() => {
                        const nextQuantity = Number(quantities[item.variantId] ?? item.quantity);

                        if (!Number.isFinite(nextQuantity) || nextQuantity <= 0) {
                          dispatch(setCartMessage("Quantity must be greater than zero."));
                          return;
                        }

                        void updateQuantity(item.variantId, nextQuantity);
                      }}
                      type="button"
                    >
                      Update
                    </button>
                    <button
                      className={buttonClassName({ size: "sm", variant: "destructive" })}
                      disabled={busyVariantId === item.variantId}
                      onClick={() => void removeItem(item.variantId)}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      <aside className="rounded-[1.75rem] border border-border bg-surface p-5 shadow-[0_12px_36px_rgba(15,23,42,0.04)] xl:sticky xl:top-28 xl:h-fit">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
          Order summary
        </p>
        <div className="mt-5 space-y-4 text-sm text-text-muted">
          <div className="flex items-center justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(snapshot.cart.subtotal, snapshot.cart.currencyCode)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Shipping</span>
            <span>{formatCurrency(snapshot.cart.shippingFee, snapshot.cart.currencyCode)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Tax</span>
            <span>{formatCurrency(snapshot.cart.taxTotal, snapshot.cart.currencyCode)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-4 text-base font-bold text-text">
            <span>Total</span>
            <span>{formatCurrency(snapshot.cart.grandTotal, snapshot.cart.currencyCode)}</span>
          </div>
        </div>
        {message ? (
          <p className="mt-4 rounded-xl border border-border bg-surface-alt px-3 py-2 text-sm text-text-muted">
            {message}
          </p>
        ) : null}
        <div className="mt-5 grid gap-2">
          <Link className={buttonClassName({ block: true, variant: "primary" })} href="/checkout">
            Continue to checkout
          </Link>
          <Link className={buttonClassName({ block: true, variant: "secondary" })} href="/shop">
            Keep shopping
          </Link>
        </div>
      </aside>
    </section>
  );
}
