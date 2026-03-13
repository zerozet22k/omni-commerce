import { AdminUsersGrid } from "@/components/admin/users-grid";
import { AdminActionNotice } from "@/components/admin/action-notice";
import {
  AdminActionButton,
  AdminField,
  AdminFilterGrid,
  AdminLinkButton,
  AdminPage,
  AdminPageHeader,
  AdminPagination,
  AdminPanel,
  AdminSectionHeader,
  AdminSelect,
  AdminSummaryStrip,
  AdminToolbar,
} from "@/components/admin/workspace";
import { bulkUserAction } from "@/app/dashboard/users/actions";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

type UsersPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardUsersPage({
  searchParams,
}: UsersPageProps) {
  await requirePermission(PERMISSIONS.usersManage);
  const resolvedSearchParams = await searchParams;
  const workspace = await adminWorkspaceService.getUsersWorkspace(resolvedSearchParams);
  const currentHref = adminWorkspaceService.buildHref(
    "/dashboard/users",
    resolvedSearchParams,
    {},
  );

  return (
    <AdminPage>
      <AdminPageHeader
        actions={
          <AdminLinkButton href="/dashboard/users/new" tone="primary">
            Create new user
          </AdminLinkButton>
        }
        title="Users"
        description="Manage customers and staff as real records with role changes, activation, and dedicated edit routes."
      />

      <AdminActionNotice searchParams={resolvedSearchParams} />

      <AdminSummaryStrip
        columns={3}
        items={workspace.metrics.map((metric) => ({
          label: metric.label,
          value: metric.value.toLocaleString("en"),
          hint: metric.hint,
        }))}
      />

      <AdminToolbar>
        <form action="/dashboard/users" className="space-y-4" method="get">
          <AdminFilterGrid>
            <AdminField
              defaultValue={workspace.filters.query}
              label="Search"
              name="q"
              placeholder="Name, email, phone"
            />
            <AdminSelect
              defaultValue={workspace.filters.segment}
              label="Segment"
              name="segment"
              options={[
                { value: "all", label: "All users" },
                { value: "customers", label: "Customers" },
                { value: "staff", label: "Staff and admins" },
              ]}
            />
            <AdminSelect
              defaultValue={workspace.filters.role}
              label="Role"
              name="role"
              options={[
                { value: "", label: "All roles" },
                { value: "OWNER", label: "OWNER" },
                { value: "ADMIN", label: "ADMIN" },
                { value: "STAFF", label: "STAFF" },
                { value: "CUSTOMER", label: "CUSTOMER" },
              ]}
            />
            <AdminSelect
              defaultValue={workspace.filters.active}
              label="Active"
              name="active"
              options={[
                { value: "active", label: "Active only" },
                { value: "inactive", label: "Inactive only" },
                { value: "all", label: "All states" },
              ]}
            />
            <AdminSelect
              defaultValue={workspace.filters.sort}
              label="Sort"
              name="sort"
              options={[
                { value: "newest", label: "Newest first" },
                { value: "oldest", label: "Oldest first" },
                { value: "name_asc", label: "Name A-Z" },
                { value: "name_desc", label: "Name Z-A" },
                { value: "login", label: "Recent login" },
              ]}
            />
          </AdminFilterGrid>
          <div className="flex flex-wrap gap-3">
            <input name="page" type="hidden" value="1" />
            <AdminActionButton>Apply filters</AdminActionButton>
            <AdminLinkButton href="/dashboard/users">Reset</AdminLinkButton>
          </div>
        </form>
      </AdminToolbar>

      <AdminPanel>
        <AdminSectionHeader
          title="Users"
          description="Customer totals, spend, address counts, and last login surface directly in the list, with safe activation workflows for selected users."
        />
        <form action={bulkUserAction} className="mt-4 space-y-4">
          <input name="returnTo" type="hidden" value={currentHref} />

          <AdminUsersGrid
            bulkActions={[
              { label: "Activate selected", tone: "emerald", value: "activate" },
              { label: "Deactivate selected", tone: "amber", value: "deactivate" },
            ]}
            rows={workspace.items.map((item) => ({
              id: item.id,
              href: `/dashboard/users/${item.id}`,
              fullName: item.fullName,
              contactLabel: item.email ?? item.phone ?? "No contact saved",
              lastLoginLabel: formatDateTime(item.lastLoginAt),
              role: item.role,
              orderSummary: `${item.totalOrders.toLocaleString("en")} orders`,
              spendLabel: formatCurrency(item.totalSpent, "MMK"),
              addressCountLabel: item.addressCount.toLocaleString("en"),
              isActive: item.isActive,
            }))}
            selectionHint="Bulk user actions only change activation state. Destructive batch delete is intentionally disabled."
            selectionInputName="selectedIds"
            selectionLabel="users"
          />

          <AdminPagination
            hrefBuilder={(page) =>
              adminWorkspaceService.buildHref("/dashboard/users", resolvedSearchParams, {
                page,
              })
            }
            page={workspace.page}
            totalPages={workspace.totalPages}
          />
        </form>
      </AdminPanel>
    </AdminPage>
  );
}
