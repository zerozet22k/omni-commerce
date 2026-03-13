"use client";

import { startTransition, useState } from "react";

import type { AdminLookupOption } from "@/components/admin/lookup-picker";
import { AdminLookupPicker } from "@/components/admin/lookup-picker";
import { AdminActionButton } from "@/components/admin/workspace";
import { formatCurrency } from "@/lib/utils/format";

type ShippingOption = {
  id: string;
  methodName: string;
  code: string;
};

type OrderLine = {
  variantId: string;
  label: string;
  sku: string;
  availableQty: number;
  quantity: number;
  unitPrice: number;
};

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getInputClassName() {
  return "block w-full rounded-[0.95rem] border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-slate-950 outline-none";
}

export function ManualOrderBuilder({
  shippingMethods,
}: {
  shippingMethods: ShippingOption[];
}) {
  const [isGuest, setIsGuest] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<AdminLookupOption | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [shippingMethodId, setShippingMethodId] = useState("");
  const [shippingFee, setShippingFee] = useState("0");
  const [discountTotal, setDiscountTotal] = useState("0");
  const [taxTotal, setTaxTotal] = useState("0");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<OrderLine[]>([]);

  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const discountValue = Math.min(toNumber(discountTotal), subtotal);
  const taxValue = Math.max(toNumber(taxTotal), 0);
  const shippingValue = Math.max(toNumber(shippingFee), 0);
  const grandTotal = subtotal - discountValue + taxValue + shippingValue;
  const hasCustomerContext = isGuest
    ? Boolean(customerName.trim() || customerEmail.trim() || customerPhone.trim())
    : Boolean(selectedCustomer);
  const canSubmit = lines.length > 0 && hasCustomerContext;

  function applyCustomerSelection(option: AdminLookupOption) {
    startTransition(() => {
      setSelectedCustomer(option);
      setCustomerName(option.label);
      setCustomerEmail(String(option.meta?.email ?? ""));
      setCustomerPhone(String(option.meta?.phone ?? ""));
    });
  }

  function addLine(option: AdminLookupOption) {
    startTransition(() => {
      setLines((currentLines) => {
        const existingLine = currentLines.find((line) => line.variantId === option.id);

        if (existingLine) {
          return currentLines.map((line) =>
            line.variantId === option.id
              ? { ...line, quantity: line.quantity + 1 }
              : line,
          );
        }

        return [
          ...currentLines,
          {
            variantId: option.id,
            label: option.label,
            sku: String(option.meta?.sku ?? ""),
            availableQty: Number(option.meta?.availableQty ?? 0),
            quantity: 1,
            unitPrice: Number(option.meta?.unitPrice ?? 0),
          },
        ];
      });
    });
  }

  function updateLine(variantId: string, updates: Partial<OrderLine>) {
    startTransition(() => {
      setLines((currentLines) =>
        currentLines.map((line) =>
          line.variantId === variantId ? { ...line, ...updates } : line,
        ),
      );
    });
  }

  function removeLine(variantId: string) {
    startTransition(() => {
      setLines((currentLines) => currentLines.filter((line) => line.variantId !== variantId));
    });
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <button
            className={`rounded-[1rem] border px-4 py-3 text-left transition ${
              !isGuest
                ? "border-slate-950 bg-slate-950 text-white"
                : "border-stone-200 bg-white text-slate-700"
            }`}
            onClick={() => setIsGuest(false)}
            type="button"
          >
            <p className="text-sm font-semibold">Linked customer</p>
            <p className="mt-1 text-xs opacity-80">
              Search an existing customer account and keep the order attached to it.
            </p>
          </button>
          <button
            className={`rounded-[1rem] border px-4 py-3 text-left transition ${
              isGuest
                ? "border-slate-950 bg-slate-950 text-white"
                : "border-stone-200 bg-white text-slate-700"
            }`}
            onClick={() => {
              setIsGuest(true);
              setSelectedCustomer(null);
            }}
            type="button"
          >
            <p className="text-sm font-semibold">Guest customer</p>
            <p className="mt-1 text-xs opacity-80">
              Capture customer contact without linking the order to an account.
            </p>
          </button>
        </div>

        {!isGuest ? (
          <>
            <AdminLookupPicker
              initialSelection={selectedCustomer}
              label="Customer"
              placeholder="Search customer by name, email, or phone"
              selectionBehavior="persist"
              type="customers"
              onSelect={applyCustomerSelection}
            />
            <input name="customerId" type="hidden" value={selectedCustomer?.id ?? ""} />
          </>
        ) : (
          <input name="customerId" type="hidden" value="guest" />
        )}

        <div className="grid gap-3 md:grid-cols-3">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">Customer name</span>
            <input
              className={getInputClassName()}
              name="customerName"
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder="Walk-in or phone customer"
              value={customerName}
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">Email</span>
            <input
              className={getInputClassName()}
              name="customerEmail"
              onChange={(event) => setCustomerEmail(event.target.value)}
              placeholder="Optional email"
              type="email"
              value={customerEmail}
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">Phone</span>
            <input
              className={getInputClassName()}
              name="customerPhone"
              onChange={(event) => setCustomerPhone(event.target.value)}
              placeholder="Optional phone"
              value={customerPhone}
            />
          </label>
        </div>
      </section>

      <section className="space-y-4">
        <AdminLookupPicker
          label="Add product variant"
          placeholder="Search by product name, SKU, or variant label"
          selectionBehavior="clear"
          type="variants"
          onSelect={addLine}
        />

        {lines.length > 0 ? (
          <div className="space-y-3">
            {lines.map((line) => (
              <div
                key={line.variantId}
                className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-slate-950">
                      {line.label}
                    </p>
                    <p className="mt-1 break-words text-xs text-slate-500">
                      {line.sku ? `SKU ${line.sku}` : "No SKU"} / Available{" "}
                      {line.availableQty.toLocaleString("en")}
                    </p>
                  </div>

                  <button
                    className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-rose-200 hover:text-rose-700"
                    onClick={() => removeLine(line.variantId)}
                    type="button"
                  >
                    Remove
                  </button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-slate-700">Quantity</span>
                    <input
                      className={getInputClassName()}
                      min="1"
                      onChange={(event) =>
                        updateLine(line.variantId, {
                          quantity: Math.max(1, Math.floor(toNumber(event.target.value))),
                        })
                      }
                      type="number"
                      value={line.quantity}
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-slate-700">Unit price</span>
                    <input
                      className={getInputClassName()}
                      min="0"
                      onChange={(event) =>
                        updateLine(line.variantId, {
                          unitPrice: Math.max(0, toNumber(event.target.value)),
                        })
                      }
                      step="any"
                      type="number"
                      value={line.unitPrice}
                    />
                  </label>
                  <div className="rounded-[0.95rem] border border-stone-200 bg-white px-3.5 py-2.5">
                    <p className="text-sm font-semibold text-slate-700">Line total</p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      {formatCurrency(line.quantity * line.unitPrice, "MMK")}
                    </p>
                  </div>
                </div>

                <input name="variantIds" type="hidden" value={line.variantId} />
                <input name="quantities" type="hidden" value={String(line.quantity)} />
                <input name="unitPrices" type="hidden" value={String(line.unitPrice)} />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[1rem] border border-dashed border-stone-200 bg-stone-50 px-5 py-8 text-center">
            <p className="text-sm font-semibold text-slate-950">No order lines yet</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Search for a product or variant above to start building the order.
            </p>
          </div>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">Shipping method</span>
              <select
                className={getInputClassName()}
                name="shippingMethodId"
                onChange={(event) => setShippingMethodId(event.target.value)}
                value={shippingMethodId}
              >
                <option value="">No delivery method</option>
                {shippingMethods.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.methodName} ({method.code})
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">Shipping fee</span>
              <input
                className={getInputClassName()}
                min="0"
                name="shippingFee"
                onChange={(event) => setShippingFee(event.target.value)}
                step="any"
                type="number"
                value={shippingFee}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">Discount total</span>
              <input
                className={getInputClassName()}
                min="0"
                name="discountTotal"
                onChange={(event) => setDiscountTotal(event.target.value)}
                step="any"
                type="number"
                value={discountTotal}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">Tax total</span>
              <input
                className={getInputClassName()}
                min="0"
                name="taxTotal"
                onChange={(event) => setTaxTotal(event.target.value)}
                step="any"
                type="number"
                value={taxTotal}
              />
            </label>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">Internal note</span>
            <textarea
              className="block min-h-[104px] w-full max-w-full resize-y rounded-[0.95rem] border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-slate-950 outline-none"
              name="note"
              onChange={(event) => setNote(event.target.value)}
              placeholder="Optional internal note"
              rows={4}
              value={note}
            />
          </label>
        </div>

        <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-4">
          <p className="text-sm font-semibold text-slate-950">Order totals</p>
          <dl className="mt-4 space-y-3 text-sm text-slate-700">
            <div className="flex items-center justify-between gap-3">
              <dt>Subtotal</dt>
              <dd className="font-semibold text-slate-950">
                {formatCurrency(subtotal, "MMK")}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt>Discount</dt>
              <dd className="font-semibold text-slate-950">
                {formatCurrency(discountValue, "MMK")}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt>Shipping</dt>
              <dd className="font-semibold text-slate-950">
                {formatCurrency(shippingValue, "MMK")}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt>Tax</dt>
              <dd className="font-semibold text-slate-950">
                {formatCurrency(taxValue, "MMK")}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-stone-200 pt-3">
              <dt className="text-base font-semibold text-slate-950">Grand total</dt>
              <dd className="text-base font-semibold text-slate-950">
                {formatCurrency(grandTotal, "MMK")}
              </dd>
            </div>
          </dl>

          <div className="mt-5">
            <AdminActionButton disabled={!canSubmit} type="submit" tone="emerald">
              Create manual order
            </AdminActionButton>
          </div>

          {!canSubmit ? (
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Add at least one order line and choose a linked customer or provide guest contact details before submitting.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
