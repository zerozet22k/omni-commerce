import { NextResponse, type NextRequest } from "next/server";

import { requireAuthenticatedApiUser } from "@/lib/auth/api-access";
import { createErrorResponse } from "@/lib/http/error-response";
import { storefrontCatalogService } from "@/modules/storefront/storefront-catalog.service";
import { storefrontService } from "@/modules/storefront/storefront.service";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedApiUser(request);
    const body = (await request.json()) as {
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
      note?: string;
      shippingMethodId?: string;
      paymentMethodId?: string;
      giftCardCode?: string;
    };

    const receiverName = body.receiverName?.trim();
    const receiverPhone = body.receiverPhone?.trim();
    const addressLine1 = body.addressLine1?.trim();
    const countryId = body.countryId?.trim();
    const stateRegionId = body.stateRegionId?.trim();
    const shippingMethodId = body.shippingMethodId?.trim();

    if (!receiverName || !receiverPhone || !addressLine1 || !countryId) {
      return NextResponse.json(
        {
          message:
            "Receiver name, receiver phone, country, and address line 1 are required.",
        },
        { status: 400 },
      );
    }

    if (shippingMethodId) {
      const availableMethods = await storefrontCatalogService.listShippingMethods(
        countryId,
      );

      if (!availableMethods.some((method) => method.id === shippingMethodId)) {
        return NextResponse.json(
          {
            message:
              "Selected delivery method is not available for the chosen country.",
          },
          { status: 400 },
        );
      }
    }

    const result = await storefrontService.checkout(user, {
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
      note: body.note?.trim() || undefined,
      shippingMethodId: shippingMethodId || undefined,
      paymentMethodId: body.paymentMethodId?.trim() || undefined,
      giftCardCode: body.giftCardCode?.trim() || undefined,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return createErrorResponse(error);
  }
}
