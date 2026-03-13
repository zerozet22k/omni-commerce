import { OptionTypeForm } from "@/components/admin/catalog-forms";
import { CatalogTabs } from "@/components/admin/module-tabs";
import {
  AdminInlineHint,
  AdminLinkButton,
  AdminPage,
  AdminPageHeader,
  AdminPanel,
  AdminSectionHeader,
} from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";

export default async function DashboardCatalogOptionTypeCreatePage() {
  await requirePermission(PERMISSIONS.catalogView);

  return (
    <AdminPage>
      <AdminPageHeader
        actions={
          <AdminLinkButton href="/dashboard/catalog/option-types" tone="primary">
            Back to option types
          </AdminLinkButton>
        }
        title="Create New Option Type"
        description="Use the dedicated option type page when you need a focused create flow instead of working from the list."
      />

      <CatalogTabs currentPath="/dashboard/catalog/option-types/new" />

      <AdminPanel>
        <AdminSectionHeader
          title="Option type record"
          description="Create the reusable variant dimension first. Option values can be added from the list view right after creation."
        />
        <div className="mt-5 space-y-4">
          <OptionTypeForm
            returnTo="/dashboard/catalog/option-types"
            submitLabel="Create option type"
          />
          <AdminInlineHint tone="sky">
            After saving, return to the option type list to add the actual values such as sizes, colors, or storage levels.
          </AdminInlineHint>
        </div>
      </AdminPanel>
    </AdminPage>
  );
}
