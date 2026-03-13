import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  readSearchParam,
  type AdminSearchParams,
} from "@/modules/admin/admin-query";

const ACTION_NOTICE_PARAM = "notice";
const ACTION_NOTICE_TONE_PARAM = "noticeTone";

export type ActionNoticeTone = "slate" | "emerald" | "sky" | "amber" | "rose";

function buildActionRedirectHref(
  returnTo: string,
  notice?: {
    message: string;
    tone?: ActionNoticeTone;
  },
) {
  const [pathname, queryString = ""] = returnTo.split("?");
  const searchParams = new URLSearchParams(queryString);

  searchParams.delete(ACTION_NOTICE_PARAM);
  searchParams.delete(ACTION_NOTICE_TONE_PARAM);

  if (notice?.message) {
    searchParams.set(ACTION_NOTICE_PARAM, notice.message);
    searchParams.set(ACTION_NOTICE_TONE_PARAM, notice.tone ?? "rose");
  }

  const nextQueryString = searchParams.toString();
  return nextQueryString ? `${pathname}?${nextQueryString}` : pathname;
}

export function getReturnTo(formData: FormData, fallback: string) {
  const returnTo = String(formData.get("returnTo") ?? "").trim();
  return returnTo || fallback;
}

export function getSuccessReturnTo(formData: FormData, fallback: string) {
  const successReturnTo = String(formData.get("successReturnTo") ?? "").trim();
  return successReturnTo || fallback;
}

export function readText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export function readOptionalText(formData: FormData, key: string) {
  const value = readText(formData, key);
  return value || undefined;
}

export function readNumber(formData: FormData, key: string, fallback = 0) {
  const value = Number(readText(formData, key));
  return Number.isFinite(value) ? value : fallback;
}

export function readOptionalNumber(formData: FormData, key: string) {
  const value = readText(formData, key);

  if (!value) {
    return undefined;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

export function readCheckbox(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

export function readIds(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((value) => String(value).trim())
    .filter(Boolean);
}

export function readTextLines(formData: FormData, key: string) {
  return readText(formData, key)
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function finishAction(returnTo: string, revalidatePaths: string[]) {
  for (const path of revalidatePaths) {
    revalidatePath(path);
  }

  redirect(buildActionRedirectHref(returnTo));
}

export function failAction(
  returnTo: string,
  message: string,
  tone: ActionNoticeTone = "rose",
) {
  redirect(
    buildActionRedirectHref(returnTo, {
      message,
      tone,
    }),
  );
}

export function readActionNotice(searchParams: AdminSearchParams) {
  const message = readSearchParam(searchParams, ACTION_NOTICE_PARAM).trim();
  const tone = readSearchParam(searchParams, ACTION_NOTICE_TONE_PARAM).trim();

  if (!message) {
    return null;
  }

  if (
    tone === "slate" ||
    tone === "emerald" ||
    tone === "sky" ||
    tone === "amber" ||
    tone === "rose"
  ) {
    return {
      message,
      tone,
    } satisfies {
      message: string;
      tone: ActionNoticeTone;
    };
  }

  return {
    message,
    tone: "rose",
  } satisfies {
    message: string;
    tone: ActionNoticeTone;
  };
}
