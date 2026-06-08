# Seltra Merchant Platform

AI-native commerce infrastructure for autonomous storefront generation and operations.

Seltra enables entrepreneurs to launch and operate functional ecommerce stores from a single prompt. The platform uses AI agents to generate storefronts, products, product content, branding assets, and operational commerce workflows — all backed by a multi-tenant TypeScript monorepo architecture.

---

## Vision

Seltra is building the operating system for AI-native commerce.

Instead of spending weeks configuring ecommerce infrastructure, a user simply describes their business idea:

> “Create a premium skincare brand for African millennials.”

Seltra generates:

* A live storefront
* Product catalog
* Product descriptions
* AI-generated product images
* Checkout flow
* Tenant deployment
* Operational commerce data structures

All within minutes.

---

# Core Product Thesis

Traditional ecommerce platforms are dashboard-first.

Seltra is agent-first.

The AI agent becomes the commerce operator:

* generating stores,
* managing products,
* orchestrating storefront logic,
* and eventually automating operations.

---

# Tech Stack

## Frontend

* Next.js 15
* TypeScript
* TailwindCSS
* App Router
* Multi-tenant storefront rendering

## Backend

* NestJS
* TypeScript
* REST APIs
* AI orchestration modules

## Database

* PostgreSQL
* Prisma ORM
* JSONB canonical commerce schemas

## AI Layer

* Claude SDK
* Structured agent orchestration
* Commerce blueprint generation

## Infrastructure

* Vercel
* Wildcard subdomain routing
* Cloudflare R2
* fal.ai image generation

## Payments

* Paystack (initial)
* Stripe (future)

---


# Current MVP Status

## Working

* AI commerce blueprint generation
* Multi-tenant schema architecture
* PostgreSQL canonical storage
* Slug-based storefront rendering
* Next.js storefront retrieval
* NestJS backend foundation
* Shared TypeScript architecture

## In Progress

* Product ingestion APIs
* AI product image generation
* Cart + checkout system
* Paystack integration
* Wildcard subdomain deployment
* Store operations agents

---

# Product Workflow

```text
User Prompt
    ↓
Claude Commerce Agent
    ↓
Business Blueprint Generation
    ↓
Canonical Commerce Schema
    ↓
PostgreSQL Persistence
    ↓
AI Product Asset Generation
    ↓
Storefront Rendering
    ↓
Live Tenant Deployment
```

---

# Example User Prompt

```text
Create a luxury streetwear brand for Gen Z creatives in Accra.
```

Seltra generates:

* brand identity,
* product catalog,
* descriptions,
* pricing structure,
* storefront,
* checkout flow,
* deployed store URL.

---

# Multi-Tenant Architecture

Each tenant receives:

```text
brandname.seltra.store
```

Routing is powered by:

* Vercel wildcard domains
* Next.js middleware
* tenant slug resolution
* Postgres tenant isolation

---

# Local Development

## Prerequisites

* Node.js 20+
* PostgreSQL
* pnpm
* Prisma

---

# Install Dependencies

```bash
pnpm install
```

---

# Configure Environment Variables

Create:

```bash
apps/api/.env
apps/web/.env.local
```

Example:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/seltra_dev

ANTHROPIC_API_KEY=

NEXT_PUBLIC_API_URL=http://localhost:8000

PAYSTACK_SECRET_KEY=
PAYSTACK_PUBLIC_KEY=

FAL_KEY=
```

---

# Prisma Setup

Generate Prisma client:

```bash
npx prisma generate
```

Run migrations:

```bash
npx prisma migrate dev
```

Open Prisma Studio:

```bash
npx prisma studio
```

---

# Run Development Servers

## API

```bash
cd apps/api
pnpm start:dev
```

Runs on:

```text
http://localhost:8000
```

---

## Frontend

```bash
cd apps/web
pnpm dev
```

Runs on:

```text
http://localhost:3000
```

---

# Example Store Endpoint

```bash
GET /api/v1/store/:slug
```

Example:

```bash
http://localhost:8000/api/v1/store/pixelforge-studios
```

---

# Development Roadmap

## Phase 1 — Core Commerce Engine

* [x] NestJS migration
* [x] Shared TypeScript architecture
* [x] Prisma integration
* [ ] Product ingestion APIs
* [ ] Tenant commerce schemas

## Phase 2 — Storefront Generation

* [ ] Dynamic storefront rendering
* [ ] AI-generated products
* [ ] AI-generated images
* [ ] Store themes

## Phase 3 — Checkout Infrastructure

* [ ] Cart system
* [ ] Paystack checkout
* [ ] Orders
* [ ] Webhooks

## Phase 4 — Operations Agents

* [ ] Inventory monitoring
* [ ] AI pricing optimization
* [ ] Product recommendations
* [ ] Commerce analytics

---

# Core Philosophy

Most ecommerce platforms help users build stores.

Seltra helps users operate commerce through AI agents.

---

# Long-Term Vision

Seltra aims to become:

* the AI-native commerce operating system,
* the autonomous commerce layer for entrepreneurs,
* and eventually the infrastructure powering agentic ecommerce.

---

# Founder
William Ofosu Parwar

Built in Ghana 🇬🇭
Designed for global commerce.

---

# License

Private — All rights reserved.
