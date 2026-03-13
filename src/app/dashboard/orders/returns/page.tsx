import { Types } from "mongoose";

import { SalesTabs } from "@/components/admin/module-tabs";
import { AdminReturnsGrid } from "@/components/admin/returns-grid";
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
import {
  recordReturnRefundAction,
  updateReturnStatusAction,
} from "@/app/dashboard/orders/actions";
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
import { RefundModel, ReturnItemModel, ReturnModel } from "@/modules/engagement/engagement.models";
import { OrderItemModel, OrderModel } from "@/modules/orders/orders.models";
import { PaymentMethodModel, PaymentModel } from "@/modules/payments/payments.models";

type ReturnsPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

const PAGE_LIMIT = 12;

const RETURN_STATUS_OPTIONS = [
  "",
  "REQUESTED",
  "APPROVED",
  "REJECTED",
  "RECEIVED",
  "REFUNDED",
  "CLOSED",
];

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getTone(value: string) {
  if (["APPROVED", "REFUNDED", "CLOSED", "PAID"].includes(value)) {
    return "emerald" as const;
  }

  if (["REQUESTED", "RECEIVED", "PENDING"].includes(value)) {
    return "amber" as const;
  }

  if (["REJECTED", "FAILED"].includes(value)) {
    return "rose" as const;
  }

  return "slate" as const;
}

export default async function DashboardOrderReturnsPage({
  searchParams,
}: ReturnsPageProps) {
  await requirePermission(PERMISSIONS.ordersView);
  const resolvedSearchParams = await searchParams;

  await connectToDatabase();

  const query = readSearchParam(resolvedSearchParams, "q").trim();
  const status = readSearchParam(resolvedSearchParams, "status");
  const selectedReturnId = readSearchParam(resolvedSearchParams, "returnId");
  const selectedOrderId = readSearchParam(resolvedSearchParams, "orderId");
  const requestedPage = readNumberParam(resolvedSearchParams, "page", 1);

  const filter: Record<string, unknown> = {};

  if (status) {
    filter.status = status;
  }

  if (Types.ObjectId.isValid(selectedOrderId)) {
    filter.orderId = new Types.ObjectId(selectedOrderId);
  }

  if (query) {
    const regex = new RegExp(escapeRegex(query), "i");
    const matchingOrders = (await OrderModel.find({
      $or: [
        { orderNo: regex },
        { customerNameSnapshot: regex },
        { customerEmailSnapshot: regex },
        { customerPhoneSnapshot: regex },
      ],
    })
      .select("_id")
      .lean()
      .exec()) as Array<{ _id: unknown }>;

    filter.$or = [
      { returnNo: regex },
      { reason: regex },
      ...(matchingOrders.length > 0
        ? [{ orderId: { $in: matchingOrders.map((order) => order._id) } }]
        : []),
    ];
  }

  const [totalReturns, openReturns, refundedReturns, closedReturns, total] = await Promise.all([
    ReturnModel.countDocuments().exec(),
    ReturnModel.countDocuments({
      status: { $in: ["REQUESTED", "APPROVED", "RECEIVED"] },
    }).exec(),
    ReturnModel.countDocuments({ status: "REFUNDED" }).exec(),
    ReturnModel.countDocuments({ status: { $in: ["REJECTED", "CLOSED"] } }).exec(),
    ReturnModel.countDocuments(filter).exec(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const page = clampPage(requestedPage, totalPages);

  const returnRows = (await ReturnModel.find(filter)
    .sort({ requestedAt: -1, _id: -1 })
    .skip((page - 1) * PAGE_LIMIT)
    .limit(PAGE_LIMIT)
    .select("orderId customerId returnNo status reason requestedAt approvedAt receivedAt closedAt")
    .lean()
    .exec()) as Array<{
    _id: unknown;
    orderId?: unknown;
    customerId?: unknown;
    returnNo?: string;
    status?: string;
    reason?: string;
    requestedAt?: Date;
    approvedAt?: Date;
    receivedAt?: Date;
    closedAt?: Date;
  }>;

  const orderIds = returnRows.map((row) => String(row.orderId ?? "")).filter(Boolean);
  const orders = orderIds.length
    ? ((await OrderModel.find({ _id: { $in: orderIds } })
        .select("orderNo customerNameSnapshot customerEmailSnapshot currencyCode")
        .lean()
        .exec()) as Array<{
        _id: unknown;
        orderNo?: string;
        customerNameSnapshot?: string;
        customerEmailSnapshot?: string;
        currencyCode?: string;
      }>)
    : [];
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
        currencyCode: typeof order.currencyCode === "string" ? order.currencyCode : "MMK",
      },
    ]),
  );

  const refundTotals = returnRows.length
    ? ((await RefundModel.aggregate<{
        _id: Types.ObjectId;
        totalAmount: number;
      }>([
        {
          $match: {
            returnId: {
              $in: returnRows.map((row) => new Types.ObjectId(String(row._id))),
            },
          },
        },
        {
          $group: {
            _id: "$returnId",
            totalAmount: { $sum: "$amount" },
          },
        },
      ]).exec()) as Array<{ _id: Types.ObjectId; totalAmount: number }>)
    : [];
  const refundTotalMap = new Map(
    refundTotals.map((refund) => [String(refund._id), Number(refund.totalAmount ?? 0)]),
  );

  let selectedReturn: null | {
    id: string;
    returnNo: string;
    orderId: string;
    orderNo: string;
    status: string;
    reason: string | null;
    note: string | null;
    requestedAt: Date | null;
    approvedAt: Date | null;
    receivedAt: Date | null;
    closedAt: Date | null;
    currencyCode: string;
    customerName: string | null;
    customerEmail: string | null;
    customerPhone: string | null;
    orderStatus: string;
    paymentStatus: string;
    fulfillmentStatus: string;
    grandTotal: number;
    items: Array<{
      id: string;
      productName: string;
      variantLabel: string | null;
      sku: string | null;
      quantity: number;
      reason: string | null;
      conditionNote: string | null;
    }>;
    refunds: Array<{
      id: string;
      amount: number;
      status: string;
      reason: string | null;
      createdAt: Date | null;
    }>;
    paymentOptions: Array<{
      id: string;
      label: string;
    }>;
  } = null;

  if (Types.ObjectId.isValid(selectedReturnId)) {
    const returnRecord = (await ReturnModel.findById(selectedReturnId)
      .lean()
      .exec()) as
      | {
          _id: unknown;
          orderId?: unknown;
          returnNo?: string;
          status?: string;
          reason?: string;
          note?: string;
          requestedAt?: Date;
          approvedAt?: Date;
          receivedAt?: Date;
          closedAt?: Date;
        }
      | null;

    if (returnRecord) {
      const [order, returnItems, refundRows, paymentRows] = await Promise.all([
        (await OrderModel.findById(returnRecord.orderId)
          .select(
            "orderNo customerNameSnapshot customerEmailSnapshot customerPhoneSnapshot currencyCode grandTotal status paymentStatus fulfillmentStatus",
          )
          .lean()
          .exec()) as
          | {
              _id: unknown;
              orderNo?: string;
              customerNameSnapshot?: string;
              customerEmailSnapshot?: string;
              customerPhoneSnapshot?: string;
              currencyCode?: string;
              grandTotal?: number;
              status?: string;
              paymentStatus?: string;
              fulfillmentStatus?: string;
            }
          | null,
        (await ReturnItemModel.find({ returnId: selectedReturnId })
          .sort({ _id: 1 })
          .lean()
          .exec()) as Array<{
          _id: unknown;
          orderItemId?: unknown;
          quantity?: number;
          reason?: string;
          conditionNote?: string;
        }>,
        (await RefundModel.find({ returnId: selectedReturnId })
          .sort({ createdAt: -1 })
          .lean()
          .exec()) as Array<{
          _id: unknown;
          amount?: number;
          status?: string;
          reason?: string;
          createdAt?: Date;
        }>,
        (await PaymentModel.find({ orderId: returnRecord.orderId })
          .sort({ paymentDate: -1 })
          .select("paymentMethodId amount status")
          .lean()
          .exec()) as Array<{
          _id: unknown;
          paymentMethodId?: unknown;
          amount?: number;
          status?: string;
        }>,
      ]);

      const orderItems = returnItems.length
        ? ((await OrderItemModel.find({
            _id: {
              $in: returnItems.map((item) => item.orderItemId).filter(Boolean),
            },
          })
            .select("productNameSnapshot variantLabelSnapshot skuSnapshot")
            .lean()
            .exec()) as Array<{
            _id: unknown;
            productNameSnapshot?: string;
            variantLabelSnapshot?: string;
            skuSnapshot?: string;
          }>)
        : [];
      const orderItemMap = new Map(
        orderItems.map((item) => [
          String(item._id),
          {
            productName:
              typeof item.productNameSnapshot === "string"
                ? item.productNameSnapshot
                : "Product",
            variantLabel:
              typeof item.variantLabelSnapshot === "string" && item.variantLabelSnapshot.trim()
                ? item.variantLabelSnapshot
                : null,
            sku:
              typeof item.skuSnapshot === "string" && item.skuSnapshot.trim()
                ? item.skuSnapshot
                : null,
          },
        ]),
      );

      const paymentMethodIds = paymentRows
        .map((payment) => String(payment.paymentMethodId ?? ""))
        .filter((value) => Types.ObjectId.isValid(value));
      const paymentMethods = paymentMethodIds.length
        ? ((await PaymentMethodModel.find({
            _id: { $in: paymentMethodIds },
          })
            .select("methodName")
            .lean()
            .exec()) as Array<{
            _id: unknown;
            methodName?: string;
          }>)
        : [];
      const paymentMethodMap = new Map(
        paymentMethods.map((method) => [
          String(method._id),
          typeof method.methodName === "string" ? method.methodName : "Payment",
        ]),
      );

      selectedReturn = {
        id: String(returnRecord._id),
        returnNo: typeof returnRecord.returnNo === "string" ? returnRecord.returnNo : "Return",
        orderId: String(returnRecord.orderId ?? ""),
        orderNo: typeof order?.orderNo === "string" ? order.orderNo : "Order",
        status: typeof returnRecord.status === "string" ? returnRecord.status : "REQUESTED",
        reason:
          typeof returnRecord.reason === "string" && returnRecord.reason.trim()
            ? returnRecord.reason
            : null,
        note:
          typeof returnRecord.note === "string" && returnRecord.note.trim()
            ? returnRecord.note
            : null,
        requestedAt: returnRecord.requestedAt ?? null,
        approvedAt: returnRecord.approvedAt ?? null,
        receivedAt: returnRecord.receivedAt ?? null,
        closedAt: returnRecord.closedAt ?? null,
        currencyCode: typeof order?.currencyCode === "string" ? order.currencyCode : "MMK",
        customerName:
          typeof order?.customerNameSnapshot === "string" && order.customerNameSnapshot.trim()
            ? order.customerNameSnapshot
            : null,
        customerEmail:
          typeof order?.customerEmailSnapshot === "string" && order.customerEmailSnapshot.trim()
            ? order.customerEmailSnapshot
            : null,
        customerPhone:
          typeof order?.customerPhoneSnapshot === "string" && order.customerPhoneSnapshot.trim()
            ? order.customerPhoneSnapshot
            : null,
        orderStatus: typeof order?.status === "string" ? order.status : "PENDING",
        paymentStatus:
          typeof order?.paymentStatus === "string" ? order.paymentStatus : "UNPAID",
        fulfillmentStatus:
          typeof order?.fulfillmentStatus === "string"
            ? order.fulfillmentStatus
            : "UNFULFILLED",
        grandTotal: Number(order?.grandTotal ?? 0),
        items: returnItems.map((item) => {
          const snapshot = orderItemMap.get(String(item.orderItemId ?? ""));
          return {
            id: String(item._id),
            productName: snapshot?.productName ?? "Product",
            variantLabel: snapshot?.variantLabel ?? null,
            sku: snapshot?.sku ?? null,
            quantity: Number(item.quantity ?? 0),
            reason:
              typeof item.reason === "string" && item.reason.trim() ? item.reason : null,
            conditionNote:
              typeof item.conditionNote === "string" && item.conditionNote.trim()
                ? item.conditionNote
                : null,
          };
        }),
        refunds: refundRows.map((refund) => ({
          id: String(refund._id),
          amount: Number(refund.amount ?? 0),
          status: typeof refund.status === "string" ? refund.status : "PENDING",
          reason:
            typeof refund.reason === "string" && refund.reason.trim() ? refund.reason : null,
          createdAt: refund.createdAt ?? null,
        })),
        paymentOptions: paymentRows.map((payment) => ({
          id: String(payment._id),
          label: `${
            paymentMethodMap.get(String(payment.paymentMethodId ?? "")) ?? "Payment"
          } / ${formatCurrency(Number(payment.amount ?? 0), typeof order?.currencyCode === "string" ? order.currencyCode : "MMK")} / ${
            typeof payment.status === "string" ? payment.status : "SUBMITTED"
          }`,
        })),
      };
    }
  }

  const currentHref = buildHref("/dashboard/orders/returns", resolvedSearchParams, {});

  return (
    <AdminPage>
      <AdminPageHeader
        title="Returns"
        description="Review customer return requests, approve or reject them, and record refund outcomes without leaving the order workspace."
        meta={<AdminBadge label={`${totalReturns} returns`} tone="sky" />}
      />

      <SalesTabs currentPath="/dashboard/orders/returns" />

      <AdminSummaryStrip
        columns={4}
        items={[
          {
            label: "Open returns",
            value: openReturns.toLocaleString("en"),
            hint: "Requested, approved, or received",
          },
          {
            label: "Refunded",
            value: refundedReturns.toLocaleString("en"),
            hint: "Returns with paid refund records",
          },
          {
            label: "Closed / rejected",
            value: closedReturns.toLocaleString("en"),
            hint: "Requests no longer moving",
          },
          {
            label: "All returns",
            value: totalReturns.toLocaleString("en"),
            hint: "Historical and active return volume",
          },
        ]}
      />

      <AdminToolbar>
        <form action="/dashboard/orders/returns" className="space-y-3" method="get">
          <AdminFilterGrid className="xl:grid-cols-[1.3fr_0.7fr]">
            <AdminField
              defaultValue={query}
              label="Search"
              name="q"
              placeholder="Return no, order no, customer"
            />
            <AdminSelect
              defaultValue={status}
              label="Status"
              name="status"
              options={RETURN_STATUS_OPTIONS.map((value) => ({
                value,
                label: value || "All statuses",
              }))}
            />
          </AdminFilterGrid>
          <div className="flex flex-wrap gap-3">
            <input name="page" type="hidden" value="1" />
            <AdminActionButton>Apply filters</AdminActionButton>
            <AdminLinkButton href="/dashboard/orders/returns">Reset</AdminLinkButton>
          </div>
        </form>
      </AdminToolbar>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_420px]">
        <AdminPanel>
          <AdminSectionHeader
            title="Return queue"
            description="Use the queue to find customer requests and open the full return record on the right."
          />
          <div className="mt-4 space-y-4">
            <AdminReturnsGrid
              rows={returnRows.map((item) => {
                const relatedOrder = orderMap.get(String(item.orderId ?? ""));

                return {
                  id: String(item._id),
                  href: buildHref("/dashboard/orders/returns", resolvedSearchParams, {
                    returnId: String(item._id),
                  }),
                  returnNo: item.returnNo ?? "Return",
                  requestedAtLabel: formatDateTime(item.requestedAt ?? null),
                  orderNo: relatedOrder?.orderNo ?? "Order",
                  reasonLabel: item.reason ?? "No reason saved",
                  customerName: relatedOrder?.customerName ?? "Customer",
                  customerEmail: relatedOrder?.customerEmail ?? "No email",
                  refundTotalLabel: formatCurrency(
                    refundTotalMap.get(String(item._id)) ?? 0,
                    relatedOrder?.currencyCode ?? "MMK",
                  ),
                  status: item.status ?? "REQUESTED",
                };
              })}
              selectionHint="Selection is available here for future batch workflows. Destructive bulk actions are intentionally disabled on returns."
              selectionInputName="selectedIds"
              selectionLabel="returns"
            />

            <AdminPagination
              hrefBuilder={(nextPage) =>
                buildHref("/dashboard/orders/returns", resolvedSearchParams, {
                  page: nextPage,
                })
              }
              page={page}
              totalPages={totalPages}
            />
          </div>
        </AdminPanel>

        <div className="space-y-4">
          {selectedReturn ? (
            <>
              <AdminPanel>
                <AdminSectionHeader
                  title={selectedReturn.returnNo}
                  description={`${selectedReturn.orderNo} / ${formatDateTime(
                    selectedReturn.requestedAt,
                  )}`}
                  actions={
                    <AdminLinkButton href={`/dashboard/orders/${selectedReturn.orderId}`}>
                      View order
                    </AdminLinkButton>
                  }
                />

                <div className="mt-4 grid gap-3">
                  <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Statuses</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <AdminBadge label={selectedReturn.status} tone={getTone(selectedReturn.status)} />
                      <AdminBadge
                        label={selectedReturn.orderStatus}
                        tone={getTone(selectedReturn.orderStatus)}
                      />
                      <AdminBadge
                        label={selectedReturn.paymentStatus}
                        tone={getTone(selectedReturn.paymentStatus)}
                      />
                      <AdminBadge
                        label={selectedReturn.fulfillmentStatus}
                        tone={getTone(selectedReturn.fulfillmentStatus)}
                      />
                    </div>
                  </div>

                  <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Customer</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      {selectedReturn.customerName ?? "Customer"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {selectedReturn.customerEmail ?? selectedReturn.customerPhone ?? "No contact saved"}
                    </p>
                  </div>

                  <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Order total</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      {formatCurrency(selectedReturn.grandTotal, selectedReturn.currencyCode)}
                    </p>
                  </div>

                  {selectedReturn.reason ? (
                    <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Reason</p>
                      <p className="mt-2 text-sm text-slate-700">{selectedReturn.reason}</p>
                    </div>
                  ) : null}

                  {selectedReturn.note ? (
                    <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Return note</p>
                      <p className="mt-2 text-sm text-slate-700">{selectedReturn.note}</p>
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 space-y-3">
                  <p className="text-sm font-semibold text-slate-950">Returned items</p>
                  {selectedReturn.items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-[1rem] border border-stone-200 bg-white px-4 py-3"
                    >
                      <p className="font-medium text-slate-900">{item.productName}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {(item.variantLabel ?? item.sku ?? "No variant label") + " / Qty " + item.quantity}
                      </p>
                      {item.conditionNote ? (
                        <p className="mt-2 text-sm text-slate-700">{item.conditionNote}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </AdminPanel>

              <AdminPanel>
                <AdminSectionHeader title="Refund history" />
                <div className="mt-4 space-y-3">
                  {selectedReturn.refunds.length > 0 ? (
                    selectedReturn.refunds.map((refund) => (
                      <div
                        key={refund.id}
                        className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-900">
                              {formatCurrency(refund.amount, selectedReturn.currencyCode)}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {formatDateTime(refund.createdAt)}
                            </p>
                          </div>
                          <AdminBadge label={refund.status} tone={getTone(refund.status)} />
                        </div>
                        {refund.reason ? (
                          <p className="mt-2 text-sm text-slate-700">{refund.reason}</p>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <AdminEmptyState
                      title="No refund records"
                      body="Create the refund record from the action panel below."
                    />
                  )}
                </div>
              </AdminPanel>

              <AdminPanel>
                <AdminSectionHeader title="Actions" />
                <div className="mt-4 space-y-5">
                  <form action={updateReturnStatusAction} className="space-y-4">
                    <input name="returnId" type="hidden" value={selectedReturn.id} />
                    <input name="returnTo" type="hidden" value={currentHref} />
                    <AdminSelect
                      label="Next status"
                      name="toStatus"
                      options={RETURN_STATUS_OPTIONS.filter(Boolean).map((value) => ({
                        value,
                        label: value,
                      }))}
                    />
                    <AdminTextarea label="Internal note" name="note" rows={3} />
                    <AdminActionButton tone="sky">Update return status</AdminActionButton>
                  </form>

                  <form action={recordReturnRefundAction} className="space-y-4">
                    <input name="returnId" type="hidden" value={selectedReturn.id} />
                    <input name="returnTo" type="hidden" value={currentHref} />
                    <input
                      name="currencyCode"
                      type="hidden"
                      value={selectedReturn.currencyCode}
                    />
                    <AdminField
                      label="Refund amount"
                      name="amount"
                      placeholder="0"
                      type="number"
                    />
                    <AdminSelect
                      label="Payment record"
                      name="paymentId"
                      options={[
                        { value: "", label: "No linked payment" },
                        ...selectedReturn.paymentOptions.map((payment) => ({
                          value: payment.id,
                          label: payment.label,
                        })),
                      ]}
                    />
                    <AdminSelect
                      label="Refund status"
                      name="refundStatus"
                      options={[
                        { value: "PENDING", label: "PENDING" },
                        { value: "APPROVED", label: "APPROVED" },
                        { value: "REJECTED", label: "REJECTED" },
                        { value: "PAID", label: "PAID" },
                      ]}
                    />
                    <AdminTextarea label="Refund note" name="reason" rows={3} />
                    <AdminActionButton tone="emerald">Record refund</AdminActionButton>
                  </form>
                </div>
              </AdminPanel>
            </>
          ) : (
            <AdminPanel>
              <AdminSectionHeader
                title="Return detail"
                description="Select a return from the queue to review the order, returned lines, and refund activity."
              />
            </AdminPanel>
          )}
        </div>
      </div>
    </AdminPage>
  );
}
