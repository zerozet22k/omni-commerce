import { ModelCrudRepository } from "@/lib/crud/model-crud.repository";
import {
  CouponUsageLogModel,
  GiftCardModel,
  GiftCardTransactionModel,
  PromotionCustomerGroupModel,
  PromotionModel,
  PromotionProductModel,
  PromotionVariantModel,
  ShippingMethodModel,
  ShippingRateRuleModel,
  ShippingZoneCountryModel,
  ShippingZoneModel,
  TaxRateModel,
} from "@/modules/pricing/pricing.models";

export const pricingRepositories = {
  taxRates: new ModelCrudRepository(TaxRateModel),
  shippingZones: new ModelCrudRepository(ShippingZoneModel),
  shippingZoneCountries: new ModelCrudRepository(ShippingZoneCountryModel),
  shippingMethods: new ModelCrudRepository(ShippingMethodModel),
  shippingRateRules: new ModelCrudRepository(ShippingRateRuleModel),
  promotions: new ModelCrudRepository(PromotionModel),
  promotionProducts: new ModelCrudRepository(PromotionProductModel),
  promotionVariants: new ModelCrudRepository(PromotionVariantModel),
  promotionCustomerGroups: new ModelCrudRepository(PromotionCustomerGroupModel),
  couponUsageLogs: new ModelCrudRepository(CouponUsageLogModel),
  giftCards: new ModelCrudRepository(GiftCardModel),
  giftCardTransactions: new ModelCrudRepository(GiftCardTransactionModel),
};
