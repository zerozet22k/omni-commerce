"use client";

import { useEffect } from "react";

import { useAppDispatch } from "@/lib/store/hooks";
import { hydrateCart } from "@/lib/store/slices/cart-slice";
import type { StorefrontCartSnapshot } from "@/modules/storefront/storefront.types";

export function StorefrontCartHydrator({
  snapshot,
}: {
  snapshot: StorefrontCartSnapshot;
}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(hydrateCart(snapshot));
  }, [dispatch, snapshot]);

  return null;
}
