"use client";

import { startTransition, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { buttonClassName } from "@/components/ui/button";

type AccountAddressFormProps = {
  countries: Array<{
    id: string;
    label: string;
  }>;
  defaultCountryId: string;
  initialCustomer: {
    fullName: string;
    phone: string | null;
  };
  states: Array<{
    id: string;
    label: string;
    countryId: string;
  }>;
};

export function AccountAddressForm({
  countries,
  defaultCountryId,
  initialCustomer,
  states,
}: AccountAddressFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    label: "",
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
    isDefaultShipping: false,
    isDefaultBilling: false,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const filteredStates = useMemo(
    () => states.filter((item) => item.countryId === formData.countryId),
    [formData.countryId, states],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/store/account/addresses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to save address.");
      }

      setMessage("Address saved.");
      setFormData((current) => ({
        ...current,
        label: "",
        city: "",
        township: "",
        postalCode: "",
        addressLine1: "",
        addressLine2: "",
        landmark: "",
        stateRegionId: "",
        isDefaultShipping: false,
        isDefaultBilling: false,
      }));

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save address.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form className="grid gap-3" onSubmit={handleSubmit}>
      <div className="grid gap-3 md:grid-cols-2">
        <Field
          label="Label"
          onChange={(value) =>
            setFormData((current) => ({
              ...current,
              label: value,
            }))
          }
          value={formData.label}
        />
        <Field
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
              setFormData((current) => ({
                ...current,
                countryId: event.target.value,
                stateRegionId: "",
              }))
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

      <Field
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

      <div className="flex flex-wrap gap-3 text-sm text-text-muted">
        <label className="inline-flex items-center gap-2">
          <input
            checked={formData.isDefaultShipping}
            onChange={(event) =>
              setFormData((current) => ({
                ...current,
                isDefaultShipping: event.target.checked,
              }))
            }
            type="checkbox"
          />
          Default shipping
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            checked={formData.isDefaultBilling}
            onChange={(event) =>
              setFormData((current) => ({
                ...current,
                isDefaultBilling: event.target.checked,
              }))
            }
            type="checkbox"
          />
          Default billing
        </label>
      </div>

      {message ? (
        <p className="rounded-xl border border-border bg-surface-alt px-3 py-2 text-sm text-text-muted">
          {message}
        </p>
      ) : null}

      <button
        className={buttonClassName({ variant: "primary" })}
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Saving..." : "Save address"}
      </button>
    </form>
  );
}

function Field({
  label,
  onChange,
  required = false,
  value,
}: {
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
    </div>
  );
}
