# seltra-web-modern — Codex Action Spec

## Context

This repo is a clone of `seltra-web`. It currently contains:
- `backend/` — NestJS + Prisma + Groq backend. **DO NOT TOUCH.**
- `src/` — old Vite + React frontend. **DELETE this entirely.**
- `public/`, `index.html`, `vite.config.ts`, `postcss.config.js` — Vite artifacts. **DELETE.**
- `package.json`, `tailwind.config.ts`, `tsconfig.json`, `components.json` — **REPLACE content.**

The goal: replace the Vite frontend with a Next.js 15 App Router frontend that produces
v0/Shopify-quality storefronts using shadcn/ui + Tailwind CSS variables + Framer Motion.

The backend (`backend/`) runs unchanged on port 3001. The new frontend runs on port 3000.

**Prisma schema is already defined in `backend/prisma/schema.prisma` — do not modify it.**

Key schema fields used by the frontend:
- `Tenant.storefrontCode` — HTML string with embedded `<!-- SELTRA_MANIFEST: {...} -->` comment
- `Tenant.storeDNA` — JSON with `{ industry, brandPersonality, heroStyle, palette, typography }`
- `Tenant.canonical` — JSON with `{ storeFeatures, productCategories, layoutVariant, recommendedTechStack }`
- `Tenant.slug` — used for subdomain routing (`slug.seltra.store`)
- `Product.images[]`, `Product.variants[]` — related via Prisma include

---

## Execution Rules for Codex

1. Execute tasks in strict order — do not skip or reorder.
2. After each task, verify the file exists before moving to the next.
3. If a file already exists, overwrite it completely.
4. Never modify anything inside `backend/`.
5. All frontend files go in the root of the repo (next to `backend/`), not inside `src/`.
6. Run `npm install` only once, after all config files are written (Task 3).
7. Run `npx shadcn@latest add` commands only after `npm install` completes.
8. Do not run `npm run dev` — just build the files.

---

## TASK 1 — Delete Vite frontend artifacts

```bash
rm -rf src/
rm -rf public/
rm -f index.html
rm -f vite.config.ts
rm -f postcss.config.js
rm -f tsconfig.app.json
rm -f tsconfig.node.json
```

---

## TASK 2 — Write root config files

### 2a. `package.json` (replace entirely)

```json
{
  "name": "seltra-web-modern",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "dev:backend": "cd backend && npm run start:dev",
    "dev:all": "concurrently \"npm run dev\" \"npm run dev:backend\""
  },
  "dependencies": {
    "next": "15.1.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "framer-motion": "^11.3.0",
    "lucide-react": "^0.462.0",
    "sonner": "^1.7.4",
    "next-themes": "^0.3.0",
    "geist": "^1.3.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.6.0",
    "tailwindcss-animate": "^1.0.7",
    "@radix-ui/react-accordion": "^1.2.11",
    "@radix-ui/react-dialog": "^1.1.14",
    "@radix-ui/react-dropdown-menu": "^2.1.15",
    "@radix-ui/react-label": "^2.1.7",
    "@radix-ui/react-scroll-area": "^1.2.9",
    "@radix-ui/react-select": "^2.2.5",
    "@radix-ui/react-separator": "^1.1.7",
    "@radix-ui/react-slot": "^1.2.3",
    "@radix-ui/react-tabs": "^1.1.12",
    "@radix-ui/react-toast": "^1.2.14",
    "@radix-ui/react-tooltip": "^1.2.7",
    "@tanstack/react-query": "^5.83.0",
    "react-hook-form": "^7.61.1",
    "zod": "^3.25.76",
    "@hookform/resolvers": "^3.10.0",
    "concurrently": "^9.1.2"
  },
  "devDependencies": {
    "typescript": "^5.8.3",
    "@types/node": "^22.19.19",
    "@types/react": "^18.3.23",
    "@types/react-dom": "^18.3.7",
    "tailwindcss": "^3.4.17",
    "autoprefixer": "^10.4.21",
    "postcss": "^8.5.6",
    "eslint": "^9.32.0",
    "eslint-config-next": "15.1.0"
  }
}
```

### 2b. `tsconfig.json` (replace entirely)

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "backend"]
}
```

### 2c. `tailwind.config.ts` (replace entirely)

```typescript
import type { Config } from 'tailwindcss'
import tailwindcssAnimate from 'tailwindcss-animate'

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        'store-bg':          'var(--store-bg)',
        'store-surface':     'var(--store-surface)',
        'store-border':      'var(--store-border)',
        'store-text':        'var(--store-text)',
        'store-muted':       'var(--store-muted)',
        'store-accent':      'var(--store-accent)',
        'store-accent-text': 'var(--store-accent-text)',
        'store-accent-soft': 'var(--store-accent-soft)',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
        'store-heading': ['var(--store-heading-font)', 'Georgia', 'serif'],
        'store-body':    ['var(--store-body-font)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        store: 'var(--store-radius)',
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        'marquee': { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        'scroll-announce': { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        'fade-up': { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'slide-in-right': { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'marquee': 'marquee 28s linear infinite',
        'scroll-announce': 'scroll-announce 22s linear infinite',
        'fade-up': 'fade-up 0.5s ease-out both',
        'slide-in-right': 'slide-in-right 0.3s cubic-bezier(0.4,0,0.2,1)',
      },
    },
  },
  plugins: [tailwindcssAnimate],
}

export default config
```

### 2d. `components.json` (replace entirely)

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

### 2e. `next.config.ts` (create new)

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.unsplash.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'storage.googleapis.com' },
      { protocol: 'https', hostname: 'fal.media' },
      { protocol: 'https', hostname: '*.fal.media' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'api.dicebear.com' },
    ],
  },
  env: {
    NEXT_PUBLIC_ROOT_DOMAIN: process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'seltra.store',
  },
  async redirects() {
    return [{ source: '/store', destination: '/dashboard', permanent: false }]
  },
}

export default nextConfig
```

### 2f. `middleware.ts` (create new)

```typescript
import { NextRequest, NextResponse } from 'next/server'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'seltra.store'

export function middleware(req: NextRequest) {
  const url      = req.nextUrl.clone()
  const host     = req.headers.get('host') ?? ''
  const hostname = host.replace(/:\d+$/, '')

  if (hostname === 'localhost' || hostname === '127.0.0.1') return NextResponse.next()
  if (hostname === ROOT_DOMAIN || hostname === `www.${ROOT_DOMAIN}`) return NextResponse.next()
  if (hostname.endsWith('.vercel.app')) return NextResponse.next()

  if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    const subdomain = hostname.replace(`.${ROOT_DOMAIN}`, '')
    const RESERVED  = ['www', 'app', 'api', 'dashboard', 'admin']
    if (RESERVED.includes(subdomain)) return NextResponse.next()
    url.pathname = `/store/${subdomain}${url.pathname}`
    return NextResponse.rewrite(url)
  }

  url.pathname = `/store/${hostname}${url.pathname}`
  return NextResponse.rewrite(url)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt).*)'],
}
```

### 2g. `.env.local` (create new — not committed)

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_ROOT_DOMAIN=localhost
NEXT_PUBLIC_STOREFRONT_URL=http://localhost:3000
API_BASE_URL=http://localhost:3001
```

---

## TASK 3 — Install dependencies

```bash
npm install
npx shadcn@latest init --yes --defaults
npx shadcn@latest add button badge card input separator accordion sheet tooltip
```

---

## TASK 4 — Create directory structure

```bash
mkdir -p app/(dashboard)/dashboard
mkdir -p "app/store/[slug]/order/success"
mkdir -p app/auth
mkdir -p components/storefront/sections
mkdir -p components/storefront/themes
mkdir -p components/storefront/layouts
mkdir -p context
mkdir -p lib
mkdir -p hooks
```

---

## TASK 5 — Write `app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 4%;
    --foreground: 150 15% 92%;
    --card: 0 0% 7%;
    --card-foreground: 150 15% 92%;
    --popover: 0 0% 7%;
    --popover-foreground: 150 15% 92%;
    --primary: 152 55% 42%;
    --primary-foreground: 0 0% 98%;
    --secondary: 0 0% 10%;
    --secondary-foreground: 150 10% 92%;
    --muted: 0 0% 12%;
    --muted-foreground: 150 5% 62%;
    --accent: 152 45% 42%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 70% 55%;
    --destructive-foreground: 0 0% 100%;
    --border: 0 0% 14%;
    --input: 0 0% 12%;
    --ring: 152 55% 42%;
    --radius: 0.625rem;
  }
}

@layer base {
  * { @apply border-border; }
  html { color-scheme: dark; }
  body {
    @apply bg-background text-foreground antialiased;
    font-family: var(--font-geist-sans), system-ui, sans-serif;
  }
}

/* ── Storefront tenant CSS variable defaults ─────────────────────────────
   StorefrontCanvas overrides these per-tenant via an injected <style> tag.
   All storefront section components read ONLY from these variables.
   Zero inline styles in any section component.
────────────────────────────────────────────────────────────────────────── */
.seltra-storefront {
  --store-bg:          #fafafa;
  --store-surface:     #ffffff;
  --store-border:      #e5e5e5;
  --store-text:        #1a1a1a;
  --store-muted:       #717171;
  --store-accent:      #2563eb;
  --store-accent-text: #ffffff;
  --store-accent-soft: #eff6ff;
  --store-heading-font: 'Syne';
  --store-body-font:    'Inter';
  --store-radius:           0.5rem;
  --store-section-spacing:  5rem;
  --store-shadow:           none;

  background-color: var(--store-bg);
  color: var(--store-text);
  font-family: var(--store-body-font), system-ui, sans-serif;
}

/* ── Section spacing helpers ─────────────────────────────────────────── */
.storefront-section {
  padding-top: var(--store-section-spacing);
  padding-bottom: var(--store-section-spacing);
  padding-left: clamp(1rem, 4vw, 2rem);
  padding-right: clamp(1rem, 4vw, 2rem);
}
.storefront-section-tight {
  padding-top: calc(var(--store-section-spacing) * 0.5);
  padding-bottom: calc(var(--store-section-spacing) * 0.5);
  padding-left: clamp(1rem, 4vw, 2rem);
  padding-right: clamp(1rem, 4vw, 2rem);
}

/* ── Storefront typography helpers ───────────────────────────────────── */
.store-heading {
  font-family: var(--store-heading-font), Georgia, serif;
  color: var(--store-text);
  line-height: 0.93;
  letter-spacing: -0.02em;
}
.store-eyebrow {
  font-family: monospace;
  font-size: 0.675rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--store-muted);
}

/* ── Store action buttons ─────────────────────────────────────────────── */
.store-btn-primary {
  background-color: var(--store-accent);
  color: var(--store-accent-text);
  border-radius: var(--store-radius);
  font-weight: 700;
  transition: opacity 0.15s, transform 0.1s;
  cursor: pointer;
  border: none;
}
.store-btn-primary:hover  { opacity: 0.88; }
.store-btn-primary:active { transform: scale(0.97); }

.store-btn-outline {
  border: 1.5px solid var(--store-border);
  color: var(--store-text);
  border-radius: var(--store-radius);
  background: transparent;
  transition: border-color 0.15s;
  cursor: pointer;
}
.store-btn-outline:hover { border-color: var(--store-accent); }

/* ── Product card ─────────────────────────────────────────────────────── */
.store-product-card {
  background: var(--store-surface);
  border: 1px solid var(--store-border);
  border-radius: var(--store-radius);
  overflow: hidden;
  box-shadow: var(--store-shadow);
  transition: transform 0.22s cubic-bezier(0.4,0,0.2,1), box-shadow 0.22s cubic-bezier(0.4,0,0.2,1);
}
.store-product-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 28px rgba(0,0,0,0.09);
}

/* ── Hero mesh gradient background ───────────────────────────────────── */
.store-hero-mesh {
  background:
    radial-gradient(at 40% 20%, color-mix(in srgb, var(--store-accent) 8%, var(--store-bg)) 0px, transparent 55%),
    radial-gradient(at 80% 0%,  color-mix(in srgb, var(--store-accent) 4%, var(--store-surface)) 0px, transparent 50%),
    radial-gradient(at 5%  50%, color-mix(in srgb, var(--store-accent) 5%, transparent) 0px, transparent 50%),
    var(--store-bg);
}

/* ── Announcement scrolling ───────────────────────────────────────────── */
.store-announce-track {
  display: inline-flex;
  gap: 2rem;
  animation: scroll-announce 22s linear infinite;
  white-space: nowrap;
  padding-right: 2rem;
}

/* ── Marquee ─────────────────────────────────────────────────────────── */
.store-marquee-wrap {
  overflow: hidden;
  mask: linear-gradient(90deg, transparent, black 8%, black 92%, transparent);
  -webkit-mask: linear-gradient(90deg, transparent, black 8%, black 92%, transparent);
}
.store-marquee-inner {
  display: flex;
  gap: 1rem;
  width: max-content;
  animation: marquee 28s linear infinite;
}
.store-marquee-inner:hover { animation-play-state: paused; }

/* ── Cart drawer ─────────────────────────────────────────────────────── */
.store-cart-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.45);
  backdrop-filter: blur(3px);
  z-index: 49;
}
.store-cart-drawer {
  position: fixed; top: 0; right: 0;
  width: min(380px, 95vw);
  height: 100dvh;
  background: var(--store-surface);
  border-left: 1px solid var(--store-border);
  z-index: 50;
  display: flex;
  flex-direction: column;
}

/* ── Shelf horizontal scroll ─────────────────────────────────────────── */
.store-shelf-track {
  display: flex; gap: 0.875rem;
  overflow-x: auto; padding-bottom: 0.75rem;
  scrollbar-width: none;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
}
.store-shelf-track::-webkit-scrollbar { display: none; }

/* ── Trust item ──────────────────────────────────────────────────────── */
.store-trust-item {
  display: flex; align-items: center; gap: 0.4rem;
  font-size: 0.73rem; opacity: 0.65; color: var(--store-text);
}

/* ── Dashboard utilities ─────────────────────────────────────────────── */
.glass {
  background: linear-gradient(180deg, hsl(0 0% 100% / 0.04), hsl(0 0% 100% / 0.015));
  backdrop-filter: blur(24px) saturate(140%);
  border: 1px solid hsl(0 0% 100% / 0.08);
  box-shadow: inset 0 1px 0 hsl(0 0% 100% / 0.06), 0 30px 80px -20px hsl(0 0% 0% / 0.6);
}
.auth-aurora {
  background:
    radial-gradient(60% 50% at 20% 20%, hsl(152 60% 30% / 0.35), transparent 60%),
    radial-gradient(50% 50% at 80% 30%, hsl(152 80% 45% / 0.22), transparent 60%),
    radial-gradient(50% 50% at 50% 90%, hsl(152 60% 20% / 0.4), transparent 60%),
    hsl(0 0% 3%);
}
.blink { animation: blink 1s steps(2) infinite; }
.glow-primary { box-shadow: 0 0 0 1px hsl(var(--primary) / 0.4), 0 0 32px hsl(var(--primary) / 0.25); }

@keyframes blink { 50% { opacity: 0; } }
@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 0 0 hsl(var(--primary) / 0.5); }
  50%       { box-shadow: 0 0 0 6px hsl(var(--primary) / 0); }
}
```

---

## TASK 6 — Write `app/layout.tsx`

```tsx
import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'
import { StoreProvider } from '@/context/StoreContext'
import './globals.css'

export const metadata: Metadata = {
  title: 'Seltra — Commerce that runs itself',
  description: 'AI-native commerce platform. Launch your store in minutes.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <StoreProvider>
            {children}
          </StoreProvider>
          <Toaster
            position="bottom-left"
            toastOptions={{
              style: {
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                color: 'hsl(var(--foreground))',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
```

---

## TASK 7 — Write `app/page.tsx`

```tsx
import { redirect } from 'next/navigation'
export default function RootPage() {
  redirect('/dashboard')
}
```

---

## TASK 8 — Write `app/auth/page.tsx`

```tsx
'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mail, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001'

function setToken(t: string) { localStorage.setItem('seltra:token', t) }
function setUser(u: unknown)  { localStorage.setItem('seltra:user', JSON.stringify(u)) }
function getToken()           { return typeof window !== 'undefined' ? localStorage.getItem('seltra:token') : null }

async function apiPost<T>(path: string, body: unknown): Promise<{ data: T | null; error: string | null }> {
  try {
    const res  = await fetch(`${API_BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) return { data: null, error: json?.message ?? `HTTP ${res.status}` }
    return { data: json as T, error: null }
  } catch (e) { return { data: null, error: e instanceof Error ? e.message : 'Network error' } }
}

type AuthResponse = { access_token?: string; token?: string; user: unknown }

export default function AuthPage() {
  const router        = useRouter()
  const params        = useSearchParams()
  const next          = params.get('next') ?? '/dashboard'
  const [mode, setMode]       = useState<'login' | 'signup'>('login')
  const [view, setView]       = useState<'root' | 'email'>('root')
  const [email, setEmail]     = useState('')
  const [password, setPass]   = useState('')
  const [name, setName]       = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { if (getToken()) router.replace('/dashboard') }, [router])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const path = mode === 'signup' ? '/api/v1/auth/signup' : '/api/v1/auth/signin'
    const body = mode === 'signup' ? { email, password, name } : { email, password }
    const { data, error } = await apiPost<AuthResponse>(path, body)
    if (error || !data) { toast.error(error ?? 'Auth failed'); setLoading(false); return }
    const tok = data.access_token ?? (data as { token?: string }).token ?? ''
    setToken(tok); setUser(data.user)
    router.replace(mode === 'signup' ? '/dashboard' : next)
    setLoading(false)
  }

  const handleGoogle = () => {
    const redirect = encodeURIComponent(`${window.location.origin}${next}`)
    window.location.href = `${API_BASE}/api/v1/auth/oauth/google?redirect_uri=${redirect}`
  }

  const isSignup = mode === 'signup'

  return (
    <div className="auth-aurora relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_30%,hsl(0_0%_0%/0.6))]" />
      <div className="relative w-full max-w-md">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20">
            <span className="font-mono text-sm font-bold text-primary">S</span>
          </div>
          <span className="font-mono text-lg font-semibold text-white">seltra</span>
        </Link>
        <div className="glass rounded-3xl p-7 sm:p-9">
          {view === 'root' ? (
            <>
              <div className="mb-8 flex flex-col items-center text-center">
                <h1 className="text-xl font-semibold text-white/95">
                  {isSignup ? 'Create your Seltra account' : 'Sign in to your account'}
                </h1>
                <p className="mt-1 text-sm text-white/50">
                  {isSignup ? 'Your AI commerce agent is one minute away.' : "Welcome back. Let's keep building."}
                </p>
              </div>
              <div className="space-y-3">
                <Button onClick={handleGoogle} className="h-12 w-full rounded-full bg-white font-medium text-black hover:bg-white/90">
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3-3C17.2 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.5 2.7C6 7.1 8.8 5 12 5z"/>
                    <path fill="#4285F4" d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.2c-.3 1.4-1.1 2.6-2.3 3.4l3.5 2.7c2.1-1.9 3.6-4.8 3.6-8.3z"/>
                    <path fill="#FBBC05" d="M5.1 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3L1.6 7C.6 8.5 0 10.2 0 12s.6 3.5 1.6 5l3.5-2.7z"/>
                    <path fill="#34A853" d="M12 23c3 0 5.6-1 7.5-2.7l-3.5-2.7c-1 .7-2.3 1.1-4 1.1-3.2 0-5.9-2.1-6.9-5l-3.5 2.7C3.5 20.4 7.4 23 12 23z"/>
                  </svg>
                  Continue with Google
                </Button>
                <Button onClick={() => setView('email')} variant="outline" className="h-12 w-full rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                  <Mail className="mr-2 h-4 w-4" /> Continue with Email
                </Button>
              </div>
              <p className="mt-8 text-center text-sm text-white/50">
                {isSignup ? 'Have an account? ' : "Don't have an account? "}
                <button onClick={() => setMode(isSignup ? 'login' : 'signup')} className="text-white underline-offset-2 hover:underline">
                  {isSignup ? 'Sign in' : 'Sign up'}
                </button>
              </p>
            </>
          ) : (
            <>
              <button onClick={() => setView('root')} className="mb-5 flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
                <ArrowLeft className="h-3.5 w-3.5" /> back
              </button>
              <h1 className="mb-6 text-xl font-semibold text-white/95">
                {isSignup ? 'Create with email' : 'Sign in with email'}
              </h1>
              <form onSubmit={handleAuth} className="space-y-3">
                {isSignup && (
                  <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required
                    className="h-12 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-white/40" />
                )}
                <Input type="email" placeholder="you@store.com" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-white/40" />
                <Input type="password" placeholder="Password" required minLength={8} value={password} onChange={(e) => setPass(e.target.value)}
                  className="h-12 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-white/40" />
                <Button type="submit" disabled={loading} className="h-12 w-full rounded-full bg-white font-medium text-black hover:bg-white/90">
                  {loading ? '…' : isSignup ? 'Create account' : 'Sign in'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

## TASK 9 — Write `app/(dashboard)/layout.tsx`

```tsx
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
```

---

## TASK 10 — Write `app/(dashboard)/dashboard/page.tsx`

```tsx
'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Send, Plus, LogOut, Package, BarChart3, Home, Store as StoreIcon, ShoppingBag, Image as ImageIcon, Users, Mail, Plug, LifeBuoy, Settings, Paperclip, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import StorefrontPreview, { type StoreData } from '@/components/storefront/StorefrontPreview'
import { StorefrontShell } from '@/components/storefront/StorefrontShell'
import { AgentBuildStream } from '@/components/storefront/AgentBuildStream'
import { useStore } from '@/context/StoreContext'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001'

function getToken()  { return typeof window !== 'undefined' ? localStorage.getItem('seltra:token') : null }
function getUser()   { try { const r = localStorage.getItem('seltra:user'); return r ? JSON.parse(r) : null } catch { return null } }
function clearAuth() { ['seltra:token','seltra:user','seltra:active_store'].forEach((k) => localStorage.removeItem(k)) }

async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<{ data: T | null; error: string | null }> {
  const token = getToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(opts.headers as Record<string, string> ?? {}) }
  if (token) headers['Authorization'] = `Bearer ${token}`
  try {
    const res  = await fetch(`${API_BASE}${path}`, { ...opts, headers })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { if (res.status === 401) clearAuth(); return { data: null, error: json?.message ?? `HTTP ${res.status}` } }
    return { data: json as T, error: null }
  } catch (e) { return { data: null, error: e instanceof Error ? e.message : 'Network error' } }
}

const NAV_TABS = [
  { id: 'home',      label: 'Home',      icon: Home      },
  { id: 'store',     label: 'Store',     icon: StoreIcon  },
  { id: 'orders',    label: 'Orders',    icon: ShoppingBag},
  { id: 'products',  label: 'Products',  icon: Package   },
  { id: 'customers', label: 'Customers', icon: Users     },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'emails',    label: 'Emails',    icon: Mail      },
  { id: 'settings',  label: 'Settings',  icon: Settings  },
]

type Msg = { role: 'user' | 'assistant'; content: string }

function buildFeedback(store: StoreData): string {
  const c         = (store as unknown as { canonical: Record<string, unknown> }).canonical ?? {}
  const cats      = Array.isArray(c.productCategories) ? (c.productCategories as string[]).join(', ') : 'your catalog'
  const feats     = Array.isArray(c.storeFeatures)     ? (c.storeFeatures as string[]).slice(0,4).join(', ') : 'a polished storefront'
  const prodCount = Array.isArray(store.products) ? store.products.length : 0
  return [
    `${store.name} is ready.`,
    `Positioned for ${store.targetAudience ?? 'your customers'} with ${prodCount} products across ${cats}.`,
    `Includes ${feats}. Paystack is wired for checkout.`,
    `Ask me to add products, change the theme, or refine the copy.`,
  ].join('\n\n')
}

function getBuildSteps(store: StoreData | null, building: boolean) {
  return [
    { label: 'Analyzing your prompt',        done: Boolean(store) || building },
    { label: 'Generating product catalog',    done: Boolean((store?.products?.length ?? 0) > 0) },
    { label: 'Creating product images',       done: Boolean(store?.products?.some((p: unknown) => { const pr = p as {images?: unknown[]}; return Array.isArray(pr.images) && pr.images.length > 0 })) },
    { label: 'Setting up Paystack',           done: Boolean((store as unknown as { paymentProviders?: unknown[] })?.paymentProviders?.length) },
    { label: 'Deploying storefront',          done: Boolean(store?.slug && store?.storefrontCode) },
  ]
}

export default function DashboardPage() {
  const router = useRouter()
  const { activeStore, setActiveStore } = useStore()
  const [user,    setUser]    = useState<{ email: string; name: string; avatar: string } | null>(null)
  const [msgs,    setMsgs]    = useState<Msg[]>([])
  const [input,   setInput]   = useState('')
  const [sending, setSending] = useState(false)
  const [tab,     setTab]     = useState('home')
  const [rev,     setRev]     = useState(0)
  const [convId,  setConvId]  = useState<string | undefined>()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!getToken()) { router.replace('/auth'); return }
    const u = getUser()
    if (u) {
      const m = u.user_metadata ?? {}
      setUser({ email: u.email, name: m.full_name || m.name || u.email?.split('@')[0] || '', avatar: m.avatar_url || m.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.email}` })
    }
    const pending = sessionStorage.getItem('seltra:pending_prompt')
    if (pending) { sessionStorage.removeItem('seltra:pending_prompt'); void startConv(pending) }
  }, [router])

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }) }, [msgs])

  const appendChunk = (chunk: string) => {
    setMsgs((prev) => {
      const last = prev[prev.length - 1]
      if (!last || last.role !== 'assistant') return [...prev, { role: 'assistant', content: chunk }]
      return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: m.content + chunk } : m)
    })
  }

  const sendToAgent = useCallback(async (storeId: string, message: string) => {
    const token = getToken()
    setMsgs((prev) => [...prev, { role: 'assistant', content: '' }])
    let streamed = ''
    try {
      const res = await fetch(`${API_BASE}/api/v1/seltra/agent/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ storeId, message, conversationId: convId }),
      })
      if (res.ok && res.body) {
        const reader = res.body.getReader(); const dec = new TextDecoder()
        while (true) {
          const { value, done } = await reader.read(); if (done) break
          const raw = dec.decode(value, { stream: true })
          for (const line of raw.split(/\r?\n/).filter(Boolean)) {
            const norm = line.startsWith('data:') ? line.slice(5).trim() : line
            if (!norm || norm === '[DONE]') continue
            try {
              const j = JSON.parse(norm)
              if (j.conversationId) setConvId(j.conversationId)
              const chunk = j.chunk ?? j.delta ?? j.text ?? j.reply ?? j.message ?? ''
              if (chunk) { streamed += chunk; appendChunk(chunk) }
              if (Array.isArray(j.actions)) j.actions.forEach((a: { action: string }) => {
                if (a.action === 'ADD_PRODUCT' || a.action === 'REFETCH_STOREFRONT') { setRev((v) => v + 1) }
              })
            } catch { streamed += norm; appendChunk(norm) }
          }
        }
        return streamed
      }
    } catch { /* fall through */ }
    const { data } = await apiFetch<{ reply?: string; message?: string; conversationId?: string }>(
      '/api/v1/seltra/agent/message',
      { method: 'POST', body: JSON.stringify({ storeId, message, conversationId: convId }) }
    )
    if (data?.conversationId) setConvId(data.conversationId)
    const reply = data?.reply ?? data?.message ?? ''
    setMsgs((prev) => prev.map((m, i) => i === prev.length - 1 ? { ...m, content: reply } : m))
    return reply
  }, [convId])

  const startConv = async (prompt: string) => {
    setSending(true)
    setMsgs([{ role: 'user', content: prompt }])
    let store = activeStore
    if (!store) {
      const { data } = await apiFetch<{ store: StoreData }>('/api/v1/seltra/store', { method: 'POST', body: JSON.stringify({ name: prompt.slice(0, 48), prompt }) })
      if (data?.store) { store = data.store; setActiveStore(data.store); setRev((v) => v + 1) }
    }
    if (store) setMsgs((prev) => [...prev, { role: 'assistant', content: buildFeedback(store!) }])
    setSending(false)
  }

  const send = async () => {
    const text = input.trim(); if (!text || sending) return
    setInput(''); setSending(true)
    setMsgs((prev) => [...prev, { role: 'user', content: text }])
    if (!activeStore) { await startConv(text); setSending(false); return }
    await sendToAgent(activeStore.id ?? activeStore.slug, text)
    setSending(false)
  }

  const signOut = () => { clearAuth(); setActiveStore(null); router.push('/auth') }

  const hasStore = Boolean(activeStore) || msgs.length > 0
  const storeTitle = activeStore?.name ?? msgs[0]?.content?.slice(0, 40) ?? 'My Store'
  const storeSlug  = activeStore?.slug ?? storeTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)
  const buildSteps = getBuildSteps(activeStore, sending)

  if (tab !== 'home') return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar user={user} tab={tab} setTab={setTab} onSignOut={signOut} />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-6 py-10">
            <div className="font-mono text-[11px] text-primary mb-2">// {tab}</div>
            <h1 className="text-2xl font-bold tracking-tight capitalize">{tab}</h1>
            <div className="mt-8 rounded-xl border border-dashed border-border bg-card/30 p-10 text-center">
              <p className="text-sm text-muted-foreground">Coming soon — ask your agent to manage this from the Home tab.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar user={user} tab={tab} setTab={setTab} onSignOut={signOut} />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {!hasStore ? (
          <EmptyState input={input} setInput={setInput} send={send} sending={sending} name={user?.name ?? ''} onAttach={(f) => setInput((p) => p ? `${p}\nI uploaded "${f.name}".` : `I uploaded "${f.name}".`)} />
        ) : (
          <div className="grid min-h-0 flex-1 lg:grid-cols-[2fr_3fr]">
            <section className="flex min-h-0 flex-col border-r border-border bg-background">
              <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-5 py-3">
                <span className="font-mono text-xs text-primary">// agent {activeStore ? `for ${activeStore.name}` : ''}</span>
                <span className={`font-mono text-[10px] rounded border px-2 py-0.5 ${sending ? 'border-yellow-500/40 text-yellow-500' : 'border-primary/40 text-primary'}`}>{sending ? 'WORKING' : 'READY'}</span>
              </div>
              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-5 text-[13px]">
                {msgs.length === 0 && !sending && (
                  <div className="rounded-lg border border-border bg-card/30 p-4 text-sm text-muted-foreground">
                    {activeStore ? `Tell me what to change in ${activeStore.name}. Products, colors, copy, or attach a logo.` : 'Start a conversation to launch your store.'}
                  </div>
                )}
                {msgs.map((m, i) => (
                  <div key={i}>
                    <div className={`font-mono text-[10px] uppercase tracking-wider mb-1 ${m.role === 'user' ? 'text-muted-foreground' : 'text-primary'}`}>{m.role === 'user' ? 'you' : 'agent'}</div>
                    <div className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-foreground/90">{m.content}</div>
                  </div>
                ))}
                {sending && <div className="text-muted-foreground">agent thinking<span className="animate-pulse">_</span></div>}
              </div>
              <ChatInput input={input} setInput={setInput} send={send} sending={sending} onAttach={(f) => { setInput((p) => p ? `${p}\nI uploaded "${f.name}".` : `I uploaded "${f.name}".`); toast.success(`${f.name} attached`, { duration: 1400 }) }} compact />
            </section>
            <StorefrontShell slug={storeSlug}>
              {sending && !activeStore?.storefrontCode ? (
                <div className="min-h-[560px]"><AgentBuildStream storeName={storeTitle} buildSteps={buildSteps} isBuilding={sending} /></div>
              ) : (
                <StorefrontPreview key={`${storeSlug}-${rev}`} storeSlug={storeSlug} />
              )}
            </StorefrontShell>
          </div>
        )}
      </main>
    </div>
  )
}

function Sidebar({ user, tab, setTab, onSignOut }: { user: { email: string; name: string; avatar: string } | null; tab: string; setTab: (t: string) => void; onSignOut: () => void }) {
  return (
    <aside className="hidden w-56 flex-col border-r border-border bg-card/40 lg:flex">
      <div className="flex items-center gap-2 border-b border-border px-4 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/20"><span className="font-mono text-xs font-bold text-primary">S</span></div>
        <span className="font-mono font-semibold tracking-tight">seltra</span>
        <span className="ml-auto font-mono text-[9px] text-muted-foreground border border-border rounded px-1 py-0.5">beta</span>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
        {NAV_TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${tab === t.id ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}>
            <t.icon className="h-4 w-4 flex-shrink-0" />{t.label}
          </button>
        ))}
      </nav>
      {user && (
        <div className="flex items-center gap-2 border-t border-border p-3">
          <Image src={user.avatar} alt={user.name} width={32} height={32} className="rounded-full border border-border" unoptimized />
          <div className="min-w-0 flex-1">
            {user.name && <div className="truncate text-xs font-medium">{user.name}</div>}
            <div className="truncate font-mono text-[11px] text-muted-foreground">{user.email}</div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onSignOut}><LogOut className="h-4 w-4" /></Button>
        </div>
      )}
    </aside>
  )
}

function EmptyState({ input, setInput, send, sending, name, onAttach }: { input: string; setInput: (v: string) => void; send: () => void; sending: boolean; name: string; onAttach: (f: File) => void }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="max-w-xl text-center">
          <h1 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">{name ? `Welcome back, ${name.split(' ')[0]}.` : 'Welcome to Seltra.'}</h1>
          <p className="text-sm text-muted-foreground sm:text-base">Describe your store and your agent will build it in seconds.</p>
        </div>
      </div>
      <ChatInput input={input} setInput={setInput} send={send} sending={sending} onAttach={onAttach} />
    </div>
  )
}

function ChatInput({ input, setInput, send, sending, onAttach, compact = false }: { input: string; setInput: (v: string) => void; send: () => void; sending: boolean; onAttach: (f: File) => void; compact?: boolean }) {
  return (
    <div className={`border-t border-border bg-card/40 backdrop-blur ${compact ? 'p-3' : 'p-4 sm:p-6'}`}>
      <div className={`${compact ? '' : 'mx-auto max-w-3xl'} flex items-end gap-2`}>
        <textarea value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          rows={1} placeholder="Message your agent…"
          className="max-h-40 flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <label className="flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:text-primary">
          <Paperclip className="h-4 w-4" />
          <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) onAttach(f); e.target.value = '' }} />
        </label>
        <Button onClick={send} disabled={sending || !input.trim()} size="icon" className="h-10 w-10 flex-shrink-0"><Send className="h-4 w-4" /></Button>
      </div>
    </div>
  )
}
```

---

## TASK 11 — Write `app/store/[slug]/page.tsx`

```tsx
import { Suspense } from 'react'
import type { Metadata } from 'next'
import { StorefrontCanvas } from '@/components/storefront/StorefrontCanvas'

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:3001'

async function getStore(slug: string) {
  try {
    const res = await fetch(`${API_BASE}/api/v1/seltra/store/${encodeURIComponent(slug)}`, { next: { revalidate: 30 } })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const store = await getStore(params.slug)
  if (!store) return { title: 'Store — Seltra' }
  return {
    title: `${store.name} — Powered by Seltra`,
    description: store.targetAudience ? `${store.name} — for ${store.targetAudience}.` : `${store.name} — shop online.`,
  }
}

function Skeleton() {
  return (
    <div className="min-h-screen animate-pulse" style={{ background: '#fafafa' }}>
      <div className="h-14 border-b border-gray-100 bg-white" />
      <div className="flex h-[60vh] items-center justify-center bg-gray-50">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-gray-400" />
      </div>
    </div>
  )
}

function fallback(slug: string) {
  const name = slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  return {
    id: `fallback-${slug}`, name, slug,
    businessType: 'AI-built storefront', targetAudience: 'modern shoppers',
    heroTitle: name, heroSubtitle: 'A polished storefront.',
    canonical: { storeFeatures: ['Fast checkout','Curated catalog','Local delivery','AI merchandising'], productCategories: ['Starter','Signature','Gift'], recommendedTechStack: { paymentGateways: ['Paystack'] } },
    products: [
      { id:`${slug}-1`, name:'Signature Starter Set', description:'A ready-to-launch bundle.',  price: 49, currency:'GHS', category:'Signature' },
      { id:`${slug}-2`, name:'Daily Essential',        description:'Your hero product.',         price: 28, currency:'GHS', category:'Starter'   },
      { id:`${slug}-3`, name:'Gift Box',               description:'A premium giftable option.', price: 72, currency:'GHS', category:'Gift'      },
    ],
  }
}

export default async function StorefrontPage({ params }: { params: { slug: string } }) {
  const store = (await getStore(params.slug)) ?? fallback(params.slug)
  const dna  = (store as { storeDNA?: { brandPersonality?: string } }).storeDNA
  const cv   = (store as { canonical?: { layoutVariant?: string } }).canonical
  const themeKey =
    dna?.brandPersonality === 'luxury'    ? 'luxury'
    : cv?.layoutVariant   === 'bold'      ? 'bold-dark'
    : cv?.layoutVariant   === 'editorial' ? 'editorial'
    : 'minimal-light'

  return (
    <Suspense fallback={<Skeleton />}>
      <StorefrontCanvas store={store} storeSlug={params.slug} minHeightClass="min-h-screen" themeKey={themeKey} />
    </Suspense>
  )
}
```

---

## TASK 12 — Write `app/store/[slug]/order/success/page.tsx`

```tsx
import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function OrderSuccessPage({ params }: { params: { slug: string } }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-sm text-center">
        <CheckCircle className="mx-auto mb-4 h-14 w-14 text-primary" />
        <h1 className="mb-2 text-2xl font-bold tracking-tight">Order confirmed!</h1>
        <p className="mb-6 text-sm text-muted-foreground">Thank you for your purchase. Receipt sent by email.</p>
        <Button asChild><Link href={`/store/${params.slug}`}>Continue shopping</Link></Button>
      </div>
    </div>
  )
}
```

---

## TASK 13 — Write `lib/utils.ts`

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

---

## TASK 14 — Write `context/StoreContext.tsx`

```tsx
'use client'
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { StoreData } from '@/components/storefront/StorefrontPreview'

const KEY = 'seltra:active_store'

type Ctx = { activeStore: StoreData | null; setActiveStore: (s: StoreData | null) => void }

const StoreContext = createContext<Ctx | undefined>(undefined)

function read(): StoreData | null {
  if (typeof window === 'undefined') return null
  try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : null } catch { return null }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [store, setStoreState] = useState<StoreData | null>(() => read())
  const value = useMemo<Ctx>(() => ({
    activeStore: store,
    setActiveStore: (s) => {
      setStoreState(s)
      if (typeof window !== 'undefined') { if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY) }
    },
  }), [store])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
```

---

## TASK 15 — Write `components/storefront/sections/types.ts`

```typescript
export interface StorePalette {
  bg: string; surface: string; border: string; text: string
  muted: string; accent: string; accentText: string; accentSoft: string
}
export interface StoreTypography { headingFont: string; bodyFont: string }
export interface StoreProduct {
  id: string; name: string; description?: string | null
  price: string | number; currency: string; category?: string | null
  images?: Array<{ url: string; isPrimary?: boolean }>
  variants?: Array<{ name: string; value: string }>
}
export interface StoreManifest { sections: ManifestSection[]; palette: StorePalette; typography: StoreTypography }
export type ManifestSection =
  | { type: 'hero-centered';   headline: string; tagline: string; subtext: string; eyebrow?: string; ctaLabel?: string }
  | { type: 'hero-split';      headline: string; tagline: string; subtext: string; eyebrow?: string; ctaLabel?: string }
  | { type: 'hero-editorial';  headline: string; tagline: string; subtext: string; eyebrow?: string; ctaLabel?: string }
  | { type: 'hero-fullbleed';  headline: string; tagline: string; subtext: string; eyebrow?: string; ctaLabel?: string }
  | { type: 'hero-minimal';    headline: string; subtext?: string; eyebrow?: string; ctaLabel?: string }
  | { type: 'announcement-bar';  message: string }
  | { type: 'featured-drop';     badge: string; headline: string; subtext: string; showCountdown?: boolean }
  | { type: 'product-grid';      columns: 2 | 3 | 4; style: string; limit?: number; showCategory?: boolean; sectionLabel?: string }
  | { type: 'product-shelf';     headline: string; subtext?: string; limit?: number }
  | { type: 'brand-story';       headline: string; body: string; stat?: string; statLabel?: string; layout: 'text-left' | 'text-center' }
  | { type: 'category-strip';    headline?: string }
  | { type: 'social-proof';      style: 'marquee' | 'grid' | 'cards'; headline?: string; subtext?: string }
  | { type: 'trust-bar';         items: string[] }
  | { type: 'newsletter';        headline: string; subtext: string; placeholder?: string }
  | { type: 'faq';               headline?: string; items?: Array<{ question: string; answer: string }> }
  | { type: 'countdown-banner';  message?: string }
  | { type: 'before-after';      headline?: string; beforeLabel?: string; afterLabel?: string; variant?: 'split' | 'cards' }
  | { type: 'founder-story';     founderName?: string; story?: string; variant?: 'portrait-left' | 'portrait-right' | 'minimal' }
  | { type: 'ingredients-list';  headline?: string; items?: Array<{ name: string; benefit: string }>; variant?: 'grid' | 'horizontal' }
  | { type: 'lookbook-grid';     headline?: string; images?: Array<{ url: string; caption?: string }>; variant?: 'masonry' | 'editorial' | 'uniform' }
```

---

## TASK 16 — Write `components/storefront/themes/index.ts`

```typescript
export type ThemeKey = 'luxury' | 'bold-dark' | 'minimal-light' | 'editorial' | 'warm-earth' | 'cool-modern' | 'vibrant'

export interface DesignTokens {
  primaryColor: string; surfaceColor: string; borderColor: string; textColor: string
  mutedColor: string; accentColor: string; accentTextColor: string; accentSoftColor: string
  headingFont: string; bodyFont: string
  borderRadius: 'sharp' | 'rounded' | 'pill'
  spacing: 'compact' | 'comfortable' | 'spacious'
  shadow: 'none' | 'subtle' | 'elevated'
}

export const THEMES: Record<ThemeKey, DesignTokens> = {
  luxury:          { primaryColor:'#faf9f7', surfaceColor:'#ffffff', borderColor:'#e8e4df', textColor:'#1a1a1a', mutedColor:'#7a7060', accentColor:'#b8860b', accentTextColor:'#ffffff', accentSoftColor:'#fdf5e4', headingFont:'Playfair Display', bodyFont:'DM Sans',  borderRadius:'rounded', spacing:'spacious',    shadow:'subtle'   },
  'bold-dark':     { primaryColor:'#0d0d0d', surfaceColor:'#141414', borderColor:'#2a2a2a', textColor:'#f0f0f0', mutedColor:'#888888', accentColor:'#ff3c00', accentTextColor:'#ffffff', accentSoftColor:'#1f1008', headingFont:'Bebas Neue',       bodyFont:'Inter',   borderRadius:'sharp',   spacing:'compact',     shadow:'none'     },
  'minimal-light': { primaryColor:'#fafafa', surfaceColor:'#ffffff', borderColor:'#e5e5e5', textColor:'#1a1a1a', mutedColor:'#717171', accentColor:'#2563eb', accentTextColor:'#ffffff', accentSoftColor:'#eff6ff', headingFont:'Syne',             bodyFont:'Inter',   borderRadius:'rounded', spacing:'comfortable', shadow:'subtle'   },
  editorial:       { primaryColor:'#f8f6f3', surfaceColor:'#ffffff', borderColor:'#e0d8ce', textColor:'#1c1815', mutedColor:'#8c7b6b', accentColor:'#c4622d', accentTextColor:'#ffffff', accentSoftColor:'#f9ede8', headingFont:'Fraunces',         bodyFont:'DM Sans', borderRadius:'rounded', spacing:'spacious',    shadow:'subtle'   },
  'warm-earth':    { primaryColor:'#faf7f2', surfaceColor:'#ffffff', borderColor:'#e8dfd0', textColor:'#2d2419', mutedColor:'#8a7560', accentColor:'#c4622d', accentTextColor:'#ffffff', accentSoftColor:'#f5ece6', headingFont:'Fraunces',         bodyFont:'DM Sans', borderRadius:'pill',    spacing:'comfortable', shadow:'subtle'   },
  'cool-modern':   { primaryColor:'#f0f4f8', surfaceColor:'#ffffff', borderColor:'#dde3ea', textColor:'#0f1923', mutedColor:'#627282', accentColor:'#0070f3', accentTextColor:'#ffffff', accentSoftColor:'#e8f0fe', headingFont:'Inter',            bodyFont:'Inter',   borderRadius:'rounded', spacing:'comfortable', shadow:'elevated' },
  vibrant:         { primaryColor:'#0a0a0a', surfaceColor:'#111111', borderColor:'#1f1f1f', textColor:'#ffffff', mutedColor:'#888888', accentColor:'#00e676', accentTextColor:'#000000', accentSoftColor:'#00e67615', headingFont:'Syne',           bodyFont:'Inter',   borderRadius:'rounded', spacing:'compact',     shadow:'none'     },
}

export function getTheme(key: ThemeKey): DesignTokens { return THEMES[key] ?? THEMES['minimal-light'] }

export function tokensToPalette(t: DesignTokens) {
  return { bg: t.primaryColor, surface: t.surfaceColor, border: t.borderColor, text: t.textColor, muted: t.mutedColor, accent: t.accentColor, accentText: t.accentTextColor, accentSoft: t.accentSoftColor }
}
```

---

## TASK 17 — Write `components/storefront/layouts/index.ts`

```typescript
export type LayoutKey = 'editorial' | 'conversion' | 'storytelling' | 'catalog' | 'showcase'

export interface LayoutSection { type: string; required: boolean; defaultVariant: string; position: 'top' | 'middle' | 'bottom' }
export interface LayoutTemplate  { name: string; description: string; sections: LayoutSection[] }

export const LAYOUTS: Record<LayoutKey, LayoutTemplate> = {
  editorial:    { name: 'Editorial Commerce',  description: 'Fashion/beauty magazine feel.',
    sections: [
      { type: 'hero',          required: true,  defaultVariant: 'editorial', position: 'top'    },
      { type: 'trust-bar',     required: false, defaultVariant: 'minimal',   position: 'top'    },
      { type: 'product-shelf', required: false, defaultVariant: 'default',   position: 'middle' },
      { type: 'brand-story',   required: true,  defaultVariant: 'text-left', position: 'middle' },
      { type: 'product-grid',  required: true,  defaultVariant: 'uniform',   position: 'middle' },
      { type: 'social-proof',  required: false, defaultVariant: 'cards',     position: 'bottom' },
      { type: 'newsletter',    required: false, defaultVariant: 'default',   position: 'bottom' },
    ]},
  conversion:   { name: 'Conversion Focused',  description: 'Trust signals front and center.',
    sections: [
      { type: 'announcement-bar', required: false, defaultVariant: 'default',        position: 'top'    },
      { type: 'hero',             required: true,  defaultVariant: 'centered',        position: 'top'    },
      { type: 'trust-bar',        required: true,  defaultVariant: 'default',         position: 'top'    },
      { type: 'category-strip',   required: false, defaultVariant: 'default',         position: 'middle' },
      { type: 'product-grid',     required: true,  defaultVariant: 'featured-first',  position: 'middle' },
      { type: 'social-proof',     required: true,  defaultVariant: 'marquee',         position: 'middle' },
      { type: 'newsletter',       required: false, defaultVariant: 'default',         position: 'bottom' },
    ]},
  storytelling: { name: 'Brand Storytelling',  description: 'Why before what.',
    sections: [
      { type: 'hero',          required: true,  defaultVariant: 'split',       position: 'top'    },
      { type: 'brand-story',   required: true,  defaultVariant: 'text-center', position: 'top'    },
      { type: 'product-shelf', required: true,  defaultVariant: 'default',     position: 'middle' },
      { type: 'social-proof',  required: true,  defaultVariant: 'grid',        position: 'middle' },
      { type: 'product-grid',  required: true,  defaultVariant: 'magazine',    position: 'middle' },
      { type: 'newsletter',    required: true,  defaultVariant: 'default',     position: 'bottom' },
    ]},
  catalog:      { name: 'Catalog Browse',      description: 'Browse-first experience.',
    sections: [
      { type: 'hero',           required: true,  defaultVariant: 'minimal', position: 'top'    },
      { type: 'category-strip', required: true,  defaultVariant: 'default', position: 'top'    },
      { type: 'trust-bar',      required: true,  defaultVariant: 'default', position: 'top'    },
      { type: 'product-grid',   required: true,  defaultVariant: 'dense',   position: 'middle' },
      { type: 'social-proof',   required: false, defaultVariant: 'marquee', position: 'bottom' },
    ]},
  showcase:     { name: 'Drop Showcase',        description: 'Scarcity and hype.',
    sections: [
      { type: 'announcement-bar', required: true,  defaultVariant: 'default',   position: 'top'    },
      { type: 'hero',             required: true,  defaultVariant: 'fullbleed',  position: 'top'    },
      { type: 'featured-drop',    required: true,  defaultVariant: 'countdown',  position: 'top'    },
      { type: 'category-strip',   required: false, defaultVariant: 'default',    position: 'middle' },
      { type: 'product-grid',     required: true,  defaultVariant: 'dense',      position: 'middle' },
      { type: 'trust-bar',        required: false, defaultVariant: 'default',     position: 'bottom' },
    ]},
}
```

---

## TASK 18 — Write `components/storefront/StorefrontCanvas.tsx`

```tsx
'use client'
import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { ShoppingBag } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AnnouncementBar }   from './sections/AnnouncementBar'
import { HeroSection }       from './sections/HeroSection'
import { TrustBar }          from './sections/TrustBar'
import { CategoryStrip }     from './sections/CategoryStrip'
import { ProductGrid }       from './sections/ProductGrid'
import { ProductShelf }      from './sections/ProductShelf'
import { BrandStory }        from './sections/BrandStory'
import { SocialProof }       from './sections/SocialProof'
import { Newsletter }        from './sections/Newsletter'
import { FeaturedDrop }      from './sections/FeaturedDrop'
import { FAQSection }        from './sections/FAQSection'
import { CountdownBanner }   from './sections/CountdownBanner'
import { BeforeAfter }       from './sections/BeforeAfter'
import { FounderStory }      from './sections/FounderStory'
import { IngredientsList }   from './sections/IngredientsList'
import { LookbookGrid }      from './sections/LookbookGrid'
import { CartDrawer }        from './sections/CartDrawer'
import type { StoreProduct, StoreManifest, ManifestSection, StorePalette, StoreTypography } from './sections/types'

export interface CartItem { product: StoreProduct; quantity: number }
export interface StoreData {
  id?: string; name: string; slug: string; businessType?: string; targetAudience?: string
  heroTitle?: string; heroSubtitle?: string
  canonical?: { storeFeatures?: string[]; productCategories?: string[]; layoutVariant?: string; recommendedTechStack?: { paymentGateways?: string[] } }
  storeDNA?: { brandPersonality?: string; industry?: string }
  products?: Array<{ id: string; name: string; description?: string | null; price: string | number; currency?: string; category?: string | null; images?: Array<{ url: string; isPrimary?: boolean }>; variants?: Array<{ name: string; value: string }> }>
  storefrontCode?: string | null; storefrontVersion?: number
}

const RADIUS_MAP: Record<string, string> = { luxury:'0.5rem', 'bold-dark':'0px', 'minimal-light':'0.5rem', editorial:'0.5rem', 'warm-earth':'999px', 'cool-modern':'0.5rem', vibrant:'0.375rem' }
const SPACING_MAP: Record<string, string> = { luxury:'6rem', 'bold-dark':'3.5rem', 'minimal-light':'5rem', editorial:'6rem', 'warm-earth':'5rem', 'cool-modern':'5rem', vibrant:'3.5rem' }
const SHADOW_MAP:  Record<string, string> = { luxury:'0 2px 12px rgba(0,0,0,0.06)', 'bold-dark':'none', 'minimal-light':'0 1px 4px rgba(0,0,0,0.06)', editorial:'0 2px 8px rgba(0,0,0,0.05)', 'warm-earth':'0 2px 8px rgba(0,0,0,0.05)', 'cool-modern':'0 4px 16px rgba(0,0,0,0.08)', vibrant:'none' }

function buildThemeVars(p: StorePalette, t: StoreTypography, themeKey: string): string {
  return `--store-bg:${p.bg};--store-surface:${p.surface};--store-border:${p.border};--store-text:${p.text};--store-muted:${p.muted};--store-accent:${p.accent};--store-accent-text:${p.accentText};--store-accent-soft:${p.accentSoft};--store-heading-font:'${t.headingFont}';--store-body-font:'${t.bodyFont}';--store-radius:${RADIUS_MAP[themeKey]??'0.5rem'};--store-section-spacing:${SPACING_MAP[themeKey]??'5rem'};--store-shadow:${SHADOW_MAP[themeKey]??'none'};`
}

function extractManifest(html: string, store: StoreData): StoreManifest {
  const m = html.match(/<!-- SELTRA_MANIFEST: (.+?) -->/)
  if (m?.[1]) { try { return JSON.parse(m[1]) } catch {} }
  return deriveManifest(store)
}

function deriveManifest(store: StoreData): StoreManifest {
  const c = [store.name, store.businessType ?? '', store.targetAudience ?? ''].join(' ').toLowerCase()
  const isFood    = /food|restaurant|cafe|snack|drink/.test(c)
  const isBeauty  = /beauty|skincare|cosmetic|luxury|jewelry|wellness|serum/.test(c)
  const isBold    = /streetwear|sneaker|sport|gym|gaming|tech|hype/.test(c)
  const palette: StorePalette = isFood
    ? { bg:'#faf7f2',surface:'#ffffff',border:'#e8dfd0',text:'#2d2419',muted:'#8a7560',accent:'#c4622d',accentText:'#ffffff',accentSoft:'#f5ece6' }
    : isBeauty
    ? { bg:'#faf9f7',surface:'#ffffff',border:'#e8e4df',text:'#1a1a1a',muted:'#7a7060',accent:'#b8860b',accentText:'#ffffff',accentSoft:'#fdf5e4' }
    : isBold
    ? { bg:'#0d0d0d',surface:'#141414',border:'#2a2a2a',text:'#f0f0f0',muted:'#888888',accent:'#ff3c00',accentText:'#ffffff',accentSoft:'#1f1008' }
    : { bg:'#fafafa',surface:'#ffffff',border:'#e5e5e5',text:'#1a1a1a',muted:'#717171',accent:'#2563eb',accentText:'#ffffff',accentSoft:'#eff6ff' }
  const typography: StoreTypography = isFood ? { headingFont:'Fraunces',bodyFont:'DM Sans' } : isBeauty ? { headingFont:'Playfair Display',bodyFont:'DM Sans' } : isBold ? { headingFont:'Bebas Neue',bodyFont:'Inter' } : { headingFont:'Syne',bodyFont:'Inter' }
  return {
    sections: [
      { type:'hero-centered', headline:store.heroTitle??store.name, tagline:store.heroSubtitle??'Shop the collection.', subtext:`For ${store.targetAudience??'your customers'}.`, eyebrow:store.businessType??'' },
      { type:'trust-bar', items:store.canonical?.storeFeatures?.slice(0,4)??['Secure checkout','Fast delivery','Easy returns','Local support'] },
      { type:'category-strip' },
      { type:'product-grid', columns:3, style:'uniform', showCategory:true, sectionLabel:'Products' },
      { type:'social-proof', style:'marquee' },
      { type:'newsletter', headline:'Stay in the loop', subtext:'Get updates and exclusive offers.' },
    ],
    palette, typography,
  }
}

const SectionFade = ({ children, i }: { children: React.ReactNode; i: number }) => (
  <motion.div initial={{ opacity:0, y:24 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true, margin:'-60px' }} transition={{ duration:0.5, delay:0.04, ease:[0.4,0,0.2,1] }}>
    {children}
  </motion.div>
)

function renderSection(section: ManifestSection, i: number, props: { products: StoreProduct[]; features: string[]; categories: string[]; onAddToCart: (p: StoreProduct) => void; storeName: string }) {
  const W = ({ children }: { children: React.ReactNode }) => <SectionFade i={i}>{children}</SectionFade>
  const { products, features, categories, onAddToCart, storeName } = props

  switch (section.type) {
    case 'announcement-bar':  return <AnnouncementBar key={i} message={section.message} />
    case 'countdown-banner':  return <W key={i}><CountdownBanner message={(section as {message?:string}).message} /></W>
    case 'hero-centered': case 'hero-split': case 'hero-editorial': case 'hero-fullbleed': case 'hero-minimal':
      return <HeroSection key={i} section={section} products={products} features={features} storeName={storeName} />
    case 'trust-bar':         return <W key={i}><TrustBar items={section.items} /></W>
    case 'category-strip':    return <W key={i}><CategoryStrip categories={categories} headline={section.headline} /></W>
    case 'featured-drop':     return <W key={i}><FeaturedDrop section={section} products={products} onAddToCart={onAddToCart} /></W>
    case 'product-grid':      return <W key={i}><ProductGrid section={section} products={products} onAddToCart={onAddToCart} /></W>
    case 'product-shelf':     return <W key={i}><ProductShelf section={section} products={products} onAddToCart={onAddToCart} storeName={storeName} /></W>
    case 'brand-story':       return <W key={i}><BrandStory {...section} /></W>
    case 'social-proof':      return <W key={i}><SocialProof style={section.style} headline={section.headline} subtext={section.subtext} /></W>
    case 'newsletter':        return <W key={i}><Newsletter headline={section.headline} subtext={section.subtext} placeholder={section.placeholder} /></W>
    case 'faq':               return <W key={i}><FAQSection items={(section as {items?:Array<{question:string;answer:string}>}).items} headline={(section as {headline?:string}).headline} /></W>
    case 'before-after':      return <W key={i}><BeforeAfter headline={(section as {headline?:string}).headline} beforeLabel={(section as {beforeLabel?:string}).beforeLabel} afterLabel={(section as {afterLabel?:string}).afterLabel} /></W>
    case 'founder-story':     return <W key={i}><FounderStory founderName={(section as {founderName?:string}).founderName} story={(section as {story?:string}).story} storeName={storeName} /></W>
    case 'ingredients-list':  return <W key={i}><IngredientsList headline={(section as {headline?:string}).headline} items={(section as {items?:Array<{name:string;benefit:string}>}).items} /></W>
    case 'lookbook-grid':     return <W key={i}><LookbookGrid headline={(section as {headline?:string}).headline} images={(section as {images?:Array<{url:string;caption?:string}>}).images} products={products} onAddToCart={onAddToCart} /></W>
    default:                  return null
  }
}

interface CanvasProps { store: StoreData; storeSlug: string; minHeightClass?: string; themeKey?: string }

export function StorefrontCanvas({ store, storeSlug, minHeightClass = 'min-h-[560px]', themeKey = 'minimal-light' }: CanvasProps) {
  const manifest   = store.storefrontCode ? extractManifest(store.storefrontCode, store) : deriveManifest(store)
  const { palette, typography } = manifest
  const products: StoreProduct[] = (store.products ?? []).map((p) => ({ id:p.id??'', name:p.name??'', description:p.description, price:p.price, currency:p.currency??'GHS', category:p.category, images:p.images as Array<{url:string;isPrimary?:boolean}>, variants:p.variants as Array<{name:string;value:string}> }))
  const features   = store.canonical?.storeFeatures ?? []
  const categories = store.canonical?.productCategories ?? []
  const currency   = products[0]?.currency ?? 'GHS'
  const payments   = store.canonical?.recommendedTechStack?.paymentGateways ?? ['Paystack']

  const [cart, setCart]         = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)

  const addToCart = useCallback((product: StoreProduct) => {
    setCart((prev) => { const ex = prev.find((i) => i.product.id === product.id); if (ex) return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i); return [...prev, { product, quantity: 1 }] })
    toast.success(`${product.name} added`, { duration: 1400 })
    setCartOpen(true)
  }, [])

  const updateQty = useCallback((id: string, delta: number) => {
    setCart((prev) => prev.map((i) => i.product.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter((i) => i.quantity > 0))
  }, [])

  const cartCount  = cart.reduce((s, i) => s + i.quantity, 0)
  const fonts      = [...new Set([typography.headingFont, typography.bodyFont])]
  const fontParam  = fonts.map((f) => `family=${f.replace(/ /g,'+')}:wght@300;400;500;600;700;800;900`).join('&')
  const sectionProps = { products, features, categories, onAddToCart: addToCart, storeName: store.name }

  return (
    <div className={`seltra-storefront relative w-full overflow-x-hidden ${minHeightClass}`}>
      <style>{`.seltra-storefront{${buildThemeVars(palette, typography, themeKey)}}@import url('https://fonts.googleapis.com/css2?${fontParam}&display=swap');`}</style>

      {/* Sticky nav */}
      <nav className="sticky top-0 z-30 flex items-center justify-between border-b px-5 py-3 backdrop-blur-xl" style={{ background:`color-mix(in srgb, var(--store-bg) 92%, transparent)`, borderColor:'var(--store-border)' }}>
        <div>
          <div className="store-heading text-base font-bold leading-none" style={{ fontFamily:`'${typography.headingFont}', serif` }}>{store.name}</div>
          {store.businessType && <div className="store-eyebrow mt-0.5">{store.businessType}</div>}
        </div>
        <button onClick={() => setCartOpen(true)} className="store-btn-outline flex items-center gap-2 px-3 py-1.5 text-xs">
          <ShoppingBag className="h-3.5 w-3.5" style={{ color:'var(--store-accent)' }} />
          Cart
          <AnimatePresence mode="wait">
            {cartCount > 0 && <motion.span key={cartCount} initial={{ scale:0.5, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0.5, opacity:0 }} className="font-extrabold" style={{ color:'var(--store-accent)' }}>({cartCount})</motion.span>}
          </AnimatePresence>
        </button>
      </nav>

      {manifest.sections.map((section, i) => renderSection(section, i, sectionProps))}

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-5 text-xs opacity-40" style={{ borderColor:'var(--store-border)', color:'var(--store-muted)' }}>
        <div>
          <div className="font-bold" style={{ fontFamily:`'${typography.headingFont}', serif`, color:'var(--store-text)' }}>{store.name}</div>
          <div>Powered by <strong>Seltra</strong></div>
        </div>
        <div>{payments.join(' · ')}</div>
      </footer>

      <CartDrawer open={cartOpen} items={cart} currency={currency} storeSlug={storeSlug} storeId={store.id} onClose={() => setCartOpen(false)} onUpdateQty={updateQty} />
    </div>
  )
}
```

---

## TASK 19 — Write all section components

### `components/storefront/sections/HeroSection.tsx`

```tsx
'use client'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { StoreProduct } from './types'

const container = { hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } } }
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.4, 0, 0.2, 1] } } }
const imgReveal = { hidden: { opacity: 0, scale: 1.04 }, show: { opacity: 1, scale: 1, transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] } } }

function getHeroImg(products: StoreProduct[]) {
  for (const p of products) { const u = p.images?.find((i) => i.isPrimary)?.url ?? p.images?.[0]?.url ?? ''; if (u && !u.startsWith('data:')) return u }
  return null
}
function Eyebrow({ text }: { text: string }) {
  return <motion.div variants={item}><Badge variant="secondary" className="font-mono text-[0.6rem] uppercase tracking-widest px-2.5 py-1" style={{ background:'var(--store-accent-soft)', color:'var(--store-accent)' }}>{text}</Badge></motion.div>
}
function Pills({ features }: { features: string[] }) {
  if (!features.length) return null
  return <motion.div variants={item} className="flex flex-wrap gap-2 pt-1">{features.slice(0,4).map((f) => <span key={f} className="rounded-full border px-2.5 py-0.5 text-[0.68rem] opacity-60" style={{ borderColor:'var(--store-border)', color:'var(--store-text)' }}>{f}</span>)}</motion.div>
}
function CTA({ label = 'Shop now', light = false }: { label?: string; light?: boolean }) {
  return <motion.div variants={item}><Button className="store-btn-primary gap-2 px-6 py-2.5 text-sm" style={{ background:'var(--store-accent)', color:'var(--store-accent-text)', borderRadius:'var(--store-radius)' }}>{label} <ArrowRight className="h-3.5 w-3.5" /></Button></motion.div>
}

type S = { type: string; headline: string; tagline?: string; subtext?: string; eyebrow?: string; ctaLabel?: string }
interface Props { section: S; products: StoreProduct[]; features: string[]; storeName: string }

export function HeroSection({ section, products, features, storeName }: Props) {
  const imgUrl = getHeroImg(products)
  const t = section.type

  if (t === 'hero-minimal') return (
    <section className="flex min-h-[clamp(40vh,50vh,65vh)] items-center border-b" style={{ background:'var(--store-bg)', borderColor:'var(--store-border)' }}>
      <motion.div variants={container} initial="hidden" animate="show" className="flex max-w-2xl flex-col gap-3 px-[clamp(1.5rem,5vw,4rem)]">
        {section.eyebrow && <Eyebrow text={section.eyebrow} />}
        <motion.h1 variants={item} className="store-heading text-[clamp(2.5rem,5vw,4rem)] font-light tracking-tighter">{section.headline}</motion.h1>
        {section.subtext && <motion.p variants={item} className="text-sm leading-relaxed" style={{ color:'var(--store-muted)' }}>{section.subtext}</motion.p>}
        <CTA label={section.ctaLabel} />
      </motion.div>
    </section>
  )

  if (t === 'hero-split') return (
    <section className="grid min-h-[clamp(55vh,70vh,85vh)] overflow-hidden md:grid-cols-2" style={{ background:'var(--store-bg)' }}>
      <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col justify-center gap-4 px-[clamp(1.5rem,5vw,4rem)] py-16">
        {section.eyebrow && <Eyebrow text={section.eyebrow} />}
        <motion.h1 variants={item} className="store-heading text-[clamp(2.75rem,5.5vw,4.5rem)] font-black">{section.headline}</motion.h1>
        {section.tagline && <motion.p variants={item} className="text-base font-semibold" style={{ color:'var(--store-muted)' }}>{section.tagline}</motion.p>}
        {section.subtext && <motion.p variants={item} className="max-w-prose text-sm leading-relaxed" style={{ color:'var(--store-muted)' }}>{section.subtext}</motion.p>}
        <Pills features={features} />
        <CTA label={section.ctaLabel} />
      </motion.div>
      <motion.div variants={imgReveal} initial="hidden" animate="show" className="relative min-h-[300px]">
        {imgUrl ? <Image src={imgUrl} alt={section.headline} fill className="object-cover" priority /> : <div className="absolute inset-0" style={{ background:`linear-gradient(135deg, var(--store-accent-soft), var(--store-surface))` }} />}
      </motion.div>
    </section>
  )

  if (t === 'hero-fullbleed') return (
    <section className="relative flex min-h-[clamp(70vh,85vh,100vh)] items-end justify-center overflow-hidden text-center">
      <div className="absolute inset-0 z-0" style={{ background:'linear-gradient(to top, #050505 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.2) 100%)' }} />
      {imgUrl && <motion.div variants={imgReveal} initial="hidden" animate="show" className="absolute inset-0 z-[-1]"><Image src={imgUrl} alt="" fill className="object-cover opacity-40" priority aria-hidden /></motion.div>}
      <motion.div variants={container} initial="hidden" animate="show" className="relative z-10 flex max-w-5xl flex-col items-center gap-5 px-6 pb-16 pt-24" style={{ color:'#ffffff' }}>
        {section.eyebrow && <motion.div variants={item}><span className="font-mono text-[0.65rem] uppercase tracking-widest opacity-60">{section.eyebrow}</span></motion.div>}
        <motion.h1 variants={item} className="font-black leading-none tracking-tight" style={{ fontFamily:'var(--store-heading-font), serif', fontSize:'clamp(4rem,14vw,10rem)', textShadow:'0 2px 32px rgba(0,0,0,0.3)' }}>{section.headline}</motion.h1>
        {section.tagline && <motion.p variants={item} className="text-[clamp(0.95rem,2vw,1.1rem)] font-semibold opacity-80">{section.tagline}</motion.p>}
        {section.subtext  && <motion.p variants={item} className="max-w-lg text-sm leading-relaxed opacity-60">{section.subtext}</motion.p>}
        <CTA label={section.ctaLabel} light />
      </motion.div>
    </section>
  )

  if (t === 'hero-editorial') return (
    <section className="relative flex min-h-[clamp(60vh,75vh,90vh)] items-center overflow-hidden" style={{ background:'var(--store-bg)' }}>
      {imgUrl ? (
        <motion.div variants={imgReveal} initial="hidden" animate="show" className="absolute inset-0 z-0">
          <Image src={imgUrl} alt="" fill className="object-cover object-right" priority aria-hidden />
          <div className="absolute inset-0" style={{ background:`linear-gradient(to right, var(--store-bg) 30%, color-mix(in srgb, var(--store-bg) 60%, transparent) 60%, transparent 100%)` }} />
        </motion.div>
      ) : <div className="store-hero-mesh absolute inset-0 z-0" />}
      <motion.div variants={container} initial="hidden" animate="show" className="relative z-10 flex max-w-2xl flex-col gap-5 px-[clamp(1.5rem,5vw,4rem)] py-20">
        {section.eyebrow && <Eyebrow text={section.eyebrow} />}
        <motion.h1 variants={item} className="store-heading text-[clamp(2.75rem,6vw,5rem)] font-black" style={{ fontStyle:'italic' }}>{section.headline}</motion.h1>
        {section.tagline && <motion.p variants={item} className="text-lg font-medium" style={{ color:'var(--store-muted)' }}>{section.tagline}</motion.p>}
        {section.subtext  && <motion.p variants={item} className="text-sm leading-relaxed" style={{ color:'var(--store-muted)' }}>{section.subtext}</motion.p>}
        <Pills features={features} />
        <CTA label={section.ctaLabel} />
      </motion.div>
    </section>
  )

  // hero-centered (default)
  return (
    <section className="relative flex min-h-[clamp(65vh,80vh,95vh)] items-center justify-center overflow-hidden text-center" style={{ background:'var(--store-bg)' }}>
      <div className="store-hero-mesh absolute inset-0 z-0" />
      {imgUrl && (
        <motion.div variants={imgReveal} initial="hidden" animate="show" className="absolute inset-0 z-0">
          <Image src={imgUrl} alt="" fill className="object-cover object-center opacity-[0.12]" priority aria-hidden />
          <div className="absolute inset-0" style={{ background:`linear-gradient(to bottom, var(--store-bg) 0%, transparent 30%, var(--store-bg) 100%)` }} />
        </motion.div>
      )}
      <motion.div variants={container} initial="hidden" animate="show" className="relative z-10 flex max-w-3xl flex-col items-center gap-4 px-6 py-20">
        {section.eyebrow && <Eyebrow text={section.eyebrow} />}
        <motion.h1 variants={item} className="store-heading text-[clamp(3rem,9vw,6.5rem)] font-black leading-none">{section.headline}</motion.h1>
        {section.tagline && <motion.p variants={item} className="text-[clamp(0.95rem,2vw,1.15rem)] font-semibold" style={{ color:'var(--store-muted)' }}>{section.tagline}</motion.p>}
        {section.subtext  && <motion.p variants={item} className="max-w-prose text-[0.9375rem] leading-relaxed" style={{ color:'var(--store-muted)' }}>{section.subtext}</motion.p>}
        <Pills features={features} />
        <CTA label={section.ctaLabel} />
      </motion.div>
    </section>
  )
}
```

### `components/storefront/sections/AnnouncementBar.tsx`

```tsx
'use client'
export function AnnouncementBar({ message }: { message: string }) {
  return (
    <div className="overflow-hidden py-2 text-[0.7rem] font-semibold tracking-wide" style={{ background:'var(--store-accent)', color:'var(--store-accent-text)' }}>
      <div className="store-announce-track">
        {[...Array(4)].map((_, i) => <span key={i} className="flex items-center gap-4"><span className="inline-block h-1 w-1 rounded-full bg-current opacity-50" />{message}</span>)}
      </div>
    </div>
  )
}
```

### `components/storefront/sections/TrustBar.tsx`

```tsx
'use client'
import { Check } from 'lucide-react'
export function TrustBar({ items }: { items: string[] }) {
  const safe = items?.length ? items : ['Secure checkout','Fast delivery','Easy returns','Local support']
  return (
    <section className="storefront-section-tight flex flex-wrap items-center justify-center gap-x-8 gap-y-3 border-y" style={{ borderColor:'var(--store-border)' }}>
      {safe.map((item) => <div key={item} className="store-trust-item"><Check className="h-3.5 w-3.5 flex-shrink-0" style={{ color:'var(--store-accent)' }} />{item}</div>)}
    </section>
  )
}
```

### `components/storefront/sections/CategoryStrip.tsx`

```tsx
'use client'
import { useState } from 'react'
export function CategoryStrip({ categories, headline }: { categories: string[]; headline?: string }) {
  const [active, setActive] = useState('All')
  if (!categories?.length) return null
  return (
    <section className="storefront-section-tight overflow-x-auto border-b" style={{ borderColor:'var(--store-border)' }}>
      {headline && <span className="store-eyebrow mb-2 block">{headline}</span>}
      <div className="flex gap-2">
        {['All', ...categories].map((cat) => (
          <button key={cat} onClick={() => setActive(cat)} className="whitespace-nowrap rounded-full border px-3.5 py-1 text-[0.72rem] font-medium transition-all"
            style={{ borderColor:active===cat?'var(--store-accent)':'var(--store-border)', color:active===cat?'var(--store-accent)':'var(--store-muted)', background:active===cat?'var(--store-accent-soft)':'transparent' }}>
            {cat}
          </button>
        ))}
      </div>
    </section>
  )
}
```

### `components/storefront/sections/ProductCard.tsx`

```tsx
'use client'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { StoreProduct } from './types'

function GradientTile({ name, seed }: { name: string; seed: string }) {
  const hash  = [...seed].reduce((a, c) => a + c.charCodeAt(0), 0)
  const angle = hash % 360
  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ background:`linear-gradient(${angle}deg, var(--store-accent-soft), var(--store-surface))` }}>
      <span className="select-none text-[2.5rem] font-bold opacity-20" style={{ fontFamily:'var(--store-heading-font), serif', color:'var(--store-accent)' }}>{name.slice(0,2).toUpperCase()}</span>
    </div>
  )
}

interface Props { product: StoreProduct; showCategory?: boolean; compact?: boolean; index?: number; onAddToCart: (p: StoreProduct) => void }

export function ProductCard({ product, showCategory=true, compact=false, index=0, onAddToCart }: Props) {
  const imgUrl = product.images?.find((i) => i.isPrimary)?.url ?? product.images?.[0]?.url ?? ''
  const hasImg = imgUrl && !imgUrl.startsWith('data:')
  const price  = Number(product.price).toFixed(2)
  return (
    <motion.article initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true, margin:'-40px' }} transition={{ duration:0.45, delay:index*0.07, ease:[0.4,0,0.2,1] }} className="store-product-card group flex flex-col">
      <div className="relative aspect-square overflow-hidden" style={{ background:'var(--store-accent-soft)' }}>
        {hasImg ? <Image src={imgUrl} alt={product.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width:640px) 50vw,(max-width:1024px) 33vw,25vw" /> : <GradientTile name={product.name} seed={product.id} />}
        <button onClick={() => onAddToCart(product)} className="absolute bottom-3 left-1/2 -translate-x-1/2 translate-y-2 flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[0.72rem] font-bold opacity-0 shadow-lg transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100" style={{ background:'var(--store-text)', color:'var(--store-bg)' }}>
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        {showCategory && product.category && <span className="store-eyebrow">{product.category}</span>}
        <h3 className="text-sm font-bold leading-snug" style={{ color:'var(--store-text)' }}>{product.name}</h3>
        {!compact && product.description && <p className="line-clamp-2 text-[0.73rem] leading-relaxed" style={{ color:'var(--store-muted)' }}>{product.description}</p>}
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-sm font-extrabold" style={{ color:'var(--store-accent)' }}>{product.currency} {price}</span>
          <Button size="sm" className="h-7 gap-1 px-2.5 text-[0.7rem] font-bold" style={{ background:'var(--store-accent)', color:'var(--store-accent-text)', borderRadius:'var(--store-radius)' }} onClick={() => onAddToCart(product)}>+ Add</Button>
        </div>
      </div>
    </motion.article>
  )
}
```

### `components/storefront/sections/ProductGrid.tsx`

```tsx
'use client'
import { ProductCard } from './ProductCard'
import type { StoreProduct } from './types'

interface Props { section: { columns: 2|3|4; style: string; limit?: number; showCategory?: boolean; sectionLabel?: string }; products: StoreProduct[]; onAddToCart: (p: StoreProduct) => void }

export function ProductGrid({ section, products, onAddToCart }: Props) {
  const limited  = products.slice(0, section.limit ?? 9)
  const colClass = section.columns===4 ? 'grid-cols-2 md:grid-cols-4' : section.columns===2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'
  return (
    <section className="storefront-section">
      <div className="mb-6 flex items-baseline justify-between">
        <span className="store-eyebrow">{section.sectionLabel ?? 'Products'}</span>
        <span className="store-eyebrow">{products.length} items</span>
      </div>
      <div className={`grid gap-4 ${colClass}`}>
        {limited.map((p, i) => <ProductCard key={p.id} product={p} showCategory={section.showCategory ?? true} index={i} onAddToCart={onAddToCart} />)}
      </div>
    </section>
  )
}
```

### `components/storefront/sections/ProductShelf.tsx`

```tsx
'use client'
import { ProductCard } from './ProductCard'
import type { StoreProduct } from './types'

interface Props { section: { headline: string; subtext?: string; limit?: number }; products: StoreProduct[]; onAddToCart: (p: StoreProduct) => void; storeName: string }

export function ProductShelf({ section, products, onAddToCart }: Props) {
  return (
    <section className="storefront-section overflow-hidden">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="store-heading text-[clamp(1.25rem,2.5vw,1.75rem)] font-bold">{section.headline}</h2>
          {section.subtext && <p className="mt-1 text-sm" style={{ color:'var(--store-muted)' }}>{section.subtext}</p>}
        </div>
        <span className="store-eyebrow opacity-40">Scroll →</span>
      </div>
      <div className="store-shelf-track">
        {products.slice(0, section.limit ?? 6).map((p, i) => (
          <div key={p.id} className="w-[clamp(150px,24vw,200px)] flex-shrink-0"><ProductCard product={p} showCategory={false} index={i} onAddToCart={onAddToCart} compact /></div>
        ))}
      </div>
    </section>
  )
}
```

### `components/storefront/sections/BrandStory.tsx`

```tsx
'use client'
import { motion } from 'framer-motion'

export function BrandStory({ headline, body, stat, statLabel, layout }: { headline: string; body: string; stat?: string; statLabel?: string; layout: 'text-left' | 'text-center' }) {
  const c = layout === 'text-center'
  return (
    <section className="storefront-section border-t" style={{ borderColor:'var(--store-border)' }}>
      <div className={`max-w-2xl ${c ? 'mx-auto text-center' : ''}`}>
        <motion.h2 initial={{ opacity:0, y:16 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ duration:0.5 }} className="store-heading mb-4 text-[clamp(1.6rem,3vw,2.25rem)] font-bold">{headline}</motion.h2>
        <motion.p initial={{ opacity:0, y:12 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ duration:0.5, delay:0.1 }} className="leading-[1.85] text-[0.9375rem]" style={{ color:'var(--store-muted)' }}>{body}</motion.p>
        {stat && <motion.div initial={{ opacity:0 }} whileInView={{ opacity:1 }} viewport={{ once:true }} transition={{ duration:0.5, delay:0.2 }} className="mt-6">
          <div className="store-heading text-5xl font-bold" style={{ color:'var(--store-accent)' }}>{stat}</div>
          {statLabel && <div className="store-eyebrow mt-1">{statLabel}</div>}
        </motion.div>}
      </div>
    </section>
  )
}
```

### `components/storefront/sections/SocialProof.tsx`

```tsx
'use client'
import { motion } from 'framer-motion'

const REVIEWS = ['Exceptional quality, fast delivery. Already on my second order.','My go-to store. Always consistent, always fresh.',"Best experience shopping local. Will definitely reorder.",'Arrived beautifully packaged. Exactly as described.','Great product, quick shipping, superb service.','Highly recommend to anyone who values quality.']

export function SocialProof({ style, headline, subtext }: { style: 'marquee'|'grid'|'cards'; headline?: string; subtext?: string }) {
  const stars = '★★★★★'
  if (style === 'marquee') return (
    <section className="storefront-section-tight overflow-hidden border-t" style={{ borderColor:'var(--store-border)' }}>
      {headline && <p className="store-eyebrow mb-4 text-center">{headline}</p>}
      <div className="store-marquee-wrap"><div className="store-marquee-inner">
        {[...REVIEWS,...REVIEWS].map((r, i) => <span key={i} className="whitespace-nowrap rounded-full border px-4 py-2 text-[0.8rem]" style={{ borderColor:'var(--store-border)', color:'var(--store-muted)', background:'var(--store-surface)' }}>{r} <span style={{ color:'var(--store-accent)' }}>{stars}</span></span>)}
      </div></div>
    </section>
  )
  return (
    <section className="storefront-section border-t" style={{ borderColor:'var(--store-border)' }}>
      {(headline||subtext) && <div className="mb-8 text-center">{headline && <h2 className="store-heading text-[clamp(1.4rem,3vw,2rem)] font-bold">{headline}</h2>}{subtext && <p className="mt-2 text-sm" style={{ color:'var(--store-muted)' }}>{subtext}</p>}</div>}
      <div className={style==='grid' ? 'grid gap-4 sm:grid-cols-3' : 'flex gap-4 overflow-x-auto pb-2'}>
        {REVIEWS.slice(0, style==='grid'?3:6).map((r, i) => (
          <motion.div key={i} initial={{ opacity:0, y:12 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ duration:0.4, delay:i*0.07 }} className="min-w-[220px] flex-shrink-0 rounded-[var(--store-radius)] border p-5" style={{ borderColor:'var(--store-border)', background:'var(--store-surface)' }}>
            <div className="mb-2 text-sm" style={{ color:'var(--store-accent)' }}>{stars}</div>
            <p className="text-[0.8rem] leading-relaxed" style={{ color:'var(--store-muted)' }}>{r}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
```

### `components/storefront/sections/Newsletter.tsx`

```tsx
'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { ArrowRight } from 'lucide-react'

export function Newsletter({ headline, subtext, placeholder='Enter your email' }: { headline: string; subtext: string; placeholder?: string }) {
  const [submitted, setSubmitted] = useState(false)
  const [value, setValue]         = useState('')
  return (
    <section className="storefront-section" style={{ background:'var(--store-accent-soft)', borderTop:'1px solid var(--store-border)' }}>
      <div className="mx-auto max-w-lg text-center">
        <h2 className="store-heading mb-2 text-[clamp(1.5rem,3vw,2rem)] font-bold" style={{ color:'var(--store-text)' }}>{headline}</h2>
        <p className="mb-6 text-sm" style={{ color:'var(--store-muted)' }}>{subtext}</p>
        {submitted ? (
          <motion.p initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} className="font-semibold" style={{ color:'var(--store-accent)' }}>✓ You're in. Welcome.</motion.p>
        ) : (
          <div className="flex gap-2">
            <Input type="email" value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} onKeyDown={(e) => e.key==='Enter' && value.includes('@') && setSubmitted(true)} className="flex-1 border bg-white text-sm" style={{ borderColor:'var(--store-border)', borderRadius:'var(--store-radius)' }} />
            <button onClick={() => value.includes('@') && setSubmitted(true)} className="store-btn-primary flex items-center gap-1.5 px-4 py-2 text-sm">Subscribe <ArrowRight className="h-3.5 w-3.5" /></button>
          </div>
        )}
        <p className="mt-3 text-[0.7rem]" style={{ color:'var(--store-muted)' }}>No spam. Unsubscribe anytime.</p>
      </div>
    </section>
  )
}
```

### `components/storefront/sections/FeaturedDrop.tsx`

```tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import type { StoreProduct } from './types'

interface Props { section: { badge: string; headline: string; subtext: string; showCountdown?: boolean }; products: StoreProduct[]; onAddToCart: (p: StoreProduct) => void }

export function FeaturedDrop({ section, products, onAddToCart }: Props) {
  const product = products[0]; if (!product) return null
  const imgUrl  = product.images?.find((i) => i.isPrimary)?.url ?? product.images?.[0]?.url ?? ''
  const hasImg  = imgUrl && !imgUrl.startsWith('data:')
  const endRef  = useRef(Date.now() + 23*3600000 + 59*60000 + 59000)
  const [time, setTime] = useState({ h:'23', m:'59', s:'59' })

  useEffect(() => {
    if (!section.showCountdown) return
    const iv = setInterval(() => {
      const d = endRef.current - Date.now(); if (d<=0) return clearInterval(iv)
      setTime({ h:String(Math.floor(d/3600000)).padStart(2,'0'), m:String(Math.floor((d%3600000)/60000)).padStart(2,'0'), s:String(Math.floor((d%60000)/1000)).padStart(2,'0') })
    }, 1000)
    return () => clearInterval(iv)
  }, [section.showCountdown])

  return (
    <section className="flex flex-col gap-6 border-y p-[clamp(1.5rem,4vw,3rem)] sm:flex-row sm:items-center" style={{ background:'var(--store-accent-soft)', borderColor:'var(--store-border)' }}>
      <div className="flex flex-1 flex-col gap-4">
        <Badge style={{ background:'var(--store-accent)', color:'var(--store-accent-text)', width:'fit-content' }}>{section.badge}</Badge>
        <h2 className="store-heading text-[clamp(1.5rem,3vw,2.25rem)] font-bold">{section.headline}</h2>
        <p className="text-sm" style={{ color:'var(--store-muted)' }}>{section.subtext}</p>
        {section.showCountdown && (
          <div className="flex items-center gap-1 font-mono text-xl font-bold" style={{ color:'var(--store-accent)' }}>
            {[time.h,time.m,time.s].map((t, i) => <span key={i} className="flex items-center gap-1"><span className="rounded border px-2 py-0.5 tabular-nums" style={{ borderColor:'var(--store-border)', background:'var(--store-surface)' }}>{t}</span>{i<2&&<span className="opacity-40">:</span>}</span>)}
          </div>
        )}
        <button className="store-btn-primary w-fit px-5 py-2.5 text-sm" onClick={() => onAddToCart(product)}>Shop Drop — {product.currency} {Number(product.price).toFixed(2)}</button>
      </div>
      {hasImg && <div className="relative h-[200px] w-full overflow-hidden rounded-[var(--store-radius)] sm:w-[200px] sm:flex-shrink-0"><Image src={imgUrl} alt={product.name} fill className="object-cover" /></div>}
    </section>
  )
}
```

### `components/storefront/sections/FAQSection.tsx`

```tsx
'use client'
import * as Accordion from '@radix-ui/react-accordion'
import { ChevronDown } from 'lucide-react'

const DEFAULT = [
  { question:'How long does delivery take?',    answer:'Most orders are delivered within 2–5 business days depending on your location.' },
  { question:'What is your return policy?',     answer:'We accept returns within 14 days of delivery. Items must be unused and in original packaging.' },
  { question:'Do you offer local pickup?',      answer:'Yes! Select local pickup at checkout.' },
  { question:'How do I track my order?',        answer:'You will receive a tracking link via email once your order ships.' },
]

export function FAQSection({ headline='Common questions', items }: { headline?: string; items?: Array<{ question: string; answer: string }> }) {
  const faqs = items?.length ? items : DEFAULT
  return (
    <section className="storefront-section border-t" style={{ borderColor:'var(--store-border)' }}>
      <h2 className="store-heading mb-8 text-[clamp(1.5rem,3vw,2rem)] font-bold">{headline}</h2>
      <Accordion.Root type="single" collapsible className="max-w-2xl space-y-2">
        {faqs.map((faq, i) => (
          <Accordion.Item key={i} value={String(i)} className="rounded-[var(--store-radius)] border" style={{ borderColor:'var(--store-border)' }}>
            <Accordion.Trigger className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-semibold" style={{ color:'var(--store-text)' }}>
              {faq.question}
              <ChevronDown className="h-4 w-4 flex-shrink-0 opacity-50 transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
            </Accordion.Trigger>
            <Accordion.Content className="overflow-hidden px-5 pb-4 text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down" style={{ color:'var(--store-muted)' }}>
              {faq.answer}
            </Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    </section>
  )
}
```

### `components/storefront/sections/CountdownBanner.tsx`

```tsx
'use client'
export function CountdownBanner({ message='Limited time offer — shop now before it ends.' }: { message?: string }) {
  return <div className="overflow-hidden py-2 text-center text-[0.72rem] font-semibold" style={{ background:`color-mix(in srgb, var(--store-accent) 15%, var(--store-bg))`, color:'var(--store-accent)', borderBottom:'1px solid var(--store-border)' }}>{message}</div>
}
```

### `components/storefront/sections/BeforeAfter.tsx`

```tsx
'use client'
export function BeforeAfter({ headline, beforeLabel='Before', afterLabel='After' }: { headline?: string; beforeLabel?: string; afterLabel?: string }) {
  return (
    <section className="storefront-section border-t" style={{ borderColor:'var(--store-border)' }}>
      {headline && <h2 className="store-heading mb-6 text-[clamp(1.5rem,3vw,2rem)] font-bold">{headline}</h2>}
      <div className="grid gap-4 sm:grid-cols-2">
        {[{ label:beforeLabel, dim:true },{ label:afterLabel, dim:false }].map(({ label, dim }) => (
          <div key={label} className="flex aspect-[4/3] items-end rounded-[var(--store-radius)] p-4" style={{ background:dim?'var(--store-border)':'var(--store-accent-soft)' }}>
            <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background:dim?'var(--store-muted)':'var(--store-accent)', color:dim?'var(--store-bg)':'var(--store-accent-text)' }}>{label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
```

### `components/storefront/sections/FounderStory.tsx`

```tsx
'use client'
export function FounderStory({ founderName, story, storeName, variant='portrait-left' }: { founderName?: string; story?: string; storeName: string; variant?: string }) {
  return (
    <section className="storefront-section border-t" style={{ borderColor:'var(--store-border)' }}>
      <div className={`flex flex-col gap-8 ${variant!=='minimal'?'sm:flex-row':''} ${variant==='portrait-right'?'sm:flex-row-reverse':''}`}>
        {variant!=='minimal' && <div className="aspect-square w-full rounded-[var(--store-radius)] sm:w-64 sm:flex-shrink-0" style={{ background:'var(--store-accent-soft)' }} />}
        <div className="flex flex-col justify-center gap-3">
          <span className="store-eyebrow">The founder</span>
          <h2 className="store-heading text-[clamp(1.5rem,3vw,2.25rem)] font-bold">{founderName ?? `The story behind ${storeName}`}</h2>
          <p className="max-w-prose text-[0.9375rem] leading-[1.85]" style={{ color:'var(--store-muted)' }}>{story ?? `${storeName} was built with care, craft, and a genuine belief that quality matters. Every product reflects that commitment.`}</p>
        </div>
      </div>
    </section>
  )
}
```

### `components/storefront/sections/IngredientsList.tsx`

```tsx
'use client'
import { motion } from 'framer-motion'

const DEFAULT = [{ name:'Shea Butter',benefit:'Deep moisturisation and skin repair' },{ name:'Vitamin C',benefit:'Brightening and antioxidant protection' },{ name:'Aloe Vera',benefit:'Soothing, cooling, and hydrating' },{ name:'Hyaluronic Acid',benefit:'Plumps and retains moisture' }]

export function IngredientsList({ headline='What goes in', items }: { headline?: string; items?: Array<{ name: string; benefit: string }> }) {
  const list = items?.length ? items : DEFAULT
  return (
    <section className="storefront-section border-t" style={{ borderColor:'var(--store-border)' }}>
      <h2 className="store-heading mb-6 text-[clamp(1.5rem,3vw,2rem)] font-bold">{headline}</h2>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        {list.map((item, i) => (
          <motion.div key={i} initial={{ opacity:0, y:12 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ duration:0.4, delay:i*0.06 }} className="rounded-[var(--store-radius)] border p-4" style={{ borderColor:'var(--store-border)', background:'var(--store-surface)' }}>
            <div className="mb-2 text-xl" style={{ color:'var(--store-accent)' }}>◈</div>
            <div className="mb-1 text-sm font-bold" style={{ color:'var(--store-text)' }}>{item.name}</div>
            <div className="text-[0.73rem] leading-relaxed" style={{ color:'var(--store-muted)' }}>{item.benefit}</div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
```

### `components/storefront/sections/LookbookGrid.tsx`

```tsx
'use client'
import { motion } from 'framer-motion'
import Image from 'next/image'
import type { StoreProduct } from './types'

interface Props { headline?: string; images?: Array<{ url: string; caption?: string }>; variant?: 'masonry'|'editorial'|'uniform'; products: StoreProduct[]; onAddToCart: (p: StoreProduct) => void }

export function LookbookGrid({ headline, images, variant='editorial', products }: Props) {
  const productImgs = products.flatMap((p) => (p.images??[]).map((img) => ({ url:img.url, caption:p.name }))).filter((i) => i.url && !i.url.startsWith('data:')).slice(0,6)
  const display = images?.filter((i) => i.url && !i.url.startsWith('data:'))?.length ? images.filter((i) => i.url && !i.url.startsWith('data:')) : productImgs
  if (!display.length) return null
  const gridClass = variant==='masonry' ? 'columns-2 md:columns-3 gap-2' : 'grid gap-2 grid-cols-2 md:grid-cols-3'
  return (
    <section className="storefront-section border-t" style={{ borderColor:'var(--store-border)' }}>
      {headline && <h2 className="store-heading mb-6 text-[clamp(1.5rem,3vw,2rem)] font-bold">{headline}</h2>}
      <div className={gridClass}>
        {display.map((img, i) => (
          <motion.div key={i} initial={{ opacity:0 }} whileInView={{ opacity:1 }} viewport={{ once:true }} transition={{ duration:0.5, delay:i*0.05 }} className={`relative overflow-hidden rounded-[var(--store-radius)] ${variant==='masonry'?'mb-2 break-inside-avoid':'aspect-square'}`}>
            <Image src={img.url} alt={img.caption??''} fill className="object-cover" sizes="33vw" />
          </motion.div>
        ))}
      </div>
    </section>
  )
}
```

### `components/storefront/sections/CartDrawer.tsx`

```tsx
'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { X, Minus, Plus, ArrowRight, Loader2, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { StoreProduct } from './types'

export interface CartItem { product: StoreProduct; quantity: number }

interface Props { open: boolean; items: CartItem[]; currency: string; storeSlug: string; storeId?: string; onClose: () => void; onUpdateQty: (id: string, delta: number) => void }

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001'

export function CartDrawer({ open, items, currency, storeSlug, storeId, onClose, onUpdateQty }: Props) {
  const total     = items.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0)
  const itemCount = items.reduce((s, i) => s + i.quantity, 0)
  const [co, setCo]           = useState(false)
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [phone, setPhone]     = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity]       = useState('')
  const [mkt, setMkt]         = useState(true)
  const [loading, setLoading] = useState(false)

  const checkout = async () => {
    if (!storeId || !name || !email || !phone || loading) return
    setLoading(true)
    try {
      const tok = typeof window !== 'undefined' ? localStorage.getItem('seltra:token') : null
      const res = await fetch(`${API_BASE}/api/v1/payment/initialize`, {
        method:'POST', headers:{ 'Content-Type':'application/json', ...(tok?{Authorization:`Bearer ${tok}`}:{}) },
        body: JSON.stringify({ tenantId:storeId, items:items.map((i) => ({ product:{ id:i.product.id, name:i.product.name, price:i.product.price }, quantity:i.quantity })), customerEmail:email.trim(), customerName:name.trim(), customerPhone:phone.trim(), shippingAddress:address.trim(), shippingCity:city.trim(), marketingOptIn:mkt, callbackUrl:`${window.location.origin}/store/${storeSlug}/order/success` }),
      })
      const data = await res.json()
      const url  = data?.authorization_url ?? data?.authorizationUrl
      if (!url) throw new Error(data?.message || 'Payment init failed')
      window.location.href = url
    } catch (err) { setLoading(false); toast.error(err instanceof Error ? err.message : 'Checkout failed') }
  }

  const inp = 'w-full rounded-[var(--store-radius)] border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2'
  const inpStyle = { borderColor:'var(--store-border)', color:'var(--store-text)' }

  return (
    <>
      <AnimatePresence>
        {open && <motion.div key="ov" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.2 }} className="store-cart-overlay" onClick={onClose} />}
      </AnimatePresence>
      <AnimatePresence>
        {open && (
          <motion.div key="dr" initial={{ x:'100%' }} animate={{ x:0 }} exit={{ x:'100%' }} transition={{ type:'spring', damping:28, stiffness:280 }} className="store-cart-drawer">
            <div className="flex flex-shrink-0 items-center justify-between border-b px-5 py-4" style={{ borderColor:'var(--store-border)' }}>
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" style={{ color:'var(--store-accent)' }} />
                <span className="font-bold text-[0.9375rem]" style={{ color:'var(--store-text)' }}>Your cart{itemCount>0&&<span className="ml-1 font-normal opacity-50 text-sm">({itemCount})</span>}</span>
              </div>
              <button onClick={onClose} className="rounded-full p-1.5 opacity-40 transition-opacity hover:opacity-100" style={{ color:'var(--store-text)' }}><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain p-4" style={{ minHeight:0 }}>
              {items.length===0 ? <div className="flex h-full items-center justify-center text-sm" style={{ color:'var(--store-muted)' }}>Your cart is empty</div> : (
                <div className="space-y-3">
                  <AnimatePresence initial={false}>
                    {items.map(({ product, quantity }) => {
                      const imgUrl = product.images?.find((i) => i.isPrimary)?.url ?? product.images?.[0]?.url ?? ''
                      const hasImg = imgUrl && !imgUrl.startsWith('data:')
                      return (
                        <motion.div key={product.id} layout initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }} transition={{ duration:0.2 }} className="flex gap-3 rounded-[var(--store-radius)] border p-3" style={{ borderColor:'var(--store-border)', background:'var(--store-bg)' }}>
                          <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded" style={{ background:'var(--store-accent-soft)' }}>
                            {hasImg && <Image src={imgUrl} alt={product.name} fill className="object-cover" sizes="48px" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="truncate text-[0.8rem] font-semibold" style={{ color:'var(--store-text)' }}>{product.name}</div>
                            <div className="text-[0.7rem]" style={{ color:'var(--store-muted)' }}>{product.currency} {Number(product.price).toFixed(2)}</div>
                          </div>
                          <div className="flex flex-shrink-0 items-center gap-1.5 text-sm">
                            <button onClick={() => onUpdateQty(product.id,-1)} className="flex h-6 w-6 items-center justify-center rounded border transition-colors hover:border-[color:var(--store-accent)]" style={{ borderColor:'var(--store-border)', color:'var(--store-text)' }}><Minus className="h-3 w-3" /></button>
                            <span className="w-4 text-center tabular-nums" style={{ color:'var(--store-text)' }}>{quantity}</span>
                            <button onClick={() => onUpdateQty(product.id,1)} className="flex h-6 w-6 items-center justify-center rounded border transition-colors hover:border-[color:var(--store-accent)]" style={{ borderColor:'var(--store-border)', color:'var(--store-text)' }}><Plus className="h-3 w-3" /></button>
                          </div>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
            {items.length>0 && (
              <div className="flex-shrink-0 border-t p-4" style={{ borderColor:'var(--store-border)', background:'var(--store-surface)' }}>
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span style={{ color:'var(--store-muted)' }}>Total</span>
                  <span className="font-extrabold" style={{ color:'var(--store-accent)' }}>{currency} {total.toFixed(2)}</span>
                </div>
                <Button className="store-btn-primary w-full py-2.5 text-sm font-bold" style={{ background:'var(--store-accent)', color:'var(--store-accent-text)', borderRadius:'var(--store-radius)' }} onClick={() => { onClose(); setCo(true) }}>
                  Checkout <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {co && (
          <>
            <motion.div key="co-ov" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setCo(false)} />
            <motion.div key="co-modal" initial={{ opacity:0, scale:0.96, y:16 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.96, y:16 }} transition={{ duration:0.22 }} className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={(e) => e.stopPropagation()}>
              <div className="w-full max-w-md rounded-2xl border shadow-2xl" style={{ background:'var(--store-surface)', borderColor:'var(--store-border)' }}>
                <div className="flex items-start justify-between border-b px-5 py-4" style={{ borderColor:'var(--store-border)' }}>
                  <div>
                    <h3 className="font-bold" style={{ color:'var(--store-text)' }}>Complete your order</h3>
                    <p className="mt-0.5 text-xs" style={{ color:'var(--store-muted)' }}>Total: <span className="font-semibold" style={{ color:'var(--store-accent)' }}>{currency} {total.toFixed(2)}</span></p>
                  </div>
                  <button onClick={() => setCo(false)} className="opacity-40 hover:opacity-100 transition-opacity" style={{ color:'var(--store-text)' }}><X className="h-4 w-4" /></button>
                </div>
                <div className="grid gap-3 p-5">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1"><span className="store-eyebrow">Full name</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ama Owusu" className={inp} style={inpStyle} /></label>
                    <label className="grid gap-1"><span className="store-eyebrow">Phone</span><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+233 20 000 0000" className={inp} style={inpStyle} /></label>
                  </div>
                  <label className="grid gap-1"><span className="store-eyebrow">Email for receipt</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ama@example.com" className={inp} style={inpStyle} /></label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1"><span className="store-eyebrow">Delivery address</span><input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="14 Ring Road" className={inp} style={inpStyle} /></label>
                    <label className="grid gap-1"><span className="store-eyebrow">City / area</span><input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Accra" className={inp} style={inpStyle} /></label>
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 rounded-[var(--store-radius)] border px-3 py-2.5 text-xs" style={{ borderColor:'var(--store-border)', color:'var(--store-muted)' }}>
                    <input type="checkbox" checked={mkt} onChange={(e) => setMkt(e.target.checked)} /> Send me order updates and store offers
                  </label>
                  <button onClick={checkout} disabled={!name||!email||!phone||loading} className="store-btn-primary mt-1 flex w-full items-center justify-center gap-2 py-3 text-sm font-bold disabled:opacity-40">
                    {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Opening Paystack…</> : <>Pay {currency} {total.toFixed(2)} <ArrowRight className="h-4 w-4" /></>}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
```

### `components/storefront/sections/registry.ts`

```typescript
import { AnnouncementBar }  from './AnnouncementBar'
import { HeroSection }      from './HeroSection'
import { ProductGrid }      from './ProductGrid'
import { ProductShelf }     from './ProductShelf'
import { TrustBar }         from './TrustBar'
import { CategoryStrip }    from './CategoryStrip'
import { SocialProof }      from './SocialProof'
import { BrandStory }       from './BrandStory'
import { Newsletter }       from './Newsletter'
import { FeaturedDrop }     from './FeaturedDrop'
import { FAQSection }       from './FAQSection'
import { CountdownBanner }  from './CountdownBanner'
import { BeforeAfter }      from './BeforeAfter'
import { FounderStory }     from './FounderStory'
import { IngredientsList }  from './IngredientsList'
import { LookbookGrid }     from './LookbookGrid'

export const SECTION_REGISTRY = {
  'announcement-bar': AnnouncementBar, 'hero-centered': HeroSection, 'hero-split': HeroSection,
  'hero-editorial': HeroSection, 'hero-fullbleed': HeroSection, 'hero-minimal': HeroSection,
  'trust-bar': TrustBar, 'category-strip': CategoryStrip, 'product-grid': ProductGrid,
  'product-shelf': ProductShelf, 'brand-story': BrandStory, 'social-proof': SocialProof,
  'newsletter': Newsletter, 'featured-drop': FeaturedDrop, 'faq': FAQSection,
  'countdown-banner': CountdownBanner, 'before-after': BeforeAfter, 'founder-story': FounderStory,
  'ingredients-list': IngredientsList, 'lookbook-grid': LookbookGrid,
} as const

export type RegisteredSectionType = keyof typeof SECTION_REGISTRY
```

---

## TASK 20 — Write `components/storefront/StorefrontPreview.tsx`

```tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import { StorefrontCanvas } from './StorefrontCanvas'
import { useStore } from '@/context/StoreContext'

export type StoreData = {
  id?: string; name: string; slug: string; businessType?: string; targetAudience?: string
  heroTitle?: string; heroSubtitle?: string
  canonical?: { storeFeatures?: string[]; productCategories?: string[]; layoutVariant?: string; recommendedTechStack?: { paymentGateways?: string[] } }
  storeDNA?: { brandPersonality?: string; industry?: string }
  products?: Array<{ id: string; name: string; description?: string | null; price: string | number; currency?: string; category?: string | null; images?: Array<{ url: string; isPrimary?: boolean }>; variants?: Array<{ name: string; value: string }> }>
  storefrontCode?: string | null; storefrontVersion?: number
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001'

function fallback(slug: string): StoreData {
  const name = slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  return { id:`fallback-${slug}`, name, slug, businessType:'AI-built storefront', targetAudience:'modern shoppers', heroTitle:name, heroSubtitle:'A polished storefront.', canonical:{ storeFeatures:['Fast checkout','Curated catalog','Local delivery','AI merchandising'], productCategories:['Starter','Signature','Gift'], recommendedTechStack:{ paymentGateways:['Paystack'] } }, products:[ { id:`${slug}-1`, name:'Signature Starter Set', description:'A ready-to-launch bundle.', price:49, currency:'GHS', category:'Signature' }, { id:`${slug}-2`, name:'Daily Essential', description:'Your hero product.', price:28, currency:'GHS', category:'Starter' }, { id:`${slug}-3`, name:'Gift Box', description:'A premium giftable option.', price:72, currency:'GHS', category:'Gift' } ] }
}

export default function StorefrontPreview({ storeSlug }: { storeSlug: string }) {
  const { activeStore } = useStore()
  const [store, setStore]   = useState<StoreData | null>(null)
  const [loading, setLoading] = useState(true)
  const pollCount = useRef(0); const pollTimer = useRef<ReturnType<typeof setTimeout>|null>(null)

  useEffect(() => {
    let cancelled = false; pollCount.current = 0
    const load = async () => {
      if ((activeStore as StoreData|null)?.slug === storeSlug) { setStore(activeStore as StoreData); setLoading(false) }
      const token = typeof window !== 'undefined' ? localStorage.getItem('seltra:token') : null
      try {
        const res = await fetch(`${API_BASE}/api/v1/seltra/store/${encodeURIComponent(storeSlug)}`, { headers:token?{Authorization:`Bearer ${token}`}:{} })
        if (!cancelled && res.ok) { const d = await res.json(); setStore(d); setLoading(false); if (!d.storefrontCode && pollCount.current < 20) { pollCount.current++; if (pollTimer.current) clearTimeout(pollTimer.current); pollTimer.current = setTimeout(() => { if (!cancelled) load() }, 3000) } }
        else if (!cancelled) { setStore((activeStore as StoreData|null)?.slug === storeSlug ? activeStore as StoreData : fallback(storeSlug)); setLoading(false) }
      } catch { if (!cancelled) { setStore(fallback(storeSlug)); setLoading(false) } }
    }
    load()
    return () => { cancelled = true; if (pollTimer.current) clearTimeout(pollTimer.current) }
  }, [storeSlug, (activeStore as StoreData|null)?.storefrontCode])

  if (loading && !store) return <div className="flex min-h-[400px] items-center justify-center"><div className="flex flex-col items-center gap-2"><div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" /><div className="font-mono text-xs text-muted-foreground">building storefront...</div></div></div>
  if (!store) return null

  const themeKey = store.storeDNA?.brandPersonality==='luxury'?'luxury': store.canonical?.layoutVariant==='bold'?'bold-dark': store.canonical?.layoutVariant==='editorial'?'editorial':'minimal-light'
  return <StorefrontCanvas store={store} storeSlug={storeSlug} themeKey={themeKey} />
}
```

---

## TASK 21 — Write `components/storefront/StorefrontShell.tsx`

```tsx
'use client'
import { useState, useRef, useEffect, type ReactNode } from 'react'
import { Monitor, Smartphone, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

const DESIGN_WIDTH = 1280
const BASE = process.env.NEXT_PUBLIC_STOREFRONT_URL ?? ''

export function StorefrontShell({ slug, children }: { slug: string; children: ReactNode }) {
  const [device, setDevice] = useState<'desktop'|'mobile'>('desktop')
  const wrapRef = useRef<HTMLDivElement>(null); const [scale, setScale] = useState(1)

  useEffect(() => {
    if (device !== 'desktop') return
    const compute = () => { if (wrapRef.current) setScale(Math.min(1, wrapRef.current.getBoundingClientRect().width / DESIGN_WIDTH)) }
    compute(); const ro = new ResizeObserver(compute); if (wrapRef.current) ro.observe(wrapRef.current); return () => ro.disconnect()
  }, [device])

  return (
    <div className="flex h-full min-h-0 flex-col bg-card/20">
      <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-card/40 px-3 py-2">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-wider text-primary">// your store</div>
          <div className="truncate font-mono text-[11px] text-muted-foreground">{slug}.seltra.store</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border bg-background/70 p-0.5">
            {(['desktop','mobile'] as const).map((d) => (
              <button key={d} onClick={() => setDevice(d)} className={`flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors ${device===d?'bg-primary/15 text-primary':'hover:text-foreground'}`}>
                {d==='desktop'?<Monitor className="h-3.5 w-3.5" />:<Smartphone className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" asChild>
            <Link href={`${BASE}/store/${slug}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /> Open store</Link>
          </Button>
        </div>
      </div>
      <div className="relative flex-1 overflow-hidden bg-muted/10">
        <div className="absolute inset-0 overflow-y-auto overflow-x-hidden p-2">
          {device==='mobile' ? (
            <div className="mx-auto w-[390px] overflow-hidden rounded-xl border border-border bg-background shadow-xl">{children}</div>
          ) : (
            <div ref={wrapRef} className="w-full overflow-hidden rounded-xl border border-border bg-background shadow-xl">
              <div style={{ width:DESIGN_WIDTH, transformOrigin:'top left', transform:`scale(${scale})` }}
                ref={(el) => { if (!el) return; const u = () => { if (el.parentElement) el.parentElement.style.height=`${el.scrollHeight*scale}px` }; u(); const ro = new ResizeObserver(u); ro.observe(el) }}>
                {children}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

## TASK 22 — Write `components/storefront/AgentBuildStream.tsx`

```tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import { Check, Loader2, Brain, Package, Palette, CreditCard, Rocket, Zap } from 'lucide-react'

const STEP_DEFS = [
  { key:'intent',    label:'Understanding your business', sub:'Extracting brand DNA from your prompt',  icon:Brain    },
  { key:'blueprint', label:'Reasoning about your store',  sub:'Selecting layout, theme, and sections', icon:Zap      },
  { key:'products',  label:'Building your catalog',       sub:'Generating 8 launch-ready products',    icon:Package  },
  { key:'brand',     label:'Designing your brand',        sub:'Palette, fonts, and visual identity',   icon:Palette  },
  { key:'payments',  label:'Setting up payments',         sub:'Wiring Paystack for GHS checkout',      icon:CreditCard },
  { key:'deploy',    label:'Deploying your storefront',   sub:'Publishing to yourstore.seltra.store',  icon:Rocket   },
]
const LINES: Record<string,string[]> = {
  intent:    ['→ reading business prompt...','  extracting: industry, audience, tone','✓ business DNA locked'],
  blueprint: ['→ selecting layout template...','  matching composition rules...','✓ storefront blueprint ready'],
  products:  ['→ generating product catalog...','  naming + pricing 8 SKUs','✓ catalog generated'],
  brand:     ['→ building brand identity...','  primary color · fonts · spacing','✓ brand kit applied'],
  payments:  ['→ connecting Paystack...','  GHS + mobile money enabled','✓ checkout ready'],
  deploy:    ['→ publishing storefront...','  edge deploy complete','✓ store is live'],
}

export function AgentBuildStream({ storeName, buildSteps, isBuilding }: { storeName: string; buildSteps: Array<{ label: string; done: boolean }>; isBuilding: boolean }) {
  const [lines, setLines] = useState<string[]>([])
  const [curKey, setCurKey] = useState<string|null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const ai = buildSteps.findIndex((s) => !s.done)
  const activeStep = STEP_DEFS[ai] ?? null

  useEffect(() => {
    if (!isBuilding || !activeStep || activeStep.key === curKey) return
    setCurKey(activeStep.key); const ls = LINES[activeStep.key] ?? []; let i = 0
    const iv = setInterval(() => { if (i >= ls.length) { clearInterval(iv); return }; setLines((p) => [...p.slice(-30), ls[i]]); i++ }, 240)
    return () => clearInterval(iv)
  }, [activeStep, isBuilding, curKey])

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior:'smooth' }) }, [lines])

  const done = buildSteps.filter((s) => s.done).length
  const pct  = Math.round((done / Math.max(buildSteps.length, 1)) * 100)

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <div><div className="font-mono text-[10px] uppercase tracking-wider text-primary opacity-70">// agent is building</div><div className="mt-0.5 truncate text-sm font-semibold">{storeName||'Your store'}</div></div>
        <div className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-400" /><span className="font-mono text-[10px] text-yellow-400">WORKING</span></div>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width:`${pct}%` }} /></div>
      <div className="space-y-1.5">
        {STEP_DEFS.map((def, i) => {
          const step = buildSteps[i]; const isDone = step?.done ?? false; const isActive = i===ai && isBuilding; const Icon = def.icon
          return (
            <div key={def.key} className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs transition-all ${isDone?'opacity-60':isActive?'border border-primary/20 bg-primary/10':'opacity-30'}`}>
              <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border ${isDone?'border-primary/40 text-primary':isActive?'border-primary text-primary':'border-border text-muted-foreground'}`}>
                {isDone?<Check className="h-3 w-3" />:isActive?<Loader2 className="h-3 w-3 animate-spin" />:<Icon className="h-3 w-3" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className={`truncate font-medium ${isDone?'text-foreground/70':isActive?'text-foreground':'text-muted-foreground'}`}>{def.label}</div>
                {isActive && <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{def.sub}</div>}
              </div>
            </div>
          )
        })}
      </div>
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto rounded-lg border border-border bg-card/30 p-3 font-mono text-[11px] space-y-0.5">
        {lines.length===0&&<span className="text-muted-foreground">$ initialising agent<span className="animate-pulse">_</span></span>}
        {lines.map((l, i) => <div key={i} className={l.startsWith('✓')?'text-primary':l.startsWith('→')?'text-foreground/80':'text-muted-foreground'}>{l}</div>)}
        {isBuilding&&<span className="text-muted-foreground animate-pulse">_</span>}
      </div>
    </div>
  )
}
```

---

## TASK 23 — Verify the build

```bash
npm run build
```

Expected: Next.js build completes with no TypeScript errors.
If there are import errors, check that all section component files exist in `components/storefront/sections/`.
If there are type errors in `StorefrontCanvas.tsx`, verify `types.ts` is in `components/storefront/sections/types.ts`.

---

## TASK 24 — Final verification checklist

Confirm these files exist:
- `app/layout.tsx`
- `app/page.tsx`
- `app/globals.css`
- `app/auth/page.tsx`
- `app/(dashboard)/layout.tsx`
- `app/(dashboard)/dashboard/page.tsx`
- `app/store/[slug]/page.tsx`
- `app/store/[slug]/order/success/page.tsx`
- `middleware.ts`
- `next.config.ts`
- `components.json`
- `context/StoreContext.tsx`
- `lib/utils.ts`
- `components/storefront/StorefrontCanvas.tsx`
- `components/storefront/StorefrontPreview.tsx`
- `components/storefront/StorefrontShell.tsx`
- `components/storefront/AgentBuildStream.tsx`
- `components/storefront/themes/index.ts`
- `components/storefront/layouts/index.ts`
- `components/storefront/sections/types.ts`
- `components/storefront/sections/registry.ts`
- `components/storefront/sections/HeroSection.tsx`
- `components/storefront/sections/AnnouncementBar.tsx`
- `components/storefront/sections/TrustBar.tsx`
- `components/storefront/sections/CategoryStrip.tsx`
- `components/storefront/sections/ProductCard.tsx`
- `components/storefront/sections/ProductGrid.tsx`
- `components/storefront/sections/ProductShelf.tsx`
- `components/storefront/sections/BrandStory.tsx`
- `components/storefront/sections/SocialProof.tsx`
- `components/storefront/sections/Newsletter.tsx`
- `components/storefront/sections/FeaturedDrop.tsx`
- `components/storefront/sections/FAQSection.tsx`
- `components/storefront/sections/CountdownBanner.tsx`
- `components/storefront/sections/BeforeAfter.tsx`
- `components/storefront/sections/FounderStory.tsx`
- `components/storefront/sections/IngredientsList.tsx`
- `components/storefront/sections/LookbookGrid.tsx`
- `components/storefront/sections/CartDrawer.tsx`

Confirm `backend/` is completely untouched:
```bash
git diff --name-only backend/
```
This must return empty (no changes).

---

## What this build produces

### Storefront output quality (vs seltra-web)

| Feature | seltra-web (old) | seltra-web-modern (this build) |
|---|---|---|
| Hero background | Raw CSS gradient string | Mesh gradient via CSS variables + real product image at 12% opacity |
| Product image fallback | SVG initials | Gradient tile with unique angle per product ID |
| Animations | None | Framer Motion on every section, staggered hero text, cart spring |
| Per-tenant theming | Inline styles everywhere | CSS variables injected once, zero inline styles in sections |
| Font loading | Link tag (FOUT) | CSS @import inside style tag + Google Fonts |
| Cart UX | Plain div | Framer Motion spring drawer + AnimatePresence |
| Nav | Static | Sticky + backdrop blur + animated cart count |
| Public storefront | Client-side only | React Server Component with ISR (revalidate 30s) |
| Multi-tenancy | Frontend routing | Next.js middleware subdomain routing |
| shadcn/ui | Used in dashboard only | Used as base primitives in every storefront section |

### To run after build

```bash
# Terminal 1 — backend (unchanged)
cd backend && npm run start:dev

# Terminal 2 — frontend
npm run dev
```

Go to `http://localhost:3000` → redirects to `/dashboard` → sign in → type a store prompt → storefront renders in the right panel.

Public storefronts: `http://localhost:3000/store/{slug}`