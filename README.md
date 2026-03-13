# OmniCommerce

A commercial full-stack single-store e-commerce platform built with Next.js, TypeScript, and MongoDB.

OmniCommerce includes a customer-facing storefront, an admin dashboard, modular backend services, catalog and inventory management, sourcing workflows, cart and checkout flows, orders, payments, shipping, promotions, CMS content, and operational tooling in one unified system.

This repository is intended for private use, client work, commercial deployment, or further product development.

## Overview

OmniCommerce is a full commerce application for single-store businesses that need more than a basic storefront. It combines customer shopping flows with internal operations and admin tools, making it suitable for real-world retail, sourcing, and fulfillment workflows.

The project includes:

- Public storefront pages
- Customer account, wishlist, cart, and checkout flows
- Admin dashboard for catalog, content, inventory, orders, sales, users, and settings
- API routes for store and admin operations
- Modular service and repository architecture
- MongoDB-backed commerce domain models
- Media upload handling
- Authentication and role-based access control

## Core Features

### Storefront
- Product listing and product detail pages
- Cart and checkout
- Wishlist
- Customer account pages
- Orders and address management
- Reviews

### Admin Dashboard
- Catalog management
- Categories, brands, collections, product types, tags, and badges
- Product variants, specifications, FAQ, SEO, bundles, and relations
- Inventory and restock workflows
- Orders, shipments, returns, refunds, and payments
- Promotions and gift cards
- Content management for pages, banners, and navigation
- User and settings management
- Supplier and sourcing tools

### Backend
- Next.js App Router API routes
- Modular domain services and repositories
- MongoDB integration
- Authentication and permission guards
- Upload and media handling
- Dashboard reporting and overview endpoints

## Tech Stack

- **Frontend:** Next.js, React, TypeScript
- **Backend:** Next.js Route Handlers
- **Database:** MongoDB
- **ODM / Data Layer:** Custom modular model + repository pattern
- **Styling:** Tailwind CSS
- **Auth:** Session-based auth with route guards
- **Uploads:** Local/public upload pipeline

## Architecture

The codebase is organized into three main layers:

- `src/app` for routes, pages, and API endpoints
- `src/components` for UI and feature components
- `src/modules` for business logic, repositories, and domain services

This keeps UI concerns separate from application logic and allows the platform to scale across commerce domains such as catalog, pricing, cart, orders, payments, shipments, sourcing, and users.

## Project Structure

```txt
src/
  app/         # Next.js pages, layouts, and API routes
  components/  # UI components for admin, auth, dashboard, and storefront
  lib/         # Shared libraries, auth, db, media, store, and utils
  modules/     # Business domains: catalog, cart, orders, payments, sourcing, etc.
