"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

import { buttonClassName } from "@/components/ui/button";

type WishlistToggleProps = {
  initialInWishlist: boolean;
  isAuthenticated: boolean;
  loginHref: string;
  productId: string;
};

export function WishlistToggle({
  initialInWishlist,
  isAuthenticated,
  loginHref,
  productId,
}: WishlistToggleProps) {
  const router = useRouter();
  const [isInWishlist, setIsInWishlist] = useState(initialInWishlist);
  const [isPending, setIsPending] = useState(false);

  async function handleToggle() {
    if (!isAuthenticated) {
      router.push(loginHref);
      return;
    }

    setIsPending(true);

    try {
      const response = await fetch("/api/store/wishlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productId }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to update wishlist.");
      }

      setIsInWishlist(Boolean(payload.inWishlist));
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <button
      aria-label={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
      className={buttonClassName({
        className: isInWishlist ? "border-danger/20 bg-danger/10 text-danger" : "",
        size: "icon",
        variant: isInWishlist ? "destructive" : "secondary",
      })}
      disabled={isPending}
      onClick={handleToggle}
      type="button"
    >
      <svg
        aria-hidden="true"
        className="h-4 w-4"
        fill={isInWishlist ? "currentColor" : "none"}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        <path d="M12 20.25 4.5 12.98a4.86 4.86 0 0 1 0-6.96 4.98 4.98 0 0 1 7.05 0L12 6.47l.45-.45a4.98 4.98 0 0 1 7.05 0 4.86 4.86 0 0 1 0 6.96L12 20.25Z" />
      </svg>
    </button>
  );
}
