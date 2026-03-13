"use server";

import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { adminCrudServices } from "@/modules/admin/admin-crud.services";
import { OrderModel } from "@/modules/orders/orders.models";
import {
  failAction,
  finishAction,
  getReturnTo,
  readCheckbox,
  readIds,
  readOptionalText,
  readText,
} from "@/app/dashboard/action-helpers";

export async function saveUserAction(formData: FormData) {
  await requirePermission(PERMISSIONS.usersManage);
  const returnTo = getReturnTo(formData, "/dashboard/users");
  const userId = readText(formData, "userId");
  const payload = {
    fullName: readText(formData, "fullName"),
    email: readOptionalText(formData, "email"),
    phone: readOptionalText(formData, "phone"),
    role: readText(formData, "role"),
    isActive: readCheckbox(formData, "isActive"),
    emailVerified: readCheckbox(formData, "emailVerified"),
    password: readOptionalText(formData, "password"),
  };

  if (userId) {
    await adminCrudServices.users.update(userId, payload);
  } else {
    await adminCrudServices.users.create(payload);
  }

  finishAction(returnTo, ["/dashboard/users"]);
}

export async function toggleUserActiveAction(formData: FormData) {
  await requirePermission(PERMISSIONS.usersManage);
  const returnTo = getReturnTo(formData, "/dashboard/users");

  await adminCrudServices.users.update(readText(formData, "userId"), {
    isActive: readText(formData, "isActive") === "true",
  });

  finishAction(returnTo, ["/dashboard/users"]);
}

export async function deleteUserAction(formData: FormData) {
  const currentUser = await requirePermission(PERMISSIONS.usersManage);
  const returnTo = getReturnTo(formData, "/dashboard/users");
  const userId = readText(formData, "userId");

  if (userId === currentUser.id) {
    finishAction(returnTo, ["/dashboard/users"]);
  }

  const orderCount = await OrderModel.countDocuments({ customerId: userId }).exec();

  if (orderCount > 0) {
    await adminCrudServices.users.update(userId, { isActive: false });
  } else {
    await adminCrudServices.users.remove(userId);
  }

  finishAction(returnTo, ["/dashboard/users"]);
}

export async function bulkUserAction(formData: FormData) {
  await requirePermission(PERMISSIONS.usersManage);
  const returnTo = getReturnTo(formData, "/dashboard/users");
  const bulkAction = readText(formData, "bulkAction");
  const userIds = Array.from(
    new Set(readIds(formData, "selectedIds").filter(Boolean)),
  );

  if (userIds.length === 0) {
    failAction(returnTo, "Select at least one user first.", "amber");
  }

  if (bulkAction !== "activate" && bulkAction !== "deactivate") {
    failAction(returnTo, "Unsupported user bulk action.", "amber");
  }

  await Promise.all(
    userIds.map((userId) =>
      adminCrudServices.users.update(userId, {
        isActive: bulkAction === "activate",
      }),
    ),
  );

  finishAction(returnTo, ["/dashboard/users"]);
}
