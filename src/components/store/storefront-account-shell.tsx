import Link from "next/link";
import type { ReactNode } from "react";

import { StorefrontShell } from "@/components/store/storefront-shell";
import { buttonClassName } from "@/components/ui/button";

type StorefrontAccountShellProps = {
  children: ReactNode;
  currentPath: string;
  title: string;
  description: string;
};

const ACCOUNT_LINKS = [
  { href: "/account", label: "Overview" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/wishlist", label: "Wishlist" },
];

export function StorefrontAccountShell({
  children,
  currentPath,
  title,
  description,
}: StorefrontAccountShellProps) {
  return (
    <StorefrontShell>
      <section className="rounded-[2rem] border border-border bg-surface px-5 py-6 shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
          Account
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-text sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-text-muted">{description}</p>
      </section>

      <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="rounded-[1.75rem] border border-border bg-surface p-4 shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
            Navigation
          </p>
          <nav className="mt-4 grid gap-2">
            {ACCOUNT_LINKS.map((item) => {
              const isActive = currentPath === item.href;

              return (
                <Link
                  key={item.href}
                  className={
                    isActive
                      ? buttonClassName({ block: true, variant: "primary" })
                      : buttonClassName({ block: true, variant: "secondary" })
                  }
                  href={item.href}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </StorefrontShell>
  );
}
