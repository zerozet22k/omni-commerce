"use client";

import clsx from "clsx";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

type AdminQuickCreateModalProps = {
  triggerLabel: string;
  title: string;
  description?: string;
  size?: "md" | "xl";
  children: ReactNode;
};

export function AdminQuickCreateModal({
  triggerLabel,
  title,
  description,
  size = "md",
  children,
}: AdminQuickCreateModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <>
      <button
        className="inline-flex w-full items-center justify-center rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition sm:w-auto"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        {triggerLabel}
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-center bg-slate-950/45 px-4 py-8 sm:items-center"
          onClick={() => setIsOpen(false)}
        >
          <div
            className={clsx(
              "w-full overflow-hidden rounded-[1.5rem] border border-stone-200 bg-white shadow-[0_22px_80px_rgba(15,23,42,0.22)]",
              size === "md" ? "max-w-2xl" : "max-w-6xl",
            )}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-stone-200 px-5 py-4">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                  {title}
                </h2>
                {description ? (
                  <p className="text-sm leading-6 text-slate-600">{description}</p>
                ) : null}
              </div>

              <button
                className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-stone-100"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                Close
              </button>
            </div>

            <div className="max-h-[82vh] overflow-y-auto px-5 py-5">{children}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
