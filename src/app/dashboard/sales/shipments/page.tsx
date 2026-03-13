import { Types } from "mongoose";

import {
  addShipmentPackageAction,
  addShipmentTrackingEventAction,
  updateShipmentAction,
} from "@/app/dashboard/sales/actions";
import { SalesTabs } from "@/components/admin/module-tabs";
import { AdminShipmentsGrid } from "@/components/admin/shipments-grid";
import {
  AdminActionButton,
  AdminBadge,
  AdminEmptyState,
  AdminField,
  AdminFilterGrid,
  AdminFormGrid,
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
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import {
  buildHref,
  clampPage,
  readNumberParam,
  readSearchParam,
  type AdminSearchParams,
} from "@/modules/admin/admin-query";
import { MediaAssetModel } from "@/modules/core/core.models";
import { OrderItemModel, OrderModel } from "@/modules/orders/orders.models";
import { ShippingMethodModel } from "@/modules/pricing/pricing.models";
import {
  ShipmentItemModel,
  ShipmentModel,
  ShipmentPackageModel,
  ShipmentTrackingEventModel,
} from "@/modules/shipments/shipments.models";

type ShipmentsPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

const PAGE_LIMIT = 15;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getTone(value: string) {
  if (["DELIVERED"].includes(value)) {
    return "emerald" as const;
  }

  if (["PACKING", "OUT_FOR_DELIVERY", "IN_TRANSIT", "PICKED_UP"].includes(value)) {
    return "amber" as const;
  }

  if (["RETURNED"].includes(value)) {
    return "rose" as const;
  }

  return "slate" as const;
}

export default async function DashboardSalesShipmentsPage({
  searchParams,
}: ShipmentsPageProps) {
  await requirePermission(PERMISSIONS.ordersView);
  const resolvedSearchParams = await searchParams;

  await connectToDatabase();

  const query = readSearchParam(resolvedSearchParams, "q").trim();
  const status = readSearchParam(resolvedSearchParams, "status");
  const sort = readSearchParam(resolvedSearchParams, "sort") || "newest";
  const selectedShipmentId = readSearchParam(resolvedSearchParams, "shipmentId");
  const requestedPage = readNumberParam(resolvedSearchParams, "page", 1);

  const filter: Record<string, unknown> = {};

  if (status) {
    filter.status = status;
  }

  if (query) {
    const regex = new RegExp(escapeRegex(query), "i");
    const matchingOrders = (await OrderModel.find({
      $or: [{ orderNo: regex }, { customerNameSnapshot: regex }, { customerEmailSnapshot: regex }],
    })
      .select("_id")
      .lean()
      .exec()) as Array<{ _id: unknown }>;

    filter.$or = [
      { courierName: regex },
      { trackingNo: regex },
      ...(matchingOrders.length > 0
        ? [{ orderId: { $in: matchingOrders.map((order) => order._id) } }]
        : []),
    ];
  }

  const [metrics, total] = await Promise.all([
    Promise.all([
      ShipmentModel.countDocuments({ status: "PENDING" }).exec(),
      ShipmentModel.countDocuments({ status: { $in: ["PACKING", "OUT_FOR_DELIVERY"] } }).exec(),
      ShipmentModel.countDocuments({ status: "DELIVERED" }).exec(),
      ShipmentModel.countDocuments({ status: "RETURNED" }).exec(),
    ]),
    ShipmentModel.countDocuments(filter).exec(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const page = clampPage(requestedPage, totalPages);
  const sortMap: Record<string, Record<string, 1 | -1>> = {
    newest: { shippedAt: -1, _id: -1 },
    oldest: { shippedAt: 1, _id: 1 },
    delivered_desc: { deliveredAt: -1, _id: -1 },
  };

  const shipments = (await ShipmentModel.find(filter)
    .sort(sortMap[sort] ?? sortMap.newest)
    .skip((page - 1) * PAGE_LIMIT)
    .limit(PAGE_LIMIT)
    .lean()
    .exec()) as Array<{
    _id: unknown;
    orderId?: unknown;
    shippingMethodId?: unknown;
    courierName?: string;
    trackingNo?: string;
    status?: string;
    shippedAt?: Date;
    deliveredAt?: Date;
    shippingFee?: number;
  }>;

  const orderIds = shipments.map((shipment) => String(shipment.orderId ?? "")).filter(Boolean);
  const methodIds = shipments
    .map((shipment) => String(shipment.shippingMethodId ?? ""))
    .filter(Boolean);

  const [orders, shippingMethods] = await Promise.all([
    orderIds.length > 0
      ? ((await OrderModel.find({ _id: { $in: orderIds } })
          .select("orderNo customerNameSnapshot currencyCode")
          .lean()
          .exec()) as Array<{
          _id: unknown;
          orderNo?: string;
          customerNameSnapshot?: string;
          currencyCode?: string;
        }>)
      : [],
    methodIds.length > 0
      ? ((await ShippingMethodModel.find({ _id: { $in: methodIds } })
          .select("methodName code")
          .lean()
          .exec()) as Array<{
          _id: unknown;
          methodName?: string;
          code?: string;
        }>)
      : [],
  ]);

  const orderMap = new Map(
    orders.map((order) => [
      String(order._id),
      {
        orderNo: typeof order.orderNo === "string" ? order.orderNo : "Order",
        customerName:
          typeof order.customerNameSnapshot === "string" && order.customerNameSnapshot.trim()
            ? order.customerNameSnapshot
            : "Customer",
        currencyCode: typeof order.currencyCode === "string" ? order.currencyCode : "MMK",
      },
    ]),
  );
  const methodMap = new Map(
    shippingMethods.map((method) => [
      String(method._id),
      typeof method.methodName === "string"
        ? `${method.methodName}${method.code ? ` (${method.code})` : ""}`
        : "Shipping method",
    ]),
  );

  let selectedShipment: null | {
    id: string;
    orderId: string;
    orderNo: string;
    customerName: string;
    currencyCode: string;
    shippingMethodName: string;
    courierName: string | null;
    trackingNo: string | null;
    status: string;
    shippedAt: Date | null;
    deliveredAt: Date | null;
    shippingFee: number;
    note: string | null;
    items: Array<{
      id: string;
      productName: string;
      sku: string | null;
      quantity: number;
    }>;
    packages: Array<{
      id: string;
      packageNo: string | null;
      weightGrams: number | null;
      dimensions: string | null;
      labelUrl: string | null;
    }>;
    trackingEvents: Array<{
      id: string;
      status: string;
      location: string | null;
      message: string | null;
      eventAt: Date | null;
    }>;
  } = null;

  if (Types.ObjectId.isValid(selectedShipmentId)) {
    const shipment = (await ShipmentModel.findById(selectedShipmentId)
      .lean()
      .exec()) as
      | {
          _id: unknown;
          orderId?: unknown;
          shippingMethodId?: unknown;
          courierName?: string;
          trackingNo?: string;
          status?: string;
          shippedAt?: Date;
          deliveredAt?: Date;
          shippingFee?: number;
          note?: string;
        }
      | null;

    if (shipment) {
      const [order, shippingMethod, shipmentItems, packages, trackingEvents] = await Promise.all([
        (await OrderModel.findById(shipment.orderId)
          .select("orderNo customerNameSnapshot currencyCode")
          .lean()
          .exec()) as
          | {
              _id: unknown;
              orderNo?: string;
              customerNameSnapshot?: string;
              currencyCode?: string;
            }
          | null,
        shipment.shippingMethodId
          ? ((await ShippingMethodModel.findById(shipment.shippingMethodId)
              .select("methodName code")
              .lean()
              .exec()) as { methodName?: string; code?: string } | null)
          : null,
        (await ShipmentItemModel.find({ shipmentId: selectedShipmentId })
          .sort({ _id: 1 })
          .lean()
          .exec()) as Array<{
          _id: unknown;
          orderItemId?: unknown;
          quantity?: number;
        }>,
        (await ShipmentPackageModel.find({ shipmentId: selectedShipmentId })
          .sort({ packageNo: 1, _id: 1 })
          .lean()
          .exec()) as Array<{
          _id: unknown;
          packageNo?: string;
          weightGrams?: number;
          lengthCm?: number;
          widthCm?: number;
          heightCm?: number;
          labelAssetId?: unknown;
        }>,
        (await ShipmentTrackingEventModel.find({ shipmentId: selectedShipmentId })
          .sort({ eventAt: -1 })
          .lean()
          .exec()) as Array<{
          _id: unknown;
          status?: string;
          location?: string;
          message?: string;
          eventAt?: Date;
        }>,
      ]);

      const orderItems = shipmentItems.length
        ? ((await OrderItemModel.find({
            _id: {
              $in: shipmentItems.map((item) => item.orderItemId).filter(Boolean),
            },
          })
            .select("productNameSnapshot skuSnapshot")
            .lean()
            .exec()) as Array<{
            _id: unknown;
            productNameSnapshot?: string;
            skuSnapshot?: string;
          }>)
        : [];
      const orderItemMap = new Map(
        orderItems.map((item) => [
          String(item._id),
          {
            productName:
              typeof item.productNameSnapshot === "string" ? item.productNameSnapshot : "Product",
            sku:
              typeof item.skuSnapshot === "string" && item.skuSnapshot.trim()
                ? item.skuSnapshot
                : null,
          },
        ]),
      );
      const labelAssetIds = packages
        .map((item) => String(item.labelAssetId ?? ""))
        .filter((value) => Types.ObjectId.isValid(value));
      const labelAssets = labelAssetIds.length
        ? ((await MediaAssetModel.find({
            _id: { $in: labelAssetIds.map((assetId) => new Types.ObjectId(assetId)) },
          })
            .select("url")
            .lean()
            .exec()) as Array<{ _id: unknown; url?: string }>)
        : [];
      const labelAssetMap = new Map(
        labelAssets.map((asset) => [String(asset._id), asset.url ?? ""]),
      );

      selectedShipment = {
        id: String(shipment._id),
        orderId: String(shipment.orderId ?? ""),
        orderNo: typeof order?.orderNo === "string" ? order.orderNo : "Order",
        customerName:
          typeof order?.customerNameSnapshot === "string" && order.customerNameSnapshot.trim()
            ? order.customerNameSnapshot
            : "Customer",
        currencyCode: typeof order?.currencyCode === "string" ? order.currencyCode : "MMK",
        shippingMethodName:
          typeof shippingMethod?.methodName === "string"
            ? `${shippingMethod.methodName}${shippingMethod.code ? ` (${shippingMethod.code})` : ""}`
            : "Shipping method",
        courierName:
          typeof shipment.courierName === "string" && shipment.courierName.trim()
            ? shipment.courierName
            : null,
        trackingNo:
          typeof shipment.trackingNo === "string" && shipment.trackingNo.trim()
            ? shipment.trackingNo
            : null,
        status: typeof shipment.status === "string" ? shipment.status : "PENDING",
        shippedAt: shipment.shippedAt ?? null,
        deliveredAt: shipment.deliveredAt ?? null,
        shippingFee: Number(shipment.shippingFee ?? 0),
        note:
          typeof shipment.note === "string" && shipment.note.trim() ? shipment.note : null,
        items: shipmentItems.map((item) => ({
          id: String(item._id),
          productName:
            orderItemMap.get(String(item.orderItemId ?? ""))?.productName ?? "Product",
          sku: orderItemMap.get(String(item.orderItemId ?? ""))?.sku ?? null,
          quantity: Number(item.quantity ?? 0),
        })),
        packages: packages.map((item) => ({
          id: String(item._id),
          packageNo:
            typeof item.packageNo === "string" && item.packageNo.trim() ? item.packageNo : null,
          weightGrams: item.weightGrams === undefined ? null : Number(item.weightGrams),
          dimensions:
            [item.lengthCm, item.widthCm, item.heightCm]
              .map((value) => (value === undefined ? null : Number(value)))
              .every((value) => value === null)
              ? null
              : `${Number(item.lengthCm ?? 0)} x ${Number(item.widthCm ?? 0)} x ${Number(item.heightCm ?? 0)} cm`,
          labelUrl: labelAssetMap.get(String(item.labelAssetId ?? "")) ?? null,
        })),
        trackingEvents: trackingEvents.map((event) => ({
          id: String(event._id),
          status: typeof event.status === "string" ? event.status : "IN_TRANSIT",
          location:
            typeof event.location === "string" && event.location.trim() ? event.location : null,
          message:
            typeof event.message === "string" && event.message.trim() ? event.message : null,
          eventAt: event.eventAt ?? null,
        })),
      };
    }
  }

  return (
    <AdminPage>
      <AdminPageHeader
        title="Shipments"
        description="Track fulfillment records, packages, and carrier events from a dedicated shipment workspace."
        meta={<AdminBadge label={`${total} matched`} tone="sky" />}
      />

      <SalesTabs currentPath="/dashboard/sales/shipments" />

      <AdminSummaryStrip
        columns={4}
        items={[
          { label: "Pending", value: metrics[0].toLocaleString("en"), hint: "Waiting to move" },
          { label: "In progress", value: metrics[1].toLocaleString("en"), hint: "Packing or out for delivery" },
          { label: "Delivered", value: metrics[2].toLocaleString("en"), hint: "Completed deliveries" },
          { label: "Returned", value: metrics[3].toLocaleString("en"), hint: "Returned shipments" },
        ]}
      />

      <AdminToolbar>
        <form action="/dashboard/sales/shipments" className="space-y-3" method="get">
          <AdminFilterGrid className="xl:grid-cols-[1.3fr_0.9fr_0.8fr]">
            <AdminField
              defaultValue={query}
              label="Search"
              name="q"
              placeholder="Order no, customer, courier, tracking no"
            />
            <AdminSelect
              defaultValue={status}
              label="Status"
              name="status"
              options={[
                { value: "", label: "All statuses" },
                { value: "PENDING", label: "PENDING" },
                { value: "PACKING", label: "PACKING" },
                { value: "OUT_FOR_DELIVERY", label: "OUT_FOR_DELIVERY" },
                { value: "DELIVERED", label: "DELIVERED" },
                { value: "RETURNED", label: "RETURNED" },
              ]}
            />
            <AdminSelect
              defaultValue={sort}
              label="Sort"
              name="sort"
              options={[
                { value: "newest", label: "Newest first" },
                { value: "oldest", label: "Oldest first" },
                { value: "delivered_desc", label: "Latest delivered" },
              ]}
            />
          </AdminFilterGrid>
          <div className="flex flex-wrap gap-3">
            <input name="page" type="hidden" value="1" />
            <AdminActionButton>Apply filters</AdminActionButton>
            <AdminLinkButton href="/dashboard/sales/shipments">Reset</AdminLinkButton>
          </div>
        </form>
      </AdminToolbar>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_420px]">
        <AdminPanel>
          <AdminSectionHeader
            title="Shipment queue"
            description="Select a shipment to inspect the packed order items, packages, and tracking timeline."
          />
          <div className="mt-4 space-y-4">
            <AdminShipmentsGrid
              rows={shipments.map((shipment) => ({
                id: String(shipment._id),
                href: buildHref("/dashboard/sales/shipments", resolvedSearchParams, {
                  shipmentId: String(shipment._id),
                }),
                shipmentLabel: shipment.trackingNo ?? shipment.courierName ?? "Shipment",
                shippedAtLabel: `Shipped ${formatDateTime(shipment.shippedAt ?? null)}`,
                orderNo: orderMap.get(String(shipment.orderId ?? ""))?.orderNo ?? "Order",
                customerName:
                  orderMap.get(String(shipment.orderId ?? ""))?.customerName ?? "Customer",
                methodLabel:
                  methodMap.get(String(shipment.shippingMethodId ?? "")) ?? "Shipping method",
                status: typeof shipment.status === "string" ? shipment.status : "PENDING",
                feeLabel: formatCurrency(
                  Number(shipment.shippingFee ?? 0),
                  orderMap.get(String(shipment.orderId ?? ""))?.currencyCode ?? "MMK",
                ),
              }))}
              selectionHint="Selection is available here for future carrier workflows. Destructive bulk actions are intentionally disabled on shipments."
              selectionInputName="selectedIds"
              selectionLabel="shipments"
            />

            <AdminPagination
              hrefBuilder={(nextPage) =>
                buildHref("/dashboard/sales/shipments", resolvedSearchParams, { page: nextPage })
              }
              page={page}
              totalPages={totalPages}
            />
          </div>
        </AdminPanel>

        <div className="space-y-4">
          {selectedShipment ? (
            <>
              <AdminPanel>
                <AdminSectionHeader
                  title={selectedShipment.orderNo}
                  description={`${selectedShipment.customerName} / ${selectedShipment.shippingMethodName}`}
                  actions={
                    <AdminLinkButton href={`/dashboard/orders/${selectedShipment.orderId}`}>
                      View order
                    </AdminLinkButton>
                  }
                />
                <div className="mt-4 grid gap-3">
                  <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Shipment state</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <AdminBadge label={selectedShipment.status} tone={getTone(selectedShipment.status)} />
                      {selectedShipment.trackingNo ? <AdminBadge label={selectedShipment.trackingNo} tone="sky" /> : null}
                    </div>
                  </div>
                  <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Courier</p>
                    <p className="mt-2 text-sm text-slate-700">
                      {selectedShipment.courierName ?? "No courier saved"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Shipped {formatDateTime(selectedShipment.shippedAt)} / Delivered {formatDateTime(selectedShipment.deliveredAt)}
                    </p>
                  </div>
                  <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Shipping fee</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      {formatCurrency(selectedShipment.shippingFee, selectedShipment.currencyCode)}
                    </p>
                  </div>
                  {selectedShipment.note ? (
                    <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Shipment note</p>
                      <p className="mt-2 text-sm text-slate-700">{selectedShipment.note}</p>
                    </div>
                  ) : null}
                </div>
              </AdminPanel>

              <AdminPanel>
                <AdminSectionHeader title="Shipment items" />
                <div className="mt-4 space-y-3">
                  {selectedShipment.items.length > 0 ? (
                    selectedShipment.items.map((item) => (
                      <div
                        className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3"
                        key={item.id}
                      >
                        <p className="font-medium text-slate-900">{item.productName}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {(item.sku ?? "No SKU") + " / Qty " + item.quantity}
                        </p>
                      </div>
                    ))
                  ) : (
                    <AdminEmptyState title="No shipment items" body="This shipment does not have item rows yet." />
                  )}
                </div>
              </AdminPanel>

              <AdminPanel>
                <AdminSectionHeader title="Packages" />
                <div className="mt-4 space-y-3">
                  {selectedShipment.packages.length > 0 ? (
                    selectedShipment.packages.map((item) => (
                      <div
                        className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3"
                        key={item.id}
                      >
                        <p className="font-medium text-slate-900">{item.packageNo ?? "Package"}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.weightGrams !== null ? `${item.weightGrams}g` : "No weight"} / {item.dimensions ?? "No dimensions"}
                        </p>
                        {item.labelUrl ? (
                          <div className="mt-3 overflow-hidden rounded-xl border border-stone-200 bg-white">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              alt={item.packageNo ? `${item.packageNo} label` : "Shipment label"}
                              className="h-28 w-full object-cover"
                              src={item.labelUrl}
                            />
                          </div>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <AdminEmptyState
                      title="No packages yet"
                      body="Add package records to capture packed dimensions and weight."
                    />
                  )}
                </div>

                <form
                  action={addShipmentPackageAction}
                  className="mt-4 space-y-4"
                  encType="multipart/form-data"
                >
                  <input name="shipmentId" type="hidden" value={selectedShipment.id} />
                  <input
                    name="returnTo"
                    type="hidden"
                    value={buildHref("/dashboard/sales/shipments", resolvedSearchParams, {
                      shipmentId: selectedShipment.id,
                    })}
                  />
                  <AdminFormGrid columns={2}>
                    <AdminField label="Package no" name="packageNo" placeholder="PKG-001" />
                    <AdminField label="Weight grams" name="weightGrams" type="number" />
                    <AdminField label="Length cm" name="lengthCm" type="number" />
                    <AdminField label="Width cm" name="widthCm" type="number" />
                    <AdminField label="Height cm" name="heightCm" type="number" />
                  </AdminFormGrid>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-900" htmlFor="labelFile">
                      Label image
                    </label>
                    <input
                      accept="image/*"
                      className="block w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-slate-900"
                      id="labelFile"
                      name="labelFile"
                      type="file"
                    />
                  </div>
                  <AdminActionButton tone="sky">Add package</AdminActionButton>
                </form>
              </AdminPanel>

              <AdminPanel>
                <AdminSectionHeader title="Tracking events" />
                <div className="mt-4 space-y-3">
                  {selectedShipment.trackingEvents.length > 0 ? (
                    selectedShipment.trackingEvents.map((event) => (
                      <div
                        className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3"
                        key={event.id}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-900">{event.status}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {event.location ?? "No location"} / {formatDateTime(event.eventAt)}
                            </p>
                          </div>
                          <AdminBadge label={event.status} tone={getTone(event.status)} />
                        </div>
                        {event.message ? (
                          <p className="mt-2 text-sm text-slate-700">{event.message}</p>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <AdminEmptyState
                      title="No tracking events"
                      body="Add carrier events to build the shipment timeline."
                    />
                  )}
                </div>

                <form action={addShipmentTrackingEventAction} className="mt-4 space-y-4">
                  <input name="shipmentId" type="hidden" value={selectedShipment.id} />
                  <input
                    name="returnTo"
                    type="hidden"
                    value={buildHref("/dashboard/sales/shipments", resolvedSearchParams, {
                      shipmentId: selectedShipment.id,
                    })}
                  />
                  <AdminSelect
                    label="Event status"
                    name="status"
                    options={[
                      { value: "PICKED_UP", label: "PICKED_UP" },
                      { value: "IN_TRANSIT", label: "IN_TRANSIT" },
                      { value: "OUT_FOR_DELIVERY", label: "OUT_FOR_DELIVERY" },
                      { value: "DELIVERED", label: "DELIVERED" },
                    ]}
                  />
                  <AdminField label="Location" name="location" placeholder="Yangon hub" />
                  <AdminTextarea label="Message" name="message" rows={3} />
                  <AdminActionButton tone="sky">Add tracking event</AdminActionButton>
                </form>
              </AdminPanel>

              <AdminPanel>
                <AdminSectionHeader title="Update shipment" />
                <form action={updateShipmentAction} className="mt-4 space-y-4">
                  <input name="shipmentId" type="hidden" value={selectedShipment.id} />
                  <input
                    name="returnTo"
                    type="hidden"
                    value={buildHref("/dashboard/sales/shipments", resolvedSearchParams, {
                      shipmentId: selectedShipment.id,
                    })}
                  />
                  <AdminSelect
                    defaultValue={selectedShipment.status}
                    label="Status"
                    name="status"
                    options={[
                      { value: "PENDING", label: "PENDING" },
                      { value: "PACKING", label: "PACKING" },
                      { value: "OUT_FOR_DELIVERY", label: "OUT_FOR_DELIVERY" },
                      { value: "DELIVERED", label: "DELIVERED" },
                      { value: "RETURNED", label: "RETURNED" },
                    ]}
                  />
                  <AdminField
                    defaultValue={selectedShipment.courierName ?? ""}
                    label="Courier"
                    name="courierName"
                    placeholder="DHL / rider team / local courier"
                  />
                  <AdminField
                    defaultValue={selectedShipment.trackingNo ?? ""}
                    label="Tracking no"
                    name="trackingNo"
                    placeholder="Tracking number"
                  />
                  <AdminTextarea
                    defaultValue={selectedShipment.note ?? ""}
                    label="Note"
                    name="note"
                    rows={3}
                  />
                  <AdminActionButton tone="sky">Save shipment update</AdminActionButton>
                </form>
              </AdminPanel>
            </>
          ) : (
            <AdminPanel>
              <AdminSectionHeader
                title="Shipment detail"
                description="Select a shipment from the queue to review its items, packages, and tracking timeline."
              />
            </AdminPanel>
          )}
        </div>
      </div>
    </AdminPage>
  );
}
