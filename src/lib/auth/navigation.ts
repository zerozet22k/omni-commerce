import {
  hasPermission,
  isCustomerRole,
  PERMISSIONS,
  type Permission,
  type UserRole,
} from "@/lib/auth/permissions";

export type DashboardNavItem = {
  group: string;
  href: string;
  label: string;
  summary: string;
  permission: Permission;
  children?: Array<{
    href: string;
    label: string;
    permission: Permission;
    match?: "exact" | "section";
  }>;
};

const OPERATIONS_SHARED_NAV_ITEMS: DashboardNavItem[] = [
  {
    group: "Workspace",
    href: "/dashboard",
    label: "Overview",
    summary: "Operational overview and alerts",
    permission: PERMISSIONS.dashboardView,
    children: [
      {
        href: "/dashboard",
        label: "Overview",
        permission: PERMISSIONS.dashboardView,
        match: "exact",
      },
      {
        href: "/dashboard/notifications",
        label: "Notifications",
        permission: PERMISSIONS.dashboardView,
      },
    ],
  },
  {
    group: "Workspace",
    href: "/dashboard/account",
    label: "Account",
    summary: "Identity and session details",
    permission: PERMISSIONS.accountView,
    children: [
      {
        href: "/dashboard/account",
        label: "Profile",
        permission: PERMISSIONS.accountView,
      },
    ],
  },
];

const CUSTOMER_SHARED_NAV_ITEMS: DashboardNavItem[] = [
  {
    group: "Workspace",
    href: "/dashboard",
    label: "Overview",
    summary: "Recent activity and shopping updates",
    permission: PERMISSIONS.dashboardView,
    children: [
      {
        href: "/dashboard",
        label: "Overview",
        permission: PERMISSIONS.dashboardView,
        match: "exact",
      },
      {
        href: "/dashboard/notifications",
        label: "Notifications",
        permission: PERMISSIONS.dashboardView,
      },
    ],
  },
  {
    group: "Workspace",
    href: "/dashboard/account",
    label: "Account",
    summary: "Profile, saved details, and account state",
    permission: PERMISSIONS.accountView,
    children: [
      {
        href: "/dashboard/account",
        label: "Profile",
        permission: PERMISSIONS.accountView,
        match: "exact",
      },
      {
        href: "/dashboard/account/orders",
        label: "My orders",
        permission: PERMISSIONS.accountView,
      },
      {
        href: "/dashboard/account/returns",
        label: "Returns",
        permission: PERMISSIONS.accountView,
      },
    ],
  },
];

const OPERATIONS_NAV_ITEMS: DashboardNavItem[] = [
  {
    group: "Catalog",
    href: "/dashboard/catalog",
    label: "Catalog",
    summary: "Products, merchandising records, options, and promotions",
    permission: PERMISSIONS.catalogView,
    children: [
      {
        href: "/dashboard/catalog/products",
        label: "Products",
        permission: PERMISSIONS.catalogView,
      },
      {
        href: "/dashboard/catalog/categories",
        label: "Categories",
        permission: PERMISSIONS.catalogView,
      },
      {
        href: "/dashboard/catalog/brands",
        label: "Brands",
        permission: PERMISSIONS.catalogView,
      },
      {
        href: "/dashboard/catalog/collections",
        label: "Collections",
        permission: PERMISSIONS.catalogView,
      },
      {
        href: "/dashboard/catalog/option-types",
        label: "Option types",
        permission: PERMISSIONS.catalogView,
      },
      {
        href: "/dashboard/catalog/product-types",
        label: "Product types",
        permission: PERMISSIONS.catalogView,
      },
      {
        href: "/dashboard/catalog/product-tags",
        label: "Product tags",
        permission: PERMISSIONS.catalogView,
      },
      {
        href: "/dashboard/catalog/product-badges",
        label: "Product badges",
        permission: PERMISSIONS.catalogView,
      },
      {
        href: "/dashboard/catalog/promotions",
        label: "Promotions",
        permission: PERMISSIONS.catalogView,
      },
    ],
  },
  {
    group: "Inventory",
    href: "/dashboard/inventory",
    label: "Inventory",
    summary: "Stock levels, thresholds, and restocks",
    permission: PERMISSIONS.inventoryView,
    children: [
      {
        href: "/dashboard/inventory",
        label: "Stock",
        permission: PERMISSIONS.inventoryView,
        match: "exact",
      },
      {
        href: "/dashboard/inventory/restocks",
        label: "Restocks",
        permission: PERMISSIONS.inventoryView,
      },
    ],
  },
  {
    group: "Suppliers",
    href: "/dashboard/supplier",
    label: "Suppliers",
    summary: "Sources, platforms, and variant links",
    permission: PERMISSIONS.inventoryView,
    children: [
      {
        href: "/dashboard/supplier",
        label: "Suppliers",
        permission: PERMISSIONS.inventoryView,
        match: "exact",
      },
      {
        href: "/dashboard/supplier/links",
        label: "Variant links",
        permission: PERMISSIONS.inventoryView,
      },
      {
        href: "/dashboard/supplier/platforms",
        label: "Platforms",
        permission: PERMISSIONS.inventoryView,
      },
    ],
  },
  {
    group: "Sales",
    href: "/dashboard/orders",
    label: "Sales",
    summary: "Orders, returns, payments, shipments, refunds, and reviews",
    permission: PERMISSIONS.ordersView,
    children: [
      {
        href: "/dashboard/orders",
        label: "Orders",
        permission: PERMISSIONS.ordersView,
        match: "exact",
      },
      {
        href: "/dashboard/orders/returns",
        label: "Returns",
        permission: PERMISSIONS.ordersView,
      },
      {
        href: "/dashboard/sales/payments",
        label: "Payments",
        permission: PERMISSIONS.ordersView,
      },
      {
        href: "/dashboard/sales/shipments",
        label: "Shipments",
        permission: PERMISSIONS.ordersView,
      },
      {
        href: "/dashboard/sales/refunds",
        label: "Refunds",
        permission: PERMISSIONS.ordersView,
      },
      {
        href: "/dashboard/sales/reviews",
        label: "Reviews",
        permission: PERMISSIONS.ordersView,
      },
      {
        href: "/dashboard/sales/gift-cards",
        label: "Gift cards",
        permission: PERMISSIONS.ordersView,
      },
    ],
  },
  {
    group: "Content",
    href: "/dashboard/content/pages",
    label: "Content",
    summary: "Pages, banners, and navigation menus",
    permission: PERMISSIONS.settingsManage,
    children: [
      {
        href: "/dashboard/content/pages",
        label: "Pages",
        permission: PERMISSIONS.settingsManage,
      },
      {
        href: "/dashboard/content/banners",
        label: "Banners",
        permission: PERMISSIONS.settingsManage,
      },
      {
        href: "/dashboard/content/navigation-menus",
        label: "Navigation menus",
        permission: PERMISSIONS.settingsManage,
      },
    ],
  },
  {
    group: "Administration",
    href: "/dashboard/users",
    label: "Users",
    summary: "Customers, staff, and roles",
    permission: PERMISSIONS.usersManage,
  },
  {
    group: "Settings",
    href: "/dashboard/settings",
    label: "Settings",
    summary: "Store, geography, payment, delivery, and tax configuration",
    permission: PERMISSIONS.settingsManage,
    children: [
      {
        href: "/dashboard/settings",
        label: "Store",
        permission: PERMISSIONS.settingsManage,
        match: "exact",
      },
      {
        href: "/dashboard/settings/countries",
        label: "Countries",
        permission: PERMISSIONS.settingsManage,
      },
      {
        href: "/dashboard/settings/states-regions",
        label: "States / Regions",
        permission: PERMISSIONS.settingsManage,
      },
      {
        href: "/dashboard/settings/payment-methods",
        label: "Payment methods",
        permission: PERMISSIONS.settingsManage,
      },
      {
        href: "/dashboard/settings/shipping-methods",
        label: "Delivery methods",
        permission: PERMISSIONS.settingsManage,
      },
      {
        href: "/dashboard/settings/tax-classes",
        label: "Tax classes",
        permission: PERMISSIONS.settingsManage,
      },
      {
        href: "/dashboard/settings/tax-rates",
        label: "Tax rates",
        permission: PERMISSIONS.settingsManage,
      },
    ],
  },
];

const CUSTOMER_NAV_ITEMS: DashboardNavItem[] = [];

export function getDashboardNavigation(role: UserRole) {
  const sharedItems = isCustomerRole(role)
    ? CUSTOMER_SHARED_NAV_ITEMS
    : OPERATIONS_SHARED_NAV_ITEMS;
  const roleSpecificItems = isCustomerRole(role)
    ? CUSTOMER_NAV_ITEMS
    : OPERATIONS_NAV_ITEMS;

  return [...sharedItems, ...roleSpecificItems]
    .filter((item) => hasPermission(role, item.permission))
    .map((item) => ({
      ...item,
      children: item.children?.filter((child) => hasPermission(role, child.permission)),
    }));
}

export function countDashboardNavigationItems(
  navigation: ReturnType<typeof getDashboardNavigation>,
) {
  return navigation.reduce(
    (total, item) => total + 1 + (item.children?.length ?? 0),
    0,
  );
}
