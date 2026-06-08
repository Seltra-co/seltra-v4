'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Send, LogOut, Package, BarChart3, Home, Store as StoreIcon, ShoppingBag, Users, Mail, Settings, Paperclip } from 'lucide-react'
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

  const startConv = useCallback(async (prompt: string) => {
    setSending(true)
    setMsgs([{ role: 'user', content: prompt }])
    let store = activeStore
    if (!store) {
      const { data } = await apiFetch<{ store: StoreData }>('/api/v1/seltra/store', { method: 'POST', body: JSON.stringify({ name: prompt.slice(0, 48), prompt }) })
      if (data?.store) { store = data.store; setActiveStore(data.store); setRev((v) => v + 1) }
    }
    if (store) setMsgs((prev) => [...prev, { role: 'assistant', content: buildFeedback(store!) }])
    setSending(false)
  }, [activeStore, setActiveStore])

  useEffect(() => {
    const pending = sessionStorage.getItem('seltra:pending_prompt')
    if (pending) { sessionStorage.removeItem('seltra:pending_prompt'); void startConv(pending) }
  }, [startConv])

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
            <div className="font-mono text-[11px] text-primary mb-2">{`// ${tab}`}</div>
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
                <span className="font-mono text-xs text-primary">{`// agent ${activeStore ? `for ${activeStore.name}` : ''}`}</span>
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
