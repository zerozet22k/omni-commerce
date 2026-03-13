import clsx from "clsx";
import type { ReactNode } from "react";

const toneClasses = {
  slate: {
    surface: "bg-primary text-white",
    ring: "border-border bg-surface-alt text-text-muted",
  },
  emerald: {
    surface: "bg-success text-white",
    ring: "border-success/20 bg-success/10 text-success",
  },
  sky: {
    surface: "bg-accent text-white",
    ring: "border-accent/20 bg-accent/10 text-accent",
  },
  amber: {
    surface: "bg-warning text-white",
    ring: "border-warning/20 bg-warning/10 text-warning",
  },
} as const;

type Tone = keyof typeof toneClasses;

export function DashboardPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={clsx(
        "rounded-[2rem] border border-border bg-surface p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function DashboardSectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-text-muted">
        {eyebrow}
      </p>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">
          {title}
        </h2>
        <p className="max-w-2xl text-sm leading-7 text-text-muted">{description}</p>
      </div>
    </div>
  );
}

export function DashboardMetricCard({
  label,
  value,
  hint,
  tone = "slate",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: Tone;
}) {
  return (
    <DashboardPanel className="overflow-hidden p-0">
      <div className="flex items-stretch">
        <div className={clsx("w-2 shrink-0", toneClasses[tone].surface)} />
        <div className="flex-1 p-5">
          <p className="text-sm font-medium text-text-muted">{label}</p>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-text">
            {value}
          </p>
          <p className="mt-3 text-sm leading-6 text-text-muted">{hint}</p>
        </div>
      </div>
    </DashboardPanel>
  );
}

export function DashboardStatusPill({
  label,
  tone = "slate",
}: {
  label: string;
  tone?: Tone;
}) {
  return (
    <span
      className={clsx(
        "inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
        toneClasses[tone].ring,
      )}
    >
      {label}
    </span>
  );
}

export function DashboardEmptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <DashboardPanel className="border-dashed bg-surface-alt">
      <p className="text-sm font-semibold text-text">{title}</p>
      <p className="mt-2 text-sm leading-7 text-text-muted">{body}</p>
    </DashboardPanel>
  );
}
