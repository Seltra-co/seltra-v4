'use client'
import { useState, useCallback, useEffect } from 'react'
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
import { ProductDetailModal } from './sections/ProductDetailModal'
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

const SectionFade = ({ children }: { children: React.ReactNode }) => (
  <motion.div initial={{ opacity:0, y:24 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true, margin:'-60px' }} transition={{ duration:0.5, delay:0.04, ease:[0.4,0,0.2,1] }}>
    {children}
  </motion.div>
)

function renderSection(section: ManifestSection, i: number, props: { products: StoreProduct[]; features: string[]; categories: string[]; onAddToCart: (p: StoreProduct) => void; storeName: string; onViewDetail?: (p: StoreProduct) => void }) {
  const W = ({ children }: { children: React.ReactNode }) => <SectionFade>{children}</SectionFade>
  const { products, features, categories, onAddToCart, storeName, onViewDetail } = props

  switch (section.type) {
    case 'announcement-bar':  return <AnnouncementBar key={i} message={section.message} />
    case 'countdown-banner':  return <W key={i}><CountdownBanner message={(section as {message?:string}).message} /></W>
    case 'hero-centered': case 'hero-split': case 'hero-editorial': case 'hero-fullbleed': case 'hero-minimal':
      return <HeroSection key={i} section={section} products={products} features={features} storeName={storeName} />
    case 'trust-bar':         return <W key={i}><TrustBar items={section.items} /></W>
    case 'category-strip':    return <W key={i}><CategoryStrip categories={categories} headline={section.headline} /></W>
    case 'featured-drop':     return <W key={i}><FeaturedDrop section={section} products={products} onAddToCart={onAddToCart} onViewDetail={onViewDetail} /></W>
    case 'product-grid':      return <W key={i}><ProductGrid section={section} products={products} onAddToCart={onAddToCart} onViewDetail={onViewDetail} /></W>
    case 'product-shelf':     return <W key={i}><ProductShelf section={section} products={products} onAddToCart={onAddToCart} storeName={storeName} onViewDetail={onViewDetail} /></W>
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
  const CART_KEY = `seltra:cart:${storeSlug}`

  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const stored = window.localStorage.getItem(CART_KEY)
      return stored ? (JSON.parse(stored) as CartItem[]) : []
    } catch { return [] }
  })
  const [cartOpen, setCartOpen] = useState(false)
  const [detailProduct, setDetailProduct] = useState<StoreProduct | null>(null)

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_KEY, JSON.stringify(cart))
    } catch {}
  }, [cart, CART_KEY])

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
  const sectionProps = { products, features, categories, onAddToCart: addToCart, storeName: store.name, onViewDetail: (p: StoreProduct) => setDetailProduct(p) }

  return (
    <div className={`seltra-storefront relative w-full overflow-x-hidden ${minHeightClass}`}>
      <style>{`.seltra-storefront{${buildThemeVars(palette, typography, themeKey)}}@import url('https://fonts.googleapis.com/css2?${fontParam}&display=swap');`}</style>

      {/* Sticky nav */}
      <nav
        className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b px-5 py-3 backdrop-blur-xl"
        style={{ background:`color-mix(in srgb, var(--store-bg) 92%, transparent)`, borderColor:'var(--store-border)' }}
      >
        {/* Brand */}
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
            style={{ background:'var(--store-accent)', color:'var(--store-accent-text)', fontFamily:`'${typography.headingFont}', serif` }}
          >
            {store.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div
              className="store-heading truncate text-base font-bold leading-none"
              style={{ fontFamily:`'${typography.headingFont}', serif` }}
            >
              {store.name}
            </div>
            {store.businessType && <div className="store-eyebrow mt-0.5 truncate">{store.businessType}</div>}
          </div>
        </div>

        {/* Category nav - hidden on mobile */}
        {categories.length > 0 && (
          <div className="hidden items-center gap-5 md:flex">
            {categories.slice(0, 4).map((cat) => (
              <button
                key={cat}
                className="text-xs font-medium transition-colors"
                style={{ color:'var(--store-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--store-text)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--store-muted)')}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Cart button */}
        <button
          onClick={() => setCartOpen(true)}
          className="store-btn-outline relative flex shrink-0 items-center gap-2 px-3 py-1.5 text-xs"
          style={{ borderRadius:'var(--store-radius-full)' }}
        >
          <ShoppingBag className="h-3.5 w-3.5" style={{ color:'var(--store-accent)' }} />
          Cart
          <AnimatePresence mode="wait">
            {cartCount > 0 && (
              <motion.span
                key={cartCount}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="flex h-4 w-4 items-center justify-center rounded-full text-[0.6rem] font-extrabold"
                style={{ background:'var(--store-accent)', color:'var(--store-accent-text)' }}
              >
                {cartCount}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </nav>

      {manifest.sections.map((section, i) => renderSection(section, i, sectionProps))}

      <footer className="border-t" style={{ borderColor:'var(--store-border)', background:'var(--store-bg)' }}>
        <div className="mx-auto grid max-w-7xl gap-10 px-8 py-12 md:grid-cols-[1fr_auto]">
          {/* Brand block */}
          <div className="max-w-sm">
            <div className="mb-4 flex items-center gap-3">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold"
                style={{ background:'var(--store-accent)', color:'var(--store-accent-text)', fontFamily:`'${typography.headingFont}', serif` }}
              >
                {store.name.charAt(0).toUpperCase()}
              </span>
              <span
                className="store-heading text-xl font-bold"
                style={{ fontFamily:`'${typography.headingFont}', serif` }}
              >
                {store.name}
              </span>
            </div>
            {store.targetAudience && (
              <p className="text-xs leading-relaxed" style={{ color:'var(--store-muted)' }}>
                For {store.targetAudience}.
              </p>
            )}
            <p className="mt-3 text-xs" style={{ color:'var(--store-muted)' }}>
              Powered by <strong style={{ color:'var(--store-text)' }}>Seltra</strong>
            </p>
          </div>

          {/* 3-column link grid */}
          <div className="grid grid-cols-3 gap-8 text-xs sm:gap-12">
            <div className="flex flex-col gap-3">
              <span className="store-eyebrow font-semibold" style={{ color:'var(--store-text)' }}>Shop</span>
              {(store.canonical?.productCategories ?? ['All products']).slice(0, 4).map((cat) => (
                <button
                  key={cat}
                  className="text-left transition-colors"
                  style={{ color:'var(--store-muted)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--store-text)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--store-muted)')}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <span className="store-eyebrow font-semibold" style={{ color:'var(--store-text)' }}>Support</span>
              {['FAQ', 'Track order', 'Returns', 'Contact'].map((l) => (
                <span key={l} className="cursor-default" style={{ color:'var(--store-muted)' }}>{l}</span>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <span className="store-eyebrow font-semibold" style={{ color:'var(--store-text)' }}>Legal</span>
              {['Privacy policy', 'Terms', 'Refunds'].map((l) => (
                <span key={l} className="cursor-default" style={{ color:'var(--store-muted)' }}>{l}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div
          className="flex items-center justify-center border-t px-8 py-4"
          style={{ borderColor:'var(--store-border)' }}
        >
          <p className="text-center text-[0.68rem]" style={{ color:'var(--store-muted)' }}>
            &copy; {new Date().getFullYear()} {store.name}. All rights reserved.
          </p>
        </div>
      </footer>

      <ProductDetailModal
        product={detailProduct}
        onClose={() => setDetailProduct(null)}
        onAddToCart={addToCart}
        inCart={cart.some((i) => i.product.id === detailProduct?.id)}
      />
      <CartDrawer open={cartOpen} items={cart} currency={currency} storeSlug={storeSlug} storeId={store.id} onClose={() => setCartOpen(false)} onUpdateQty={updateQty} />
    </div>
  )
}
