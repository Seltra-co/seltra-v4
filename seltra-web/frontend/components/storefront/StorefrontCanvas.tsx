//seltra-web/frontend/components/storefront/StorefrontCanvas.tsx
'use client'
import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { ShoppingBag } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AnnouncementBar }    from './sections/AnnouncementBar'
import { HeroSection }        from './sections/HeroSection'
import { TrustBar }           from './sections/TrustBar'
import { CategoryStrip }      from './sections/CategoryStrip'
import { ProductGrid }        from './sections/ProductGrid'
import { ProductShelf }       from './sections/ProductShelf'
import { BrandStory }         from './sections/BrandStory'
import { SocialProof }        from './sections/SocialProof'
import { Newsletter }         from './sections/Newsletter'
import { FeaturedDrop }       from './sections/FeaturedDrop'
import { FAQSection }         from './sections/FAQSection'
import { CountdownBanner }    from './sections/CountdownBanner'
import { BeforeAfter }        from './sections/BeforeAfter'
import { FounderStory }       from './sections/FounderStory'
import { IngredientsList }    from './sections/IngredientsList'
import { LookbookGrid }       from './sections/LookbookGrid'
import { CartDrawer }         from './sections/CartDrawer'
import { ProductDetailModal } from './sections/ProductDetailModal'
import type {
  StoreProduct, StoreManifest, ManifestSection, StorePalette, StoreTypography,
} from './sections/types'
import { THEMES, RADIUS_SCALE, SPACING_SCALE, shadowFor, type ThemeKey } from './themes'


function StyleInjector({ fontParam, themeVars }: { fontParam: string; themeVars: string }) {
  useEffect(() => {
    const id = `seltra-font-${fontParam.slice(0, 40).replace(/[^a-z0-9]/gi, '')}`
    if (!document.getElementById(id)) {
      const link = document.createElement('link')
      link.id = id
      link.rel = 'stylesheet'
      link.href = `https://fonts.googleapis.com/css2?${fontParam}&display=swap`
      document.head.appendChild(link)
    }
  }, [fontParam])
  return <style suppressHydrationWarning>{`.seltra-storefront{${themeVars}}`}</style>
}

export interface CartItem { product: StoreProduct; quantity: number }

export interface StoreData {
  id?: string; name: string; slug: string; businessType?: string; targetAudience?: string
  brandName?: string
  heroTitle?: string; heroSubtitle?: string
  canonical?: {
    brandName?: string; businessName?: string
    storeFeatures?: string[]; productCategories?: string[]; layoutVariant?: string
    recommendedTechStack?: { paymentGateways?: string[] }
    heroImageUrl?: string; storyImageUrl?: string
  }
  storeDNA?: { brandPersonality?: string; industry?: string }
  products?: Array<{
    id: string; name: string; description?: string | null
    price: string | number; currency?: string; category?: string | null
    images?: Array<{ url: string; isPrimary?: boolean }>
    variants?: Array<{ name: string; value: string }>
  }>
  manifest?: StoreManifest | null
  heroSource?: string | null
  navSource?: string | null
  storefrontCode?: string | null; storefrontVersion?: number
}

function buildThemeVars(p: StorePalette, t: StoreTypography, themeKey: string): string {
  const tokens = THEMES[themeKey as ThemeKey] ?? THEMES['minimal-light']
  const radius = RADIUS_SCALE[tokens.borderRadius]
  const cardRadius = tokens.borderRadius === 'pill' ? '1.5rem' : radius
  const spacing = SPACING_SCALE[tokens.spacing]
  const shadow = shadowFor({ shadow: tokens.shadow, accentColor: p.accent })
  return `--store-bg:${p.bg};--store-surface:${p.surface};--store-border:${p.border};--store-text:${p.text};--store-muted:${p.muted};--store-accent:${p.accent};--store-accent-text:${p.accentText};--store-accent-soft:${p.accentSoft};--store-accent-secondary:${tokens.accentSecondaryColor};--store-heading-font:'${t.headingFont}';--store-body-font:'${t.bodyFont}';--store-radius:${radius};--store-radius-card:${cardRadius};--store-section-spacing:${spacing};--store-shadow:${shadow};`
}

function deriveManifest(store: StoreData): StoreManifest {
  const c = [store.name, store.businessType ?? '', store.targetAudience ?? ''].join(' ').toLowerCase()
  const isFood   = /food|restaurant|cafe|snack|drink/.test(c)
  const isBeauty = /beauty|skincare|cosmetic|luxury|jewelry|wellness|serum/.test(c)
  const isBold   = /streetwear|sneaker|sport|gym|gaming|tech|hype/.test(c)
  const palette: StorePalette = isFood
    ? { bg:'#faf7f2',surface:'#ffffff',border:'#e8dfd0',text:'#2d2419',muted:'#8a7560',accent:'#c4622d',accentText:'#ffffff',accentSoft:'#f5ece6' }
    : isBeauty
    ? { bg:'#faf9f7',surface:'#ffffff',border:'#e8e4df',text:'#1a1a1a',muted:'#7a7060',accent:'#b8860b',accentText:'#ffffff',accentSoft:'#fdf5e4' }
    : isBold
    ? { bg:'#0d0d0d',surface:'#141414',border:'#2a2a2a',text:'#f0f0f0',muted:'#888888',accent:'#ff3c00',accentText:'#ffffff',accentSoft:'#1f1008' }
    : { bg:'#fafafa',surface:'#ffffff',border:'#e5e5e5',text:'#1a1a1a',muted:'#717171',accent:'#2563eb',accentText:'#ffffff',accentSoft:'#eff6ff' }
  const typography: StoreTypography = isFood
    ? { headingFont:'Fraunces', bodyFont:'DM Sans' }
    : isBeauty
    ? { headingFont:'Playfair Display', bodyFont:'DM Sans' }
    : isBold
    ? { headingFont:'Bebas Neue', bodyFont:'Inter' }
    : { headingFont:'Syne', bodyFont:'Inter' }
  const displayName = resolveDisplayName(store)
  return {
    sections: [
      { type:'hero-centered', headline:displayName, tagline:store.heroSubtitle??'Shop the collection.', subtext:`For ${store.targetAudience??'your customers'}.`, eyebrow:store.businessType??'' },
      { type:'trust-bar', items:store.canonical?.storeFeatures?.slice(0,4)??['Secure checkout','Fast delivery','Easy returns','Local support'] },
      { type:'category-strip' },
      { type:'product-grid', columns:3, style:'uniform', showCategory:true, sectionLabel:'Products' },
      { type:'social-proof', style:'marquee' },
      { type:'newsletter', headline:'Stay in the loop', subtext:'Get updates and exclusive offers.' },
    ],
    palette, typography,
  }
}

// Resolve display name: brandName > short businessName
function resolveDisplayName(store: StoreData): string {
  const approvedBrand = store.brandName ?? store.canonical?.brandName
  if (approvedBrand && approvedBrand.trim().split(/\s+/).length <= 4) return approvedBrand.trim()
  const approvedBusiness = store.canonical?.businessName ?? store.name
  const words = approvedBusiness.trim().split(/\s+/)
  if (words.length > 3) return words.slice(0, 2).join(' ')
  return approvedBusiness
}

const SectionFade = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-60px' }}
    transition={{ duration: 0.5, delay: 0.04, ease: [0.4, 0, 0.2, 1] }}
  >
    {children}
  </motion.div>
)

function renderSection(
  section: ManifestSection,
  i: number,
  props: {
    products: StoreProduct[]; features: string[]; categories: string[]
    onAddToCart: (p: StoreProduct) => void; storeName: string
    onViewDetail?: (p: StoreProduct) => void; industry?: string
    storyImageUrl?: string
  },
) {
  const W = ({ children }: { children: React.ReactNode }) => <SectionFade>{children}</SectionFade>
  const {
    products,
    features,
    categories,
    onAddToCart,
    storeName,
    onViewDetail,
    industry,
    storyImageUrl,
} = props

  switch (section.type) {
    case 'announcement-bar': return <AnnouncementBar key={i} message={section.message} />
    case 'countdown-banner': return <W key={i}><CountdownBanner message={(section as { message?: string }).message} /></W>
    case 'hero-centered': case 'hero-split': case 'hero-editorial': case 'hero-fullbleed': case 'hero-minimal':
      return <HeroSection key={i} section={section} products={products} features={features} storeName={storeName} />
    case 'trust-bar':
      return <W key={i}><TrustBar items={section.items} industry={industry} /></W>
    case 'category-strip':
      return <W key={i}><CategoryStrip categories={categories} headline={section.headline} /></W>
    case 'featured-drop':
      return <W key={i}><FeaturedDrop section={section} products={products} onAddToCart={onAddToCart} onViewDetail={onViewDetail} /></W>
    case 'product-grid':
      return <W key={i}><ProductGrid section={section} products={products} onAddToCart={onAddToCart} onViewDetail={onViewDetail} /></W>
    case 'product-shelf':
      return <W key={i}><ProductShelf section={section} products={products} onAddToCart={onAddToCart} storeName={storeName} onViewDetail={onViewDetail} /></W>
   case 'brand-story':
    return (
        <W key={i}>
            <BrandStory
                {...section}
                storyImageUrl={storyImageUrl}
            />
        </W>
    )
    case 'social-proof':
      return <W key={i}><SocialProof style={section.style} headline={section.headline} subtext={section.subtext} /></W>
    case 'newsletter':
      return <W key={i}><Newsletter headline={section.headline} subtext={section.subtext} placeholder={section.placeholder} /></W>
    case 'faq':
      return <W key={i}><FAQSection items={(section as { items?: Array<{ question: string; answer: string }> }).items} headline={(section as { headline?: string }).headline} /></W>
    case 'before-after':
      return <W key={i}><BeforeAfter headline={(section as { headline?: string }).headline} beforeLabel={(section as { beforeLabel?: string }).beforeLabel} afterLabel={(section as { afterLabel?: string }).afterLabel} /></W>
    case 'founder-story':
      return <W key={i}><FounderStory founderName={(section as { founderName?: string }).founderName} story={(section as { story?: string }).story} storeName={storeName} /></W>
    case 'ingredients-list':
      return <W key={i}><IngredientsList headline={(section as { headline?: string }).headline} items={(section as { items?: Array<{ name: string; benefit: string }> }).items} /></W>
    case 'lookbook-grid':
      return <W key={i}><LookbookGrid headline={(section as { headline?: string }).headline} images={(section as { images?: Array<{ url: string; caption?: string }> }).images} products={products} onAddToCart={onAddToCart} /></W>
    default: return null
  }
}

interface CanvasProps { store: StoreData; storeSlug: string; minHeightClass?: string; themeKey?: string }

export function StorefrontCanvas({ store, storeSlug, minHeightClass = 'min-h-[560px]', themeKey = 'minimal-light' }: CanvasProps) {
  const manifest = store.manifest ?? deriveManifest(store)
  const { palette, typography } = manifest
  const displayName = resolveDisplayName(store)
  const heroImageUrl = store.canonical?.heroImageUrl as string | undefined
  const storyImageUrl = store.canonical?.storyImageUrl as string | undefined
  const industry = store.storeDNA?.industry
  const heroSection = manifest.sections.find(isHeroSection) ?? deriveManifest(store).sections.find(isHeroSection)!
  const bodySections = manifest.sections.filter((section) => !isHeroSection(section))

  const products: StoreProduct[] = (store.products ?? []).map((p) => ({
    id: p.id ?? '', name: p.name ?? '', description: p.description,
    price: p.price, currency: p.currency ?? 'GHS', category: p.category,
    images: p.images as Array<{ url: string; isPrimary?: boolean }>,
    variants: p.variants as Array<{ name: string; value: string }>,
  }))

  const features   = store.canonical?.storeFeatures ?? []
  const categories = store.canonical?.productCategories ?? []
  const currency   = products[0]?.currency ?? 'GHS'
  const CART_KEY   = `seltra:cart:${storeSlug}`

 const [cart, setCart] = useState<CartItem[]>([])

  // Rehydrate cart from localStorage after mount only (avoids SSR mismatch)
  useEffect(() => {
    try {
      const s = window.localStorage.getItem(CART_KEY)
      if (s) setCart(JSON.parse(s))
    } catch {}
  }, [CART_KEY])
  const [cartOpen, setCartOpen]           = useState(false)
  const [detailProduct, setDetailProduct] = useState<StoreProduct | null>(null)
  const [mounted, setMounted]             = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    try { window.localStorage.setItem(CART_KEY, JSON.stringify(cart)) } catch {}
  }, [cart, CART_KEY])

  const addToCart = useCallback((product: StoreProduct) => {
    setCart((prev) => {
      const ex = prev.find((i) => i.product.id === product.id)
      if (ex) return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { product, quantity: 1 }]
    })
    toast.success(`${product.name} added`, { duration: 1400 })
    setCartOpen(true)
  }, [])

  const updateQty = useCallback((id: string, delta: number) => {
    setCart((prev) => prev.map((i) => i.product.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter((i) => i.quantity > 0))
  }, [])

  // Smooth scroll to a section by its data-section attribute
  const scrollToSection = useCallback((sectionType: string) => {
    const el = document.querySelector(`[data-section="${sectionType}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)
  const fonts     = [...new Set([typography.headingFont, typography.bodyFont])]
  const fontParam = fonts.map((f) => `family=${f.replace(/ /g, '+')}:wght@300;400;500;600;700;800;900`).join('&')

  const sectionProps = {
    products, features, categories,
    onAddToCart: addToCart,
    storeName: displayName,
    onViewDetail: (p: StoreProduct) => setDetailProduct(p),
    industry,
    storyImageUrl,
  }
const heroFallback = (
  <HeroSection
    section={heroSection}
    products={products}
    features={features}
    storeName={displayName}
    heroImageUrl={heroImageUrl}
  />
)
  const heroProps = {
    store: {
      id: store.id,
      name: displayName,
      displayName,
      businessType: store.businessType,
      targetAudience: store.targetAudience,
      brandName: store.brandName ?? store.canonical?.brandName,
    },
    products,
    features,
    onShopNow: () => scrollToSection('product-grid'),
    onOpenCart: () => setCartOpen(true),
  }
  const navFallback = (
    <DefaultNav
      displayName={displayName}
      businessType={store.businessType}
      categories={categories}
      cartCount={cartCount}
      onOpenCart={() => setCartOpen(true)}
      onCategoryClick={() => scrollToSection('product-grid')}
      onLogoClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      mounted={mounted}
    />
  )
  const navProps = {
    displayName,
    businessType: store.businessType,
    categories,
    cartCount,
    CartIcon: ShoppingBag,
    onOpenCart: () => setCartOpen(true),
    onCategoryClick: () => scrollToSection('product-grid'),
    onLogoClick: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
  }

  return (
    <div className={`seltra-storefront relative w-full overflow-x-hidden ${minHeightClass}`}>
      <StyleInjector fontParam={fontParam} themeVars={buildThemeVars(palette, typography, themeKey)} />
      <MicroComponentRenderer source={store.navSource} componentName="StorefrontNav" props={navProps} fallback={navFallback} />

      <div data-section="hero">
            <MicroComponentRenderer
        source={heroImageUrl ? null : store.heroSource}
        componentName="StorefrontHero"
        props={{
            ...heroProps,
            heroImageUrl,
        }}
        fallback={heroFallback}
    />
      </div>

      {/* ── Sections — each gets a data-section attribute for scroll targeting ── */}
      {bodySections.map((section, i) => (
        <div key={i} data-section={section.type}>
          {renderSection(section, i, sectionProps)}
        </div>
      ))}

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="border-t" style={{ borderColor: 'var(--store-border)', background: 'var(--store-bg)' }}>
        <div className="mx-auto grid max-w-7xl gap-10 px-8 py-12 md:grid-cols-[1fr_auto]">
          <div className="max-w-sm">
            <div className="mb-4 flex items-center gap-3">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold"
                style={{ background: 'var(--store-accent)', color: 'var(--store-accent-text)', fontFamily: `'${typography.headingFont}', serif` }}
              >
                {displayName.charAt(0).toUpperCase()}
              </span>
              <span
                className="store-heading text-xl font-bold"
                style={{ fontFamily: `'${typography.headingFont}', serif` }}
              >
                {displayName}
              </span>
            </div>
            {store.targetAudience && (
              <p className="text-xs leading-relaxed" style={{ color: 'var(--store-muted)' }}>
                For {store.targetAudience}.
              </p>
            )}
            <p className="mt-3 text-xs" style={{ color: 'var(--store-muted)' }}>
              Powered by <strong style={{ color: 'var(--store-text)' }}>Seltra</strong>
            </p>
          </div>
          <div className="grid grid-cols-3 gap-8 text-xs sm:gap-12">
            {[
              { label: 'Shop', links: store.canonical?.productCategories?.slice(0, 4) ?? ['All products'] },
              { label: 'Support', links: ['FAQ', 'Track order', 'Returns', 'Contact'] },
              { label: 'Legal',   links: ['Privacy policy', 'Terms', 'Refunds'] },
            ].map(({ label, links }) => (
              <div key={label} className="flex flex-col gap-3">
                <span className="store-eyebrow font-semibold" style={{ color: 'var(--store-text)' }}>{label}</span>
                {links.map((l) => (
                  <span key={l} className="cursor-default" style={{ color: 'var(--store-muted)' }}>{l}</span>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-center border-t px-8 py-4" style={{ borderColor: 'var(--store-border)' }}>
          <p className="text-center text-[0.68rem]" style={{ color: 'var(--store-muted)' }}>
            &copy; {new Date().getFullYear()} {displayName}. All rights reserved.
          </p>
        </div>
      </footer>

      <ProductDetailModal product={detailProduct} onClose={() => setDetailProduct(null)} onAddToCart={addToCart} inCart={cart.some((i) => i.product.id === detailProduct?.id)} />
      <CartDrawer open={cartOpen} items={cart} currency={currency} storeSlug={storeSlug} storeId={store.id} onClose={() => setCartOpen(false)} onUpdateQty={updateQty} />
    </div>
  )
}

type DefaultNavProps = {
  displayName: string
  businessType?: string
  categories: string[]
  cartCount: number
  onOpenCart: () => void
  onCategoryClick: (category: string) => void
  onLogoClick: () => void
  mounted?: boolean
}

function DefaultNav({
  displayName,
  businessType,
  categories,
  cartCount,
  onOpenCart,
  onCategoryClick,
  onLogoClick,
  mounted = true,
}: DefaultNavProps) {
return (
    <div className="sticky top-0 z-30">
      <nav
        className="flex items-center justify-between gap-4 border-b px-5 py-3 backdrop-blur-xl"
        style={{ background: `color-mix(in srgb, var(--store-bg) 92%, transparent)`, borderColor: 'var(--store-border)' }}
      >
        <button onClick={onLogoClick} className="flex min-w-0 items-center gap-3 border-0 bg-transparent p-0 text-left">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
            style={{ background: 'var(--store-accent)', color: 'var(--store-accent-text)', fontFamily: 'var(--store-heading-font)' }}
          >
            {displayName.charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0">
            <span className="store-heading block truncate text-base font-bold leading-none" style={{ fontFamily: 'var(--store-heading-font)' }}>
              {displayName}
            </span>
            {businessType && <span className="store-eyebrow mt-0.5 block truncate">{businessType}</span>}
          </span>
        </button>

        {categories.length > 0 && (
          <div className="hidden items-center gap-5 md:flex">
            {categories.slice(0, 4).map((cat) => (
              <button
                key={cat}
                onClick={() => onCategoryClick(cat)}
                className="border-0 bg-transparent text-xs font-medium transition-colors"
                style={{ color: 'var(--store-muted)', cursor: 'pointer' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--store-text)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--store-muted)')}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={onOpenCart}
          className="store-btn-outline relative flex shrink-0 items-center gap-2 px-3 py-1.5 text-xs"
          style={{ borderRadius: 'var(--store-radius-full)' }}
        >
          <ShoppingBag className="h-3.5 w-3.5" style={{ color: 'var(--store-accent)' }} />
          Cart
          {mounted && (
            <AnimatePresence mode="wait">
              {cartCount > 0 && (
                <motion.span
                  key={cartCount}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  className="flex h-4 w-4 items-center justify-center rounded-full text-[0.6rem] font-extrabold"
                  style={{ background: 'var(--store-accent)', color: 'var(--store-accent-text)' }}
                >
                  {cartCount}
                </motion.span>
              )}
            </AnimatePresence>
          )}
        </button>
      </nav>

      {/* P0.6 — mobile had zero category navigation before this. Desktop hides
         the row at md: and mobile got nothing in its place. */}
      {categories.length > 0 && (
        <div
          className="flex items-center gap-2 overflow-x-auto border-b px-4 py-2 md:hidden"
          style={{ borderColor: 'var(--store-border)', background: 'var(--store-bg)', scrollbarWidth: 'none' }}
        >
          {categories.slice(0, 8).map((cat) => (
            <button
              key={cat}
              onClick={() => onCategoryClick(cat)}
              className="flex-shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-[0.7rem] font-medium"
              style={{ borderColor: 'var(--store-border)', color: 'var(--store-muted)' }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

class MicroErrorBoundary extends React.Component<{ fallback: React.ReactNode; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: unknown) { console.warn('[StorefrontCanvas] Micro component failed:', error) }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

function MicroComponentRenderer({
  source,
  componentName,
  props,
  fallback,
}: {
  source?: string | null
  componentName: 'StorefrontHero' | 'StorefrontNav'
  props: Record<string, unknown>
  fallback: React.ReactNode
}) {
  const Component = useMemo(() => {
    if (!source) return null
    try {
      if (componentName === 'StorefrontHero' && !source.includes('props.store.displayName')) return null
      if (componentName === 'StorefrontNav' && !source.includes('props.CartIcon')) return null
      const factory = new Function('React', `${source}; return typeof ${componentName} === "function" ? ${componentName} : null;`)
      return factory(React) as React.ComponentType<Record<string, unknown>> | null
    } catch (error) {
      console.warn(`[StorefrontCanvas] Could not construct ${componentName}:`, error)
      return null
    }
  }, [source, componentName])

  if (!Component) return <>{fallback}</>
  return (
    <MicroErrorBoundary fallback={fallback}>
      <Component {...props} />
    </MicroErrorBoundary>
  )
}

function isHeroSection(section: ManifestSection) {
  return section.type === 'hero-centered' || section.type === 'hero-split' || section.type === 'hero-editorial' || section.type === 'hero-fullbleed' || section.type === 'hero-minimal'
}
