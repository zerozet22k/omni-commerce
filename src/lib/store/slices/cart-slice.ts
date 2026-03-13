import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { StorefrontCartSnapshot } from "@/modules/storefront/storefront.types";

type CartState = {
  isDrawerOpen: boolean;
  message: string | null;
  snapshot: StorefrontCartSnapshot | null;
  status: "idle" | "pending";
};

const initialState: CartState = {
  isDrawerOpen: false,
  message: null,
  snapshot: null,
  status: "idle",
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    clearCart(state) {
      state.isDrawerOpen = false;
      state.message = null;
      state.snapshot = null;
      state.status = "idle";
    },
    hydrateCart(state, action: PayloadAction<StorefrontCartSnapshot>) {
      state.snapshot = action.payload;
    },
    setCartMessage(state, action: PayloadAction<string | null>) {
      state.message = action.payload;
    },
    startCartMutation(state) {
      state.message = null;
      state.status = "pending";
    },
    succeedCartMutation(
      state,
      action: PayloadAction<{
        message?: string | null;
        openDrawer?: boolean;
        snapshot: StorefrontCartSnapshot;
      }>,
    ) {
      state.isDrawerOpen = action.payload.openDrawer ?? state.isDrawerOpen;
      state.message = action.payload.message ?? null;
      state.snapshot = action.payload.snapshot;
      state.status = "idle";
    },
    setCartDrawerOpen(state, action: PayloadAction<boolean>) {
      state.isDrawerOpen = action.payload;
    },
    failCartMutation(state, action: PayloadAction<string>) {
      state.message = action.payload;
      state.status = "idle";
    },
  },
});

export const {
  clearCart,
  failCartMutation,
  hydrateCart,
  setCartDrawerOpen,
  setCartMessage,
  startCartMutation,
  succeedCartMutation,
} = cartSlice.actions;

export const cartReducer = cartSlice.reducer;
