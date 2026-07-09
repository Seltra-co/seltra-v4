import { chat } from '../client'
import type { CanonicalStore } from '../../types'
import { detectIndustry, resolveComposition, type LayoutKey } from './composition-rules'

export interface StorePalette {
  bg: string; surface: string; border: string; text: string
  muted: string; accent: string; accentText: string; accentSoft: string
}
export interface StoreTypography { headingFont: string; bodyFont: string }
export interface StoreManifest { sections: ManifestSection[]; palette: StorePalette; typography: StoreTypography }

type ManifestSection =
  | { type: 'announcement-bar'; message: string }
  | { type: 'featured-drop'; badge: string; headline: string; subtext: string; showCountdown?: boolean }
  | { type: 'product-grid'; columns: 2 | 3 | 4; style: string; limit?: number; showCategory?: boolean; sectionLabel?: string }
  | { type: 'product-shelf'; headline: string; subtext?: string; limit?: number }
  | { type: 'brand-story'; headline: string; body: string; stat?: string; statLabel?: string; layout: 'text-left' | 'text-center' }
  | { type: 'category-strip'; headline?: string }
  | { type: 'social-proof'; style: 'marquee' | 'grid' | 'cards'; headline?: string; subtext?: string }
  | { type: 'trust-bar'; items: string[] }
  | { type: 'newsletter'; headline: string; subtext: string; placeholder?: string }
  | { type: 'faq'; headline?: string; items?: Array<{ question: string; answer: string }> }

type ProductSample = Array<{ name: string; category?: string | null; price?: string | number }>

const THEME_PALETTES: Record<string, StorePalette> = {
  luxury: { bg: '#faf9f7', surface: '#ffffff', border: '#e8e4df', text: '#1a1a1a', muted: '#7a7060', accent: '#b8860b', accentText: '#ffffff', accentSoft: '#fdf5e4' },
  'bold-dark': { bg: '#0d0d0d', surface: '#141414', border: '#2a2a2a', text: '#f0f0f0', muted: '#888888', accent: '#ff3c00', accentText: '#ffffff', accentSoft: '#1f1008' },
  'minimal-light': { bg: '#fafafa', surface: '#ffffff', border: '#e5e5e5', text: '#1a1a1a', muted: '#717171', accent: '#2563eb', accentText: '#ffffff', accentSoft: '#eff6ff' },
  editorial: { bg: '#f8f6f3', surface: '#ffffff', border: '#e0d8ce', text: '#1c1815', muted: '#8c7b6b', accent: '#c4622d', accentText: '#ffffff', accentSoft: '#f9ede8' },
  'warm-earth': { bg: '#faf7f2', surface: '#ffffff', border: '#e8dfd0', text: '#2d2419', muted: '#8a7560', accent: '#c4622d', accentText: '#ffffff', accentSoft: '#f5ece6' },
  'cool-modern': { bg: '#f0f4f8', surface: '#ffffff', border: '#dde3ea', text: '#0f1923', muted: '#627282', accent: '#0070f3', accentText: '#ffffff', accentSoft: '#e8f0fe' },
  vibrant: { bg: '#0a0a0a', surface: '#111111', border: '#1f1f1f', text: '#ffffff', muted: '#888888', accent: '#00e676', accentText: '#000000', accentSoft: '#00e67615' },
}

const THEME_TYPOGRAPHY: Record<string, StoreTypography> = {
  luxury: { headingFont: 'Playfair Display', bodyFont: 'DM Sans' },
  'bold-dark': { headingFont: 'Bebas Neue', bodyFont: 'Inter' },
  'minimal-light': { headingFont: 'Syne', bodyFont: 'Inter' },
  editorial: { headingFont: 'Fraunces', bodyFont: 'DM Sans' },
  'warm-earth': { headingFont: 'Fraunces', bodyFont: 'DM Sans' },
  'cool-modern': { headingFont: 'Inter', bodyFont: 'Inter' },
  vibrant: { headingFont: 'Syne', bodyFont: 'Inter' },
}

function displayName(blueprint: CanonicalStore): string {
  const brandName = (blueprint as unknown as { brandName?: string }).brandName
  if (brandName && brandName.trim().split(/\s+/).length <= 4) return brandName.trim()
  const words = (blueprint.businessName || 'Store').trim().split(/\s+/)
  return words.length > 3 ? words.slice(0, 2).join(' ') : words.join(' ')
}

function cleanJSON(raw: string): string {
  let cleaned = raw.trim()
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7)
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3)
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3)
  return cleaned.trim()
}

function repairTruncatedJSON(raw: string): string {
  let s = raw.trim().replace(/,\s*$/, '')
  const quotePositions: number[] = []
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '"' && (i === 0 || s[i - 1] !== '\\')) quotePositions.push(i)
  }
  if (quotePositions.length % 2 !== 0) s += '"'
  s = s.replace(/,\s*"?\s*$/, '')
  const arrays = (s.match(/\[/g) ?? []).length - (s.match(/\]/g) ?? []).length
  const objects = (s.match(/\{/g) ?? []).length - (s.match(/\}/g) ?? []).length
  return s + ']'.repeat(Math.max(0, arrays)) + '}'.repeat(Math.max(0, objects))
}

function faqItems(blueprint: CanonicalStore, name: string) {
  return [
    { question: `How do I order from ${name}?`, answer: 'Browse products, add to cart, and complete checkout securely.' },
    { question: 'How long does delivery take?', answer: 'Most orders arrive within 2-5 business days, with confirmation after checkout.' },
    { question: 'Can I customise my order?', answer: 'Yes. Contact the store before ordering and the team will guide you.' },
  ]
}

function sectionsForLayout(layout: LayoutKey, blueprint: CanonicalStore): ManifestSection[] {
  const name = displayName(blueprint)
  const trust = (blueprint.storeFeatures ?? []).slice(0, 4)
  const trustBar: ManifestSection = { type: 'trust-bar', items: trust.length ? trust : ['Secure checkout', 'Fast delivery', 'Easy returns', 'Local support'] }
  const productGrid: ManifestSection = { type: 'product-grid', columns: 3, style: layout === 'showcase' ? 'dense' : layout === 'editorial' ? 'magazine' : 'uniform', showCategory: true, sectionLabel: `${name} collection`, limit: 9 }
  const story: ManifestSection = { type: 'brand-story', headline: 'Why we exist', body: `${name} was built for ${blueprint.targetAudience ?? 'people who care about quality'}. Every detail is selected to make shopping simple and trustworthy.`, layout: 'text-left' }
  const newsletter: ManifestSection = { type: 'newsletter', headline: 'Stay in the loop', subtext: 'Get updates and exclusive offers.', placeholder: 'Enter your email' }
  const category: ManifestSection = { type: 'category-strip', headline: 'Browse by category' }
  const proof: ManifestSection = { type: 'social-proof', style: layout === 'editorial' ? 'cards' : 'marquee', headline: 'Loved by customers' }
  const shelf: ManifestSection = { type: 'product-shelf', headline: 'Best Sellers', subtext: 'Our most loved products', limit: 6 }
  const announcement: ManifestSection = { type: 'announcement-bar', message: `Shop ${name} with fast delivery and secure checkout.` }
  const featured: ManifestSection = { type: 'featured-drop', badge: 'NEW DROP', headline: 'Just landed.', subtext: 'Fresh picks from the collection.', showCountdown: true }

  switch (layout) {
    case 'editorial': return [trustBar, shelf, story, category, productGrid, proof, newsletter]
    case 'conversion': return [announcement, trustBar, category, productGrid, proof, newsletter]
    case 'storytelling': return [story, shelf, trustBar, proof, productGrid, newsletter]
    case 'showcase': return [announcement, featured, category, productGrid, trustBar]
    case 'catalog':
    default: return [category, trustBar, productGrid, proof, newsletter]
  }
}

export function deriveManifest(blueprint: CanonicalStore): StoreManifest {
  const corpus = [blueprint.businessName, blueprint.businessType ?? '', ...(blueprint.productCategories ?? [])].join(' ')
  const industry = detectIndustry(corpus)
  const composition = resolveComposition(industry)
  const themeKey = composition.theme
  return {
    sections: sectionsForLayout(composition.layout, blueprint),
    palette: THEME_PALETTES[themeKey] ?? THEME_PALETTES['minimal-light'],
    typography: THEME_TYPOGRAPHY[themeKey] ?? THEME_TYPOGRAPHY['minimal-light'],
  }
}

function sanitizeManifest(raw: Partial<StoreManifest>, blueprint: CanonicalStore): StoreManifest {
  const fallback = deriveManifest(blueprint)
  const allowed = new Set(['announcement-bar', 'featured-drop', 'product-grid', 'product-shelf', 'brand-story', 'category-strip', 'social-proof', 'trust-bar', 'newsletter', 'faq'])
  const sections = (Array.isArray(raw.sections) ? raw.sections : [])
    .filter((s): s is ManifestSection => Boolean(s && allowed.has((s as { type?: string }).type ?? '')))
    .slice(0, 8)
  return {
    sections: sections.length ? sections : fallback.sections,
    palette: { ...fallback.palette, ...(raw.palette ?? {}) },
    typography: { ...fallback.typography, ...(raw.typography ?? {}) },
  }
}

export async function generateManifest(
  blueprint: CanonicalStore,
  dna: unknown,
  products: ProductSample,
): Promise<{ manifest: StoreManifest; provider: string; error: string | null }> {
  const fallback = deriveManifest(blueprint)
  const prompt = `Return ONLY strict JSON for a storefront manifest. Do not include hero or nav sections.
Use this exact top-level shape: {"sections":[],"palette":{},"typography":{}}
Allowed section types: trust-bar, category-strip, product-grid, product-shelf, featured-drop, brand-story, social-proof, newsletter, faq, announcement-bar.
Keep output under 500 tokens.
Blueprint: ${JSON.stringify(blueprint)}
DNA: ${JSON.stringify(dna)}
Products: ${JSON.stringify(products.slice(0, 6))}`

  try {
    const result = await chat([{ role: 'user', content: prompt }], { maxTokens: 650 })
    const cleaned = cleanJSON(result.content)
    try {
      return { manifest: sanitizeManifest(JSON.parse(cleaned), blueprint), provider: result.provider, error: null }
    } catch {
      return { manifest: sanitizeManifest(JSON.parse(repairTruncatedJSON(cleaned)), blueprint), provider: `${result.provider}:json-repaired`, error: null }
    }
  } catch (error) {
    return {
      manifest: fallback,
      provider: 'fallback:deriveManifest',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
