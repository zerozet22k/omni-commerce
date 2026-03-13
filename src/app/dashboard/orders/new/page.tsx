import { createManualOrderAction } from "@/app/dashboard/orders/actions";
import { AdminEditorPage } from "@/components/admin/editor-page";
import { ManualOrderBuilder } from "@/components/admin/manual-order-builder";
import { SalesTabs } from "@/components/admin/module-tabs";
import { AdminPanel, AdminSectionHeader } from "@/components/admin/workspace";
import { requireOperationsUser } from "@/lib/auth/guards";
import { connectToDatabase } from "@/lib/db/mongodb";
import { ShippingMethodModel } from "@/modules/pricing/pricing.models";

export default async function DashboardOrderCreatePage() {
  await requireOperationsUser();
  await connectToDatabase();

  const shippingMethods = (await ShippingMethodModel.find({ isActive: true })
    .sort({ methodName: 1 })
    .select("methodName code")
    .lean()
    .exec()) as Array<{
    _id: unknown;
    methodName?: string;
    code?: string;
  }>;

  return (
    <AdminEditorPage
      backHref="/dashboard/orders"
      backLabel="Back to orders"
      description="Create a manual order from a dedicated workflow with linked customers, structured order lines, and live totals."
      main={
        <AdminPanel>
          <AdminSectionHeader
            title="Manual order"
            description="Pick a customer or guest contact, add variants as structured lines, and review totals before creating the order."
          />
          <form action={createManualOrderAction} className="mt-5">
            <input name="returnTo" type="hidden" value="/dashboard/orders/new" />
            <ManualOrderBuilder
              shippingMethods={shippingMethods.map((method) => ({
                id: String(method._id),
                methodName: method.methodName ?? "Shipping method",
                code: method.code ?? "",
              }))}
            />
          </form>
        </AdminPanel>
      }
      tabs={<SalesTabs currentPath="/dashboard/orders/new" />}
      title="Create Manual Order"
    />
  );
}
