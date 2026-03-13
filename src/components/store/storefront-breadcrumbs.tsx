import Link from "next/link";

type StorefrontBreadcrumbsProps = {
  items: Array<{
    label: string;
    href?: string;
  }>;
};

export function StorefrontBreadcrumbs({
  items,
}: StorefrontBreadcrumbsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-text-muted">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <span key={`${item.label}-${index}`} className="inline-flex items-center gap-2">
            {index > 0 ? <span className="text-border">/</span> : null}
            {item.href && !isLast ? (
              <Link className="hover:text-text" href={item.href}>
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "font-medium text-text" : ""}>{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
