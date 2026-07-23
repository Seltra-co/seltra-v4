//seltra-web/backend/src/ai/agents/product.agent.ts
import { chat } from '../client'
import type { CanonicalStore, GeneratedProduct } from '../../types'
import { sourceImage } from './image-sourcing.agent'

// ── System prompt ──────────────────────────────────────────────────────────
const PRODUCT_SYSTEM_PROMPT = `You are Seltra's Product Generator AI.
Given a store blueprint, generate a realistic product catalog.

Rules:s
1. Generate exactly 20 products.
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

function cleanJSON(raw: string): string {
  let s = raw.trim()
  if (s.startsWith('```json')) s = s.slice(7)
  else if (s.startsWith('```')) s = s.slice(3)
  if (s.endsWith('```')) s = s.slice(0, -3)
  return s.trim()
}


function fallbackProducts(blueprint: CanonicalStore): GeneratedProduct[] {
  const categories = blueprint.productCategories.length > 0 ? blueprint.productCategories : ['Featured']
  const names = [
    'Starter Set', 'Daily Essential', 'Signature Bundle', 'Premium Kit',
    'Travel Pack', 'Gift Box', 'Limited Drop', 'Refill Pack',
    'Discovery Kit', 'Luxury Edition', 'Mini Collection', 'Value Pack',
    'Seasonal Special', 'Core Essential', 'Pro Bundle', 'Sample Set',
    'Bestseller Box', 'New Arrival', 'Classic Set', 'Exclusive Drop',
  ]

  return names.map((name, index) => {
    const category = categories[index % categories.length]
    return {
      name: `${blueprint.brandName || blueprint.businessName.split(' ').slice(0, 2).join(' ')} ${name}`,
      description: `A customer-ready ${category.toLowerCase()} product for ${blueprint.targetAudience}. Designed as part of the first Seltra-generated catalog.`,
      price: 45 + index * 8,
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

export async function generateProducts(blueprint: CanonicalStore): Promise<{
  success: boolean
  products: GeneratedProduct[]
  provider: string
  imageStats: { total: number; generated: number; failed: number }
  error: string | null
}> {
  if (process.env.SELTRA_LLM_PRODUCTS !== 'true') {
    const { products, imageStats } = await attachProductImages(fallbackProducts(blueprint))
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
          `${PRODUCT_SYSTEM_PROMPT}\n\n` +
          `Store: ${blueprint.businessName}\n` +
          `Type: ${blueprint.businessType}\n` +
          `Target Audience: ${blueprint.targetAudience}\n` +
          `Categories: ${blueprint.productCategories.join(', ')}\n\n` +
          `Generate 20 realistic products for this store.`,
      },
    ], { maxTokens: 700 })
  } catch (error) {
    const { products, imageStats } = await attachProductImages(fallbackProducts(blueprint))
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

  const { products: productsWithImages, imageStats } = await attachProductImages(rawProducts)

  return {
    success: true,
    products: productsWithImages,
    provider: llmResult.provider,
    imageStats,
    error: null,
  }
}
