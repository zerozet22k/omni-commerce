import { NextResponse, type NextRequest } from "next/server";

import { requireAuthenticatedApiUser } from "@/lib/auth/api-access";
import { createErrorResponse } from "@/lib/http/error-response";
import { storefrontCatalogService } from "@/modules/storefront/storefront-catalog.service";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedApiUser(request);
    const body = (await request.json()) as {
      productId?: string;
    };
    const productId = body.productId?.trim();

    if (!productId) {
      return NextResponse.json(
        { message: "Product id is required." },
        { status: 400 },
      );
    }

    const result = await storefrontCatalogService.toggleWishlist({
      userId: user.id,
      productId,
    });

    return NextResponse.json(result);
  } catch (error) {
    return createErrorResponse(error);
  }
}
