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
  // Which optional sections to include
  includeSections?: string[]
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