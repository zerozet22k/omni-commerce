import { NextResponse, type NextRequest } from "next/server";
import { Types } from "mongoose";

import { requireAdminCrudAccess } from "@/lib/auth/api-access";
import { connectToDatabase } from "@/lib/db/mongodb";
import { createErrorResponse } from "@/lib/http/error-response";
import { CategoryModel, ProductModel, ProductVariantModel } from "@/modules/catalog/catalog.models";
import { CollectionModel } from "@/modules/catalog/catalog-extra.models";
import { PageModel } from "@/modules/content/content.models";
import { UserModel } from "@/modules/users/user.model";

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

    if (type === "customers") {
      const users = (await UserModel.find({
        role: "CUSTOMER",
        isActive: true,
        $or: [{ fullName: regex }, { email: regex }, { phone: regex }],
      })
        .sort({ fullName: 1 })
        .limit(SEARCH_LIMIT)
        .select("fullName email phone")
        .lean()
        .exec()) as Array<{
        _id: unknown;
        fullName?: string;
        email?: string;
        phone?: string;
      }>;

      return NextResponse.json({
        items: users.map((user) => ({
          id: String(user._id),
          label: user.fullName ?? "Customer",
          caption: [user.email ?? null, user.phone ?? null].filter(Boolean).join(" / "),
          meta: {
            email: user.email ?? null,
            phone: user.phone ?? null,
          },
        })),
      });
    }

    if (type === "variants") {
      const matchingProducts = (await ProductModel.find({
        $or: [{ productName: regex }, { slug: regex }],
      })
        .limit(SEARCH_LIMIT)
        .select("_id productName slug")
        .lean()
        .exec()) as Array<{
        _id: unknown;
        productName?: string;
        slug?: string;
      }>;
      const relatedProductIds = matchingProducts.map((product) => String(product._id));
      const variants = (await ProductVariantModel.find({
        isActive: true,
        $or: [
          { sku: regex },
          { variantName: regex },
          ...(relatedProductIds.length > 0
            ? [
                {
                  productId: {
                    $in: relatedProductIds
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
        .select("productId variantName sku unitPrice availableQty")
        .lean()
        .exec()) as Array<{
        _id: unknown;
        productId?: unknown;
        variantName?: string;
        sku?: string;
        unitPrice?: number;
        availableQty?: number;
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
            .select("productName slug")
            .lean()
            .exec()) as Array<{
            _id: unknown;
            productName?: string;
            slug?: string;
          }>)
        : [];
      const productMap = new Map(
        products.map((product) => [
          String(product._id),
          {
            productName: product.productName ?? "Product",
            slug: product.slug ?? null,
          },
        ]),
      );

      return NextResponse.json({
        items: variants.map((variant) => {
          const product = productMap.get(String(variant.productId ?? ""));
          const variantLabel = variant.variantName?.trim() || variant.sku || "Variant";

          return {
            id: String(variant._id),
            label: `${product?.productName ?? "Product"} - ${variantLabel}`,
            caption: [
              variant.sku ? `SKU ${variant.sku}` : null,
              product?.slug ? `/${product.slug}` : null,
              `Stock ${Number(variant.availableQty ?? 0).toLocaleString("en")}`,
            ]
              .filter(Boolean)
              .join(" / "),
            meta: {
              sku: variant.sku ?? "",
              productName: product?.productName ?? "Product",
              unitPrice: Number(variant.unitPrice ?? 0),
              availableQty: Number(variant.availableQty ?? 0),
            },
          };
        }),
      });
    }

    if (type === "products") {
      const products = (await ProductModel.find({
        status: { $ne: "ARCHIVED" },
        $or: [{ productName: regex }, { slug: regex }],
      })
        .sort({ productName: 1 })
        .limit(SEARCH_LIMIT)
        .select("productName slug")
        .lean()
        .exec()) as Array<{
        _id: unknown;
        productName?: string;
        slug?: string;
      }>;

      return NextResponse.json({
        items: products.map((product) => ({
          id: String(product._id),
          label: product.productName ?? "Product",
          caption: product.slug ? `/${product.slug}` : null,
        })),
      });
    }

    if (type === "categories") {
      const categories = (await CategoryModel.find({
        $or: [{ categoryName: regex }, { slug: regex }, { fullSlugPath: regex }],
      })
        .sort({ categoryName: 1 })
        .limit(SEARCH_LIMIT)
        .select("categoryName slug fullSlugPath")
        .lean()
        .exec()) as Array<{
        _id: unknown;
        categoryName?: string;
        slug?: string;
        fullSlugPath?: string;
      }>;

      return NextResponse.json({
        items: categories.map((category) => ({
          id: String(category._id),
          label: category.categoryName ?? "Category",
          caption: (category.fullSlugPath ?? category.slug)
            ? `/${category.fullSlugPath ?? category.slug}`
            : null,
        })),
      });
    }

    if (type === "collections") {
      const collections = (await CollectionModel.find({
        $or: [{ collectionName: regex }, { slug: regex }],
      })
        .sort({ collectionName: 1 })
        .limit(SEARCH_LIMIT)
        .select("collectionName slug")
        .lean()
        .exec()) as Array<{
        _id: unknown;
        collectionName?: string;
        slug?: string;
      }>;

      return NextResponse.json({
        items: collections.map((collection) => ({
          id: String(collection._id),
          label: collection.collectionName ?? "Collection",
          caption: collection.slug ? `/${collection.slug}` : null,
        })),
      });
    }

    if (type === "pages") {
      const pages = (await PageModel.find({
        $or: [{ title: regex }, { slug: regex }],
      })
        .sort({ title: 1 })
        .limit(SEARCH_LIMIT)
        .select("title slug status")
        .lean()
        .exec()) as Array<{
        _id: unknown;
        title?: string;
        slug?: string;
        status?: string;
      }>;

      return NextResponse.json({
        items: pages.map((page) => ({
          id: String(page._id),
          label: page.title ?? "Page",
          caption: [page.slug ? `/${page.slug}` : null, page.status ?? null]
            .filter(Boolean)
            .join(" / "),
        })),
      });
    }

    return NextResponse.json({ items: [] });
  } catch (error) {
    return createErrorResponse(error);
  }
}
