import { ModelCrudRepository } from "@/lib/crud/model-crud.repository";
import {
  CartItemModel,
  CartModel,
  StockReservationModel,
} from "@/modules/cart/cart.models";
import {
  BrandModel,
  CategoryModel,
  OptionTypeModel,
  OptionValueModel,
  ProductModel,
  ProductTypeModel,
  ProductVariantModel,
  TaxClassModel,
} from "@/modules/catalog/catalog.models";
import {
  CollectionModel,
  ProductBadgeMapModel,
  ProductBadgeModel,
  ProductBundleItemModel,
  ProductCollectionMapModel,
  ProductFaqModel,
  ProductImageModel,
  ProductOptionTypeModel,
  ProductRelationModel,
  ProductSpecificationModel,
  ProductTagMapModel,
  ProductTagModel,
  VariantImageModel,
  VariantOptionValueModel,
} from "@/modules/catalog/catalog-extra.models";
import {
  AnalyticsEventModel,
  AuditLogModel,
  BannerModel,
  NavigationMenuItemModel,
  NavigationMenuModel,
  NotificationModel,
  PageModel,
} from "@/modules/content/content.models";
import {
  CountryModel,
  MediaAssetModel,
  StateRegionModel,
  StoreSettingsModel,
} from "@/modules/core/core.models";
import {
  AddressModel,
  CustomerGroupMemberModel,
  CustomerGroupModel,
  RecentlyViewedProductModel,
  SavedSearchModel,
  WishlistItemModel,
  WishlistModel,
} from "@/modules/customers/customers.models";
import {
  RefundModel,
  ReturnItemModel,
  ReturnModel,
  ReviewMediaModel,
  ReviewModel,
} from "@/modules/engagement/engagement.models";
import {
  CheckoutSessionModel,
  InvoiceModel,
  OrderItemModel,
  OrderModel,
  OrderNoteModel,
  OrderStatusLogModel,
} from "@/modules/orders/orders.models";
import {
  PaymentMethodModel,
  PaymentModel,
  PaymentTransactionModel,
} from "@/modules/payments/payments.models";
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
import {
  ShipmentItemModel,
  ShipmentModel,
  ShipmentPackageModel,
  ShipmentTrackingEventModel,
} from "@/modules/shipments/shipments.models";
import {
  RestockOrderItemModel,
  RestockOrderModel,
  SourcingPlatformModel,
  SourcingSourceModel,
  StockAdjustmentModel,
  VariantSourceModel,
} from "@/modules/sourcing/sourcing.models";
import { CustomerProfileModel } from "@/modules/users/customer-profile.model";
import { UserModel } from "@/modules/users/user.model";

export const adminCrudRepositories = {
  countries: new ModelCrudRepository(CountryModel),
  states_regions: new ModelCrudRepository(StateRegionModel),
  store_settings: new ModelCrudRepository(StoreSettingsModel),
  media_assets: new ModelCrudRepository(MediaAssetModel),

  categories: new ModelCrudRepository(CategoryModel),
  brands: new ModelCrudRepository(BrandModel),
  collections: new ModelCrudRepository(CollectionModel),
  product_types: new ModelCrudRepository(ProductTypeModel),
  product_tags: new ModelCrudRepository(ProductTagModel),
  product_badges: new ModelCrudRepository(ProductBadgeModel),
  tax_classes: new ModelCrudRepository(TaxClassModel),
  products: new ModelCrudRepository(ProductModel),
  product_specifications: new ModelCrudRepository(ProductSpecificationModel),
  product_faqs: new ModelCrudRepository(ProductFaqModel),
  product_tag_maps: new ModelCrudRepository(ProductTagMapModel),
  product_collection_maps: new ModelCrudRepository(ProductCollectionMapModel),
  product_badge_maps: new ModelCrudRepository(ProductBadgeMapModel),
  product_relations: new ModelCrudRepository(ProductRelationModel),
  product_images: new ModelCrudRepository(ProductImageModel),
  option_types: new ModelCrudRepository(OptionTypeModel),
  option_values: new ModelCrudRepository(OptionValueModel),
  products_option_types: new ModelCrudRepository(ProductOptionTypeModel),
  product_variants: new ModelCrudRepository(ProductVariantModel),
  variant_option_values: new ModelCrudRepository(VariantOptionValueModel),
  variant_images: new ModelCrudRepository(VariantImageModel),
  product_bundle_items: new ModelCrudRepository(ProductBundleItemModel),

  sourcing_platforms: new ModelCrudRepository(SourcingPlatformModel),
  sourcing_sources: new ModelCrudRepository(SourcingSourceModel),
  variant_sources: new ModelCrudRepository(VariantSourceModel),
  restock_orders: new ModelCrudRepository(RestockOrderModel),
  restock_order_items: new ModelCrudRepository(RestockOrderItemModel),
  stock_adjustments: new ModelCrudRepository(StockAdjustmentModel),

  users: new ModelCrudRepository(UserModel),
  customer_profiles: new ModelCrudRepository(CustomerProfileModel),
  customer_groups: new ModelCrudRepository(CustomerGroupModel),
  customer_group_members: new ModelCrudRepository(CustomerGroupMemberModel),
  addresses: new ModelCrudRepository(AddressModel),
  wishlists: new ModelCrudRepository(WishlistModel),
  wishlist_items: new ModelCrudRepository(WishlistItemModel),
  recently_viewed_products: new ModelCrudRepository(RecentlyViewedProductModel),
  saved_searches: new ModelCrudRepository(SavedSearchModel),

  carts: new ModelCrudRepository(CartModel),
  cart_items: new ModelCrudRepository(CartItemModel),
  stock_reservations: new ModelCrudRepository(StockReservationModel),
  checkout_sessions: new ModelCrudRepository(CheckoutSessionModel),

  tax_rates: new ModelCrudRepository(TaxRateModel),
  shipping_zones: new ModelCrudRepository(ShippingZoneModel),
  shipping_zone_countries: new ModelCrudRepository(ShippingZoneCountryModel),
  shipping_methods: new ModelCrudRepository(ShippingMethodModel),
  shipping_rate_rules: new ModelCrudRepository(ShippingRateRuleModel),
  promotions: new ModelCrudRepository(PromotionModel),
  promotion_products: new ModelCrudRepository(PromotionProductModel),
  promotion_variants: new ModelCrudRepository(PromotionVariantModel),
  promotion_customer_groups: new ModelCrudRepository(PromotionCustomerGroupModel),
  coupon_usage_logs: new ModelCrudRepository(CouponUsageLogModel),
  gift_cards: new ModelCrudRepository(GiftCardModel),
  gift_card_transactions: new ModelCrudRepository(GiftCardTransactionModel),

  orders: new ModelCrudRepository(OrderModel),
  order_items: new ModelCrudRepository(OrderItemModel),
  order_status_logs: new ModelCrudRepository(OrderStatusLogModel),
  order_notes: new ModelCrudRepository(OrderNoteModel),
  invoices: new ModelCrudRepository(InvoiceModel),

  payment_methods: new ModelCrudRepository(PaymentMethodModel),
  payments: new ModelCrudRepository(PaymentModel),
  payment_transactions: new ModelCrudRepository(PaymentTransactionModel),

  shipments: new ModelCrudRepository(ShipmentModel),
  shipment_items: new ModelCrudRepository(ShipmentItemModel),
  shipment_packages: new ModelCrudRepository(ShipmentPackageModel),
  shipment_tracking_events: new ModelCrudRepository(ShipmentTrackingEventModel),

  reviews: new ModelCrudRepository(ReviewModel),
  review_media: new ModelCrudRepository(ReviewMediaModel),
  returns: new ModelCrudRepository(ReturnModel),
  return_items: new ModelCrudRepository(ReturnItemModel),
  refunds: new ModelCrudRepository(RefundModel),

  pages: new ModelCrudRepository(PageModel),
  banners: new ModelCrudRepository(BannerModel),
  navigation_menus: new ModelCrudRepository(NavigationMenuModel),
  navigation_menu_items: new ModelCrudRepository(NavigationMenuItemModel),
  notifications: new ModelCrudRepository(NotificationModel),
  analytics_events: new ModelCrudRepository(AnalyticsEventModel),
  audit_logs: new ModelCrudRepository(AuditLogModel),
} as const;

export type AdminCrudResource = keyof typeof adminCrudRepositories;
