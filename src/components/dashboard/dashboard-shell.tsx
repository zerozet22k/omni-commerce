"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { buttonClassName } from "@/components/ui/button";

type DashboardShellProps = {
  children: ReactNode;
  user: {
    fullName: string;
    email: string | null;
    role: string;
  };
  workspace: {
    storeName: string;
    storeSlug: string;
    unreadNotifications: number;
    navigationCount: number;
  };
  navigation: Array<{
    group: string;
    href: string;
    label: string;
    summary: string;
    children?: Array<{
      href: string;
      label: string;
      match?: "exact" | "section";
    }>;
  }>;
};

type NavigationItem = DashboardShellProps["navigation"][number];
type NavigationChild = NonNullable<NavigationItem["children"]>[number];
type SectionItem = Omit<NavigationItem, "children"> & {
  children: NavigationChild[];
};

function normalizePath(value: string) {
  return value && value !== "/" && value.endsWith("/")
    ? value.replace(/\/+$/, "")
    : value || "/";
}

function getMonogram(value: string) {
  const segments = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (segments.length > 0) {
    return segments.map((segment) => segment[0]).join("").toUpperCase();
  }

  return value.slice(0, 2).toUpperCase() || "?";
}

function NavigationIcon({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  const iconClassName = clsx("size-5 shrink-0", className);

  switch (label) {
    case "Overview":
      return (
        <svg aria-hidden="true" className={iconClassName} viewBox="0 0 20 20">
          <path
            d="M3.5 4.5h5v5h-5zm8 0h5v3h-5zm0 6h5v5h-5zm-8 6h5v-3h-5z"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
        </svg>
      );
    case "Account":
      return (
        <svg aria-hidden="true" className={iconClassName} viewBox="0 0 20 20">
          <path
            d="M10 10a3.25 3.25 0 1 0 0-6.5A3.25 3.25 0 0 0 10 10Zm-5 6.5a5 5 0 0 1 10 0"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
        </svg>
      );
    case "Catalog":
      return (
        <svg aria-hidden="true" className={iconClassName} viewBox="0 0 20 20">
          <path
            d="M4 5.25 10 2l6 3.25v9.5L10 18l-6-3.25zM4 5.25 10 9l6-3.75M10 9v9"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
        </svg>
      );
    case "Inventory":
      return (
        <svg aria-hidden="true" className={iconClassName} viewBox="0 0 20 20">
          <path
            d="M4 6.25h12M4 10h12M4 13.75h12M6 4h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
        </svg>
      );
    case "Suppliers":
      return (
        <svg aria-hidden="true" className={iconClassName} viewBox="0 0 20 20">
          <path
            d="M4 6.5h4.5V11H4zm7.5 2.5H16M11.5 6.5H16M11.5 11.5H16M6.25 13.5h7.5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
        </svg>
      );
    case "Sales":
      return (
        <svg aria-hidden="true" className={iconClassName} viewBox="0 0 20 20">
          <path
            d="M4 15.5h12M6.5 12.5V9.5M10 12.5V5.5M13.5 12.5V7.5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
        </svg>
      );
    case "Content":
      return (
        <svg aria-hidden="true" className={iconClassName} viewBox="0 0 20 20">
          <path
            d="M6 3.5h6l3 3v10H6a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Zm6 0v3h3M7 10h6M7 13h6"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
        </svg>
      );
    case "Users":
      return (
        <svg aria-hidden="true" className={iconClassName} viewBox="0 0 20 20">
          <path
            d="M7 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm6 1a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-10 5a4 4 0 0 1 8 0m1.5 0a3.5 3.5 0 0 1 4.5-3.35"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
        </svg>
      );
    case "Settings":
      return (
        <svg aria-hidden="true" className={iconClassName} viewBox="0 0 20 20">
          <path
            d="m10 3 1.25 1.4 1.86-.12.74 1.72 1.72.74-.12 1.86L17 10l-1.4 1.25.12 1.86-1.72.74-.74 1.72-1.86-.12L10 17l-1.25-1.4-1.86.12-.74-1.72-1.72-.74.12-1.86L3 10l1.4-1.25-.12-1.86 1.72-.74.74-1.72 1.86.12ZM10 12.75a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5Z"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
        </svg>
      );
    default:
      return (
        <span className={clsx("text-sm font-semibold tracking-[0.16em]", className)}>
          {getMonogram(label)}
        </span>
      );
  }
}

function PanelToggleIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={clsx("size-4 transition-transform duration-200", collapsed && "rotate-180")}
      viewBox="0 0 16 16"
    >
      <path
        d="M10 3.5 5.5 8 10 12.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg aria-hidden="true" className="size-4" viewBox="0 0 16 16">
      {open ? (
        <path
          d="m4 4 8 8M12 4 4 12"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
      ) : (
        <path
          d="M3.5 5h9M3.5 8h9M3.5 11h9"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
      )}
    </svg>
  );
}

function RailFlyout({
  active,
  label,
}: {
  active: boolean;
  label: string;
}) {
  return (
    <span
      className={clsx(
        "pointer-events-none absolute left-full top-1/2 z-20 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-semibold shadow-[0_14px_30px_rgba(15,23,42,0.16)] group-hover:flex group-focus-within:flex",
        active
          ? "border-primary bg-primary text-white"
          : "border-border bg-surface text-text",
      )}
    >
      {label}
    </span>
  );
}

export function DashboardShell({
  children,
  user,
  workspace,
  navigation,
}: DashboardShellProps) {
  const pathname = usePathname();
  const currentPath = normalizePath(pathname);

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [manualSection, setManualSection] = useState<{
    href: string;
    path: string;
  } | null>(null);

  const isCustomer = user.role === "CUSTOMER";
  const workspaceLabel = isCustomer ? "Customer" : "Operations";
  const workspaceDescription = isCustomer
    ? "Track your orders, delivery updates, and account details in one place."
    : "Manage orders, catalog, inventory, suppliers, customers, and store settings from one workspace.";
  const notificationLabel = isCustomer ? "notifications" : "alerts";

  const matchesPath = (href: string) => {
    const normalizedHref = normalizePath(href);
    return normalizedHref === "/dashboard"
      ? currentPath === normalizedHref
      : currentPath === normalizedHref || currentPath.startsWith(`${normalizedHref}/`);
  };

  const matchesChildPath = (href: string, match: "exact" | "section" = "section") => {
    const normalizedHref = normalizePath(href);

    if (match === "exact") {
      return currentPath === normalizedHref;
    }

    return matchesPath(normalizedHref);
  };

const sectionItems: SectionItem[] = navigation.map((item) => ({
  ...item,
  children:
    item.children?.length
      ? item.children
      : [
          {
            href: item.href,
            label: item.label,
            match: "section" as const,
          },
        ],
}));

  const activeItem =
    sectionItems.find(
      (item) =>
        matchesPath(item.href) ||
        item.children.some((child) => matchesChildPath(child.href, child.match)),
    ) ??
    sectionItems[0] ??
    null;

  const previewItem =
    manualSection && manualSection.path === currentPath
      ? sectionItems.find((item) => item.href === manualSection.href) ?? null
      : null;

  const selectedItem = previewItem ?? activeItem ?? sectionItems[0] ?? null;
  const contextualLinks = selectedItem?.children ?? [];

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-text">
      <div
        className={clsx(
          "max-w-full lg:grid lg:min-h-screen lg:transition-[grid-template-columns] lg:duration-200",
          isPanelCollapsed
            ? "lg:grid-cols-[88px_minmax(0,1fr)]"
            : "lg:grid-cols-[88px_280px_minmax(0,1fr)]",
        )}
      >
        <div
          className={clsx(
            "fixed inset-0 z-40 bg-primary/35 transition lg:hidden",
            isMobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          onClick={() => setIsMobileOpen(false)}
        />

        <aside className="hidden h-screen border-r border-border bg-surface lg:sticky lg:top-0 lg:flex lg:flex-col">
          <div className="flex h-full min-h-0 flex-col px-3 py-4">
            <Link
              className="group relative flex items-center justify-center"
              href="/dashboard"
              onClick={() => setManualSection(null)}
              title={workspace.storeName}
            >
              <span className="flex size-12 items-center justify-center rounded-2xl border border-border bg-surface-alt text-sm font-semibold tracking-[0.16em] text-text shadow-sm">
                {getMonogram(workspace.storeName)}
              </span>
              <RailFlyout active={false} label={workspace.storeName} />
            </Link>

            <nav className="dashboard-sidebar-scrollbar mt-5 flex-1 overflow-y-auto overflow-x-clip">
              <div className="flex flex-col gap-2 pb-3">
                {sectionItems.map((item) => {
                  const isActive = item.href === activeItem?.href;
                  const isSelected = item.href === selectedItem?.href;

                  const tileClassName = clsx(
                    "group relative flex items-center justify-center rounded-2xl border p-3 shadow-sm transition",
                    isActive
                      ? "border-primary bg-primary text-white hover:text-white"
                      : isSelected
                        ? "border-border bg-surface-alt text-text"
                        : "border-transparent bg-transparent text-text-muted hover:border-border hover:bg-surface-alt hover:text-text",
                  );

                  const iconClassName = isActive
                    ? "text-white"
                    : isSelected
                      ? "text-text"
                      : "text-text-muted group-hover:text-text";

                  return (
                    <button
                      key={item.href}
                      aria-current={isActive ? "page" : undefined}
                      aria-label={item.label}
                      className={tileClassName}
                      onClick={() => {
                        setManualSection((current) =>
                          current?.href === item.href && current.path === currentPath
                            ? null
                            : { href: item.href, path: currentPath },
                        );
                        setIsPanelCollapsed(false);
                      }}
                      title={item.label}
                      type="button"
                    >
                      <NavigationIcon className={iconClassName} label={item.label} />
                      <RailFlyout active={isActive} label={item.label} />
                    </button>
                  );
                })}
              </div>
            </nav>

            <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
              <button
                aria-label={isPanelCollapsed ? "Expand navigation panel" : "Collapse navigation panel"}
                className={clsx(
                  buttonClassName({ size: "icon", variant: "secondary" }),
                  "relative mx-auto",
                )}
                onClick={() => setIsPanelCollapsed((current) => !current)}
                title={isPanelCollapsed ? "Expand navigation panel" : "Collapse navigation panel"}
                type="button"
              >
                <PanelToggleIcon collapsed={isPanelCollapsed} />
              </button>

              <Link
                aria-label="Public site"
                className="group relative mx-auto flex size-10 items-center justify-center rounded-xl border border-border bg-surface-alt text-xs font-semibold uppercase tracking-[0.14em] text-text-muted transition hover:text-text"
                href="/"
                onClick={() => setManualSection(null)}
                title="Public site"
              >
                Site
                <RailFlyout active={false} label="Public site" />
              </Link>

              <form action="/api/auth/logout" className="group relative mx-auto" method="post">
                <button
                  className="flex size-10 items-center justify-center rounded-xl border border-border bg-surface text-xs font-semibold uppercase tracking-[0.14em] text-text-muted transition hover:bg-surface-alt hover:text-text"
                  type="submit"
                >
                  Out
                </button>
                <RailFlyout active={false} label="Sign out" />
              </form>
            </div>
          </div>
        </aside>

        {!isPanelCollapsed ? (
          <aside className="hidden h-screen border-r border-border bg-surface-alt/75 lg:sticky lg:top-0 lg:flex lg:flex-col">
            <div className="flex h-full min-h-0 flex-col px-5 py-5">
              <div className="rounded-[1.6rem] border border-border bg-surface p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-muted">
                  {workspace.storeSlug}
                </p>
                <h1 className="mt-2 text-xl font-semibold tracking-tight text-text">
                  {selectedItem?.label ?? workspace.storeName}
                </h1>
                <p className="mt-2 text-sm leading-6 text-text-muted">
                  {selectedItem?.summary ?? workspaceDescription}
                </p>
              </div>

              <div className="mt-4 rounded-[1.5rem] border border-border bg-surface p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-muted">
                  Signed in
                </p>
                <div className="mt-3 flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-surface-alt text-sm font-semibold text-text">
                    {getMonogram(user.fullName)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-text">{user.fullName}</p>
                    <p className="mt-1 truncate text-sm text-text-muted">
                      {user.email ?? "No email on file"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-border bg-surface-alt px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                    {user.role}
                  </span>
                  <Link
                    className="rounded-full border border-border bg-surface-alt px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted transition hover:border-primary hover:text-text"
                    href="/dashboard/notifications"
                  >
                    {workspace.unreadNotifications} {notificationLabel}
                  </Link>
                </div>
              </div>

              <div className="dashboard-sidebar-scrollbar mt-5 min-h-0 flex-1 overflow-y-auto overflow-x-clip pr-1">
                <div className="space-y-2">
                  {contextualLinks.map((child) => {
                    const isChildActive = matchesChildPath(child.href, child.match);

                    return (
                      <Link
                        key={child.href}
                        aria-current={isChildActive ? "page" : undefined}
                        className={clsx(
                          "flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition",
                          isChildActive
                            ? "border-primary bg-primary text-white hover:text-white shadow-sm"
                            : "border-border bg-surface text-text-muted hover:bg-surface-alt hover:text-text",
                        )}
                        href={child.href}
                        onClick={() => setManualSection(null)}
                      >
                        <span className={isChildActive ? "text-white" : undefined}>
                          {child.label}
                        </span>
                        {isChildActive ? (
                          <span className="rounded-full bg-white/14 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                            Active
                          </span>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 grid gap-2 border-t border-border pt-4">
                <Link className={buttonClassName({ variant: "secondary" })} href="/">
                  Public site
                </Link>
                <form action="/api/auth/logout" method="post">
                  <button
                    className={buttonClassName({ block: true, variant: "ghost" })}
                    type="submit"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          </aside>
        ) : null}

        <div className="min-w-0 max-w-full">
          <div className="border-b border-border bg-surface px-4 py-3 lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text">{workspace.storeName}</p>
                <p className="text-xs text-text-muted">
                  {workspace.unreadNotifications} {notificationLabel}
                </p>
              </div>

              <button
                aria-expanded={isMobileOpen}
                className={buttonClassName({ size: "md", variant: "secondary" })}
                onClick={() => setIsMobileOpen((current) => !current)}
                type="button"
              >
                <MenuIcon open={isMobileOpen} />
                <span>{isMobileOpen ? "Close" : "Menu"}</span>
              </button>
            </div>
          </div>

          <div
            className={clsx(
              "fixed inset-y-0 left-0 z-50 w-[320px] max-w-[90vw] overflow-x-clip border-r border-border bg-surface px-4 py-4 shadow-[0_24px_80px_rgba(15,23,42,0.18)] transition-transform duration-200 lg:hidden",
              isMobileOpen ? "translate-x-0" : "-translate-x-full",
            )}
          >
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-muted">
                    {workspace.storeSlug}
                  </p>
                  <h2 className="mt-2 text-lg font-semibold text-text">{workspace.storeName}</h2>
                </div>
                <button
                  className={buttonClassName({ size: "icon", variant: "secondary" })}
                  onClick={() => setIsMobileOpen(false)}
                  type="button"
                >
                  <MenuIcon open />
                </button>
              </div>

              <div className="dashboard-sidebar-scrollbar mt-4 min-h-0 flex-1 overflow-y-auto overflow-x-clip pr-1">
                <div className="space-y-5">
                  {sectionItems.map((item) => {
                    const isActive = item.href === activeItem?.href;

                    return (
                      <section key={item.href} className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span
                            className={clsx(
                              "flex size-10 items-center justify-center rounded-2xl border",
                              isActive
                                ? "border-primary bg-primary text-white"
                                : "border-border bg-surface-alt text-text",
                            )}
                          >
                            <NavigationIcon
                              className={isActive ? "text-white" : "text-text"}
                              label={item.label}
                            />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-text">{item.label}</p>
                            <p className="text-xs text-text-muted">{item.summary}</p>
                          </div>
                        </div>

                        <div className="ml-3 border-l border-border pl-4">
                          <div className="space-y-2">
                            {item.children.map((child) => {
                              const isChildActive = matchesChildPath(child.href, child.match);

                              return (
                                <Link
                                  key={child.href}
                                  aria-current={isChildActive ? "page" : undefined}
                                  className={clsx(
                                    "block rounded-xl border px-3 py-2.5 text-sm font-semibold transition",
                                    isChildActive
                                      ? "border-primary bg-primary text-white hover:text-white"
                                      : "border-border bg-surface text-text-muted hover:bg-surface-alt hover:text-text",
                                  )}
                                  href={child.href}
                                  onClick={() => {
                                    setManualSection(null);
                                    setIsMobileOpen(false);
                                  }}
                                >
                                  <span className={isChildActive ? "text-white" : undefined}>
                                    {child.label}
                                  </span>
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      </section>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 grid gap-2 border-t border-border pt-4">
                <Link
                  className={buttonClassName({ variant: "secondary" })}
                  href="/"
                  onClick={() => setIsMobileOpen(false)}
                >
                  Public site
                </Link>
                <form action="/api/auth/logout" method="post">
                  <button
                    className={buttonClassName({ block: true, variant: "ghost" })}
                    type="submit"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4 lg:p-6">
            <header className="rounded-[1.6rem] border border-border bg-surface px-5 py-4 shadow-[0_16px_40px_rgba(15,23,42,0.04)]">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-muted">
                    {workspaceLabel}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-text-muted">{workspaceDescription}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-border bg-surface-alt px-3 py-1.5 text-xs font-medium text-text-muted">
                    {workspace.storeName}
                  </span>
                  <Link
                    className="rounded-full border border-border bg-surface-alt px-3 py-1.5 text-xs font-medium text-text-muted transition hover:border-primary hover:text-text"
                    href="/dashboard/notifications"
                  >
                    {workspace.unreadNotifications} {notificationLabel}
                  </Link>
                </div>
              </div>
            </header>

            <main className="min-w-0 max-w-full space-y-4">{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}
