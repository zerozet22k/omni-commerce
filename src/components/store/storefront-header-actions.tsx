"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { buttonClassName } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { setCartDrawerOpen } from "@/lib/store/slices/cart-slice";

type StorefrontHeaderActionsProps = {
  accountHref: string;
  accountLabel: string;
  initialCartCount: number;
  isAuthenticated: boolean;
  wishlistCount: number;
};

export function StorefrontHeaderActions({
  accountHref,
  accountLabel,
  initialCartCount,
  isAuthenticated,
  wishlistCount,
}: StorefrontHeaderActionsProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const snapshot = useAppSelector((state) => state.cart.snapshot);
  const cartCount =
    snapshot?.items.reduce((sum, item) => sum + item.quantity, 0) ?? initialCartCount;

  if (!isAuthenticated) {
    return (
      <div className="flex flex-nowrap items-center gap-2">
        <Link
          className={buttonClassName({ className: "shrink-0", variant: "secondary" })}
          href="/login"
        >
          Account
        </Link>
        <Link
          className={buttonClassName({ className: "shrink-0 !text-white", variant: "primary" })}
          href="/login?next=%2Fcart"
        >
          Cart
          <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-white/15 px-1.5 text-[11px] font-bold">
            0
          </span>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-nowrap items-center gap-2">
      <Link
        aria-label="Wishlist"
        className={buttonClassName({
          className: "relative shrink-0",
          size: "icon",
          variant: "secondary",
        })}
        href="/wishlist"
      >
        <span className="relative inline-flex items-center justify-center">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Wish</span>
          {wishlistCount > 0 ? (
            <span className="absolute bottom-full left-1/2 mb-0.5 inline-flex min-w-5 -translate-x-1/2 items-center justify-center rounded-full bg-slate-900 px-1.5 text-[10px] font-bold text-white">
              {wishlistCount > 99 ? "99+" : wishlistCount}
            </span>
          ) : null}
        </span>
      </Link>
      <Link
        className={buttonClassName({ className: "shrink-0", variant: "secondary" })}
        href={accountHref}
      >
        {accountLabel}
      </Link>
      <button
        aria-label="Open cart"
        className={buttonClassName({ className: "shrink-0 !text-white", variant: "primary" })}
        onClick={() => {
          if (!snapshot) {
            router.push("/cart");
            return;
          }

          dispatch(setCartDrawerOpen(true));
        }}
        type="button"
      >
        Cart
        <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-white/15 px-1.5 text-[11px] font-bold">
          {cartCount}
        </span>
      </button>
    </div>
  );
}
