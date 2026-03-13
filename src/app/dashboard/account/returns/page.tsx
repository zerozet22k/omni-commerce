import Link from "next/link";
import { Types } from "mongoose";

import { AccountTabs } from "@/components/admin/module-tabs";
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
  AdminTable,
  AdminTableBody,
  AdminTableHead,
  AdminTableShell,
  AdminTd,
  AdminTh,
  AdminTextarea,
  AdminToolbar,
} from "@/components/admin/workspace";
import { requestReturnAction } from "@/app/dashboard/account/actions";
import { requireCustomerUser } from "@/lib/auth/guards";
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

type CustomerReturnsPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

const PAGE_LIMIT = 10;

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
  if (["APPROVED", "REFUNDED", "CLOSED"].includes(value)) {
    return "emerald" as const;
  }

  if (["REQUESTED", "RECEIVED"].includes(value)) {
    return "amber" as const;
  }

  if (["REJECTED"].includes(value)) {
    return "rose" as const;
  }

  return "slate" as const;
}

export default async function DashboardAccountReturnsPage({
  searchParams,
}: CustomerReturnsPageProps) {
  const user = await requireCustomerUser();
  const resolvedSearchParams = await searchParams;
  const customerId = new Types.ObjectId(user.id);

  await connectToDatabase();

  const query = readSearchParam(resolvedSearchParams, "q").trim();
  const status = readSearchParam(resolvedSearchParams, "status");
  const selectedReturnId = readSearchParam(resolvedSearchParams, "returnId");
  const selectedOrderId = readSearchParam(resolvedSearchParams, "orderId");
  const requestedPage = readNumberParam(resolvedSearchParams, "page", 1);

  const filter: Record<string, unknown> = {
    customerId,
  };

  if (status) {
    filter.status = status;
  }

  if (Types.ObjectId.isValid(selectedOrderId)) {
    filter.orderId = new Types.ObjectId(selectedOrderId);
  }

  if (query) {
    const regex = new RegExp(escapeRegex(query), "i");
    const matchingOrders = (await OrderModel.find({
      customerId,
      orderNo: regex,
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
    ReturnModel.countDocuments({ customerId }).exec(),
    ReturnModel.countDocuments({
      customerId,
      status: { $in: ["REQUESTED", "APPROVED", "RECEIVED"] },
    }).exec(),
    ReturnModel.countDocuments({ customerId, status: "REFUNDED" }).exec(),
    ReturnModel.countDocuments({ customerId, status: { $in: ["REJECTED", "CLOSED"] } }).exec(),
    ReturnModel.countDocuments(filter).exec(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const page = clampPage(requestedPage, totalPages);

  const returnRows = (await ReturnModel.find(filter)
    .sort({ requestedAt: -1, _id: -1 })
    .skip((page - 1) * PAGE_LIMIT)
    .limit(PAGE_LIMIT)
    .select("orderId returnNo status reason requestedAt approvedAt receivedAt closedAt")
    .lean()
    .exec()) as Array<{
    _id: unknown;
    orderId?: unknown;
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
        .select("orderNo currencyCode")
        .lean()
        .exec()) as Array<{
        _id: unknown;
        orderNo?: string;
        currencyCode?: string;
      }>)
    : [];
  const orderMap = new Map(
    orders.map((order) => [
      String(order._id),
      {
        orderNo: typeof order.orderNo === "string" ? order.orderNo : "Order",
        currencyCode: typeof order.currencyCode === "string" ? order.currencyCode : "MMK",
      },
    ]),
  );

  const refunds = returnRows.length
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
  const refundMap = new Map(refunds.map((refund) => [String(refund._id), Number(refund.totalAmount ?? 0)]));

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
  } = null;

  if (Types.ObjectId.isValid(selectedReturnId)) {
    const returnRecord = (await ReturnModel.findOne({
      _id: selectedReturnId,
      customerId,
    })
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
      const [returnItems, relatedRefunds, order] = await Promise.all([
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
        (await OrderModel.findById(returnRecord.orderId)
          .select("orderNo currencyCode")
          .lean()
          .exec()) as
          | {
              _id: unknown;
              orderNo?: string;
              currencyCode?: string;
            }
          | null,
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
        refunds: relatedRefunds.map((refund) => ({
          id: String(refund._id),
          amount: Number(refund.amount ?? 0),
          status: typeof refund.status === "string" ? refund.status : "PENDING",
          reason:
            typeof refund.reason === "string" && refund.reason.trim() ? refund.reason : null,
          createdAt: refund.createdAt ?? null,
        })),
      };
    }
  }

  let selectedOrderForRequest: null | {
    id: string;
    orderNo: string;
    orderDate: Date | null;
    status: string;
    currencyCode: string;
    grandTotal: number;
    items: Array<{
      id: string;
      productName: string;
      variantLabel: string | null;
      sku: string | null;
      quantity: number;
      lineTotal: number;
    }>;
  } = null;

  if (Types.ObjectId.isValid(selectedOrderId)) {
    const order = (await OrderModel.findOne({
      _id: selectedOrderId,
      customerId,
    })
      .select("orderNo orderDate status currencyCode grandTotal")
      .lean()
      .exec()) as
      | {
          _id: unknown;
          orderNo?: string;
          orderDate?: Date;
          status?: string;
          currencyCode?: string;
          grandTotal?: number;
        }
      | null;

    if (order && !["CANCELLED", "REFUNDED"].includes(String(order.status ?? ""))) {
      const orderItems = (await OrderItemModel.find({ orderId: selectedOrderId })
        .sort({ _id: 1 })
        .lean()
        .exec()) as Array<{
        _id: unknown;
        productNameSnapshot?: string;
        variantLabelSnapshot?: string;
        skuSnapshot?: string;
        quantity?: number;
        lineTotal?: number;
      }>;

      selectedOrderForRequest = {
        id: String(order._id),
        orderNo: typeof order.orderNo === "string" ? order.orderNo : "Order",
        orderDate: order.orderDate ?? null,
        status: typeof order.status === "string" ? order.status : "PENDING",
        currencyCode: typeof order.currencyCode === "string" ? order.currencyCode : "MMK",
        grandTotal: Number(order.grandTotal ?? 0),
        items: orderItems.map((item) => ({
          id: String(item._id),
          productName:
            typeof item.productNameSnapshot === "string" ? item.productNameSnapshot : "Product",
          variantLabel:
            typeof item.variantLabelSnapshot === "string" && item.variantLabelSnapshot.trim()
              ? item.variantLabelSnapshot
              : null,
          sku:
            typeof item.skuSnapshot === "string" && item.skuSnapshot.trim()
              ? item.skuSnapshot
              : null,
          quantity: Number(item.quantity ?? 0),
          lineTotal: Number(item.lineTotal ?? 0),
        })),
      };
    }
  }

  const currentHref = buildHref("/dashboard/account/returns", resolvedSearchParams, {});

  return (
    <AdminPage>
      <AdminPageHeader
        title="Returns"
        description="Review existing return requests and create a new return from one of your completed orders."
        meta={<AdminBadge label={`${totalReturns} total`} tone="sky" />}
      />

      <AccountTabs currentPath="/dashboard/account/returns" />

      <AdminSummaryStrip
        columns={4}
        items={[
          {
            label: "Total returns",
            value: totalReturns.toLocaleString("en"),
            hint: "All return requests on your account",
          },
          {
            label: "Open returns",
            value: openReturns.toLocaleString("en"),
            hint: "Requested, approved, or received",
          },
          {
            label: "Refunded",
            value: refundedReturns.toLocaleString("en"),
            hint: "Returns with a paid refund",
          },
          {
            label: "Closed / rejected",
            value: closedReturns.toLocaleString("en"),
            hint: "Requests that are no longer active",
          },
        ]}
      />

      <AdminToolbar>
        <form action="/dashboard/account/returns" className="space-y-3" method="get">
          <AdminFilterGrid className="xl:grid-cols-[1.4fr_0.8fr]">
            <AdminField
              defaultValue={query}
              label="Search"
              name="q"
              placeholder="Return no, order no, reason"
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
            <AdminLinkButton href="/dashboard/account/returns">Reset</AdminLinkButton>
          </div>
        </form>
      </AdminToolbar>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_400px]">
        <AdminPanel>
          <AdminSectionHeader
            title="Return history"
            description="All return requests currently tied to your customer account."
          />
          <div className="mt-4 space-y-4">
            {returnRows.length > 0 ? (
              <AdminTableShell>
                <AdminTable>
                  <AdminTableHead>
                    <tr>
                      <AdminTh>Return</AdminTh>
                      <AdminTh>Order</AdminTh>
                      <AdminTh>Requested</AdminTh>
                      <AdminTh>Refunds</AdminTh>
                      <AdminTh>Status</AdminTh>
                    </tr>
                  </AdminTableHead>
                  <AdminTableBody>
                    {returnRows.map((item) => {
                      const relatedOrder = orderMap.get(String(item.orderId ?? ""));

                      return (
                        <tr key={String(item._id)} className="hover:bg-stone-50/80">
                          <AdminTd>
                            <Link
                              className="block rounded-xl px-1 py-1 transition hover:bg-stone-100"
                              href={buildHref("/dashboard/account/returns", resolvedSearchParams, {
                                returnId: String(item._id),
                              })}
                            >
                              <p className="font-semibold text-slate-950">
                                {item.returnNo ?? "Return"}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {item.reason ?? "No reason saved"}
                              </p>
                            </Link>
                          </AdminTd>
                          <AdminTd>{relatedOrder?.orderNo ?? "Order"}</AdminTd>
                          <AdminTd>{formatDateTime(item.requestedAt ?? null)}</AdminTd>
                          <AdminTd>
                            {formatCurrency(
                              refundMap.get(String(item._id)) ?? 0,
                              relatedOrder?.currencyCode ?? "MMK",
                            )}
                          </AdminTd>
                          <AdminTd>
                            <AdminBadge
                              label={item.status ?? "REQUESTED"}
                              tone={getTone(item.status ?? "REQUESTED")}
                            />
                          </AdminTd>
                        </tr>
                      );
                    })}
                  </AdminTableBody>
                </AdminTable>
              </AdminTableShell>
            ) : (
              <AdminEmptyState
                title="No return requests"
                body="Choose one of your orders to create a return request."
              />
            )}

            <AdminPagination
              hrefBuilder={(nextPage) =>
                buildHref("/dashboard/account/returns", resolvedSearchParams, {
                  page: nextPage,
                })
              }
              page={page}
              totalPages={totalPages}
            />
          </div>
        </AdminPanel>

        <div className="space-y-4">
          {selectedOrderForRequest ? (
            <AdminPanel>
              <AdminSectionHeader
                title={`Request return for ${selectedOrderForRequest.orderNo}`}
                description={`${formatDateTime(selectedOrderForRequest.orderDate)} / ${formatCurrency(
                  selectedOrderForRequest.grandTotal,
                  selectedOrderForRequest.currencyCode,
                )}`}
                actions={
                  <AdminLinkButton href="/dashboard/account/orders">
                    Back to orders
                  </AdminLinkButton>
                }
              />

              <form action={requestReturnAction} className="mt-4 space-y-4">
                <input name="orderId" type="hidden" value={selectedOrderForRequest.id} />
                <input name="returnTo" type="hidden" value={currentHref} />

                <div className="space-y-3">
                  {selectedOrderForRequest.items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words font-medium text-slate-900">
                            {item.productName}
                          </p>
                          <p className="mt-1 break-words text-xs text-slate-500">
                            {(item.variantLabel ?? item.sku ?? "No variant label") +
                              " / Ordered qty " +
                              item.quantity}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-slate-950">
                          {formatCurrency(item.lineTotal, selectedOrderForRequest.currencyCode)}
                        </p>
                      </div>
                      <label className="mt-3 grid gap-2">
                        <span className="text-sm font-semibold text-slate-700">Return quantity</span>
                        <input
                          className="block w-full rounded-[0.95rem] border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none"
                          defaultValue="0"
                          max={item.quantity}
                          min="0"
                          name={`quantity:${item.id}`}
                          type="number"
                        />
                      </label>
                    </div>
                  ))}
                </div>

                <AdminField label="Reason" name="reason" placeholder="Wrong size, damaged, changed mind" />
                <AdminTextarea
                  label="Condition note"
                  name="note"
                  placeholder="Optional detail about the returned items"
                  rows={3}
                />

                <AdminActionButton tone="sky">Submit return request</AdminActionButton>
              </form>
            </AdminPanel>
          ) : (
            <AdminPanel>
              <AdminSectionHeader
                title="Create a return"
                description="Open one of your order records first, then use Request return to prefill the order lines here."
                actions={
                  <AdminLinkButton href="/dashboard/account/orders">Open orders</AdminLinkButton>
                }
              />
            </AdminPanel>
          )}

          {selectedReturn ? (
            <AdminPanel>
              <AdminSectionHeader
                title={selectedReturn.returnNo}
                description={`${selectedReturn.orderNo} / ${formatDateTime(
                  selectedReturn.requestedAt,
                )}`}
              />

              <div className="mt-4 grid gap-3">
                <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Status</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <AdminBadge label={selectedReturn.status} tone={getTone(selectedReturn.status)} />
                  </div>
                </div>
                {selectedReturn.reason ? (
                  <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Reason</p>
                    <p className="mt-2 text-sm text-slate-700">{selectedReturn.reason}</p>
                  </div>
                ) : null}
                {selectedReturn.note ? (
                  <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Condition note</p>
                    <p className="mt-2 text-sm text-slate-700">{selectedReturn.note}</p>
                  </div>
                ) : null}
              </div>

              <div className="mt-4 space-y-3">
                <p className="text-sm font-semibold text-slate-950">Returned items</p>
                {selectedReturn.items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3"
                  >
                    <p className="font-medium text-slate-900">{item.productName}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {(item.variantLabel ?? item.sku ?? "No variant label") + " / Qty " + item.quantity}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-3">
                <p className="text-sm font-semibold text-slate-950">Refund history</p>
                {selectedReturn.refunds.length > 0 ? (
                  selectedReturn.refunds.map((refund) => (
                    <div
                      key={refund.id}
                      className="rounded-[1rem] border border-stone-200 bg-white px-4 py-3"
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
                    title="No refunds yet"
                    body="Refund updates will appear here once the return is processed."
                  />
                )}
              </div>
            </AdminPanel>
          ) : null}
        </div>
      </div>
    </AdminPage>
  );
}
