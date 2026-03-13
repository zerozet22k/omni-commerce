import { notFound } from "next/navigation";
import { Types } from "mongoose";

import { AdminOrderDetailView } from "@/components/admin/order-detail-view";
import { AdminEditorPage } from "@/components/admin/editor-page";
import { SalesTabs } from "@/components/admin/module-tabs";
import { requireOperationsUser } from "@/lib/auth/guards";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";
import { CountryModel, StateRegionModel } from "@/modules/core/core.models";
import { AddressModel } from "@/modules/customers/customers.models";
import { OrderModel } from "@/modules/orders/orders.models";

type OrderDetailPageProps = {
  params: Promise<{
    orderId: string;
  }>;
  searchParams: Promise<AdminSearchParams>;
};

function buildAddressLines(
  address:
    | {
        label?: string;
        receiverName?: string;
        receiverPhone?: string;
        addressLine1?: string;
        addressLine2?: string;
        township?: string;
        city?: string;
        stateRegionId?: unknown;
        countryId?: unknown;
        postalCode?: string;
        landmark?: string;
      }
    | null
    | undefined,
  countryMap: Map<string, string>,
  stateMap: Map<string, string>,
) {
  if (!address) {
    return [];
  }

  const locality = [
    typeof address.township === "string" ? address.township : "",
    typeof address.city === "string" ? address.city : "",
    stateMap.get(String(address.stateRegionId ?? "")) ?? "",
    countryMap.get(String(address.countryId ?? "")) ?? "",
    typeof address.postalCode === "string" ? address.postalCode : "",
  ].filter(Boolean);

  return [
    typeof address.label === "string" ? address.label : "",
    typeof address.receiverName === "string" ? address.receiverName : "",
    typeof address.receiverPhone === "string" ? address.receiverPhone : "",
    typeof address.addressLine1 === "string" ? address.addressLine1 : "",
    typeof address.addressLine2 === "string" ? address.addressLine2 : "",
    typeof address.landmark === "string" ? address.landmark : "",
    locality.join(", "),
  ].filter(Boolean);
}

export default async function DashboardOrderDetailPage({
  params,
  searchParams,
}: OrderDetailPageProps) {
  await requireOperationsUser();
  const { orderId } = await params;
  const resolvedSearchParams = await searchParams;
  const workspace = await adminWorkspaceService.getOrdersWorkspace({ orderId });
  const order = workspace.selectedOrder;

  if (!order) {
    notFound();
  }

  const orderRecord = (await OrderModel.findById(orderId)
    .select("shippingAddressId billingAddressId")
    .lean()
    .exec()) as
    | {
        shippingAddressId?: unknown;
        billingAddressId?: unknown;
      }
    | null;

  if (!orderRecord) {
    notFound();
  }

  const addressIds = [
    String(orderRecord.shippingAddressId ?? ""),
    String(orderRecord.billingAddressId ?? ""),
  ].filter((value) => Types.ObjectId.isValid(value));
  const addressRows =
    addressIds.length > 0
      ? ((await AddressModel.find({
          _id: { $in: addressIds.map((value) => new Types.ObjectId(value)) },
        })
          .lean()
          .exec()) as Array<{
          _id: unknown;
          label?: string;
          receiverName?: string;
          receiverPhone?: string;
          addressLine1?: string;
          addressLine2?: string;
          township?: string;
          city?: string;
          stateRegionId?: unknown;
          countryId?: unknown;
          postalCode?: string;
          landmark?: string;
        }>)
      : [];
  const countryIds = addressRows
    .map((address) => String(address.countryId ?? ""))
    .filter((value) => Types.ObjectId.isValid(value));
  const stateIds = addressRows
    .map((address) => String(address.stateRegionId ?? ""))
    .filter((value) => Types.ObjectId.isValid(value));
  const [countryRows, stateRows] = await Promise.all([
    countryIds.length > 0
      ? CountryModel.find({
          _id: { $in: countryIds.map((value) => new Types.ObjectId(value)) },
        })
          .select("countryName")
          .lean()
          .exec()
      : [],
    stateIds.length > 0
      ? StateRegionModel.find({
          _id: { $in: stateIds.map((value) => new Types.ObjectId(value)) },
        })
          .select("stateRegionName")
          .lean()
          .exec()
      : [],
  ]);
  const countryMap = new Map(
    (countryRows as Array<{ _id: unknown; countryName?: string }>).map((row) => [
      String(row._id),
      row.countryName ?? "Country",
    ]),
  );
  const stateMap = new Map(
    (stateRows as Array<{ _id: unknown; stateRegionName?: string }>).map((row) => [
      String(row._id),
      row.stateRegionName ?? "State / Region",
    ]),
  );
  const addressMap = new Map(addressRows.map((row) => [String(row._id), row]));

  return (
    <AdminEditorPage
      backHref="/dashboard/orders"
      backLabel="Back to orders"
      description="Use the dedicated order record screen for payment confirmation, delivery updates, cancellation, notes, and operational review."
      main={
        <AdminOrderDetailView
          billingAddressLines={buildAddressLines(
            addressMap.get(String(orderRecord.billingAddressId ?? "")),
            countryMap,
            stateMap,
          )}
          order={order}
          paymentMethods={workspace.paymentMethods}
          returnTo={`/dashboard/orders/${orderId}`}
          shippingAddressLines={buildAddressLines(
            addressMap.get(String(orderRecord.shippingAddressId ?? "")),
            countryMap,
            stateMap,
          )}
        />
      }
      searchParams={resolvedSearchParams}
      tabs={<SalesTabs currentPath={`/dashboard/orders/${orderId}`} />}
      title={`Order ${order.orderNo}`}
    />
  );
}
