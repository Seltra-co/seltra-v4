//seltra-web/backend/src/ai/client.ts

import {
  cfChat,
  cfCodegen,
  isCFAvailable,
  type CFMessage,
  type CFCodegenOptions,
} from '../providers/cloudflare'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

// Standard chat rate limiting
let groqCooldownUntil = 0
let groqTokenWindowStartedAt = Date.now()
let groqEstimatedTokensUsed = 0

// Codegen primary model rate limiting (llama-4-scout)
let codegenPrimaryCooldownUntil = 0
let codegenPrimaryWindowStartedAt = Date.now()
let codegenPrimaryTokensUsed = 0

// Codegen fallback model rate limiting (llama-3.3-70b-versatile)
let codegenFallbackCooldownUntil = 0
let codegenFallbackWindowStartedAt = Date.now()
let codegenFallbackTokensUsed = 0

const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant'
const GROQ_CODEGEN_MODEL = process.env.GROQ_CODEGEN_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct'
const GROQ_CODEGEN_FALLBACK_MODEL = process.env.GROQ_CODEGEN_FALLBACK_MODEL || 'llama-3.3-70b-versatile'

const GROQ_TPM_BUDGET = Number(process.env.GROQ_TPM_BUDGET || 4800)
const GROQ_CODEGEN_TPM_BUDGET = Number(process.env.GROQ_CODEGEN_TPM_BUDGET || 28_000)
// Fallback model is llama-3.3-70b-versatile which has 12K TPM
const GROQ_CODEGEN_FALLBACK_TPM_BUDGET = Number(process.env.GROQ_CODEGEN_FALLBACK_TPM_BUDGET || 11_000)
const GROQ_DEFAULT_MAX_TOKENS = Number(process.env.GROQ_MAX_TOKENS || 500)

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AIResponse {
  content: string
  provider: 'cloudflare' | 'groq'
}

export interface ChatOptions {
  maxTokens?: number
  preferLocal?: boolean
  temperature?: number
}

function estimateTokens(messages: ChatMessage[], maxTokens: number) {
  const inputChars = messages.reduce((sum, m) => sum + m.content.length + 16, 0)
  return Math.ceil(inputChars / 4) + maxTokens
}

function reserveBudget(
  estimated: number,
  budget: number,
  used: number,
  windowStart: number,
): { allowed: boolean; newUsed: number; newWindowStart: number } {
  const now = Date.now()
  let currentUsed = used
  let currentWindowStart = windowStart

  if (now - currentWindowStart >= 60_000) {
    currentWindowStart = now
    currentUsed = 0
  }

  if (currentUsed + estimated > budget) {
    return { allowed: false, newUsed: currentUsed, newWindowStart: currentWindowStart }
  }

  return {
    allowed: true,
    newUsed: currentUsed + estimated,
    newWindowStart: currentWindowStart,
  }
}

function parseCooldownMs(res: Response, errorText: string): number {
  const retryHeader = Number(res.headers.get('retry-after'))
  const retryFromMessage = Number(errorText.match(/try again in ([\d.]+)s/i)?.[1])
  const retryAfter = retryHeader || retryFromMessage || 30
  return Math.ceil(retryAfter * 1000)
}

async function callGroq(
  messages: ChatMessage[],
  maxTokens: number,
  model: string,
  temperature = 0.4,
): Promise<AIResponse> {
  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    if (res.status === 429 || res.status === 413) {
      const cooldownMs = parseCooldownMs(res, err)
      const until = Date.now() + cooldownMs
      // Set cooldown on the specific model that failed
      if (model === GROQ_CODEGEN_MODEL) {
        codegenPrimaryCooldownUntil = until
        console.warn(`[Groq] Primary codegen model cooled down for ${cooldownMs}ms`)
      } else if (model === GROQ_CODEGEN_FALLBACK_MODEL) {
        codegenFallbackCooldownUntil = until
        console.warn(`[Groq] Fallback codegen model cooled down for ${cooldownMs}ms`)
      } else {
        groqCooldownUntil = until
        console.warn(`[Groq] Standard model cooled down for ${cooldownMs}ms`)
      }
    }
    throw new Error(`Groq error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return { content: data.choices[0].message.content, provider: 'groq' }
}

function toCFMessages(messages: ChatMessage[]): CFMessage[] {
  return messages.map((m) => ({ role: m.role, content: m.content }))
}

// ── Standard chat: blueprint, products, agent messages ────────────────────
// Order: Cloudflare Workers AI -> Groq.
export async function chat(
  messages: ChatMessage[],
  options: ChatOptions = {},
): Promise<AIResponse> {
  const maxTokens = options.maxTokens ?? GROQ_DEFAULT_MAX_TOKENS
  const temperature = options.temperature ?? 0.3

  // ── Try Cloudflare first ──────────────────────────────────────────────
  if (!options.preferLocal && isCFAvailable()) {
    try {
      const result = await cfChat(toCFMessages(messages), maxTokens, temperature)
      return { content: result.content, provider: 'cloudflare' }
    } catch (e) {
      console.warn('[AI] chat: Cloudflare failed, trying Groq:', (e as Error).message)
    }
  }

  // ── Try Groq ──────────────────────────────────────────────────────────
  const estimated = estimateTokens(messages, maxTokens)
  const { allowed, newUsed, newWindowStart } = reserveBudget(
    estimated,
    GROQ_TPM_BUDGET,
    groqEstimatedTokensUsed,
    groqTokenWindowStartedAt,
  )
  groqEstimatedTokensUsed = newUsed
  groqTokenWindowStartedAt = newWindowStart

  const canUseGroq =
    Boolean(process.env.GROQ_API_KEY) &&
    !options.preferLocal &&
    Date.now() > groqCooldownUntil &&
    allowed

  if (canUseGroq) {
    return callGroq(messages, maxTokens, GROQ_MODEL, temperature)
  }

  throw new Error('[AI] chat: no provider available (Cloudflare and Groq both unavailable)')
}

// ── Codegen chat: storefront HTML generation ──────────────────────────────
// Order: Cloudflare (role-aware roster) -> Groq primary -> Groq fallback.
export async function codegenChat(
  messages: ChatMessage[],
  maxTokens = 1800,
  role: 'storefront' | 'hero' | 'nav' | 'generic' = 'storefront',
  temperature?: number,
): Promise<AIResponse> {
  const hasGroqKey = Boolean(process.env.GROQ_API_KEY)
  const resolvedTemperature = temperature ?? (role === 'hero' ? 0.18 : role === 'nav' ? 0.1 : 0.2)

  // ── Try Cloudflare first ──────────────────────────────────────────────
  if (isCFAvailable()) {
    const cfRole: NonNullable<CFCodegenOptions['role']> =
      role === 'hero' ? 'hero' : role === 'nav' ? 'extras' : 'generic'
    try {
      const result = await cfCodegen(toCFMessages(messages), maxTokens, { role: cfRole, temperature: resolvedTemperature })
      return { content: result.content, provider: 'cloudflare' }
    } catch (e) {
      console.warn(`[AI] codegenChat(${role}): Cloudflare failed, trying Groq:`, (e as Error).message)
    }
  }

  const estimated = estimateTokens(messages, maxTokens)

  // ── Try primary model (llama-4-scout, 30K TPM) ──────────────────────────
  if (hasGroqKey && Date.now() > codegenPrimaryCooldownUntil) {
    const { allowed, newUsed, newWindowStart } = reserveBudget(
      estimated,
      GROQ_CODEGEN_TPM_BUDGET,
      codegenPrimaryTokensUsed,
      codegenPrimaryWindowStartedAt,
    )
    codegenPrimaryTokensUsed = newUsed
    codegenPrimaryWindowStartedAt = newWindowStart

    if (allowed) {
      try {
        return await callGroq(messages, maxTokens, GROQ_CODEGEN_MODEL, resolvedTemperature)
      } catch (e) {
        console.warn(`[Groq] codegenChat(${role}) primary failed, trying fallback model:`, e)
      }
    } else {
      console.warn(`[Groq] codegenChat(${role}) primary TPM budget exceeded, trying fallback model`)
    }
  }

  // ── Try fallback model (llama-3.3-70b-versatile, 12K TPM) ───────────────
  if (hasGroqKey && Date.now() > codegenFallbackCooldownUntil) {
    const { allowed, newUsed, newWindowStart } = reserveBudget(
      estimated,
      GROQ_CODEGEN_FALLBACK_TPM_BUDGET,
      codegenFallbackTokensUsed,
      codegenFallbackWindowStartedAt,
    )
    codegenFallbackTokensUsed = newUsed
    codegenFallbackWindowStartedAt = newWindowStart

    if (allowed) {
      return callGroq(messages, maxTokens, GROQ_CODEGEN_FALLBACK_MODEL, resolvedTemperature)
    } else {
      console.warn(`[Groq] codegenChat(${role}) fallback TPM budget exceeded, no provider left`)
    }
  }

  throw new Error(
    `[AI] codegenChat(${role}): no provider available (Cloudflare, Groq primary/fallback all unavailable)`,
  )
}