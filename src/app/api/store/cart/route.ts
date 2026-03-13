import { NextResponse, type NextRequest } from "next/server";

import { requireAuthenticatedApiUser } from "@/lib/auth/api-access";
import { createErrorResponse } from "@/lib/http/error-response";
import { storefrontService } from "@/modules/storefront/storefront.service";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthenticatedApiUser(request);
    const snapshot = await storefrontService.getCartForUser(user.id);

    return NextResponse.json(snapshot);
  } catch (error) {
    return createErrorResponse(error);
  }
}
