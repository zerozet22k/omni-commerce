import { NextResponse, type NextRequest } from "next/server";

import { requireAuthenticatedApiUser } from "@/lib/auth/api-access";
import { createErrorResponse } from "@/lib/http/error-response";
import { ordersService } from "@/modules/orders/orders.service";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthenticatedApiUser(request);
    const orders = await ordersService.listOrdersByCustomer(user.id);

    return NextResponse.json({
      items: orders,
      meta: {
        total: orders.length,
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
