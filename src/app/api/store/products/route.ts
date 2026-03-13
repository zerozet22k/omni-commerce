import { NextResponse } from "next/server";

import { createErrorResponse } from "@/lib/http/error-response";
import { storefrontService } from "@/modules/storefront/storefront.service";

export async function GET() {
  try {
    const products = await storefrontService.listPublicProducts();

    return NextResponse.json({
      items: products,
      meta: {
        total: products.length,
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
