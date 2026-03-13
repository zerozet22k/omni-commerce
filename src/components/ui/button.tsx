import clsx from "clsx";
import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

type ButtonClassNameOptions = {
  block?: boolean;
  className?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

const baseClassName =
  "inline-flex items-center justify-center gap-2 rounded-xl border text-sm leading-none font-semibold whitespace-nowrap no-underline transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-55";

const sizeClassNames: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5",
  md: "h-11 px-4",
  lg: "h-12 px-5",
  icon: "h-10 w-10 p-0",
};

const variantClassNames: Record<ButtonVariant, string> = {
  primary:
    "border-primary bg-primary !text-white shadow-sm hover:border-primary-hover hover:bg-primary-hover hover:!text-white active:border-primary-active active:bg-primary-active active:!text-white",
  secondary:
    "border-border bg-surface !text-text shadow-sm hover:border-slate-300 hover:bg-surface-alt hover:!text-text",
  ghost: "border-transparent bg-transparent !text-text hover:bg-surface-alt hover:!text-text",
  destructive:
    "border-danger/20 bg-danger/10 !text-danger hover:border-danger/30 hover:bg-danger/15 hover:!text-danger",
};

export function buttonClassName({
  block = false,
  className,
  size = "md",
  variant = "secondary",
}: ButtonClassNameOptions = {}) {
  return clsx(
    baseClassName,
    sizeClassNames[size],
    variantClassNames[variant],
    block && "w-full",
    className,
  );
}

type ButtonLinkProps = Omit<ComponentPropsWithoutRef<typeof Link>, "className"> & {
  children: ReactNode;
  className?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

export function ButtonLink({
  children,
  className,
  size,
  variant,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={buttonClassName({ className, size, variant })} {...props}>
      {children}
    </Link>
  );
}
