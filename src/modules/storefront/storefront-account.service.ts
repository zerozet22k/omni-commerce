import { connectToDatabase } from "@/lib/db/mongodb";
import { assertObjectId } from "@/lib/utils/object-id";
import { AddressModel } from "@/modules/customers/customers.models";
import { customersService } from "@/modules/customers/customers.service";
import { coreService } from "@/modules/core/core.service";
import { OrderItemModel, OrderModel } from "@/modules/orders/orders.models";
import { PaymentMethodModel, PaymentModel } from "@/modules/payments/payments.models";
import { ShipmentModel } from "@/modules/shipments/shipments.models";
import { storefrontCatalogService } from "@/modules/storefront/storefront-catalog.service";
import type {
  StorefrontAccountAddress,
  StorefrontAccountOrderDetail,
  StorefrontAccountOrderSummary,
  StorefrontAccountOverview,
} from "@/modules/storefront/storefront.types";
import {
  storefrontNullableString,
  storefrontNumber,
  storefrontToId,
} from "@/modules/storefront/storefront-helpers";
import { CustomerProfileModel } from "@/modules/users/customer-profile.model";
import { UserModel } from "@/modules/users/user.model";

export class StorefrontAccountService {
  async getOverview(userId: string): Promise<StorefrontAccountOverview> {
    assertObjectId(userId, "user id");
    await connectToDatabase();

    const [profile, user, addressCount, recentOrders, wishlistCount] = await Promise.all([
      CustomerProfileModel.findOne({ userId }).lean().exec() as Promise<
        | {
            totalSpent?: number;
            totalOrders?: number;
            loyaltyPoints?: number;
          }
        | null
      >,
      UserModel.findById(userId)
        .select("fullName email phone createdAt")
        .lean()
        .exec() as Promise<
        | {
            fullName?: string;
            email?: string;
            phone?: string;
            createdAt?: Date | null;
          }
        | null
      >,
      AddressModel.countDocuments({ userId }).exec(),
      OrderModel.find({ customerId: userId })
        .sort({ orderDate: -1 })
        .limit(5)
        .lean()
        .exec() as Promise<
        Array<{
          _id: unknown;
          orderNo?: string;
          orderDate?: Date | null;
          status?: string;
          paymentStatus?: string;
          fulfillmentStatus?: string;
          grandTotal?: number;
          currencyCode?: string;
        }>
      >,
      storefrontCatalogService.getWishlistCount(userId),
    ]);

    return {
      profile: {
        fullName: storefrontNullableString(user?.fullName) ?? "Customer",
        email: storefrontNullableString(user?.email),
        phone: storefrontNullableString(user?.phone),
        joinedAt: user?.createdAt ?? null,
      },
      totals: {
        totalOrders: storefrontNumber(profile?.totalOrders),
        totalSpent: storefrontNumber(profile?.totalSpent),
        loyaltyPoints: storefrontNumber(profile?.loyaltyPoints),
        savedAddresses: addressCount,
        wishlistItems: wishlistCount,
      },
      recentOrders: recentOrders.map((order) => ({
        id: storefrontToId(order._id),
        orderNo: storefrontNullableString(order.orderNo) ?? "Order",
        orderDate: order.orderDate ?? null,
        status: storefrontNullableString(order.status) ?? "PENDING",
        paymentStatus: storefrontNullableString(order.paymentStatus) ?? "UNPAID",
        fulfillmentStatus:
          storefrontNullableString(order.fulfillmentStatus) ?? "UNFULFILLED",
        grandTotal: storefrontNumber(order.grandTotal),
        currencyCode: storefrontNullableString(order.currencyCode) ?? "MMK",
      })),
    };
  }

  async listOrders(userId: string): Promise<StorefrontAccountOrderSummary[]> {
    assertObjectId(userId, "user id");
    await connectToDatabase();
    const orders = (await OrderModel.find({ customerId: userId })
      .sort({ orderDate: -1 })
      .lean()
      .exec()) as Array<{
      _id: unknown;
      orderNo?: string;
      orderDate?: Date | null;
      status?: string;
      paymentStatus?: string;
      fulfillmentStatus?: string;
      grandTotal?: number;
      currencyCode?: string;
    }>;
    const orderIds = orders.map((order) => order._id);
    const itemCounts = orderIds.length
      ? ((await OrderItemModel.aggregate<{ _id: unknown; count: number }>([
          {
            $match: {
              orderId: { $in: orderIds },
            },
          },
          {
            $group: {
              _id: "$orderId",
              count: { $sum: "$quantity" },
            },
          },
        ]).exec()) as Array<{ _id: unknown; count: number }>)
      : [];
    const itemCountMap = new Map(
      itemCounts.map((item) => [storefrontToId(item._id), storefrontNumber(item.count)]),
    );

    return orders.map((order) => ({
      id: storefrontToId(order._id),
      orderNo: storefrontNullableString(order.orderNo) ?? "Order",
      orderDate: order.orderDate ?? null,
      status: storefrontNullableString(order.status) ?? "PENDING",
      paymentStatus: storefrontNullableString(order.paymentStatus) ?? "UNPAID",
      fulfillmentStatus:
        storefrontNullableString(order.fulfillmentStatus) ?? "UNFULFILLED",
      grandTotal: storefrontNumber(order.grandTotal),
      currencyCode: storefrontNullableString(order.currencyCode) ?? "MMK",
      itemCount: itemCountMap.get(storefrontToId(order._id)) ?? 0,
    }));
  }

  async getOrderDetail(
    userId: string,
    orderId: string,
  ): Promise<StorefrontAccountOrderDetail | null> {
    assertObjectId(userId, "user id");
    assertObjectId(orderId, "order id");
    await connectToDatabase();

    const order = (await OrderModel.findOne({
      _id: orderId,
      customerId: userId,
    })
      .lean()
      .exec()) as
      | {
          _id: unknown;
          orderNo?: string;
          orderDate?: Date | null;
          status?: string;
          paymentStatus?: string;
          fulfillmentStatus?: string;
          grandTotal?: number;
          currencyCode?: string;
          subtotal?: number;
          shippingFee?: number;
          taxTotal?: number;
          giftCardTotal?: number;
          note?: string;
          shippingAddressId?: unknown;
        }
      | null;

    if (!order) {
      return null;
    }

    const [items, payments, shipments, address] = await Promise.all([
      OrderItemModel.find({ orderId })
        .sort({ _id: 1 })
        .lean()
        .exec() as Promise<
        Array<{
          _id: unknown;
          productNameSnapshot?: string;
          productSlugSnapshot?: string;
          variantLabelSnapshot?: string;
          skuSnapshot?: string;
          thumbnailUrlSnapshot?: string;
          quantity?: number;
          unitPrice?: number;
          lineTotal?: number;
        }>
      >,
      PaymentModel.find({ orderId })
        .sort({ paymentDate: -1 })
        .lean()
        .exec() as Promise<
        Array<{
          _id: unknown;
          paymentMethodId?: unknown;
          status?: string;
          amount?: number;
          paymentDate?: Date | null;
        }>
      >,
      ShipmentModel.find({ orderId })
        .sort({ shippedAt: -1 })
        .lean()
        .exec() as Promise<
        Array<{
          _id: unknown;
          status?: string;
          courierName?: string;
          trackingNo?: string;
          shippedAt?: Date | null;
          deliveredAt?: Date | null;
        }>
      >,
      order.shippingAddressId
        ? (AddressModel.findById(order.shippingAddressId)
            .lean()
            .exec() as Promise<
            | {
                receiverName?: string;
                receiverPhone?: string;
                addressLine1?: string;
                addressLine2?: string;
                city?: string;
                township?: string;
                postalCode?: string;
                countryId?: unknown;
                stateRegionId?: unknown;
              }
            | null
          >)
        : Promise.resolve(null),
    ]);

    const [paymentMethods, countries, states] = await Promise.all([
      payments.length > 0
        ? (PaymentMethodModel.find({
            _id: { $in: payments.map((payment) => payment.paymentMethodId).filter(Boolean) },
          })
            .select("methodName")
            .lean()
            .exec() as Promise<Array<{ _id: unknown; methodName?: string }>>)
        : Promise.resolve([]),
      coreService.listCountries(),
      coreService.listStateRegions(),
    ]);
    const paymentMethodMap = new Map(
      paymentMethods.map((method) => [
        storefrontToId(method._id),
        storefrontNullableString(method.methodName) ?? "Payment",
      ]),
    );
    const countryMap = new Map(countries.map((country) => [country.id, country.countryName]));
    const stateMap = new Map(states.map((state) => [state.id, state.stateRegionName]));

    return {
      id: storefrontToId(order._id),
      orderNo: storefrontNullableString(order.orderNo) ?? "Order",
      orderDate: order.orderDate ?? null,
      status: storefrontNullableString(order.status) ?? "PENDING",
      paymentStatus: storefrontNullableString(order.paymentStatus) ?? "UNPAID",
      fulfillmentStatus:
        storefrontNullableString(order.fulfillmentStatus) ?? "UNFULFILLED",
      grandTotal: storefrontNumber(order.grandTotal),
      currencyCode: storefrontNullableString(order.currencyCode) ?? "MMK",
      itemCount: items.reduce(
        (sum, item) => sum + storefrontNumber(item.quantity),
        0,
      ),
      subtotal: storefrontNumber(order.subtotal),
      shippingFee: storefrontNumber(order.shippingFee),
      taxTotal: storefrontNumber(order.taxTotal),
      giftCardTotal: storefrontNumber(order.giftCardTotal),
      note: storefrontNullableString(order.note),
      shippingAddress: address
        ? {
            receiverName: storefrontNullableString(address.receiverName),
            receiverPhone: storefrontNullableString(address.receiverPhone),
            addressLine1: storefrontNullableString(address.addressLine1),
            addressLine2: storefrontNullableString(address.addressLine2),
            city: storefrontNullableString(address.city),
            township: storefrontNullableString(address.township),
            postalCode: storefrontNullableString(address.postalCode),
            countryName: countryMap.get(storefrontToId(address.countryId)) ?? null,
            stateRegionName: stateMap.get(storefrontToId(address.stateRegionId)) ?? null,
          }
        : null,
      items: items.map((item) => ({
        id: storefrontToId(item._id),
        productName: storefrontNullableString(item.productNameSnapshot) ?? "Product",
        productSlug: storefrontNullableString(item.productSlugSnapshot),
        variantLabel: storefrontNullableString(item.variantLabelSnapshot),
        sku: storefrontNullableString(item.skuSnapshot),
        thumbnailAssetId: storefrontToId(item.thumbnailUrlSnapshot) || null,
        quantity: storefrontNumber(item.quantity),
        unitPrice: storefrontNumber(item.unitPrice),
        lineTotal: storefrontNumber(item.lineTotal),
      })),
      payments: payments.map((payment) => ({
        id: storefrontToId(payment._id),
        methodName:
          paymentMethodMap.get(storefrontToId(payment.paymentMethodId)) ?? "Payment",
        status: storefrontNullableString(payment.status) ?? "SUBMITTED",
        amount: storefrontNumber(payment.amount),
        paymentDate: payment.paymentDate ?? null,
      })),
      shipments: shipments.map((shipment) => ({
        id: storefrontToId(shipment._id),
        status: storefrontNullableString(shipment.status) ?? "PENDING",
        courierName: storefrontNullableString(shipment.courierName),
        trackingNo: storefrontNullableString(shipment.trackingNo),
        shippedAt: shipment.shippedAt ?? null,
        deliveredAt: shipment.deliveredAt ?? null,
      })),
    };
  }

  async listAddresses(userId: string): Promise<StorefrontAccountAddress[]> {
    assertObjectId(userId, "user id");
    await connectToDatabase();
    const [addresses, countries, states] = await Promise.all([
      AddressModel.find({ userId })
        .sort({ createdAt: -1 })
        .lean()
        .exec() as Promise<
        Array<{
          _id: unknown;
          label?: string;
          receiverName?: string;
          receiverPhone?: string;
          countryId?: unknown;
          stateRegionId?: unknown;
          city?: string;
          township?: string;
          postalCode?: string;
          addressLine1?: string;
          addressLine2?: string;
          landmark?: string;
          isDefaultShipping?: boolean;
          isDefaultBilling?: boolean;
        }>
      >,
      coreService.listCountries(),
      coreService.listStateRegions(),
    ]);
    const countryMap = new Map(countries.map((country) => [country.id, country.countryName]));
    const stateMap = new Map(states.map((state) => [state.id, state.stateRegionName]));

    return addresses.map((address) => ({
      id: storefrontToId(address._id),
      label: storefrontNullableString(address.label),
      receiverName: storefrontNullableString(address.receiverName) ?? "Receiver",
      receiverPhone: storefrontNullableString(address.receiverPhone) ?? "",
      addressLine1: storefrontNullableString(address.addressLine1) ?? "",
      addressLine2: storefrontNullableString(address.addressLine2),
      city: storefrontNullableString(address.city),
      township: storefrontNullableString(address.township),
      postalCode: storefrontNullableString(address.postalCode),
      landmark: storefrontNullableString(address.landmark),
      countryId: storefrontToId(address.countryId),
      countryName: countryMap.get(storefrontToId(address.countryId)) ?? null,
      stateRegionId: storefrontToId(address.stateRegionId) || null,
      stateRegionName: stateMap.get(storefrontToId(address.stateRegionId)) ?? null,
      isDefaultShipping: Boolean(address.isDefaultShipping),
      isDefaultBilling: Boolean(address.isDefaultBilling),
    }));
  }

  async createAddress(input: {
    userId: string;
    label?: string;
    receiverName: string;
    receiverPhone: string;
    countryId: string;
    stateRegionId?: string;
    city?: string;
    township?: string;
    postalCode?: string;
    addressLine1: string;
    addressLine2?: string;
    landmark?: string;
    isDefaultShipping?: boolean;
    isDefaultBilling?: boolean;
  }) {
    return customersService.createAddress(input);
  }
}

export const storefrontAccountService = new StorefrontAccountService();
