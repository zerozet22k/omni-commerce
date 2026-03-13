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
  setCartDrawerOpen,
  startCartMutation,
  succeedCartMutation,
} from "@/lib/store/slices/cart-slice";
import { formatCurrency } from "@/lib/utils/format";

export function StorefrontCartDrawer() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const snapshot = useAppSelector((state) => state.cart.snapshot);
  const isOpen = useAppSelector((state) => state.cart.isDrawerOpen);
  const message = useAppSelector((state) => state.cart.message);
  const [busyVariantId, setBusyVariantId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
        throw new Error(payload.message ?? "Unable to update cart.");
      }

      dispatch(
        succeedCartMutation({
          snapshot: payload,
          openDrawer: true,
        }),
      );
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
        throw new Error(payload.message ?? "Unable to remove item.");
      }

      dispatch(
        succeedCartMutation({
          snapshot: payload,
          openDrawer: true,
        }),
      );
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

  if (!isMounted) {
    return null;
  }

  return (
    <>
      <div
        aria-hidden={!isOpen}
        className={`fixed inset-0 z-40 bg-slate-950/40 transition ${isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => dispatch(setCartDrawerOpen(false))}
      />
      <aside
        aria-hidden={!isOpen}
        className={`fixed top-0 right-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border bg-surface shadow-[0_24px_90px_rgba(15,23,42,0.18)] transition-transform duration-200 ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
              Cart
            </p>
            <h2 className="mt-1 text-lg font-semibold text-text">
              Current order
            </h2>
          </div>
          <button
            className={buttonClassName({ size: "sm", variant: "secondary" })}
            onClick={() => dispatch(setCartDrawerOpen(false))}
            type="button"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!snapshot || snapshot.items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface px-5 py-8 text-center">
              <h3 className="text-base font-semibold text-text">
                Your cart is empty
              </h3>
              <p className="mt-2 text-sm leading-6 text-text-muted">
                Add products and they will appear here with live totals.
              </p>
              <Link
                className={`mt-4 ${buttonClassName({ variant: "primary" })}`}
                href="/shop"
                onClick={() => dispatch(setCartDrawerOpen(false))}
              >
                Browse products
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {snapshot.items.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-border bg-surface p-4"
                >
                  <div className="flex gap-3">
                    <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl bg-surface-alt">
                      <Image
                        alt={item.productName}
                        className="object-cover"
                        fill
                        sizes="72px"
                        src={storefrontAssetUrl(
                          item.primaryImageAssetId,
                          STOREFRONT_PRODUCT_PLACEHOLDER_SRC,
                        )}
                        unoptimized={Boolean(item.primaryImageAssetId)}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        className="line-clamp-2 text-sm font-semibold text-text"
                        href={`/shop/${item.productSlug}`}
                        onClick={() => dispatch(setCartDrawerOpen(false))}
                      >
                        {item.productName}
                      </Link>
                      <p className="mt-1 text-xs text-text-muted">
                        {item.variantName ?? item.sku}
                      </p>
                      <p
                        className={`mt-1 text-xs ${item.isPurchasable ? "text-text-muted" : "text-warning"}`}
                      >
                        {item.trackInventory && item.availableQty > 0
                          ? `${item.availableQty} available`
                          : item.availabilityLabel}
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <div className="inline-flex items-center rounded-xl border border-border bg-surface-alt">
                          <button
                            className="h-9 w-9 text-sm font-bold text-text-muted"
                            disabled={busyVariantId === item.variantId || item.quantity <= 1}
                            onClick={() =>
                              void updateQuantity(item.variantId, Math.max(1, item.quantity - 1))
                            }
                            type="button"
                          >
                            -
                          </button>
                          <span className="min-w-8 text-center text-sm font-semibold text-text">
                            {item.quantity}
                          </span>
                          <button
                            className="h-9 w-9 text-sm font-bold text-text-muted"
                            disabled={busyVariantId === item.variantId}
                            onClick={() =>
                              void updateQuantity(item.variantId, item.quantity + 1)
                            }
                            type="button"
                          >
                            +
                          </button>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-text">
                            {formatCurrency(item.lineTotal, snapshot.cart.currencyCode)}
                          </p>
                          <button
                            className="mt-1 text-xs font-semibold text-text-muted hover:text-danger"
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
          )}
        </div>

        {snapshot ? (
          <div className="border-t border-border bg-surface px-5 py-4">
            <div className="space-y-2 text-sm text-text-muted">
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(snapshot.cart.subtotal, snapshot.cart.currencyCode)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Shipping</span>
                <span>{formatCurrency(snapshot.cart.shippingFee, snapshot.cart.currencyCode)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3 text-base font-semibold text-text">
                <span>Total</span>
                <span>{formatCurrency(snapshot.cart.grandTotal, snapshot.cart.currencyCode)}</span>
              </div>
            </div>
            {message ? <p className="mt-3 text-sm text-text-muted">{message}</p> : null}
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Link
                className={buttonClassName({ block: true, variant: "secondary" })}
                href="/cart"
                onClick={() => dispatch(setCartDrawerOpen(false))}
              >
                View cart
              </Link>
              <Link
                className={buttonClassName({ block: true, variant: "primary" })}
                href="/checkout"
                onClick={() => dispatch(setCartDrawerOpen(false))}
              >
                Checkout
              </Link>
            </div>
          </div>
        ) : null}
      </aside>
    </>
  );
}
