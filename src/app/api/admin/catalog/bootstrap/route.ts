import { NextResponse, type NextRequest } from "next/server";

import { requireAdminCrudAccess } from "@/lib/auth/api-access";
import { createErrorResponse } from "@/lib/http/error-response";
import { setupService } from "@/modules/setup/setup.service";

export async function POST(request: NextRequest) {
  try {
    await requireAdminCrudAccess(request, "write");
    const setup = await setupService.ensureBaseCommerceSetup();

    return NextResponse.json({ setup });
  } catch (error) {
    return createErrorResponse(error);
  }
}
