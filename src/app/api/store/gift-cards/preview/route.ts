import { NextResponse, type NextRequest } from "next/server";

import { requireAuthenticatedApiUser } from "@/lib/auth/api-access";
import { createErrorResponse } from "@/lib/http/error-response";
import { storefrontService } from "@/modules/storefront/storefront.service";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedApiUser(request);
    const body = (await request.json()) as {
      code?: string;
    };
    const code = body.code?.trim();

    if (!code) {
      return NextResponse.json({ message: "Gift card code is required." }, { status: 400 });
    }

    const result = await storefrontService.previewGiftCard({
      userId: user.id,
      code,
    });

    return NextResponse.json(result);
  } catch (error) {
    return createErrorResponse(error);
  }
}
