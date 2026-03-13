import { notFound } from "next/navigation";
import { Types } from "mongoose";

import { saveGiftCardAction } from "@/app/dashboard/sales/actions";
import { GiftCardForm } from "@/components/admin/gift-card-form";
import { AdminEditorPage } from "@/components/admin/editor-page";
import { SalesTabs } from "@/components/admin/module-tabs";
import {
  AdminBadge,
  AdminEmptyState,
  AdminPanel,
  AdminSectionHeader,
  AdminTable,
  AdminTableBody,
  AdminTableHead,
  AdminTableShell,
  AdminTd,
  AdminTh,
} from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { connectToDatabase } from "@/lib/db/mongodb";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import { OrderModel } from "@/modules/orders/orders.models";
import { GiftCardModel, GiftCardTransactionModel } from "@/modules/pricing/pricing.models";

type GiftCardDetailPageProps = {
  params: Promise<{
    giftCardId: string;
  }>;
};

function formatDateTimeInput(value: Date | null | undefined) {
  if (!value) {
    return "";
  }

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hour = String(value.getHours()).padStart(2, "0");
  const minute = String(value.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export default async function DashboardSalesGiftCardDetailPage({
  params,
}: GiftCardDetailPageProps) {
  await requirePermission(PERMISSIONS.ordersView);
  const { giftCardId } = await params;

  if (!Types.ObjectId.isValid(giftCardId)) {
    notFound();
  }

  await connectToDatabase();

  const giftCard = (await GiftCardModel.findById(giftCardId)
    .lean()
    .exec()) as
    | {
        _id: unknown;
        code?: string;
        initialBalance?: number;
        currentBalance?: number;
        currencyCode?: string;
        expiresAt?: Date | null;
        isActive?: boolean;
      }
    | null;

  if (!giftCard) {
    notFound();
  }

  const transactions = (await GiftCardTransactionModel.find({ giftCardId })
    .sort({ createdAt: -1, _id: -1 })
    .lean()
    .exec()) as Array<{
    _id: unknown;
    orderId?: unknown;
    amount?: number;
    transactionType?: "ISSUE" | "REDEEM" | "REFUND" | "ADJUST";
    createdAt?: Date | null;
  }>;
  const orderIds = transactions
    .map((transaction) => String(transaction.orderId ?? ""))
    .filter((orderId) => Types.ObjectId.isValid(orderId));
  const orders = orderIds.length > 0
    ? ((await OrderModel.find({ _id: { $in: orderIds.map((orderId) => new Types.ObjectId(orderId)) } })
        .select("orderNo")
        .lean()
        .exec()) as Array<{ _id: unknown; orderNo?: string }>)
    : [];
  const orderMap = new Map(
    orders.map((order) => [String(order._id), order.orderNo ?? "Order"]),
  );
  const currentPath = `/dashboard/sales/gift-cards/${giftCardId}`;
  const isExpired = Boolean(
    giftCard.expiresAt && giftCard.expiresAt.getTime() < new Date().getTime(),
  );

  return (
    <AdminEditorPage
      backHref="/dashboard/sales/gift-cards"
      backLabel="Back to gift cards"
      description="Review the balance state and transaction history for this gift card."
      aside={
        <GiftCardForm
          giftCard={{
            id: String(giftCard._id),
            code: giftCard.code ?? "",
            initialBalance: Number(giftCard.initialBalance ?? 0),
            currentBalance: Number(giftCard.currentBalance ?? 0),
            currencyCode: giftCard.currencyCode ?? "MMK",
            expiresAt: formatDateTimeInput(giftCard.expiresAt ?? null),
            isActive: Boolean(giftCard.isActive),
          }}
          returnTo={currentPath}
          submitAction={saveGiftCardAction}
          submitLabel="Save gift card"
        />
      }
      main={
        <>
          <AdminPanel>
            <AdminSectionHeader
              title="Balance state"
              description="Gift card totals update through issue and redeem transactions."
            />
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Initial balance
                </p>
                <p className="mt-2 text-xl font-bold text-slate-950">
                  {formatCurrency(Number(giftCard.initialBalance ?? 0), giftCard.currencyCode ?? "MMK")}
                </p>
              </div>
              <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Current balance
                </p>
                <p className="mt-2 text-xl font-bold text-slate-950">
                  {formatCurrency(Number(giftCard.currentBalance ?? 0), giftCard.currencyCode ?? "MMK")}
                </p>
              </div>
              <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Status
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <AdminBadge
                    label={giftCard.isActive ? "ACTIVE" : "INACTIVE"}
                    tone={giftCard.isActive ? "emerald" : "rose"}
                  />
                  {isExpired ? (
                    <AdminBadge label="EXPIRED" tone="amber" />
                  ) : null}
                </div>
              </div>
            </div>
          </AdminPanel>

          <AdminPanel>
            <AdminSectionHeader
              title="Transaction history"
              description="Issue and redeem entries are recorded here."
            />
            <div className="mt-5">
              {transactions.length > 0 ? (
                <AdminTableShell>
                  <AdminTable>
                    <AdminTableHead>
                      <tr>
                        <AdminTh>Type</AdminTh>
                        <AdminTh>Amount</AdminTh>
                        <AdminTh>Order</AdminTh>
                        <AdminTh>Created</AdminTh>
                      </tr>
                    </AdminTableHead>
                    <AdminTableBody>
                      {transactions.map((transaction) => (
                        <tr key={String(transaction._id)}>
                          <AdminTd>
                            <AdminBadge
                              label={transaction.transactionType ?? "ENTRY"}
                              tone={transaction.transactionType === "REDEEM" ? "amber" : "sky"}
                            />
                          </AdminTd>
                          <AdminTd>
                            {formatCurrency(
                              Number(transaction.amount ?? 0),
                              giftCard.currencyCode ?? "MMK",
                            )}
                          </AdminTd>
                          <AdminTd>
                            {transaction.orderId
                              ? orderMap.get(String(transaction.orderId)) ?? "Order"
                              : "System"}
                          </AdminTd>
                          <AdminTd>{formatDateTime(transaction.createdAt ?? null)}</AdminTd>
                        </tr>
                      ))}
                    </AdminTableBody>
                  </AdminTable>
                </AdminTableShell>
              ) : (
                <AdminEmptyState
                  body="Gift card issue and redeem transactions will appear here."
                  title="No transactions yet"
                />
              )}
            </div>
          </AdminPanel>
        </>
      }
      tabs={<SalesTabs currentPath="/dashboard/sales/gift-cards" />}
      title={giftCard.code ?? "Gift Card"}
    />
  );
}
