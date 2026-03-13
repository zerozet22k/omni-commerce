import { notFound } from "next/navigation";

import { deleteUserAction, toggleUserActiveAction } from "@/app/dashboard/users/actions";
import { AdminEditorPage } from "@/components/admin/editor-page";
import { AdminUserForm } from "@/components/admin/user-form";
import {
  AdminActionButton,
  AdminBadge,
  AdminEmptyState,
  AdminPanel,
  AdminSectionHeader,
} from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

type UserDetailPageProps = {
  params: Promise<{
    userId: string;
  }>;
};

export default async function DashboardUserDetailPage({
  params,
}: UserDetailPageProps) {
  await requirePermission(PERMISSIONS.usersManage);
  const { userId } = await params;
  const workspace = await adminWorkspaceService.getUsersWorkspace({ userId });
  const user = workspace.selectedUser;

  if (!user) {
    notFound();
  }

  const currentPath = `/dashboard/users/${userId}`;

  return (
    <AdminEditorPage
      backHref="/dashboard/users"
      backLabel="Back to users"
      description="Edit account details, role, and lifecycle state from a focused user editor."
      main={
        <>
          <AdminPanel>
            <AdminSectionHeader
              title="User record"
              description="Changes here update the account record used across admin access and customer history."
            />
            <div className="mt-5">
              <AdminUserForm
                returnTo={currentPath}
                submitLabel="Save user"
                user={user}
              />
            </div>
          </AdminPanel>

          <AdminPanel>
            <AdminSectionHeader title="Recent orders" />
            <div className="mt-4 space-y-3">
              {user.recentOrders.length > 0 ? (
                user.recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{order.orderNo}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDateTime(order.orderDate)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <AdminBadge label={order.status} tone="slate" />
                        <span className="text-sm font-semibold text-slate-950">
                          {formatCurrency(order.grandTotal, "MMK")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <AdminEmptyState
                  title="No recent orders"
                  body="Orders linked to this user will appear here."
                />
              )}
            </div>
          </AdminPanel>
        </>
      }
      aside={
        <>
          <AdminPanel>
            <AdminSectionHeader title="User summary" />
            <div className="mt-4 grid gap-3">
              <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Lifecycle</p>
                <p className="mt-2 text-sm text-slate-700">
                  Joined {formatDateTime(user.registrationDate)}
                </p>
              </div>
              <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Customer details</p>
                <p className="mt-2 text-sm text-slate-700">
                  {user.addressCount} addresses / {user.totalOrders} orders /{" "}
                  {formatCurrency(user.totalSpent, "MMK")}
                </p>
              </div>
            </div>
          </AdminPanel>

          <AdminPanel>
            <AdminSectionHeader title="Record actions" />
            <div className="mt-4 flex flex-wrap gap-3">
              <form action={toggleUserActiveAction}>
                <input name="userId" type="hidden" value={user.id} />
                <input
                  name="isActive"
                  type="hidden"
                  value={user.isActive ? "false" : "true"}
                />
                <input name="returnTo" type="hidden" value={currentPath} />
                <AdminActionButton tone={user.isActive ? "amber" : "emerald"}>
                  {user.isActive ? "Deactivate" : "Activate"}
                </AdminActionButton>
              </form>
              <form action={deleteUserAction}>
                <input name="userId" type="hidden" value={user.id} />
                <input name="returnTo" type="hidden" value="/dashboard/users" />
                <AdminActionButton tone="rose">Delete if allowed</AdminActionButton>
              </form>
            </div>
          </AdminPanel>
        </>
      }
      title="User"
    />
  );
}
