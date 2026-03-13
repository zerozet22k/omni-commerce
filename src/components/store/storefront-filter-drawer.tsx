"use client";

import { useState, type ReactNode } from "react";

import { buttonClassName } from "@/components/ui/button";

type StorefrontFilterDrawerProps = {
  children: ReactNode;
};

export function StorefrontFilterDrawer({
  children,
}: StorefrontFilterDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        className={`lg:hidden ${buttonClassName({ variant: "secondary" })}`}
        onClick={() => setIsOpen(true)}
        type="button"
      >
        Filters
      </button>
      <div
        aria-hidden={!isOpen}
        className={`fixed inset-0 z-40 bg-slate-950/40 transition ${isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => setIsOpen(false)}
      />
      <div
        className={`fixed top-0 left-0 z-50 h-full w-full max-w-sm overflow-y-auto border-r border-border bg-surface p-4 transition-transform duration-200 lg:hidden ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
              Filters
            </p>
            <h2 className="mt-1 text-lg font-semibold text-text">
              Refine results
            </h2>
          </div>
          <button
            className={buttonClassName({ size: "sm", variant: "secondary" })}
            onClick={() => setIsOpen(false)}
            type="button"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </>
  );
}
