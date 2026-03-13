import { NextResponse, type NextRequest } from "next/server";

import { requireAdminCrudAccess } from "@/lib/auth/api-access";
import { createErrorResponse } from "@/lib/http/error-response";
import { slugify } from "@/lib/utils/slugify";
import { catalogService } from "@/modules/catalog/catalog.service";

export async function POST(request: NextRequest) {
  try {
    await requireAdminCrudAccess(request, "write");
    const body = (await request.json()) as {
      categoryName?: string;
      slug?: string;
      description?: string;
    };

    const categoryName = body.categoryName?.trim();

    if (!categoryName) {
      return NextResponse.json(
        { message: "Category name is required." },
        { status: 400 },
      );
    }

    const category = await catalogService.createCategory({
      categoryName,
      slug: body.slug?.trim() || slugify(categoryName),
      description: body.description?.trim() || undefined,
      isActive: true,
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    return createErrorResponse(error);
  }
}
