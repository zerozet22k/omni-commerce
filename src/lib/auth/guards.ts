import { redirect } from "next/navigation";

import {
  hasPermission,
  isCustomerRole,
  isOperationsRole,
  type Permission,
} from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import { authService } from "@/modules/users/auth.service";

export async function requireAuthenticatedUser() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const user = await authService.getSessionUser(session.id);

  if (!user || !user.isActive) {
    redirect("/login");
  }

  return user;
}

export async function requirePermission(permission: Permission) {
  const user = await requireAuthenticatedUser();

  if (!hasPermission(user.role, permission)) {
    redirect("/unauthorized");
  }

  return user;
}

export async function requireCustomerUser() {
  const user = await requireAuthenticatedUser();

  if (!isCustomerRole(user.role)) {
    redirect("/dashboard/orders");
  }

  return user;
}

export async function requireOperationsUser() {
  const user = await requireAuthenticatedUser();

  if (!isOperationsRole(user.role)) {
    redirect("/dashboard/account/orders");
  }

  return user;
}
