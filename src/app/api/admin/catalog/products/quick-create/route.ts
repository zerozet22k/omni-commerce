import { NextResponse, type NextRequest } from "next/server";

import { requireAdminCrudAccess } from "@/lib/auth/api-access";
import { createErrorResponse } from "@/lib/http/error-response";
import { catalogService } from "@/modules/catalog/catalog.service";
import { setupService } from "@/modules/setup/setup.service";

export async function POST(request: NextRequest) {
  try {
    await requireAdminCrudAccess(request, "write");
    const body = (await request.json()) as {
      productName?: string;
      slug?: string;
      shortDescription?: string;
      description?: string;
      categoryId?: string;
      productTypeId?: string;
      taxClassId?: string;
      unitPrice?: number;
      compareAtPrice?: number;
      costPrice?: number;
      stockQty?: number;
      sku?: string;
      variantName?: string;
      status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
      visibility?: "PUBLIC" | "HIDDEN";
      isFeatured?: boolean;
      isNewArrival?: boolean;
    };

    const productName = body.productName?.trim();

    if (!productName) {
      return NextResponse.json(
        { message: "Product name is required." },
        { status: 400 },
      );
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

    const defaults = await setupService.ensureBaseCommerceSetup();

    const product = await catalogService.createProduct({
      productName,
      slug: body.slug?.trim() || undefined,
      shortDescription: body.shortDescription?.trim() || undefined,
      description: body.description?.trim() || undefined,
      productTypeId: body.productTypeId || defaults.productTypeId,
      categoryId: body.categoryId || defaults.categoryId,
      taxClassId: body.taxClassId || defaults.taxClassId,
      status: body.status ?? "ACTIVE",
      visibility: body.visibility ?? "PUBLIC",
      isFeatured: Boolean(body.isFeatured),
      isNewArrival: Boolean(body.isNewArrival),
    });

    const variant = await catalogService.addVariant({
      productId: product.id,
      sku: body.sku?.trim() || undefined,
      variantName: body.variantName?.trim() || "Default",
      unitPrice,
      compareAtPrice:
        typeof body.compareAtPrice === "number" ? body.compareAtPrice : undefined,
      costPrice: typeof body.costPrice === "number" ? body.costPrice : undefined,
      stockQty,
      isDefault: true,
      isActive: true,
    });

    return NextResponse.json({ product, variant }, { status: 201 });
  } catch (error) {
    return createErrorResponse(error);
  }
}
