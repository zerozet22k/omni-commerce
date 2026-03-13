import { NextResponse } from "next/server";

import { setSessionCookie } from "@/lib/auth/session";
import { createErrorResponse } from "@/lib/http/error-response";
import { authService } from "@/modules/users/auth.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await authService.login(body);
    const response = NextResponse.json({ user });

    await setSessionCookie(response, {
      id: user.id,
      role: user.role,
      fullName: user.fullName,
      email: user.email,
    });

    return response;
  } catch (error) {
    return createErrorResponse(error);
  }
}
