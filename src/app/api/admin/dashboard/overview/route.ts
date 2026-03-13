import { NextResponse, type NextRequest } from "next/server";

import { requireAdminCrudAccess } from "@/lib/auth/api-access";
import { createErrorResponse } from "@/lib/http/error-response";
import { dashboardService } from "@/modules/dashboard/dashboard.service";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAdminCrudAccess(request, "read");
    const overview = await dashboardService.getOverviewData(user);

    return NextResponse.json({ overview });
  } catch (error) {
    return createErrorResponse(error);
  }
}
