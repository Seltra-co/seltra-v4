//seltra-web/frontend/components/storefront/StorefrontCanvas.tsx
'use client'
import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { ShoppingBag, Menu, X } from 'lucide-react'
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
  DeliveryTier, SelectedVariants,
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

export interface CartItem { key: string; product: StoreProduct; quantity: number; selectedVariants?: SelectedVariants }

export interface StoreData {
  id?: string; name: string; slug: string; businessType?: string; targetAudience?: string
  brandName?: string
  heroTitle?: string; heroSubtitle?: string
  canonical?: {
    brandName?: string; businessName?: string
    storeFeatures?: string[]; productCategories?: string[]; layoutVariant?: string
    recommendedTechStack?: { paymentGateways?: string[] }
    heroImageUrl?: string; storyImageUrl?: string
    heroSpec?: { imageTreatment?: string }
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
  fulfillmentMode?: 'delivery' | 'pickup' | 'both' | null
  contactPhone?: string | null
  pickupAddress?: string | null
  pickupInstructions?: string | null
  deliveryDays?: string | null
  deliveryEstimate?: string | null
  deliveryFeeNote?: string | null
  deliveryTiers?: DeliveryTier[] | null
}

function hasVariantChoices(product: StoreProduct): boolean {
  return Boolean(product.variants?.some((variant) => variant.name && variant.value))
}

function stableVariantKey(selectedVariants?: SelectedVariants): string {
  if (!selectedVariants) return ''
  return Object.keys(selectedVariants)
    .sort((a, b) => a.localeCompare(b))
    .map((key) => `${key}:${selectedVariants[key]}`)
    .join('|')
}

function cartLineKey(product: StoreProduct, selectedVariants?: SelectedVariants): string {
  const variantKey = stableVariantKey(selectedVariants)
  return variantKey ? `${product.id}::${variantKey}` : product.id
}

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, value))
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) return null
  const parsed = Number.parseInt(normalized, 16)
  if (Number.isNaN(parsed)) return null
  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255,
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((v) => clampChannel(v).toString(16).padStart(2, '0'))
    .join('')}`
}

function mixHex(hexA: string, hexB: string, weight = 0.5): string {
  const a = hexToRgb(hexA)
  const b = hexToRgb(hexB)
  if (!a || !b) return hexA
  const w = Math.max(0, Math.min(1, weight))
  const r = Math.round(a.r * (1 - w) + b.r * w)
  const g = Math.round(a.g * (1 - w) + b.g * w)
  const bVal = Math.round(a.b * (1 - w) + b.b * w)
  return rgbToHex(r, g, bVal)
}

function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0
  const channel = (value: number) => {
    const normalized = value / 255
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b)
}

function contrastRatio(a: string, b: string): number {
  const lumA = relativeLuminance(a)
  const lumB = relativeLuminance(b)
  const light = Math.max(lumA, lumB)
  const dark = Math.min(lumA, lumB)
  return (light + 0.05) / (dark + 0.05)
}

function ensureReadableContrast(palette: StorePalette, themeKey: string): StorePalette {
  const textOnBg = contrastRatio(palette.text, palette.bg)
  const accentOnBg = contrastRatio(palette.accent, palette.bg)
  const accentTextOnAccent = contrastRatio(palette.accentText, palette.accent)

  const next = { ...palette }
  if (textOnBg < 4.5) {
    next.text = relativeLuminance(next.bg) > 0.5 ? '#111111' : '#f8f8f8'
  }
  if (accentOnBg < 3) {
    next.accent = mixHex(next.accent, relativeLuminance(next.bg) > 0.5 ? '#111111' : '#f8f8f8', 0.2)
  }
  if (accentTextOnAccent < 4.5) {
    next.accentText = relativeLuminance(next.accent) > 0.5 ? '#111111' : '#ffffff'
  }
  if (contrastRatio(next.accent, next.accentSoft) < 2.2) {
    next.accentSoft = mixHex(next.accentSoft, next.bg, 0.28)
  }
  const tokens = THEMES[themeKey as ThemeKey] ?? THEMES['minimal-light']
  next.border = mixHex(next.border, tokens.borderColor, 0.15)
  next.muted = mixHex(next.muted, next.text, 0.24)
  return next
}

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function resolveStoreTheme(store: StoreData, fallbackThemeKey: string): { palette: StorePalette; typography: StoreTypography } {
  const baseThemeKey = fallbackThemeKey || 'minimal-light'
  const tokens = THEMES[baseThemeKey as ThemeKey] ?? THEMES['minimal-light']
  const seed = hashString([
    store.name,
    store.brandName ?? '',
    store.businessType ?? '',
    store.storeDNA?.industry ?? '',
    store.storeDNA?.brandPersonality ?? '',
    store.targetAudience ?? '',
  ].join('|'))

  const accentShift = 0.04 + (seed % 10) / 80
  const surfaceShift = 0.06 + (seed % 7) / 90
  const fontBias = ['Fraunces', 'Inter', 'Playfair Display', 'Syne', 'DM Sans'][seed % 5]

  const paletteSeed: StorePalette = {
    bg: tokens.primaryColor,
    surface: tokens.surfaceColor,
    border: tokens.borderColor,
    text: tokens.textColor,
    muted: tokens.mutedColor,
    accent: tokens.accentColor,
    accentText: tokens.accentTextColor,
    accentSoft: tokens.accentSoftColor,
  }

  const palette = ensureReadableContrast({
    ...paletteSeed,
    accent: mixHex(tokens.accentColor, store.storeDNA?.brandPersonality === 'luxury' ? '#b8863f' : store.storeDNA?.brandPersonality === 'playful' ? '#f97316' : tokens.accentColor, accentShift),
    accentSoft: mixHex(tokens.accentSoftColor, store.storeDNA?.industry === 'beauty' ? '#fdf4e5' : store.storeDNA?.industry === 'food' ? '#fff4eb' : tokens.accentSoftColor, surfaceShift),
    surface: mixHex(tokens.surfaceColor, store.storeDNA?.industry === 'beauty' ? '#fffdfb' : '#ffffff', 0.08),
    border: mixHex(tokens.borderColor, '#d1d5db', 0.14),
  }, baseThemeKey)

  const typography = {
    headingFont: fontBias,
    bodyFont: tokens.bodyFont,
  }

  return { palette, typography }
}

function buildThemeVars(p: StorePalette, t: StoreTypography, themeKey: string): string {
  const tokens = THEMES[themeKey as ThemeKey] ?? THEMES['minimal-light']
  const radius = RADIUS_SCALE[tokens.borderRadius]
  const cardRadius = tokens.borderRadius === 'pill' ? '1.5rem' : radius
  const spacing = SPACING_SCALE[tokens.spacing]
  const shadow = shadowFor({ shadow: tokens.shadow, accentColor: p.accent })
  const mediaRadius = '1.5rem'
  const mediaShadow = '0 24px 60px -20px rgba(0,0,0,0.25)'
  return `--store-bg:${p.bg};--store-surface:${p.surface};--store-border:${p.border};--store-text:${p.text};--store-muted:${p.muted};--store-accent:${p.accent};--store-accent-text:${p.accentText};--store-accent-soft:${p.accentSoft};--store-accent-secondary:${tokens.accentSecondaryColor};--store-heading-font:'${t.headingFont}';--store-body-font:'${t.bodyFont}';--store-radius:${radius};--store-radius-card:${cardRadius};--store-radius-media:${mediaRadius};--store-section-spacing:${spacing};--store-shadow:${shadow};--store-shadow-hero:${mediaShadow};`
}

function applyMerchantOverrides(manifest: StoreManifest, store: StoreData): StoreManifest {
  const canonical = store.canonical as Record<string, unknown> | undefined
  if (!canonical) return manifest
  let sections = [...manifest.sections]

  const about = canonical.aboutOverride as { headline?: string; body?: string } | undefined
  if (about?.body) {
    sections = sections.map((s) => {
      if (s.type !== 'brand-story') return s
      const existing = s as { headline?: string; body?: string }
      return {
        ...s,
        headline: about.headline ?? existing.headline ?? 'Our story',
        body: about.body ?? existing.body ?? '',
      }
    })
  }

  const faqItems = canonical.faqItems as Array<{ question: string; answer: string }> | undefined
  if (Array.isArray(faqItems) && faqItems.length > 0) {
    const hasFaq = sections.some((s) => s.type === 'faq')
    if (hasFaq) {
      sections = sections.map((s) => (s.type === 'faq' ? { ...s, items: faqItems } : s))
    } else {
      const newsletterIdx = sections.findIndex((s) => s.type === 'newsletter')
      const faqSection = { type: 'faq', headline: 'Questions customers ask', items: faqItems } as ManifestSection
      sections = newsletterIdx === -1
        ? [...sections, faqSection]
        : [...sections.slice(0, newsletterIdx), faqSection, ...sections.slice(newsletterIdx)]
    }
  }

  return { ...manifest, sections }
}

const GENERIC_BUSINESS_TYPE = /^(e-?commerce|online)\s+(store|shop|brand|business)$/i

function humanizedEyebrow(store: StoreData): string {
  const bt = (store.businessType ?? '').trim()
  if (!bt || GENERIC_BUSINESS_TYPE.test(bt)) {
    const industry = store.storeDNA?.industry
    const personality = store.storeDNA?.brandPersonality
    if (industry && personality) return `${personality} ${industry}`.replace(/^\w/, (c) => c.toUpperCase())
    if (industry) return industry.replace(/^\w/, (c) => c.toUpperCase())
    return ''
  }
  return bt
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
      { type:'hero-centered', headline:displayName, tagline:store.heroSubtitle??'Shop the collection.', subtext:`For ${store.targetAudience??'your customers'}.`, eyebrow:humanizedEyebrow(store) },
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

function normalizeHeroHeadline(headline: string, store: StoreData): string | null {
  const normalized = headline.trim().toLowerCase()
  if (!normalized) return null
  const categories = [
    ...(store.canonical?.productCategories ?? []),
    ...(store.products?.map((p) => p.category).filter(Boolean) as string[]),
  ]
    .map((category) => category.trim().toLowerCase())
    .filter(Boolean)
  if (categories.length === 0) return headline.trim()

  const joinedSpace = categories.join(' ')
  const joinedComma = categories.join(', ')
  if (normalized === joinedSpace || normalized === joinedComma) return null

  const matches = categories.filter((category) => category.length > 2 && normalized.includes(category))
  if (matches.length >= Math.min(2, categories.length)) return null

  return headline.trim()
}

function isGenericHeroTagline(text: string): boolean {
  const normalized = text.trim().toLowerCase()
  return /^(the best of|discover our|welcome to|shop the collection|browse our|explore our)/.test(normalized)
}

function isGenericHeroCtaLabel(label: string): boolean {
  const normalized = label.trim().toLowerCase()
  return [
    'learn more',
    'browse products',
    'explore collection',
    'view collection',
    'discover more',
    'see more',
    'see what\'s inside',
    'see whats inside',
  ].includes(normalized)
}

type HeroSectionManifest = Extract<ManifestSection, { type: 'hero-centered' | 'hero-split' | 'hero-editorial' | 'hero-fullbleed' | 'hero-minimal' }>

function heroSectionFromSpec(store: StoreData): HeroSectionManifest | null {
  const canonical = store.canonical as Record<string, unknown> | undefined
  const spec = canonical?.heroSpec as {
    archetype?: string
    headline?: string
    tagline?: string
    ctaLabel?: string
  } | undefined
  if (!spec?.headline) return null

  const normalizedHeadline = normalizeHeroHeadline(spec.headline, store)
  const normalizedTagline = spec.tagline && !isGenericHeroTagline(spec.tagline) ? spec.tagline.trim() : null
  const normalizedCtaLabel = spec.ctaLabel && !isGenericHeroCtaLabel(spec.ctaLabel) ? spec.ctaLabel.trim() : null
  if (!normalizedHeadline) return null

  const typeMap: Record<string, ManifestSection['type']> = {
    'centered-stacked': 'hero-centered',
    'split-image-right': 'hero-split',
    'split-image-left': 'hero-split',
    'fullbleed-bottom-text': 'hero-fullbleed',
    'minimal-typographic': 'hero-minimal',
    'editorial-commerce': 'hero-editorial',
    'product-spotlight-floating': 'hero-split',
    'marketplace-grid-hero': 'hero-editorial',
    'lifestyle-scrim-cart': 'hero-editorial',
  }
  return {
    type: typeMap[spec.archetype ?? ''] ?? 'hero-centered',
    headline: normalizedHeadline,
    tagline: normalizedTagline ?? store.heroSubtitle ?? 'Shop the collection.',
    subtext: `For ${store.targetAudience ?? 'your customers'}.`,
    eyebrow: humanizedEyebrow(store),
    ctaLabel: normalizedCtaLabel ?? 'Shop now',
  } as Extract<ManifestSection, { type: 'hero-centered' | 'hero-split' | 'hero-editorial' | 'hero-fullbleed' | 'hero-minimal' }>
}

function resolveHeroSection(store: StoreData, manifest: StoreManifest): HeroSectionManifest {
  const heroSection = manifest.sections.find(isHeroSection) ?? heroSectionFromSpec(store) ?? deriveManifest(store).sections.find(isHeroSection)!
  return heroSection as HeroSectionManifest
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
    products: StoreProduct[]
    features: string[]
    categories: string[]
    activeCategory: string
    onCategoryChange: (category: string) => void
    onAddToCart: (p: StoreProduct, selectedVariants?: SelectedVariants) => void
    storeName: string
    onViewDetail?: (p: StoreProduct) => void
    industry?: string
    storyImageUrl?: string
    testimonials?: Array<{ text: string; author: string }>
  },
) {
  const W = ({ children }: { children: React.ReactNode }) => <SectionFade>{children}</SectionFade>
  const {
    products,
    features,
    categories,
    activeCategory,
    onCategoryChange,
    onAddToCart,
    storeName,
    onViewDetail,
    industry,
    storyImageUrl,
    testimonials,
  } = props

  switch (section.type) {
    case 'announcement-bar': return <AnnouncementBar key={i} message={section.message} />
    case 'countdown-banner': return <W key={i}><CountdownBanner message={(section as { message?: string }).message} /></W>
    case 'hero-centered': case 'hero-split': case 'hero-editorial': case 'hero-fullbleed': case 'hero-minimal':
      return <HeroSection key={i} section={section} products={products} features={features} storeName={storeName} />
    case 'trust-bar':
      return <W key={i}><TrustBar items={section.items} industry={industry} /></W>
    case 'category-strip':
      return <W key={i}><CategoryStrip categories={categories} activeCategory={activeCategory} onCategoryChange={onCategoryChange} headline={section.headline} /></W>
    case 'featured-drop':
      return <W key={i}><FeaturedDrop section={section} products={products} onAddToCart={onAddToCart} onViewDetail={onViewDetail} /></W>
    case 'product-grid':
      return <W key={i}><ProductGrid section={section} products={products} categories={categories} activeCategory={activeCategory} onCategoryChange={onCategoryChange} onAddToCart={onAddToCart} onViewDetail={onViewDetail} /></W>
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
      return <W key={i}><SocialProof style={section.style} headline={section.headline} subtext={section.subtext} reviews={testimonials} /></W>
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
  const manifest = applyMerchantOverrides(store.manifest ?? deriveManifest(store), store)
  const testimonials = (store.canonical as Record<string, unknown> | undefined)?.testimonials as
    | Array<{ text: string; author: string }>
    | undefined
  const displayName = resolveDisplayName(store)
  const industry = store.storeDNA?.industry
  const { palette, typography } = resolveStoreTheme(store, themeKey)

  const products: StoreProduct[] = (store.products ?? []).map((p) => ({
    id: p.id ?? '', name: p.name ?? '', description: p.description,
    price: p.price, currency: p.currency ?? 'GHS', category: p.category,
    images: p.images as Array<{ url: string; isPrimary?: boolean }>,
    variants: p.variants as Array<{ name: string; value: string }>,
  }))

  const heroImageUrlCandidate = store.canonical?.heroImageUrl as string | undefined
  const heroSection = resolveHeroSection(store, manifest)
  const canUseProductHeroImages = heroSection.type === 'hero-split' || heroSection.type === 'hero-editorial'
  const heroImageUrlsCandidate = heroImageUrlCandidate
    ? [heroImageUrlCandidate]
    : canUseProductHeroImages
      ? products.flatMap((product) => product.images?.map((image) => image.url).filter(Boolean) ?? []).slice(0, 5) as string[]
      : []
  const storyImageUrl = store.canonical?.storyImageUrl as string | undefined
  const bodySections = manifest.sections.filter((section) => !isHeroSection(section))
  const showDebugBadge = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1'

  const features   = store.canonical?.storeFeatures ?? []
  const productCategories = [...new Set((products.map((p) => p.category).filter(Boolean) as string[]))]
  const categories = [...new Set([...(store.canonical?.productCategories ?? []), ...productCategories])]
  const currency   = products[0]?.currency ?? 'GHS'
  const CART_KEY   = `seltra:cart:${storeSlug}`

 const [cart, setCart] = useState<CartItem[]>([])

  // Rehydrate cart from localStorage after mount only (avoids SSR mismatch)
  useEffect(() => {
    try {
      const s = window.localStorage.getItem(CART_KEY)
      if (s) {
        const parsed = JSON.parse(s) as Array<Partial<CartItem> & { product: StoreProduct; quantity: number }>
        setCart(parsed.map((item) => ({
          key: item.key ?? cartLineKey(item.product, item.selectedVariants),
          product: item.product,
          quantity: item.quantity,
          selectedVariants: item.selectedVariants,
        })))
      }
    } catch {}
  }, [CART_KEY])
  const [cartOpen, setCartOpen]           = useState(false)
  const [detailProduct, setDetailProduct] = useState<StoreProduct | null>(null)
  const [mounted, setMounted]             = useState(false)
  const [heroRenderMode, setHeroRenderMode] = useState<'ai' | 'fallback' | 'unknown'>('unknown')
  const [navRenderMode, setNavRenderMode] = useState<'ai' | 'fallback' | 'unknown'>('unknown')
  // Mobile nav drawer state now lives here, in the parent, so it works
  // consistently whether the rendered nav is the AI-generated StorefrontNav
  // (via MicroComponentRenderer) or the DefaultNav fallback.
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    try { window.localStorage.setItem(CART_KEY, JSON.stringify(cart)) } catch {}
  }, [cart, CART_KEY])

  const addToCart = useCallback((product: StoreProduct, selectedVariants?: SelectedVariants) => {
    if (hasVariantChoices(product) && !selectedVariants) {
      setDetailProduct(product)
      toast.message('Select options to add to cart', { duration: 1600 })
      return
    }
    const key = cartLineKey(product, selectedVariants)
    setCart((prev) => {
      const ex = prev.find((i) => i.key === key)
      if (ex) return prev.map((i) => i.key === key ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { key, product, quantity: 1, selectedVariants }]
    })
    toast.success(`${product.name} added`, { duration: 1400 })
    setCartOpen(true)
  }, [])

  const updateQty = useCallback((key: string, delta: number) => {
    setCart((prev) => prev.map((i) => i.key === key ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter((i) => i.quantity > 0))
  }, [])

  // Smooth scroll to a section by its data-section attribute
  const scrollToSection = useCallback((sectionType: string) => {
    const el = document.querySelector(`[data-section="${sectionType}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)
  const fonts     = [...new Set([typography.headingFont, typography.bodyFont])]
  const fontParam = fonts.map((f) => `family=${f.replace(/ /g, '+')}:wght@300;400;500;600;700;800;900`).join('&')
  const [activeCategory, setActiveCategory] = useState('All')

  const sectionProps = {
    products, features, categories,
    activeCategory,
    onCategoryChange: setActiveCategory,
    onAddToCart: addToCart,
    storeName: displayName,
    onViewDetail: (p: StoreProduct) => setDetailProduct(p),
    industry,
    storyImageUrl,
    testimonials,
  }

  const handleCategoryClick = useCallback((category: string) => {
    setMobileMenuOpen(false)
    setActiveCategory(category)
    scrollToSection('product-grid')
  }, [scrollToSection])

  const heroFallback = (
  <HeroSection
    section={heroSection}
    products={products}
    features={features}
    storeName={displayName}
    heroImageUrl={heroImageUrlCandidate}
    heroImageUrls={heroImageUrlsCandidate}
    onShopNow={() => scrollToSection('product-grid')}
  />
)
  const heroProps = {
    store: {
      id: store.id,
      name: displayName,
      displayName,
      businessType: humanizedEyebrow(store),
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
      businessType={humanizedEyebrow(store)}
      categories={categories}
      cartCount={cartCount}
      onOpenCart={() => setCartOpen(true)}
      onCategoryClick={(cat) => { setActiveCategory(cat); scrollToSection('product-grid') }}
      onLogoClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      mounted={mounted}
      menuOpen={mobileMenuOpen}
      onToggleMenu={() => setMobileMenuOpen((v) => !v)}
    />
  )
  const navProps = {
    displayName,
    businessType: humanizedEyebrow(store),
    categories,
    cartCount,
    CartIcon: ShoppingBag,
    onOpenCart: () => setCartOpen(true),
    onCategoryClick: handleCategoryClick,
    onLogoClick: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
    onToggleMenu: () => setMobileMenuOpen((v) => !v),
    menuOpen: mobileMenuOpen,
  }

  return (
    <div className={`seltra-storefront relative w-full overflow-x-hidden ${minHeightClass}`}>
      <StyleInjector fontParam={fontParam} themeVars={buildThemeVars(palette, typography, themeKey)} />
      {showDebugBadge && (
        <div className="pointer-events-none fixed right-4 top-16 z-50 rounded-full border border-[rgba(0,0,0,0.08)] bg-white/90 px-3 py-1 text-[0.7rem] font-medium text-slate-700 shadow-lg shadow-slate-200/70">
              Hero: {heroRenderMode === 'ai' ? 'AI' : 'Fallback'}
          {' · '}
          Nav: {navRenderMode === 'ai' ? 'AI' : 'Fallback'}
        </div>
      )}

      {/* Nav shell — owns the mobile drawer so it renders identically
         regardless of whether the AI-generated StorefrontNav or the
         DefaultNav fallback is what actually rendered above it. */}
      <div className="sticky top-0 z-30">
        <MicroComponentRenderer
          source={store.navSource}
          componentName="StorefrontNav"
          props={navProps}
          fallback={navFallback}
          onStatusChange={(status) => setNavRenderMode(status)}
        />
        <AnimatePresence>
          {mobileMenuOpen && categories.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden border-b md:hidden"
              style={{ borderColor: 'var(--store-border)', background: 'var(--store-bg)' }}
            >
                      <div className="flex flex-col gap-0.5 p-2">
                {['All', ...categories].slice(0, 8).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => handleCategoryClick(cat)}
                    className="rounded-lg px-3 py-2.5 text-left text-sm font-medium"
                    style={{ color: 'var(--store-text)' }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div data-section="hero">
        <MicroComponentRenderer
          source={store.heroSource}
          componentName="StorefrontHero"
          props={{
            ...heroProps,
            heroImageUrl: heroImageUrlCandidate,
          }}
          requiresHeroImage={Boolean(store.canonical?.heroSpec?.imageTreatment) && store.canonical?.heroSpec?.imageTreatment !== 'none'}
          fallback={heroFallback}
          onStatusChange={(status) => setHeroRenderMode(status)}
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
      <CartDrawer
        open={cartOpen}
        items={cart}
        currency={currency}
        storeSlug={storeSlug}
        storeId={store.id}
        onClose={() => setCartOpen(false)}
        onUpdateQty={updateQty}
        fulfillmentMode={store.fulfillmentMode}
        contactPhone={store.contactPhone}
        pickupAddress={store.pickupAddress}
        pickupInstructions={store.pickupInstructions}
        deliveryDays={store.deliveryDays}
        deliveryEstimate={store.deliveryEstimate}
        deliveryFeeNote={store.deliveryFeeNote}
        deliveryTiers={store.deliveryTiers}
      />
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
  menuOpen: boolean
  onToggleMenu: () => void
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
  menuOpen,
  onToggleMenu,
}: DefaultNavProps) {
  // Note: this component no longer owns the mobile drawer or its own
  // open/closed state — that's now controlled by the parent
  // (StorefrontCanvas) via `menuOpen` / `onToggleMenu`, so the drawer
  // renders consistently regardless of which nav ends up on screen.
  return (
    <nav
      className="flex items-center justify-between gap-3 border-b px-4 py-3 backdrop-blur-xl sm:px-5"
      style={{ background: `color-mix(in srgb, var(--store-bg) 92%, transparent)`, borderColor: 'var(--store-border)' }}
    >
      <div className="flex min-w-0 items-center gap-2">
        {categories.length > 0 && (
          <button
            onClick={onToggleMenu}
            className="seltra-hamburger flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border"
            style={{ borderColor: 'var(--store-border)', color: 'var(--store-text)' }}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        )}

        <button onClick={onLogoClick} className="flex min-w-0 items-center gap-2.5 border-0 bg-transparent p-0 text-left">
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
            {businessType && <span className="store-eyebrow mt-0.5 hidden truncate sm:block">{businessType}</span>}
          </span>
        </button>
      </div>

      {categories.length > 0 && (
        <div className="seltra-desktop-cats items-center gap-5">
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

      <motion.button
        onClick={onOpenCart}
        whileTap={{ scale: 0.92 }}
        className="relative flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors"
        style={{ borderColor: 'var(--store-border)', color: 'var(--store-text)' }}
        aria-label="Open cart"
      >
        <ShoppingBag className="h-3.5 w-3.5" style={{ color: 'var(--store-accent)' }} />
        <span className="hidden sm:inline">Cart</span>
        {mounted && (
          <AnimatePresence mode="wait">
            {cartCount > 0 && (
              <motion.span
                key={cartCount}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                className="flex h-4 w-4 items-center justify-center rounded-full text-[0.6rem] font-extrabold"
                style={{ background: 'var(--store-accent)', color: 'var(--store-accent-text)' }}
              >
                {cartCount}
              </motion.span>
            )}
          </AnimatePresence>
        )}
      </motion.button>
    </nav>
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
  requiresHeroImage,
  fallback,
  onStatusChange,
}: {
  source?: string | null
  componentName: 'StorefrontHero' | 'StorefrontNav'
  props: Record<string, unknown>
  requiresHeroImage?: boolean
  fallback: React.ReactNode
  onStatusChange?: (status: 'ai' | 'fallback') => void
}) {
  const Component = useMemo(() => {
    if (!source) return null
    // Generated hero code is untrusted and older persisted sources may contain
    // list-rendering patterns that compile successfully but trigger React key warnings.
    const usesListRendering = componentName === 'StorefrontHero' && (
      /\b(?:map|flatMap)\s*\(/.test(source) ||
      /Array\.from\s*\(/.test(source) ||
      /React\.Children\.toArray/.test(source)
    )

    if (usesListRendering) {
      console.warn('[StorefrontCanvas] Rejecting hero source with list rendering; using keyed fallback')
      return null
    }

    const ignoresHeroImage = componentName === 'StorefrontHero' &&
      requiresHeroImage &&
      !/(?:props\.)?heroImageUrl\b/.test(source)
    if (ignoresHeroImage) {
      console.warn('[StorefrontCanvas] Rejecting hero source that ignores heroImageUrl prop; using keyed fallback')
      return null
    }

    try {
      const factory = new Function('React', `${source}; return typeof ${componentName} === "function" ? ${componentName} : null;`)
      return factory(React) as React.ComponentType<Record<string, unknown>> | null
    } catch (error) {
      console.warn(`[StorefrontCanvas] Could not construct ${componentName}:`, error)
      return null
    }
  }, [source, componentName, requiresHeroImage])

  useEffect(() => {
    if (!onStatusChange) return
    if (!source) {
      onStatusChange('fallback')
      if (process.env.NODE_ENV !== 'production') console.info(`[Storefront] ${componentName} status=fallback (no source)`)
      return
    }
    if (Component) {
      onStatusChange('ai')
      if (process.env.NODE_ENV !== 'production') console.info(`[Storefront] ${componentName} status=ai`)
      return
    }
    onStatusChange('fallback')
    if (process.env.NODE_ENV !== 'production') console.warn(`[Storefront] ${componentName} status=fallback (compile failed)`)
  }, [source, Component, onStatusChange, componentName])

  // Minimal, guaranteed-safe fallback — this must never itself throw.
  // We can't reuse `fallback` here because in the hero case `fallback` IS
  // the thing that can throw (it renders next/image), so wrapping it
  // around itself would just crash again on retry.
  const safeFallback = (
    <div className="flex min-h-[240px] items-center justify-center px-6 py-10 text-sm text-muted-foreground">
      This section couldn&apos;t load.
    </div>
  )

  return (
    <MicroErrorBoundary fallback={safeFallback}>
      {Component ? <Component {...props} /> : fallback}
    </MicroErrorBoundary>
  )
}

function isHeroSection(section: ManifestSection) {
  return section.type === 'hero-centered' || section.type === 'hero-split' || section.type === 'hero-editorial' || section.type === 'hero-fullbleed' || section.type === 'hero-minimal'
}
