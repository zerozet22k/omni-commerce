"use server";

import { requireCustomerUser } from "@/lib/auth/guards";
import { AppError } from "@/lib/errors/app-error";
import { ReturnItemModel, ReturnModel } from "@/modules/engagement/engagement.models";
import { OrderItemModel, OrderModel } from "@/modules/orders/orders.models";
import {
  finishAction,
  getReturnTo,
  readOptionalText,
  readText,
} from "@/app/dashboard/action-helpers";

const ACCOUNT_REVALIDATE_PATHS = [
  "/dashboard",
  "/dashboard/account",
  "/dashboard/account/orders",
  "/dashboard/account/returns",
  "/dashboard/orders",
  "/dashboard/orders/returns",
] as const;

function generateReturnNo() {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate(),
  ).padStart(2, "0")}`;
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `RET-${stamp}-${suffix}`;
}

export async function requestReturnAction(formData: FormData) {
  const user = await requireCustomerUser();
  const orderId = readText(formData, "orderId");
  const returnTo = getReturnTo(formData, "/dashboard/account/returns");
  const order = await OrderModel.findOne({
    _id: orderId,
    customerId: user.id,
  })
    .select("status")
    .exec();

  if (!order) {
    throw new AppError("The selected order was not found in your account.", 404);
  }

  if (["CANCELLED", "REFUNDED"].includes(order.status)) {
    throw new AppError("Returns cannot be requested for cancelled or refunded orders.", 400);
  }

  const orderItems = await OrderItemModel.find({ orderId })
    .select("quantity")
    .lean()
    .exec();

  const requestedItems = orderItems
    .map((item) => {
      const orderItemId = String(item._id);
      const quantity = Number(String(formData.get(`quantity:${orderItemId}`) ?? "0"));

      if (!Number.isFinite(quantity) || quantity <= 0) {
        return null;
      }

      if (quantity > Number(item.quantity ?? 0)) {
        throw new AppError("Return quantity cannot exceed the ordered quantity.", 400);
      }

      return {
        orderItemId,
        quantity,
      };
    })
    .filter(
      (item): item is {
        orderItemId: string;
        quantity: number;
      } => item !== null,
    );

  if (requestedItems.length === 0) {
    throw new AppError("Select at least one order line with a return quantity.", 400);
  }

  const createdReturn = await ReturnModel.create({
    orderId,
    customerId: user.id,
    returnNo: generateReturnNo(),
    status: "REQUESTED",
    reason: readOptionalText(formData, "reason"),
    note: readOptionalText(formData, "note"),
    requestedAt: new Date(),
  });

  await ReturnItemModel.insertMany(
    requestedItems.map((item) => ({
      returnId: createdReturn.id,
      orderItemId: item.orderItemId,
      quantity: item.quantity,
      reason: readOptionalText(formData, "reason"),
      conditionNote: readOptionalText(formData, "note"),
    })),
  );

  const [pathname, queryString = ""] = returnTo.split("?");
  const nextParams = new URLSearchParams(queryString);
  nextParams.set("returnId", String(createdReturn.id));
  nextParams.set("orderId", orderId);

  finishAction(`${pathname}?${nextParams.toString()}`, [...ACCOUNT_REVALIDATE_PATHS]);
}
