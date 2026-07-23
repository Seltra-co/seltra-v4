import { chat } from '../client'
import type { CanonicalStore, GeneratedProduct } from '../../types'
import { sourceImage } from './image-sourcing.agent'
import { planLimits } from '../../common/plan-limits'

// ── System prompt — now takes a dynamic count ──────────────────────────────
function buildProductSystemPrompt(count: number): string {
  return `You are Seltra's Product Generator AI.
Given a store blueprint, generate a realistic product catalog.

Rules:
1. Generate exactly ${count} products.
2. Return ONLY a valid JSON array. No markdown, no explanation, no code blocks.
3. Use GHS (Ghanaian Cedi) as the currency.
4. Prices must be realistic for the Ghanaian/African market.
5. Each product must follow this exact structure:

[
  {
    "name": "string",
    "description": "string (2-3 sentences of compelling product copy)",
    "price": number,
    "currency": "GHS",
    "category": "string (must match one of the store's productCategories)",
    "sku": "string (e.g. SKU-001)",
    "tags": ["string", "string"],
    "variants": [
      { "name": "Size", "value": "Small" },
      { "name": "Size", "value": "Medium" },
      { "name": "Size", "value": "Large" }
    ]
  }
]`
}

function cleanJSON(raw: string): string {
  let s = raw.trim()
  if (s.startsWith('```json')) s = s.slice(7)
  else if (s.startsWith('```')) s = s.slice(3)
  if (s.endsWith('```')) s = s.slice(0, -3)
  return s.trim()
}

const BASE_NAMES = [
  'Starter Set', 'Daily Essential', 'Signature Bundle', 'Premium Kit',
  'Travel Pack', 'Gift Box', 'Limited Drop', 'Refill Pack',
  'Discovery Kit', 'Luxury Edition', 'Mini Collection', 'Value Pack',
  'Seasonal Special', 'Core Essential', 'Pro Bundle', 'Sample Set',
  'Bestseller Box', 'New Arrival', 'Classic Set', 'Exclusive Drop',
]

// count now drives how many fallback products get generated — cycles through
// BASE_NAMES with a numeric suffix once count exceeds the name pool so names
// stay unique instead of repeating verbatim.
function fallbackProducts(blueprint: CanonicalStore, count: number): GeneratedProduct[] {
  const categories = blueprint.productCategories.length > 0 ? blueprint.productCategories : ['Featured']
  const brand = blueprint.brandName || blueprint.businessName.split(' ').slice(0, 2).join(' ')

  return Array.from({ length: count }, (_, index) => {
    const category = categories[index % categories.length]
    const cycle = Math.floor(index / BASE_NAMES.length)
    const baseName = BASE_NAMES[index % BASE_NAMES.length]
    const name = cycle > 0 ? `${baseName} ${cycle + 1}` : baseName
    return {
      name: `${brand} ${name}`,
      description: `A customer-ready ${category.toLowerCase()} product for ${blueprint.targetAudience}. Designed as part of the first Seltra-generated catalog.`,
      price: 45 + (index % 20) * 8,
      currency: 'GHS',
      category,
      sku: `SKU-${String(index + 1).padStart(3, '0')}`,
      tags: ['generated', category],
      variants: [
        { name: 'Option', value: 'Standard' },
        { name: 'Option', value: 'Premium' },
      ],
    } as GeneratedProduct
  })
}

async function attachProductImages(products: GeneratedProduct[]) {
  console.log(
    `[ProductAgent] Resolving product images for ${products.length} products...`,
  )

  const imageUrls: string[] = []
  const batchSize = 3

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize)

    const urls = await Promise.all(
      batch.map((product) =>
        sourceImage(
          product.name,
          product.category,
        )
      ),
    )

    imageUrls.push(...urls)

    if (i + batchSize < products.length) {
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
  }

  const productsWithImages = products.map((product, i) => ({
    ...product,
    price:
      typeof product.price === 'string'
        ? parseFloat(product.price)
        : product.price,
    images: [
      {
        url: imageUrls[i],
        isPrimary: true,
      },
    ],
  }))

  const generated = productsWithImages.filter(
    (p) => !!p.images?.[0]?.url,
  ).length

  console.log(
    `[ProductAgent] Done - ${generated}/${products.length} product images`,
  )

  return {
    products: productsWithImages,
    imageStats: {
      total: products.length,
      generated,
      failed: products.length - generated,
    },
  }
}

// maxProducts is now a required-in-spirit param — defaults to the free tier
// limit (via planLimits(undefined)) so existing callers that don't pass it
// (e.g. tenant.service.ts) keep working, but every tier-aware caller should
// pass planLimits(owner?.plan).maxProductsPerStore explicitly.
export async function generateProducts(
  blueprint: CanonicalStore,
  maxProducts: number = planLimits(undefined).maxProductsPerStore,
): Promise<{
  success: boolean
  products: GeneratedProduct[]
  provider: string
  imageStats: { total: number; generated: number; failed: number }
  error: string | null
}> {
  const count = Math.max(1, maxProducts)

  if (process.env.SELTRA_LLM_PRODUCTS !== 'true') {
    const { products, imageStats } = await attachProductImages(fallbackProducts(blueprint, count))
    return {
      success: true,
      products,
      provider: 'deterministic',
      imageStats,
      error: null,
    }
  }

  const FAILED = (provider: string, error: string) => ({
    success: false,
    products: [],
    provider,
    imageStats: { total: 0, generated: 0, failed: 0 },
    error,
  })

  //Generate product catalog
  let llmResult
  try {
    llmResult = await chat([
      {
        role: 'user',
        content:
          `${buildProductSystemPrompt(count)}\n\n` +
          `Store: ${blueprint.businessName}\n` +
          `Type: ${blueprint.businessType}\n` +
          `Target Audience: ${blueprint.targetAudience}\n` +
          `Categories: ${blueprint.productCategories.join(', ')}\n\n` +
          `Generate ${count} realistic products for this store.`,
      },
    ], { maxTokens: Math.min(4000, 200 + count * 60) })
  } catch (error) {
    const { products, imageStats } = await attachProductImages(fallbackProducts(blueprint, count))
    return {
      success: true,
      products,
      provider: 'ollama',
      imageStats,
      error: error instanceof Error ? error.message : null,
    }
  }

  let rawProducts: GeneratedProduct[]
  try {
    rawProducts = JSON.parse(cleanJSON(llmResult.content))
    if (!Array.isArray(rawProducts) || rawProducts.length === 0) {
      return FAILED(llmResult.provider, 'LLM returned empty or non-array product list')
    }
  } catch {
    return FAILED(
      llmResult.provider,
      'Failed to parse product JSON: ' + cleanJSON(llmResult.content).slice(0, 200),
    )
  }

  // Enforce the cap even if the LLM over/under-generates relative to count.
  const capped = rawProducts.slice(0, count)

  const { products: productsWithImages, imageStats } = await attachProductImages(capped)

  return {
    success: true,
    products: productsWithImages,
    provider: llmResult.provider,
    imageStats,
    error: null,
  }
}