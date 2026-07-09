//seltra-web/backend/src/ai/client.ts

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const OLLAMA_API_URL = 'http://localhost:11434/api/chat'

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
  provider: 'groq' | 'ollama'
}

export interface ChatOptions {
  maxTokens?: number
  preferLocal?: boolean
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
      temperature: 0.4,
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

async function callOllama(messages: ChatMessage[]): Promise<AIResponse> {
  const res = await fetch(OLLAMA_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'qwen2.5:3b', messages, stream: false }),
  })
  const data = await res.json()
  return { content: data.message.content, provider: 'ollama' }
}

// ── Standard chat: blueprint, products, agent messages ────────────────────
export async function chat(
  messages: ChatMessage[],
  options: ChatOptions = {},
): Promise<AIResponse> {
  const maxTokens = options.maxTokens ?? GROQ_DEFAULT_MAX_TOKENS
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
    try {
      return await callGroq(messages, maxTokens, GROQ_MODEL)
    } catch (e) {
      console.warn('[Groq] chat fallback to Ollama:', e)
    }
  }

  return callOllama(messages)
}

// ── Codegen chat: storefront HTML generation ──────────────────────────────
// Tries llama-4-scout (30K TPM) → llama-3.3-70b-versatile (12K TPM) → Ollama
export async function codegenChat(
  messages: ChatMessage[],
  maxTokens = 1800,
  role: 'storefront' | 'hero' | 'nav' | 'generic' = 'storefront',
): Promise<AIResponse> {
  const estimated = estimateTokens(messages, maxTokens)
  const hasGroqKey = Boolean(process.env.GROQ_API_KEY)

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
        return await callGroq(messages, maxTokens, GROQ_CODEGEN_MODEL)
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
      try {
        return await callGroq(messages, maxTokens, GROQ_CODEGEN_FALLBACK_MODEL)
      } catch (e) {
        console.warn(`[Groq] codegenChat(${role}) fallback model failed, using Ollama:`, e)
      }
    } else {
      console.warn(`[Groq] codegenChat(${role}) fallback TPM budget exceeded, using Ollama`)
    }
  }

  // ── Final fallback: local Ollama ─────────────────────────────────────────
  return callOllama(messages)
}
