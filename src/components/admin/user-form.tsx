import { saveUserAction } from "@/app/dashboard/users/actions";
import {
  AdminActionButton,
  AdminCheckbox,
  AdminField,
  AdminFormGrid,
  AdminSelect,
} from "@/components/admin/workspace";
import type { UsersWorkspace } from "@/modules/admin/admin-workspace.service";

export function AdminUserForm({
  user,
  returnTo,
  submitLabel,
}: {
  user?: UsersWorkspace["selectedUser"];
  returnTo: string;
  submitLabel: string;
}) {
  return (
    <form action={saveUserAction} className="space-y-4">
      <input name="userId" type="hidden" value={user?.id ?? ""} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <AdminFormGrid columns={2}>
        <AdminField
          defaultValue={user?.fullName}
          label="Full name"
          name="fullName"
          placeholder="Full name"
        />
        <AdminSelect
          defaultValue={user?.role ?? "CUSTOMER"}
          label="Role"
          name="role"
          options={[
            { value: "OWNER", label: "OWNER" },
            { value: "ADMIN", label: "ADMIN" },
            { value: "STAFF", label: "STAFF" },
            { value: "CUSTOMER", label: "CUSTOMER" },
          ]}
        />
        <AdminField
          defaultValue={user?.email ?? ""}
          label="Email"
          name="email"
          placeholder="email@example.com"
          type="email"
        />
        <AdminField
          defaultValue={user?.phone ?? ""}
          label="Phone"
          name="phone"
          placeholder="Optional phone"
        />
        <AdminField
          label={user ? "New password" : "Password"}
          name="password"
          placeholder={user ? "Leave blank to keep current" : "Minimum 8 characters"}
          type="password"
        />
      </AdminFormGrid>
      <div className="grid gap-3 md:grid-cols-2">
        <AdminCheckbox
          defaultChecked={user?.isActive ?? true}
          label="Active"
          name="isActive"
        />
        <AdminCheckbox
          defaultChecked={user?.emailVerified ?? false}
          label="Email verified"
          name="emailVerified"
        />
      </div>
      <AdminActionButton>{submitLabel}</AdminActionButton>
    </form>
  );
}
