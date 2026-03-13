import { NextResponse, type NextRequest } from "next/server";

import { requireAuthenticatedApiUser } from "@/lib/auth/api-access";
import { createErrorResponse } from "@/lib/http/error-response";
import { storefrontCatalogService } from "@/modules/storefront/storefront-catalog.service";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedApiUser(request);
    const formData = await request.formData();
    const productId = String(formData.get("productId") ?? "").trim();
    const rating = Number(formData.get("rating") ?? 0);
    const title = String(formData.get("title") ?? "").trim();
    const comment = String(formData.get("comment") ?? "").trim();
    const mediaFiles = formData
      .getAll("media")
      .filter((value): value is File => value instanceof File && value.size > 0);

    if (!productId) {
      return NextResponse.json({ message: "Product id is required." }, { status: 400 });
    }

    const result = await storefrontCatalogService.createProductReview({
      userId: user.id,
      productId,
      rating,
      title: title || undefined,
      comment: comment || undefined,
      mediaFiles,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return createErrorResponse(error);
  }
}
