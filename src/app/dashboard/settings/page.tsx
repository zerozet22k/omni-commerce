import Link from "next/link";

import { SettingsTabs } from "@/components/admin/module-tabs";
import {
  AdminActionButton,
  AdminBadge,
  AdminCheckbox,
  AdminField,
  AdminFormGrid,
  AdminInlineHint,
  AdminPage,
  AdminPageHeader,
  AdminPanel,
  AdminSectionHeader,
  AdminSelect,
  AdminSummaryStrip,
} from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { formatCompactNumber } from "@/lib/utils/format";
import { dashboardService } from "@/modules/dashboard/dashboard.service";
import { saveStoreSettingsAction } from "@/app/dashboard/settings/actions";

export default async function DashboardSettingsPage() {
  await requirePermission(PERMISSIONS.settingsManage);
  const data = await dashboardService.getSettingsPageData();
  const store = data.store;

  return (
    <AdminPage>
      <AdminPageHeader
        title="Settings"
        description="Store configuration, payment methods, and delivery methods stay editable here instead of living as static summary cards."
      />

      <SettingsTabs currentPath="/dashboard/settings" />

      <AdminSummaryStrip
        columns={3}
        items={data.metrics.map((metric) => ({
          label: metric.label,
          value: formatCompactNumber(metric.value),
          hint: metric.hint,
        }))}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_360px]">
        <AdminPanel>
          <AdminSectionHeader
            title="Store settings"
            description="Edit the actual store record used by the shell, checkout defaults, and operations policies."
          />
          <form action={saveStoreSettingsAction} className="mt-4 space-y-5">
            <input name="returnTo" type="hidden" value="/dashboard/settings" />

            <section className="space-y-3">
              <AdminSectionHeader title="Identity and contact" />
              <AdminFormGrid columns={2}>
                <AdminField
                  defaultValue={store?.storeName ?? "Omni Commerce"}
                  label="Store name"
                  name="storeName"
                  placeholder="Omni Commerce"
                />
                <AdminField
                  defaultValue={store?.storeSlug ?? "omni-commerce"}
                  label="Store slug"
                  name="storeSlug"
                  placeholder="omni-commerce"
                />
                <AdminField
                  defaultValue={store?.storeEmail ?? ""}
                  label="Store email"
                  name="storeEmail"
                  placeholder="store@example.com"
                  type="email"
                />
                <AdminField
                  defaultValue={store?.storePhone ?? ""}
                  label="Store phone"
                  name="storePhone"
                  placeholder="Main store phone"
                />
                <AdminField
                  defaultValue={store?.supportEmail ?? ""}
                  label="Support email"
                  name="supportEmail"
                  placeholder="support@example.com"
                  type="email"
                />
                <AdminField
                  defaultValue={store?.supportPhone ?? ""}
                  label="Support phone"
                  name="supportPhone"
                  placeholder="Support hotline"
                />
              </AdminFormGrid>
            </section>

            <section className="space-y-3">
              <AdminSectionHeader title="Commerce defaults" />
              <AdminFormGrid columns={3}>
                <AdminField
                  defaultValue={store?.currencyCode ?? "MMK"}
                  label="Currency"
                  name="currencyCode"
                  placeholder="MMK"
                />
                <AdminField
                  defaultValue={store?.locale ?? "en"}
                  label="Locale"
                  name="locale"
                  placeholder="en"
                />
                <AdminField
                  defaultValue={store?.timezone ?? "Asia/Yangon"}
                  label="Timezone"
                  name="timezone"
                  placeholder="Asia/Yangon"
                />
                <AdminSelect
                  defaultValue={store?.stockPolicy ?? "BLOCK_ON_ZERO"}
                  label="Stock policy"
                  name="stockPolicy"
                  options={[
                    { value: "BLOCK_ON_ZERO", label: "Block when out of stock" },
                    { value: "ALLOW_BACKORDER", label: "Allow backorders" },
                  ]}
                />
                <AdminField
                  defaultValue={store?.orderAutoCancelMinutes ?? 1440}
                  label="Auto cancel minutes"
                  name="orderAutoCancelMinutes"
                  type="number"
                />
              </AdminFormGrid>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <AdminCheckbox
                  defaultChecked={store?.allowGuestCheckout ?? false}
                  label="Allow guest checkout"
                  name="allowGuestCheckout"
                />
                <AdminCheckbox
                  defaultChecked={store?.reviewAutoPublish ?? false}
                  label="Auto publish reviews"
                  name="reviewAutoPublish"
                />
                <AdminCheckbox
                  defaultChecked={store?.maintenanceMode ?? false}
                  label="Maintenance mode"
                  name="maintenanceMode"
                />
                <AdminCheckbox
                  defaultChecked={store?.isActive ?? true}
                  label="Store active"
                  name="isActive"
                />
              </div>
            </section>

            <AdminActionButton>Save store settings</AdminActionButton>
          </form>
        </AdminPanel>

        <div className="space-y-4">
          <AdminPanel>
            <AdminSectionHeader title="Live state" />
            <div className="mt-4 flex flex-wrap gap-2">
              <AdminBadge
                label={store?.maintenanceMode ? "MAINTENANCE" : "LIVE"}
                tone={store?.maintenanceMode ? "amber" : "emerald"}
              />
              <AdminBadge
                label={store?.allowGuestCheckout ? "GUEST CHECKOUT" : "ACCOUNT CHECKOUT"}
                tone="sky"
              />
              <AdminBadge
                label={store?.stockPolicy === "ALLOW_BACKORDER" ? "BACKORDER" : "STRICT STOCK"}
                tone="slate"
              />
            </div>
            <div className="mt-4 grid gap-3">
              <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Support</p>
                <p className="mt-2 text-sm text-slate-700">
                  {store?.supportEmail ?? store?.supportPhone ?? "No support contact saved"}
                </p>
              </div>
              <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Locale</p>
                <p className="mt-2 text-sm text-slate-700">
                  {store?.locale ?? "en"} / {store?.timezone ?? "Asia/Yangon"}
                </p>
              </div>
            </div>
          </AdminPanel>

          <AdminPanel>
            <AdminSectionHeader
              title="Commerce records"
              description="Operational settings are split into focused staff pages instead of being mixed into one long form."
            />
            <div className="mt-4 grid gap-3">
              <Link
                className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3 font-semibold text-slate-950"
                href="/dashboard/settings/countries"
              >
                Countries
              </Link>
              <Link
                className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3 font-semibold text-slate-950"
                href="/dashboard/settings/states-regions"
              >
                States / Regions
              </Link>
              <Link
                className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3 font-semibold text-slate-950"
                href="/dashboard/settings/payment-methods"
              >
                Payment methods
              </Link>
              <Link
                className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3 font-semibold text-slate-950"
                href="/dashboard/settings/shipping-zones"
              >
                Shipping zones
              </Link>
              <Link
                className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3 font-semibold text-slate-950"
                href="/dashboard/settings/shipping-methods"
              >
                Delivery methods
              </Link>
              <Link
                className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3 font-semibold text-slate-950"
                href="/dashboard/settings/shipping-rate-rules"
              >
                Shipping rate rules
              </Link>
              <Link
                className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3 font-semibold text-slate-950"
                href="/dashboard/settings/tax-classes"
              >
                Tax classes
              </Link>
              <Link
                className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3 font-semibold text-slate-950"
                href="/dashboard/settings/tax-rates"
              >
                Tax rates
              </Link>
            </div>
          </AdminPanel>

          <AdminInlineHint tone="sky">
            Zone coverage, delivery methods, and shipping rate rules are managed as separate settings records. Order-level courier and tracking updates stay on the orders screen.
          </AdminInlineHint>
        </div>
      </div>
    </AdminPage>
  );
}
