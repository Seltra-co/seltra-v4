//seltra-web/backend/src/ai/agents/blueprint.agent.ts
import { chat } from '../client'
import type { CanonicalStore } from '../../types'

// Core agent workflow (seltra blueprint agent):
// 1. User provides a prompt describing their business idea.
// 2. The agent uses a carefully crafted system prompt to instruct the AI to generate a
//    detailed store blueprint in JSON format.
// 3. The agent parses the AI's response, attempting JSON repair on truncated output,
//    enforcing non-negotiable requirements, and falling back to deterministic defaults
//    rather than ever returning success: false to the caller.
// 4. The final blueprint is returned to the user, ready to be used for store creation.

const SYSTEM_PROMPT = `You are Seltra's Store Builder AI.
Given a user description of a business, design a comprehensive store blueprint.

Rules:
1. Always set platform to "Seltra". Never suggest Shopify, WooCommerce, or any other platform.
2. Return ONLY valid JSON. No markdown, no explanation, no code blocks.
3. Use Paystack as the default payment gateway for African stores.
4. Fill missing information with smart context-aware defaults.
5. Keep all string values short. productCategories: max 4 items. storeFeatures: max 4 items. recommendations: max 4 items.
6. The JSON must follow this exact structure:

{
  "platform": "Seltra",
  "businessName": "string",
  "businessType": "string",
  "targetAudience": "string",
  "productCategories": ["string"],
  "storeFeatures": ["string"],
  "recommendedTechStack": {
    "paymentGateways": ["string"],
    "shippingIntegration": "string",
    "frontend": "Next.js with TailwindCSS",
    "backend": "Node.js with NestJS",
    "database": "PostgreSQL",
    "analytics": "string"
  },
  "recommendations": ["string"],
  "storeSlug": "url-friendly-lowercase-hyphenated-business-name",
  "estimatedLaunchTime": "15 minutes"
}`

// ── Helpers ───────────────────────────────────────────────────────────────────

function cleanJSON(raw: string): string {
  let cleaned = raw.trim()
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7)
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3)
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3)
  return cleaned.trim()
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Attempts to close truncated JSON by:
 * 1. Stripping a trailing comma
 * 2. Closing any open string that looks like a mid-value cut
 * 3. Closing unclosed arrays then unclosed objects
 *
 * This handles the common case where llama-3.1-8b-instant hits the 500-token
 * output cap mid-string inside an array.
 */
function repairTruncatedJSON(raw: string): string {
  let s = raw.trim()

  // Remove trailing comma (e.g. last array item followed by nothing)
  s = s.replace(/,\s*$/, '')

  // If the string ends inside an open quoted value, close the string.
  // We detect this by checking whether the last quote character is unpaired:
  // count all unescaped quotes — if odd, there's an open string.
  const quotePositions: number[] = []
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '"' && (i === 0 || s[i - 1] !== '\\')) {
      quotePositions.push(i)
    }
  }
  if (quotePositions.length % 2 !== 0) {
    // Odd number of quotes → currently inside an open string. Close it.
    s = s + '"'
  }

  // Remove trailing comma again in case it was just before the cut string
  s = s.replace(/,\s*"?\s*$/, '')

  // Count unclosed brackets and braces
  const unclosedArrays =
    (s.match(/\[/g) ?? []).length - (s.match(/\]/g) ?? []).length
  const unclosedObjects =
    (s.match(/\{/g) ?? []).length - (s.match(/\}/g) ?? []).length

  s += ']'.repeat(Math.max(0, unclosedArrays))
  s += '}'.repeat(Math.max(0, unclosedObjects))

  return s
}

// ── Fallback ──────────────────────────────────────────────────────────────────

function fallbackBlueprint(userPrompt: string): CanonicalStore {
  const firstLine =
    userPrompt
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) || 'My Seltra Store'

  const businessName =
    firstLine
      .replace(/^(build|launch|start|open|create)\s+(a|an|the)?\s*/i, '')
      .replace(/\s+/g, ' ')
      .slice(0, 56)
      .trim() || 'My Seltra Store'

  const storeSlug = generateSlug(businessName) || `seltra-store-${Date.now()}`

  return {
    storeId: `store-${storeSlug}`,
    prompt: userPrompt,
    platform: 'Seltra',
    businessName,
    businessType: 'Online retail',
    targetAudience: 'customers looking for a focused, polished shopping experience',
    productCategories: ['Featured', 'Essentials', 'Bundles'],
    storeFeatures: ['Fast checkout', 'AI merchandising', 'Mobile storefront', 'Local delivery'],
    recommendedTechStack: {
      paymentGateways: ['Paystack'],
      shippingIntegration: 'Local courier',
      frontend: 'Next.js with TailwindCSS',
      backend: 'Node.js with NestJS',
      database: 'PostgreSQL',
      analytics: 'Seltra analytics',
    },
    additionalRecommendations: {
      marketing: ['Launch with email capture and social proof'],
      customerService: ['Add WhatsApp support'],
      logistics: ['Offer same-city delivery where possible'],
      growthStrategy: ['Start with 8 hero products and optimize from order data'],
    },
    storeSlug,
    estimatedLaunchTime: '15 minutes',
  }
}

// ── Enforce non-negotiables on any parsed object ──────────────────────────────

function enforceDefaults(parsed: Record<string, unknown>, userPrompt: string): CanonicalStore {
  parsed.platform = 'Seltra'

  const stack = (parsed.recommendedTechStack ?? {}) as Record<string, unknown>
  stack.frontend = 'Next.js with TailwindCSS'
  stack.backend = 'Node.js with NestJS'
  stack.database = 'PostgreSQL'
  parsed.recommendedTechStack = stack

  parsed.estimatedLaunchTime = parsed.estimatedLaunchTime ?? '15 minutes'

  if (!parsed.storeSlug && parsed.businessName) {
    parsed.storeSlug = generateSlug(parsed.businessName as string)
  }

  // Normalise flat recommendations array → additionalRecommendations shape
  // so the rest of the codebase (which reads additionalRecommendations) still works.
  if (Array.isArray(parsed.recommendations) && !parsed.additionalRecommendations) {
    const recs = parsed.recommendations as string[]
    parsed.additionalRecommendations = {
      marketing: recs.slice(0, 1),
      customerService: recs.slice(1, 2),
      logistics: recs.slice(2, 3),
      growthStrategy: recs.slice(3, 4),
    }
  }

  // Ensure required arrays are always present
  if (!Array.isArray(parsed.productCategories) || parsed.productCategories.length === 0) {
    parsed.productCategories = ['Featured', 'Essentials', 'Bundles']
  }
  if (!Array.isArray(parsed.storeFeatures) || parsed.storeFeatures.length === 0) {
    parsed.storeFeatures = ['Fast checkout', 'Mobile storefront', 'Local delivery']
  }
  if (!parsed.businessName) {
    parsed.businessName = fallbackBlueprint(userPrompt).businessName
  }
  if (!parsed.storeSlug) {
    parsed.storeSlug = generateSlug(parsed.businessName as string)
  }

  return parsed as unknown as CanonicalStore
}

// ── Main export ────────────────────────────────────────────────────────────────

export async function generateBlueprint(userPrompt: string): Promise<{
  success: boolean
  prompt: string
  data: CanonicalStore | null
  provider: string
  error: string | null
}> {
  let result
  try {
    result = await chat(
      [
        {
          role: 'user',
          content: `${SYSTEM_PROMPT}\n\nUser prompt:\n${userPrompt}`,
        },
      ],
      { maxTokens: 500 },
    )
  } catch (error) {
    // Network / provider error — use fallback, still succeed
    console.warn('[Blueprint] Chat call failed, using fallback:', error)
    return {
      success: true,
      prompt: userPrompt,
      data: fallbackBlueprint(userPrompt),
      provider: 'fallback',
      error: error instanceof Error ? error.message : String(error),
    }
  }

  const cleaned = cleanJSON(result.content)

  // ── Attempt 1: parse as-is ────────────────────────────────────────────────
  try {
    const parsed = JSON.parse(cleaned)
    return {
      success: true,
      prompt: userPrompt,
      data: enforceDefaults(parsed, userPrompt),
      provider: result.provider,
      error: null,
    }
  } catch {
    // Fall through to repair attempt
  }

  // ── Attempt 2: repair truncated JSON ──────────────────────────────────────
  try {
    const repaired = repairTruncatedJSON(cleaned)
    const parsed = JSON.parse(repaired)
    console.warn('[Blueprint] JSON repaired successfully after truncation')
    return {
      success: true,
      prompt: userPrompt,
      data: enforceDefaults(parsed, userPrompt),
      provider: result.provider,
      error: null,
    }
  } catch {
    // Fall through to deterministic fallback
  }

  // ── Attempt 3: deterministic fallback — never let this kill store creation ─
  console.warn(
    '[Blueprint] JSON unrecoverable after repair attempt, using deterministic fallback. Raw snippet:',
    cleaned.slice(0, 120),
  )
  return {
    success: true,
    prompt: userPrompt,
    data: fallbackBlueprint(userPrompt),
    provider: result.provider,
    error: null,
  }
}