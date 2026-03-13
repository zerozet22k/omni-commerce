import type { ReactNode } from "react";

import { AdminActionNotice } from "@/components/admin/action-notice";
import { AdminLinkButton, AdminPage, AdminPageHeader } from "@/components/admin/workspace";
import type { AdminSearchParams } from "@/modules/admin/admin-query";

export function AdminEditorPage({
  title,
  description,
  backHref,
  backLabel,
  tabs,
  main,
  aside,
  headerActions,
  searchParams,
}: {
  title: string;
  description: string;
  backHref: string;
  backLabel: string;
  tabs?: ReactNode;
  main: ReactNode;
  aside?: ReactNode;
  headerActions?: ReactNode;
  searchParams?: AdminSearchParams;
}) {
  return (
    <AdminPage>
      <AdminPageHeader
        actions={
          <>
            {headerActions}
            <AdminLinkButton href={backHref} tone="primary">
              {backLabel}
            </AdminLinkButton>
          </>
        }
        title={title}
        description={description}
      />

      {tabs}

      {searchParams ? <AdminActionNotice searchParams={searchParams} /> : null}

      {aside ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-4">{main}</div>
          <div className="min-w-0 space-y-4">{aside}</div>
        </div>
      ) : (
        <div className="space-y-4">{main}</div>
      )}
    </AdminPage>
  );
}
