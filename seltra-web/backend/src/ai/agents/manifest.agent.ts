import { chat } from '../client'
import type { CanonicalStore } from '../../types'
import { detectIndustry, resolveComposition, type LayoutKey } from './composition-rules'
import { runCritic, type ManifestForCritic } from './critic.agent'
import { refineManifest } from './refinement.engine'

export interface StorePalette {
  bg: string; surface: string; border: string; text: string
  muted: string; accent: string; accentText: string; accentSoft: string
}
export interface StoreTypography { headingFont: string; bodyFont: string }
export interface StoreManifest { sections: ManifestSection[]; palette: StorePalette; typography: StoreTypography }

export interface ManifestBuildHooks {
  onCritiqueStart?: () => void
  onCritiqueEnd?: (score: number, fixesApplied: number) => void
}

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

// Palette values kept in sync with frontend/components/storefront/themes/index.ts.
// TODO(P1): consolidate — this is duplicated in dna.agent.ts and StorefrontCanvas's
// local deriveManifest fallback too. Flagging rather than silently drifting further.
const THEME_PALETTES: Record<string, StorePalette> = {
  luxury:          { bg: '#faf8f5', surface: '#ffffff', border: '#eae3d8', text: '#1a1712', muted: '#7d7263', accent: '#b8863f', accentText: '#ffffff', accentSoft: '#f7ecd9' },
  'bold-dark':     { bg: '#0a0a0b', surface: '#151517', border: '#26262a', text: '#f5f5f4', muted: '#9a9a9e', accent: '#ff4d1c', accentText: '#ffffff', accentSoft: '#2a140b' },
  'minimal-light': { bg: '#fbfbfa', surface: '#ffffff', border: '#e7e7e5', text: '#17181a', muted: '#6b6d72', accent: '#3b5bfd', accentText: '#ffffff', accentSoft: '#ecf0ff' },
  editorial:       { bg: '#f9f6f1', surface: '#ffffff', border: '#e6dccb', text: '#211c15', muted: '#8a7b64', accent: '#c8582c', accentText: '#ffffff', accentSoft: '#fbe9de' },
  'warm-earth':    { bg: '#faf6ef', surface: '#ffffff', border: '#ecdfc9', text: '#2c2214', muted: '#8d7554', accent: '#d17a3d', accentText: '#ffffff', accentSoft: '#f7e6d5' },
  'cool-modern':   { bg: '#f2f5fb', surface: '#ffffff', border: '#dde4f2', text: '#0e1526', muted: '#5c6b8a', accent: '#3d6bff', accentText: '#ffffff', accentSoft: '#e6ecff' },
  vibrant:         { bg: '#08080a', surface: '#121214', border: '#232327', text: '#fbfbfb', muted: '#98989e', accent: '#00e68a', accentText: '#00230f', accentSoft: '#0d2b1d' },
}

const THEME_TYPOGRAPHY: Record<string, StoreTypography> = {
  luxury:          { headingFont: 'Playfair Display', bodyFont: 'DM Sans' },
  'bold-dark':     { headingFont: 'Bebas Neue',       bodyFont: 'Inter' },
  'minimal-light': { headingFont: 'Syne',             bodyFont: 'Inter' },
  editorial:       { headingFont: 'Fraunces',         bodyFont: 'DM Sans' },
  'warm-earth':    { headingFont: 'Fraunces',         bodyFont: 'DM Sans' },
  'cool-modern':   { headingFont: 'Inter',            bodyFont: 'Inter' },
  vibrant:         { headingFont: 'Syne',             bodyFont: 'Inter' },
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
  hooks?: ManifestBuildHooks,
): Promise<{ manifest: StoreManifest; provider: string; error: string | null }> {
  const fallback = deriveManifest(blueprint)
  const prompt = `Return ONLY strict JSON for a storefront manifest. Do not include hero or nav sections.
Use this exact top-level shape: {"sections":[],"palette":{},"typography":{}}
Allowed section types: trust-bar, category-strip, product-grid, product-shelf, featured-drop, brand-story, social-proof, newsletter, faq, announcement-bar.
Keep output under 500 tokens.
Blueprint: ${JSON.stringify(blueprint)}
DNA: ${JSON.stringify(dna)}
Products: ${JSON.stringify(products.slice(0, 6))}`

  let manifest: StoreManifest
  let provider: string
  let error: string | null = null

  try {
    const result = await chat([{ role: 'user', content: prompt }], { maxTokens: 650 })
    const cleaned = cleanJSON(result.content)
    try {
      manifest = sanitizeManifest(JSON.parse(cleaned), blueprint)
      provider = result.provider
    } catch {
      try {
        manifest = sanitizeManifest(JSON.parse(repairTruncatedJSON(cleaned)), blueprint)
        provider = `${result.provider}:json-repaired`
      } catch {
        manifest = fallback
        provider = 'fallback:deriveManifest'
      }
    }
  } catch (err) {
    manifest = fallback
    provider = 'fallback:deriveManifest'
    error = err instanceof Error ? err.message : String(err)
  }

  // P0.1 — this is the manifest StorefrontCanvas actually renders, so the
  // critic/refinement loop needs to run here, not in the unused HTML codegen path.
  hooks?.onCritiqueStart?.()
  const { manifest: refined, fixesApplied, finalReport } = await refineManifest(
    manifest as unknown as ManifestForCritic,
    blueprint,
  )
  hooks?.onCritiqueEnd?.(finalReport.score, fixesApplied.length)

  return { manifest: refined as unknown as StoreManifest, provider, error }
}