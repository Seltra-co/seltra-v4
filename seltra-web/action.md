# Seltra Internal Ops API — Build Spec

**Owner:** William Ofosu
**Consumer:** `seltra-seven.vercel.app` (Ops dashboard, Next.js, deployed on Vercel)
**Producer:** `seltra-merchant-backend.onrender.com` (NestJS, this repo)
**DB:** Neon Postgres (prod), accessed via Prisma from the merchant backend only. Ops never talks to Neon directly.

## 0. System boundary (read this first)

Ops and Merchant are two separate deployed services. Ops has **no direct DB access** and never will —
it consumes a private, versioned API surface exposed by the merchant backend. This doc specifies that
surface: `/internal/ops/*`. Nothing under `/internal/ops` is reachable by merchants, customers, or the
public storefront. It is a second, parallel API on the same NestJS app, gated by a dedicated guard.

Do not let this become a leaky abstraction — Ops should never receive raw Prisma rows. Every response
below is a defined DTO. If the Ops UI needs a new field, add it to the DTO deliberately, don't widen the
query and pass the row through.

---

## 1. Schema changes required (apply before writing endpoints)

The current dashboard (screenshots) is rendering some fields that don't exist yet on `Tenant`
(location), tenant has basedIn which represents location of merchant and some that have no backing table at all (activity feed, AI invocation count). Rather than
bolt on three different mechanisms, add **one generic event log** — it backs the activity chart, the
"recent events" feed, and the AI invocation count (just a filtered count on the same table).

```prisma
model Tenant {
  // ...existing fields...
  city    String?
  country String?
}

model TenantEvent {
  id        String   @id @default(uuid())
  tenantId  String
  type      String   // 'product_added' | 'order_placed' | 'payment_received' | 'login' |
                      // 'settings_changed' | 'theme_updated' | 'ai_invocation' | 'merchant_onboarded'
  meta      Json?
  createdAt DateTime @default(now())
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId, createdAt])
  @@index([type, createdAt])
}
```

Add `events TenantEvent[]` to the `Tenant` model's relation list.

**Backfill plan:** `city`/`country` are nullable — do not fail on missing data. On `Tenant` creation
(post-approval, see §5.3), parse `MerchantApplication.basedIn` (format observed: `"City, Country"`) with
a small `parseBasedIn(basedIn: string): { city: string | null; country: string | null }` helper —
split on the last comma, trim both sides. If it doesn't parse cleanly, leave both null rather than
guessing. Run a one-off backfill script for existing tenants using their linked application's `basedIn`.

**Event emission:** `TenantEvent` rows should be written at the point of action, not reconstructed later.
Emit from: order creation (`order_placed`), Moolre webhook success (`payment_received`), product create
(`product_added`), tenant settings update (`settings_changed`), storefront theme/hero regeneration
(`theme_updated`), merchant login (`login`), and AI generation calls (`ai_invocation`, meta: `{ model,
chunk, tokensIn, tokensOut }`). Fire-and-forget (`void this.eventsService.record(...)`) — an event log
write must never block or fail the primary request, same pattern as `ResendService` notifications.

**Migration name:** `add_tenant_location_and_event_log`. Run it, don't just draft it — every endpoint
below depends on it existing.

---

## 2. Auth & security (non-negotiable, prod-grade)

- New Nest module `InternalOpsModule`, mounted at `/internal/ops`, with its **own guard** —
  `OpsApiKeyGuard`. Do not reuse the merchant/customer JWT guard; this is a service-to-service credential,
  not a user session.
- Guard checks header `x-internal-api-key` against `process.env.OPS_INTERNAL_API_KEY` using a
  constant-time comparison (`crypto.timingSafeEqual`, length-checked first to avoid the buffer-length
  throw). Missing or mismatched key → `401` with no body detail beyond `{ message: 'Unauthorized' }`.
  Never echo back the expected key or hint at partial matches.
- `OPS_INTERNAL_API_KEY` is a new env var on the merchant backend (Render) — generate with
  `openssl rand -hex 32`. Set the same value on Ops (Vercel) as `SELTRA_OPS_API_KEY` (server-side only,
  never `NEXT_PUBLIC_*`). Rotate quarterly; support a `OPS_INTERNAL_API_KEY_PREVIOUS` fallback for 24h
  during rotation so you don't get a hard cutover outage.
- Rate limit the whole `/internal/ops` prefix via the existing Upstash setup — generous since it's
  service-to-service (e.g. 300 req/min), but present. This is a compromised-key blast-radius control,
  not a UX control.
- Every **mutating** endpoint (`PATCH`, `DELETE`, `POST /approve`, `POST /reject`) writes an audit row.
  Add a minimal `OpsAuditLog` model (`id, actorLabel, action, targetType, targetId, payload Json?,
  createdAt`) — `actorLabel` comes from a required `x-ops-actor` header (e.g. `admin@seltra.co`) so you
  know *who in Ops* triggered it, since the API key alone doesn't distinguish operators. Reject mutating
  requests missing `x-ops-actor` with `400`.
- All responses `Content-Type: application/json`. All errors follow one shape:
  ```json
  { "statusCode": 404, "error": "NotFound", "message": "Tenant not found", "path": "/internal/ops/merchants/abc", "timestamp": "2026-07-08T12:00:00.000Z" }
  ```
  Build this as a global `OpsExceptionFilter` scoped to the module, not ad-hoc per-controller.
- Validate every query/body param with `class-validator` DTOs — no `any`, no untyped `req.query` reads.
  Reject unknown fields (`whitelist: true, forbidNonWhitelisted: true` on the pipe for this module).

---

## 3. Conventions used below

- **Pagination:** `?page=1&pageSize=20` (defaults `1`/`20`, max `pageSize=100`). Response wrapper:
  ```json
  { "data": [...], "page": 1, "pageSize": 20, "total": 137, "totalPages": 7 }
  ```
- **Money:** always `{ "amount": "4483.34", "currency": "GHS" }` — amount as **string** (Decimal →
  string, never a float) to avoid precision drift over the wire.
- **"Paid" order status:** confirm against your actual `Order.status` constants before wiring GMV
  aggregates — this doc assumes `'paid'` and `'completed'` both count as revenue-recognized. If your
  Moolre webhook sets a different string, fix the `PAID_STATUSES` constant in one place
  (`internal-ops/constants.ts`), not scattered across queries.
- **Date ranges:** `?days=30` query param on time-series endpoints, default `30`, max `90`.

---

## 4. Endpoints

### 4.1 `GET /internal/ops/health`
Trivial liveness/auth check for Ops to verify its key works. No DB hit.
```json
{ "ok": true, "service": "seltra-merchant-backend", "time": "2026-07-08T12:00:00.000Z" }
```

### 4.2 `GET /internal/ops/dashboard/overview`
Backs the six top cards on the Dashboard.

Definitions (derive from existing fields — do not invent new status flags):
- `totalMerchants` = `count(Tenant)`
- `activeMerchants` = `count(Tenant where status = 'active')`
- `gmv30d` = `sum(Order.totalAmount) where status in PAID_STATUSES and createdAt >= now()-30d`
- `paidOrders30d` = `count(Order where status in PAID_STATUSES and createdAt >= now()-30d)`
- `waitlistApplicants` = `count(MerchantApplication where status = 'pending')`
- `approvedToOnboard` = `count(MerchantApplication where status = 'approved' and merchantId is null)`
  — approved but Tenant not yet created (pipeline step 3 not done).
- `onboarded` = `count(MerchantApplication where status = 'approved' and merchantId is not null)`
  — Tenant exists and is linked back.
- `aiInvocations24h` = `count(TenantEvent where type = 'ai_invocation' and createdAt >= now()-24h)`

```json
{
  "totalMerchants": 19,
  "activeMerchants": 17,
  "gmv30d": { "amount": "0.00", "currency": "GHS" },
  "paidOrders30d": 149,
  "waitlistApplicants": 10,
  "approvedToOnboard": 0,
  "onboarded": 2,
  "aiInvocations24h": 0
}
```

### 4.3 `GET /internal/ops/dashboard/footprint`
`country`/`city` come from `Tenant`, not from `MerchantApplication` — only counts tenants that have been
backfilled/created with location set. Tenants with `country = null` are excluded and reported separately
so the count doesn't silently drift from `totalMerchants`.

```json
{
  "totalMerchants": 19,
  "unlocated": 2,
  "countries": [
    {
      "country": "Ghana",
      "count": 10,
      "cities": [
        { "city": "Accra", "count": 4 },
        { "city": "Kumasi", "count": 2 },
        { "city": "Cape Coast", "count": 1 },
        { "city": "Tema", "count": 2 },
        { "city": "Tamale", "count": 1 }
      ]
    },
    { "country": "Nigeria", "count": 5, "cities": [{ "city": "Lagos", "count": 5 }] },
    { "country": "Kenya", "count": 4, "cities": [{ "city": "Nairobi", "count": 4 }] }
  ],
  "topMarket": "Ghana"
}
```

### 4.4 `GET /internal/ops/dashboard/gmv-series?days=30`
Daily buckets, zero-filled for days with no orders (don't skip days — the chart needs a continuous axis).
```json
[
  { "date": "2026-06-09", "amount": "0.00" },
  { "date": "2026-06-10", "amount": "120.00" }
]
```

### 4.5 `GET /internal/ops/dashboard/activity-series?days=30`
Daily count of `TenantEvent` rows, zero-filled.
```json
[{ "date": "2026-06-09", "count": 0 }, { "date": "2026-06-29", "count": 1 }]
```

### 4.6 `GET /internal/ops/dashboard/top-merchants?limit=5`
`limit` max 20. Ranked by GMV over all time unless `?days=` supplied.
```json
[
  { "rank": 1, "tenantId": "uuid", "name": "Soko Sneakers", "slug": "soko-sneakers", "gmv": { "amount": "7054.76", "currency": "GHS" } }
]
```

### 4.7 `GET /internal/ops/dashboard/recent-events?limit=10`
`limit` max 50. Newest first, joined with tenant slug for display.
```json
[
  { "id": "uuid", "type": "product_added", "tenantSlug": "mama-kitchen", "createdAt": "2026-06-03T10:00:00Z" }
]
```

### 4.8 `GET /internal/ops/dashboard/system-status`
Cache results for 30s server-side (`Map` or Redis via Upstash) — do not re-ping dependencies on every
Ops page load. Each check has its own 3s timeout; a timeout is `degraded`, not `down` (don't conflate
"slow" with "broken").
- `db`: `prisma.$queryRaw\`SELECT 1\``
- `api`: always `healthy` if this code is running
- `agent`: last successful `ai_invocation` TenantEvent within 15 minutes → `healthy`, else `degraded`
- `payments`: last successful Moolre webhook-derived `payment_received` event within 24h, or a live
  lightweight call to Moolre's status endpoint if one exists — confirm with Moolre docs before wiring
- `storefront`: `fetch` to the Next.js frontend's own `/api/health` (add one if it doesn't exist) with
  a 3s timeout

```json
{
  "api": { "status": "healthy" },
  "agent": { "status": "healthy", "lastCheckedAt": "2026-07-08T12:00:00Z" },
  "storefront": { "status": "healthy", "latencyMs": 142 },
  "payments": { "status": "degraded", "reason": "no payment_received event in 24h" },
  "db": { "status": "healthy", "latencyMs": 8 }
}
```

### 4.9 `GET /internal/ops/merchants`
Query params: `search` (matches `name`, `slug`, owner `email`), `status`, `businessType`, `country`,
`page`, `pageSize`, `sortBy` (`gmv`|`orders`|`lastActive`|`joined`, default `joined`), `sortDir`
(`asc`|`desc`, default `desc`).

`gmv`, `orders`, `lastActive` are computed, not stored columns — aggregate via a single grouped query
(`prisma.order.groupBy`) joined in-memory to the tenant page rather than N+1 per-tenant queries. At 19
merchants this doesn't matter yet; at 500 it will, so build it right now.

```json
{
  "data": [
    {
      "tenantId": "uuid",
      "storeName": "Kente Republic",
      "slug": "kente-republic",
      "ownerName": "Kojo Mensah",
      "ownerEmail": "kojo@kente.gh",
      "businessType": "Fashion",
      "location": "Kumasi, Ghana",
      "status": "active",
      "gmv": { "amount": "4483.34", "currency": "GHS" },
      "orderCount": 7,
      "lastActiveAt": "2026-06-03T10:00:00Z",
      "joinedAt": "2026-02-27T10:00:00Z"
    }
  ],
  "page": 1, "pageSize": 20, "total": 19, "totalPages": 1
}
```

### 4.10 `GET /internal/ops/merchants/:tenantId`
Full detail view — same shape as list row plus `canonical`, `manifest` summary (not full JSON blob —
just `{ hasHero, hasNav, storefrontVersion, storefrontGeneratedAt }`), ledger balance, and payment
providers configured (`provider` names only, never `config` — that may hold secrets).

### 4.11 `PATCH /internal/ops/merchants/:tenantId`
Body: partial `{ name?, businessType?, status?, city?, country? }` — whitelist explicitly, do not accept
arbitrary Tenant fields (never allow Ops to write `canonical`, `storefrontCode`, or anything
generation-related through this endpoint — that's the merchant's own generation pipeline's job).
Requires `x-ops-actor`. Writes `OpsAuditLog`. Returns updated row in the §4.9 row shape.

### 4.12 `DELETE /internal/ops/merchants/:tenantId`
**Soft delete only** — sets `status = 'removed'`. Do not hard-delete a tenant with real order/customer
history through an Ops button; that's a data-loss footgun with no undo. If a genuine hard-delete tool is
ever needed, it's a separate, more guarded endpoint with its own confirmation flow — out of scope here.
Requires `x-ops-actor`. Writes `OpsAuditLog`. Returns `{ tenantId, status: 'removed' }`.

### 4.13 `GET /internal/ops/merchants/export.csv`
Same filters as §4.9 (no pagination — caps at 5,000 rows, returns `413` above that with a message to
narrow filters). `Content-Type: text/csv`, `Content-Disposition: attachment; filename="merchants.csv"`.
Columns: `store,slug,owner_name,owner_email,type,location,status,gmv,orders,last_active,joined`.

### 4.14 `GET /internal/ops/applications`
Query params: `status` (`pending`|`approved`|`rejected`|`suspended`, maps to `MerchantStatus`), `search`,
`page`, `pageSize`. Note the UI's "Applied / Reviewed / Approved" badges don't map 1:1 to the
`MerchantStatus` enum you have (`pending/approved/rejected/suspended`) — "Reviewed" isn't a stored state
today. Either add a `reviewedAt DateTime?` column to `MerchantApplication` (recommended — cheap, and
lets "Applied" vs "Reviewed" be `reviewedAt is null` vs not) or drop the "Reviewed" badge state from the
UI. Flagging this for a decision rather than guessing — don't silently invent a third status string.

### 4.15 `GET /internal/ops/applications/pipeline-counts`
Backs the 5-step "Onboarding progress" tracker.
```json
{
  "applicationReceived": 15,
  "reviewApprove": 10,
  "createMerchant": 3,
  "generateCredentials": 2,
  "sendWelcomeEmail": 2
}
```
Step definitions: `applicationReceived` = all pending; `reviewApprove` = pending + not yet reviewed
(depends on §4.14 decision); `createMerchant` = approved, `merchantId` null; `generateCredentials` /
`sendWelcomeEmail` — you don't currently have distinct fields for these last two steps, they happen
together in §4.16 today. If you want them tracked separately, add `credentialsGeneratedAt DateTime?` and
`welcomeEmailSentAt DateTime?` to `MerchantApplication` and set them at the right point in the approval
flow below. Otherwise collapse steps 4-5 into step 3 in the UI. Same flag as §4.14 — pick one, don't fake
progress that isn't real.

### 4.16 `POST /internal/ops/applications/:id/approve`
This is the one endpoint that does real work — it executes onboarding pipeline steps 2 through 5 in one
transaction-safe flow. Requires `x-ops-actor`. **Idempotent**: if the application is already `approved`
with a `merchantId` set, return `200` with the existing result rather than erroring or double-creating.

Steps, in order, each wrapped so a failure at step N doesn't leave step N-1's side effect orphaned:
1. Load `MerchantApplication`, verify `status = 'pending'` (or already approved+merchantId → idempotent
   return).
2. `prisma.$transaction`: create `User` (email from application, generate a random temp password —
   never log it in plaintext, hash before storing), create `Tenant` (slug generated from `storeName`,
   deduped if collision — `storeName-2` etc.), parse `basedIn` into `city`/`country` per §1, set
   `MerchantApplication.status = 'approved'`, `merchantId = tenant.id`.
3. Generate merchant login credentials (temp password / magic-link token — reuse whatever mechanism
   `BetterAuth` already supports for first-login rather than building a second one).
4. Send welcome email via existing `ResendService.sendApplicationNotification`-style flow (a new
   "you're approved, here's how to log in" template — the current `buildMerchantWelcomeEmail` is a
   waitlist-confirmation email, not a credentials email; don't reuse it as-is, write a distinct template
   with a clear login CTA and the temp password/magic link).
5. Write `OpsAuditLog` and a `TenantEvent { type: 'merchant_onboarded' }`.

Body: `{}` (no input needed — everything comes from the stored application). Response:
```json
{ "applicationId": "uuid", "tenantId": "uuid", "slug": "kemi-crafts", "status": "approved", "credentialsSent": true }
```
Failure modes to handle explicitly: duplicate slug (retry with suffix, don't 500), email send failure
(same fire-and-forget-never-blocks pattern as `ResendService` today — approval still succeeds, log the
email failure for manual follow-up rather than leaving the merchant half-onboarded).

### 4.17 `POST /internal/ops/applications/:id/reject`
Body: `{ "reason": "string, required, min 3 chars" }`. Sets `status = 'rejected'`,
`reviewNotes = reason`. Requires `x-ops-actor`. Writes `OpsAuditLog`. No email is currently specced for
rejection — confirm with William whether merchants should be notified; if yes, that's a third email
template, out of scope until confirmed.

---

## 5. Module layout (what Codex should actually create)

```
backend/src/internal-ops/
  internal-ops.module.ts
  guards/ops-api-key.guard.ts
  filters/ops-exception.filter.ts
  constants.ts                    # PAID_STATUSES, pagination defaults
  dto/
    merchants-query.dto.ts
    merchant-patch.dto.ts
    applications-query.dto.ts
    reject-application.dto.ts
  controllers/
    dashboard.controller.ts       # 4.2–4.8
    merchants.controller.ts       # 4.9–4.13
    applications.controller.ts    # 4.14–4.17
  services/
    dashboard.service.ts
    merchants.service.ts
    applications.service.ts
    ops-audit.service.ts
  events/
    tenant-events.service.ts      # .record(tenantId, type, meta?) — called from existing services
```

Wire `TenantEventsService.record()` calls into the existing order/payment/product/settings/auth flows as
part of this same change — the event log is useless if nothing writes to it. Grep for where those actions
currently succeed (order creation, Moolre webhook handler, product create, tenant settings update,
storefront regeneration, login) and add one `void this.tenantEvents.record(...)` call at each site.

## 6. Out of scope for this pass (flag, don't build)

- `MerchantSuccess` / `Retention` / `Feature Usage` / `API Monitor` sidebar pages — no spec above covers
  them; they need their own data-model conversation before an endpoint gets written against guessed
  fields.
- Real payment-provider health pings beyond "last successful webhook" — a true Moolre status check needs
  their API docs confirmed first.
- Hard-delete of tenants.