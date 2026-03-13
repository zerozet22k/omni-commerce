import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { AppError } from "@/lib/errors/app-error";
import { slugify } from "@/lib/utils/slugify";
import { MediaAssetModel } from "@/modules/core/core.models";

function getFileExtension(file: File) {
  const providedExtension = path.extname(file.name).replace(".", "").toLowerCase();

  if (providedExtension) {
    return providedExtension;
  }

  if (file.type === "image/png") {
    return "png";
  }

  if (file.type === "image/webp") {
    return "webp";
  }

  if (file.type === "image/gif") {
    return "gif";
  }

  return "jpg";
}

export function readOptionalImageUpload(formData: FormData, key: string) {
  const value = formData.get(key);

  if (!value || typeof value === "string" || value.size === 0) {
    return null;
  }

  if (!value.type.startsWith("image/")) {
    throw new AppError("Only image uploads are supported here.", 400);
  }

  return value;
}

export async function storeUploadedImageAsset(
  file: File,
  options: {
    directory: string;
    title?: string;
    altText?: string;
  },
) {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const safeBaseName = slugify(path.parse(file.name).name) || "image";
  const extension = getFileExtension(file);
  const relativeDirectory = path.join("uploads", options.directory, year, month);
  const absoluteDirectory = path.join(process.cwd(), "public", relativeDirectory);
  const fileName = `${safeBaseName}-${randomUUID()}.${extension}`;

  await mkdir(absoluteDirectory, { recursive: true });
  await writeFile(
    path.join(absoluteDirectory, fileName),
    Buffer.from(await file.arrayBuffer()),
  );

  return MediaAssetModel.create({
    assetType: "IMAGE",
    url: `/${path.join(relativeDirectory, fileName).replace(/\\/g, "/")}`,
    altText: options.altText,
    title: options.title,
    mimeType: file.type || undefined,
    sizeBytes: file.size,
  });
}
