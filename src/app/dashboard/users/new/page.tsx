import { AdminEditorPage } from "@/components/admin/editor-page";
import { AdminUserForm } from "@/components/admin/user-form";
import { AdminPanel, AdminSectionHeader } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";

export default async function DashboardUserCreatePage() {
  await requirePermission(PERMISSIONS.usersManage);

  return (
    <AdminEditorPage
      backHref="/dashboard/users"
      backLabel="Back to users"
      description="Create staff or customer accounts from a dedicated editor instead of creating records inline from the list."
      main={
        <AdminPanel>
          <AdminSectionHeader
            title="User record"
            description="Create the account, role, and lifecycle state from one focused user screen."
          />
          <div className="mt-5">
            <AdminUserForm returnTo="/dashboard/users" submitLabel="Create user" />
          </div>
        </AdminPanel>
      }
      title="Create User"
    />
  );
}
