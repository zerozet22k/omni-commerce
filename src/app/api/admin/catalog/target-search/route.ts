import { NextResponse, type NextRequest } from "next/server";
import { Types } from "mongoose";

import { requireAdminCrudAccess } from "@/lib/auth/api-access";
import { connectToDatabase } from "@/lib/db/mongodb";
import { createErrorResponse } from "@/lib/http/error-response";
import {
  BrandModel,
  CategoryModel,
  ProductModel,
  ProductVariantModel,
} from "@/modules/catalog/catalog.models";
import { CustomerGroupModel } from "@/modules/customers/customers.models";

const SEARCH_LIMIT = 12;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminCrudAccess(request, "read");
    await connectToDatabase();

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type");
    const query = (searchParams.get("q") ?? "").trim();

    if (!type || query.length < 2) {
      return NextResponse.json({ items: [] });
    }

    const regex = new RegExp(escapeRegex(query), "i");

    if (type === "products") {
      const [matchingBrands, matchingCategories, matchingVariants] = await Promise.all([
        (await BrandModel.find({
          $or: [{ brandName: regex }, { slug: regex }],
        })
          .select("_id")
          .limit(SEARCH_LIMIT)
          .lean()
          .exec()) as Array<{ _id: unknown }>,
        (await CategoryModel.find({
          $or: [{ categoryName: regex }, { slug: regex }],
        })
          .select("_id")
          .limit(SEARCH_LIMIT)
          .lean()
          .exec()) as Array<{ _id: unknown }>,
        (await ProductVariantModel.find({
          $or: [{ sku: regex }, { variantName: regex }],
        })
          .select("productId")
          .limit(SEARCH_LIMIT)
          .lean()
          .exec()) as Array<{ productId?: unknown }>,
      ]);

      const products = (await ProductModel.find({
        status: { $ne: "ARCHIVED" },
        $or: [
          { productName: regex },
          { slug: regex },
          { status: regex },
          ...(matchingBrands.length > 0
            ? [{ brandId: { $in: matchingBrands.map((brand) => brand._id) } }]
            : []),
          ...(matchingCategories.length > 0
            ? [{ categoryId: { $in: matchingCategories.map((category) => category._id) } }]
            : []),
          ...(matchingVariants.length > 0
            ? [
                {
                  _id: {
                    $in: matchingVariants
                      .map((variant) => variant.productId)
                      .filter(Boolean),
                  },
                },
              ]
            : []),
        ],
      })
        .sort({ productName: 1 })
        .limit(SEARCH_LIMIT)
        .select("productName slug status")
        .lean()
        .exec()) as Array<{
        _id: unknown;
        productName?: string;
        slug?: string;
        status?: string;
      }>;

      return NextResponse.json({
        items: products.map((product) => ({
          id: String(product._id),
          label: product.slug
            ? `${product.productName ?? "Product"} (/${product.slug})`
            : product.productName ?? "Product",
          caption: [product.slug ? `/${product.slug}` : null, product.status ?? null]
            .filter(Boolean)
            .join(" / "),
        })),
      });
    }

    if (type === "variants") {
      const [matchingBrands, matchingCategories, matchingProducts] = await Promise.all([
        (await BrandModel.find({
          $or: [{ brandName: regex }, { slug: regex }],
        })
          .select("_id")
          .limit(SEARCH_LIMIT)
          .lean()
          .exec()) as Array<{ _id: unknown }>,
        (await CategoryModel.find({
          $or: [{ categoryName: regex }, { slug: regex }],
        })
          .select("_id")
          .limit(SEARCH_LIMIT)
          .lean()
          .exec()) as Array<{ _id: unknown }>,
        (await ProductModel.find({
          $or: [
            { productName: regex },
            { slug: regex },
            { status: regex },
          ],
        })
          .limit(SEARCH_LIMIT)
          .select("_id productName status brandId categoryId")
          .lean()
          .exec()) as Array<{
          _id: unknown;
          productName?: string;
          status?: string;
          brandId?: unknown;
          categoryId?: unknown;
        }>,
      ]);

      const relatedProductIds = new Set(
        matchingProducts.map((product) => String(product._id)),
      );

      for (const product of matchingProducts) {
        if (
          (product.brandId &&
            matchingBrands.some((brand) => String(brand._id) === String(product.brandId))) ||
          (product.categoryId &&
            matchingCategories.some(
              (category) => String(category._id) === String(product.categoryId),
            ))
        ) {
          relatedProductIds.add(String(product._id));
        }
      }

      if (matchingBrands.length > 0 || matchingCategories.length > 0) {
        const moreProducts = (await ProductModel.find({
          $or: [
            ...(matchingBrands.length > 0
              ? [{ brandId: { $in: matchingBrands.map((brand) => brand._id) } }]
              : []),
            ...(matchingCategories.length > 0
              ? [{ categoryId: { $in: matchingCategories.map((category) => category._id) } }]
              : []),
          ],
        })
          .select("_id")
          .limit(SEARCH_LIMIT)
          .lean()
          .exec()) as Array<{ _id: unknown }>;

        moreProducts.forEach((product) => relatedProductIds.add(String(product._id)));
      }

      const variants = (await ProductVariantModel.find({
        isActive: true,
        $or: [
          { sku: regex },
          { variantName: regex },
          ...(relatedProductIds.size > 0
            ? [
                {
                  productId: {
                    $in: Array.from(relatedProductIds)
                      .filter((productId) => Types.ObjectId.isValid(productId))
                      .map((productId) => new Types.ObjectId(productId)),
                  },
                },
              ]
            : []),
        ],
      })
        .sort({ updatedAt: -1 })
        .limit(SEARCH_LIMIT)
        .select("productId variantName sku")
        .lean()
        .exec()) as Array<{
        _id: unknown;
        productId?: unknown;
        variantName?: string;
        sku?: string;
      }>;

      const productIds = Array.from(
        new Set(
          variants
            .map((variant) => String(variant.productId ?? ""))
            .filter((productId) => Types.ObjectId.isValid(productId)),
        ),
      );
      const products = productIds.length
        ? ((await ProductModel.find({
            _id: { $in: productIds.map((productId) => new Types.ObjectId(productId)) },
          })
            .select("productName slug status")
            .lean()
            .exec()) as Array<{
            _id: unknown;
            productName?: string;
            slug?: string;
            status?: string;
          }>)
        : [];
      const productMap = new Map(
        products.map((product) => [
          String(product._id),
          {
            productName: product.productName ?? "Product",
            slug: product.slug ?? null,
            status: product.status ?? null,
          },
        ]),
      );

      return NextResponse.json({
        items: variants.map((variant) => ({
          id: String(variant._id),
          label: `${productMap.get(String(variant.productId ?? ""))?.productName ?? "Product"} - ${
            variant.variantName?.trim() || variant.sku || "Variant"
          }`,
          caption: [
            variant.sku ? `SKU ${variant.sku}` : null,
            productMap.get(String(variant.productId ?? ""))?.slug
              ? `/${productMap.get(String(variant.productId ?? ""))?.slug}`
              : null,
            productMap.get(String(variant.productId ?? ""))?.status ?? null,
          ]
            .filter(Boolean)
            .join(" / "),
        })),
      });
    }

    if (type === "customer-groups") {
      const groups = (await CustomerGroupModel.find({
        isActive: true,
        $or: [{ groupName: regex }, { description: regex }],
      })
        .sort({ groupName: 1 })
        .limit(SEARCH_LIMIT)
        .select("groupName description")
        .lean()
        .exec()) as Array<{
        _id: unknown;
        groupName?: string;
        description?: string;
      }>;

      return NextResponse.json({
        items: groups.map((group) => ({
          id: String(group._id),
          label: group.groupName ?? "Customer group",
          caption: group.description ?? null,
        })),
      });
    }

    return NextResponse.json({ items: [] });
  } catch (error) {
    return createErrorResponse(error);
  }
}
