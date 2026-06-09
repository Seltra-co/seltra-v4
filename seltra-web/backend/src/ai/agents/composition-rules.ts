//seltra-web/backend/src/ai/agents/composition-rules.ts

export type ThemeKey =
  | 'luxury'
  | 'bold-dark'
  | 'minimal-light'
  | 'editorial'
  | 'warm-earth'
  | 'cool-modern'
  | 'vibrant'

export type LayoutKey =
  | 'editorial'
  | 'conversion'
  | 'storytelling'
  | 'catalog'
  | 'showcase'

export interface CompositionRule {
  theme: ThemeKey
  layout: LayoutKey
  sectionVariantOverrides?: Record<string, string>
  includeSections?: string[]
}

// ── Industry icon sets (SVG path data, 16×16 viewBox) ─────────────────────────
// Each industry gets 4 icons matched to its trust signals.
// These replace the generic checkmark in the trust bar.
export interface IndustryIcons {
  items: Array<{ path: string; label: string }>
}

export const INDUSTRY_ICONS: Record<string, IndustryIcons> = {
  beauty: {
    items: [
      { path: 'M8 2C8 2 5 5 5 8.5C5 10.43 6.34 12 8 12C9.66 12 11 10.43 11 8.5C11 5 8 2 8 2Z M6 9C6 9 6.5 10.5 8 10.5C9.5 10.5 10 9 10 9', label: 'Pure ingredients' },
      { path: 'M12 2L13.5 6.5L8 5L2.5 6.5L4 2M8 5V14M5 8H11', label: 'Cruelty free' },
      { path: 'M3 8C3 5.24 5.24 3 8 3C10.76 3 13 5.24 13 8C13 10.76 10.76 13 8 13C5.24 13 3 10.76 3 8Z M8 5V8L10 10', label: 'Dermatologist tested' },
      { path: 'M4 4L6 2H10L12 4V10L10 12H6L4 10V4Z M6 6H10M6 8H10M6 10H8', label: 'No harsh chemicals' },
    ],
  },
  skincare: {
    items: [
      { path: 'M8 2C8 2 5 5 5 8.5C5 10.43 6.34 12 8 12C9.66 12 11 10.43 11 8.5C11 5 8 2 8 2Z', label: 'Natural extracts' },
      { path: 'M3 8C3 5.24 5.24 3 8 3C10.76 3 13 5.24 13 8C13 10.76 10.76 13 8 13C5.24 13 3 10.76 3 8Z M8 5V8L10 10', label: 'Clinically tested' },
      { path: 'M2 12L5 9M8 3L13 8L8 13L3 8L8 3Z', label: 'Fragrance free' },
      { path: 'M4 4L6 2H10L12 4V10L10 12H6L4 10V4Z', label: 'Vegan formula' },
    ],
  },
  food: {
    items: [
      { path: 'M8 2C5.24 2 3 4.24 3 7C3 9.76 5.24 12 8 12C10.76 12 13 9.76 13 7C13 4.24 10.76 2 8 2Z M8 4V7L10 9', label: 'Fresh daily' },
      { path: 'M3 3H13V13H3V3Z M5 7H11M7 5V11', label: 'No preservatives' },
      { path: 'M8 2L9.5 6H14L10.5 8.5L12 13L8 10.5L4 13L5.5 8.5L2 6H6.5L8 2Z', label: 'Local sourcing' },
      { path: 'M4 12V8C4 5.24 5.79 3 8 3C10.21 3 12 5.24 12 8V12M6 12H10', label: 'Same-day delivery' },
    ],
  },
  restaurant: {
    items: [
      { path: 'M8 2L9.5 6H14L10.5 8.5L12 13L8 10.5L4 13L5.5 8.5L2 6H6.5L8 2Z', label: 'Freshly made' },
      { path: 'M4 12V8C4 5.24 5.79 3 8 3C10.21 3 12 5.24 12 8V12M6 12H10', label: 'Fast delivery' },
      { path: 'M3 3H13V13H3V3Z M5 7H11M7 5V11', label: 'No additives' },
      { path: 'M8 2C5.24 2 3 4.24 3 7C3 9.76 5.24 12 8 12C10.76 12 13 9.76 13 7C13 4.24 10.76 2 8 2Z', label: 'Local ingredients' },
    ],
  },
  streetwear: {
    items: [
      { path: 'M3 8L6 5L8 7L10 3L13 8L10 11L8 9L6 11L3 8Z', label: 'Limited drops' },
      { path: 'M4 4H12V12H4V4Z M4 8H12M8 4V12', label: 'Ships in 24h' },
      { path: 'M2 8L5 5L8 8L11 5L14 8L11 11L8 8L5 11L2 8Z', label: 'Authentic gear' },
      { path: 'M3 3H13L11 8H5L3 3Z M5 8V13H11V8', label: 'Secure checkout' },
    ],
  },
  fashion: {
    items: [
      { path: 'M8 2C5.24 2 3 4.24 3 7C3 9.76 5.24 12 8 12C10.76 12 13 9.76 13 7C13 4.24 10.76 2 8 2Z M8 4V7L10 9', label: 'Ethically made' },
      { path: 'M3 8L6 5L8 7L10 3L13 8L10 11L8 9L6 11L3 8Z', label: 'Premium materials' },
      { path: 'M4 4H12V12H4V4Z M4 8H12M8 4V12', label: 'Easy returns' },
      { path: 'M2 8L5 5L8 8L11 5L14 8L11 11L8 8L5 11L2 8Z', label: 'Free shipping' },
    ],
  },
  jewelry: {
    items: [
      { path: 'M8 2L9.5 6H14L10.5 8.5L12 13L8 10.5L4 13L5.5 8.5L2 6H6.5L8 2Z', label: 'Certified gold' },
      { path: 'M3 8C3 5.24 5.24 3 8 3C10.76 3 13 5.24 13 8C13 10.76 10.76 13 8 13C5.24 13 3 10.76 3 8Z', label: 'Hallmarked' },
      { path: 'M4 4L6 2H10L12 4V10L10 12H6L4 10V4Z', label: 'Lifetime warranty' },
      { path: 'M2 12L5 9M14 4L11 7M5 4L8 7M11 9L14 12', label: 'Handcrafted' },
    ],
  },
  electronics: {
    items: [
      { path: 'M4 4H12V12H4V4Z M7 4V2M9 4V2M7 12V14M9 12V14M4 7H2M4 9H2M12 7H14M12 9H14', label: '1-year warranty' },
      { path: 'M3 8L6 5L8 7L10 3L13 8L10 11L8 9L6 11L3 8Z', label: 'Genuine parts' },
      { path: 'M8 2C5.24 2 3 4.24 3 7C3 9.76 5.24 12 8 12C10.76 12 13 9.76 13 7C13 4.24 10.76 2 8 2Z M8 5V8L10 10', label: 'Fast shipping' },
      { path: 'M2 4L8 2L14 4V9C14 12 8 15 8 15C8 15 2 12 2 9V4Z', label: 'Secure checkout' },
    ],
  },
  wellness: {
    items: [
      { path: 'M8 2C8 2 5 5 5 8.5C5 10.43 6.34 12 8 12C9.66 12 11 10.43 11 8.5C11 5 8 2 8 2Z', label: 'Natural formulas' },
      { path: 'M3 8C3 5.24 5.24 3 8 3C10.76 3 13 5.24 13 8C13 10.76 10.76 13 8 13C5.24 13 3 10.76 3 8Z', label: 'Lab certified' },
      { path: 'M2 8L5 5L8 8L11 5L14 8L11 11L8 8L5 11L2 8Z', label: 'No GMOs' },
      { path: 'M4 4L6 2H10L12 4V10L10 12H6L4 10V4Z', label: 'Ethically sourced' },
    ],
  },
  artisan: {
    items: [
      { path: 'M8 2L9.5 6H14L10.5 8.5L12 13L8 10.5L4 13L5.5 8.5L2 6H6.5L8 2Z', label: 'Handcrafted' },
      { path: 'M3 8C3 5.24 5.24 3 8 3C10.76 3 13 5.24 13 8C13 10.76 10.76 13 8 13', label: 'Small batch' },
      { path: 'M8 2C8 2 5 5 5 8.5C5 10.43 6.34 12 8 12C9.66 12 11 10.43 11 8.5C11 5 8 2 8 2Z', label: 'Natural materials' },
      { path: 'M4 4H12V12H4V4Z M4 8H12M8 4V12', label: 'Made to order' },
    ],
  },
  general: {
    items: [
      { path: 'M2 8l4 4 8-8', label: 'Secure checkout' },
      { path: 'M8 2L14 8L8 14M14 8H2', label: 'Fast delivery' },
      { path: 'M2 8l4 4 8-8', label: 'Easy returns' },
      { path: 'M2 8l4 4 8-8', label: 'Local support' },
    ],
  },
}

export const COMPOSITION_RULES: Record<string, CompositionRule> = {
  beauty: {
    theme: 'luxury',
    layout: 'editorial',
    sectionVariantOverrides: { hero: 'editorial', 'social-proof': 'cards' },
    includeSections: ['before-after', 'ingredients-list', 'brand-story'],
  },
  skincare: {
    theme: 'luxury',
    layout: 'storytelling',
    includeSections: ['before-after', 'ingredients-list', 'founder-story'],
  },
  jewelry: {
    theme: 'luxury',
    layout: 'editorial',
    sectionVariantOverrides: { hero: 'editorial' },
    includeSections: ['lookbook-grid', 'brand-story'],
  },
  candles: {
    theme: 'warm-earth',
    layout: 'storytelling',
    includeSections: ['founder-story', 'ingredients-list'],
  },
  wellness: {
    theme: 'editorial',
    layout: 'storytelling',
    includeSections: ['ingredients-list', 'before-after', 'faq'],
  },
  food: {
    theme: 'warm-earth',
    layout: 'conversion',
    sectionVariantOverrides: { hero: 'centered' },
    includeSections: ['ingredients-list', 'trust-bar', 'faq'],
  },
  restaurant: {
    theme: 'warm-earth',
    layout: 'catalog',
    includeSections: ['founder-story', 'faq'],
  },
  streetwear: {
    theme: 'bold-dark',
    layout: 'showcase',
    includeSections: ['featured-drop', 'countdown-banner', 'lookbook-grid'],
  },
  fashion: {
    theme: 'editorial',
    layout: 'editorial',
    includeSections: ['lookbook-grid', 'brand-story', 'size-guide'],
  },
  apparel: {
    theme: 'minimal-light',
    layout: 'catalog',
    includeSections: ['lookbook-grid'],
  },
  electronics: {
    theme: 'cool-modern',
    layout: 'catalog',
    includeSections: ['comparison-table', 'faq', 'trust-bar'],
  },
  tech: {
    theme: 'cool-modern',
    layout: 'catalog',
    includeSections: ['comparison-table', 'faq'],
  },
  artisan: {
    theme: 'warm-earth',
    layout: 'storytelling',
    includeSections: ['founder-story', 'ingredients-list'],
  },
  general: {
    theme: 'minimal-light',
    layout: 'conversion',
    includeSections: ['trust-bar', 'faq'],
  },
}

export function detectIndustry(corpus: string): string {
  const lower = corpus.toLowerCase()
  const keywords: [string, string][] = [
    ['beauty', 'beauty|makeup|cosmetic|lipstick|foundation|blush|eyeshadow'],
    ['skincare', 'skincare|skin care|serum|moisturizer|lotion|toner|retinol|spf|sunscreen'],
    ['jewelry', 'jewelry|jewellery|necklace|bracelet|ring|earring|gold|silver|diamond'],
    ['candles', 'candle|wax|fragrance|scent|wick|diffuser'],
    ['wellness', 'wellness|supplement|vitamin|herbal|yoga|meditation|mindfulness|detox'],
    ['food', 'food|bakery|pastry|snack|chocolate|coffee|tea|grocery|meal|cuisine'],
    ['restaurant', 'restaurant|cafe|catering|eatery|dining|takeout|takeaway'],
    ['streetwear', 'streetwear|hype|drip|sneaker|hypebeast|limited|drop|hoodie|urban'],
    ['fashion', 'fashion|boutique|apparel|clothing|dress|skirt|blouse|collection'],
    ['apparel', 'shirt|trouser|jacket|wear|outfit'],
    ['electronics', 'electronics|gadget|device|phone|laptop|tablet|charger|cable'],
    ['tech', 'tech|software|hardware|accessory|smart'],
    ['artisan', 'handmade|handcrafted|artisan|craft|bespoke|custom'],
  ]

  for (const [industry, pattern] of keywords) {
    if (new RegExp(pattern).test(lower)) return industry
  }
  return 'general'
}

export function resolveComposition(industry: string): CompositionRule {
  const key = Object.keys(COMPOSITION_RULES).find((k) => industry.toLowerCase().includes(k))
  return COMPOSITION_RULES[key ?? 'general']
}

export function resolveIcons(industry: string): IndustryIcons {
  const key = Object.keys(INDUSTRY_ICONS).find((k) => industry.toLowerCase().includes(k))
  return INDUSTRY_ICONS[key ?? 'general']
}