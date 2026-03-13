"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { buttonClassName } from "@/components/ui/button";
import { useAppDispatch } from "@/lib/store/hooks";
import { clearCart } from "@/lib/store/slices/cart-slice";
import { formatCurrency } from "@/lib/utils/format";
import type { StorefrontGiftCardPreview } from "@/modules/storefront/storefront.types";

type CheckoutFormProps = {
  cart: {
    currencyCode: string;
    grandTotal: number;
    subtotal: number;
    shippingFee: number;
    taxTotal: number;
  };
  paymentMethods: Array<{
    id: string;
    code: string;
    methodName: string;
    provider?: string | null;
  }>;
  shippingMethods: Array<{
    id: string;
    methodName: string;
    code: string;
    description?: string | null;
    baseFee: number;
    estimatedMinDays?: number | null;
    estimatedMaxDays?: number | null;
  }>;
  countries: Array<{
    id: string;
    label: string;
  }>;
  states: Array<{
    id: string;
    label: string;
    countryId: string;
  }>;
  defaultCountryId: string;
  initialCustomer: {
    fullName: string;
    phone: string | null;
  };
};

type FieldErrorState = Partial<Record<"receiverName" | "receiverPhone" | "countryId" | "addressLine1" | "shippingMethodId" | "paymentMethodId", string>>;

export function CheckoutForm({
  cart,
  countries,
  states,
  defaultCountryId,
  paymentMethods,
  shippingMethods,
  initialCustomer,
}: CheckoutFormProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [formData, setFormData] = useState({
    receiverName: initialCustomer.fullName,
    receiverPhone: initialCustomer.phone ?? "",
    countryId: defaultCountryId,
    stateRegionId: "",
    city: "",
    township: "",
    postalCode: "",
    addressLine1: "",
    addressLine2: "",
    landmark: "",
    note: "",
    shippingMethodId: shippingMethods[0]?.id ?? "",
    paymentMethodId: paymentMethods[0]?.id ?? "",
    giftCardCode: "",
  });
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [giftCardMessage, setGiftCardMessage] = useState<string | null>(null);
  const [appliedGiftCard, setAppliedGiftCard] = useState<StorefrontGiftCardPreview | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrorState>({});
  const [availableShippingMethods, setAvailableShippingMethods] = useState(shippingMethods);
  const [isShippingPending, setIsShippingPending] = useState(false);
  const [isGiftCardPending, setIsGiftCardPending] = useState(false);
  const filteredStates = useMemo(
    () => (formData.countryId ? states.filter((option) => option.countryId === formData.countryId) : []),
    [formData.countryId, states],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadShippingMethods() {
      setIsShippingPending(true);

      try {
        const response = await fetch(
          `/api/store/shipping-methods?countryId=${encodeURIComponent(formData.countryId)}`,
        );
        const payload = (await response.json().catch(() => [])) as CheckoutFormProps["shippingMethods"];

        if (!response.ok || cancelled) {
          return;
        }

        setAvailableShippingMethods(payload);
        setFormData((current) => ({
          ...current,
          shippingMethodId:
            payload.some((method) => method.id === current.shippingMethodId)
              ? current.shippingMethodId
              : (payload[0]?.id ?? ""),
        }));
      } finally {
        if (!cancelled) {
          setIsShippingPending(false);
        }
      }
    }

    if (formData.countryId) {
      void loadShippingMethods();
    } else {
      setAvailableShippingMethods([]);
    }

    return () => {
      cancelled = true;
    };
  }, [formData.countryId]);

  function validate() {
    const nextErrors: FieldErrorState = {};

    if (!formData.receiverName.trim()) {
      nextErrors.receiverName = "Receiver name is required.";
    }

    if (!formData.receiverPhone.trim()) {
      nextErrors.receiverPhone = "Receiver phone is required.";
    }

    if (!formData.countryId.trim()) {
      nextErrors.countryId = "Country is required.";
    }

    if (!formData.addressLine1.trim()) {
      nextErrors.addressLine1 = "Address line 1 is required.";
    }

    if (availableShippingMethods.length > 0 && !formData.shippingMethodId.trim()) {
      nextErrors.shippingMethodId = "Select a delivery method.";
    }

    if (!formData.paymentMethodId.trim()) {
      nextErrors.paymentMethodId = "Select a payment method.";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function applyGiftCard() {
    const code = formData.giftCardCode.trim();

    if (!code) {
      setGiftCardMessage("Enter a gift card code first.");
      setAppliedGiftCard(null);
      return;
    }

    setIsGiftCardPending(true);
    setGiftCardMessage(null);

    try {
      const response = await fetch("/api/store/gift-cards/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });
      const payload = (await response.json().catch(() => ({}))) as
        | StorefrontGiftCardPreview
        | { message?: string };

      if (!response.ok || !("giftCardId" in payload)) {
        throw new Error(
          "message" in payload ? payload.message ?? "Unable to apply gift card." : "Unable to apply gift card.",
        );
      }

      setAppliedGiftCard(payload);
      setFormData((current) => ({
        ...current,
        giftCardCode: payload.code,
      }));
      setGiftCardMessage("Gift card applied to this checkout.");
    } catch (error) {
      setAppliedGiftCard(null);
      setGiftCardMessage(
        error instanceof Error ? error.message : "Unable to apply gift card.",
      );
    } finally {
      setIsGiftCardPending(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    if (formData.giftCardCode.trim() && !appliedGiftCard) {
      setMessage("Apply the gift card before placing the order.");
      return;
    }

    setIsPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/store/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to place order.");
      }

      setMessage(`Order ${payload.order.orderNo} created successfully.`);
      dispatch(clearCart());
      startTransition(() => {
        router.push(`/account/orders/${payload.order.id}`);
        router.refresh();
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to place order.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_380px]" onSubmit={handleSubmit}>
      <div className="space-y-5">
        <section className="rounded-[1.75rem] border border-border bg-surface p-5 shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
            <span className="rounded-full bg-primary px-3 py-1 text-white">1</span>
            Shipping address
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field
              error={fieldErrors.receiverName}
              label="Receiver name"
              onChange={(value) =>
                setFormData((current) => ({
                  ...current,
                  receiverName: value,
                }))
              }
              required
              value={formData.receiverName}
            />
            <Field
              error={fieldErrors.receiverPhone}
              label="Receiver phone"
              onChange={(value) =>
                setFormData((current) => ({
                  ...current,
                  receiverPhone: value,
                }))
              }
              required
              value={formData.receiverPhone}
            />

            <div className="grid gap-2">
              <label className="text-sm font-semibold text-text">Country</label>
              <select
                className="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-text focus:border-primary/20 focus:ring-2 focus:ring-focus-ring/15"
                onChange={(event) =>
                  setFormData((current) => {
                    const nextCountryId = event.target.value;
                    const stateStillValid = states.some(
                      (option) =>
                        option.id === current.stateRegionId &&
                        option.countryId === nextCountryId,
                    );

                    return {
                      ...current,
                      countryId: nextCountryId,
                      stateRegionId: stateStillValid ? current.stateRegionId : "",
                    };
                  })
                }
                required
                value={formData.countryId}
              >
                <option value="">Select country</option>
                {countries.map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.label}
                  </option>
                ))}
              </select>
              {fieldErrors.countryId ? (
                <p className="text-xs text-danger">{fieldErrors.countryId}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-semibold text-text">State / region</label>
              <select
                className="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-text focus:border-primary/20 focus:ring-2 focus:ring-focus-ring/15 disabled:opacity-50"
                disabled={!formData.countryId || filteredStates.length === 0}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    stateRegionId: event.target.value,
                  }))
                }
                value={formData.stateRegionId}
              >
                <option value="">
                  {!formData.countryId
                    ? "Select a country first"
                    : filteredStates.length > 0
                      ? "Select state / region"
                      : "No states for this country"}
                </option>
                {filteredStates.map((state) => (
                  <option key={state.id} value={state.id}>
                    {state.label}
                  </option>
                ))}
              </select>
            </div>

            <Field
              label="City"
              onChange={(value) =>
                setFormData((current) => ({
                  ...current,
                  city: value,
                }))
              }
              value={formData.city}
            />
            <Field
              label="Township"
              onChange={(value) =>
                setFormData((current) => ({
                  ...current,
                  township: value,
                }))
              }
              value={formData.township}
            />
            <Field
              label="Postal code"
              onChange={(value) =>
                setFormData((current) => ({
                  ...current,
                  postalCode: value,
                }))
              }
              value={formData.postalCode}
            />
          </div>

          <div className="mt-4 grid gap-4">
            <Field
              error={fieldErrors.addressLine1}
              label="Address line 1"
              onChange={(value) =>
                setFormData((current) => ({
                  ...current,
                  addressLine1: value,
                }))
              }
              required
              value={formData.addressLine1}
            />
            <Field
              label="Address line 2"
              onChange={(value) =>
                setFormData((current) => ({
                  ...current,
                  addressLine2: value,
                }))
              }
              value={formData.addressLine2}
            />
            <Field
              label="Landmark"
              onChange={(value) =>
                setFormData((current) => ({
                  ...current,
                  landmark: value,
                }))
              }
              value={formData.landmark}
            />
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-border bg-surface p-5 shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
            <span className="rounded-full bg-primary px-3 py-1 text-white">2</span>
            Delivery method
          </div>

          <div className="mt-5 grid gap-3">
            {availableShippingMethods.length > 0 ? (
              availableShippingMethods.map((method) => {
                const isSelected = formData.shippingMethodId === method.id;

                return (
                  <button
                    key={method.id}
                    className={`rounded-[1.4rem] border p-4 text-left transition ${isSelected ? "border-primary bg-primary text-white" : "border-border bg-surface-alt hover:bg-surface"}`}
                    onClick={() =>
                      setFormData((current) => ({
                        ...current,
                        shippingMethodId: method.id,
                      }))
                    }
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className={`text-sm font-semibold ${isSelected ? "text-white" : "text-text"}`}>
                          {method.methodName}
                        </p>
                        <p className={`mt-1 text-sm leading-6 ${isSelected ? "text-slate-100" : "text-text-muted"}`}>
                          {method.description ??
                            (method.estimatedMinDays && method.estimatedMaxDays
                              ? `${method.estimatedMinDays}-${method.estimatedMaxDays} days`
                              : "Delivery method")}
                        </p>
                      </div>
                      <span className={`text-sm font-semibold ${isSelected ? "text-white" : "text-text"}`}>
                        {formatCurrency(method.baseFee, cart.currencyCode)}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="rounded-[1.4rem] border border-dashed border-border bg-surface-alt px-4 py-5 text-sm text-text-muted">
                {isShippingPending
                  ? "Loading delivery methods..."
                  : "No delivery methods are configured for the selected country yet."}
              </div>
            )}
            {fieldErrors.shippingMethodId ? (
              <p className="text-xs text-danger">{fieldErrors.shippingMethodId}</p>
            ) : null}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-border bg-surface p-5 shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
            <span className="rounded-full bg-primary px-3 py-1 text-white">3</span>
            Payment method
          </div>

          <div className="mt-5 grid gap-3">
            {paymentMethods.map((method) => {
              const isSelected = formData.paymentMethodId === method.id;

              return (
                <button
                  key={method.id}
                  className={`rounded-[1.4rem] border p-4 text-left transition ${isSelected ? "border-primary bg-primary text-white" : "border-border bg-surface-alt hover:bg-surface"}`}
                  onClick={() =>
                    setFormData((current) => ({
                      ...current,
                      paymentMethodId: method.id,
                    }))
                  }
                  type="button"
                >
                  <p className={`text-sm font-semibold ${isSelected ? "text-white" : "text-text"}`}>
                    {method.methodName}
                  </p>
                  <p className={`mt-1 text-sm ${isSelected ? "text-slate-100" : "text-text-muted"}`}>
                    {method.provider ?? method.code}
                  </p>
                </button>
              );
            })}
            {fieldErrors.paymentMethodId ? (
              <p className="text-xs text-danger">{fieldErrors.paymentMethodId}</p>
            ) : null}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-border bg-surface p-5 shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
            <span className="rounded-full bg-primary px-3 py-1 text-white">4</span>
            Gift card
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input
              className="h-11 flex-1 rounded-xl border border-border bg-surface px-3 text-sm text-text outline-none focus:border-primary/20 focus:ring-2 focus:ring-focus-ring/15"
              onChange={(event) => {
                const nextCode = event.target.value;
                setFormData((current) => ({
                  ...current,
                  giftCardCode: nextCode,
                }));
                setAppliedGiftCard(null);
                setGiftCardMessage(null);
              }}
              placeholder="Enter gift card code"
              value={formData.giftCardCode}
            />
            <button
              className={buttonClassName({ variant: "secondary" })}
              disabled={isGiftCardPending}
              onClick={() => void applyGiftCard()}
              type="button"
            >
              {isGiftCardPending ? "Applying..." : "Apply code"}
            </button>
          </div>
          {giftCardMessage ? (
            <p className="mt-3 rounded-xl border border-border bg-surface-alt px-3 py-2 text-sm text-text-muted">
              {giftCardMessage}
            </p>
          ) : null}
          {appliedGiftCard ? (
            <div className="mt-3 rounded-[1.4rem] border border-border bg-surface-alt p-4 text-sm text-text-muted">
              <div className="flex items-center justify-between gap-3">
                <span>Applied from {appliedGiftCard.code}</span>
                <span className="font-semibold text-text">
                  -{formatCurrency(appliedGiftCard.appliedAmount, appliedGiftCard.currencyCode)}
                </span>
              </div>
              <p className="mt-2">
                Remaining balance:{" "}
                {formatCurrency(appliedGiftCard.remainingBalance, appliedGiftCard.currencyCode)}
              </p>
            </div>
          ) : null}
        </section>

        <section className="rounded-[1.75rem] border border-border bg-surface p-5 shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
            <span className="rounded-full bg-primary px-3 py-1 text-white">5</span>
            Order note
          </div>
          <textarea
            className="w-full mt-5 min-h-28 rounded-xl border border-border bg-surface-alt px-4 py-3 text-sm text-text focus:border-primary/20 focus:ring-2 focus:ring-focus-ring/15"
            onChange={(event) =>
              setFormData((current) => ({
                ...current,
                note: event.target.value,
              }))
            }
            placeholder="Add delivery notes or extra context for this order"
            value={formData.note}
          />
        </section>
      </div>

      <aside className="rounded-[1.75rem] border border-border bg-surface p-5 shadow-[0_12px_36px_rgba(15,23,42,0.04)] xl:sticky xl:top-28 xl:h-fit">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
          Order summary
        </p>
        <div className="mt-5 space-y-4 text-sm text-text-muted">
          <div className="flex items-center justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(cart.subtotal, cart.currencyCode)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Shipping</span>
            <span>{formatCurrency(cart.shippingFee, cart.currencyCode)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Tax</span>
            <span>{formatCurrency(cart.taxTotal, cart.currencyCode)}</span>
          </div>
          {appliedGiftCard ? (
            <div className="flex items-center justify-between">
              <span>Gift card</span>
              <span>
                -{formatCurrency(appliedGiftCard.appliedAmount, appliedGiftCard.currencyCode)}
              </span>
            </div>
          ) : null}
          <div className="flex items-center justify-between border-t border-border pt-4 text-base font-bold text-text">
            <span>Total due</span>
            <span>
              {formatCurrency(
                appliedGiftCard?.totalAfterGiftCard ?? cart.grandTotal,
                cart.currencyCode,
              )}
            </span>
          </div>
        </div>
        <p className="mt-3 text-xs leading-5 text-text-muted">
          The summary reflects the current cart totals. The selected delivery method is still recorded with the order for fulfillment.
        </p>

        {message ? (
          <p className="mt-4 rounded-xl border border-border bg-surface-alt px-3 py-2 text-sm text-text-muted">
            {message}
          </p>
        ) : null}

        <button
          className={`mt-5 ${buttonClassName({ block: true, size: "lg", variant: "primary" })}`}
          disabled={isPending || isShippingPending}
          type="submit"
        >
          {isPending ? "Placing order..." : "Place order"}
        </button>
      </aside>
    </form>
  );
}

function Field({
  error,
  label,
  onChange,
  required = false,
  value,
}: {
  error?: string;
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  value: string;
}) {
  return (
    <div className="grid gap-2">
      <label className="text-sm font-semibold text-text">{label}</label>
      <input
        className="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-text focus:border-primary/20 focus:ring-2 focus:ring-focus-ring/15"
        onChange={(event) => onChange(event.target.value)}
        required={required}
        value={value}
      />
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
