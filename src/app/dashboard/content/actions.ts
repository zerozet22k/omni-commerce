"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { Types } from "mongoose";
import { z } from "zod";

import { failAction, finishAction, getReturnTo, readCheckbox, readOptionalText, readText } from "@/app/dashboard/action-helpers";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { AppError } from "@/lib/errors/app-error";
import { readOptionalImageUpload, storeUploadedImageAsset } from "@/lib/media/upload";
import { slugify } from "@/lib/utils/slugify";
import {
  BannerModel,
  NavigationMenuItemModel,
  NavigationMenuModel,
  PageModel,
} from "@/modules/content/content.models";

function parseContentSchema<T>(schema: z.ZodType<T>, input: unknown) {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "Invalid content input.", 400);
  }

  return parsed.data;
}

const pageInputSchema = z.object({
  title: z.string().trim().min(1, "Page title is required.").max(150),
  slug: z.string().trim().min(1, "Page slug is required.").max(150),
  content: z.string().trim().optional(),
  seoTitle: z.string().trim().max(255).optional(),
  seoDescription: z.string().trim().max(500).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
});

const bannerInputSchema = z.object({
  title: z.string().trim().min(1, "Banner name is required.").max(120),
  bannerType: z.enum(["HERO", "PROMO", "CATEGORY"]),
  assetId: z.string().trim().optional(),
  linkUrl: z.string().trim().max(255).optional(),
  bannerTitle: z.string().trim().max(150).optional(),
  subtitle: z.string().trim().max(255).optional(),
  startsAt: z.string().trim().optional(),
  endsAt: z.string().trim().optional(),
  sortOrder: z.coerce.number().int().min(0),
  isActive: z.boolean(),
});

const navigationMenuInputSchema = z.object({
  title: z.string().trim().min(1, "Menu name is required.").max(80),
  isActive: z.boolean(),
});

const navigationMenuItemInputSchema = z.object({
  navigationMenuId: z.string().trim().min(1, "Navigation menu is required."),
  itemId: z.string().trim().optional(),
  parentItemId: z.string().trim().optional(),
  label: z.string().trim().min(1, "Item label is required.").max(120),
  linkType: z.enum(["URL", "CATEGORY", "COLLECTION", "PAGE", "PRODUCT"]),
  linkValue: z.string().trim().min(1, "Link value is required.").max(255),
  sortOrder: z.coerce.number().int().min(0),
  isActive: z.boolean(),
});

function parseOptionalDate(value?: string) {
  if (!value) {
    return undefined;
  }

  const nextDate = new Date(value);
  return Number.isNaN(nextDate.getTime()) ? undefined : nextDate;
}

const CONTENT_REVALIDATE_PATHS = [
  "/dashboard/content/pages",
  "/dashboard/content/banners",
  "/dashboard/content/navigation-menus",
  "/",
] as const;

function readBulkIds(formData: FormData, returnTo: string) {
  const ids = Array.from(
    new Set(
      formData
        .getAll("selectedIds")
        .map((value) => String(value).trim())
        .filter((value) => Types.ObjectId.isValid(value)),
    ),
  );

  if (ids.length === 0) {
    failAction(returnTo, "Select at least one record first.", "amber");
  }

  return ids;
}

function handleBulkContentFailure(error: unknown, returnTo: string) {
  if (isRedirectError(error)) {
    throw error;
  }

  if (error instanceof AppError) {
    failAction(returnTo, error.message);
  }

  throw error;
}

export async function saveContentRecordAction(formData: FormData) {
  await requirePermission(PERMISSIONS.settingsManage);

  const kind = readText(formData, "kind");
  const recordId = readText(formData, "recordId");
  const returnTo = getReturnTo(formData, "/dashboard/content/pages");

  if (kind === "pages") {
    const payload = parseContentSchema(pageInputSchema, {
      title: readText(formData, "title"),
      slug: readOptionalText(formData, "slug") ?? slugify(readText(formData, "title")),
      content: readOptionalText(formData, "content"),
      seoTitle: readOptionalText(formData, "seoTitle"),
      seoDescription: readOptionalText(formData, "seoDescription"),
      status: readText(formData, "status") || "DRAFT",
    });
    const existingPage =
      recordId && Types.ObjectId.isValid(recordId)
        ? await PageModel.findById(recordId).select("publishedAt").lean().exec()
        : null;

    const nextPage = {
      title: payload.title,
      slug: payload.slug,
      content: payload.content,
      seoTitle: payload.seoTitle,
      seoDescription: payload.seoDescription,
      status: payload.status,
      publishedAt:
        payload.status === "PUBLISHED"
          ? existingPage?.publishedAt ?? new Date()
          : undefined,
    };

    if (recordId && Types.ObjectId.isValid(recordId)) {
      await PageModel.findByIdAndUpdate(recordId, nextPage).exec();
    } else {
      await PageModel.create(nextPage);
    }
  }

  if (kind === "banners") {
    const uploadedAsset = readOptionalImageUpload(formData, "imageFile");
    const payload = parseContentSchema(bannerInputSchema, {
      title: readText(formData, "title"),
      bannerType: readText(formData, "bannerType") || "HERO",
      assetId: readOptionalText(formData, "assetId"),
      linkUrl: readOptionalText(formData, "linkUrl"),
      bannerTitle: readOptionalText(formData, "bannerTitle"),
      subtitle: readOptionalText(formData, "subtitle"),
      startsAt: readOptionalText(formData, "startsAt"),
      endsAt: readOptionalText(formData, "endsAt"),
      sortOrder: readText(formData, "sortOrder") || "0",
      isActive: readCheckbox(formData, "isActive"),
    });
    const resolvedAssetId = uploadedAsset
      ? String(
          (
            await storeUploadedImageAsset(uploadedAsset, {
              directory: "content",
              title: payload.bannerTitle ?? payload.title,
              altText: payload.bannerTitle ?? payload.title,
            })
          ).id,
        )
      : payload.assetId;

    if (!resolvedAssetId) {
      throw new AppError("Banner asset is required.", 400);
    }

    const nextBanner = {
      bannerName: payload.title,
      bannerType: payload.bannerType,
      assetId: resolvedAssetId,
      linkUrl: payload.linkUrl,
      title: payload.bannerTitle,
      subtitle: payload.subtitle,
      startsAt: parseOptionalDate(payload.startsAt),
      endsAt: parseOptionalDate(payload.endsAt),
      sortOrder: payload.sortOrder,
      isActive: payload.isActive,
    };

    if (recordId && Types.ObjectId.isValid(recordId)) {
      await BannerModel.findByIdAndUpdate(recordId, nextBanner).exec();
    } else {
      await BannerModel.create(nextBanner);
    }
  }

  if (kind === "navigation-menus") {
    const payload = parseContentSchema(navigationMenuInputSchema, {
      title: readText(formData, "title"),
      isActive: readCheckbox(formData, "isActive"),
    });

    if (recordId && Types.ObjectId.isValid(recordId)) {
      await NavigationMenuModel.findByIdAndUpdate(recordId, {
        menuName: payload.title,
        isActive: payload.isActive,
      }).exec();
    } else {
      await NavigationMenuModel.create({
        menuName: payload.title,
        isActive: payload.isActive,
      });
    }
  }

  finishAction(returnTo, [...CONTENT_REVALIDATE_PATHS]);
}

export async function deleteContentRecordAction(formData: FormData) {
  await requirePermission(PERMISSIONS.settingsManage);

  const kind = readText(formData, "kind");
  const recordId = readText(formData, "recordId");
  const returnTo = getReturnTo(formData, "/dashboard/content/pages");

  if (!Types.ObjectId.isValid(recordId)) {
    finishAction(returnTo, [...CONTENT_REVALIDATE_PATHS]);
  }

  if (kind === "pages") {
    const linkedMenuItemCount = await NavigationMenuItemModel.countDocuments({
      linkType: "PAGE",
      linkValue: recordId,
    }).exec();

    if (linkedMenuItemCount > 0) {
      await PageModel.findByIdAndUpdate(recordId, { status: "ARCHIVED" }).exec();
    } else {
      await PageModel.findByIdAndDelete(recordId).exec();
    }
  }

  if (kind === "banners") {
    await BannerModel.findByIdAndDelete(recordId).exec();
  }

  if (kind === "navigation-menus") {
    const linkedItemCount = await NavigationMenuItemModel.countDocuments({
      navigationMenuId: recordId,
    }).exec();

    if (linkedItemCount > 0) {
      await NavigationMenuModel.findByIdAndUpdate(recordId, { isActive: false }).exec();
    } else {
      await NavigationMenuModel.findByIdAndDelete(recordId).exec();
    }
  }

  finishAction(returnTo, [...CONTENT_REVALIDATE_PATHS]);
}

export async function saveNavigationMenuItemAction(formData: FormData) {
  await requirePermission(PERMISSIONS.settingsManage);

  const returnTo = getReturnTo(formData, "/dashboard/content/navigation-menus");
  const payload = parseContentSchema(navigationMenuItemInputSchema, {
    navigationMenuId: readText(formData, "navigationMenuId"),
    itemId: readOptionalText(formData, "itemId"),
    parentItemId: readOptionalText(formData, "parentItemId"),
    label: readText(formData, "label"),
    linkType: readText(formData, "linkType") || "URL",
    linkValue: readText(formData, "linkValue"),
    sortOrder: readText(formData, "sortOrder") || "0",
    isActive: readCheckbox(formData, "isActive"),
  });

  const nextItem = {
    navigationMenuId: payload.navigationMenuId,
    parentItemId: payload.parentItemId || undefined,
    label: payload.label,
    linkType: payload.linkType,
    linkValue: payload.linkValue,
    sortOrder: payload.sortOrder,
    isActive: payload.isActive,
  };

  if (payload.itemId && payload.parentItemId && payload.itemId === payload.parentItemId) {
    throw new AppError("A menu item cannot be its own parent.", 400);
  }

  if (payload.parentItemId) {
    const parentItem = await NavigationMenuItemModel.findById(payload.parentItemId)
      .select("navigationMenuId")
      .lean()
      .exec();

    if (!parentItem || String(parentItem.navigationMenuId ?? "") !== payload.navigationMenuId) {
      throw new AppError("Selected parent item was not found in this menu.", 404);
    }
  }

  if (payload.linkType !== "URL" && !Types.ObjectId.isValid(payload.linkValue)) {
    throw new AppError("Choose a linked resource for this menu item.", 400);
  }

  if (payload.itemId && Types.ObjectId.isValid(payload.itemId)) {
    await NavigationMenuItemModel.findByIdAndUpdate(payload.itemId, nextItem).exec();
  } else {
    await NavigationMenuItemModel.create(nextItem);
  }

  finishAction(returnTo, [...CONTENT_REVALIDATE_PATHS]);
}

export async function deleteNavigationMenuItemAction(formData: FormData) {
  await requirePermission(PERMISSIONS.settingsManage);

  const itemId = readText(formData, "itemId");
  const returnTo = getReturnTo(formData, "/dashboard/content/navigation-menus");

  if (Types.ObjectId.isValid(itemId)) {
    await NavigationMenuItemModel.deleteMany({
      $or: [{ _id: itemId }, { parentItemId: itemId }],
    }).exec();
  }

  finishAction(returnTo, [...CONTENT_REVALIDATE_PATHS]);
}

export async function bulkContentRecordAction(formData: FormData) {
  await requirePermission(PERMISSIONS.settingsManage);

  const kind = readText(formData, "kind");
  const bulkAction = readText(formData, "bulkAction");
  const returnTo = getReturnTo(formData, "/dashboard/content/pages");
  const selectedIds = readBulkIds(formData, returnTo);

  try {
    const objectIds = selectedIds.map((id) => new Types.ObjectId(id));

    if (kind === "pages") {
      if (bulkAction === "publish") {
        await PageModel.updateMany(
          { _id: { $in: objectIds } },
          { status: "PUBLISHED", publishedAt: new Date() },
        ).exec();
      } else if (bulkAction === "unpublish") {
        await PageModel.updateMany(
          { _id: { $in: objectIds } },
          { status: "DRAFT" },
        ).exec();
      } else {
        failAction(returnTo, "Unsupported page bulk action.", "amber");
      }
    }

    if (kind === "banners") {
      if (bulkAction !== "activate" && bulkAction !== "deactivate") {
        failAction(returnTo, "Unsupported banner bulk action.", "amber");
      }

      await BannerModel.updateMany(
        { _id: { $in: objectIds } },
        { isActive: bulkAction === "activate" },
      ).exec();
    }

    if (kind === "navigation-menus") {
      if (bulkAction !== "activate" && bulkAction !== "deactivate") {
        failAction(returnTo, "Unsupported navigation menu bulk action.", "amber");
      }

      await NavigationMenuModel.updateMany(
        { _id: { $in: objectIds } },
        { isActive: bulkAction === "activate" },
      ).exec();
    }

    finishAction(returnTo, [...CONTENT_REVALIDATE_PATHS]);
  } catch (error) {
    handleBulkContentFailure(error, returnTo);
  }
}
