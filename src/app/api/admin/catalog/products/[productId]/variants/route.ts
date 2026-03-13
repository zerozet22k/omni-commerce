import { NextResponse, type NextRequest } from "next/server";

import { requireAdminCrudAccess } from "@/lib/auth/api-access";
import { createErrorResponse } from "@/lib/http/error-response";
import { catalogService } from "@/modules/catalog/catalog.service";

type ProductVariantRouteContext = {
  params: Promise<{
    productId: string;
  }>;
};

export async function POST(
  request: NextRequest,
  context: ProductVariantRouteContext,
) {
  try {
    await requireAdminCrudAccess(request, "write");
    const { productId } = await context.params;
    const body = (await request.json()) as {
      sku?: string;
      variantName?: string;
      unitPrice?: number;
      compareAtPrice?: number;
      costPrice?: number;
      stockQty?: number;
      isDefault?: boolean;
    };

    const product = await catalogService.getProductById(productId);

    if (!product) {
      return NextResponse.json({ message: "Product not found." }, { status: 404 });
    }

    const unitPrice = Number(body.unitPrice ?? 0);
    const stockQty = Number(body.stockQty ?? 0);

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return NextResponse.json(
        { message: "Unit price must be zero or greater." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(stockQty) || stockQty < 0) {
      return NextResponse.json(
        { message: "Stock quantity must be zero or greater." },
        { status: 400 },
      );
    }

    const variant = await catalogService.addVariant({
      productId,
      sku: body.sku?.trim() || undefined,
      variantName: body.variantName?.trim() || undefined,
      unitPrice,
      compareAtPrice:
        typeof body.compareAtPrice === "number" ? body.compareAtPrice : undefined,
      costPrice: typeof body.costPrice === "number" ? body.costPrice : undefined,
      stockQty,
      isDefault: Boolean(body.isDefault),
      isActive: true,
    });

    return NextResponse.json({ product, variant }, { status: 201 });
  } catch (error) {
    return createErrorResponse(error);
  }
}
