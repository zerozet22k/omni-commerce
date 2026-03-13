export const USER_ROLES = ["OWNER", "ADMIN", "STAFF", "CUSTOMER"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const PERMISSIONS = {
  dashboardView: "dashboard:view",
  accountView: "account:view",
  ordersView: "orders:view",
  catalogView: "catalog:view",
  inventoryView: "inventory:view",
  usersManage: "users:manage",
  settingsManage: "settings:manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  OWNER: [
    PERMISSIONS.dashboardView,
    PERMISSIONS.accountView,
    PERMISSIONS.ordersView,
    PERMISSIONS.catalogView,
    PERMISSIONS.inventoryView,
    PERMISSIONS.usersManage,
    PERMISSIONS.settingsManage,
  ],
  ADMIN: [
    PERMISSIONS.dashboardView,
    PERMISSIONS.accountView,
    PERMISSIONS.ordersView,
    PERMISSIONS.catalogView,
    PERMISSIONS.inventoryView,
    PERMISSIONS.usersManage,
    PERMISSIONS.settingsManage,
  ],
  STAFF: [
    PERMISSIONS.dashboardView,
    PERMISSIONS.accountView,
    PERMISSIONS.ordersView,
    PERMISSIONS.catalogView,
    PERMISSIONS.inventoryView,
  ],
  CUSTOMER: [
    PERMISSIONS.dashboardView,
    PERMISSIONS.accountView,
  ],
};

export function getRolePermissions(role: UserRole) {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermission(role: UserRole, permission: Permission) {
  return getRolePermissions(role).includes(permission);
}

export function isCustomerRole(role: UserRole) {
  return role === "CUSTOMER";
}

export function isOperationsRole(role: UserRole) {
  return role === "OWNER" || role === "ADMIN" || role === "STAFF";
}
