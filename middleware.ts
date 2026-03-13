import { NextResponse, type NextRequest } from "next/server";

import {
  AUTH_ROUTES,
  getRequiredPermissionForPath,
  isProtectedPath,
} from "@/lib/auth/route-access";
import {
  getRolePermissions,
  isCustomerRole,
  isOperationsRole,
} from "@/lib/auth/permissions";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { sanitizeRedirect } from "@/lib/utils/navigation";

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (AUTH_ROUTES.includes(pathname) && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", sanitizeRedirect(`${pathname}${search}`));
    return NextResponse.redirect(loginUrl);
  }

  if (
    isCustomerRole(session.role) &&
    (pathname === "/dashboard/orders" || pathname.startsWith("/dashboard/orders/"))
  ) {
    const customerOrdersUrl = new URL("/dashboard/account/orders", request.url);
    customerOrdersUrl.search = search;
    return NextResponse.redirect(customerOrdersUrl);
  }

  if (
    isOperationsRole(session.role) &&
    (pathname === "/dashboard/account/orders" ||
      pathname.startsWith("/dashboard/account/orders/"))
  ) {
    const operationsOrdersUrl = new URL("/dashboard/orders", request.url);
    operationsOrdersUrl.search = search;
    return NextResponse.redirect(operationsOrdersUrl);
  }

  const requiredPermission = getRequiredPermissionForPath(pathname);

  if (
    requiredPermission &&
    !getRolePermissions(session.role).includes(requiredPermission)
  ) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/register", "/dashboard/:path*"],
};
