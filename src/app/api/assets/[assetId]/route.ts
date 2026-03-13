import { NextResponse, type NextRequest } from "next/server";

import { connectToDatabase } from "@/lib/db/mongodb";
import { STOREFRONT_PRODUCT_PLACEHOLDER_SRC, storefrontPlaceholderForLabel } from "@/lib/storefront/placeholders";
import { MediaAssetModel } from "@/modules/core/core.models";

type RouteContext = {
  params: Promise<{
    assetId: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { assetId } = await context.params;
  const requestedFallback = request.nextUrl.searchParams.get("fallback");
  const fallbackSrc = requestedFallback || STOREFRONT_PRODUCT_PLACEHOLDER_SRC;

  await connectToDatabase();

  const asset = (await MediaAssetModel.findById(assetId)
    .select("url title altText")
    .lean()
    .exec()) as { altText?: string; title?: string; url?: string } | null;

  if (!asset?.url) {
    return NextResponse.redirect(new URL(fallbackSrc, request.url));
  }

  const destination = asset.url.includes("placehold.co")
    ? new URL(
        requestedFallback || storefrontPlaceholderForLabel(asset.title ?? asset.altText ?? asset.url),
        request.url,
      )
    : asset.url.startsWith("http")
      ? asset.url
      : new URL(asset.url, request.url);

  return NextResponse.redirect(destination);
}
