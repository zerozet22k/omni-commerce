import clsx from "clsx";
import Link from "next/link";
import type { ReactNode } from "react";

type AdminRouteOverlayProps = {
  children: ReactNode;
  closeHref: string;
  description?: string;
  size?: "md" | "xl";
  title: string;
};

export function AdminRouteOverlay({
  children,
  closeHref,
  description,
  size = "xl",
  title,
}: AdminRouteOverlayProps) {
  return (
    <div className="fixed inset-0 z-[70] px-4 py-8 sm:py-10">
      <Link
        aria-label="Close overlay"
        className="absolute inset-0 bg-slate-950/45"
        href={closeHref}
      />

      <div className="relative flex h-full items-start justify-center sm:items-center">
        <div
          className={clsx(
            "w-full overflow-hidden rounded-[1.5rem] border border-stone-200 bg-white shadow-[0_22px_80px_rgba(15,23,42,0.22)]",
            size === "md" ? "max-w-2xl" : "max-w-6xl",
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-stone-200 px-5 py-4">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h2>
              {description ? (
                <p className="text-sm leading-6 text-slate-600">{description}</p>
              ) : null}
            </div>

            <Link
              className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-stone-100"
              href={closeHref}
            >
              Close
            </Link>
          </div>

          <div className="max-h-[82vh] overflow-y-auto px-5 py-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
