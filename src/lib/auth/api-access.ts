import type { NextRequest } from "next/server";

import type { UserRole } from "@/lib/auth/permissions";
import { getSessionFromRequest } from "@/lib/auth/session";
import { AppError } from "@/lib/errors/app-error";
import { authService } from "@/modules/users/auth.service";

const READ_ROLES = new Set<UserRole>(["OWNER", "ADMIN", "STAFF"]);
const WRITE_ROLES = new Set<UserRole>(["OWNER", "ADMIN"]);

export async function requireAuthenticatedApiUser(request: NextRequest) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    throw new AppError("Authentication required.", 401);
  }

  const user = await authService.getSessionUser(session.id);

  if (!user || !user.isActive) {
    throw new AppError("Authentication required.", 401);
  }

  return user;
}

export async function requireAdminCrudAccess(
  request: NextRequest,
  accessLevel: "read" | "write",
) {
  const user = await requireAuthenticatedApiUser(request);

  const allowedRoles = accessLevel === "read" ? READ_ROLES : WRITE_ROLES;

  if (!allowedRoles.has(user.role)) {
    throw new AppError("Forbidden.", 403);
  }

  return user;
}
