import Link from "next/link";

import { buttonClassName } from "@/components/ui/button";

type StorefrontPaginationProps = {
  buildHref: (page: number) => string;
  page: number;
  totalPages: number;
};

function buildPageWindow(page: number, totalPages: number) {
  const pages = new Set<number>([1, totalPages, page - 1, page, page + 1]);

  if (page <= 3) {
    pages.add(2);
    pages.add(3);
  }

  if (page >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
  }

  return [...pages]
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((left, right) => left - right);
}

export function StorefrontPagination({
  buildHref,
  page,
  totalPages,
}: StorefrontPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const windowPages = buildPageWindow(page, totalPages);

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-3 py-3"
    >
      <Link
        aria-disabled={page <= 1}
        className={`${
          page <= 1
            ? "pointer-events-none inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold text-stone-400"
            : buttonClassName({ size: "sm", variant: "secondary" })
        }`}
        href={buildHref(Math.max(1, page - 1))}
      >
        Previous
      </Link>
      {windowPages.map((value, index) => {
        const previous = windowPages[index - 1];
        const showGap = previous && value - previous > 1;

        return (
          <span key={value} className="inline-flex items-center gap-2">
            {showGap ? <span className="px-1 text-sm text-text-muted/70">...</span> : null}
            <Link
              aria-current={value === page ? "page" : undefined}
              className={
                value === page
                  ? buttonClassName({ className: "min-w-10 px-3", size: "sm", variant: "primary" })
                  : buttonClassName({ className: "min-w-10 px-3", size: "sm", variant: "secondary" })
              }
              href={buildHref(value)}
            >
              {value}
            </Link>
          </span>
        );
      })}
      <Link
        aria-disabled={page >= totalPages}
        className={`${
          page >= totalPages
            ? "pointer-events-none inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold text-stone-400"
            : buttonClassName({ size: "sm", variant: "secondary" })
        }`}
        href={buildHref(Math.min(totalPages, page + 1))}
      >
        Next
      </Link>
    </nav>
  );
}
