import { GiftCardForm } from "@/components/admin/gift-card-form";
import { AdminEditorPage } from "@/components/admin/editor-page";
import { SalesTabs } from "@/components/admin/module-tabs";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { saveGiftCardAction } from "@/app/dashboard/sales/actions";

export default async function DashboardSalesGiftCardCreatePage() {
  await requirePermission(PERMISSIONS.ordersView);

  return (
    <AdminEditorPage
      backHref="/dashboard/sales/gift-cards"
      backLabel="Back to gift cards"
      description="Issue a new balance code for checkout and gift-card redemption workflows."
      main={
        <GiftCardForm
          returnTo="/dashboard/sales/gift-cards"
          submitAction={saveGiftCardAction}
          submitLabel="Create gift card"
        />
      }
      tabs={<SalesTabs currentPath="/dashboard/sales/gift-cards" />}
      title="New Gift Card"
    />
  );
}
