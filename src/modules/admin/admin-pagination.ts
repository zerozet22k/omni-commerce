import { clampPage } from "@/modules/admin/admin-query";

export const PAGE_LIMIT = 20;
export const SIMPLE_RECORD_LIMIT = 15;
export const MAX_PAGE_LIMIT = 100;

export type AdminPaginationState = {
  limit: number;
  offset: number;
  page: number;
  total: number;
  totalPages: number;
};

export function ensureLimit(value: number, fallback = PAGE_LIMIT) {
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return Math.min(Math.floor(value), MAX_PAGE_LIMIT);
}

export function resolvePagination(
  total: number,
  requestedPage: number,
  limit: number,
): AdminPaginationState {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const page = clampPage(requestedPage, totalPages);

  return {
    limit,
    offset: (page - 1) * limit,
    page,
    total,
    totalPages,
  };
}
