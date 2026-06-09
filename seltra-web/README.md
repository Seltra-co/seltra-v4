# seltra-web

Unified Vite + React + TypeScript app for Seltra's:
- **Landing page** (`/`)
- **Auth** (`/auth`) — ops-issued merchant email + Merchant ID
- **Onboarding** (`/onboarding`) — 7-step wizard
- **Dashboard** (`/dashboard`) — agent chat + storefront preview

## Stack

- Vite 5 + React 18 + TypeScript
- Tailwind CSS + shadcn/ui
- React Router v6
- Custom API client (`src/integrations/api/client.ts`) — **no Supabase**

## Setup

```bash
cp .env.example .env
# Edit .env with your backend URLs
npm install
npm run dev
```

App runs at `http://localhost:8080`.

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Next.js frontend API base URL (default: `http://localhost:3001`) |
| `VITE_API_BASE_URL` | Your NestJS/Express backend (default: `http://localhost:3001`) |
| `VITE_STOREFRONT_URL` | Storefront Next.js app URL (default: `http://localhost:3002`) |
| `OTP_TTL_MINUTES` | OTP expiry window for future enforced merchant login verification (default: `10`) |
| `OTP_MAX_ATTEMPTS` | Failed OTP attempts before lockout (default: `3`) |
| `OTP_LOCKOUT_MINUTES` | OTP lockout duration after max failed attempts (default: `15`) |

## API Client

All auth and data calls go through `src/integrations/api/client.ts`.
It's a thin wrapper that mirrors the Supabase SDK shape so the original
component code required minimal changes.

### Auth endpoints your backend must implement

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/signup` | Disabled. Merchant accounts are created by Seltra Ops. |
| `POST` | `/auth/login` | Body: `{ email, merchantId }` → `{ access_token, user }` for approved merchants only |
| `POST` | `/auth/otp/verify` | Future OTP enforcement endpoint. Body: `{ merchantId, code }` |
| `DELETE` | `/auth/logout` | Requires `Authorization: Bearer <token>` |
| `GET` | `/auth/oauth/google` | Query: `?redirect_uri=` — redirects to Google |

### Data endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/conversations` | List user's conversations |
| `POST` | `/conversations` | Create conversation |
| `GET` | `/conversations/:id/messages` | List messages |
| `POST` | `/conversations/:id/messages` | Create message |
| `POST` | `/functions/agent-chat` | Invoke agent |
| `POST` | `/functions/notify-application` | Job application notification |
| `POST` | `/functions/investor-interest` | Investor interest form |
| `POST` | `/waitlist` | Join waitlist |

### Token storage

JWT is stored in `localStorage` under `seltra:token`.
User object is cached in `localStorage` under `seltra:user`.

## Storefront Preview

The dashboard embeds the storefront as an `<iframe>` at:
```
{VITE_STOREFRONT_URL}/store/{store-slug}
```

The merchant can click "Full preview" to expand it fullscreen within the
dashboard, or "Open store" to open in a new tab. The storefront itself
(`apps/storefront`) runs as a separate Next.js process.
