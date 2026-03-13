import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/mongodb";
import { AppError } from "@/lib/errors/app-error";
import { CategoryModel, type CategoryDocument } from "@/modules/catalog/catalog.models";

type SaveCategoryInput = {
  categoryId?: string;
  categoryName: string;
  slug: string;
  parentCategoryId?: string;
  description?: string;
  imageAssetId?: string;
  isActive?: boolean;
  sortOrder?: number;
  seoTitle?: string;
  seoDescription?: string;
};

type CategoryTreeFields = {
  parentCategoryId?: Types.ObjectId;
  fullSlugPath: string;
  depth: number;
  ancestorCategoryIds: Types.ObjectId[];
};

function normalizeObjectId(value?: string) {
  return value && Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : undefined;
}

function idsEqual(left?: Types.ObjectId | null, right?: Types.ObjectId | null) {
  if (!left && !right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return String(left) === String(right);
}

let categoryIndexSyncPromise: Promise<void> | null = null;

async function ensureCategoryIndexes() {
  if (!categoryIndexSyncPromise) {
    categoryIndexSyncPromise = CategoryModel.syncIndexes().then(() => undefined);
  }

  await categoryIndexSyncPromise;
}

export class CategoryTreeService {
  private async resolveTreeFields(
    slug: string,
    categoryId?: string,
    parentCategoryId?: string,
  ): Promise<CategoryTreeFields> {
    const normalizedParentId = normalizeObjectId(parentCategoryId);

    if (!normalizedParentId) {
      return {
        fullSlugPath: slug,
        depth: 0,
        ancestorCategoryIds: [],
      };
    }

    if (categoryId && String(normalizedParentId) === categoryId) {
      throw new AppError("A category cannot be its own parent.", 400);
    }

    const parent = (await CategoryModel.findById(normalizedParentId)
      .select("slug fullSlugPath ancestorCategoryIds")
      .lean()
      .exec()) as
      | {
          _id: unknown;
          slug?: string;
          fullSlugPath?: string;
          ancestorCategoryIds?: Types.ObjectId[];
        }
      | null;

    if (!parent) {
      throw new AppError("Parent category not found.", 404);
    }

    if (
      categoryId &&
      (parent.ancestorCategoryIds ?? []).some(
        (ancestorId: Types.ObjectId) => String(ancestorId) === categoryId,
      )
    ) {
      throw new AppError("A category cannot move under one of its descendants.", 400);
    }

    const ancestorCategoryIds = [
      ...((parent.ancestorCategoryIds ?? []) as Types.ObjectId[]),
      new Types.ObjectId(String(parent._id)),
    ];
    const basePath = typeof parent.fullSlugPath === "string" && parent.fullSlugPath.trim()
      ? parent.fullSlugPath.trim()
      : String(parent.slug ?? "").trim();

    return {
      parentCategoryId: normalizedParentId,
      fullSlugPath: basePath ? `${basePath}/${slug}` : slug,
      depth: ancestorCategoryIds.length,
      ancestorCategoryIds,
    };
  }

  private async rebuildDescendants(parent: Pick<CategoryDocument, "id" | "_id" | "slug" | "fullSlugPath" | "ancestorCategoryIds">) {
    const children = await CategoryModel.find({
      parentCategoryId: parent._id,
    })
      .sort({ sortOrder: 1, categoryName: 1 })
      .exec();

    for (const child of children) {
      const ancestorCategoryIds = [
        ...((parent.ancestorCategoryIds ?? []) as Types.ObjectId[]),
        new Types.ObjectId(String(parent._id)),
      ];
      const basePath =
        typeof parent.fullSlugPath === "string" && parent.fullSlugPath.trim()
          ? parent.fullSlugPath.trim()
          : String(parent.slug ?? "").trim();

      child.parentCategoryId = new Types.ObjectId(String(parent._id));
      child.fullSlugPath = basePath ? `${basePath}/${child.slug}` : child.slug;
      child.depth = ancestorCategoryIds.length;
      child.ancestorCategoryIds = ancestorCategoryIds;
      await child.save();
      await this.rebuildDescendants(child);
    }
  }

  async saveCategory(input: SaveCategoryInput) {
    await connectToDatabase();
    await ensureCategoryIndexes();

    const categoryId =
      input.categoryId && Types.ObjectId.isValid(input.categoryId) ? input.categoryId : undefined;
    const treeFields = await this.resolveTreeFields(input.slug, categoryId, input.parentCategoryId);
    const payload = {
      categoryName: input.categoryName,
      slug: input.slug,
      parentCategoryId: treeFields.parentCategoryId,
      description: input.description,
      imageAssetId: normalizeObjectId(input.imageAssetId),
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? 0,
      seoTitle: input.seoTitle,
      seoDescription: input.seoDescription,
      fullSlugPath: treeFields.fullSlugPath,
      depth: treeFields.depth,
      ancestorCategoryIds: treeFields.ancestorCategoryIds,
    };

    if (!categoryId) {
      return CategoryModel.create(payload);
    }

    const existing = await CategoryModel.findById(categoryId).exec();

    if (!existing) {
      throw new AppError("Category record was not found.", 404);
    }

    const treeChanged =
      existing.slug !== payload.slug ||
      !idsEqual(existing.parentCategoryId ?? null, payload.parentCategoryId ?? null);

    existing.categoryName = payload.categoryName;
    existing.slug = payload.slug;
    existing.parentCategoryId = payload.parentCategoryId;
    existing.description = payload.description;
    existing.imageAssetId = payload.imageAssetId;
    existing.isActive = payload.isActive;
    existing.sortOrder = payload.sortOrder;
    existing.seoTitle = payload.seoTitle;
    existing.seoDescription = payload.seoDescription;
    existing.fullSlugPath = payload.fullSlugPath;
    existing.depth = payload.depth;
    existing.ancestorCategoryIds = payload.ancestorCategoryIds;

    await existing.save();

    if (treeChanged) {
      await this.rebuildDescendants(existing);
    }

    return existing;
  }
}

export const categoryTreeService = new CategoryTreeService();
