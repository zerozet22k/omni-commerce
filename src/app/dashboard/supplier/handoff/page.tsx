import { SupplierTabs } from "@/components/admin/module-tabs";
import {
  AdminLinkButton,
  AdminPage,
  AdminPageHeader,
  AdminPanel,
  AdminSectionHeader,
  AdminSummaryStrip,
} from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";
import { dashboardService } from "@/modules/dashboard/dashboard.service";

type SupplierHandoffPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardSupplierHandoffPage({
  searchParams,
}: SupplierHandoffPageProps) {
  await requirePermission(PERMISSIONS.inventoryView);
  const resolvedSearchParams = await searchParams;
  const [supplierWorkspace, inventorySnapshot] = await Promise.all([
    adminWorkspaceService.getSupplierWorkspace(resolvedSearchParams),
    dashboardService.getInventoryPageData(),
  ]);

  return (
    <AdminPage>
      <AdminPageHeader
        title="Procurement Workflow Guide"
        description="Use this secondary utility when staff need the shortest path from supplier setup to low-stock and restock execution."
      />

      <SupplierTabs currentPath="/dashboard/supplier/handoff" />

      <AdminSummaryStrip
        columns={3}
        items={[
          {
            label: "Active suppliers",
            value: supplierWorkspace.metrics[0]?.value.toLocaleString("en") ?? "0",
            hint: supplierWorkspace.metrics[0]?.hint ?? "Suppliers available for purchasing",
          },
          {
            label: "Low stock variants",
            value: inventorySnapshot.metrics[1]?.value.toLocaleString("en") ?? "0",
            hint: inventorySnapshot.metrics[1]?.hint ?? "Variants that need replenishment",
          },
          {
            label: "Restocks moving",
            value: inventorySnapshot.metrics[2]?.value.toLocaleString("en") ?? "0",
            hint: inventorySnapshot.metrics[2]?.hint ?? "Purchase orders already in flight",
          },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <AdminPanel>
          <AdminSectionHeader
            title="1. Prepare suppliers"
            description="Create or update supplier and platform records first so procurement works from clean source data."
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <AdminLinkButton href="/dashboard/supplier">Suppliers</AdminLinkButton>
            <AdminLinkButton href="/dashboard/supplier/platforms">Platforms</AdminLinkButton>
          </div>
        </AdminPanel>

        <AdminPanel>
          <AdminSectionHeader
            title="2. Attach variant links"
            description="Bind supplier URLs to the exact sellable variants that purchasing and replenishment teams use."
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <AdminLinkButton href="/dashboard/supplier/links">Variant links</AdminLinkButton>
            <AdminLinkButton href="/dashboard/catalog/products">Catalog</AdminLinkButton>
          </div>
        </AdminPanel>

        <AdminPanel>
          <AdminSectionHeader
            title="3. Hand off to inventory"
            description="Once links are ready, move straight into stock and restock workflows without retyping supplier data."
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <AdminLinkButton href="/dashboard/inventory">Stock</AdminLinkButton>
            <AdminLinkButton href="/dashboard/inventory/restocks">Restocks</AdminLinkButton>
          </div>
        </AdminPanel>
      </div>
    </AdminPage>
  );
}
