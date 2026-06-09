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

type StoreRouteProps = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: StoreRouteProps): Promise<Metadata> {
  const { slug } = await params
  const store = await getStore(slug)
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

export default async function StorefrontPage({ params }: StoreRouteProps) {
  const { slug } = await params
  const store = (await getStore(slug)) ?? fallback(slug)
  const dna  = (store as { storeDNA?: { brandPersonality?: string } }).storeDNA
  const cv   = (store as { canonical?: { layoutVariant?: string } }).canonical
  const themeKey =
    dna?.brandPersonality === 'luxury'    ? 'luxury'
    : cv?.layoutVariant   === 'bold'      ? 'bold-dark'
    : cv?.layoutVariant   === 'editorial' ? 'editorial'
    : 'minimal-light'

  return (
    <Suspense fallback={<Skeleton />}>
      <StorefrontCanvas store={store} storeSlug={slug} minHeightClass="min-h-screen" themeKey={themeKey} />
    </Suspense>
  )
}
