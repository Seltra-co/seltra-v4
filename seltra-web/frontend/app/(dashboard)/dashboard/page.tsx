//seltra-web/frontend/app/(dashboard)/dashboard/page.tsx
'use client'
import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Send, Plus, LogOut, Package, BarChart3, Home,
  Store as StoreIcon, ShoppingBag, Users, Mail,
  Settings, Paperclip, ChevronLeft, ChevronRight,
  TrendingUp, Wallet, Menu, X, Trash2, Copy, CalendarDays,
  MessageSquare,
} from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
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

const money = (value: string | number | null | undefined, currency = 'GHS') =>
  `${currency} ${Number(value ?? 0).toFixed(2)}`

const statusClass = (status: string) => {
  if (/paid|delivered|complete/i.test(status)) return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
  if (/cancel|failed|refund/i.test(status)) return 'border-red-500/30 bg-red-500/10 text-red-500'
  return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-500'
}

const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']

const hasConfirmedPayment = (order: OrderRecord) =>
  order.merchantAmount !== null && order.merchantAmount !== undefined

const storeIdOf = (store: StoreData | null) => store?.id ?? store?.slug

async function createConversation(title: string, userId?: string) {
  const { data, error } = await apiFetch<Conversation>('/api/v1/conversations', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId ?? 'merchant', title: title.slice(0, 60) || 'New store' }),
  })
  return { data, error }
}

async function saveMessage(conversationId: string | undefined, role: 'user' | 'assistant', content: string, userId?: string) {
  if (!conversationId) return
  await apiFetch<MessageRecord>(`/api/v1/conversations/${encodeURIComponent(conversationId)}/messages`, {
    method: 'POST',
    body: JSON.stringify({ conversation_id: conversationId, user_id: userId ?? 'merchant', role, content }),
  })
}

const NAV_TABS = [
  { id: 'home',      label: 'Home',      icon: Home       },
  { id: 'store',     label: 'Store',     icon: StoreIcon  },
  { id: 'orders',    label: 'Orders',    icon: ShoppingBag },
  { id: 'sales',     label: 'Sales',     icon: TrendingUp },
  { id: 'payments',  label: 'Payments',  icon: Wallet     },
  { id: 'products',  label: 'Products',  icon: Package    },
  { id: 'customers', label: 'Customers', icon: Users      },
  { id: 'analytics', label: 'Analytics', icon: BarChart3  },
  { id: 'emails',    label: 'Emails',    icon: Mail       },
  { id: 'settings',  label: 'Settings',  icon: Settings   },
]

type Msg = { role: 'user' | 'assistant'; content: string }

type UserRecord = {
  id?: string
  email: string
  name?: string
  created_at?: string
  createdAt?: string
  user_metadata?: Record<string, string | undefined>
}

type Conversation = {
  id: string
  title: string
  created_at?: string
  updated_at?: string
  user_id?: string
}

type MessageRecord = {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  user_id: string
}

type OrderRecord = {
  id: string
  customerEmail: string
  customerName?: string
  customerPhone?: string | null
  totalAmount: string | number
  currency: string
  status: string
  paystackRef?: string
  items: Array<{ productId?: string; productName?: string; quantity: number; price: string | number }>
  merchantAmount?: string | number | null
  seltraFee?: string | number | null
  createdAt: string
}

type CustomerRecord = {
  id: string
  name?: string | null
  email: string
  phone?: string | null
  address?: string | null
  city?: string | null
  country?: string | null
  marketingOptIn: boolean
  orderCount: number
  totalSpent: string | number
  currency: string
  lastOrderAt?: string | null
  isRecurring: boolean
}

type LedgerTransaction = {
  id: string
  type: string
  amount: string | number
  currency: string
  description?: string
  createdAt: string
}

type Ledger = {
  balance: string | number
  currency: string
  transactions: LedgerTransaction[]
}

function buildFeedback(store: StoreData): string {
  const c    = (store as unknown as { canonical: Record<string, unknown> }).canonical ?? {}
  const cats = Array.isArray(c.productCategories) ? (c.productCategories as string[]).join(', ') : 'your catalog'
  const prodCount = Array.isArray(store.products) ? store.products.length : 0
  return [
    `**${store.name}** is ready.`,
    `Positioned for ${store.targetAudience ?? 'your customers'} with ${prodCount} products across ${cats}.`,
    `Paystack is wired for checkout. Your store is live at \`${store.slug}.seltra.co\`.`,
    `Ask me to add products, update colors, refine copy, or attach a logo file.`,
  ].join('\n\n')
}

function getBuildSteps(store: StoreData | null, building: boolean) {
  const products = store?.products?.length ?? 0
  const hasImages = Boolean(store?.products?.some((p: unknown) => {
    const pr = p as { images?: { url: string }[] }
    return Array.isArray(pr.images) && pr.images.length > 0
  }))
  const hasPay = Boolean((store as unknown as { paymentProviders?: unknown[] })?.paymentProviders?.length)
  const hasCode = Boolean((store as StoreData & { storefrontCode?: string })?.storefrontCode)
  return [
    { label: 'Parsing business intent',    done: Boolean(store) || building },
    { label: 'Generating store blueprint', done: Boolean(store) },
    { label: 'Creating product catalog',   done: products > 0 },
    { label: 'Resolving product images',   done: hasImages },
    { label: 'Wiring Paystack checkout',   done: hasPay },
    { label: 'Composing storefront',       done: hasCode },
    { label: 'Publishing to edge',         done: hasCode },
  ]
}

export default function DashboardPage() {
  const router = useRouter()
  const { activeStore, setActiveStore } = useStore()

  const [user,          setUser]          = useState<{ id?: string; email: string; name: string; avatar: string; joinedAt?: string } | null>(null)
  const [msgs,          setMsgs]          = useState<Msg[]>([])
  const [input,         setInput]         = useState('')
  const [sending,       setSending]       = useState(false)
  const [tab,           setTab]           = useState('home')
  const [rev,           setRev]           = useState(0)
  const [convId,        setConvId]        = useState<string | undefined>()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [sidebarOpen,   setSidebarOpen]   = useState(true)
  const [mobileSidebar, setMobileSidebar] = useState(false)
  const [stores,        setStores]        = useState<StoreData[]>([])

  // Sidebar auto-collapses when agent is working to give preview more space
  useEffect(() => {
    if (sending) setSidebarOpen(false)
  }, [sending])

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!getToken()) { router.replace('/auth'); return }
    const u = getUser() as UserRecord | null
    if (u) {
      const m = u.user_metadata ?? {}
      setUser({
        id:     u.id,
        email:  u.email,
        name:   m.full_name || m.name || u.email?.split('@')[0] || '',
        avatar: m.avatar_url || m.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.email}`,
        joinedAt: u.created_at || u.createdAt,
      })
    }
    void loadStores()
    void loadConversations()
    const pending = sessionStorage.getItem('seltra:pending_prompt')
    if (pending) { sessionStorage.removeItem('seltra:pending_prompt'); void startConv(pending) }
  }, [router])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs])

  const loadStores = async () => {
    const { data } = await apiFetch<StoreData[]>('/api/v1/seltra/store')
    setStores(data ?? [])
    if (data?.length && !activeStore) setActiveStore(data[0])
  }

  const loadConversations = async () => {
    const { data } = await apiFetch<Conversation[]>('/api/v1/conversations?order=updated_at:desc')
    setConversations(data ?? [])
  }

  const loadConversationMessages = async (conversation: Conversation) => {
    const { data, error } = await apiFetch<MessageRecord[]>(
      `/api/v1/conversations/${encodeURIComponent(conversation.id)}/messages?order=created_at:asc`
    )
    if (error) {
      toast.error(error)
      return
    }
    setConvId(conversation.id)
    setMsgs((data ?? []).map((message) => ({ role: message.role, content: message.content })))
    setTab('home')
  }

  const deleteConversation = async (conversationId: string) => {
    const { error } = await apiFetch<{ success: boolean }>(`/api/v1/conversations/${encodeURIComponent(conversationId)}`, {
      method: 'DELETE',
    })
    if (error) {
      toast.error(error)
      return
    }
    setConversations((current) => current.filter((conversation) => conversation.id !== conversationId))
    if (convId === conversationId) {
      setConvId(undefined)
      setMsgs([])
    }
    toast.success('Conversation deleted')
  }

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
    let streamedReply = ''
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
          for (const line of dec.decode(value, { stream: true }).split(/\r?\n/).filter(Boolean)) {
            const norm = line.startsWith('data:') ? line.slice(5).trim() : line
            if (!norm || norm === '[DONE]') continue
            try {
              const j = JSON.parse(norm)
              if (j.conversationId) setConvId(j.conversationId)
              const chunk = j.chunk ?? j.delta ?? j.text ?? j.reply ?? j.message ?? ''
              if (chunk) { streamedReply += chunk; appendChunk(chunk) }
              if (Array.isArray(j.actions)) j.actions.forEach((a: { action: string }) => {
                if (a.action === 'ADD_PRODUCT' || a.action === 'REFETCH_STOREFRONT') {
                  setRev((v) => v + 1); void loadStores()
                }
              })
            } catch { streamedReply += norm; appendChunk(norm) }
          }
        }
        return streamedReply
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
    const { data: conversation } = await createConversation(prompt, user?.id)
    if (conversation) {
      setConvId(conversation.id)
      setConversations((current) => [conversation, ...current])
    }
    setMsgs([{ role: 'user', content: prompt }])
    let store = activeStore
    if (!store) {
      const { data } = await apiFetch<{ store: StoreData }>('/api/v1/seltra/store', {
        method: 'POST', body: JSON.stringify({ name: prompt.slice(0, 48), prompt })
      })
      if (data?.store) { store = data.store; setActiveStore(data.store); setStores((p) => [data.store, ...p]); setRev((v) => v + 1) }
    }
    await saveMessage(conversation?.id, 'user', prompt, user?.id)
    if (store) {
      const reply = buildFeedback(store)
      setMsgs((prev) => [...prev, { role: 'assistant', content: reply }])
      await saveMessage(conversation?.id, 'assistant', reply, user?.id)
    }
    setSending(false)
    // Re-open sidebar after build
    setTimeout(() => setSidebarOpen(true), 1200)
  }

  const send = async () => {
    const text = input.trim(); if (!text || sending) return
    setInput(''); setSending(true)
    if (!activeStore) {
      await startConv(text)
      setSending(false)
      return
    }
    let activeConversationId = convId
    if (!activeConversationId) {
      const { data: conversation } = await createConversation(text, user?.id)
      if (conversation) {
        activeConversationId = conversation.id
        setConvId(conversation.id)
        setConversations((current) => [conversation, ...current])
      }
    }
    setMsgs((prev) => [...prev, { role: 'user', content: text }])
    await saveMessage(activeConversationId, 'user', text, user?.id)
    const reply = await sendToAgent(activeStore.id ?? activeStore.slug, text)
    if (reply) await saveMessage(activeConversationId, 'assistant', reply, user?.id)
    setSending(false)
    void loadStores()
  }

const newStore = () => {
    setActiveStore(null)
    setMsgs([])
    setConvId(undefined)
    setStores([])
    setRev((v) => v + 1)
    setTab('home')
    setSidebarOpen(true)
    void loadStores()
  }

  const signOut = () => { clearAuth(); setActiveStore(null); router.push('/auth') }

  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const hasStore = mounted && (Boolean(activeStore) || msgs.length > 0)
  const storeTitle = activeStore?.name ?? msgs[0]?.content?.slice(0, 40) ?? 'My Store'
  const storeSlug  = useMemo(
    () => activeStore?.slug ?? storeTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30),
    [activeStore?.slug, storeTitle]
  )
  const buildSteps = useMemo(() => getBuildSteps(activeStore, sending), [activeStore, sending])

  // Render non-home tabs
  if (tab !== 'home') {
    return (
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        <SidebarDesktop
          user={user} tab={tab} setTab={setTab}
          onSignOut={signOut} onNewStore={newStore}
          open={sidebarOpen} onToggle={() => setSidebarOpen((p) => !p)}
          conversations={conversations} activeConversationId={convId}
          onLoadConversation={loadConversationMessages} onDeleteConversation={deleteConversation}
        />
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <MobileHeader
            storeName={activeStore?.name}
            onMenuOpen={() => setMobileSidebar(true)}
            onSignOut={signOut}
          />
          <TabContent
            tab={tab}
            activeStore={activeStore}
            stores={stores}
            onSelectStore={(s) => { setActiveStore(s); setTab('home'); setRev((v) => v + 1) }}
            onStoreDeleted={(id) => {
              const next = stores.filter((s) => s.id !== id && s.slug !== id)
              setStores(next)
              if (activeStore?.id === id || activeStore?.slug === id) {
                setActiveStore(null)
                setMsgs([])
                setConvId(undefined)
                setRev((v) => v + 1)
                setTab('home')
              }
            }}
            onStoreUpdated={(store) => {
              setStores((current) => current.map((item) => item.id === store.id ? store : item))
              setActiveStore(store)
              setRev((value) => value + 1)
            }}
            reloadStores={loadStores}
            user={user}
          />
        </main>
        <MobileSidebarDrawer
          open={mobileSidebar} onClose={() => setMobileSidebar(false)}
          user={user} tab={tab} setTab={(t) => { setTab(t); setMobileSidebar(false) }}
          onSignOut={signOut} onNewStore={newStore}
          conversations={conversations} activeConversationId={convId}
          onLoadConversation={(conversation) => { void loadConversationMessages(conversation); setMobileSidebar(false) }}
          onDeleteConversation={deleteConversation}
        />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar — collapses during build */}
      <SidebarDesktop
        user={user} tab={tab} setTab={setTab}
        onSignOut={signOut} onNewStore={newStore}
        open={sidebarOpen} onToggle={() => setSidebarOpen((p) => !p)}
        conversations={conversations} activeConversationId={convId}
        onLoadConversation={loadConversationMessages} onDeleteConversation={deleteConversation}
      />

      {/* Main content */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <MobileHeader
          storeName={activeStore?.name}
          onMenuOpen={() => setMobileSidebar(true)}
          onSignOut={signOut}
        />

        {!hasStore ? (
          <EmptyState
            input={input} setInput={setInput} send={send} sending={sending}
            name={user?.name ?? ''}
            onAttach={(f) => { setInput((p) => p ? `${p}\nI uploaded "${f.name}".` : `I uploaded "${f.name}".`); toast.success(`${f.name} attached`, { duration: 1400 }) }}
          />
        ) : (
            <div className="grid min-h-0 flex-1 grid-cols-[5fr_7fr]">

            {/* Agent panel */}
            <section className="flex min-h-0 flex-col border-r border-border bg-background">
              <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-primary">{`// agent ${activeStore ? `· ${activeStore.name}` : ''}`}</span>
                </div>
                <div className="flex items-center gap-2">
                  {sending && (
                    <span className="flex items-center gap-1.5 font-mono text-[10px] text-yellow-500">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-400" />
                      WORKING
                    </span>
                  )}
                  {!sending && (
                    <span className="font-mono text-[10px] text-primary border border-primary/30 rounded px-1.5 py-0.5">READY</span>
                  )}
                </div>
              </div>

              {/* Real-time workflow steps — visible ONLY when building */}
              <AnimatePresence>
                {sending && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden border-b border-border bg-card/30"
                  >
                    <div className="px-4 py-3">
                      <div className="font-mono text-[10px] uppercase tracking-wider text-primary/60 mb-2">{'// agent workflow'}</div>
                      <div className="space-y-1.5">
                        {buildSteps.map((step, i) => {
                          const isActive = buildSteps.slice(0, i).every(s => s.done) && !step.done && sending
                          return (
                            <div key={step.label} className={`flex items-center gap-2 text-xs transition-all ${
                              step.done ? 'opacity-50' : isActive ? 'opacity-100' : 'opacity-25'
                            }`}>
                              <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                                step.done ? 'bg-primary' : isActive ? 'bg-yellow-400 animate-pulse' : 'bg-border'
                              }`} />
                              <span className={isActive ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                                {step.label}
                              </span>
                              {step.done && <span className="ml-auto text-primary font-mono text-[9px]">✓</span>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5 text-[13px]">
                {msgs.length === 0 && !sending && (
                  <div className="rounded-lg border border-border bg-card/30 p-4 text-sm text-muted-foreground">
                    {activeStore
                      ? `Tell me what to change in ${activeStore.name}. Products, colors, copy, or attach a logo.`
                      : 'Describe your store and your agent will build it in seconds.'}
                  </div>
                )}
                {msgs.map((m, i) => (
                  <div key={i}>
                    <div className={`font-mono text-[10px] uppercase tracking-wider mb-1.5 ${
                      m.role === 'user' ? 'text-muted-foreground' : 'text-primary'
                    }`}>
                      {m.role === 'user' ? 'you' : 'agent'}
                    </div>
                    <div className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-foreground/90">
                      {m.content}
                    </div>
                  </div>
                ))}
                {sending && msgs[msgs.length - 1]?.role === 'user' && (
                  <div className="flex items-center gap-2 text-muted-foreground text-xs">
                    <div className="flex gap-0.5">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: '0ms' }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: '150ms' }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
              </div>

              <ChatInput
                input={input} setInput={setInput} send={send} sending={sending}
                onAttach={(f) => { setInput((p) => p ? `${p}\nI uploaded "${f.name}".` : `I uploaded "${f.name}".`); toast.success(`${f.name} attached`, { duration: 1400 }) }}
                compact
              />
            </section>

            {/* Storefront preview — enlarged when building */}
          <StorefrontShell slug={storeSlug} isStream={sending && !activeStore?.storefrontCode}>
              {sending && !activeStore?.storefrontCode ? (
                <AgentBuildStream storeName={storeTitle} buildSteps={buildSteps} isBuilding={sending} />
              ) : (
                <StorefrontPreview key={`${storeSlug}-${rev}`} storeSlug={storeSlug} suppressFallback={!activeStore} />
              )}
            </StorefrontShell>
          </div>
        )}
      </main>

      {/* Mobile sidebar drawer */}
      <MobileSidebarDrawer
        open={mobileSidebar} onClose={() => setMobileSidebar(false)}
        user={user} tab={tab} setTab={(t) => { setTab(t); setMobileSidebar(false) }}
        onSignOut={signOut} onNewStore={newStore}
        conversations={conversations} activeConversationId={convId}
        onLoadConversation={(conversation) => { void loadConversationMessages(conversation); setMobileSidebar(false) }}
        onDeleteConversation={deleteConversation}
      />
    </div>
  )
}

// ── Sidebar (desktop, collapsible) ────────────────────────────────────────────
function SidebarDesktop({
  user, tab, setTab, onSignOut, onNewStore, open, onToggle,
  conversations, activeConversationId, onLoadConversation, onDeleteConversation,
}: {
  user: { email: string; name: string; avatar: string } | null
  tab: string; setTab: (t: string) => void
  onSignOut: () => void; onNewStore: () => void
  open: boolean; onToggle: () => void
  conversations: Conversation[]
  activeConversationId?: string
  onLoadConversation: (conversation: Conversation) => void
  onDeleteConversation: (conversationId: string) => void
}) {
  return (
    <motion.aside
      animate={{ width: open ? 224 : 52 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="hidden flex-col border-r border-border bg-card/40 lg:flex overflow-hidden flex-shrink-0"
    >
      {/* Logo + toggle */}
      <div className="flex h-14 items-center justify-between border-b border-border px-3 flex-shrink-0">
        <AnimatePresence>
          {open && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 overflow-hidden"
            >
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-primary/20">
                <span className="font-mono text-[10px] font-bold text-primary">S</span>
              </div>
              <span className="font-mono font-semibold tracking-tight text-sm whitespace-nowrap">seltra</span>
              <span className="font-mono text-[9px] text-muted-foreground border border-border rounded px-1 py-0.5 flex-shrink-0">beta</span>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={onToggle}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
        >
          {open ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>

      {/* New Store */}
      <div className={`border-b border-border p-2 flex-shrink-0`}>
        <button
          onClick={onNewStore}
          className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors w-full ${!open ? 'justify-center' : ''}`}
          title="New store"
        >
          <Plus className="h-4 w-4 flex-shrink-0" />
          <AnimatePresence>
            {open && <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="whitespace-nowrap overflow-hidden text-xs">New store</motion.span>}
          </AnimatePresence>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden p-2">
        {NAV_TABS.map((t) => (
          <button
            key={t.id} onClick={() => setTab(t.id)}
            title={!open ? t.label : undefined}
            className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors ${
              !open ? 'justify-center' : ''
            } ${tab === t.id ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}
          >
            <t.icon className="h-4 w-4 flex-shrink-0" />
            <AnimatePresence>
              {open && <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="whitespace-nowrap overflow-hidden">{t.label}</motion.span>}
            </AnimatePresence>
          </button>
        ))}
      </nav>

      <div className="max-h-60 border-t border-border p-2">
        {open && (
          <div className="mb-1 px-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            History
          </div>
        )}
        <div className="space-y-0.5 overflow-y-auto">
          {conversations.length === 0 ? (
            open && <div className="px-2 py-2 text-xs text-muted-foreground/70">Your agent conversations will appear here.</div>
          ) : conversations.slice(0, open ? 8 : 4).map((conversation) => (
            <div key={conversation.id} className={`group flex items-center gap-1 rounded-lg ${activeConversationId === conversation.id ? 'bg-primary/10' : 'hover:bg-muted/50'}`}>
              <button
                type="button"
                onClick={() => onLoadConversation(conversation)}
                title={conversation.title}
                className={`min-w-0 flex-1 px-2 py-1.5 text-left text-xs ${activeConversationId === conversation.id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {open ? (
                  <>
                    <div className="truncate">{conversation.title || 'Conversation'}</div>
                    <div className="truncate font-mono text-[9px] opacity-60">
                      {conversation.updated_at ? new Date(conversation.updated_at).toLocaleDateString() : 'agent chat'}
                    </div>
                  </>
                ) : (
                  <MessageSquare className="mx-auto h-4 w-4" />
                )}
              </button>
              {open && (
                <button
                  type="button"
                  onClick={() => onDeleteConversation(conversation.id)}
                  className="mr-1 hidden h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover:flex"
                  aria-label={`Delete ${conversation.title}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* User */}
      {user && (
        <div className={`flex items-center gap-2 border-t border-border p-3 flex-shrink-0 ${!open ? 'justify-center' : ''}`}>
          <Image src={user.avatar} alt={user.name} width={28} height={28} className="rounded-full border border-border flex-shrink-0" unoptimized />
          <AnimatePresence>
            {open && (
              <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
                <div className="min-w-0 flex-1">
                  {user.name && <div className="truncate text-xs font-medium">{user.name}</div>}
                  <div className="truncate font-mono text-[10px] text-muted-foreground">{user.email}</div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={onSignOut}>
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.aside>
  )
}

// ── Mobile header ──────────────────────────────────────────────────────────────
function MobileHeader({ storeName, onMenuOpen, onSignOut }: { storeName?: string; onMenuOpen: () => void; onSignOut: () => void }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  return (
    <header className="lg:hidden flex h-14 flex-shrink-0 items-center justify-between border-b border-border bg-card/40 px-4">
      <button onClick={onMenuOpen} className="text-muted-foreground hover:text-foreground">
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/20">
          <span className="font-mono text-[10px] font-bold text-primary">S</span>
        </div>
        <span className="font-mono font-semibold text-sm">seltra</span>
        {mounted && storeName && (
          <span className="text-muted-foreground text-xs">
            · {storeName}
          </span>
        )}
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onSignOut}>
        <LogOut className="h-4 w-4" />
      </Button>
    </header>
  )
}

// ── Mobile sidebar drawer ──────────────────────────────────────────────────────
function MobileSidebarDrawer({
  open, onClose, user, tab, setTab, onSignOut, onNewStore,
  conversations, activeConversationId, onLoadConversation, onDeleteConversation,
}: {
  open: boolean; onClose: () => void
  user: { email: string; name: string; avatar: string } | null
  tab: string; setTab: (t: string) => void
  onSignOut: () => void; onNewStore: () => void
  conversations: Conversation[]
  activeConversationId?: string
  onLoadConversation: (conversation: Conversation) => void
  onDeleteConversation: (conversationId: string) => void
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
          <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed left-0 top-0 z-50 flex h-full w-64 flex-col border-r border-border bg-card lg:hidden"
          >
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/20">
                  <span className="font-mono text-[10px] font-bold text-primary">S</span>
                </div>
                <span className="font-mono font-semibold">seltra</span>
              </div>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="border-b border-border p-3">
              <button onClick={() => { onNewStore(); onClose() }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50">
                <Plus className="h-4 w-4" /> New store
              </button>
            </div>
            <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
              {NAV_TABS.map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${tab === t.id ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted/50'}`}>
                  <t.icon className="h-4 w-4" /> {t.label}
                </button>
              ))}
              <div className="border-t border-border pt-3 mt-3">
                <div className="mb-1 px-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">History</div>
                {conversations.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground/70">Your agent conversations will appear here.</div>
                ) : conversations.slice(0, 8).map((conversation) => (
                  <div key={conversation.id} className={`group flex items-center gap-1 rounded-lg ${activeConversationId === conversation.id ? 'bg-primary/10' : ''}`}>
                    <button
                      type="button"
                      onClick={() => onLoadConversation(conversation)}
                      className={`min-w-0 flex-1 px-3 py-2 text-left text-xs ${activeConversationId === conversation.id ? 'text-primary' : 'text-muted-foreground'}`}
                    >
                      <div className="truncate">{conversation.title || 'Conversation'}</div>
                      <div className="truncate font-mono text-[9px] opacity-60">
                        {conversation.updated_at ? new Date(conversation.updated_at).toLocaleDateString() : 'agent chat'}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteConversation(conversation.id)}
                      className="mr-1 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Delete ${conversation.title}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </nav>
            {user && (
              <div className="flex items-center gap-2 border-t border-border p-3">
                <Image src={user.avatar} alt={user.name} width={28} height={28} className="rounded-full border border-border" unoptimized />
                <div className="min-w-0 flex-1">
                  {user.name && <div className="truncate text-xs font-medium">{user.name}</div>}
                  <div className="truncate font-mono text-[10px] text-muted-foreground">{user.email}</div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onSignOut}><LogOut className="h-3.5 w-3.5" /></Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────────
function EmptyState({ input, setInput, send, sending, name, onAttach }: {
  input: string; setInput: (v: string) => void; send: () => void
  sending: boolean; name: string; onAttach: (f: File) => void
}) {
  const EXAMPLES = [
    'A luxury skincare brand for young women in Accra and Lagos',
    'A contemporary African streetwear brand blending Kente with street silhouettes',
    'A handmade candle and wellness store for urban professionals',
    'A digital product store selling Notion templates for entrepreneurs',
  ]
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <div className="max-w-2xl w-full text-center mb-8">
          <h1 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
            {name ? `Welcome back, ${name.split(' ')[0]}.` : 'Launch your store with AI.'}
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Describe your business in one sentence. Your agent will build the store, products, and checkout in seconds.
          </p>
        </div>
        {/* Example prompts */}
        <div className="grid gap-2 sm:grid-cols-2 max-w-2xl w-full mb-6">
          {EXAMPLES.map((ex) => (
            <button key={ex} onClick={() => setInput(ex)}
              className="rounded-lg border border-border bg-card/40 px-4 py-3 text-left text-sm text-muted-foreground hover:border-primary/40 hover:bg-card/60 hover:text-foreground transition-colors">
              {ex}
            </button>
          ))}
        </div>
      </div>
      <ChatInput input={input} setInput={setInput} send={send} sending={sending} onAttach={onAttach} />
    </div>
  )
}

// ── Chat input ─────────────────────────────────────────────────────────────────
function ChatInput({ input, setInput, send, sending, onAttach, compact = false }: {
  input: string; setInput: (v: string) => void; send: () => void
  sending: boolean; onAttach: (f: File) => void; compact?: boolean
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const maxHeight = compact ? 96 : 140
    const newHeight = Math.min(el.scrollHeight, maxHeight)
    el.style.height = `${newHeight}px`
  }, [input, compact])

  return (
    <div className={`border-t border-border bg-card/40 backdrop-blur ${compact ? 'p-3' : 'p-4 sm:p-6'}`}>
      <div className={`${compact ? '' : 'mx-auto max-w-3xl'} flex items-end gap-2`}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          rows={1}
          placeholder="Message your agent…"
          className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring transition-[height] duration-100"
          style={{ minHeight: '40px', overflowY: 'auto' }}
        />
        <label className="flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-primary transition-colors">
          <Paperclip className="h-4 w-4" />
          <input type="file" className="hidden" accept="image/*,.pdf"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onAttach(f); e.target.value = '' }} />
        </label>
        <Button onClick={send} disabled={sending || !input.trim()} size="icon" className="h-10 w-10 flex-shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// ── Tab content ────────────────────────────────────────────────────────────────
function TabContent({
  tab,
  activeStore,
  stores,
  onSelectStore,
  onStoreDeleted,
  onStoreUpdated,
  reloadStores,
  user,
}: {
  tab: string
  activeStore: StoreData | null
  stores: StoreData[]
  onSelectStore: (s: StoreData) => void
  onStoreDeleted: (id: string) => void
  onStoreUpdated: (store: StoreData) => void
  reloadStores: () => Promise<void>
  user: { email: string; name: string; avatar: string; joinedAt?: string } | null
}) {
  if (tab === 'store') {
    return (
      <StoreTab
        stores={stores}
        activeStore={activeStore}
        onSelectStore={onSelectStore}
        onStoreDeleted={onStoreDeleted}
        reloadStores={reloadStores}
      />
    )
  }
  if (tab === 'orders') return <OrdersTab activeStore={activeStore} />
  if (tab === 'sales') return <SalesTab activeStore={activeStore} />
  if (tab === 'payments') return <PaymentsTab activeStore={activeStore} />
  if (tab === 'products') return <ProductsTab activeStore={activeStore} />
  if (tab === 'customers' || tab === 'emails') return <CustomersTab activeStore={activeStore} mode={tab} />
  if (tab === 'analytics') return <AnalyticsTab activeStore={activeStore} />
  if (tab === 'settings') {
    return (
      <SettingsTab
        activeStore={activeStore}
        user={user}
        storesCount={stores.length}
        onStoreUpdated={onStoreUpdated}
      />
    )
  }
  return null
}

function PageHeader({ tab, title, subtitle }: { tab: string; title: string; subtitle: string }) {
  return (
    <div className="mb-8">
      <div className="mb-2 font-mono text-[11px] text-primary">{`// ${tab}`}</div>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/40 p-4">
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`rounded-full border px-2 py-1 font-mono text-[10px] ${statusClass(status)}`}>{status}</span>
}

function StoreTab({
  stores,
  activeStore,
  onSelectStore,
  onStoreDeleted,
  reloadStores,
}: {
  stores: StoreData[]
  activeStore: StoreData | null
  onSelectStore: (store: StoreData) => void
  onStoreDeleted: (id: string) => void
  reloadStores: () => Promise<void>
}) {
  const [storeToDelete, setStoreToDelete] = useState<StoreData | null>(null)
  const [confirmName, setConfirmName] = useState('')
  const [deleting, setDeleting] = useState(false)
  const canDelete = confirmName.trim() === storeToDelete?.name
  const visibleStores =
    activeStore && !stores.some((store) => store.id === activeStore.id || store.slug === activeStore.slug)
      ? [activeStore, ...stores]
      : stores

  const confirmDelete = async () => {
    if (!storeToDelete || !canDelete || deleting) return
    const id = storeToDelete.id ?? storeToDelete.slug
    setDeleting(true)
    const { error } = await apiFetch<{ success: boolean }>(`/api/v1/seltra/store/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
    setDeleting(false)
    if (error) {
      toast.error(error)
      return
    }
    onStoreDeleted(id)
    setStoreToDelete(null)
    setConfirmName('')
    toast.success(`${storeToDelete.name} deleted`)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex items-start justify-between gap-4">
          <PageHeader tab="store" title="Store" subtitle="Your merchant storefronts and generated catalogs." />
          <Button variant="outline" size="sm" onClick={() => void reloadStores()}>Refresh</Button>
        </div>

        {visibleStores.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/30 p-10 text-center">
            <p className="text-sm text-muted-foreground">Launch a store from Home to start customizing.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleStores.map((store) => {
              const paymentProviders = (store as StoreData & { paymentProviders?: { provider: string }[] }).paymentProviders
              const providers = paymentProviders?.map((provider) => provider.provider).join(' / ') || 'Paystack'
              const active = activeStore?.id === store.id || activeStore?.slug === store.slug
              return (
                <div key={store.id ?? store.slug} className={`rounded-lg border p-4 transition-colors hover:border-primary/50 ${active ? 'border-primary/60 bg-primary/10' : 'border-border bg-card/40'}`}>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <button type="button" onClick={() => onSelectStore(store)} className="min-w-0 flex-1 text-left">
                      <h2 className="truncate text-base font-semibold">{store.name}</h2>
                      <p className="font-mono text-[11px] text-primary">{store.slug}.seltra.co</p>
                    </button>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-full border border-border px-2 py-1 font-mono text-[10px] text-muted-foreground">
                        {(store as StoreData & { status?: string }).status ?? 'active'}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => { setStoreToDelete(store); setConfirmName('') }}
                        className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Delete ${store.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <button type="button" onClick={() => onSelectStore(store)} className="w-full text-left">
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {store.targetAudience || store.businessType || 'AI-generated Seltra storefront'}
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-md bg-background/60 p-2">
                        <div className="font-mono text-[10px] text-muted-foreground">products</div>
                        <div className="font-semibold">{Array.isArray(store.products) ? store.products.length : 0}</div>
                      </div>
                      <div className="rounded-md bg-background/60 p-2">
                        <div className="font-mono text-[10px] text-muted-foreground">payments</div>
                        <div className="truncate font-semibold">{providers}</div>
                      </div>
                    </div>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {storeToDelete && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-2xl">
            <h2 className="text-lg font-semibold">Delete {storeToDelete.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This removes the storefront, catalog, images, payment setup, and orders tied to this store. To confirm, type the store name exactly.
            </p>
            <div className="mt-4 rounded-md border border-border bg-muted/30 px-3 py-2 font-mono text-sm">{storeToDelete.name}</div>
            <label className="mt-4 grid gap-1.5 text-sm">
              Store name
              <input
                value={confirmName}
                onChange={(event) => setConfirmName(event.target.value)}
                placeholder={storeToDelete.name}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setStoreToDelete(null); setConfirmName('') }} disabled={deleting}>Keep store</Button>
              <Button type="button" variant="destructive" onClick={() => void confirmDelete()} disabled={!canDelete || deleting}>
                {deleting ? 'Deleting...' : 'Delete store'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function OrdersTab({ activeStore }: { activeStore: StoreData | null }) {
  const [rows, setRows] = useState<OrderRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      const search = new URLSearchParams({ page: '1', perPage: '50' })
      const tenantId = storeIdOf(activeStore)
      if (tenantId) search.set('tenantId', tenantId)
      const { data } = await apiFetch<{ data: OrderRecord[] }>(`/api/v1/orders?${search.toString()}`)
      if (!cancelled) {
        setRows(data?.data ?? [])
        setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [activeStore])

  const updateOrderStatus = async (order: OrderRecord, status: string) => {
    const tenantId = storeIdOf(activeStore)
    setUpdatingId(order.id)
    const { data, error } = await apiFetch<OrderRecord>(`/api/v1/orders/${encodeURIComponent(order.id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, tenantId }),
    })
    setUpdatingId(null)
    if (error) { toast.error(error); return }
    setRows((current) => current.map((item) => item.id === order.id ? { ...item, status: data?.status ?? status } : item))
    toast.success('Order status updated')
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <PageHeader tab="orders" title="Orders" subtitle="Every checkout your agent has processed." />
        <section className="rounded-lg border border-border bg-card/30">
          <GridHeader cols="grid-cols-[1.2fr_1.4fr_.8fr_.8fr_.7fr_1fr]" items={['order ref', 'customer', 'items', 'amount', 'payment', 'status']} />
          {loading ? (
            <EmptyRows text="Loading orders..." />
          ) : rows.length === 0 ? (
            <EmptyRows text={activeStore ? 'Orders appear after your first sale.' : 'Select or create a store first.'} />
          ) : (
            <div className="divide-y divide-border">
              {rows.map((order) => (
                <div key={order.id} className="grid grid-cols-[1.2fr_1.4fr_.8fr_.8fr_.7fr_1fr] gap-3 px-4 py-4 text-sm">
                  <div className="truncate font-mono text-xs">{order.paystackRef ?? order.id}</div>
                  <div className="min-w-0">
                    <div className="truncate font-medium">{order.customerName || order.customerEmail}</div>
                    <div className="truncate font-mono text-[11px] text-muted-foreground">{order.customerEmail}</div>
                  </div>
                  <div>{order.items?.length ?? 0} items</div>
                  <div className="font-semibold">{money(order.totalAmount, order.currency)}</div>
                  <StatusBadge status={hasConfirmedPayment(order) ? 'paid' : 'awaiting'} />
                  <select
                    value={order.status}
                    disabled={updatingId === order.id}
                    onChange={(event) => void updateOrderStatus(order, event.target.value)}
                    className="h-8 rounded-md border border-border bg-background px-2 font-mono text-xs outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  >
                    {!ORDER_STATUSES.includes(order.status) && <option value={order.status}>{order.status}</option>}
                    {ORDER_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function SalesTab({ activeStore }: { activeStore: StoreData | null }) {
  const [range, setRange] = useState('Last 7 days')
  const [rows, setRows] = useState<OrderRecord[]>([])
  const [ledgerBalance, setLedgerBalance] = useState(0)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const tenantId = storeIdOf(activeStore)
      const search = new URLSearchParams({ page: '1', perPage: '50' })
      if (tenantId) search.set('tenantId', tenantId)
      const [salesResult, ledgerResult] = await Promise.all([
        apiFetch<{ data: OrderRecord[] }>(`/api/v1/orders?${search.toString()}`),
        apiFetch<Ledger>(`/api/v1/payment/ledger${tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : ''}`),
      ])
      if (cancelled) return
      setRows((salesResult.data?.data ?? []).filter(hasConfirmedPayment))
      setLedgerBalance(Number(ledgerResult.data?.balance ?? 0))
    }
    void load()
    return () => { cancelled = true }
  }, [activeStore])

  const filteredRows = useMemo(() => {
    if (range === 'All time') return rows
    const days = range === 'Last 7 days' ? 7 : range === '30 days' ? 30 : 90
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
    return rows.filter((order) => new Date(order.createdAt).getTime() >= cutoff)
  }, [range, rows])
  const revenue = filteredRows.reduce((sum, order) => sum + Number(order.merchantAmount ?? order.totalAmount ?? 0), 0)
  const average = filteredRows.length ? revenue / filteredRows.length : 0
  const storeUrl = activeStore && typeof window !== 'undefined' ? `${window.location.origin}/store/${activeStore.slug}` : ''

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <PageHeader tab="sales" title="Sales" subtitle="Paid orders, revenue, and merchant proceeds." />
          <div className="flex flex-wrap gap-2">
            {['Last 7 days', '30 days', '90 days', 'All time'].map((item) => (
              <Button key={item} size="sm" variant={range === item ? 'default' : 'outline'} onClick={() => setRange(item)}>{item}</Button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <MetricCard label="Total Revenue" value={money(revenue)} />
          <MetricCard label="Orders Count" value={String(filteredRows.length)} />
          <MetricCard label="Average Order Value" value={money(average)} />
          <MetricCard label="Pending Disbursement" value={money(ledgerBalance)} />
        </div>
        <section className="mt-6 rounded-lg border border-border bg-card/30">
          {filteredRows.length === 0 ? (
            <div className="grid min-h-72 place-items-center px-6 py-10 text-center">
              <div>
                <p className="font-medium">Your first sale is coming. Share your store link to get started.</p>
                {storeUrl && (
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                    <code className="rounded border border-border bg-background px-2 py-1 text-xs">{storeUrl}</code>
                    <Button size="sm" variant="outline" onClick={() => void navigator.clipboard.writeText(storeUrl).then(() => toast.success('Store URL copied'))}>
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <OrderList rows={filteredRows} amountField="merchant" />
          )}
        </section>
      </div>
    </div>
  )
}

function PaymentsTab({ activeStore }: { activeStore: StoreData | null }) {
  const [balance, setBalance] = useState(0)
  const [currency, setCurrency] = useState('GHS')
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const tenantId = storeIdOf(activeStore)
      const { data } = await apiFetch<Ledger>(`/api/v1/payment/ledger${tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : ''}`)
      if (cancelled || !data) return
      setBalance(Number(data.balance ?? 0))
      setCurrency(data.currency ?? 'GHS')
      setTransactions(data.transactions ?? [])
    }
    void load()
    return () => { cancelled = true }
  }, [activeStore])

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <PageHeader tab="payments" title="Payments" subtitle="Subsidiary ledger balance and transaction history." />
        <section className="rounded-lg border border-emerald-500/20 bg-zinc-950 p-5 text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm text-zinc-400">Merchant Balance</div>
              <div className="mt-2 font-mono text-3xl font-semibold text-emerald-400">{money(balance, currency)}</div>
              <div className="mt-1 text-xs text-zinc-500">subsidiary account</div>
            </div>
            <Button disabled>{'Request Disbursement ->'}</Button>
          </div>
        </section>
        <section className="mt-6 rounded-lg border border-border bg-card/30">
          <GridHeader cols="grid-cols-[.8fr_.7fr_1.8fr_.8fr_.8fr]" items={['date', 'type', 'description', 'amount', 'balance']} />
          {transactions.length === 0 ? (
            <EmptyRows text="No ledger transactions yet." />
          ) : (
            <div className="divide-y divide-border">
              {transactions.map((tx) => (
                <div key={tx.id} className="grid grid-cols-[.8fr_.7fr_1.8fr_.8fr_.8fr] gap-3 px-4 py-4 text-sm">
                  <div>{new Date(tx.createdAt).toLocaleDateString()}</div>
                  <StatusBadge status={tx.type} />
                  <div>{tx.description ?? 'Ledger transaction'}</div>
                  <div className={tx.type === 'credit' ? 'text-emerald-500' : 'text-red-500'}>{tx.type === 'credit' ? '+' : '-'}{money(tx.amount, tx.currency)}</div>
                  <div className="font-mono">{money(balance, currency)}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function ProductsTab({ activeStore }: { activeStore: StoreData | null }) {
  const products = activeStore?.products ?? []
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <PageHeader tab="products" title="Products" subtitle="Your agent-generated product catalog." />
        {products.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/30 p-10 text-center text-sm text-muted-foreground">
            Products appear here. Ask your agent to add or update them.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => {
              const image = product.images?.find((item) => item.isPrimary)?.url ?? product.images?.[0]?.url
              return (
                <div key={product.id} className="overflow-hidden rounded-lg border border-border bg-card/40">
                  {image && <img src={image} alt={product.name} className="aspect-[16/10] w-full object-cover" />}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="font-semibold">{product.name}</h2>
                      <span className="font-mono text-xs text-primary">{money(product.price, product.currency ?? 'GHS')}</span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{product.description ?? 'AI-generated product'}</p>
                    <div className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{product.category ?? 'catalog'}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function CustomersTab({ activeStore, mode }: { activeStore: StoreData | null; mode: string }) {
  const [customers, setCustomers] = useState<CustomerRecord[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const tenantId = storeIdOf(activeStore)
      if (!tenantId) { setCustomers([]); return }
      setLoading(true)
      const { data, error } = await apiFetch<CustomerRecord[]>(`/api/v1/payment/customers?tenantId=${encodeURIComponent(tenantId)}`)
      if (cancelled) return
      setLoading(false)
      if (error) { toast.error(error); return }
      setCustomers(data ?? [])
    }
    void load()
    return () => { cancelled = true }
  }, [activeStore])

  const totalRevenue = customers.reduce((sum, customer) => sum + Number(customer.totalSpent || 0), 0)
  const currency = customers[0]?.currency || 'GHS'
  const title = mode === 'emails' ? 'Customer Contacts' : 'Customers'
  const subtitle = mode === 'emails'
    ? 'Opted-in emails and phone contacts your agent can use for transactional and marketing work.'
    : 'Know who bought, what they paid, when they last ordered, and whether they are returning.'

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <PageHeader tab={mode === 'emails' ? 'emails' : 'customers'} title={title} subtitle={subtitle} />
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="customers" value={String(customers.length)} />
          <MetricCard label="revenue" value={money(totalRevenue, currency)} />
          <MetricCard label="email contacts" value={String(customers.filter((customer) => customer.email).length)} />
          <MetricCard label="phone contacts" value={String(customers.filter((customer) => customer.phone).length)} />
        </div>
        <section className="rounded-lg border border-border bg-card/40">
          <GridHeader cols="grid-cols-[1.4fr_.7fr_.7fr_.8fr_1fr]" items={['customer', 'spent', 'orders', 'last bought', 'contact']} />
          {loading ? (
            <EmptyRows text="Loading customers..." />
          ) : customers.length === 0 ? (
            <EmptyRows text={activeStore ? 'Checkout customers will appear here after their first order.' : 'Select or create a store first.'} />
          ) : (
            <div className="divide-y divide-border">
              {customers.map((customer) => (
                <div key={customer.id} className="grid grid-cols-[1.4fr_.7fr_.7fr_.8fr_1fr] gap-3 px-4 py-4 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{customer.name || customer.email}</div>
                    <div className="truncate font-mono text-[11px] text-muted-foreground">{customer.email}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{[customer.city, customer.country].filter(Boolean).join(', ') || customer.address || 'No location yet'}</div>
                  </div>
                  <div className="font-semibold">{money(customer.totalSpent, customer.currency)}</div>
                  <div><span className="rounded-full border border-border px-2 py-1 font-mono text-[10px] text-muted-foreground">{customer.orderCount} {customer.isRecurring ? 'repeat' : 'new'}</span></div>
                  <div className="text-muted-foreground">{customer.lastOrderAt ? new Date(customer.lastOrderAt).toLocaleDateString() : 'Never'}</div>
                  <div className="min-w-0 text-xs text-muted-foreground">
                    <div className="truncate">{customer.phone || 'No phone'}</div>
                    <div className={customer.marketingOptIn ? 'text-primary' : ''}>{customer.marketingOptIn ? 'marketing ok' : 'transactional only'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function AnalyticsTab({ activeStore }: { activeStore: StoreData | null }) {
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [customers, setCustomers] = useState<CustomerRecord[]>([])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const tenantId = storeIdOf(activeStore)
      const orderSearch = new URLSearchParams({ page: '1', perPage: '100' })
      if (tenantId) orderSearch.set('tenantId', tenantId)
      const [ordersResult, customersResult] = await Promise.all([
        apiFetch<{ data: OrderRecord[] }>(`/api/v1/orders?${orderSearch.toString()}`),
        tenantId ? apiFetch<CustomerRecord[]>(`/api/v1/payment/customers?tenantId=${encodeURIComponent(tenantId)}`) : Promise.resolve({ data: [] as CustomerRecord[], error: null }),
      ])
      if (cancelled) return
      setOrders(ordersResult.data?.data ?? [])
      setCustomers(customersResult.data ?? [])
    }
    void load()
    return () => { cancelled = true }
  }, [activeStore])

  const paid = orders.filter(hasConfirmedPayment)
  const revenue = paid.reduce((sum, order) => sum + Number(order.merchantAmount ?? order.totalAmount ?? 0), 0)
  const products = activeStore?.products?.length ?? 0
  const conversionHint = customers.length ? Math.min(18, Math.max(2, Math.round((paid.length / customers.length) * 100))) : 0

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <PageHeader tab="analytics" title="Analytics" subtitle="Revenue, customer, catalog, and conversion signals." />
        <div className="grid gap-3 md:grid-cols-4">
          <MetricCard label="paid revenue" value={money(revenue)} />
          <MetricCard label="paid orders" value={String(paid.length)} />
          <MetricCard label="customers" value={String(customers.length)} />
          <MetricCard label="catalog items" value={String(products)} />
        </div>
        <div className="mt-6 rounded-lg border border-border bg-card/40 p-5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium">Estimated checkout conversion</span>
            <span className="font-mono text-primary">{conversionHint}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${conversionHint}%` }} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">This becomes more accurate as storefront visits and checkout events accumulate.</p>
        </div>
      </div>
    </div>
  )
}

function SettingsTab({
  activeStore,
  user,
  storesCount,
  onStoreUpdated,
}: {
  activeStore: StoreData | null
  user: { email: string; name: string; avatar: string; joinedAt?: string } | null
  storesCount: number
  onStoreUpdated: (store: StoreData) => void
}) {
  const [name, setName] = useState(activeStore?.name ?? '')
  const [businessType, setBusinessType] = useState(activeStore?.businessType ?? '')
  const [targetAudience, setTargetAudience] = useState(activeStore?.targetAudience ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setName(activeStore?.name ?? '')
    setBusinessType(activeStore?.businessType ?? '')
    setTargetAudience(activeStore?.targetAudience ?? '')
  }, [activeStore])

  const save = async () => {
    const id = storeIdOf(activeStore)
    if (!id || saving) return
    setSaving(true)
    const { data, error } = await apiFetch<StoreData>(`/api/v1/seltra/store/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ name, businessType, targetAudience }),
    })
    setSaving(false)
    if (error || !data) {
      toast.error(error || 'Could not save settings')
      return
    }
    onStoreUpdated(data)
    toast.success('Settings saved')
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <PageHeader tab="settings" title="Settings" subtitle="Account, merchant workspace and active tenant settings." />
        <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
          <section className="rounded-lg border border-border bg-card/40 p-4">
            <h2 className="text-sm font-semibold">Merchant</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center gap-3">
                {user?.avatar && <img src={user.avatar} alt={user.name || user.email || 'Merchant'} className="h-14 w-14 rounded-full border border-border bg-muted object-cover" />}
                <div className="min-w-0">
                  <div className="truncate font-medium">{user?.name || 'Merchant'}</div>
                  <div className="truncate font-mono text-[11px] text-muted-foreground">{user?.email}</div>
                </div>
              </div>
              <div><div className="font-mono text-[10px] text-muted-foreground">name</div><div>{user?.name || 'Merchant'}</div></div>
              <div><div className="font-mono text-[10px] text-muted-foreground">email</div><div className="break-all">{user?.email || 'Unknown'}</div></div>
              <div>
                <div className="font-mono text-[10px] text-muted-foreground">date joined</div>
                <div className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-primary" />{user?.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : 'Unknown'}</div>
              </div>
              <div><div className="font-mono text-[10px] text-muted-foreground">stores owned</div><div>{storesCount}</div></div>
            </div>
          </section>
          <section className="rounded-lg border border-border bg-card/40 p-4">
            <div className="mb-4">
              <h2 className="text-sm font-semibold">Active Store</h2>
              <p className="text-xs text-muted-foreground">{activeStore ? `${activeStore.slug}.seltra.co` : 'Create or select a store first.'}</p>
            </div>
            <div className="grid gap-3">
              <label className="grid gap-1.5 text-sm">Store name<input value={name} onChange={(event) => setName(event.target.value)} disabled={!activeStore} className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50" /></label>
              <label className="grid gap-1.5 text-sm">Business type<input value={businessType} onChange={(event) => setBusinessType(event.target.value)} disabled={!activeStore} className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50" /></label>
              <label className="grid gap-1.5 text-sm">Target audience<textarea value={targetAudience} onChange={(event) => setTargetAudience(event.target.value)} disabled={!activeStore} rows={3} className="resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50" /></label>
              <Button onClick={() => void save()} disabled={!activeStore || saving} className="justify-self-start">{saving ? 'Saving...' : 'Save settings'}</Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function GridHeader({ cols, items }: { cols: string; items: string[] }) {
  return (
    <div className={`grid ${cols} gap-3 border-b border-border px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground`}>
      {items.map((item) => <div key={item}>{item}</div>)}
    </div>
  )
}

function EmptyRows({ text }: { text: string }) {
  return <div className="p-8 text-center text-sm text-muted-foreground">{text}</div>
}

function OrderList({ rows, amountField }: { rows: OrderRecord[]; amountField?: 'merchant' | 'total' }) {
  return (
    <>
      <GridHeader cols="grid-cols-[1.1fr_1.4fr_.7fr_.8fr_.8fr]" items={['order ref', 'customer', 'items', 'amount', 'date']} />
      <div className="divide-y divide-border">
        {rows.map((order) => (
          <div key={order.id} className="grid grid-cols-[1.1fr_1.4fr_.7fr_.8fr_.8fr] gap-3 px-4 py-4 text-sm">
            <div className="truncate font-mono text-xs">{order.paystackRef ?? order.id}</div>
            <div className="truncate">{order.customerName || order.customerEmail}</div>
            <div>{order.items?.length ?? 0} items</div>
            <div>{money(amountField === 'merchant' ? order.merchantAmount ?? order.totalAmount : order.totalAmount, order.currency)}</div>
            <div className="text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</div>
          </div>
        ))}
      </div>
    </>
  )
}
