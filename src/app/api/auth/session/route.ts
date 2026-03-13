import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { createErrorResponse } from "@/lib/http/error-response";
import { authService } from "@/modules/users/auth.service";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ user: null });
    }

    const user = await authService.getSessionUser(session.id);

    return NextResponse.json({ user: user ?? null });
  } catch (error) {
    return createErrorResponse(error);
  }
}
