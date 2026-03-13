import { AccountAddressForm } from "@/components/store/account-address-form";
import { StorefrontAccountShell } from "@/components/store/storefront-account-shell";
import { coreService } from "@/modules/core/core.service";
import { setupService } from "@/modules/setup/setup.service";
import { storefrontAccountService } from "@/modules/storefront/storefront-account.service";
import { requireStorefrontCustomer } from "@/modules/storefront/storefront-session";

export default async function AccountAddressesPage() {
  const user = await requireStorefrontCustomer("/account/addresses");
  const defaults = await setupService.ensureBaseCommerceSetup();
  const [addresses, countries, states] = await Promise.all([
    storefrontAccountService.listAddresses(user.id),
    coreService.listCountries(),
    coreService.listStateRegions(),
  ]);

  return (
    <StorefrontAccountShell
      currentPath="/account/addresses"
      description="Store delivery and billing addresses for faster checkout."
      title="Your addresses"
    >
      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(500px,560px)]">
        <section className="rounded-[1.75rem] border border-border bg-surface p-5 shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-text">Saved addresses</h2>
            {addresses.length > 0 ? (
              <p className="text-sm text-text-muted">
                {addresses.length} saved {addresses.length === 1 ? "address" : "addresses"}
              </p>
            ) : null}
          </div>

          {addresses.length > 0 ? (
            <div className="mt-5 grid gap-3">
              {addresses.map((address) => (
                <article
                  key={address.id}
                  className="rounded-[1.4rem] border border-border bg-surface-alt p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-text">
                        {address.label ?? "Saved address"}
                      </p>
                      <p className="mt-1 text-sm text-text-muted">
                        {address.receiverName}
                        {address.receiverPhone ? ` · ${address.receiverPhone}` : ""}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {address.isDefaultShipping ? (
                        <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">
                          Default shipping
                        </span>
                      ) : null}
                      {address.isDefaultBilling ? (
                        <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-text-muted">
                          Default billing
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 text-sm leading-7 text-text-muted">
                    <p>{address.addressLine1}</p>
                    {address.addressLine2 ? <p>{address.addressLine2}</p> : null}
                    {address.landmark ? <p>{address.landmark}</p> : null}
                    {address.township ? <p>{address.township}</p> : null}
                    {address.city ? <p>{address.city}</p> : null}
                    {address.stateRegionName ? <p>{address.stateRegionName}</p> : null}
                    {address.countryName ? <p>{address.countryName}</p> : null}
                    {address.postalCode ? <p>{address.postalCode}</p> : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-[1.4rem] border border-dashed border-border bg-surface-alt p-5">
              <p className="text-sm text-text-muted">No saved addresses yet.</p>
            </div>
          )}
        </section>

        <section className="rounded-[1.75rem] border border-border bg-surface p-5 shadow-[0_12px_36px_rgba(15,23,42,0.04)] 2xl:sticky 2xl:top-6">
          <h2 className="text-xl font-bold text-text">Add a new address</h2>
          <p className="mt-2 text-sm text-text-muted">
            Save a delivery or billing address for faster checkout next time.
          </p>

          <div className="mt-5">
            <AccountAddressForm
              countries={countries.map((country) => ({
                id: country.id,
                label: country.countryName,
              }))}
              defaultCountryId={defaults.countryId}
              initialCustomer={{
                fullName: user.fullName,
                phone: user.phone,
              }}
              states={states.map((state) => ({
                id: state.id,
                label: state.stateRegionName,
                countryId: String(state.countryId),
              }))}
            />
          </div>
        </section>
      </div>
    </StorefrontAccountShell>
  );
}