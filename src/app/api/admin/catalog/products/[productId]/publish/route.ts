import { NextResponse, type NextRequest } from "next/server";

import { requireAdminCrudAccess } from "@/lib/auth/api-access";
import { createErrorResponse } from "@/lib/http/error-response";
import { catalogService } from "@/modules/catalog/catalog.service";

type PublishProductRouteContext = {
  params: Promise<{
    productId: string;
  }>;
};

export async function POST(
  request: NextRequest,
  context: PublishProductRouteContext,
) {
  try {
    await requireAdminCrudAccess(request, "write");
    const { productId } = await context.params;
    const product = await catalogService.publishProduct(productId);

    return NextResponse.json({ product });
  } catch (error) {
    return createErrorResponse(error);
  }
}
