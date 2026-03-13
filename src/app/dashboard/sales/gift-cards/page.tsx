import Link from "next/link";
import { Types } from "mongoose";

import { AdminActionNotice } from "@/components/admin/action-notice";
import { GiftCardForm } from "@/components/admin/gift-card-form";
import { SalesTabs } from "@/components/admin/module-tabs";
import {
  AdminActionButton,
  AdminBadge,
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
import { GiftCardModel, GiftCardTransactionModel } from "@/modules/pricing/pricing.models";
import { saveGiftCardAction } from "@/app/dashboard/sales/actions";

type GiftCardsPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

const PAGE_LIMIT = 15;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default async function DashboardSalesGiftCardsPage({
  searchParams,
}: GiftCardsPageProps) {
  await requirePermission(PERMISSIONS.ordersView);
  const resolvedSearchParams = await searchParams;
  const query = readSearchParam(resolvedSearchParams, "q").trim();
  const state = readSearchParam(resolvedSearchParams, "state");
  const requestedPage = readNumberParam(resolvedSearchParams, "page", 1);
  const now = new Date();

  await connectToDatabase();

  const filter: Record<string, unknown> = {};

  if (query) {
    filter.code = new RegExp(escapeRegex(query), "i");
  }

  if (state === "active") {
    filter.isActive = true;
    filter.$or = [{ expiresAt: { $exists: false } }, { expiresAt: { $gte: now } }];
  } else if (state === "inactive") {
    filter.isActive = false;
  } else if (state === "expired") {
    filter.expiresAt = { $lt: now };
  }

  const [metrics, total] = await Promise.all([
    Promise.all([
      GiftCardModel.countDocuments({ isActive: true, $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gte: now } }] }).exec(),
      GiftCardModel.countDocuments({ isActive: false }).exec(),
      GiftCardModel.countDocuments({ expiresAt: { $lt: now } }).exec(),
      GiftCardTransactionModel.countDocuments({ transactionType: "REDEEM" }).exec(),
    ]),
    GiftCardModel.countDocuments(filter).exec(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const page = clampPage(requestedPage, totalPages);
  const giftCards = (await GiftCardModel.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .skip((page - 1) * PAGE_LIMIT)
    .limit(PAGE_LIMIT)
    .lean()
    .exec()) as Array<{
    _id: unknown;
    code?: string;
    initialBalance?: number;
    currentBalance?: number;
    currencyCode?: string;
    expiresAt?: Date | null;
    isActive?: boolean;
    createdAt?: Date | null;
  }>;
  const transactionCounts = giftCards.length > 0
    ? ((await GiftCardTransactionModel.aggregate<{ _id: unknown; count: number }>([
        {
          $match: {
            giftCardId: {
              $in: giftCards
                .map((giftCard) => String(giftCard._id))
                .filter((giftCardId) => Types.ObjectId.isValid(giftCardId))
                .map((giftCardId) => new Types.ObjectId(giftCardId)),
            },
          },
        },
        {
          $group: {
            _id: "$giftCardId",
            count: { $sum: 1 },
          },
        },
      ]).exec()) as Array<{ _id: unknown; count: number }>)
    : [];
  const transactionCountMap = new Map(
    transactionCounts.map((row) => [String(row._id), row.count]),
  );

  return (
    <AdminPage>
      <AdminPageHeader
        title="Gift Cards"
        description="Issue and monitor reusable balance codes, then review their redeem history from one sales workflow."
        actions={
          <AdminLinkButton href="/dashboard/sales/gift-cards/new" tone="primary">
            Create new gift card
          </AdminLinkButton>
        }
      />

      <SalesTabs currentPath="/dashboard/sales/gift-cards" />

      <AdminActionNotice searchParams={resolvedSearchParams} />

      <AdminSummaryStrip
        columns={4}
        items={[
          { label: "Active", value: metrics[0].toLocaleString("en"), hint: "Available to redeem" },
          { label: "Inactive", value: metrics[1].toLocaleString("en"), hint: "Disabled by staff" },
          { label: "Expired", value: metrics[2].toLocaleString("en"), hint: "Past expiry date" },
          { label: "Redeems", value: metrics[3].toLocaleString("en"), hint: "Recorded gift card redeems" },
        ]}
      />

      <AdminToolbar>
        <form action="/dashboard/sales/gift-cards" className="space-y-3" method="get">
          <AdminFilterGrid className="xl:grid-cols-[1.35fr_0.8fr]">
            <AdminField defaultValue={query} label="Search" name="q" placeholder="Gift card code" />
            <AdminSelect
              defaultValue={state}
              label="State"
              name="state"
              options={[
                { value: "", label: "All states" },
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
                { value: "expired", label: "Expired" },
              ]}
            />
          </AdminFilterGrid>
          <div className="flex flex-wrap gap-3">
            <AdminActionButton tone="slate">Apply filters</AdminActionButton>
            <AdminLinkButton href="/dashboard/sales/gift-cards">Reset</AdminLinkButton>
          </div>
        </form>
      </AdminToolbar>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <AdminPanel>
          <AdminSectionHeader
            title="Gift card list"
            description={`${total} gift cards matched the current filters.`}
          />
          <div className="mt-5 space-y-4">
            <AdminTableShell>
              <AdminTable>
                <AdminTableHead>
                  <tr>
                    <AdminTh>Code</AdminTh>
                    <AdminTh>Balances</AdminTh>
                    <AdminTh>State</AdminTh>
                    <AdminTh>Usage</AdminTh>
                    <AdminTh>Actions</AdminTh>
                  </tr>
                </AdminTableHead>
                <AdminTableBody>
                  {giftCards.map((giftCard) => {
                    const giftCardId = String(giftCard._id);
                    const isExpired = Boolean(giftCard.expiresAt && giftCard.expiresAt.getTime() < now.getTime());

                    return (
                      <tr key={giftCardId}>
                        <AdminTd>
                          <p className="font-semibold text-slate-950">{giftCard.code ?? "Gift card"}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Created {formatDateTime(giftCard.createdAt ?? null)}
                          </p>
                        </AdminTd>
                        <AdminTd>
                          <p className="font-semibold text-slate-950">
                            {formatCurrency(Number(giftCard.currentBalance ?? 0), giftCard.currencyCode ?? "MMK")}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Initial {formatCurrency(Number(giftCard.initialBalance ?? 0), giftCard.currencyCode ?? "MMK")}
                          </p>
                        </AdminTd>
                        <AdminTd>
                          <div className="flex flex-wrap gap-2">
                            <AdminBadge
                              label={giftCard.isActive ? "ACTIVE" : "INACTIVE"}
                              tone={giftCard.isActive ? "emerald" : "rose"}
                            />
                            {isExpired ? <AdminBadge label="EXPIRED" tone="amber" /> : null}
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            {giftCard.expiresAt ? formatDateTime(giftCard.expiresAt) : "No expiry"}
                          </p>
                        </AdminTd>
                        <AdminTd>
                          <p className="font-semibold text-slate-950">
                            {(transactionCountMap.get(giftCardId) ?? 0).toLocaleString("en")} entries
                          </p>
                        </AdminTd>
                        <AdminTd>
                          <Link
                            className="inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition"
                            href={`/dashboard/sales/gift-cards/${giftCardId}`}
                          >
                            View
                          </Link>
                        </AdminTd>
                      </tr>
                    );
                  })}
                </AdminTableBody>
              </AdminTable>
            </AdminTableShell>

            <AdminPagination
              hrefBuilder={(nextPage) =>
                buildHref("/dashboard/sales/gift-cards", resolvedSearchParams, { page: nextPage })
              }
              page={page}
              totalPages={totalPages}
            />
          </div>
        </AdminPanel>

        <GiftCardForm
          returnTo="/dashboard/sales/gift-cards"
          submitAction={saveGiftCardAction}
          submitLabel="Create gift card"
        />
      </div>
    </AdminPage>
  );
}
