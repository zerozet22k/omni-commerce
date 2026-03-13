import { ModelCrudService } from "@/lib/crud/model-crud.service";
import { pricingRepositories } from "@/modules/pricing/pricing.repository";

export const pricingCrudServices = {
  taxRates: new ModelCrudService("Tax rate", pricingRepositories.taxRates, {
    priority: 1,
    rateName: 1,
  }),
  shippingZones: new ModelCrudService(
    "Shipping zone",
    pricingRepositories.shippingZones,
    { zoneName: 1 },
  ),
  shippingZoneCountries: new ModelCrudService(
    "Shipping zone country",
    pricingRepositories.shippingZoneCountries,
  ),
  shippingMethods: new ModelCrudService(
    "Shipping method",
    pricingRepositories.shippingMethods,
    { methodName: 1 },
  ),
  shippingRateRules: new ModelCrudService(
    "Shipping rate rule",
    pricingRepositories.shippingRateRules,
  ),
  promotions: new ModelCrudService(
    "Promotion",
    pricingRepositories.promotions,
    { startsAt: -1, name: 1 },
  ),
  promotionProducts: new ModelCrudService(
    "Promotion product",
    pricingRepositories.promotionProducts,
  ),
  promotionVariants: new ModelCrudService(
    "Promotion variant",
    pricingRepositories.promotionVariants,
  ),
  promotionCustomerGroups: new ModelCrudService(
    "Promotion customer group",
    pricingRepositories.promotionCustomerGroups,
  ),
  couponUsageLogs: new ModelCrudService(
    "Coupon usage log",
    pricingRepositories.couponUsageLogs,
    { usedAt: -1 },
  ),
  giftCards: new ModelCrudService("Gift card", pricingRepositories.giftCards, {
    createdAt: -1,
  }),
  giftCardTransactions: new ModelCrudService(
    "Gift card transaction",
    pricingRepositories.giftCardTransactions,
    { createdAt: -1 },
  ),
};
