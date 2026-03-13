import { readActionNotice } from "@/app/dashboard/action-helpers";
import type { AdminSearchParams } from "@/modules/admin/admin-query";

import { AdminInlineHint } from "@/components/admin/workspace";

export function AdminActionNotice({
  searchParams,
}: {
  searchParams: AdminSearchParams;
}) {
  const notice = readActionNotice(searchParams);

  if (!notice) {
    return null;
  }

  return <AdminInlineHint tone={notice.tone}>{notice.message}</AdminInlineHint>;
}
