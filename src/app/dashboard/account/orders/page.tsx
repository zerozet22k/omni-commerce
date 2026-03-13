import Link from "next/link";
import { Types } from "mongoose";

import { AccountTabs } from "@/components/admin/module-tabs";
import {
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
  AdminToolbar,
} from "@/components/admin/workspace";
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
import { OrderItemModel, OrderModel } from "@/modules/orders/orders.models";
import { PaymentMethodModel, PaymentModel } from "@/modules/payments/payments.models";
import { ShipmentModel } from "@/modules/shipments/shipments.models";

type CustomerOrdersPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

const PAGE_LIMIT = 10;

const ORDER_STATUS_OPTIONS = [
  "",
  "PENDING",
  "AWAITING_PAYMENT",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
];

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getTone(value: string) {
  if (["PAID", "CONFIRMED", "COMPLETED", "DELIVERED"].includes(value)) {
    return "emerald" as const;
  }

  if (["PENDING", "AWAITING_PAYMENT", "PROCESSING", "PACKING", "SHIPPED"].includes(value)) {
    return "amber" as const;
  }

  if (["CANCELLED", "FAILED", "REFUNDED"].includes(value)) {
    return "rose" as const;
  }

  return "slate" as const;
}

export default async function DashboardAccountOrdersPage({
  searchParams,
}: CustomerOrdersPageProps) {
  const user = await requireCustomerUser();
  const resolvedSearchParams = await searchParams;
  const customerId = new Types.ObjectId(user.id);

  await connectToDatabase();

  const query = readSearchParam(resolvedSearchParams, "q").trim();
  const status = readSearchParam(resolvedSearchParams, "status");
  const selectedOrderId = readSearchParam(resolvedSearchParams, "orderId");
  const requestedPage = readNumberParam(resolvedSearchParams, "page", 1);

  const filter: Record<string, unknown> = {
    customerId,
  };

  if (status) {
    filter.status = status;
  }

  if (query) {
    filter.orderNo = new RegExp(escapeRegex(query), "i");
  }

  const [totalOrders, openOrders, completedOrders, closedOrders, total] = await Promise.all([
    OrderModel.countDocuments({ customerId }).exec(),
    OrderModel.countDocuments({
      customerId,
      status: { $in: ["PENDING", "AWAITING_PAYMENT", "PAID", "PROCESSING", "SHIPPED"] },
    }).exec(),
    OrderModel.countDocuments({ customerId, status: "COMPLETED" }).exec(),
    OrderModel.countDocuments({
      customerId,
      status: { $in: ["CANCELLED", "REFUNDED"] },
    }).exec(),
    OrderModel.countDocuments(filter).exec(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const page = clampPage(requestedPage, totalPages);

  const orderRows = (await OrderModel.find(filter)
    .sort({ orderDate: -1, _id: -1 })
    .skip((page - 1) * PAGE_LIMIT)
    .limit(PAGE_LIMIT)
    .select(
      "orderNo orderDate status paymentStatus fulfillmentStatus grandTotal currencyCode",
    )
    .lean()
    .exec()) as Array<{
    _id: unknown;
    orderNo?: string;
    orderDate?: Date;
    status?: string;
    paymentStatus?: string;
    fulfillmentStatus?: string;
    grandTotal?: number;
    currencyCode?: string;
  }>;

  let selectedOrder: null | {
    id: string;
    orderNo: string;
    orderDate: Date | null;
    status: string;
    paymentStatus: string;
    fulfillmentStatus: string;
    grandTotal: number;
    currencyCode: string;
    subtotal: number;
    shippingFee: number;
    note: string | null;
    items: Array<{
      id: string;
      productName: string;
      variantLabel: string | null;
      sku: string | null;
      quantity: number;
      lineTotal: number;
    }>;
    payments: Array<{
      id: string;
      amount: number;
      currencyCode: string;
      status: string;
      methodName: string;
      paymentDate: Date | null;
    }>;
    shipments: Array<{
      id: string;
      courierName: string | null;
      trackingNo: string | null;
      status: string;
      shippedAt: Date | null;
      deliveredAt: Date | null;
    }>;
  } = null;

  if (Types.ObjectId.isValid(selectedOrderId)) {
    const order = (await OrderModel.findOne({
      _id: selectedOrderId,
      customerId,
    })
      .lean()
      .exec()) as
      | {
          _id: unknown;
          orderNo?: string;
          orderDate?: Date;
          status?: string;
          paymentStatus?: string;
          fulfillmentStatus?: string;
          grandTotal?: number;
          currencyCode?: string;
          subtotal?: number;
          shippingFee?: number;
          note?: string;
        }
      | null;

    if (order) {
      const [items, paymentRows, shipmentRows] = await Promise.all([
        (await OrderItemModel.find({ orderId: selectedOrderId })
          .sort({ _id: 1 })
          .lean()
          .exec()) as Array<{
          _id: unknown;
          productNameSnapshot?: string;
          variantLabelSnapshot?: string;
          skuSnapshot?: string;
          quantity?: number;
          lineTotal?: number;
        }>,
        (await PaymentModel.find({ orderId: selectedOrderId })
          .sort({ paymentDate: -1 })
          .lean()
          .exec()) as Array<{
          _id: unknown;
          paymentMethodId?: unknown;
          amount?: number;
          currencyCode?: string;
          status?: string;
          paymentDate?: Date;
        }>,
        (await ShipmentModel.find({ orderId: selectedOrderId })
          .sort({ shippedAt: -1 })
          .lean()
          .exec()) as Array<{
          _id: unknown;
          courierName?: string;
          trackingNo?: string;
          status?: string;
          shippedAt?: Date;
          deliveredAt?: Date;
        }>,
      ]);

      const paymentMethodIds = paymentRows
        .map((payment) => String(payment.paymentMethodId ?? ""))
        .filter((value) => Types.ObjectId.isValid(value));

      const paymentMethods = (await PaymentMethodModel.find({
        _id: { $in: paymentMethodIds },
      })
        .select("methodName")
        .lean()
        .exec()) as Array<{
        _id: unknown;
        methodName?: string;
      }>;

      const paymentMethodMap = new Map(
        paymentMethods.map((method) => [String(method._id), method.methodName ?? "Payment"]),
      );

      selectedOrder = {
        id: String(order._id),
        orderNo: order.orderNo ?? "Order",
        orderDate: order.orderDate ?? null,
        status: order.status ?? "PENDING",
        paymentStatus: order.paymentStatus ?? "UNPAID",
        fulfillmentStatus: order.fulfillmentStatus ?? "UNFULFILLED",
        grandTotal: Number(order.grandTotal ?? 0),
        currencyCode: order.currencyCode ?? "MMK",
        subtotal: Number(order.subtotal ?? 0),
        shippingFee: Number(order.shippingFee ?? 0),
        note: typeof order.note === "string" && order.note.trim() ? order.note : null,
        items: items.map((item) => ({
          id: String(item._id),
          productName: item.productNameSnapshot ?? "Product",
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
        payments: paymentRows.map((payment) => ({
          id: String(payment._id),
          amount: Number(payment.amount ?? 0),
          currencyCode: payment.currencyCode ?? order.currencyCode ?? "MMK",
          status: payment.status ?? "SUBMITTED",
          methodName: paymentMethodMap.get(String(payment.paymentMethodId ?? "")) ?? "Payment",
          paymentDate: payment.paymentDate ?? null,
        })),
        shipments: shipmentRows.map((shipment) => ({
          id: String(shipment._id),
          courierName:
            typeof shipment.courierName === "string" && shipment.courierName.trim()
              ? shipment.courierName
              : null,
          trackingNo:
            typeof shipment.trackingNo === "string" && shipment.trackingNo.trim()
              ? shipment.trackingNo
              : null,
          status: shipment.status ?? "PENDING",
          shippedAt: shipment.shippedAt ?? null,
          deliveredAt: shipment.deliveredAt ?? null,
        })),
      };
    }
  }

  const hasSelectedOrderQuery = Boolean(selectedOrderId);

  return (
    <AdminPage>
      <AdminPageHeader
        title="My orders"
        description="Track your placed orders, payment state, and delivery progress."
        meta={<AdminBadge label={`${totalOrders} total`} tone="sky" />}
      />

      <AccountTabs currentPath="/dashboard/account/orders" />

      <AdminSummaryStrip
        columns={3}
        items={[
          {
            label: "Total orders",
            value: totalOrders.toLocaleString("en"),
            hint: "All orders placed on your account",
          },
          {
            label: "Open orders",
            value: openOrders.toLocaleString("en"),
            hint: "Orders still moving through payment or delivery",
          },
          {
            label: "Completed / closed",
            value: `${completedOrders.toLocaleString("en")} / ${closedOrders.toLocaleString("en")}`,
            hint: "Completed vs cancelled or refunded",
          },
        ]}
      />

      <AdminToolbar>
        <form action="/dashboard/account/orders" className="space-y-3" method="get">
          <AdminFilterGrid className="xl:grid-cols-[1.4fr_0.8fr]">
            <AdminField
              defaultValue={query}
              label="Search"
              name="q"
              placeholder="Order number"
            />
            <AdminSelect
              defaultValue={status}
              label="Status"
              name="status"
              options={ORDER_STATUS_OPTIONS.map((value) => ({
                value,
                label: value || "All statuses",
              }))}
            />
          </AdminFilterGrid>
          <div className="flex flex-wrap gap-3">
            <input name="page" type="hidden" value="1" />
            <button
              className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
              type="submit"
            >
              Apply filters
            </button>
            <AdminLinkButton href="/dashboard/account/orders">Reset</AdminLinkButton>
          </div>
        </form>
      </AdminToolbar>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_400px]">
        <AdminPanel>
          <AdminSectionHeader
            title="Order history"
            description="All order records linked to your account."
          />
          <div className="mt-4 space-y-4">
            {orderRows.length > 0 ? (
              <AdminTableShell>
                <AdminTable>
                  <AdminTableHead>
                    <tr>
                      <AdminTh>Order</AdminTh>
                      <AdminTh>Date</AdminTh>
                      <AdminTh>Payment</AdminTh>
                      <AdminTh>Delivery</AdminTh>
                      <AdminTh className="text-right">Total</AdminTh>
                    </tr>
                  </AdminTableHead>
                  <AdminTableBody>
                    {orderRows.map((order) => (
                      <tr key={String(order._id)} className="hover:bg-stone-50/80">
                        <AdminTd>
                          <Link
                            className="block rounded-xl px-1 py-1 transition hover:bg-stone-100"
                            href={buildHref("/dashboard/account/orders", resolvedSearchParams, {
                              orderId: String(order._id),
                            })}
                          >
                            <p className="font-semibold text-slate-950">{order.orderNo ?? "Order"}</p>
                            <div className="mt-1 flex flex-wrap gap-2">
                              <AdminBadge label={order.status ?? "PENDING"} tone={getTone(order.status ?? "PENDING")} />
                            </div>
                          </Link>
                        </AdminTd>
                        <AdminTd>{formatDateTime(order.orderDate ?? null)}</AdminTd>
                        <AdminTd>
                          <AdminBadge
                            label={order.paymentStatus ?? "UNPAID"}
                            tone={getTone(order.paymentStatus ?? "UNPAID")}
                          />
                        </AdminTd>
                        <AdminTd>
                          <AdminBadge
                            label={order.fulfillmentStatus ?? "UNFULFILLED"}
                            tone={getTone(order.fulfillmentStatus ?? "UNFULFILLED")}
                          />
                        </AdminTd>
                        <AdminTd className="text-right font-semibold text-slate-950">
                          {formatCurrency(
                            Number(order.grandTotal ?? 0),
                            order.currencyCode ?? "MMK",
                          )}
                        </AdminTd>
                      </tr>
                    ))}
                  </AdminTableBody>
                </AdminTable>
              </AdminTableShell>
            ) : (
              <AdminEmptyState
                title="No orders found"
                body="Orders placed from checkout will appear here."
              />
            )}

            <AdminPagination
              hrefBuilder={(nextPage) =>
                buildHref("/dashboard/account/orders", resolvedSearchParams, {
                  page: nextPage,
                })
              }
              page={page}
              totalPages={totalPages}
            />
          </div>
        </AdminPanel>

        <div className="space-y-4">
          {selectedOrder ? (
            <>
              <AdminPanel>
                <AdminSectionHeader
                  title={selectedOrder.orderNo}
                  description={formatDateTime(selectedOrder.orderDate)}
                  actions={
                    <AdminLinkButton
                      href={`/dashboard/account/returns?orderId=${selectedOrder.id}`}
                    >
                      Request return
                    </AdminLinkButton>
                  }
                />
                <div className="mt-4 grid gap-3">
                  <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Statuses</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <AdminBadge label={selectedOrder.status} tone={getTone(selectedOrder.status)} />
                      <AdminBadge
                        label={selectedOrder.paymentStatus}
                        tone={getTone(selectedOrder.paymentStatus)}
                      />
                      <AdminBadge
                        label={selectedOrder.fulfillmentStatus}
                        tone={getTone(selectedOrder.fulfillmentStatus)}
                      />
                    </div>
                  </div>
                  <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Totals</p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      {formatCurrency(selectedOrder.grandTotal, selectedOrder.currencyCode)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Subtotal{" "}
                      {formatCurrency(selectedOrder.subtotal, selectedOrder.currencyCode)} /
                      Shipping{" "}
                      {formatCurrency(selectedOrder.shippingFee, selectedOrder.currencyCode)}
                    </p>
                  </div>
                  {selectedOrder.note ? (
                    <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Order note</p>
                      <p className="mt-2 text-sm leading-5 text-slate-700">{selectedOrder.note}</p>
                    </div>
                  ) : null}
                </div>
              </AdminPanel>

              <AdminPanel>
                <AdminSectionHeader title="Items" />
                <div className="mt-4 space-y-3">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-900">{item.productName}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {(item.variantLabel ?? item.sku ?? "No variant label") + " / Qty " + item.quantity}
                          </p>
                        </div>
                        <p className="font-semibold text-slate-950">
                          {formatCurrency(item.lineTotal, selectedOrder.currencyCode)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </AdminPanel>

              <AdminPanel>
                <AdminSectionHeader title="Payment and delivery" />
                <div className="mt-4 space-y-4">
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-950">Payments</p>
                    {selectedOrder.payments.length > 0 ? (
                      selectedOrder.payments.map((payment) => (
                        <div key={payment.id} className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-medium text-slate-900">{payment.methodName}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                {formatDateTime(payment.paymentDate)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <AdminBadge label={payment.status} tone={getTone(payment.status)} />
                              <span className="text-sm font-semibold text-slate-950">
                                {formatCurrency(payment.amount, payment.currencyCode)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <AdminEmptyState
                        title="No payment records"
                        body="Payment updates will appear here once the order enters payment flow."
                      />
                    )}
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-950">Delivery</p>
                    {selectedOrder.shipments.length > 0 ? (
                      selectedOrder.shipments.map((shipment) => (
                        <div key={shipment.id} className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-medium text-slate-900">
                                {shipment.courierName ?? "Courier pending"}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {shipment.trackingNo ?? "No tracking number"}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                Shipped {formatDateTime(shipment.shippedAt)} / Delivered{" "}
                                {formatDateTime(shipment.deliveredAt)}
                              </p>
                            </div>
                            <AdminBadge label={shipment.status} tone={getTone(shipment.status)} />
                          </div>
                        </div>
                      ))
                    ) : (
                      <AdminEmptyState
                        title="No delivery record"
                        body="Delivery details will appear here once the order is packed or shipped."
                      />
                    )}
                  </div>
                </div>
              </AdminPanel>
            </>
          ) : (
            <AdminPanel>
              <AdminSectionHeader
                title={hasSelectedOrderQuery ? "Order not available" : "Order detail"}
                description={
                  hasSelectedOrderQuery
                    ? "The requested order was not found in your account history."
                    : "Select one of your orders to review items, payment state, and delivery progress."
                }
                actions={
                  hasSelectedOrderQuery ? (
                    <AdminLinkButton href="/dashboard/account/orders">Back to orders</AdminLinkButton>
                  ) : null
                }
              />
            </AdminPanel>
          )}
        </div>
      </div>
    </AdminPage>
  );
}
