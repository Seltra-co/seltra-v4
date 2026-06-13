//seltra-web/frontend/app/page.tsx
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
  ArrowUpRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MessageSquare, Wand2, Rocket } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { toast } from '@/hooks/use-toast'

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

// ─── Merchant logos ────────────────────────────────────────────────────────
// Supabase-style trust strip: grayscale by default, full color/visible on
// hover. Real merchant logos for Kem's Outlet and De-Yogo Bar; the rest are
// styled text wordmarks treated the same way.
type BrandLogo = {
  name: string
  img?: string
  font?: string
}

const logos: BrandLogo[] = [
  { name: 'Foundry Co.', font: 'font-serif italic font-semibold' },
  { name: 'Aya Botanics', font: 'font-sans font-medium tracking-wide' },
  { name: 'Volta Supply Co.', font: 'font-sans font-bold uppercase tracking-tight' },
  { name: "Kem's Outlet", img: '/seltra/kems-outlet.jpg' },
  { name: 'Rafiki Studio', font: 'font-mono font-semibold lowercase' },
  { name: 'Forme Skincare', font: 'font-serif font-light tracking-widest uppercase' },
  { name: 'De-Yogo Bar', img: '/seltra/deyogo-bar.jpg' },
  { name: 'Indigo House', font: 'font-sans font-bold uppercase tracking-tight' },
  { name: 'Cedar', font: 'font-serif font-semibold tracking-[0.2em] uppercase' },
  { name: 'Kora Living', font: 'font-sans font-semibold' },
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
    desc: 'Cards, mobile money, and bank transfers wired up from day one. Ghana and Nigeria-ready.',
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

// ─── Simple modal that avoids all radix/forwardRef JSX issues ────────────────
function SimpleModal({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-lg">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  )
}

// ─── Header ──────────────────────────────────────────────────────────────────
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
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">
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
            <Link
              href={authed ? '/dashboard' : '/auth?next=/dashboard'}
              className="py-2 text-muted-foreground hover:text-primary sm:hidden"
              onClick={() => setOpen(false)}
            >
              {authed ? '/dashboard' : '/merchant-login'}
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  const [chatInput, setChatInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleRun = async () => {
    setIsLoading(true)
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
          {/* Backed by Moolre */}
          <div className="mb-1 flex justify-center">
            <a
              // href="https://startup.moolre.com/?product=storefront#products"
              // target="_blank"
              // rel="noreferrer"
              className="group inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3.5 py-1.5 font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary/40"
            >
              <span>Backed by</span>
              <span className="inline-flex items-center gap-1.5 font-sans font-semibold">
                <img
                  src="/seltra/moolre-icon.png"
                  alt="Moolre"
                  className="h-3.5 w-3.5"
                />
                <span style={{ color: '#f7941d' }}>Moolre</span>
              </span>
            </a>
          </div>

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
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
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
                  <button
                    type="button"
                    onClick={() => void handleRun()}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black transition-colors hover:bg-primary hover:text-primary-foreground disabled:pointer-events-none disabled:opacity-60 sm:h-9 sm:w-9"
                    disabled={!chatInput.trim() || isLoading}
                    title="Build store"
                  >
                    {isLoading ? (
                      <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                    ) : (
                      <ArrowUp className="h-4 w-4" />
                    )}
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

// ─── Trust Logos ──────────────────────────────────────────────────────────────
// trust strip: each card shows a brand mark + name, gently
// fading in and out on a staggered loop so the row feels alive without
// being a distracting marquee.
function TrustLogos() {
  const repeated = [...logos, ...logos]

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
            {repeated.map((brand, index) => (
              <div
                key={`${brand.name}-${index}`}
                className="logo-fade group flex h-16 w-44 flex-shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-background/70 px-5 text-center shadow-sm"
                style={{ animationDelay: `${(index % logos.length) * 0.45}s` }}
              >
                {brand.img ? (
                  <img
                    src={brand.img}
                    alt={brand.name}
                    className="h-9 w-9 rounded-full object-cover grayscale transition-all duration-300 group-hover:grayscale-0"
                  />
                ) : null}
                <span
                  className={`truncate text-muted-foreground transition-colors duration-300 group-hover:text-foreground ${brand.font ?? 'font-sans font-medium'}`}
                >
                  {brand.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes logo-fade {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 1; }
        }
        .logo-fade {
          animation: logo-fade 4.5s ease-in-out infinite;
        }
      `}</style>
    </section>
  )
}

// ─── Showcase ─────────────────────────────────────────────────────────────────
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
            { v: '1,800', l: 'Visits across stores / week' },
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

// ─── How It Works ─────────────────────────────────────────────────────────────
const steps = [
  {
    icon: MessageSquare,
    title: 'Describe your business',
    desc: "Type what you're selling, who you're selling to, and where. The agent handles the rest.",
    // code: "$ seltra build 'skincare for gen-z in accra'",
  },
  {
    icon: Wand2,
    title: 'Agent builds your stack',
    desc: 'Products, images, storefront, domain, and payments scaffolded in under 15 minutes.',
    // code: '✓ 7 steps · 12m 04s',
  },
  {
    icon: Rocket,
    title: 'Ship and scale',
    desc: 'Your store goes live on your subdomain. The agent keeps it running, updated, and converting.',
    // code: 'agent.status = autopilot',
  },
]

function HowItWorks() {
  return (
    <section id="pipeline" className="py-20 sm:py-28 border-t border-border">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-3xl mb-12 sm:mb-16">
          <div className="font-mono text-xs text-primary mb-3">// how it works</div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            One prompt. <span className="text-primary">Live store.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <div key={i} className="relative rounded-xl border border-border bg-card p-6 sm:p-8">
              <div className="absolute -top-3 left-6 font-mono text-[10px] px-2 py-0.5 rounded bg-primary text-primary-foreground">
                step_{String(i + 1).padStart(2, '0')}
              </div>
              <div className="h-10 w-10 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center mb-5 mt-2">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-xl mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">{s.desc}</p>
              {/* <div className="font-mono text-[11px] text-primary bg-[hsl(var(--terminal-bg))] border border-border rounded-md px-3 py-2 truncate">
                {s.code}
              </div> */}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Narrative ──────────────────────────────────────────────────────────────
function Narrative() {
  return (
    <section className="border-t border-border py-20 sm:py-28">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-3 font-mono text-xs text-primary">{'// why seltra exists'}</p>
          <h2 className="mb-6 text-2xl font-semibold leading-tight tracking-[-0.025em] sm:text-4xl md:text-5xl">
            Commerce is becoming
            <br />
            <span className="text-primary">autonomous and AI-first.</span>
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            Most small and medium businesses (SMEs) still run on a patchwork of DMs, spreadsheets, and disconnected tools — selling through Instagram, taking orders on WhatsApp, tracking inventory in a notebook, with no real storefront and no way to scale past one person doing everything manually. Going from "I sell things online" to "I run an online business" has always required a developer, a designer, and weeks of setup.
          </p>
          <p className="mt-6 text-base font-medium leading-relaxed text-foreground sm:text-lg">
            We built Seltra so that gap closes to one sentence.
          </p>

          <div className="mt-10 flex items-center justify-center gap-3">
            {/* <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card font-mono text-xs font-semibold text-foreground">
              W
            </div> */}
            <img src="/seltra/william.jpg" className="h-10 w-10 rounded-full object-cover" alt="William" />
            <div className="text-left">
              <div className="text-sm font-medium text-foreground">William</div>
              <div className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">Co-founder, Seltra</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Investors ────────────────────────────────────────────────────────────────
const backers = [
  { initials: 'HB', name: 'Harold Benji', role: 'CEO, Abonten Technology' },
  { initials: 'JO', name: 'James Owuraku', role: 'Operations Lead' },
  { initials: 'NM', name: 'Nana M.', role: 'Founder' },
  { initials: 'EA', name: 'Ewurabena A.', role: 'Business Advisor' },
]

const seeded = (i: number) => {
  const x = Math.sin(i * 9301 + 49297) * 233280
  return x - Math.floor(x)
}
const palette = ['bg-muted/40', 'bg-muted/20', 'bg-card', 'bg-background', 'bg-primary/10', 'bg-muted/60']
const TILE_COUNT = 132

const investorStats = [
  { v: '10+', l: 'Early angels committed' },
  { v: '10+', l: 'Merchants' },
  { v: 'BETA', l: 'Live' },
  { v: '15 min', l: 'Idea to live store' },
]

function Investors() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', ticket_size: '', note: '' })

  // Display-only: shows a toast and closes
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) {
      toast({ title: 'Please fill in your name and email' })
      return
    }
    toast({
      title: "Thanks — we'll be in touch",
      description: 'Your interest has been recorded. We\'ll reach out shortly.',
    })
    setOpen(false)
    setForm({ name: '', email: '', ticket_size: '', note: '' })
  }

  return (
    <section id="investors" className="py-20 sm:py-28 border-t border-border">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-20 items-start">

          {/* Left: copy */}
          <div className="lg:sticky lg:top-24">
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-4">
              Backed by early believers
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.035em] leading-[1.05] mb-5">
              Built with people<br />
              who <em className="font-serif italic text-primary/90">believe</em> in the mission
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-lg">
              A small group of close advisors, operators, and friends helping us get from zero to our first merchants — each one invested personally in the problem we're solving.
            </p>

            <div className="mt-6 inline-flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground border border-border rounded-full px-4 py-2 bg-card/40">
              {/* <span>+ Friends &amp; family round</span> */}
              {/* <span className="text-border">·</span> */}
              <span>Featured: Moolre Spotlight, Demo Fridays 8.0</span>
              {/* <span className="text-border">·</span>
              <span>$50K cap</span> */}
            </div>

            <div className="mt-8 grid grid-cols-2 gap-px bg-border rounded-2xl overflow-hidden border border-border max-w-lg">
              {investorStats.map((s, i) => (
                <div key={i} className="bg-background p-4">
                  <div className="text-xl font-semibold text-foreground tracking-tight">{s.v}</div>
                  <div className="text-[10px] text-muted-foreground mt-1 font-mono leading-snug">{s.l}</div>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <button
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card hover:border-primary/40 hover:text-primary transition-colors px-5 py-2.5 text-sm font-medium"
              >
                Join the round <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Right: backer tile wall */}
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-6">
              Our founding backers
            </p>

            <div
              className="relative w-full h-[360px] sm:h-[440px] overflow-hidden rounded-2xl border border-border bg-background"
              style={{ perspective: '900px' }}
            >
              <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-b from-background/80 via-transparent to-background" />
              <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-r from-background via-transparent to-background" />

              <div
                className="absolute inset-0 grid grid-cols-12 gap-1.5 p-4"
                style={{
                  transform: 'rotateX(35deg) rotateZ(-2deg) scale(1.15)',
                  transformOrigin: 'center 60%',
                }}
              >
                {Array.from({ length: TILE_COUNT }).map((_, i) => {
                  const named = [
                    { pos: 28, b: backers[0] },
                    { pos: 47, b: backers[1] },
                    { pos: 64, b: backers[2] },
                    { pos: 81, b: backers[3] },
                  ].find((n) => n.pos === i)

                  const yourSpot = i === 55

                  const r = seeded(i)
                  const bg = palette[Math.floor(r * palette.length)]
                  const opacity = Math.round((0.4 + seeded(i + 1) * 0.6) * 10000) / 10000
                  
                  if (named) {
                    return (
                      <div
                        key={i}
                        className="aspect-square rounded-sm bg-card border border-primary/30 flex items-center justify-center font-mono text-[10px] sm:text-xs font-semibold text-foreground shadow-lg shadow-primary/10"
                        title={`${named.b.name} — ${named.b.role}`}
                      >
                        {named.b.initials}
                      </div>
                    )
                  }

                  if (yourSpot) {
                    return (
                      <button
                        key={i}
                        onClick={() => setOpen(true)}
                        className="aspect-square rounded-sm bg-primary/20 border border-primary/50 flex items-center justify-center hover:bg-primary/30 transition-colors"
                        title="Your spot — round still open"
                      >
                        <Plus className="h-3 w-3 text-primary" />
                      </button>
                    )
                  }

                  return (
                    <div
                      key={i}
                      className={`aspect-square rounded-sm ${bg} border border-border/40`}
                      style={{ opacity }}
                    />
                  )
                })}
              </div>
            </div>

            <p className="font-mono text-[11px] text-muted-foreground mt-4 text-center">
              4 named backers · Your spot still open —{' '}
              <button onClick={() => setOpen(true)} className="text-primary hover:underline">
                join the round
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Modal — no radix, no forwardRef issues */}
      <SimpleModal open={open} onClose={() => setOpen(false)}>
        <div className="mb-4">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Join the round</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Share a few details and we'll follow up with the SAFE and round info.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label htmlFor="inv-name" className="block text-sm font-medium text-foreground">
              Full name
            </label>
            <Input
              id="inv-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ada Lovelace"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="inv-email" className="block text-sm font-medium text-foreground">
              Email
            </label>
            <Input
              id="inv-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@domain.com"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="inv-ticket" className="block text-sm font-medium text-foreground">
              Ticket size <span className="text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="inv-ticket"
              value={form.ticket_size}
              onChange={(e) => setForm({ ...form, ticket_size: e.target.value })}
              placeholder="$100"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="inv-note" className="block text-sm font-medium text-foreground">
              Anything else? <span className="text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="inv-note"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="A short note..."
            />
          </div>

          <Button type="submit" className="w-full rounded-full h-11">
            Submit interest →
          </Button>
        </form>
      </SimpleModal>
    </section>
  )
}

// ─── Features ─────────────────────────────────────────────────────────────────
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

        <p className="mt-5 text-center font-mono text-[11px] text-muted-foreground">
          SSL/TLS encrypted · PCI-compliant payment processing · Your data stays private and protected
        </p>
      </div>
    </section>
  )
}

// ─── CTA ──────────────────────────────────────────────────────────────────────
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

// ─── Footer ───────────────────────────────────────────────────────────────────
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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <Hero />
      <TrustLogos />
      <Showcase />
      <Features />
      <HowItWorks />
      <Narrative />
      <Investors />
      <CTA />
      <Footer />
    </div>
  )
}