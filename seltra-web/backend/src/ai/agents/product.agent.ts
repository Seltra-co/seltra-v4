//seltra-web/backend/src/ai/agents/product.agent.ts
import { chat } from '../client'
import type { CanonicalStore, GeneratedProduct } from '../../types'

function productArtDataUrl(productName: string, category: string): string {
  const seed = [...`${productName}:${category}`].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const palettes = [
    ['#06110d', '#16c784', '#d7fff0'],
    ['#111827', '#38bdf8', '#e0f2fe'],
    ['#1f1303', '#f59e0b', '#fff7ed'],
    ['#2a1020', '#f472b6', '#fdf2f8'],
  ]
  const [bg, accent, text] = palettes[seed % palettes.length]
  const initials = productName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('') || 'S'
  const safeName = productName.replace(/[&<>"']/g, '')
  const safeCategory = category.replace(/[&<>"']/g, '')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><rect width="600" height="600" fill="${bg}"/><path d="M0 430C110 370 180 470 300 410C420 350 500 250 600 300V600H0Z" fill="${accent}" opacity=".18"/><circle cx="470" cy="125" r="86" fill="${accent}" opacity=".16"/><rect x="70" y="82" width="460" height="436" rx="36" fill="#ffffff" opacity=".05" stroke="${accent}" stroke-opacity=".35"/><text x="300" y="268" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="92" font-weight="800" fill="${accent}">${initials}</text><text x="300" y="334" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="26" font-weight="700" fill="${text}">${safeName.slice(0, 26)}</text><text x="300" y="374" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="18" fill="${text}" opacity=".68">${safeCategory.slice(0, 30)}</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

//── Unsplash API — optional remote fetch, returns images.unsplash.com URLs (no CORS) ──
async function fetchUnsplashUrl(
  productName: string,
  category: string,
): Promise<string> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY

  const fallback = () => productArtDataUrl(productName, category)

  if (!accessKey || process.env.SELTRA_REMOTE_PRODUCT_IMAGES !== 'true') {
    return fallback()
  }

  try {
    const clean = (s: string) =>
      s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()

    const query = [
      ...clean(productName).split(' ').slice(0, 2),
      clean(category).split(' ')[0],
    ]
      .filter(Boolean)
      .filter((w, i, arr) => arr.indexOf(w) === i)
      .join(' ')

    const res = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=squarish&content_filter=high`,
      {
        headers: {
          Authorization: `Client-ID ${accessKey}`,
          'Accept-Version': 'v1',
        },
      }
    )

    if (!res.ok) {
      console.warn(`[Unsplash] ${res.status} for "${query}" — using fallback`)
      return fallback()
    }

    const data = await res.json()
    //Use the regular size — good quality, not too large
    return data.urls?.regular || data.urls?.small || fallback()
  } catch (err) {
    console.warn('[Unsplash] fetch failed — using fallback:', err)
    return fallback()
  }
}

// ── System prompt ──────────────────────────────────────────────────────────
const PRODUCT_SYSTEM_PROMPT = `You are Seltra's Product Generator AI.
Given a store blueprint, generate a realistic product catalog.

Rules:
1. Generate exactly 8 products.
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
    'Starter Set',
    'Daily Essential',
    'Signature Bundle',
    'Premium Kit',
    'Travel Pack',
    'Gift Box',
    'Limited Drop',
    'Refill Pack',
  ]

  return names.map((name, index) => {
    const category = categories[index % categories.length]
    return {
      name: `${blueprint.businessName} ${name}`,
      description: `A customer-ready ${category.toLowerCase()} product for ${blueprint.targetAudience}. Designed as part of the first Seltra-generated catalog.`,
      price: 45 + index * 12,
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
  console.log(`[ProductAgent] Resolving product images for ${products.length} products...`)

  const imageUrls: string[] = []
  const batchSize = 3

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize)
    const batchUrls = await Promise.all(
      batch.map(p => fetchUnsplashUrl(p.name, p.category))
    )
    imageUrls.push(...batchUrls)
    if (i + batchSize < products.length) {
      await new Promise(r => setTimeout(r, 200))
    }
  }

  const productsWithImages = products.map((product, i) => ({
    ...product,
    price: typeof product.price === 'string' ? parseFloat(product.price) : product.price,
    images: [{ url: imageUrls[i], isPrimary: true }],
  }))

  const generated = productsWithImages.filter(p => p.images[0]?.url).length
  console.log(`[ProductAgent] Done - ${generated}/${products.length} images fetched`)

  return {
    products: productsWithImages,
    imageStats: { total: products.length, generated, failed: products.length - generated },
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
          `Generate 8 realistic products for this store.`,
      },
    ], { maxTokens: 500 })
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
