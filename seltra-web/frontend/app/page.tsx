'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowUp,
  ChevronDown,
  Cog,
  CreditCard,
  Github,
  ImageIcon,
  Menu,
  Mic,
  Plus,
  Sparkles,
  Twitter,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001'

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('seltra:token') : null
}

async function listStores() {
  const token = getToken()
  if (!token) return []
  try {
    const res = await fetch(`${API_BASE}/api/v1/seltra/store`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = await res.json().catch(() => [])
    return Array.isArray(json) ? json : []
  } catch {
    return []
  }
}

const examples = [
  'Launch a skincare brand for Gen Z women in San Francisco',
  'Start a print-on-demand streetwear store',
  'Open a B2B coffee wholesale shop',
  'Build a handmade jewelry boutique',
]

const logos = [
  'Foundry Co.',
  'Aya Botanics',
  'Volta Supply Co.',
  'Muse & Thread',
  'Rafiki Studio',
  'Forme Skincare',
  'The Craft Edit',
  'Indigo House',
  'Cedar',
  'Kora Living',
]

const showcaseStores = [
  {
    name: 'Lumen Skincare',
    category: 'Beauty - Accra',
    desc: 'Gen Z skincare brand. Built in 4 minutes.',
    image: '/seltra/store-lumen.jpg',
  },
  {
    name: 'Fashionbrand',
    category: 'Apparel - Drops',
    desc: 'Bold streetwear drops with a cinematic storefront.',
    image: '/seltra/store-fashionbrand.jpg',
  },
  {
    name: 'Handmade Jewels',
    category: 'Jewelry - Editorial',
    desc: 'Handmade necklaces, earrings and rings. Editorial feel.',
    image: '/seltra/store-handmade.jpg',
  },
]

const features = [
  {
    icon: Sparkles,
    title: 'AI Store Generation',
    desc: 'Describe your business, get a full storefront with branded products, copy, and images. No templates. No drag-and-drop.',
  },
  {
    icon: CreditCard,
    title: 'Payments, built in',
    desc: 'Paystack wired up on day one. Accept mobile money, cards, and bank transfers. Ghana and Nigeria-ready.',
  },
  {
    icon: ImageIcon,
    title: 'Product Image AI',
    desc: 'Upload a photo or describe your product. Seltra generates studio-quality images automatically.',
  },
  {
    icon: Cog,
    title: 'Agent-run operations',
    desc: 'Your store restocks, reprices, and updates itself. You focus on traffic. The agent handles the rest.',
  },
]

function Header() {
  const [open, setOpen] = useState(false)
  const [authed, setAuthed] = useState(false)

  useEffect(() => setAuthed(Boolean(getToken())), [])

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between">
          <div className="flex min-w-0 items-center gap-6 lg:gap-10">
            <Link href="/" className="flex min-w-0 items-center gap-2">
              <img src="/seltra/seltra-icon.png" alt="Seltra" className="h-7 w-7 shrink-0 rounded-md" />
              <span className="font-mono font-semibold tracking-tight text-foreground">seltra</span>
              <span className="hidden rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">beta</span>
            </Link>

            <nav className="hidden items-center gap-7 font-mono text-xs text-muted-foreground lg:flex">
              <Link href="/#showcase" className="transition-colors hover:text-primary">/showcase</Link>
              <Link href="/careers" className="transition-colors hover:text-primary">/careers</Link>
              <Link href="/apply" className="transition-colors hover:text-primary">/apply</Link>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant={authed ? 'default' : 'ghost'} className="hidden rounded-md font-mono text-xs sm:inline-flex">
              <Link href={authed ? '/dashboard' : '/auth?next=/dashboard'}>Merchant login</Link>
            </Button>
            <Button asChild size="sm" className="rounded-md font-mono text-xs">
              <Link href="/apply">Apply to sell on Seltra</Link>
            </Button>
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen((value) => !value)} aria-label="Toggle menu">
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background lg:hidden">
          <nav className="container mx-auto flex flex-col gap-3 px-4 py-4 font-mono text-sm">
            <Link href="/#showcase" className="py-2 text-muted-foreground hover:text-primary" onClick={() => setOpen(false)}>/showcase</Link>
            <Link href="/careers" className="py-2 text-muted-foreground hover:text-primary" onClick={() => setOpen(false)}>/careers</Link>
            <Link href="/apply" className="py-2 text-muted-foreground hover:text-primary" onClick={() => setOpen(false)}>/apply</Link>
            <Link href="/auth?next=/dashboard" className="py-2 text-muted-foreground hover:text-primary sm:hidden" onClick={() => setOpen(false)}>/merchant-login</Link>
          </nav>
        </div>
      )}
    </header>
  )
}

function Hero() {
  const [chatInput, setChatInput] = useState('')
  const router = useRouter()

  const handleRun = async () => {
    const prompt = chatInput.trim()
    if (prompt) sessionStorage.setItem('seltra:pending_prompt', prompt)

    if (!getToken()) {
      router.push('/auth?next=/onboarding')
      return
    }

    if (prompt) {
      router.push('/dashboard')
      return
    }

    const existing = await listStores()
    router.push(existing.length > 0 ? '/dashboard' : '/onboarding')
  }

  return (
    <section className="relative overflow-hidden pb-10 pt-24 sm:pb-12 sm:pt-28">
      <div className="bg-radial-fade pointer-events-none absolute inset-0" />

      <div className="container relative z-10 mx-auto px-4 sm:px-6">
        <div className="fade-in mx-auto w-full max-w-3xl space-y-3 text-center sm:space-y-4">
          <h1 className="text-balance px-2 text-[2rem] font-semibold leading-[1.08] tracking-[-0.035em] text-foreground sm:text-4xl md:text-5xl">
            Describe your store.
            <br />
            <span className="text-primary">Seltra builds and runs it.</span>
          </h1>

          <p className="text-balance mx-auto max-w-xl text-sm font-normal leading-relaxed text-muted-foreground sm:text-base">
            Launch a full storefront today. Our agents handle operations, marketing, payments, and fulfillment.
          </p>

          <div className="mx-auto max-w-[720px] pt-3">
            <div className="group overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#1f2220] text-left shadow-[0_18px_60px_-36px_hsl(var(--primary)/0.55)] transition-colors focus-within:border-primary/45 sm:rounded-[1.5rem]">
              <div className="px-4 pb-1 pt-4 sm:px-5 sm:pb-2">
                <textarea
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      void handleRun()
                    }
                  }}
                  placeholder="Describe your business and what you want to sell..."
                  className="h-[58px] w-full resize-none bg-transparent text-sm leading-relaxed text-foreground placeholder:text-white/45 focus:outline-none sm:h-[68px] sm:text-base lg:h-[76px]"
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-between gap-3 px-3 pb-3 sm:px-4">
                <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/55 transition-colors hover:border-primary/40 hover:text-primary sm:h-9 sm:w-9" title="Attach files">
                  <Plus className="h-4 w-4" />
                </button>

                <div className="flex items-center gap-2">
                  <button type="button" className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-white/55 transition-colors hover:bg-white/[0.04] hover:text-white sm:inline-flex">
                    Build <ChevronDown className="h-4 w-4" />
                  </button>
                  <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/[0.04] hover:text-white sm:h-9 sm:w-9" title="Voice prompt">
                    <Mic className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => void handleRun()} className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black transition-colors hover:bg-primary hover:text-primary-foreground disabled:pointer-events-none disabled:opacity-45 sm:h-9 sm:w-9" disabled={!chatInput.trim()} title="Build store">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap justify-center gap-1.5 sm:mt-4 sm:gap-2">
              {examples.map((example) => (
                <button key={example} onClick={() => setChatInput(example)} className="rounded-full border border-white/10 bg-card/50 px-2.5 py-1.5 font-mono text-[10px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary sm:px-3 sm:text-[11px]">
                  {'->'} {example}
                </button>
              ))}
            </div>

            <div className="mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row">
              <Button className="rounded-md" asChild>
                <Link href="/apply">Apply to sell on Seltra</Link>
              </Button>
              <Button variant="ghost" className="rounded-md" asChild>
                <Link href="/auth?next=/dashboard">Merchant login</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function TrustLogos() {
  const repeatedLogos = [...logos, ...logos]
  return (
    <section className="border-y border-border bg-card/30 py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-primary">merchant trust</p>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Seltra powers merchants everywhere, from first sale to scaling brand
          </h2>
        </div>

        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-card/95 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-card/95 to-transparent" />
          <div className="trust-logo-track flex w-max items-center gap-6">
            {repeatedLogos.map((logo, index) => (
              <div key={`${logo}-${index}`} className="flex h-16 w-44 flex-shrink-0 items-center justify-center rounded-md border border-border bg-background/70 px-5 text-center font-semibold text-muted-foreground shadow-sm">
                {logo}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function Showcase() {
  return (
    <section id="showcase" className="border-t border-border py-20 sm:py-28">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="mb-12 max-w-2xl sm:mb-16">
          <p className="mb-3 font-mono text-xs text-primary">{'// showcase'}</p>
          <h2 className="mb-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl md:text-5xl">
            Live stores built with Seltra.
          </h2>
          <p className="text-base text-muted-foreground sm:text-lg">
            Real businesses. Real revenue. All launched from a single prompt.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {showcaseStores.map((store) => (
            <a key={store.name} href="#" className="group relative overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/40">
              <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                <img src={store.image} alt={`${store.name} storefront preview`} loading="lazy" className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]" />
                <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent" />
                <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-background/70 px-2 py-0.5 font-mono text-[10px] text-foreground backdrop-blur">
                  <span className="pulse-glow h-1.5 w-1.5 rounded-full bg-primary" />
                  live
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-semibold text-foreground">{store.name}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{store.category}</p>
                <p className="mt-3 text-sm text-muted-foreground">{store.desc}</p>
              </div>
            </a>
          ))}
        </div>

        <div className="mt-12 grid grid-cols-2 overflow-hidden rounded-2xl border border-border bg-card/40 sm:mt-16 lg:grid-cols-4">
          {[
            { v: '10+', l: 'Merchants in pipeline' },
            { v: '1,800', l: 'Visits across stores / day' },
            { v: 'GHS 42k', l: 'Daily merchant payments processed' },
            { v: '15 min', l: 'Avg. time to live' },
          ].map((stat, index, arr) => (
            <div key={stat.l} className={`border-border p-6 text-center ${index < arr.length - 1 ? 'border-r' : ''} ${index < 2 ? 'border-b lg:border-b-0' : ''}`}>
              <div className="text-2xl font-semibold tracking-tight text-primary sm:text-3xl">{stat.v}</div>
              <div className="mt-1 font-mono text-xs text-muted-foreground">{stat.l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Features() {
  return (
    <section className="relative py-20 sm:py-28">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="mb-12 max-w-3xl sm:mb-16">
          <div className="mb-3 font-mono text-xs text-primary">{'// stack'}</div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Not a builder. <span className="text-primary">Specialized agents that run your store.</span>
          </h2>
        </div>

        <div className="grid overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
          {features.map((feature) => (
            <div key={feature.title} className="group bg-background p-6 transition-colors hover:bg-card sm:p-8">
              <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-md border border-border bg-card transition-colors group-hover:border-primary/50">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CTA() {
  return (
    <section id="cta" className="border-t border-border py-24 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="relative mx-auto max-w-3xl text-center">
          <div className="bg-radial-fade absolute inset-0 -z-10" />
          <h2 className="text-balance mb-5 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Your store is <span className="text-primary">one prompt</span> away.
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-base text-muted-foreground sm:text-lg">
            No code. No designers. No dashboards. Just describe what you are building.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="rounded-md px-7" asChild>
              <Link href="/apply">Apply to sell on Seltra</Link>
            </Button>
            <Button size="lg" variant="ghost" className="rounded-md px-7" asChild>
              <Link href="/auth?next=/dashboard">Merchant login</Link>
            </Button>
          </div>
          <p className="mt-5 font-mono text-[11px] text-muted-foreground">
            Free to start. No credit card required. Live in minutes.
          </p>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-border bg-background py-10">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <Link href="/" className="mb-2 flex items-center gap-2">
              <img src="/seltra/seltra-icon.png" alt="Seltra" className="h-6 w-6 rounded-md" />
              <span className="font-mono font-semibold">seltra</span>
            </Link>
            <p className="max-w-md text-sm text-muted-foreground">Commerce that runs itself.</p>
          </div>

          <div className="flex flex-wrap items-center gap-4 font-mono text-xs text-muted-foreground sm:gap-6">
            <Link href="/careers" className="transition-colors hover:text-primary">careers</Link>
            <Link href="/terms" className="transition-colors hover:text-primary">terms</Link>
            <Link href="/privacy" className="transition-colors hover:text-primary">privacy</Link>
            <a href="https://x.com/seltra" target="_blank" rel="noreferrer" className="transition-colors hover:text-primary" aria-label="Twitter">
              <Twitter className="h-4 w-4" />
            </a>
            <a href="https://github.com/" target="_blank" rel="noreferrer" className="transition-colors hover:text-primary" aria-label="GitHub">
              <Github className="h-4 w-4" />
            </a>
          </div>
        </div>
        <div className="mt-8 flex flex-col justify-between gap-2 border-t border-border pt-6 font-mono text-[11px] text-muted-foreground sm:flex-row">
          <div>Copyright 2026 Seltra Inc. All rights reserved.</div>
          <div>seltra.co / v0.1.0 / all systems <span className="text-primary">online</span></div>
        </div>
      </div>
    </footer>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <Hero />
      <TrustLogos />
      <Showcase />
      <Features />
      <CTA />
      <Footer />
    </div>
  )
}
