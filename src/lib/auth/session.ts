import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";

import { USER_ROLES, type UserRole } from "@/lib/auth/permissions";

export const SESSION_COOKIE_NAME = "omni-commerce-session";

export type SessionPayload = {
  id: string;
  role: UserRole;
  fullName: string;
  email: string | null;
};

const textEncoder = new TextEncoder();
const developmentAuthSecret =
  "dev-only-auth-secret-please-replace-in-production-2026";

function getAuthSecret() {
  const authSecret = process.env.AUTH_SECRET;

  if (authSecret && authSecret.length >= 32) {
    return textEncoder.encode(authSecret);
  }

  if (process.env.NODE_ENV !== "production") {
    return textEncoder.encode(developmentAuthSecret);
  }

  if (!authSecret || authSecret.length < 32) {
    throw new Error("AUTH_SECRET must be set and at least 32 characters long.");
  }

  return textEncoder.encode(authSecret);
}

function getCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT({
    role: payload.role,
    fullName: payload.fullName,
    email: payload.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getAuthSecret());
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    const role = USER_ROLES.find((value) => value === payload.role);

    if (
      !role ||
      typeof payload.sub !== "string" ||
      typeof payload.fullName !== "string"
    ) {
      return null;
    }

    return {
      id: payload.sub,
      role,
      fullName: payload.fullName,
      email: typeof payload.email === "string" ? payload.email : null,
    } satisfies SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}

export async function getSessionFromRequest(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}

export async function setSessionCookie(
  response: NextResponse,
  payload: SessionPayload,
) {
  const token = await createSessionToken(payload);
  response.cookies.set(SESSION_COOKIE_NAME, token, getCookieOptions());
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...getCookieOptions(),
    maxAge: 0,
  });
}
