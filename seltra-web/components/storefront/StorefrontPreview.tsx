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
  const activeStoreData = activeStore as StoreData | null
  const [store, setStore]   = useState<StoreData | null>(null)
  const [loading, setLoading] = useState(true)
  const pollCount = useRef(0); const pollTimer = useRef<ReturnType<typeof setTimeout>|null>(null)

  useEffect(() => {
    let cancelled = false; pollCount.current = 0
    const load = async () => {
      if (activeStoreData?.slug === storeSlug) { setStore(activeStoreData); setLoading(false) }
      const token = typeof window !== 'undefined' ? localStorage.getItem('seltra:token') : null
      try {
        const res = await fetch(`${API_BASE}/api/v1/seltra/store/${encodeURIComponent(storeSlug)}`, { headers:token?{Authorization:`Bearer ${token}`}:{} })
        if (!cancelled && res.ok) { const d = await res.json(); setStore(d); setLoading(false); if (!d.storefrontCode && pollCount.current < 20) { pollCount.current++; if (pollTimer.current) clearTimeout(pollTimer.current); pollTimer.current = setTimeout(() => { if (!cancelled) load() }, 3000) } }
        else if (!cancelled) { setStore(activeStoreData?.slug === storeSlug ? activeStoreData : fallback(storeSlug)); setLoading(false) }
      } catch { if (!cancelled) { setStore(fallback(storeSlug)); setLoading(false) } }
    }
    load()
    return () => { cancelled = true; if (pollTimer.current) clearTimeout(pollTimer.current) }
  }, [storeSlug, activeStoreData])

  if (loading && !store) return <div className="flex min-h-[400px] items-center justify-center"><div className="flex flex-col items-center gap-2"><div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" /><div className="font-mono text-xs text-muted-foreground">building storefront...</div></div></div>
  if (!store) return null

  const themeKey = store.storeDNA?.brandPersonality==='luxury'?'luxury': store.canonical?.layoutVariant==='bold'?'bold-dark': store.canonical?.layoutVariant==='editorial'?'editorial':'minimal-light'
  return <StorefrontCanvas store={store} storeSlug={storeSlug} themeKey={themeKey} />
}
