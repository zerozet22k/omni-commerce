# Omni Commerce

Omni Commerce is a full-stack ecommerce platform built with Next.js, TypeScript, MongoDB, and modular service layers. It is designed as portfolio evidence for practical web application development: storefront browsing, catalog management, customer accounts, admin workflows, and commerce data modeling.

## Project Summary

This project shows end-to-end product engineering rather than a single-page demo. The codebase includes a customer-facing storefront, authenticated dashboard screens, admin catalog tools, reusable domain modules, and server-side services for commerce operations.

## Tech Stack

- Next.js 16 and React 19
- TypeScript
- MongoDB, Mongoose, and MongoDB Memory Server for local development
- Redux Toolkit and React Redux
- Tailwind CSS 4
- Zod for validation
- Jose and bcryptjs for auth/session-related flows
- ESLint

## Main Features

- Storefront product and category browsing
- Cart, customer, order, payment, shipment, pricing, review, and sourcing modules
- Admin catalog management and CRUD-style service/repository layers
- Product media upload support
- Role-aware dashboard and route access utilities
- Seed/demo-data workflow for local project review
- Reusable formatting, navigation, media, auth, and database helpers

## Code Evidence

- `src/modules/catalog` contains product, category, media, availability, and admin catalog logic.
- `src/modules/storefront` contains customer-facing storefront queries and account helpers.
- `src/modules/orders`, `src/modules/cart`, `src/modules/pricing`, and `src/modules/payments` show commerce-domain modeling.
- `src/components/dashboard` and `src/components/admin` show dashboard and admin UI work.

## My Role

Built independently as a full-stack portfolio project, covering product structure, UI implementation, data models, service/repository architecture, authentication-aware routes, and local development setup.

## Local Development

### Requirements

- Node.js 20 or newer
- npm

### Install

```bash
npm install
```

### Environment

Copy the example environment file and fill in local values:

```powershell
Copy-Item .env.example .env.local
```

### Run

```bash
npm run dev
```

The development server runs on:

```text
http://localhost:3001
```

### Useful Commands

```bash
npm run build
npm run lint
npm run seed:demo
```

## Screenshots / Demo

Screenshots and live demo links can be added here before sending the portfolio to a university or scholarship reviewer.

## License

All rights reserved. See `LICENSE`.
