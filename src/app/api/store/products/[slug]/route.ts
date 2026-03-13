import { NextResponse } from "next/server";

import { createErrorResponse } from "@/lib/http/error-response";
import { storefrontService } from "@/modules/storefront/storefront.service";

type ProductRouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(
  _request: Request,
  context: ProductRouteContext,
) {
  try {
    const { slug } = await context.params;
    const product = await storefrontService.getPublicProductBySlug(slug);

    if (!product) {
      return NextResponse.json({ message: "Product not found." }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error) {
    return createErrorResponse(error);
  }
}
