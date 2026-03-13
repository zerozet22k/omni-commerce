import { Types } from "mongoose";

export function storefrontToId(value: unknown) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Types.ObjectId) {
    return value.toString();
  }

  if (typeof value === "object" && "toString" in value) {
    return String(value.toString());
  }

  return String(value);
}

export function storefrontNullableString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function storefrontNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  return fallback;
}

export function storefrontUnique<T>(items: T[]) {
  return Array.from(new Set(items));
}

export function storefrontIsInRange(
  now: Date,
  startsAt?: Date | null,
  endsAt?: Date | null,
) {
  if (startsAt && startsAt > now) {
    return false;
  }

  if (endsAt && endsAt < now) {
    return false;
  }

  return true;
}

export function storefrontSortImageEntries(
  entries: Array<{ assetId?: unknown; sortOrder?: number; isPrimary?: boolean }> | undefined,
) {
  return [...(entries ?? [])].sort((left, right) => {
    const primaryDelta =
      Number(Boolean(right.isPrimary)) - Number(Boolean(left.isPrimary));

    if (primaryDelta !== 0) {
      return primaryDelta;
    }

    return storefrontNumber(left.sortOrder) - storefrontNumber(right.sortOrder);
  });
}

export function storefrontImageAssetIds(
  entries: Array<{ assetId?: unknown; sortOrder?: number; isPrimary?: boolean }> | undefined,
) {
  return storefrontSortImageEntries(entries)
    .map((entry) => storefrontToId(entry.assetId))
    .filter(Boolean);
}

export function storefrontEscapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
