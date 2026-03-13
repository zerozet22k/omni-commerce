
```
omni-commerce
├─ eslint.config.mjs
├─ middleware.ts
├─ next.config.ts
├─ package-lock.json
├─ package.json
├─ postcss.config.mjs
├─ public
│  ├─ file.svg
│  ├─ globe.svg
│  ├─ next.svg
│  ├─ placeholders
│  │  ├─ noimg.png
│  │  ├─ store-banner.svg
│  │  ├─ store-category.svg
│  │  └─ store-product.png
│  ├─ uploads
│  │  ├─ catalog
│  │  │  └─ 2026
│  │  │     └─ 03
│  │  │        ├─ d4b8d6bbec1115138cd5f99d8a660775-jpg-720x720q80-2c2abfd6-6fcc-4fc8-9a87-24d346062952.jpg
│  │  │        ├─ icon-5c9a9730-3b23-4358-b5b1-6b109476a8a4.png
│  │  │        ├─ icon-648f9817-05d0-4836-9b00-68da8ccd6a18.png
│  │  │        └─ shoe-crop-as-is-000e1d7f-5426-4db7-93da-50c589d923ec.png
│  │  └─ reviews
│  │     └─ 2026
│  │        └─ 03
│  │           ├─ d4b8d6bbec1115138cd5f99d8a660775-jpg-720x720q80-e3cca331-3e06-477c-b73d-b30a88c0c71c.jpg
│  │           ├─ review-54f3ec14-5629-4b27-9847-51fc4b28cbac.png
│  │           ├─ review-60545dac-46d8-4c83-aedf-e870bf4c4764.png
│  │           └─ tmp-review-b7ba3f4e-4776-4b00-b27f-057e9bdad7b2.png
│  ├─ vercel.svg
│  └─ window.svg
├─ README.md
├─ scripts
│  └─ seed-demo-data.mjs
├─ src
│  ├─ app
│  │  ├─ account
│  │  │  ├─ addresses
│  │  │  │  └─ page.tsx
│  │  │  ├─ orders
│  │  │  │  ├─ page.tsx
│  │  │  │  └─ [orderId]
│  │  │  │     └─ page.tsx
│  │  │  └─ page.tsx
│  │  ├─ api
│  │  │  ├─ admin
│  │  │  │  ├─ catalog
│  │  │  │  │  ├─ bootstrap
│  │  │  │  │  │  └─ route.ts
│  │  │  │  │  ├─ categories
│  │  │  │  │  │  └─ route.ts
│  │  │  │  │  ├─ products
│  │  │  │  │  │  ├─ quick-create
│  │  │  │  │  │  │  └─ route.ts
│  │  │  │  │  │  └─ [productId]
│  │  │  │  │  │     ├─ publish
│  │  │  │  │  │     │  └─ route.ts
│  │  │  │  │  │     └─ variants
│  │  │  │  │  │        └─ route.ts
│  │  │  │  │  └─ target-search
│  │  │  │  │     └─ route.ts
│  │  │  │  ├─ dashboard
│  │  │  │  │  └─ overview
│  │  │  │  │     └─ route.ts
│  │  │  │  ├─ lookup
│  │  │  │  │  └─ route.ts
│  │  │  │  ├─ resources
│  │  │  │  └─ [resource]
│  │  │  │     └─ [id]
│  │  │  ├─ assets
│  │  │  │  └─ [assetId]
│  │  │  │     └─ route.ts
│  │  │  ├─ auth
│  │  │  │  ├─ login
│  │  │  │  │  └─ route.ts
│  │  │  │  ├─ logout
│  │  │  │  │  └─ route.ts
│  │  │  │  ├─ register
│  │  │  │  │  └─ route.ts
│  │  │  │  └─ session
│  │  │  │     └─ route.ts
│  │  │  └─ store
│  │  │     ├─ account
│  │  │     │  └─ addresses
│  │  │     │     └─ route.ts
│  │  │     ├─ cart
│  │  │     │  ├─ items
│  │  │     │  │  ├─ route.ts
│  │  │     │  │  └─ [variantId]
│  │  │     │  │     └─ route.ts
│  │  │     │  └─ route.ts
│  │  │     ├─ checkout
│  │  │     │  └─ route.ts
│  │  │     ├─ gift-cards
│  │  │     │  └─ preview
│  │  │     │     └─ route.ts
│  │  │     ├─ orders
│  │  │     │  └─ route.ts
│  │  │     ├─ products
│  │  │     │  ├─ route.ts
│  │  │     │  └─ [slug]
│  │  │     │     └─ route.ts
│  │  │     ├─ reviews
│  │  │     │  └─ route.ts
│  │  │     ├─ shipping-methods
│  │  │     │  └─ route.ts
│  │  │     └─ wishlist
│  │  │        └─ route.ts
│  │  ├─ cart
│  │  │  └─ page.tsx
│  │  ├─ checkout
│  │  │  └─ page.tsx
│  │  ├─ dashboard
│  │  │  ├─ account
│  │  │  │  ├─ actions.ts
│  │  │  │  ├─ orders
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ page.tsx
│  │  │  │  └─ returns
│  │  │  │     └─ page.tsx
│  │  │  ├─ action-helpers.ts
│  │  │  ├─ catalog
│  │  │  │  ├─ actions.ts
│  │  │  │  ├─ brands
│  │  │  │  │  ├─ new
│  │  │  │  │  │  └─ page.tsx
│  │  │  │  │  ├─ page.tsx
│  │  │  │  │  └─ [brandId]
│  │  │  │  │     └─ page.tsx
│  │  │  │  ├─ categories
│  │  │  │  │  ├─ new
│  │  │  │  │  │  └─ page.tsx
│  │  │  │  │  ├─ page.tsx
│  │  │  │  │  └─ [categoryId]
│  │  │  │  │     └─ page.tsx
│  │  │  │  ├─ collections
│  │  │  │  │  ├─ new
│  │  │  │  │  │  └─ page.tsx
│  │  │  │  │  ├─ page.tsx
│  │  │  │  │  └─ [collectionId]
│  │  │  │  │     └─ page.tsx
│  │  │  │  ├─ option-types
│  │  │  │  │  ├─ new
│  │  │  │  │  │  └─ page.tsx
│  │  │  │  │  ├─ page.tsx
│  │  │  │  │  └─ [optionTypeId]
│  │  │  │  │     └─ page.tsx
│  │  │  │  ├─ page.tsx
│  │  │  │  ├─ product-badges
│  │  │  │  │  ├─ new
│  │  │  │  │  │  └─ page.tsx
│  │  │  │  │  ├─ page.tsx
│  │  │  │  │  └─ [productBadgeId]
│  │  │  │  │     └─ page.tsx
│  │  │  │  ├─ product-tags
│  │  │  │  │  ├─ new
│  │  │  │  │  │  └─ page.tsx
│  │  │  │  │  ├─ page.tsx
│  │  │  │  │  └─ [productTagId]
│  │  │  │  │     └─ page.tsx
│  │  │  │  ├─ product-types
│  │  │  │  │  ├─ new
│  │  │  │  │  │  └─ page.tsx
│  │  │  │  │  ├─ page.tsx
│  │  │  │  │  └─ [productTypeId]
│  │  │  │  │     └─ page.tsx
│  │  │  │  ├─ products
│  │  │  │  │  ├─ new
│  │  │  │  │  │  └─ page.tsx
│  │  │  │  │  ├─ page.tsx
│  │  │  │  │  └─ [productId]
│  │  │  │  │     ├─ bundles
│  │  │  │  │     │  └─ page.tsx
│  │  │  │  │     ├─ faq
│  │  │  │  │     │  └─ page.tsx
│  │  │  │  │     ├─ images
│  │  │  │  │     │  └─ page.tsx
│  │  │  │  │     ├─ page.tsx
│  │  │  │  │     ├─ relations
│  │  │  │  │     │  └─ page.tsx
│  │  │  │  │     ├─ seo
│  │  │  │  │     │  └─ page.tsx
│  │  │  │  │     ├─ specifications
│  │  │  │  │     │  └─ page.tsx
│  │  │  │  │     └─ variants
│  │  │  │  │        └─ page.tsx
│  │  │  │  └─ promotions
│  │  │  │     ├─ new
│  │  │  │     │  └─ page.tsx
│  │  │  │     ├─ page.tsx
│  │  │  │     └─ [promotionId]
│  │  │  │        └─ page.tsx
│  │  │  ├─ content
│  │  │  │  ├─ actions.ts
│  │  │  │  ├─ banners
│  │  │  │  │  ├─ new
│  │  │  │  │  │  └─ page.tsx
│  │  │  │  │  ├─ page.tsx
│  │  │  │  │  └─ [bannerId]
│  │  │  │  │     └─ page.tsx
│  │  │  │  ├─ navigation-menus
│  │  │  │  │  ├─ new
│  │  │  │  │  │  └─ page.tsx
│  │  │  │  │  ├─ page.tsx
│  │  │  │  │  └─ [menuId]
│  │  │  │  │     └─ page.tsx
│  │  │  │  ├─ page.tsx
│  │  │  │  └─ pages
│  │  │  │     ├─ new
│  │  │  │     │  └─ page.tsx
│  │  │  │     ├─ page.tsx
│  │  │  │     └─ [pageId]
│  │  │  │        └─ page.tsx
│  │  │  ├─ data
│  │  │  │  ├─ resource
│  │  │  │  │  └─ [resource]
│  │  │  │  └─ [group]
│  │  │  ├─ inventory
│  │  │  │  ├─ actions.ts
│  │  │  │  ├─ page.tsx
│  │  │  │  └─ restocks
│  │  │  │     └─ page.tsx
│  │  │  ├─ layout.tsx
│  │  │  ├─ notifications
│  │  │  │  └─ page.tsx
│  │  │  ├─ orders
│  │  │  │  ├─ actions.ts
│  │  │  │  ├─ new
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ page.tsx
│  │  │  │  ├─ returns
│  │  │  │  │  └─ page.tsx
│  │  │  │  └─ [orderId]
│  │  │  │     └─ page.tsx
│  │  │  ├─ page.tsx
│  │  │  ├─ sales
│  │  │  │  ├─ actions.ts
│  │  │  │  ├─ gift-cards
│  │  │  │  │  ├─ new
│  │  │  │  │  │  └─ page.tsx
│  │  │  │  │  ├─ page.tsx
│  │  │  │  │  └─ [giftCardId]
│  │  │  │  │     └─ page.tsx
│  │  │  │  ├─ payments
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ refunds
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ reviews
│  │  │  │  │  └─ page.tsx
│  │  │  │  └─ shipments
│  │  │  │     └─ page.tsx
│  │  │  ├─ settings
│  │  │  │  ├─ actions.ts
│  │  │  │  ├─ countries
│  │  │  │  │  ├─ new
│  │  │  │  │  │  └─ page.tsx
│  │  │  │  │  ├─ page.tsx
│  │  │  │  │  └─ [countryId]
│  │  │  │  │     └─ page.tsx
│  │  │  │  ├─ page.tsx
│  │  │  │  ├─ payment-methods
│  │  │  │  │  ├─ new
│  │  │  │  │  │  └─ page.tsx
│  │  │  │  │  ├─ page.tsx
│  │  │  │  │  └─ [paymentMethodId]
│  │  │  │  │     └─ page.tsx
│  │  │  │  ├─ shipping-methods
│  │  │  │  │  ├─ new
│  │  │  │  │  │  └─ page.tsx
│  │  │  │  │  ├─ page.tsx
│  │  │  │  │  └─ [shippingMethodId]
│  │  │  │  │     └─ page.tsx
│  │  │  │  ├─ shipping-rate-rules
│  │  │  │  │  ├─ new
│  │  │  │  │  │  └─ page.tsx
│  │  │  │  │  ├─ page.tsx
│  │  │  │  │  └─ [shippingRateRuleId]
│  │  │  │  │     └─ page.tsx
│  │  │  │  ├─ shipping-zones
│  │  │  │  │  ├─ new
│  │  │  │  │  │  └─ page.tsx
│  │  │  │  │  ├─ page.tsx
│  │  │  │  │  └─ [shippingZoneId]
│  │  │  │  │     └─ page.tsx
│  │  │  │  ├─ states-regions
│  │  │  │  │  ├─ new
│  │  │  │  │  │  └─ page.tsx
│  │  │  │  │  ├─ page.tsx
│  │  │  │  │  └─ [stateRegionId]
│  │  │  │  │     └─ page.tsx
│  │  │  │  ├─ tax-classes
│  │  │  │  │  ├─ new
│  │  │  │  │  │  └─ page.tsx
│  │  │  │  │  ├─ page.tsx
│  │  │  │  │  └─ [taxClassId]
│  │  │  │  │     └─ page.tsx
│  │  │  │  └─ tax-rates
│  │  │  │     ├─ new
│  │  │  │     │  └─ page.tsx
│  │  │  │     ├─ page.tsx
│  │  │  │     └─ [taxRateId]
│  │  │  │        └─ page.tsx
│  │  │  ├─ supplier
│  │  │  │  ├─ handoff
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ links
│  │  │  │  │  ├─ new
│  │  │  │  │  │  └─ page.tsx
│  │  │  │  │  ├─ page.tsx
│  │  │  │  │  └─ [variantSourceId]
│  │  │  │  │     └─ page.tsx
│  │  │  │  ├─ new
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ page.tsx
│  │  │  │  ├─ platforms
│  │  │  │  │  ├─ new
│  │  │  │  │  │  └─ page.tsx
│  │  │  │  │  ├─ page.tsx
│  │  │  │  │  └─ [platformId]
│  │  │  │  │     └─ page.tsx
│  │  │  │  └─ [sourceId]
│  │  │  │     └─ page.tsx
│  │  │  └─ users
│  │  │     ├─ actions.ts
│  │  │     ├─ new
│  │  │     │  └─ page.tsx
│  │  │     ├─ page.tsx
│  │  │     └─ [userId]
│  │  │        └─ page.tsx
│  │  ├─ favicon.ico
│  │  ├─ globals.css
│  │  ├─ layout.tsx
│  │  ├─ login
│  │  │  └─ page.tsx
│  │  ├─ page.tsx
│  │  ├─ pages
│  │  │  └─ [slug]
│  │  │     └─ page.tsx
│  │  ├─ register
│  │  │  └─ page.tsx
│  │  ├─ shop
│  │  │  ├─ page.tsx
│  │  │  └─ [slug]
│  │  │     └─ page.tsx
│  │  ├─ unauthorized
│  │  │  └─ page.tsx
│  │  └─ wishlist
│  │     └─ page.tsx
│  ├─ components
│  │  ├─ admin
│  │  │  ├─ action-notice.tsx
│  │  │  ├─ admin-country-state-fields.tsx
│  │  │  ├─ async-target-picker.tsx
│  │  │  ├─ catalog-forms.tsx
│  │  │  ├─ data-grid-shell.tsx
│  │  │  ├─ domain-record-forms.tsx
│  │  │  ├─ editor-page.tsx
│  │  │  ├─ gift-card-form.tsx
│  │  │  ├─ inventory-grid.tsx
│  │  │  ├─ lookup-picker.tsx
│  │  │  ├─ manual-order-builder.tsx
│  │  │  ├─ module-tabs.tsx
│  │  │  ├─ navigation-menu-item-fields.tsx
│  │  │  ├─ option-types-grid.tsx
│  │  │  ├─ order-detail-view.tsx
│  │  │  ├─ orders-grid.tsx
│  │  │  ├─ payments-grid.tsx
│  │  │  ├─ products-grid.tsx
│  │  │  ├─ promotions-grid.tsx
│  │  │  ├─ quick-create-modal.tsx
│  │  │  ├─ refunds-grid.tsx
│  │  │  ├─ restocks-grid.tsx
│  │  │  ├─ returns-grid.tsx
│  │  │  ├─ reviews-grid.tsx
│  │  │  ├─ route-overlay.tsx
│  │  │  ├─ shipments-grid.tsx
│  │  │  ├─ simple-record-page.tsx
│  │  │  ├─ simple-records-grid.tsx
│  │  │  ├─ supplier-forms.tsx
│  │  │  ├─ supplier-grid.tsx
│  │  │  ├─ supplier-links-grid.tsx
│  │  │  ├─ supplier-platforms-grid.tsx
│  │  │  ├─ user-form.tsx
│  │  │  ├─ users-grid.tsx
│  │  │  └─ workspace.tsx
│  │  ├─ auth
│  │  │  ├─ login-form.tsx
│  │  │  └─ register-form.tsx
│  │  ├─ dashboard
│  │  │  ├─ catalog-workspace.tsx
│  │  │  ├─ dashboard-shell.tsx
│  │  │  └─ primitives.tsx
│  │  ├─ layout
│  │  │  └─ public-header.tsx
│  │  ├─ store
│  │  │  ├─ account-address-form.tsx
│  │  │  ├─ add-to-cart-form.tsx
│  │  │  ├─ cart-view.tsx
│  │  │  ├─ checkout-form.tsx
│  │  │  ├─ product-card.tsx
│  │  │  ├─ product-detail-client.tsx
│  │  │  ├─ product-review-form.tsx
│  │  │  ├─ storefront-account-shell.tsx
│  │  │  ├─ storefront-breadcrumbs.tsx
│  │  │  ├─ storefront-cart-drawer.tsx
│  │  │  ├─ storefront-cart-hydrator.tsx
│  │  │  ├─ storefront-filter-drawer.tsx
│  │  │  ├─ storefront-header-actions.tsx
│  │  │  ├─ storefront-image.tsx
│  │  │  ├─ storefront-pagination.tsx
│  │  │  ├─ storefront-shell.tsx
│  │  │  └─ wishlist-toggle.tsx
│  │  └─ ui
│  │     └─ button.tsx
│  ├─ lib
│  │  ├─ auth
│  │  │  ├─ api-access.ts
│  │  │  ├─ guards.ts
│  │  │  ├─ navigation.ts
│  │  │  ├─ permissions.ts
│  │  │  ├─ route-access.ts
│  │  │  └─ session.ts
│  │  ├─ crud
│  │  │  ├─ model-crud.repository.ts
│  │  │  └─ model-crud.service.ts
│  │  ├─ db
│  │  │  └─ mongodb.ts
│  │  ├─ errors
│  │  │  └─ app-error.ts
│  │  ├─ http
│  │  │  └─ error-response.ts
│  │  ├─ media
│  │  │  └─ upload.ts
│  │  ├─ store
│  │  │  ├─ hooks.ts
│  │  │  ├─ provider.tsx
│  │  │  ├─ slices
│  │  │  │  └─ cart-slice.ts
│  │  │  └─ store.ts
│  │  ├─ storefront
│  │  │  └─ placeholders.ts
│  │  └─ utils
│  │     ├─ format.ts
│  │     ├─ navigation.ts
│  │     ├─ object-id.ts
│  │     └─ slugify.ts
│  └─ modules
│     ├─ admin
│     │  ├─ admin-crud.repositories.ts
│     │  ├─ admin-crud.services.ts
│     │  ├─ admin-pagination.ts
│     │  ├─ admin-query.ts
│     │  └─ admin-workspace.service.ts
│     ├─ cart
│     │  ├─ cart.models.ts
│     │  ├─ cart.repository.ts
│     │  └─ cart.service.ts
│     ├─ catalog
│     │  ├─ admin-product.service.ts
│     │  ├─ catalog-availability.ts
│     │  ├─ catalog-extra.models.ts
│     │  ├─ catalog-identifiers.service.ts
│     │  ├─ catalog-media.service.ts
│     │  ├─ catalog-standalone-sync.service.ts
│     │  ├─ catalog.models.ts
│     │  ├─ catalog.repository.ts
│     │  ├─ catalog.service.ts
│     │  ├─ category-tree.service.ts
│     │  └─ product-issues.ts
│     ├─ content
│     │  ├─ content.models.ts
│     │  ├─ content.repository.ts
│     │  ├─ content.service.ts
│     │  └─ system-events.service.ts
│     ├─ core
│     │  ├─ core.models.ts
│     │  ├─ core.repository.ts
│     │  └─ core.service.ts
│     ├─ customers
│     │  ├─ customers.models.ts
│     │  ├─ customers.repository.ts
│     │  └─ customers.service.ts
│     ├─ dashboard
│     │  └─ dashboard.service.ts
│     ├─ engagement
│     │  ├─ engagement.models.ts
│     │  ├─ engagement.repository.ts
│     │  ├─ engagement.service.ts
│     │  └─ review-aggregates.ts
│     ├─ orders
│     │  ├─ orders.models.ts
│     │  ├─ orders.repository.ts
│     │  └─ orders.service.ts
│     ├─ payments
│     │  ├─ payments.models.ts
│     │  ├─ payments.repository.ts
│     │  └─ payments.service.ts
│     ├─ pricing
│     │  ├─ admin-promotion.service.ts
│     │  ├─ coupon-usage.service.ts
│     │  ├─ pricing.models.ts
│     │  ├─ pricing.repository.ts
│     │  └─ pricing.service.ts
│     ├─ setup
│     │  └─ setup.service.ts
│     ├─ shipments
│     │  ├─ shipments.models.ts
│     │  ├─ shipments.repository.ts
│     │  └─ shipments.service.ts
│     ├─ sourcing
│     │  ├─ sourcing.models.ts
│     │  ├─ sourcing.repository.ts
│     │  └─ sourcing.service.ts
│     ├─ storefront
│     │  ├─ storefront-account.service.ts
│     │  ├─ storefront-catalog.service.ts
│     │  ├─ storefront-helpers.ts
│     │  ├─ storefront-query.ts
│     │  ├─ storefront-session.ts
│     │  ├─ storefront.service.ts
│     │  └─ storefront.types.ts
│     └─ users
│        ├─ auth.service.ts
│        ├─ customer-profile.model.ts
│        ├─ customer-profile.repository.ts
│        ├─ user.model.ts
│        ├─ user.repository.ts
│        ├─ user.service.ts
│        └─ user.validation.ts
├─ tmp-review.png
└─ tsconfig.json

```