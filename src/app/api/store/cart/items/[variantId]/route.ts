import { NextResponse, type NextRequest } from "next/server";

import { requireAuthenticatedApiUser } from "@/lib/auth/api-access";
import { createErrorResponse } from "@/lib/http/error-response";
import { storefrontService } from "@/modules/storefront/storefront.service";

type CartItemRouteContext = {
  params: Promise<{
    variantId: string;
  }>;
};

export async function PATCH(
  request: NextRequest,
  context: CartItemRouteContext,
) {
  try {
    const user = await requireAuthenticatedApiUser(request);
    const { variantId } = await context.params;
    const body = (await request.json()) as {
      quantity?: number;
    };
    const quantity = Number(body.quantity ?? 1);
    const snapshot = await storefrontService.updateCartItem({
      userId: user.id,
      variantId,
      quantity,
    });

    return NextResponse.json(snapshot);
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: CartItemRouteContext,
) {
  try {
    const user = await requireAuthenticatedApiUser(request);
    const { variantId } = await context.params;
    const snapshot = await storefrontService.removeCartItem({
      userId: user.id,
      variantId,
    });

    return NextResponse.json(snapshot);
  } catch (error) {
    return createErrorResponse(error);
  }
}
