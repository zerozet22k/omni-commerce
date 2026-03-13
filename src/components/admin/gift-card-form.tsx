import {
  AdminActionButton,
  AdminCheckbox,
  AdminField,
  AdminPanel,
  AdminSectionHeader,
} from "@/components/admin/workspace";

export function GiftCardForm({
  giftCard,
  returnTo,
  submitAction,
  submitLabel,
}: {
  giftCard?: {
    id: string;
    code: string;
    initialBalance: number;
    currentBalance: number;
    currencyCode: string;
    expiresAt: string;
    isActive: boolean;
  } | null;
  returnTo: string;
  submitAction: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
}) {
  const openingBalanceValue = giftCard ? giftCard.initialBalance : "";
  const currencyCodeValue = giftCard ? giftCard.currencyCode : "MMK";

  return (
    <AdminPanel>
      <AdminSectionHeader
        title={giftCard ? "Gift card settings" : "Create gift card"}
        description={
          giftCard
            ? "Update the code, active state, and expiry while the balance and transaction history stay visible below."
            : "Issue a new gift card code and opening balance."
        }
      />
      <form action={submitAction} className="mt-5 space-y-4">
        <input name="giftCardId" type="hidden" value={giftCard?.id ?? ""} />
        <input name="returnTo" type="hidden" value={returnTo} />

        <AdminField
          defaultValue={giftCard?.code ?? ""}
          label="Code"
          name="code"
          placeholder="OMNI-GIFT-100"
        />

        {!giftCard ? (
          <>
            <AdminField
              defaultValue={openingBalanceValue}
              label="Opening balance"
              name="initialBalance"
              placeholder="100000"
              type="number"
            />
            <AdminField
              defaultValue={currencyCodeValue}
              label="Currency code"
              name="currencyCode"
              placeholder="MMK"
            />
          </>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Initial balance
              </p>
              <p className="mt-2 text-base font-semibold text-slate-950">
                {giftCard.initialBalance.toLocaleString("en")} {giftCard.currencyCode}
              </p>
            </div>
            <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Current balance
              </p>
              <p className="mt-2 text-base font-semibold text-slate-950">
                {giftCard.currentBalance.toLocaleString("en")} {giftCard.currencyCode}
              </p>
            </div>
          </div>
        )}

        <label className="grid min-w-0 gap-2">
          <span className="text-sm font-semibold text-slate-700">Expiry</span>
          <input
            className="block w-full min-w-0 rounded-[0.95rem] border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-slate-950 outline-none"
            defaultValue={giftCard?.expiresAt ?? ""}
            name="expiresAt"
            type="datetime-local"
          />
        </label>

        <AdminCheckbox defaultChecked={giftCard?.isActive ?? true} label="Active" name="isActive" />

        <AdminActionButton tone="sky">{submitLabel}</AdminActionButton>
      </form>
    </AdminPanel>
  );
}
