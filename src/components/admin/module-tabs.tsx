import { AdminTabs } from "@/components/admin/workspace";

function normalizePath(path: string) {
  if (!path) return "/";
  return path !== "/" ? path.replace(/\/+$/, "") : path;
}

function isExact(pathname: string, href: string) {
  return normalizePath(pathname) === normalizePath(href);
}

function isSection(pathname: string, href: string) {
  const current = normalizePath(pathname);
  const target = normalizePath(href);

  return current === target || current.startsWith(`${target}/`);
}

function isOrdersSectionPath(pathname: string) {
  const current = normalizePath(pathname);
  return (
    current === "/dashboard/orders" ||
    current === "/dashboard/orders/new" ||
    (current !== "/dashboard/orders/returns" && /^\/dashboard\/orders\/[^/]+$/.test(current))
  );
}

function isSupplierSectionPath(pathname: string) {
  const current = normalizePath(pathname);
  const isSiblingRoute =
    current === "/dashboard/supplier/links" ||
    current === "/dashboard/supplier/platforms" ||
    current === "/dashboard/supplier/handoff";
  return (
    current === "/dashboard/supplier" ||
    current === "/dashboard/supplier/new" ||
    (!isSiblingRoute && /^\/dashboard\/supplier\/[^/]+$/.test(current))
  );
}

export function CatalogTabs({ currentPath }: { currentPath: string }) {
  return (
    <AdminTabs
      items={[
        {
          href: "/dashboard/catalog/products",
          label: "Products",
          active: isSection(currentPath, "/dashboard/catalog/products"),
        },
        {
          href: "/dashboard/catalog/categories",
          label: "Categories",
          active: isSection(currentPath, "/dashboard/catalog/categories"),
        },
        {
          href: "/dashboard/catalog/brands",
          label: "Brands",
          active: isSection(currentPath, "/dashboard/catalog/brands"),
        },
        {
          href: "/dashboard/catalog/collections",
          label: "Collections",
          active: isSection(currentPath, "/dashboard/catalog/collections"),
        },
        {
          href: "/dashboard/catalog/option-types",
          label: "Option types",
          active: isSection(currentPath, "/dashboard/catalog/option-types"),
        },
        {
          href: "/dashboard/catalog/product-types",
          label: "Product types",
          active: isSection(currentPath, "/dashboard/catalog/product-types"),
        },
        {
          href: "/dashboard/catalog/product-tags",
          label: "Product tags",
          active: isSection(currentPath, "/dashboard/catalog/product-tags"),
        },
        {
          href: "/dashboard/catalog/product-badges",
          label: "Product badges",
          active: isSection(currentPath, "/dashboard/catalog/product-badges"),
        },
        {
          href: "/dashboard/catalog/promotions",
          label: "Promotions",
          active: isSection(currentPath, "/dashboard/catalog/promotions"),
        },
      ]}
    />
  );
}

export function ProductTabs({
  currentPath,
  productId,
}: {
  currentPath: string;
  productId: string;
}) {
  const generalHref = `/dashboard/catalog/products/${productId}`;
  const mediaHref = `/dashboard/catalog/products/${productId}/images`;
  const variantsHref = `/dashboard/catalog/products/${productId}/variants`;
  const specificationsHref = `/dashboard/catalog/products/${productId}/specifications`;
  const faqHref = `/dashboard/catalog/products/${productId}/faq`;
  const relationsHref = `/dashboard/catalog/products/${productId}/relations`;
  const bundlesHref = `/dashboard/catalog/products/${productId}/bundles`;
  const seoHref = `/dashboard/catalog/products/${productId}/seo`;

  return (
    <AdminTabs
      items={[
        {
          href: generalHref,
          label: "General",
          active: isExact(currentPath, generalHref),
        },
        {
          href: mediaHref,
          label: "Media",
          active: isSection(currentPath, mediaHref),
        },
        {
          href: variantsHref,
          label: "Variants",
          active: isSection(currentPath, variantsHref),
        },
        {
          href: specificationsHref,
          label: "Specifications",
          active: isSection(currentPath, specificationsHref),
        },
        {
          href: faqHref,
          label: "FAQ",
          active: isSection(currentPath, faqHref),
        },
        {
          href: relationsHref,
          label: "Relations",
          active: isSection(currentPath, relationsHref),
        },
        {
          href: bundlesHref,
          label: "Bundles",
          active: isSection(currentPath, bundlesHref),
        },
        {
          href: seoHref,
          label: "SEO",
          active: isSection(currentPath, seoHref),
        },
      ]}
    />
  );
}

export function SalesTabs({ currentPath }: { currentPath: string }) {
  return (
    <AdminTabs
      items={[
        {
          href: "/dashboard/orders",
          label: "Orders",
          active: isOrdersSectionPath(currentPath),
        },
        {
          href: "/dashboard/orders/returns",
          label: "Returns",
          active: isSection(currentPath, "/dashboard/orders/returns"),
        },
        {
          href: "/dashboard/sales/payments",
          label: "Payments",
          active: isSection(currentPath, "/dashboard/sales/payments"),
        },
        {
          href: "/dashboard/sales/shipments",
          label: "Shipments",
          active: isSection(currentPath, "/dashboard/sales/shipments"),
        },
        {
          href: "/dashboard/sales/refunds",
          label: "Refunds",
          active: isSection(currentPath, "/dashboard/sales/refunds"),
        },
        {
          href: "/dashboard/sales/reviews",
          label: "Reviews",
          active: isSection(currentPath, "/dashboard/sales/reviews"),
        },
        {
          href: "/dashboard/sales/gift-cards",
          label: "Gift cards",
          active: isSection(currentPath, "/dashboard/sales/gift-cards"),
        },
      ]}
    />
  );
}

export function SupplierTabs({ currentPath }: { currentPath: string }) {
  return (
    <AdminTabs
      items={[
        {
          href: "/dashboard/supplier",
          label: "Suppliers",
          active: isSupplierSectionPath(currentPath),
        },
        {
          href: "/dashboard/supplier/links",
          label: "Variant links",
          active: isSection(currentPath, "/dashboard/supplier/links"),
        },
        {
          href: "/dashboard/supplier/platforms",
          label: "Platforms",
          active: isSection(currentPath, "/dashboard/supplier/platforms"),
        },
        {
          href: "/dashboard/supplier/handoff",
          label: "Workflow guide",
          active: isSection(currentPath, "/dashboard/supplier/handoff"),
        },
      ]}
    />
  );
}

export function AccountTabs({ currentPath }: { currentPath: string }) {
  return (
    <AdminTabs
      items={[
        {
          href: "/dashboard/account",
          label: "Profile",
          active: isExact(currentPath, "/dashboard/account"),
        },
        {
          href: "/dashboard/account/orders",
          label: "My orders",
          active: isSection(currentPath, "/dashboard/account/orders"),
        },
        {
          href: "/dashboard/account/returns",
          label: "Returns",
          active: isSection(currentPath, "/dashboard/account/returns"),
        },
      ]}
    />
  );
}

export function SettingsTabs({ currentPath }: { currentPath: string }) {
  return (
    <AdminTabs
      items={[
        {
          href: "/dashboard/settings",
          label: "Store",
          active: isExact(currentPath, "/dashboard/settings"),
        },
        {
          href: "/dashboard/settings/countries",
          label: "Countries",
          active: isSection(currentPath, "/dashboard/settings/countries"),
        },
        {
          href: "/dashboard/settings/states-regions",
          label: "States / Regions",
          active: isSection(currentPath, "/dashboard/settings/states-regions"),
        },
        {
          href: "/dashboard/settings/payment-methods",
          label: "Payment methods",
          active: isSection(currentPath, "/dashboard/settings/payment-methods"),
        },
        {
          href: "/dashboard/settings/shipping-zones",
          label: "Shipping zones",
          active: isSection(currentPath, "/dashboard/settings/shipping-zones"),
        },
        {
          href: "/dashboard/settings/tax-classes",
          label: "Tax classes",
          active: isSection(currentPath, "/dashboard/settings/tax-classes"),
        },
        {
          href: "/dashboard/settings/tax-rates",
          label: "Tax rates",
          active: isSection(currentPath, "/dashboard/settings/tax-rates"),
        },
        {
          href: "/dashboard/settings/shipping-methods",
          label: "Delivery methods",
          active: isSection(currentPath, "/dashboard/settings/shipping-methods"),
        },
        {
          href: "/dashboard/settings/shipping-rate-rules",
          label: "Shipping rate rules",
          active: isSection(currentPath, "/dashboard/settings/shipping-rate-rules"),
        },
      ]}
    />
  );
}

export function ContentTabs({ currentPath }: { currentPath: string }) {
  return (
    <AdminTabs
      items={[
        {
          href: "/dashboard/content/pages",
          label: "Pages",
          active: isSection(currentPath, "/dashboard/content/pages"),
        },
        {
          href: "/dashboard/content/banners",
          label: "Banners",
          active: isSection(currentPath, "/dashboard/content/banners"),
        },
        {
          href: "/dashboard/content/navigation-menus",
          label: "Navigation menus",
          active: isSection(currentPath, "/dashboard/content/navigation-menus"),
        },
      ]}
    />
  );
}
