import * as crypto from 'crypto'
import { prisma } from '../../db'
import { uploadImageBuffer } from '../../store/cloudinary.service'
import {
  CF_API_BASE,
  fetchWithTimeout,
  getModelState,
  isModelAvailable,
  recordError,
  recordSuccess,
} from '../../providers/cloudflare'

const IMAGE_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30
const IMAGE_MODEL_TIMEOUT_MS: Record<string, number> = {
  '@cf/black-forest-labs/flux-2-dev': 90_000,
  '@cf/black-forest-labs/flux-2-klein-9b': 70_000,
  '@cf/black-forest-labs/flux-2-klein-4b': 60_000,
  '@cf/black-forest-labs/flux-1-schnell': 45_000,
}

async function getCachedImageUrl(prompt: string, model: string): Promise<string | null> {
  const promptHash = crypto.createHash('sha256').update(`${prompt}${model}`).digest('hex')
  const cached = await prisma.generatedImageCache.findUnique({ where: { promptHash } })
  if (!cached) return null
  const expired = Date.now() - new Date(cached.createdAt).getTime() > IMAGE_CACHE_TTL_MS
  return expired ? null : cached.url
}

async function saveCachedImageUrl(prompt: string, model: string, url: string) {
  const promptHash = crypto.createHash('sha256').update(`${prompt}${model}`).digest('hex')
  await prisma.generatedImageCache.upsert({
    where: { promptHash },
    update: { prompt, model, url },
    create: { promptHash, prompt, model, url },
  })
}

function getPublicId(prompt: string, model: string): string {
  const promptHash = crypto.createHash('sha256').update(`${prompt}${model}`).digest('hex').slice(0, 16)
  const shortModel = model.split('/').pop()?.replace(/[^a-zA-Z0-9_-]/g, '_') ?? 'image'
  return `seltra/generated/${shortModel}/${promptHash}`
}

function isImageContentType(contentType: string | null) {
  return Boolean(contentType && contentType.toLowerCase().startsWith('image/'))
}

async function generateImageWithModel(prompt: string, model: string): Promise<string | null> {
  const cached = await getCachedImageUrl(prompt, model)
  if (cached) return cached

  const accountId = process.env.CF_ACCOUNT_ID
  const apiToken = process.env.CF_AI_API_TOKEN
  if (!accountId || !apiToken) return null

  const state = getModelState(model)
  if (!isModelAvailable(model)) {
    const waitSec = Math.ceil((state.cooldownUntil - Date.now()) / 1000)
    console.warn(`[CF Image] ${model.split('/').pop()} in cooldown for ${waitSec}s`)
    return null
  }

  const url = `${CF_API_BASE}/${accountId}/ai/run/${model}`
  const timeoutMs = IMAGE_MODEL_TIMEOUT_MS[model] ?? 60_000

  let res: Response
  try {
    res = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify({
          prompt,
          image_size: 'square_hd',
          num_images: 1,
        }),
      },
      timeoutMs,
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    recordError(model, 15_000)
    console.warn(`[CF Image] ${model.split('/').pop()} fetch failed:`, message)
    return null
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => `HTTP ${res.status}`)
    recordError(model, res.status === 429 ? 60_000 : 15_000)
    console.warn(`[CF Image] ${model.split('/').pop()} request failed:`, errText.slice(0, 160))
    return null
  }

  try {
    const contentType = res.headers.get('content-type') ?? ''
    let base64 = ''
    let mimeType = 'image/png'

    if (isImageContentType(contentType)) {
      mimeType = contentType.split(';')[0] || 'image/png'
      const buffer = Buffer.from(await res.arrayBuffer())
      base64 = buffer.toString('base64')
    } else {
      const data = await res.json().catch(() => null)
      const payload = data?.result ?? data
      const imageCandidate =
        payload?.image ??
        payload?.images?.[0]?.image ??
        payload?.images?.[0]?.b64_json ??
        payload?.image_base64 ??
        null

      if (typeof imageCandidate !== 'string' || imageCandidate.length === 0) {
        recordError(model, 10_000)
        console.warn(`[CF Image] ${model.split('/').pop()} returned no image bytes`)
        return null
      }

      base64 = imageCandidate
      mimeType = payload?.mimeType ?? 'image/png'
    }

    if (!base64) {
      recordError(model, 10_000)
      return null
    }

    const upload = await uploadImageBuffer(base64, mimeType, getPublicId(prompt, model))
    await saveCachedImageUrl(prompt, model, upload.secure_url)
    recordSuccess(model)
    return upload.secure_url
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    recordError(model, 10_000)
    console.warn(`[CF Image] ${model.split('/').pop()} upload failed:`, message)
    return null
  }
}

async function generateWithFallback(prompt: string, candidates: string[]): Promise<string | null> {
  for (const model of candidates) {
    if (!isModelAvailable(model)) {
      console.warn(`[CF Image] ${model.split('/').pop()} in cooldown, trying next model`)
      continue
    }
    try {
      const result = await generateImageWithModel(prompt, model)
      if (result) return result
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[CF Image] ${model.split('/').pop()} failed:`, message)
    }
  }
  return null
}

export async function generateHeroImage(prompt: string): Promise<string | null> {
  return generateWithFallback(prompt, [
    '@cf/black-forest-labs/flux-2-dev',
    '@cf/black-forest-labs/flux-2-klein-9b',
    '@cf/black-forest-labs/flux-2-klein-4b',
    '@cf/black-forest-labs/flux-1-schnell',
  ])
}

export async function generateProductImage(prompt: string): Promise<string | null> {
  return generateWithFallback(prompt, [
    '@cf/black-forest-labs/flux-2-klein-9b',
    '@cf/black-forest-labs/flux-2-klein-4b',
    '@cf/black-forest-labs/flux-1-schnell',
    '@cf/black-forest-labs/flux-2-dev',
  ])
}

export async function generateDraftImage(prompt: string): Promise<string | null> {
  return generateWithFallback(prompt, [
    '@cf/black-forest-labs/flux-2-klein-4b',
    '@cf/black-forest-labs/flux-1-schnell',
    '@cf/black-forest-labs/flux-2-klein-9b',
    '@cf/black-forest-labs/flux-2-dev',
  ])
}
