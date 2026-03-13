import { NextResponse, type NextRequest } from "next/server";

import { requireAuthenticatedApiUser } from "@/lib/auth/api-access";
import { createErrorResponse } from "@/lib/http/error-response";
import { storefrontService } from "@/modules/storefront/storefront.service";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedApiUser(request);
    const body = (await request.json()) as {
      variantId?: string;
      quantity?: number;
    };

    const variantId = body.variantId?.trim();
    const quantity = Number(body.quantity ?? 1);

    if (!variantId) {
      return NextResponse.json(
        { message: "Variant id is required." },
        { status: 400 },
      );
    }

    const snapshot = await storefrontService.addToCart({
      userId: user.id,
      variantId,
      quantity,
    });

    return NextResponse.json(snapshot, { status: 201 });
  } catch (error) {
    return createErrorResponse(error);
  }
}
