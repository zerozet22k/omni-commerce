"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

import { useAppDispatch } from "@/lib/store/hooks";
import { setCartDrawerOpen, succeedCartMutation } from "@/lib/store/slices/cart-slice";

type AddToCartFormProps = {
  isAuthenticated: boolean;
  loginHref: string;
  productSlug: string;
  variants: Array<{
    id: string;
    variantName: string | null;
    sku: string;
    unitPrice: number;
    compareAtPrice: number | null;
    currencyCode: string;
    availableQty: number;
    isDefault: boolean;
    isActive: boolean;
  }>;
};

export function AddToCartForm({
  isAuthenticated,
  loginHref,
  productSlug,
  variants,
}: AddToCartFormProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const defaultVariant =
    variants.find((variant) => variant.isDefault) ?? variants[0] ?? null;
  const [variantId, setVariantId] = useState(defaultVariant?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const selectedVariant = variants.find((variant) => variant.id === variantId) ?? defaultVariant;
  const isOutOfStock = (selectedVariant?.availableQty ?? 0) <= 0;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isAuthenticated) {
      router.push(loginHref);
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
          variantId,
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
          message: "Added to cart.",
          openDrawer: true,
        }),
      );
      dispatch(setCartDrawerOpen(true));
      setMessage("Added to cart.");
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to add to cart.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-3">
        <label className="text-sm font-semibold text-slate-700" htmlFor={`${productSlug}-variant`}>
          Variant
        </label>
        <select
          className="rounded-[1.2rem] border border-stone-200 bg-white px-4 py-3 text-sm text-slate-950"
          id={`${productSlug}-variant`}
          onChange={(event) => setVariantId(event.target.value)}
          value={variantId}
        >
          {variants.map((variant) => (
            <option key={variant.id} value={variant.id}>
              {variant.variantName ?? variant.sku} - {variant.availableQty} in stock
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3">
        <label className="text-sm font-semibold text-slate-700" htmlFor={`${productSlug}-qty`}>
          Quantity
        </label>
        <input
          className="rounded-[1.2rem] border border-stone-200 bg-white px-4 py-3 text-sm text-slate-950"
          id={`${productSlug}-qty`}
          max={Math.max(selectedVariant?.availableQty ?? 1, 1)}
          min={1}
          onChange={(event) => {
            const nextQuantity = Number(event.target.value);
            setQuantity(Number.isFinite(nextQuantity) && nextQuantity > 0 ? nextQuantity : 1);
          }}
          type="number"
          value={quantity}
        />
      </div>

      {message ? (
        <p className="text-sm font-medium text-slate-600">{message}</p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          disabled={isPending || !selectedVariant || isOutOfStock}
          type="submit"
        >
          {isPending ? "Adding..." : isOutOfStock ? "Out of stock" : "Add to cart"}
        </button>
        <button
          className="rounded-full border border-stone-200 bg-white px-5 py-3 text-sm font-semibold text-slate-950"
          onClick={() => router.push("/cart")}
          type="button"
        >
          View cart
        </button>
      </div>
    </form>
  );
}
