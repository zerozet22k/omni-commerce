import { NextResponse, type NextRequest } from "next/server";

import { createErrorResponse } from "@/lib/http/error-response";
import { storefrontCatalogService } from "@/modules/storefront/storefront-catalog.service";

export async function GET(request: NextRequest) {
  try {
    const countryId = request.nextUrl.searchParams.get("countryId")?.trim();
    const methods = await storefrontCatalogService.listShippingMethods(
      countryId || undefined,
    );

    return NextResponse.json(methods);
  } catch (error) {
    return createErrorResponse(error);
  }
}
