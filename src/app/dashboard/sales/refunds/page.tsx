import { Types } from "mongoose";

import { updateRefundAction } from "@/app/dashboard/sales/actions";
import { SalesTabs } from "@/components/admin/module-tabs";
import { AdminRefundsGrid } from "@/components/admin/refunds-grid";
import {
  AdminActionButton,
  AdminBadge,
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
import { RefundModel, ReturnModel } from "@/modules/engagement/engagement.models";
import { OrderModel } from "@/modules/orders/orders.models";
import { PaymentModel } from "@/modules/payments/payments.models";

type RefundsPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

const PAGE_LIMIT = 15;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getTone(value: string) {
  if (["PAID", "APPROVED"].includes(value)) {
    return "emerald" as const;
  }

  if (["PENDING"].includes(value)) {
    return "amber" as const;
  }

  if (["REJECTED"].includes(value)) {
    return "rose" as const;
  }

  return "slate" as const;
}

export default async function DashboardSalesRefundsPage({
  searchParams,
}: RefundsPageProps) {
  await requirePermission(PERMISSIONS.ordersView);
  const resolvedSearchParams = await searchParams;

  await connectToDatabase();

  const query = readSearchParam(resolvedSearchParams, "q").trim();
  const status = readSearchParam(resolvedSearchParams, "status");
  const sort = readSearchParam(resolvedSearchParams, "sort") || "newest";
  const selectedRefundId = readSearchParam(resolvedSearchParams, "refundId");
  const requestedPage = readNumberParam(resolvedSearchParams, "page", 1);

  const filter: Record<string, unknown> = {};

  if (status) {
    filter.status = status;
  }

  if (query) {
    const regex = new RegExp(escapeRegex(query), "i");
    const [matchingOrders, matchingReturns] = await Promise.all([
      (await OrderModel.find({
        $or: [
          { orderNo: regex },
          { customerNameSnapshot: regex },
          { customerEmailSnapshot: regex },
        ],
      })
        .select("_id")
        .lean()
        .exec()) as Array<{ _id: unknown }>,
      (await ReturnModel.find({
        $or: [{ returnNo: regex }, { reason: regex }, { note: regex }],
      })
        .select("_id")
        .lean()
        .exec()) as Array<{ _id: unknown }>,
    ]);

    filter.$or = [
      { reason: regex },
      ...(matchingOrders.length > 0
        ? [{ orderId: { $in: matchingOrders.map((order) => order._id) } }]
        : []),
      ...(matchingReturns.length > 0
        ? [{ returnId: { $in: matchingReturns.map((item) => item._id) } }]
        : []),
    ];
  }

  const [metrics, total] = await Promise.all([
    Promise.all([
      RefundModel.countDocuments({ status: "PENDING" }).exec(),
      RefundModel.countDocuments({ status: "APPROVED" }).exec(),
      RefundModel.countDocuments({ status: "PAID" }).exec(),
      RefundModel.countDocuments({ status: "REJECTED" }).exec(),
    ]),
    RefundModel.countDocuments(filter).exec(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const page = clampPage(requestedPage, totalPages);
  const sortMap: Record<string, Record<string, 1 | -1>> = {
    newest: { createdAt: -1, _id: -1 },
    oldest: { createdAt: 1, _id: 1 },
    amount_desc: { amount: -1, _id: -1 },
    amount_asc: { amount: 1, _id: 1 },
  };

  const refunds = (await RefundModel.find(filter)
    .sort(sortMap[sort] ?? sortMap.newest)
    .skip((page - 1) * PAGE_LIMIT)
    .limit(PAGE_LIMIT)
    .lean()
    .exec()) as Array<{
    _id: unknown;
    orderId?: unknown;
    paymentId?: unknown;
    returnId?: unknown;
    amount?: number;
    currencyCode?: string;
    status?: string;
    reason?: string;
    createdAt?: Date;
    processedAt?: Date;
  }>;

  const orderIds = refunds.map((refund) => String(refund.orderId ?? "")).filter(Boolean);
  const returnIds = refunds.map((refund) => String(refund.returnId ?? "")).filter(Boolean);

  const [orders, returns] = await Promise.all([
    orderIds.length > 0
      ? ((await OrderModel.find({ _id: { $in: orderIds } })
          .select("orderNo customerNameSnapshot customerEmailSnapshot")
          .lean()
          .exec()) as Array<{
          _id: unknown;
          orderNo?: string;
          customerNameSnapshot?: string;
          customerEmailSnapshot?: string;
        }>)
      : [],
    returnIds.length > 0
      ? ((await ReturnModel.find({ _id: { $in: returnIds } })
          .select("returnNo status")
          .lean()
          .exec()) as Array<{
          _id: unknown;
          returnNo?: string;
          status?: string;
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
        customerEmail:
          typeof order.customerEmailSnapshot === "string" && order.customerEmailSnapshot.trim()
            ? order.customerEmailSnapshot
            : null,
      },
    ]),
  );
  const returnMap = new Map(
    returns.map((item) => [
      String(item._id),
      {
        returnNo: typeof item.returnNo === "string" ? item.returnNo : "Return",
        status: typeof item.status === "string" ? item.status : "REQUESTED",
      },
    ]),
  );

  let selectedRefund: null | {
    id: string;
    orderId: string;
    paymentId: string | null;
    returnId: string | null;
    amount: number;
    currencyCode: string;
    status: string;
    reason: string | null;
    createdAt: Date | null;
    processedAt: Date | null;
    orderNo: string;
    customerName: string;
    customerEmail: string | null;
    paymentStatus: string | null;
    transactionRef: string | null;
    returnNo: string | null;
    returnStatus: string | null;
  } = null;

  if (Types.ObjectId.isValid(selectedRefundId)) {
    const refund = (await RefundModel.findById(selectedRefundId)
      .lean()
      .exec()) as
      | {
          _id: unknown;
          orderId?: unknown;
          paymentId?: unknown;
          returnId?: unknown;
          amount?: number;
          currencyCode?: string;
          status?: string;
          reason?: string;
          createdAt?: Date;
          processedAt?: Date;
        }
      | null;

    if (refund) {
      const [order, payment, returnRecord] = await Promise.all([
        (await OrderModel.findById(refund.orderId)
          .select("orderNo customerNameSnapshot customerEmailSnapshot")
          .lean()
          .exec()) as
          | {
              _id: unknown;
              orderNo?: string;
              customerNameSnapshot?: string;
              customerEmailSnapshot?: string;
            }
          | null,
        refund.paymentId
          ? ((await PaymentModel.findById(refund.paymentId)
              .select("status transactionRef")
              .lean()
              .exec()) as { status?: string; transactionRef?: string } | null)
          : null,
        refund.returnId
          ? ((await ReturnModel.findById(refund.returnId)
              .select("returnNo status")
              .lean()
              .exec()) as { returnNo?: string; status?: string } | null)
          : null,
      ]);

      selectedRefund = {
        id: String(refund._id),
        orderId: String(refund.orderId ?? ""),
        paymentId: refund.paymentId ? String(refund.paymentId) : null,
        returnId: refund.returnId ? String(refund.returnId) : null,
        amount: Number(refund.amount ?? 0),
        currencyCode: typeof refund.currencyCode === "string" ? refund.currencyCode : "MMK",
        status: typeof refund.status === "string" ? refund.status : "PENDING",
        reason:
          typeof refund.reason === "string" && refund.reason.trim() ? refund.reason : null,
        createdAt: refund.createdAt ?? null,
        processedAt: refund.processedAt ?? null,
        orderNo: typeof order?.orderNo === "string" ? order.orderNo : "Order",
        customerName:
          typeof order?.customerNameSnapshot === "string" && order.customerNameSnapshot.trim()
            ? order.customerNameSnapshot
            : "Customer",
        customerEmail:
          typeof order?.customerEmailSnapshot === "string" && order.customerEmailSnapshot.trim()
            ? order.customerEmailSnapshot
            : null,
        paymentStatus:
          payment && typeof payment.status === "string" ? payment.status : null,
        transactionRef:
          payment &&
          typeof payment.transactionRef === "string" &&
          payment.transactionRef.trim()
            ? payment.transactionRef
            : null,
        returnNo:
          returnRecord &&
          typeof returnRecord.returnNo === "string" &&
          returnRecord.returnNo.trim()
            ? returnRecord.returnNo
            : null,
        returnStatus:
          returnRecord && typeof returnRecord.status === "string"
            ? returnRecord.status
            : null,
      };
    }
  }

  return (
    <AdminPage>
      <AdminPageHeader
        title="Refunds"
        description="Review refund records, verify the related order or return context, and update payout state from a dedicated sales module."
        meta={<AdminBadge label={`${total} matched`} tone="sky" />}
      />

      <SalesTabs currentPath="/dashboard/sales/refunds" />

      <AdminSummaryStrip
        columns={4}
        items={[
          { label: "Pending", value: metrics[0].toLocaleString("en"), hint: "Awaiting review" },
          { label: "Approved", value: metrics[1].toLocaleString("en"), hint: "Approved but not yet paid" },
          { label: "Paid", value: metrics[2].toLocaleString("en"), hint: "Completed refunds" },
          { label: "Rejected", value: metrics[3].toLocaleString("en"), hint: "Refund requests declined" },
        ]}
      />

      <AdminToolbar>
        <form action="/dashboard/sales/refunds" className="space-y-3" method="get">
          <AdminFilterGrid className="xl:grid-cols-[1.35fr_0.8fr_0.8fr]">
            <AdminField
              defaultValue={query}
              label="Search"
              name="q"
              placeholder="Order no, return no, customer, reason"
            />
            <AdminSelect
              defaultValue={status}
              label="Status"
              name="status"
              options={[
                { value: "", label: "All statuses" },
                { value: "PENDING", label: "PENDING" },
                { value: "APPROVED", label: "APPROVED" },
                { value: "REJECTED", label: "REJECTED" },
                { value: "PAID", label: "PAID" },
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
            <AdminLinkButton href="/dashboard/sales/refunds">Reset</AdminLinkButton>
          </div>
        </form>
      </AdminToolbar>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_420px]">
        <AdminPanel>
          <AdminSectionHeader
            title="Refund queue"
            description="Select a refund to inspect its order, payment, and return context before updating the payout state."
          />
          <div className="mt-4 space-y-4">
            <AdminRefundsGrid
              rows={refunds.map((refund) => ({
                id: String(refund._id),
                href: buildHref("/dashboard/sales/refunds", resolvedSearchParams, {
                  refundId: String(refund._id),
                }),
                refundLabel: refund.reason ?? "Refund record",
                createdAtLabel: formatDateTime(refund.createdAt ?? null),
                orderNo: orderMap.get(String(refund.orderId ?? ""))?.orderNo ?? "Order",
                customerName:
                  orderMap.get(String(refund.orderId ?? ""))?.customerName ?? "Customer",
                returnNo: returnMap.get(String(refund.returnId ?? ""))?.returnNo ?? "No return",
                returnStatus:
                  returnMap.get(String(refund.returnId ?? ""))?.status ?? "Manual refund",
                status: typeof refund.status === "string" ? refund.status : "PENDING",
                amountLabel: formatCurrency(
                  Number(refund.amount ?? 0),
                  typeof refund.currencyCode === "string" ? refund.currencyCode : "MMK",
                ),
              }))}
              selectionHint="Selection is available here for future payout workflows. Destructive bulk actions are intentionally disabled on refunds."
              selectionInputName="selectedIds"
              selectionLabel="refunds"
            />

            <AdminPagination
              hrefBuilder={(nextPage) =>
                buildHref("/dashboard/sales/refunds", resolvedSearchParams, { page: nextPage })
              }
              page={page}
              totalPages={totalPages}
            />
          </div>
        </AdminPanel>

        <div className="space-y-4">
          {selectedRefund ? (
            <>
              <AdminPanel>
                <AdminSectionHeader
                  title={selectedRefund.orderNo}
                  description={`${selectedRefund.customerName} / ${formatDateTime(selectedRefund.createdAt)}`}
                  actions={
                    <AdminLinkButton href={`/dashboard/orders/${selectedRefund.orderId}`}>
                      View order
                    </AdminLinkButton>
                  }
                />
                <div className="mt-4 grid gap-3">
                  <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Refund state</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <AdminBadge label={selectedRefund.status} tone={getTone(selectedRefund.status)} />
                      {selectedRefund.returnStatus ? (
                        <AdminBadge label={selectedRefund.returnStatus} tone="sky" />
                      ) : null}
                      {selectedRefund.paymentStatus ? (
                        <AdminBadge label={selectedRefund.paymentStatus} tone="slate" />
                      ) : null}
                    </div>
                  </div>
                  <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Amount</p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      {formatCurrency(selectedRefund.amount, selectedRefund.currencyCode)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Created {formatDateTime(selectedRefund.createdAt)} / Processed {formatDateTime(selectedRefund.processedAt)}
                    </p>
                  </div>
                  <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Related records</p>
                    <p className="mt-2 text-sm text-slate-700">
                      {selectedRefund.returnNo ?? "No return record"} / {selectedRefund.transactionRef ?? "No payment reference"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {selectedRefund.customerEmail ?? "No customer email"}
                    </p>
                  </div>
                  {selectedRefund.reason ? (
                    <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Reason</p>
                      <p className="mt-2 text-sm text-slate-700">{selectedRefund.reason}</p>
                    </div>
                  ) : null}
                </div>
              </AdminPanel>

              <AdminPanel>
                <AdminSectionHeader title="Update refund" />
                <form action={updateRefundAction} className="mt-4 space-y-4">
                  <input name="refundId" type="hidden" value={selectedRefund.id} />
                  <input
                    name="returnTo"
                    type="hidden"
                    value={buildHref("/dashboard/sales/refunds", resolvedSearchParams, {
                      refundId: selectedRefund.id,
                    })}
                  />
                  <AdminSelect
                    defaultValue={selectedRefund.status}
                    label="Status"
                    name="status"
                    options={[
                      { value: "PENDING", label: "PENDING" },
                      { value: "APPROVED", label: "APPROVED" },
                      { value: "REJECTED", label: "REJECTED" },
                      { value: "PAID", label: "PAID" },
                    ]}
                  />
                  <AdminTextarea
                    defaultValue={selectedRefund.reason ?? ""}
                    label="Reason"
                    name="reason"
                    rows={3}
                  />
                  <AdminActionButton tone="sky">Save refund update</AdminActionButton>
                </form>
              </AdminPanel>
            </>
          ) : (
            <AdminPanel>
              <AdminSectionHeader
                title="Refund detail"
                description="Select a refund from the queue to inspect its related order, return, and payment context."
              />
            </AdminPanel>
          )}
        </div>
      </div>
    </AdminPage>
  );
}
