import clsx from "clsx";
import Link from "next/link";
import type { ReactNode } from "react";

import { buttonClassName } from "@/components/ui/button";

type Tone = "slate" | "emerald" | "sky" | "amber" | "rose";
export type AdminButtonTone = Tone;

const badgeTones: Record<Tone, string> = {
  slate: "border-border bg-surface-alt text-text-muted",
  emerald: "border-success/20 bg-success/10 text-success",
  sky: "border-accent/20 bg-accent/10 text-accent",
  amber: "border-warning/20 bg-warning/10 text-warning",
  rose: "border-danger/20 bg-danger/10 text-danger",
};

export function AdminPage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={clsx("min-w-0 space-y-4", className)}>{children}</section>;
}

export function AdminPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={clsx(
        "min-w-0 overflow-hidden rounded-[1.35rem] border border-border bg-surface p-4 shadow-[0_16px_40px_rgba(15,23,42,0.045)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function AdminPageHeader({
  title,
  description,
  actions,
  meta,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <AdminPanel className="px-4 py-4 sm:px-5">
      <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0 space-y-1.5">
          <h1 className="break-words text-[1.55rem] font-semibold tracking-tight text-text sm:text-[1.85rem]">
            {title}
          </h1>

          {description ? (
            <p className="max-w-4xl break-words text-sm leading-5 text-text-muted">
              {description}
            </p>
          ) : null}

          {meta ? <div className="flex flex-wrap gap-2 pt-0.5">{meta}</div> : null}
        </div>

        {actions ? (
          <div className="flex w-full flex-wrap gap-3 xl:w-auto xl:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </AdminPanel>
  );
}

export function AdminSummaryStrip({
  items,
  columns = 4,
}: {
  items: Array<{
    label: string;
    value: ReactNode;
    hint?: string;
    tone?: Tone;
  }>;
  columns?: 2 | 3 | 4;
}) {
  return (
    <div
      className={clsx(
        "grid gap-4",
        columns === 2 && "sm:grid-cols-2",
        columns === 3 && "sm:grid-cols-2 xl:grid-cols-3",
        columns === 4 && "sm:grid-cols-2 xl:grid-cols-4",
      )}
    >
      {items.map((item) => (
        <AdminPanel key={item.label} className="min-w-0 p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1.5">
              <p className="text-sm font-medium text-text-muted">{item.label}</p>
              <p className="break-words text-[1.35rem] font-semibold tracking-tight text-text sm:text-[1.7rem]">
                {item.value}
              </p>
            </div>

            {item.tone ? <AdminBadge label={item.label} tone={item.tone} compact /> : null}
          </div>

          {item.hint ? (
            <p className="mt-2.5 break-words text-sm leading-5 text-text-muted">
              {item.hint}
            </p>
          ) : null}
        </AdminPanel>
      ))}
    </div>
  );
}

export function AdminSectionHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 space-y-1">
        <h2 className="break-words text-xl font-semibold tracking-tight text-text">
          {title}
        </h2>

        {description ? (
          <p className="break-words text-sm leading-6 text-text-muted">{description}</p>
        ) : null}
      </div>

      {actions ? <div className="flex w-full flex-wrap gap-2 lg:w-auto">{actions}</div> : null}
    </div>
  );
}

export function AdminTabs({
  items,
}: {
  items: Array<{
    href: string;
    label: string;
    active?: boolean;
  }>;
}) {
  return (
    <div className="max-w-full overflow-x-auto pb-1">
      <div className="flex min-w-max gap-2 rounded-[1.25rem] border border-border bg-surface-alt p-1">
        {items.map((item) => (
          <Link
            key={item.href}
            aria-current={item.active ? "page" : undefined}
            className={clsx(
              "shrink-0 rounded-[1rem] border border-transparent px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition",
              item.active
                ? "!border-primary !bg-primary !text-white shadow-sm"
                : "text-text-muted hover:bg-surface hover:text-text",
            )}
            href={item.href}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function AdminBadge({
  label,
  tone = "slate",
  compact = false,
}: {
  label: string;
  tone?: Tone;
  compact?: boolean;
}) {
  return (
    <span
      className={clsx(
        "inline-flex max-w-full whitespace-nowrap rounded-full border font-semibold uppercase tracking-[0.16em]",
        compact ? "px-2.5 py-1 text-[10px]" : "px-3 py-1 text-xs",
        badgeTones[tone],
      )}
    >
      {label}
    </span>
  );
}

export function AdminToolbar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <AdminPanel className={clsx("min-w-0 p-3.5", className)}>
      <div className="space-y-3">{children}</div>
    </AdminPanel>
  );
}

export function AdminFilterGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AdminField({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
  className,
  disabled = false,
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  placeholder?: string;
  type?: "text" | "number" | "date" | "email" | "url" | "password";
  className?: string;
  disabled?: boolean;
}) {
  return (
    <label className={clsx("grid min-w-0 gap-2", className)}>
      <span className="text-sm font-semibold text-text">{label}</span>
      <input
        className={clsx(
          "block w-full min-w-0 rounded-[0.95rem] border border-border bg-surface-alt px-3.5 py-2.5 text-sm text-text outline-none focus:border-primary/25 focus:ring-2 focus:ring-focus-ring/15",
          disabled && "cursor-not-allowed opacity-70",
        )}
        defaultValue={defaultValue}
        disabled={disabled}
        name={name}
        placeholder={placeholder}
        step={type === "number" ? "any" : undefined}
        type={type}
      />
    </label>
  );
}

export function AdminTextarea({
  label,
  name,
  defaultValue,
  placeholder,
  rows = 4,
  className,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <label className={clsx("grid min-w-0 gap-2", className)}>
      <span className="text-sm font-semibold text-text">{label}</span>
      <textarea
        className="block min-h-[104px] w-full min-w-0 max-w-full resize-y rounded-[0.95rem] border border-border bg-surface-alt px-3.5 py-2.5 text-sm text-text outline-none focus:border-primary/25 focus:ring-2 focus:ring-focus-ring/15"
        defaultValue={defaultValue}
        name={name}
        placeholder={placeholder}
        rows={rows}
      />
    </label>
  );
}

export function AdminSelect({
  label,
  name,
  defaultValue,
  options,
  className,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: Array<{ value?: string; id?: string; label: string }>;
  className?: string;
}) {
  return (
    <label className={clsx("grid min-w-0 gap-2", className)}>
      <span className="text-sm font-semibold text-text">{label}</span>
      <select
        className="block w-full min-w-0 rounded-[0.95rem] border border-border bg-surface-alt px-3.5 py-2.5 text-sm text-text outline-none focus:border-primary/25 focus:ring-2 focus:ring-focus-ring/15"
        defaultValue={defaultValue}
        name={name}
      >
        {options.map((option) => (
          <option key={option.value ?? option.id} value={option.value ?? option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function AdminCheckbox({
  label,
  name,
  defaultChecked,
  className,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
  className?: string;
}) {
  return (
    <label
      className={clsx(
        "flex w-full min-w-0 items-center gap-3 rounded-[0.95rem] border border-border bg-surface-alt px-3.5 py-2.5 text-sm font-semibold text-text",
        className,
      )}
    >
      <input defaultChecked={defaultChecked} name={name} type="checkbox" />
      <span className="min-w-0 break-words">{label}</span>
    </label>
  );
}

export function AdminFormGrid({
  children,
  columns = 2,
}: {
  children: ReactNode;
  columns?: 1 | 2 | 3;
}) {
  return (
    <div
      className={clsx(
        "grid gap-4",
        columns === 1 && "grid-cols-1",
        columns === 2 && "grid-cols-1 sm:grid-cols-2",
        columns === 3 && "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
      )}
    >
      {children}
    </div>
  );
}

export function AdminTableShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "max-w-full overflow-hidden rounded-[1.15rem] border border-border",
        className,
      )}
    >
      <div className="w-full overflow-x-auto bg-surface">{children}</div>
    </div>
  );
}

export function AdminTable({ children }: { children: ReactNode }) {
  return <table className="min-w-[860px] w-full text-left text-sm">{children}</table>;
}

export function AdminTableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-surface-alt text-xs uppercase tracking-[0.14em] text-text-muted">
      {children}
    </thead>
  );
}

export function AdminTableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-border">{children}</tbody>;
}

export function AdminTh({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <th className={clsx("whitespace-nowrap px-3 py-2.5 font-semibold", className)}>
      {children}
    </th>
  );
}

export function AdminTd({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <td className={clsx("px-3 py-3 align-top text-text-muted", className)}>{children}</td>;
}

export function AdminEmptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[1.4rem] border border-dashed border-border bg-surface-alt px-5 py-8 text-center">
      <p className="text-sm font-semibold text-text">{title}</p>
      <p className="mt-2 break-words text-sm leading-6 text-text-muted">{body}</p>
    </div>
  );
}

export function AdminPagination({
  page,
  totalPages,
  hrefBuilder,
}: {
  page: number;
  totalPages: number;
  hrefBuilder: (page: number) => string;
}) {
  if (totalPages <= 1) {
    return null;
  }

  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);

  for (let index = start; index <= end; index += 1) {
    pages.push(index);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-text-muted">
        Page {page} of {totalPages}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          aria-disabled={page <= 1}
          className={clsx(
            "rounded-full border px-4 py-2 text-sm font-semibold whitespace-nowrap",
            page <= 1
              ? "pointer-events-none border-border bg-surface-alt text-stone-400"
              : "border-border bg-surface text-text-muted",
          )}
          href={hrefBuilder(Math.max(1, page - 1))}
        >
          Previous
        </Link>

        {pages.map((item) => (
          <Link
            key={item}
            className={clsx(
              "rounded-full border px-4 py-2 text-sm font-semibold whitespace-nowrap",
              item === page
                ? "border-primary bg-primary text-white"
                : "border-border bg-surface text-text-muted",
            )}
            href={hrefBuilder(item)}
          >
            {item}
          </Link>
        ))}

        <Link
          aria-disabled={page >= totalPages}
          className={clsx(
            "rounded-full border px-4 py-2 text-sm font-semibold whitespace-nowrap",
            page >= totalPages
              ? "pointer-events-none border-border bg-surface-alt text-stone-400"
              : "border-border bg-surface text-text-muted",
          )}
          href={hrefBuilder(Math.min(totalPages, page + 1))}
        >
          Next
        </Link>
      </div>
    </div>
  );
}

export function AdminInlineHint({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <div
      className={clsx("rounded-[1rem] border px-4 py-3 text-sm break-words", badgeTones[tone])}
    >
      {children}
    </div>
  );
}

export function AdminActionButton({
  children,
  tone = "slate",
  type = "submit",
  name,
  value,
  disabled = false,
}: {
  children: ReactNode;
  tone?: Tone;
  type?: "submit" | "button";
  name?: string;
  value?: string;
  disabled?: boolean;
}) {
  return (
    <button
      className={clsx(
        buttonClassName({
          block: true,
          className: "sm:w-auto",
          variant:
            tone === "rose"
              ? "destructive"
              : tone === "slate"
                ? "primary"
                : "secondary",
        }),
        disabled && "cursor-not-allowed opacity-55",
      )}
      disabled={disabled}
      name={name}
      type={type}
      value={value}
    >
      {children}
    </button>
  );
}

export function AdminLinkButton({
  children,
  href,
  tone = "secondary",
  className,
}: {
  children: ReactNode;
  href: string;
  tone?: "primary" | "secondary";
  className?: string;
}) {
  return (
    <Link
      className={clsx(
        buttonClassName({
          block: true,
          className: "sm:w-auto",
          variant: tone === "primary" ? "primary" : "secondary",
        }),
        className,
      )}
      href={href}
    >
      {children}
    </Link>
  );
}
