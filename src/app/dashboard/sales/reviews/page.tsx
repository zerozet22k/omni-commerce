import { Types } from "mongoose";

import { bulkReviewAction, updateReviewAction } from "@/app/dashboard/sales/actions";
import { AdminActionNotice } from "@/components/admin/action-notice";
import { SalesTabs } from "@/components/admin/module-tabs";
import { AdminReviewsGrid } from "@/components/admin/reviews-grid";
import {
  AdminActionButton,
  AdminBadge,
  AdminCheckbox,
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
  AdminTextarea,
  AdminToolbar,
} from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { connectToDatabase } from "@/lib/db/mongodb";
import { formatDateTime } from "@/lib/utils/format";
import {
  buildHref,
  clampPage,
  readNumberParam,
  readSearchParam,
  type AdminSearchParams,
} from "@/modules/admin/admin-query";
import { ProductModel } from "@/modules/catalog/catalog.models";
import { MediaAssetModel } from "@/modules/core/core.models";
import { ReviewMediaModel, ReviewModel } from "@/modules/engagement/engagement.models";
import { OrderItemModel } from "@/modules/orders/orders.models";
import { UserModel } from "@/modules/users/user.model";

type ReviewsPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

const PAGE_LIMIT = 15;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getTone(isVisible: boolean) {
  return isVisible ? ("emerald" as const) : ("amber" as const);
}

export default async function DashboardSalesReviewsPage({
  searchParams,
}: ReviewsPageProps) {
  await requirePermission(PERMISSIONS.ordersView);
  const resolvedSearchParams = await searchParams;

  await connectToDatabase();

  const query = readSearchParam(resolvedSearchParams, "q").trim();
  const visibility = readSearchParam(resolvedSearchParams, "visibility");
  const rating = readSearchParam(resolvedSearchParams, "rating");
  const sort = readSearchParam(resolvedSearchParams, "sort") || "newest";
  const selectedReviewId = readSearchParam(resolvedSearchParams, "reviewId");
  const requestedPage = readNumberParam(resolvedSearchParams, "page", 1);

  const filter: Record<string, unknown> = {};

  if (visibility === "visible") {
    filter.isVisible = true;
  }

  if (visibility === "hidden") {
    filter.isVisible = false;
  }

  if (rating) {
    filter.rating = Number(rating);
  }

  if (query) {
    const regex = new RegExp(escapeRegex(query), "i");
    const [matchingProducts, matchingUsers] = await Promise.all([
      (await ProductModel.find({
        $or: [{ productName: regex }, { slug: regex }],
      })
        .select("_id")
        .lean()
        .exec()) as Array<{ _id: unknown }>,
      (await UserModel.find({
        $or: [{ fullName: regex }, { email: regex }, { phone: regex }],
      })
        .select("_id")
        .lean()
        .exec()) as Array<{ _id: unknown }>,
    ]);

    filter.$or = [
      { title: regex },
      { comment: regex },
      ...(matchingProducts.length > 0
        ? [{ productId: { $in: matchingProducts.map((product) => product._id) } }]
        : []),
      ...(matchingUsers.length > 0
        ? [{ customerId: { $in: matchingUsers.map((user) => user._id) } }]
        : []),
    ];
  }

  const [metrics, total] = await Promise.all([
    Promise.all([
      ReviewModel.countDocuments({ isVisible: true }).exec(),
      ReviewModel.countDocuments({ isVisible: false }).exec(),
      ReviewModel.countDocuments({ isVerifiedPurchase: true }).exec(),
      ReviewModel.countDocuments({ rating: 5 }).exec(),
    ]),
    ReviewModel.countDocuments(filter).exec(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const page = clampPage(requestedPage, totalPages);
  const sortMap: Record<string, Record<string, 1 | -1>> = {
    newest: { createdAt: -1, _id: -1 },
    oldest: { createdAt: 1, _id: 1 },
    rating_desc: { rating: -1, createdAt: -1 },
    rating_asc: { rating: 1, createdAt: -1 },
  };

  const reviews = (await ReviewModel.find(filter)
    .sort(sortMap[sort] ?? sortMap.newest)
    .skip((page - 1) * PAGE_LIMIT)
    .limit(PAGE_LIMIT)
    .lean()
    .exec()) as Array<{
    _id: unknown;
    productId?: unknown;
    customerId?: unknown;
    orderItemId?: unknown;
    rating?: number;
    title?: string;
    comment?: string;
    isVerifiedPurchase?: boolean;
    isVisible?: boolean;
    createdAt?: Date;
  }>;

  const productIds = reviews.map((review) => String(review.productId ?? "")).filter(Boolean);
  const customerIds = reviews.map((review) => String(review.customerId ?? "")).filter(Boolean);

  const [products, customers] = await Promise.all([
    productIds.length > 0
      ? ((await ProductModel.find({ _id: { $in: productIds } })
          .select("productName slug")
          .lean()
          .exec()) as Array<{
          _id: unknown;
          productName?: string;
          slug?: string;
        }>)
      : [],
    customerIds.length > 0
      ? ((await UserModel.find({ _id: { $in: customerIds } })
          .select("fullName email")
          .lean()
          .exec()) as Array<{
          _id: unknown;
          fullName?: string;
          email?: string;
        }>)
      : [],
  ]);

  const productMap = new Map(
    products.map((product) => [
      String(product._id),
      {
        productName: typeof product.productName === "string" ? product.productName : "Product",
        slug:
          typeof product.slug === "string" && product.slug.trim() ? product.slug : null,
      },
    ]),
  );
  const customerMap = new Map(
    customers.map((customer) => [
      String(customer._id),
      {
        fullName:
          typeof customer.fullName === "string" && customer.fullName.trim()
            ? customer.fullName
            : "Customer",
        email:
          typeof customer.email === "string" && customer.email.trim()
            ? customer.email
            : null,
      },
    ]),
  );

  let selectedReview: null | {
    id: string;
    productId: string;
    productName: string;
    productSlug: string | null;
    customerName: string;
    customerEmail: string | null;
    rating: number;
    title: string | null;
    comment: string | null;
    isVisible: boolean;
    isVerifiedPurchase: boolean;
    createdAt: Date | null;
    orderItemProduct: string | null;
    media: Array<{
      id: string;
      url: string;
    }>;
  } = null;

  if (Types.ObjectId.isValid(selectedReviewId)) {
    const review = (await ReviewModel.findById(selectedReviewId)
      .lean()
      .exec()) as
      | {
          _id: unknown;
          productId?: unknown;
          customerId?: unknown;
          orderItemId?: unknown;
          rating?: number;
          title?: string;
          comment?: string;
          isVisible?: boolean;
          isVerifiedPurchase?: boolean;
          createdAt?: Date;
        }
      | null;

    if (review) {
      const [product, customer, orderItem, reviewMedia] = await Promise.all([
        (await ProductModel.findById(review.productId)
          .select("productName slug")
          .lean()
          .exec()) as
          | {
              _id: unknown;
              productName?: string;
              slug?: string;
            }
          | null,
        (await UserModel.findById(review.customerId)
          .select("fullName email")
          .lean()
          .exec()) as
          | {
              _id: unknown;
              fullName?: string;
              email?: string;
            }
          | null,
        review.orderItemId
          ? ((await OrderItemModel.findById(review.orderItemId)
              .select("productNameSnapshot")
              .lean()
              .exec()) as { productNameSnapshot?: string } | null)
          : null,
        (await ReviewMediaModel.find({ reviewId: selectedReviewId })
          .lean()
          .exec()) as Array<{
          _id: unknown;
          assetId?: unknown;
        }>,
      ]);

      const assetIds = reviewMedia
        .map((item) => String(item.assetId ?? ""))
        .filter((assetId) => Types.ObjectId.isValid(assetId));
      const assets = assetIds.length
        ? ((await MediaAssetModel.find({
            _id: { $in: assetIds.map((assetId) => new Types.ObjectId(assetId)) },
          })
            .select("url")
            .lean()
            .exec()) as Array<{ _id: unknown; url?: string }>)
        : [];
      const assetMap = new Map(
        assets.map((asset) => [String(asset._id), asset.url ?? ""]),
      );

      selectedReview = {
        id: String(review._id),
        productId: String(review.productId ?? ""),
        productName:
          typeof product?.productName === "string" ? product.productName : "Product",
        productSlug:
          typeof product?.slug === "string" && product.slug.trim() ? product.slug : null,
        customerName:
          typeof customer?.fullName === "string" && customer.fullName.trim()
            ? customer.fullName
            : "Customer",
        customerEmail:
          typeof customer?.email === "string" && customer.email.trim()
            ? customer.email
            : null,
        rating: Number(review.rating ?? 0),
        title:
          typeof review.title === "string" && review.title.trim() ? review.title : null,
        comment:
          typeof review.comment === "string" && review.comment.trim() ? review.comment : null,
        isVisible: Boolean(review.isVisible),
        isVerifiedPurchase: Boolean(review.isVerifiedPurchase),
        createdAt: review.createdAt ?? null,
        orderItemProduct:
          orderItem &&
          typeof orderItem.productNameSnapshot === "string" &&
          orderItem.productNameSnapshot.trim()
            ? orderItem.productNameSnapshot
            : null,
        media: reviewMedia
          .map((item) => ({
            id: String(item._id),
            url: assetMap.get(String(item.assetId ?? "")) ?? "",
          }))
          .filter((item) => item.url),
      };
    }
  }

  const currentHref = buildHref("/dashboard/sales/reviews", resolvedSearchParams, {});

  return (
    <AdminPage>
      <AdminPageHeader
        title="Reviews"
        description="Moderate customer reviews, inspect attached media, and keep visible storefront feedback staff-managed from a dedicated sales module."
        meta={<AdminBadge label={`${total} matched`} tone="sky" />}
      />

      <SalesTabs currentPath="/dashboard/sales/reviews" />

      <AdminActionNotice searchParams={resolvedSearchParams} />

      <AdminSummaryStrip
        columns={4}
        items={[
          { label: "Visible", value: metrics[0].toLocaleString("en"), hint: "Currently published reviews" },
          { label: "Hidden", value: metrics[1].toLocaleString("en"), hint: "Staff-hidden reviews" },
          { label: "Verified", value: metrics[2].toLocaleString("en"), hint: "Verified purchase reviews" },
          { label: "5-star", value: metrics[3].toLocaleString("en"), hint: "Highest rated reviews" },
        ]}
      />

      <AdminToolbar>
        <form action="/dashboard/sales/reviews" className="space-y-3" method="get">
          <AdminFilterGrid className="xl:grid-cols-[1.35fr_0.8fr_0.8fr_0.8fr]">
            <AdminField
              defaultValue={query}
              label="Search"
              name="q"
              placeholder="Product, customer, title, comment"
            />
            <AdminSelect
              defaultValue={visibility}
              label="Visibility"
              name="visibility"
              options={[
                { value: "", label: "All states" },
                { value: "visible", label: "Visible only" },
                { value: "hidden", label: "Hidden only" },
              ]}
            />
            <AdminSelect
              defaultValue={rating}
              label="Rating"
              name="rating"
              options={[
                { value: "", label: "All ratings" },
                { value: "5", label: "5 stars" },
                { value: "4", label: "4 stars" },
                { value: "3", label: "3 stars" },
                { value: "2", label: "2 stars" },
                { value: "1", label: "1 star" },
              ]}
            />
            <AdminSelect
              defaultValue={sort}
              label="Sort"
              name="sort"
              options={[
                { value: "newest", label: "Newest first" },
                { value: "oldest", label: "Oldest first" },
                { value: "rating_desc", label: "Highest rating" },
                { value: "rating_asc", label: "Lowest rating" },
              ]}
            />
          </AdminFilterGrid>
          <div className="flex flex-wrap gap-3">
            <input name="page" type="hidden" value="1" />
            <AdminActionButton>Apply filters</AdminActionButton>
            <AdminLinkButton href="/dashboard/sales/reviews">Reset</AdminLinkButton>
          </div>
        </form>
      </AdminToolbar>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_420px]">
        <AdminPanel>
          <AdminSectionHeader
            title="Review queue"
            description="Select a review to inspect its media, product context, and current storefront visibility."
          />
          <form action={bulkReviewAction} className="mt-4 space-y-4">
            <input name="returnTo" type="hidden" value={currentHref} />

            <AdminReviewsGrid
              bulkActions={[
                { label: "Show selected", tone: "emerald", value: "show" },
                { label: "Hide selected", tone: "amber", value: "hide" },
              ]}
              rows={reviews.map((review) => ({
                id: String(review._id),
                href: buildHref("/dashboard/sales/reviews", resolvedSearchParams, {
                  reviewId: String(review._id),
                }),
                title: review.title ?? "Untitled review",
                commentLabel: review.comment ?? "No review comment",
                productName:
                  productMap.get(String(review.productId ?? ""))?.productName ?? "Product",
                productSlug:
                  productMap.get(String(review.productId ?? ""))?.slug
                    ? `/${productMap.get(String(review.productId ?? ""))?.slug}`
                    : "No slug",
                customerName:
                  customerMap.get(String(review.customerId ?? ""))?.fullName ?? "Customer",
                customerEmail:
                  customerMap.get(String(review.customerId ?? ""))?.email ?? "No email",
                visibilityLabel: review.isVisible ? "VISIBLE" : "HIDDEN",
                isVisible: Boolean(review.isVisible),
                isVerifiedPurchase: Boolean(review.isVerifiedPurchase),
                ratingLabel: `${Number(review.rating ?? 0)} / 5`,
                createdAtLabel: formatDateTime(review.createdAt ?? null),
              }))}
              selectionHint="Bulk review actions only change storefront visibility. Destructive batch delete is intentionally disabled."
              selectionInputName="selectedIds"
              selectionLabel="reviews"
            />

            <AdminPagination
              hrefBuilder={(nextPage) =>
                buildHref("/dashboard/sales/reviews", resolvedSearchParams, { page: nextPage })
              }
              page={page}
              totalPages={totalPages}
            />
          </form>
        </AdminPanel>

        <div className="space-y-4">
          {selectedReview ? (
            <>
              <AdminPanel>
                <AdminSectionHeader
                  title={selectedReview.productName}
                  description={`${selectedReview.customerName} / ${formatDateTime(selectedReview.createdAt)}`}
                  actions={
                    <AdminLinkButton href={`/dashboard/catalog/products/${selectedReview.productId}`}>
                      View product
                    </AdminLinkButton>
                  }
                />
                <div className="mt-4 grid gap-3">
                  <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Review state</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <AdminBadge
                        label={selectedReview.isVisible ? "VISIBLE" : "HIDDEN"}
                        tone={getTone(selectedReview.isVisible)}
                      />
                      {selectedReview.isVerifiedPurchase ? (
                        <AdminBadge label="VERIFIED PURCHASE" tone="sky" />
                      ) : null}
                      <AdminBadge label={`${selectedReview.rating}/5`} tone="amber" />
                    </div>
                  </div>
                  <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Review content</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      {selectedReview.title ?? "Untitled review"}
                    </p>
                    <p className="mt-2 text-sm text-slate-700">
                      {selectedReview.comment ?? "No comment"}
                    </p>
                  </div>
                  <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Context</p>
                    <p className="mt-2 text-sm text-slate-700">
                      {selectedReview.productSlug ? `/${selectedReview.productSlug}` : "No slug"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {selectedReview.customerEmail ?? "No customer email"}
                    </p>
                    {selectedReview.orderItemProduct ? (
                      <p className="mt-1 text-xs text-slate-500">
                        Order item: {selectedReview.orderItemProduct}
                      </p>
                    ) : null}
                  </div>
                </div>
              </AdminPanel>

              <AdminPanel>
                <AdminSectionHeader title="Review media" />
                <div className="mt-4 space-y-3">
                  {selectedReview.media.length > 0 ? (
                    selectedReview.media.map((item) => (
                      <div
                        className="overflow-hidden rounded-[1rem] border border-stone-200 bg-white"
                        key={item.id}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          alt="Review media"
                          className="h-48 w-full bg-stone-100 object-cover"
                          src={item.url}
                        />
                      </div>
                    ))
                  ) : (
                    <AdminEmptyState
                      title="No review media"
                      body="Attached review media will appear here when customers upload it."
                    />
                  )}
                </div>
              </AdminPanel>

              <AdminPanel>
                <AdminSectionHeader title="Update review" />
                <form action={updateReviewAction} className="mt-4 space-y-4">
                  <input name="reviewId" type="hidden" value={selectedReview.id} />
                  <input
                    name="returnTo"
                    type="hidden"
                    value={buildHref("/dashboard/sales/reviews", resolvedSearchParams, {
                      reviewId: selectedReview.id,
                    })}
                  />
                  <AdminField
                    defaultValue={selectedReview.title ?? ""}
                    label="Title"
                    name="title"
                    placeholder="Review title"
                  />
                  <AdminTextarea
                    defaultValue={selectedReview.comment ?? ""}
                    label="Comment"
                    name="comment"
                    rows={4}
                  />
                  <AdminCheckbox
                    defaultChecked={selectedReview.isVisible}
                    label="Visible on storefront"
                    name="isVisible"
                  />
                  <AdminActionButton tone="sky">Save review update</AdminActionButton>
                </form>
              </AdminPanel>
            </>
          ) : (
            <AdminPanel>
              <AdminSectionHeader
                title="Review detail"
                description="Select a review from the queue to inspect its media and update storefront visibility."
              />
            </AdminPanel>
          )}
        </div>
      </div>
    </AdminPage>
  );
}
