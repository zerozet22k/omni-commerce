import { PERMISSIONS, type Permission } from "@/lib/auth/permissions";

export const AUTH_ROUTES = ["/login", "/register"];

const DASHBOARD_ROUTE_PERMISSIONS: Array<{
  prefix: string;
  permission: Permission;
}> = [
  { prefix: "/dashboard/content", permission: PERMISSIONS.settingsManage },
  { prefix: "/dashboard/sales", permission: PERMISSIONS.ordersView },
  { prefix: "/dashboard/settings", permission: PERMISSIONS.settingsManage },
  { prefix: "/dashboard/users", permission: PERMISSIONS.usersManage },
  { prefix: "/dashboard/supplier", permission: PERMISSIONS.inventoryView },
  { prefix: "/dashboard/inventory", permission: PERMISSIONS.inventoryView },
  { prefix: "/dashboard/catalog", permission: PERMISSIONS.catalogView },
  { prefix: "/dashboard/orders", permission: PERMISSIONS.ordersView },
  { prefix: "/dashboard/account", permission: PERMISSIONS.accountView },
  { prefix: "/dashboard", permission: PERMISSIONS.dashboardView },
];

export function isProtectedPath(pathname: string) {
  return pathname.startsWith("/dashboard");
}

export function getRequiredPermissionForPath(pathname: string) {
  return DASHBOARD_ROUTE_PERMISSIONS.find(({ prefix }) => {
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  })?.permission;
}
