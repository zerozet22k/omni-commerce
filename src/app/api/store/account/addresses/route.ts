import { NextResponse, type NextRequest } from "next/server";

import { requireAuthenticatedApiUser } from "@/lib/auth/api-access";
import { createErrorResponse } from "@/lib/http/error-response";
import { coreService } from "@/modules/core/core.service";
import { storefrontAccountService } from "@/modules/storefront/storefront-account.service";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedApiUser(request);
    const body = (await request.json()) as {
      label?: string;
      receiverName?: string;
      receiverPhone?: string;
      countryId?: string;
      stateRegionId?: string;
      city?: string;
      township?: string;
      postalCode?: string;
      addressLine1?: string;
      addressLine2?: string;
      landmark?: string;
      isDefaultShipping?: boolean;
      isDefaultBilling?: boolean;
    };

    const receiverName = body.receiverName?.trim();
    const receiverPhone = body.receiverPhone?.trim();
    const countryId = body.countryId?.trim();
    const stateRegionId = body.stateRegionId?.trim();
    const addressLine1 = body.addressLine1?.trim();

    if (!receiverName || !receiverPhone || !countryId || !addressLine1) {
      return NextResponse.json(
        {
          message:
            "Receiver name, receiver phone, country, and address line 1 are required.",
        },
        { status: 400 },
      );
    }

    const countries = await coreService.listCountries();

    if (!countries.some((country) => country.id === countryId)) {
      return NextResponse.json(
        { message: "Selected country was not found." },
        { status: 404 },
      );
    }

    if (stateRegionId) {
      const stateRegions = await coreService.listStateRegions(countryId);

      if (!stateRegions.some((stateRegion) => stateRegion.id === stateRegionId)) {
        return NextResponse.json(
          {
            message:
              "Selected state / region does not belong to the chosen country.",
          },
          { status: 400 },
        );
      }
    }

    const address = await storefrontAccountService.createAddress({
      userId: user.id,
      label: body.label?.trim() || undefined,
      receiverName,
      receiverPhone,
      countryId,
      stateRegionId: stateRegionId || undefined,
      city: body.city?.trim() || undefined,
      township: body.township?.trim() || undefined,
      postalCode: body.postalCode?.trim() || undefined,
      addressLine1,
      addressLine2: body.addressLine2?.trim() || undefined,
      landmark: body.landmark?.trim() || undefined,
      isDefaultShipping: Boolean(body.isDefaultShipping),
      isDefaultBilling: Boolean(body.isDefaultBilling),
    });

    return NextResponse.json({ address }, { status: 201 });
  } catch (error) {
    return createErrorResponse(error);
  }
}
