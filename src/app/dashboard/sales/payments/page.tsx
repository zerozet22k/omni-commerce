import { Types } from "mongoose";

import { updatePaymentAction } from "@/app/dashboard/sales/actions";
import { SalesTabs } from "@/components/admin/module-tabs";
import { AdminPaymentsGrid } from "@/components/admin/payments-grid";
import {
  AdminActionButton,
  AdminBadge,
  AdminEmptyState,
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
  AdminTextarea,
  AdminToolbar,
} from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { connectToDatabase } from "@/lib/db/mongodb";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import {
  buildHref,
  clampPage,
  readNumberParam,
  readSearchParam,
  type AdminSearchParams,
} from "@/modules/admin/admin-query";
import { MediaAssetModel } from "@/modules/core/core.models";
import { OrderModel } from "@/modules/orders/orders.models";
import {
  PaymentMethodModel,
  PaymentModel,
  PaymentTransactionModel,
} from "@/modules/payments/payments.models";
import { UserModel } from "@/modules/users/user.model";

type PaymentsPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

const PAGE_LIMIT = 15;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getTone(value: string) {
  if (["CONFIRMED", "SUCCESS"].includes(value)) {
    return "emerald" as const;
  }

  if (["SUBMITTED", "AUTHORIZED", "PENDING"].includes(value)) {
    return "amber" as const;
  }

  if (["REJECTED", "REFUNDED", "FAILED"].includes(value)) {
    return "rose" as const;
  }

  return "slate" as const;
}

export default async function DashboardSalesPaymentsPage({
  searchParams,
}: PaymentsPageProps) {
  await requirePermission(PERMISSIONS.ordersView);
  const resolvedSearchParams = await searchParams;

  await connectToDatabase();

  const query = readSearchParam(resolvedSearchParams, "q").trim();
  const status = readSearchParam(resolvedSearchParams, "status");
  const paymentMethodId = readSearchParam(resolvedSearchParams, "paymentMethodId");
  const sort = readSearchParam(resolvedSearchParams, "sort") || "newest";
  const selectedPaymentId = readSearchParam(resolvedSearchParams, "paymentId");
  const requestedPage = readNumberParam(resolvedSearchParams, "page", 1);

  const filter: Record<string, unknown> = {};

  if (status) {
    filter.status = status;
  }

  if (paymentMethodId && Types.ObjectId.isValid(paymentMethodId)) {
    filter.paymentMethodId = new Types.ObjectId(paymentMethodId);
  }

  if (query) {
    const regex = new RegExp(escapeRegex(query), "i");
    const [matchingOrders, matchingMethods] = await Promise.all([
      (await OrderModel.find({
        $or: [
          { orderNo: regex },
          { customerNameSnapshot: regex },
          { customerEmailSnapshot: regex },
          { customerPhoneSnapshot: regex },
        ],
      })
        .select("_id")
        .lean()
        .exec()) as Array<{ _id: unknown }>,
      (await PaymentMethodModel.find({
        $or: [{ methodName: regex }, { code: regex }],
      })
        .select("_id")
        .lean()
        .exec()) as Array<{ _id: unknown }>,
    ]);

    filter.$or = [
      { transactionRef: regex },
      ...(matchingOrders.length > 0
        ? [{ orderId: { $in: matchingOrders.map((order) => order._id) } }]
        : []),
      ...(matchingMethods.length > 0
        ? [{ paymentMethodId: { $in: matchingMethods.map((method) => method._id) } }]
        : []),
    ];
  }

  const [paymentMethods, metrics, total] = await Promise.all([
    (await PaymentMethodModel.find({ isActive: true })
      .sort({ methodName: 1 })
      .select("methodName code")
      .lean()
      .exec()) as Array<{
      _id: unknown;
      methodName?: string;
      code?: string;
    }>,
    Promise.all([
      PaymentModel.countDocuments({ status: "SUBMITTED" }).exec(),
      PaymentModel.countDocuments({ status: "CONFIRMED" }).exec(),
      PaymentModel.countDocuments({ status: "REFUNDED" }).exec(),
      PaymentModel.countDocuments({ status: "REJECTED" }).exec(),
    ]),
    PaymentModel.countDocuments(filter).exec(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const page = clampPage(requestedPage, totalPages);
  const sortMap: Record<string, Record<string, 1 | -1>> = {
    newest: { paymentDate: -1, _id: -1 },
    oldest: { paymentDate: 1, _id: 1 },
    amount_desc: { amount: -1, _id: -1 },
    amount_asc: { amount: 1, _id: 1 },
  };

  const payments = (await PaymentModel.find(filter)
    .sort(sortMap[sort] ?? sortMap.newest)
    .skip((page - 1) * PAGE_LIMIT)
    .limit(PAGE_LIMIT)
    .lean()
    .exec()) as Array<{
    _id: unknown;
    orderId?: unknown;
    paymentMethodId?: unknown;
    amount?: number;
    currencyCode?: string;
    transactionRef?: string;
    status?: string;
    paymentDate?: Date;
    confirmedAt?: Date;
  }>;

  const orderIds = payments.map((payment) => String(payment.orderId ?? "")).filter(Boolean);
  const methodIds = payments
    .map((payment) => String(payment.paymentMethodId ?? ""))
    .filter(Boolean);

  const [orders, methods] = await Promise.all([
    orderIds.length > 0
      ? ((await OrderModel.find({ _id: { $in: orderIds } })
          .select("orderNo customerNameSnapshot")
          .lean()
          .exec()) as Array<{
          _id: unknown;
          orderNo?: string;
          customerNameSnapshot?: string;
        }>)
      : [],
    methodIds.length > 0
      ? ((await PaymentMethodModel.find({ _id: { $in: methodIds } })
          .select("methodName code")
          .lean()
          .exec()) as Array<{
          _id: unknown;
          methodName?: string;
          code?: string;
        }>)
      : [],
  ]);

  const orderMap = new Map(
    orders.map((order) => [
      String(order._id),
      {
        orderNo: typeof order.orderNo === "string" ? order.orderNo : "Order",
        customerName:
          typeof order.customerNameSnapshot === "string" && order.customerNameSnapshot.trim()
            ? order.customerNameSnapshot
            : "Customer",
      },
    ]),
  );
  const methodMap = new Map(
    methods.map((method) => [
      String(method._id),
      typeof method.methodName === "string"
        ? `${method.methodName}${method.code ? ` (${method.code})` : ""}`
        : "Payment method",
    ]),
  );

  let selectedPayment: null | {
    id: string;
    orderId: string;
    orderNo: string;
    customerName: string;
    methodName: string;
    amount: number;
    currencyCode: string;
    status: string;
    transactionRef: string | null;
    paymentDate: Date | null;
    confirmedAt: Date | null;
    confirmedByName: string | null;
    slipAssetUrl: string | null;
    transactions: Array<{
      id: string;
      gatewayName: string | null;
      gatewayTransactionId: string | null;
      transactionType: string;
      amount: number;
      currencyCode: string;
      status: string;
      createdAt: Date | null;
    }>;
  } = null;

  if (Types.ObjectId.isValid(selectedPaymentId)) {
    const payment = (await PaymentModel.findById(selectedPaymentId)
      .lean()
      .exec()) as
      | {
          _id: unknown;
          orderId?: unknown;
          paymentMethodId?: unknown;
          amount?: number;
          currencyCode?: string;
          transactionRef?: string;
          slipAssetId?: unknown;
          status?: string;
          paymentDate?: Date;
          confirmedAt?: Date;
          confirmedBy?: unknown;
        }
      | null;

    if (payment) {
      const [order, method, transactions, confirmedBy, slipAsset] = await Promise.all([
        (await OrderModel.findById(payment.orderId)
          .select("orderNo customerNameSnapshot")
          .lean()
          .exec()) as
          | {
              _id: unknown;
              orderNo?: string;
              customerNameSnapshot?: string;
            }
          | null,
        (await PaymentMethodModel.findById(payment.paymentMethodId)
          .select("methodName code")
          .lean()
          .exec()) as
          | {
              _id: unknown;
              methodName?: string;
              code?: string;
            }
          | null,
        (await PaymentTransactionModel.find({ paymentId: selectedPaymentId })
          .sort({ createdAt: -1 })
          .lean()
          .exec()) as Array<{
          _id: unknown;
          gatewayName?: string;
          gatewayTransactionId?: string;
          transactionType?: string;
          amount?: number;
          currencyCode?: string;
          status?: string;
          createdAt?: Date;
        }>,
        payment.confirmedBy
          ? ((await UserModel.findById(payment.confirmedBy)
              .select("fullName")
              .lean()
              .exec()) as { fullName?: string } | null)
          : null,
        payment.slipAssetId
          ? ((await MediaAssetModel.findById(payment.slipAssetId)
              .select("url")
              .lean()
              .exec()) as { url?: string } | null)
          : null,
      ]);

      selectedPayment = {
        id: String(payment._id),
        orderId: String(payment.orderId ?? ""),
        orderNo: typeof order?.orderNo === "string" ? order.orderNo : "Order",
        customerName:
          typeof order?.customerNameSnapshot === "string" && order.customerNameSnapshot.trim()
            ? order.customerNameSnapshot
            : "Customer",
        methodName:
          typeof method?.methodName === "string"
            ? `${method.methodName}${method.code ? ` (${method.code})` : ""}`
            : "Payment method",
        amount: Number(payment.amount ?? 0),
        currencyCode: typeof payment.currencyCode === "string" ? payment.currencyCode : "MMK",
        status: typeof payment.status === "string" ? payment.status : "SUBMITTED",
        transactionRef:
          typeof payment.transactionRef === "string" && payment.transactionRef.trim()
            ? payment.transactionRef
            : null,
        paymentDate: payment.paymentDate ?? null,
        confirmedAt: payment.confirmedAt ?? null,
        confirmedByName:
          confirmedBy && typeof confirmedBy.fullName === "string" ? confirmedBy.fullName : null,
        slipAssetUrl:
          slipAsset && typeof slipAsset.url === "string" ? slipAsset.url : null,
        transactions: transactions.map((transaction) => ({
          id: String(transaction._id),
          gatewayName:
            typeof transaction.gatewayName === "string" && transaction.gatewayName.trim()
              ? transaction.gatewayName
              : null,
          gatewayTransactionId:
            typeof transaction.gatewayTransactionId === "string" &&
            transaction.gatewayTransactionId.trim()
              ? transaction.gatewayTransactionId
              : null,
          transactionType:
            typeof transaction.transactionType === "string"
              ? transaction.transactionType
              : "AUTH",
          amount: Number(transaction.amount ?? 0),
          currencyCode:
            typeof transaction.currencyCode === "string" ? transaction.currencyCode : "MMK",
          status: typeof transaction.status === "string" ? transaction.status : "PENDING",
          createdAt: transaction.createdAt ?? null,
        })),
      };
    }
  }

  return (
    <AdminPage>
      <AdminPageHeader
        title="Payments"
        description="Review submitted payments, confirm or reject records, and inspect transaction history from a dedicated sales workspace."
        meta={<AdminBadge label={`${total} matched`} tone="sky" />}
      />

      <SalesTabs currentPath="/dashboard/sales/payments" />

      <AdminSummaryStrip
        columns={4}
        items={[
          { label: "Submitted", value: metrics[0].toLocaleString("en"), hint: "Awaiting staff review" },
          { label: "Confirmed", value: metrics[1].toLocaleString("en"), hint: "Accepted payments" },
          { label: "Refunded", value: metrics[2].toLocaleString("en"), hint: "Payments already refunded" },
          { label: "Rejected", value: metrics[3].toLocaleString("en"), hint: "Payment submissions declined" },
        ]}
      />

      <AdminToolbar>
        <form action="/dashboard/sales/payments" className="space-y-3" method="get">
          <AdminFilterGrid className="xl:grid-cols-[1.4fr_0.8fr_0.9fr_0.8fr]">
            <AdminField
              defaultValue={query}
              label="Search"
              name="q"
              placeholder="Order no, customer, transaction ref, method"
            />
            <AdminSelect
              defaultValue={status}
              label="Status"
              name="status"
              options={[
                { value: "", label: "All statuses" },
                { value: "SUBMITTED", label: "SUBMITTED" },
                { value: "AUTHORIZED", label: "AUTHORIZED" },
                { value: "CONFIRMED", label: "CONFIRMED" },
                { value: "REJECTED", label: "REJECTED" },
                { value: "REFUNDED", label: "REFUNDED" },
              ]}
            />
            <AdminSelect
              defaultValue={paymentMethodId}
              label="Method"
              name="paymentMethodId"
              options={[
                { value: "", label: "All methods" },
                ...paymentMethods.map((method) => ({
                  value: String(method._id),
                  label: `${method.methodName ?? "Method"}${method.code ? ` (${method.code})` : ""}`,
                })),
              ]}
            />
            <AdminSelect
              defaultValue={sort}
              label="Sort"
              name="sort"
              options={[
                { value: "newest", label: "Newest first" },
                { value: "oldest", label: "Oldest first" },
                { value: "amount_desc", label: "Highest amount" },
                { value: "amount_asc", label: "Lowest amount" },
              ]}
            />
          </AdminFilterGrid>
          <div className="flex flex-wrap gap-3">
            <input name="page" type="hidden" value="1" />
            <AdminActionButton>Apply filters</AdminActionButton>
            <AdminLinkButton href="/dashboard/sales/payments">Reset</AdminLinkButton>
          </div>
        </form>
      </AdminToolbar>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_420px]">
        <AdminPanel>
          <AdminSectionHeader
            title="Payment queue"
            description="Select any payment to inspect its transaction history and update its staff review state."
          />
          <div className="mt-4 space-y-4">
            <AdminPaymentsGrid
              rows={payments.map((payment) => ({
                id: String(payment._id),
                href: buildHref("/dashboard/sales/payments", resolvedSearchParams, {
                  paymentId: String(payment._id),
                }),
                paymentLabel: payment.transactionRef ?? "Manual payment",
                paymentDateLabel: formatDateTime(payment.paymentDate ?? null),
                orderNo: orderMap.get(String(payment.orderId ?? ""))?.orderNo ?? "Order",
                customerName:
                  orderMap.get(String(payment.orderId ?? ""))?.customerName ?? "Customer",
                methodLabel:
                  methodMap.get(String(payment.paymentMethodId ?? "")) ?? "Payment method",
                status: typeof payment.status === "string" ? payment.status : "SUBMITTED",
                amountLabel: formatCurrency(
                  Number(payment.amount ?? 0),
                  typeof payment.currencyCode === "string" ? payment.currencyCode : "MMK",
                ),
              }))}
              selectionHint="Selection is available for future batch review workflows. Destructive bulk actions are intentionally disabled on payments."
              selectionInputName="selectedIds"
              selectionLabel="payments"
            />

            <AdminPagination
              hrefBuilder={(nextPage) =>
                buildHref("/dashboard/sales/payments", resolvedSearchParams, { page: nextPage })
              }
              page={page}
              totalPages={totalPages}
            />
          </div>
        </AdminPanel>

        <div className="space-y-4">
          {selectedPayment ? (
            <>
              <AdminPanel>
                <AdminSectionHeader
                  title={selectedPayment.orderNo}
                  description={`${selectedPayment.customerName} / ${selectedPayment.methodName}`}
                  actions={
                    <AdminLinkButton href={`/dashboard/orders/${selectedPayment.orderId}`}>
                      View order
                    </AdminLinkButton>
                  }
                />
                <div className="mt-4 grid gap-3">
                  <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Payment state</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <AdminBadge label={selectedPayment.status} tone={getTone(selectedPayment.status)} />
                      {selectedPayment.confirmedByName ? (
                        <AdminBadge label={`BY ${selectedPayment.confirmedByName}`} tone="sky" />
                      ) : null}
                    </div>
                  </div>
                  <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Amount</p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      {formatCurrency(selectedPayment.amount, selectedPayment.currencyCode)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDateTime(selectedPayment.paymentDate)} / Confirmed {formatDateTime(selectedPayment.confirmedAt)}
                    </p>
                  </div>
                  {selectedPayment.slipAssetUrl ? (
                    <div className="overflow-hidden rounded-[1rem] border border-stone-200 bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt="Payment slip"
                        className="h-56 w-full bg-stone-100 object-contain"
                        src={selectedPayment.slipAssetUrl}
                      />
                    </div>
                  ) : null}
                </div>
              </AdminPanel>

              <AdminPanel>
                <AdminSectionHeader title="Transaction history" />
                <div className="mt-4 space-y-3">
                  {selectedPayment.transactions.length > 0 ? (
                    selectedPayment.transactions.map((transaction) => (
                      <div
                        className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3"
                        key={transaction.id}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-900">
                              {transaction.gatewayName ?? "Admin"} / {transaction.transactionType}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {transaction.gatewayTransactionId ?? "No gateway transaction id"} / {formatDateTime(transaction.createdAt)}
                            </p>
                          </div>
                          <div className="text-right">
                            <AdminBadge label={transaction.status} tone={getTone(transaction.status)} />
                            <p className="mt-2 text-sm font-semibold text-slate-950">
                              {formatCurrency(transaction.amount, transaction.currencyCode)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <AdminEmptyState
                      title="No transactions yet"
                      body="Manual review actions will append transaction history here."
                    />
                  )}
                </div>
              </AdminPanel>

              <AdminPanel>
                <AdminSectionHeader title="Update payment" />
                <form action={updatePaymentAction} className="mt-4 space-y-4">
                  <input name="paymentId" type="hidden" value={selectedPayment.id} />
                  <input
                    name="returnTo"
                    type="hidden"
                    value={buildHref("/dashboard/sales/payments", resolvedSearchParams, {
                      paymentId: selectedPayment.id,
                    })}
                  />
                  <AdminSelect
                    defaultValue={selectedPayment.status}
                    label="Status"
                    name="status"
                    options={[
                      { value: "SUBMITTED", label: "SUBMITTED" },
                      { value: "AUTHORIZED", label: "AUTHORIZED" },
                      { value: "CONFIRMED", label: "CONFIRMED" },
                      { value: "REJECTED", label: "REJECTED" },
                      { value: "REFUNDED", label: "REFUNDED" },
                    ]}
                  />
                  <AdminField
                    defaultValue={selectedPayment.transactionRef ?? ""}
                    label="Transaction ref"
                    name="transactionRef"
                    placeholder="Optional transaction reference"
                  />
                  <AdminTextarea label="Note" name="note" rows={3} />
                  <AdminActionButton tone="sky">Save payment update</AdminActionButton>
                </form>
              </AdminPanel>
            </>
          ) : (
            <AdminPanel>
              <AdminSectionHeader
                title="Payment detail"
                description="Select a payment from the queue to review its slip and transaction history."
              />
            </AdminPanel>
          )}
        </div>
      </div>
    </AdminPage>
  );
}
