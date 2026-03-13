import {
  addOrderNoteAction,
  cancelOrderAction,
  confirmOrderPaymentAction,
  updateOrderFulfillmentAction,
  updateOrderStatusAction,
} from "@/app/dashboard/orders/actions";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import type { OrdersWorkspace } from "@/modules/admin/admin-workspace.service";
import {
  AdminActionButton,
  AdminBadge,
  AdminEmptyState,
  AdminField,
  AdminFormGrid,
  AdminPanel,
  AdminSectionHeader,
  AdminSelect,
  AdminTextarea,
} from "@/components/admin/workspace";

const ORDER_STATUS_OPTIONS = [
  "PENDING",
  "AWAITING_PAYMENT",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
];

const FULFILLMENT_STATUS_OPTIONS = [
  "UNFULFILLED",
  "PARTIAL",
  "PACKING",
  "SHIPPED",
  "DELIVERED",
];

function getTone(value: string) {
  if (["ACTIVE", "PAID", "CONFIRMED", "COMPLETED", "DELIVERED"].includes(value)) {
    return "emerald" as const;
  }

  if (["PENDING", "AWAITING_PAYMENT", "PACKING", "SUBMITTED", "PARTIAL"].includes(value)) {
    return "amber" as const;
  }

  if (["CANCELLED", "FAILED", "REFUNDED"].includes(value)) {
    return "rose" as const;
  }

  return "slate" as const;
}

function AddressCard({
  lines,
  title,
}: {
  lines: string[];
  title: string;
}) {
  return (
    <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.16em] text-stone-500">{title}</p>
      {lines.length > 0 ? (
        <div className="mt-3 space-y-1 text-sm text-slate-700">
          {lines.map((line) => (
            <p key={line} className="break-words">
              {line}
            </p>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-500">No address saved for this order.</p>
      )}
    </div>
  );
}

export function AdminOrderDetailView({
  billingAddressLines,
  order,
  paymentMethods,
  returnTo,
  shippingAddressLines,
}: {
  billingAddressLines: string[];
  order: NonNullable<OrdersWorkspace["selectedOrder"]>;
  paymentMethods: OrdersWorkspace["paymentMethods"];
  returnTo: string;
  shippingAddressLines: string[];
}) {
  return (
    <div className="space-y-4">
      <AdminPanel>
        <AdminSectionHeader
          title={order.orderNo}
          description={`${order.customerName ?? "Outside customer"} / ${formatDateTime(order.orderDate)}`}
        />

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Order</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <AdminBadge label={order.status} tone={getTone(order.status)} />
                  <AdminBadge label={order.paymentStatus} tone={getTone(order.paymentStatus)} />
                  <AdminBadge
                    label={order.fulfillmentStatus}
                    tone={getTone(order.fulfillmentStatus)}
                  />
                </div>
              </div>

              <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Customer</p>
                <p className="mt-3 text-sm font-semibold text-slate-950">
                  {order.customerName ?? "Outside customer"}
                </p>
                <p className="mt-1 break-all text-xs text-slate-500">
                  {order.customerEmail ?? order.customerPhone ?? "No contact saved"}
                </p>
              </div>

              <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Delivery</p>
                <p className="mt-3 text-sm font-semibold text-slate-950">
                  {order.shippingMethodName ?? "No delivery method"}
                </p>
              </div>

              <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Grand total</p>
                <p className="mt-3 text-lg font-semibold text-slate-950">
                  {formatCurrency(order.grandTotal, order.currencyCode)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Subtotal {formatCurrency(order.subtotal, order.currencyCode)} / Shipping{" "}
                  {formatCurrency(order.shippingFee, order.currencyCode)} / Tax{" "}
                  {formatCurrency(order.taxTotal, order.currencyCode)}
                </p>
              </div>
            </div>

            {order.note ? (
              <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-stone-500">
                  Order note
                </p>
                <p className="mt-3 break-words text-sm leading-6 text-slate-700">{order.note}</p>
              </div>
            ) : null}
          </div>

          <div className="grid gap-4">
            <AddressCard lines={shippingAddressLines} title="Shipping address" />
            <AddressCard lines={billingAddressLines} title="Billing address" />
          </div>
        </div>
      </AdminPanel>

      <AdminPanel>
        <AdminSectionHeader
          title="Order items"
          description="Review the exact line snapshots captured on the order."
        />

        <div className="mt-5 space-y-3">
          {order.items.map((item) => (
            <div
              key={item.id}
              className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="break-words font-semibold text-slate-950">{item.productName}</p>
                  <p className="mt-1 break-words text-sm text-slate-600">
                    {(item.variantLabel ?? item.sku ?? "No variant label") +
                      " / Qty " +
                      item.quantity}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Unit price {formatCurrency(item.unitPrice, order.currencyCode)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-slate-950">
                  {formatCurrency(item.lineTotal, order.currencyCode)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </AdminPanel>

      <div className="grid gap-4 xl:grid-cols-2">
        <div id="payment">
          <AdminPanel>
            <AdminSectionHeader
              title="Payment history"
              description="Review payment records and confirm manual payments when funds arrive outside checkout."
            />

            <div className="mt-5 space-y-3">
              {order.payments.length > 0 ? (
                order.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="break-words font-semibold text-slate-950">
                          {payment.methodName}
                        </p>
                        <p className="mt-1 break-all text-xs text-slate-500">
                          {payment.transactionRef ?? "No reference"} /{" "}
                          {formatDateTime(payment.paymentDate)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <AdminBadge label={payment.status} tone={getTone(payment.status)} />
                        <span className="text-sm font-semibold text-slate-950">
                          {formatCurrency(payment.amount, order.currencyCode)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <AdminEmptyState
                  body="No payments have been recorded for this order yet."
                  title="No payments yet"
                />
              )}
            </div>

            <form action={confirmOrderPaymentAction} className="mt-5 space-y-4">
              <input name="orderId" type="hidden" value={order.id} />
              <input name="returnTo" type="hidden" value={returnTo} />
              <AdminSelect
                label="Payment method"
                name="paymentMethodId"
                options={paymentMethods.map((method) => ({
                  value: method.id,
                  label: `${method.methodName} (${method.code})`,
                }))}
              />
              <AdminField
                label="Reference"
                name="transactionRef"
                placeholder="Optional transaction reference"
              />
              <AdminTextarea label="Internal payment note" name="paymentNote" rows={3} />
              <AdminActionButton tone="emerald">Confirm payment</AdminActionButton>
            </form>
          </AdminPanel>
        </div>

        <div id="delivery">
          <AdminPanel>
            <AdminSectionHeader
              title="Delivery records"
              description="Track packing, shipment, courier details, and delivery completion from one place."
            />

            <div className="mt-5 space-y-3">
              {order.shipments.length > 0 ? (
                order.shipments.map((shipment) => (
                  <div
                    key={shipment.id}
                    className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="break-words font-semibold text-slate-950">
                          {shipment.courierName ?? "Courier pending"}
                        </p>
                        <p className="mt-1 break-all text-xs text-slate-500">
                          {shipment.trackingNo ?? "No tracking no"} / Shipped{" "}
                          {formatDateTime(shipment.shippedAt)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Delivered {formatDateTime(shipment.deliveredAt)}
                        </p>
                      </div>
                      <AdminBadge label={shipment.status} tone={getTone(shipment.status)} />
                    </div>
                  </div>
                ))
              ) : (
                <AdminEmptyState
                  body="No shipment record has been created for this order yet."
                  title="No delivery record yet"
                />
              )}
            </div>

            <form action={updateOrderFulfillmentAction} className="mt-5 space-y-4">
              <input name="orderId" type="hidden" value={order.id} />
              <input name="returnTo" type="hidden" value={returnTo} />
              <AdminSelect
                label="Fulfillment status"
                name="toFulfillmentStatus"
                options={FULFILLMENT_STATUS_OPTIONS.map((value) => ({
                  value,
                  label: value,
                }))}
              />
              <AdminFormGrid columns={2}>
                <AdminField
                  label="Courier"
                  name="courierName"
                  placeholder="DHL, rider team, local courier"
                />
                <AdminField
                  label="Tracking no"
                  name="trackingNo"
                  placeholder="Tracking number"
                />
              </AdminFormGrid>
              <AdminTextarea label="Shipment note" name="shipmentNote" rows={3} />
              <AdminActionButton tone="sky">Update delivery</AdminActionButton>
            </form>
          </AdminPanel>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div id="status">
          <AdminPanel>
            <AdminSectionHeader
              title="Order status"
              description="Update the commercial state without changing shipment records."
            />

            <form action={updateOrderStatusAction} className="mt-5 space-y-4">
              <input name="orderId" type="hidden" value={order.id} />
              <input name="returnTo" type="hidden" value={returnTo} />
              <AdminSelect
                label="Next status"
                name="toStatus"
                options={ORDER_STATUS_OPTIONS.map((value) => ({
                  value,
                  label: value,
                }))}
              />
              <AdminTextarea label="Status note" name="statusNote" rows={3} />
              <AdminActionButton>Update order status</AdminActionButton>
            </form>

            <form action={cancelOrderAction} className="mt-5 space-y-4">
              <input name="orderId" type="hidden" value={order.id} />
              <input name="returnTo" type="hidden" value={returnTo} />
              <AdminTextarea label="Cancellation note" name="cancelNote" rows={3} />
              <AdminActionButton tone="rose">Cancel order</AdminActionButton>
            </form>
          </AdminPanel>
        </div>

        <div id="timeline">
          <AdminPanel>
            <AdminSectionHeader
              title="Notes and timeline"
              description="Internal notes and status changes stay together in the order record."
            />

            <form action={addOrderNoteAction} className="mt-5 space-y-4">
              <input name="orderId" type="hidden" value={order.id} />
              <input name="returnTo" type="hidden" value={returnTo} />
              <AdminTextarea label="Add internal note" name="note" rows={3} />
              <AdminActionButton>Add note</AdminActionButton>
            </form>

            <div className="mt-5 space-y-3">
              {order.notes.length === 0 && order.statusLogs.length === 0 ? (
                <AdminEmptyState
                  body="Internal notes and status changes will appear here."
                  title="No timeline entries"
                />
              ) : null}

              {order.notes.map((note) => (
                <div
                  key={note.id}
                  className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <AdminBadge label={note.noteType} tone="slate" />
                    <span className="text-xs text-slate-500">
                      {formatDateTime(note.createdAt)}
                    </span>
                  </div>
                  <p className="mt-3 break-words text-sm leading-6 text-slate-700">
                    {note.note}
                  </p>
                </div>
              ))}

              {order.statusLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-[1rem] border border-stone-200 bg-white px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="break-words text-sm font-semibold text-slate-950">
                      {(log.fromStatus ?? "NEW") + " -> " + log.toStatus}
                    </p>
                    <span className="text-xs text-slate-500">
                      {formatDateTime(log.changedAt)}
                    </span>
                  </div>
                  {log.note ? (
                    <p className="mt-3 break-words text-sm leading-6 text-slate-700">
                      {log.note}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </AdminPanel>
        </div>
      </div>
    </div>
  );
}
