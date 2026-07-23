//backend/src/agent/agent.service.ts
import { Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { chat } from '../ai'
import { prisma } from '../db'
import { StoreService } from '../store/store.service'
import { loadMerchantContext, updateMerchantContext } from '../ai/agents/merchants-context'
import { ContextEngine } from '../ai/context-engine.service'
import { AgentEventsService } from './agent-events.service'
import { MoolreService } from '../payment/moolre.service'
import { planLimits } from '../common/plan-limits'

export type AgentAction =
  | { action: 'ADD_PRODUCT'; payload: { id?: string; name: string; price: number | string; currency: string; description?: string; category?: string } }
  | { action: 'UPDATE_PRODUCT'; payload: { id: string; name?: string; price?: number | string; description?: string; category?: string } }
  | { action: 'DELETE_PRODUCT'; payload: { id: string; name?: string } }
  | { action: 'UPDATE_THEME'; payload: { primaryColor?: string; font?: string } }
  | { action: 'SET_HERO_IMAGE'; payload: { url: string } }
  | { action: 'SET_STORY_IMAGE'; payload: { url: string } }
  | { action: 'SET_POLICY'; payload: { type: 'shipping' | 'returns'; content: string } }
  | { action: 'REFETCH_STOREFRONT'; payload: { storeId: string } }
  | { action: 'PATCH_STOREFRONT'; payload: { instruction: string } }
  | { action: 'REGENERATE_STOREFRONT'; payload: { reason?: string } }
  | { action: 'UPDATE_STORE_META'; payload: { name?: string; businessType?: string; targetAudience?: string } }
  | { action: 'UPDATE_PRODUCTS'; payload: { operation: 'increase_prices_percent' | 'premium_names' | 'create_bundles' | 'dark_image_direction'; percent?: number; count?: number; theme?: string } }
  | { action: 'CREATE_INVOICE'; payload: { customerName: string; customerEmail: string; items: Array<{ description: string; quantity: number; unitPrice: number | string }> } }
  | { action: 'SEND_SMS'; payload: { to: string; message: string } }
  | { action: 'SET_TESTIMONIALS'; payload: { testimonials: Array<{ text: string; author: string }> } }
  | { action: 'SET_FAQ'; payload: { items: Array<{ question: string; answer: string }> } }
  | { action: 'SET_ABOUT'; payload: { headline?: string; body: string } }

export const SELTRA_SYSTEM_PROMPT = `You are the Seltra commerce agent. You help merchants build and manage their African e-commerce stores.

You can update products, prices, descriptions, the storefront UI, and store metadata.

Keep replies conversational and under 3 sentences unless the merchant asks for detail.
When you make a change, confirm what you did concisely.

Emit structured JSON actions after your reply, separated by ---ACTIONS---:
[
  { "action": "ADD_PRODUCT", "payload": { "name": string, "price": number, "currency": "GHS"|"NGN", "description": string, "category": string } },
  { "action": "UPDATE_PRODUCT", "payload": { "id": string, "name"?: string, "price"?: number, "description"?: string, "category"?: string } },
  { "action": "DELETE_PRODUCT", "payload": { "id": string, "name"?: string } },
  { "action": "UPDATE_STORE_META", "payload": { "name"?: string, "businessType"?: string, "targetAudience"?: string } },
  { "action": "UPDATE_PRODUCTS", "payload": { "operation": "increase_prices_percent"|"premium_names"|"create_bundles"|"dark_image_direction", "percent"?: number, "count"?: number, "theme"?: string } },
  { "action": "CREATE_INVOICE", "payload": { "customerName": string, "customerEmail": string, "items": [{ "description": string, "quantity": number, "unitPrice": number }] } },
  { "action": "SEND_SMS", "payload": { "to": string, "message": string } },
  { "action": "UPDATE_THEME", "payload": { "primaryColor"?: string, "font"?: string } },
  { "action": "SET_POLICY", "payload": { "type": "shipping"|"returns", "content": string } },
  { "action": "PATCH_STOREFRONT", "payload": { "instruction": string } },
  { "action": "REGENERATE_STOREFRONT", "payload": { "reason": string } },
  { "action": "SET_HERO_IMAGE", "payload": { "url": string } },
  { "action": "SET_STORY_IMAGE", "payload": { "url": string } },
  { "action": "SET_TESTIMONIALS", "payload": { "testimonials": [{ "text": string, "author": string }] } },
  { "action": "SET_FAQ", "payload": { "items": [{ "question": string, "answer": string }] } },
  { "action": "SET_ABOUT", "payload": { "headline"?: string, "body": string } },
]

Rules:
- For product price updates, emit UPDATE_PRODUCT with the product id and new price.
- For all-product price, naming, bundle, and image styling requests, emit UPDATE_PRODUCTS.
- For UI/visual changes, emit PATCH_STOREFRONT with a precise instruction.
- For complete look overhauls, emit REGENERATE_STOREFRONT.
- If no action is needed, omit ---ACTIONS--- entirely.
- If the merchant's message contains an attached image (look for "[image: <url>]") and mentions hero, banner, or cover, emit SET_HERO_IMAGE with that exact url.
- If it mentions the story/about section image, emit SET_STORY_IMAGE with that exact url.
- Default currency is GHS. Always reply in the same language the merchant uses.
- If the merchant gives you testimonial or review content to use, emit SET_TESTIMONIALS with that exact content — never invent reviews on their behalf.
- If the merchant gives you FAQ questions/answers, emit SET_FAQ with that exact content.
- If the merchant gives you "about us" or "our story" content, emit SET_ABOUT with that exact content.`

function makeConversationId(conversationId?: string) {
  return conversationId || `agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function parseActions(content: string): { reply: string; actions: AgentAction[] } {
  const [reply, rawActions] = content.split('---ACTIONS---')
  if (!rawActions) return { reply: reply.trim(), actions: [] }
  try {
    const parsed = JSON.parse(rawActions.trim())
    return { reply: reply.trim(), actions: Array.isArray(parsed) ? parsed : [] }
  } catch {
    return { reply: reply.trim(), actions: [] }
  }
}

function buildContextBlock(context: Awaited<ReturnType<typeof loadMerchantContext>>) {
  if (!context) return ''
  return `
Merchant context:
- Store: ${context.storeName} (${context.industry}, ${context.brandPersonality} brand)
- Price range: ${context.preferredCurrency} ${context.priceRange.min}–${context.priceRange.max}
- Recent intents: ${context.recentIntents.join(', ') || 'none yet'}
- Key terms merchant uses: ${context.keyPhrases.slice(0, 6).join(', ') || 'none detected'}
- Tone preference: ${context.tonePreference}
${context.lastAction ? `- Last action: ${context.lastAction} at ${context.lastActionAt}` : ''}`.trim()
}

function inferredActionsFromMessage(message: string): AgentAction[] {
  const lower = message.toLowerCase()
  const actions: AgentAction[] = []
  const percent = lower.match(/(\d+(?:\.\d+)?)\s*%/)?.[1]
  const imageMatch = message.match(/\[image:\s*(\S+)\]/)

  if (imageMatch) {
    const url = imageMatch[1]
    if (/hero|banner|cover/.test(lower)) {
      actions.push({ action: 'SET_HERO_IMAGE', payload: { url } })
    } else if (/story|about|why we exist/.test(lower)) {
      actions.push({ action: 'SET_STORY_IMAGE', payload: { url } })
    }
  }
  if (/increase|raise|bump/.test(lower) && /price|prices/.test(lower) && /all|every/.test(lower)) {
    actions.push({ action: 'UPDATE_PRODUCTS', payload: { operation: 'increase_prices_percent', percent: percent ? Number(percent) : 10 } })
  }
  if (/rename|name/.test(lower) && /product|products/.test(lower) && /premium|luxury|signature/.test(lower)) {
    actions.push({ action: 'UPDATE_PRODUCTS', payload: { operation: 'premium_names' } })
  }
  if (/bundle|bundles|gift set|gift sets/.test(lower) && /create|make|add|mother|mothers|mother's/.test(lower)) {
    const count = Number(lower.match(/(?:create|make|add)\s+(\d+)/)?.[1] ?? 3)
    actions.push({ action: 'UPDATE_PRODUCTS', payload: { operation: 'create_bundles', count: Math.min(Math.max(count, 1), 8), theme: lower.includes('mother') ? "Mother's Day" : 'Commerce' } })
  }
  if (/image|images|photo|photos|asset|assets/.test(lower) && /dark|black|moody|background/.test(lower)) {
    actions.push({ action: 'UPDATE_PRODUCTS', payload: { operation: 'dark_image_direction', theme: 'dark studio background' } })
  }
  if (/hero|button|font|faq|testimonial|newsletter|countdown|bestseller|best seller|storefront|layout|move|hide|show|dark mode/.test(lower)) {
    actions.push({ action: 'PATCH_STOREFRONT', payload: { instruction: message } })
  }
  return actions
}

function mergeActions(modelActions: AgentAction[], inferred: AgentAction[]) {
  const seen = new Set<string>()
  return [...modelActions, ...inferred].filter((action) => {
    const key = `${action.action}:${JSON.stringify(action.payload)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

@Injectable()
export class AgentService {
  constructor(
    private readonly storeService: StoreService,
    private readonly contextEngine: ContextEngine,
    private readonly agentEvents: AgentEventsService,
    private readonly moolre: MoolreService,
  ) {}

  private readonly CREDIT_LIMIT = Number(process.env.SELTRA_AI_CREDIT_LIMIT || 40)
  private readonly CREDIT_WINDOW_MS = Number(process.env.SELTRA_AI_CREDIT_WINDOW_HOURS || 5) * 60 * 60 * 1000

  private async consumeCredit(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { aiCreditsUsed: true, aiCreditsWindowStart: true },
    })
    if (!tenant) return { allowed: false, used: 0, limit: this.CREDIT_LIMIT, resetsAt: new Date() }

    const expired = Date.now() - tenant.aiCreditsWindowStart.getTime() > this.CREDIT_WINDOW_MS
    const currentUsed = expired ? 0 : tenant.aiCreditsUsed
    const currentWindowStart = expired ? new Date() : tenant.aiCreditsWindowStart
    const resetsAt = new Date(currentWindowStart.getTime() + this.CREDIT_WINDOW_MS)

    if (currentUsed >= this.CREDIT_LIMIT) {
      if (expired) await prisma.tenant.update({ where: { id: tenantId }, data: { aiCreditsWindowStart: currentWindowStart, aiCreditsUsed: 0 } })
      return { allowed: false, used: currentUsed, limit: this.CREDIT_LIMIT, resetsAt }
    }

    const nextUsed = currentUsed + 1
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { aiCreditsUsed: nextUsed, aiCreditsWindowStart: currentWindowStart },
    })
    return { allowed: true, used: nextUsed, limit: this.CREDIT_LIMIT, resetsAt }
  }

  async buildStore(prompt: string) {
    const { tenant, blueprint, provider, layoutVariant } = await this.storeService.createFromPrompt(prompt)
    return {
      success: true, provider,
      tenantId: tenant.id,
      storeUrl: `${blueprint.storeSlug}.seltra.co`,
      layoutVariant, blueprint,
      products: tenant.products,
      categoriesCreated: tenant.categories.length,
      message: `Store "${blueprint.businessName}" is live at ${blueprint.storeSlug}.seltra.co`,
    }
  }

 async sendMessage(storeId: string, message: string, conversationId?: string) {
    const nextConversationId = makeConversationId(conversationId)
    const store = await this.storeService.findByIdOrSlug(storeId)
    const credit = await this.consumeCredit(store.id)
    if (!credit.allowed) {
      return {
        reply: `You've used all ${credit.limit} AI credits for this window. They reset at ${credit.resetsAt.toLocaleTimeString()}. Dashboard operations (orders, products, payments) still work normally.`,
        conversationId: nextConversationId,
        actions: [],
        credits: { used: credit.used, limit: credit.limit, resetsAt: credit.resetsAt },
      }
    }
    const canonical = (store.canonical || {}) as Record<string, unknown>
    const tech = canonical.recommendedTechStack as { paymentGateways?: string[] } | undefined

    //Load merchant context
    const context = await loadMerchantContext(store.id)
    const promptContext = await this.contextEngine.build(store.id, message)

    let result
    try {
      result = await chat([
        { role: 'system', content: SELTRA_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            buildContextBlock(context),
            promptContext,
            `Store context:`,
            JSON.stringify({
              id: store.id,
              name: store.name,
              businessType: store.businessType,
              targetAudience: store.targetAudience,
              layoutVariant: canonical.layoutVariant,
              productCategories: canonical.productCategories,
              paymentGateways: tech?.paymentGateways,
              hasStorefrontCode: Boolean((store as { storefrontCode?: string; manifest?: unknown }).storefrontCode || (store as { manifest?: unknown }).manifest),
              products: store.products?.map((p) => ({
                id: p.id,
                name: p.name,
                price: p.price.toString(),
                currency: p.currency,
                category: p.category,
              })),
            }),
            `Merchant message: ${message}`,
          ].filter(Boolean).join('\n\n'),
        },
      ], { maxTokens: 500 })
    }catch {
      return {
        reply: `I saved the conversation for ${store.name}. The AI provider is offline but will reconnect shortly.`,
        conversationId: nextConversationId,
        actions: [],
        credits: { used: credit.used, limit: credit.limit, resetsAt: credit.resetsAt },
      }
    }

    const parsed = parseActions(result.content)
    const actions = mergeActions(parsed.actions, inferredActionsFromMessage(message))
    const persistedActions = await this.executeActions(store, actions)
    void this.agentEvents.emit({
      tenantId: store.id,
      agent: 'CommerceAgent',
      type: 'reply',
      action: persistedActions.map((action) => action.action).join(',') || undefined,
      payload: { message, actions: persistedActions } as object,
    }).catch(() => null)

    // Update merchant context in background
    const industry = (store as { storeDNA?: { industry?: string } }).storeDNA?.industry ?? 'general'
    const brandPersonality = (store as { storeDNA?: { brandPersonality?: string } }).storeDNA?.brandPersonality ?? 'minimal'
    const lastAction = persistedActions[0]?.action ?? undefined
    updateMerchantContext(store.id, store.name, industry, brandPersonality, message, lastAction).catch(() => null)

    return {
      reply: parsed.reply || result.content,
      conversationId: nextConversationId,
      actions: persistedActions,
      credits: { used: credit.used, limit: credit.limit, resetsAt: credit.resetsAt },
    }
  }

  // Peek at credit usage without consuming one — used by the dashboard to
  // display current usage on load, independent of sending a chat message.
  async getCreditStatus(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { aiCreditsUsed: true, aiCreditsWindowStart: true },
    })
    if (!tenant) return { used: 0, limit: this.CREDIT_LIMIT, resetsAt: new Date(Date.now() + this.CREDIT_WINDOW_MS) }

    const expired = Date.now() - tenant.aiCreditsWindowStart.getTime() > this.CREDIT_WINDOW_MS
    const used = expired ? 0 : tenant.aiCreditsUsed
    const windowStart = expired ? new Date() : tenant.aiCreditsWindowStart
    return {
      used,
      limit: this.CREDIT_LIMIT,
      resetsAt: new Date(windowStart.getTime() + this.CREDIT_WINDOW_MS),
    }
  }

  private async executeActions(store: Awaited<ReturnType<typeof StoreService.prototype.findByIdOrSlug>>, actions: AgentAction[]) {
    const persisted: AgentAction[] = []
    let needsStorefrontRefetch = false

    for (const action of actions) {

      if (action.action === 'SET_HERO_IMAGE') {
          const canonical = (store.canonical || {}) as Record<string, unknown>
          await prisma.tenant.update({
            where: { id: store.id },
            data: { canonical: { ...canonical, heroImageUrl: action.payload.url } },
          })
          persisted.push(action)
          needsStorefrontRefetch = true
        }
      if (action.action === 'SET_STORY_IMAGE') {
        const canonical = (store.canonical || {}) as Record<string, unknown>
        await prisma.tenant.update({
          where: { id: store.id },
          data: { canonical: { ...canonical, storyImageUrl: action.payload.url } },
        })
        persisted.push(action)
        needsStorefrontRefetch = true
      }

      // ── ADD PRODUCT ────────────────────────────────────────────────────
      if (action.action === 'ADD_PRODUCT') {
        const [existingCount, maxProducts] = await Promise.all([
          prisma.product.count({ where: { tenantId: store.id } }),
          this.resolveMaxProducts(store.id),
        ])
        if (existingCount >= maxProducts) { continue }
        const p = action.payload
        const product = await prisma.product.create({
          data: {
            tenantId: store.id,
            name: p.name,
            description: p.description,
            price: String(p.price),
            currency: p.currency || 'GHS',
            category: p.category || 'Featured',
            tags: ['agent-created'],
            status: 'active',
          },
        })
        persisted.push({ action: 'ADD_PRODUCT', payload: { id: product.id, name: product.name, price: product.price.toString(), currency: product.currency, description: product.description || undefined, category: product.category || undefined } })
        needsStorefrontRefetch = true
      }

      // ── UPDATE PRODUCT ─────────────────────────────────────────────────
      if (action.action === 'UPDATE_PRODUCT') {
        const p = action.payload
        // If no explicit id, try to match by name fuzzy search
        let productId = p.id
        if (!productId || productId === 'unknown') {
          const match = store.products?.find(prod =>
            prod.name.toLowerCase().includes((p as { name?: string }).name?.toLowerCase() ?? '') ||
            (p as { name?: string }).name?.toLowerCase().includes(prod.name.toLowerCase().slice(0, 8))
          )
          productId = match?.id ?? ''
        }
        if (productId) {
          const updateData: Record<string, unknown> = {}
          if (p.name) updateData.name = p.name
          if (p.price !== undefined) updateData.price = String(p.price)
          if (p.description !== undefined) updateData.description = p.description
          if (p.category !== undefined) updateData.category = p.category
          if (Object.keys(updateData).length > 0) {
            await prisma.product.update({ where: { id: productId }, data: updateData })
            persisted.push(action)
            needsStorefrontRefetch = true
          }
        }
      }

      // ── DELETE PRODUCT ─────────────────────────────────────────────────
      if (action.action === 'DELETE_PRODUCT') {
        const { id, name } = action.payload
        let productId = id
        if (!productId || productId === 'unknown') {
          const match = store.products?.find(p =>
            p.name.toLowerCase().includes(name?.toLowerCase() ?? '')
          )
          productId = match?.id ?? ''
        }
        if (productId) {
          await prisma.product.delete({ where: { id: productId } }).catch(() => null)
          persisted.push(action)
          needsStorefrontRefetch = true
        }
      }

      // ── UPDATE STORE META ──────────────────────────────────────────────
      if (action.action === 'UPDATE_STORE_META') {
        const { name, businessType, targetAudience } = action.payload
        const updateData: Record<string, unknown> = {}
        if (name) updateData.name = name
        if (businessType) updateData.businessType = businessType
        if (targetAudience) updateData.targetAudience = targetAudience
        if (Object.keys(updateData).length > 0) {
          await prisma.tenant.update({ where: { id: store.id }, data: updateData })
          persisted.push(action)
        }
      }

      // ── UPDATE THEME ───────────────────────────────────────────────────
      if (action.action === 'UPDATE_THEME') {
        const canonical = (store.canonical || {}) as Record<string, unknown>
        await prisma.tenant.update({
          where: { id: store.id },
          data: { canonical: { ...canonical, theme: { ...((canonical.theme as Record<string, unknown>) || {}), ...action.payload } } },
        })
        persisted.push(action)
        needsStorefrontRefetch = true
      }

      // ── SET POLICY ─────────────────────────────────────────────────────
      if (action.action === 'SET_POLICY') {
        const type = action.payload.type === 'returns' ? 'Returns' : 'Shipping'
        await prisma.shippingZone.upsert({
          where: { tenantId_name: { tenantId: store.id, name: type } },
          update: { metadata: action.payload },
          create: { tenantId: store.id, name: type, metadata: action.payload },
        })
        persisted.push(action)
      }

      // ── PATCH STOREFRONT ───────────────────────────────────────────────
      if (action.action === 'PATCH_STOREFRONT') {
        const manifestPatched = await this.patchStorefrontManifest(store.id, action.payload.instruction, store as unknown as { manifest?: unknown })
        if (manifestPatched) {
          persisted.push(action)
        } else {
          const existing = (store as { storefrontCode?: string }).storefrontCode
          if (existing) {
          try {
            const patched = await this.patchStorefrontHtml(existing, action.payload.instruction, store.name)
            if (patched) { await this.storeService.patchStorefrontCode(store.id, patched); persisted.push(action) }
          } catch {
            await this.storeService.regenerateStorefrontCode(store.id)
            persisted.push({ action: 'REGENERATE_STOREFRONT', payload: { reason: 'patch failed' } })
          }
          } else {
            await this.storeService.regenerateStorefrontCode(store.id)
            persisted.push({ action: 'REGENERATE_STOREFRONT', payload: { reason: 'no existing manifest or code' } })
          }
        }
        needsStorefrontRefetch = true
      }

      if (action.action === 'UPDATE_PRODUCTS') {
        const operation = action.payload.operation
        if (operation === 'increase_prices_percent') {
          const percent = Number(action.payload.percent ?? 10)
          for (const product of store.products ?? []) {
            const nextPrice = Number(product.price) * (1 + percent / 100)
            await prisma.product.update({ where: { id: product.id }, data: { price: nextPrice.toFixed(2) } })
          }
          persisted.push(action)
          needsStorefrontRefetch = true
        }
        if (operation === 'premium_names') {
          for (const product of store.products ?? []) {
            if (/premium|signature|reserve/i.test(product.name)) continue
            await prisma.product.update({ where: { id: product.id }, data: { name: `Signature ${product.name}` } })
          }
          persisted.push(action)
          needsStorefrontRefetch = true
        }
        if (operation === 'create_bundles') {
          const count = Math.min(Math.max(Number(action.payload.count ?? 3), 1), 8)
          const baseProducts = (store.products ?? []).slice(0, Math.max(1, Math.min(3, store.products?.length ?? 1)))
          const theme = action.payload.theme || 'Commerce'
          const average = baseProducts.length
            ? baseProducts.reduce((sum, product) => sum + Number(product.price || 0), 0) / baseProducts.length
            : 75
         const [existingCount, maxProducts] = await Promise.all([
            prisma.product.count({ where: { tenantId: store.id } }),
            this.resolveMaxProducts(store.id),
          ])

          const remaining = Math.max(0, maxProducts - existingCount)
          for (let i = 0; i < Math.min(count, remaining); i++) {
            await prisma.product.create({
              data: {
                tenantId: store.id,
                name: `${theme} Bundle ${i + 1}`,
                description: `Curated ${theme.toLowerCase()} set featuring ${baseProducts.map((product) => product.name).join(', ') || 'best-selling items'}.`,
                price: (average * (1.8 + i * 0.15)).toFixed(2),
                currency: baseProducts[0]?.currency || 'GHS',
                category: 'Bundles',
                tags: ['agent-created', 'bundle'],
                status: 'active',
              },
            })
          }
          persisted.push(action)
          needsStorefrontRefetch = true
        }
        if (operation === 'dark_image_direction') {
          for (const product of store.products ?? []) {
            const tags = Array.isArray(product.tags) ? product.tags.map(String) : []
            await prisma.product.update({
              where: { id: product.id },
              data: { tags: Array.from(new Set([...tags, 'image-style:dark-studio', 'agent-image-direction'])) },
            })
          }
          persisted.push(action)
          needsStorefrontRefetch = true
        }
      }

      if (action.action === 'CREATE_INVOICE') {
        const invoice = await this.createInvoiceFromAgent(store.id, action.payload)
        persisted.push({
          action: 'CREATE_INVOICE',
          payload: {
            ...action.payload,
            invoiceId: invoice.id,
            number: invoice.number,
          } as AgentAction['payload'] & { invoiceId: string; number: string },
        } as AgentAction)
      }

      if (action.action === 'SEND_SMS') {
        await this.moolre.sendSms(action.payload)
        await this.agentEvents.emit({
          tenantId: store.id,
          agent: 'CommerceAgent',
          type: 'sms.sent',
          action: 'SEND_SMS',
          payload: action.payload as Prisma.InputJsonValue,
        }).catch(() => null)
        persisted.push(action)
      }

      if (action.action === 'SET_TESTIMONIALS') {
        const canonical = (store.canonical || {}) as Record<string, unknown>
        await prisma.tenant.update({
          where: { id: store.id },
          data: { canonical: { ...canonical, testimonials: action.payload.testimonials } },
        })
        persisted.push(action)
        needsStorefrontRefetch = true
      }

      if (action.action === 'SET_FAQ') {
        const canonical = (store.canonical || {}) as Record<string, unknown>
        await prisma.tenant.update({
          where: { id: store.id },
          data: { canonical: { ...canonical, faqItems: action.payload.items } },
        })
        persisted.push(action)
        needsStorefrontRefetch = true
      }

      if (action.action === 'SET_ABOUT') {
        const canonical = (store.canonical || {}) as Record<string, unknown>
        await prisma.tenant.update({
          where: { id: store.id },
          data: { canonical: { ...canonical, aboutOverride: { headline: action.payload.headline, body: action.payload.body } } },
        })
        persisted.push(action)
        needsStorefrontRefetch = true
      }

      // ── REGENERATE STOREFRONT ──────────────────────────────────────────
      if (action.action === 'REGENERATE_STOREFRONT') {
        await this.storeService.regenerateStorefrontCode(store.id)
        persisted.push(action)
        needsStorefrontRefetch = true
      }
    }

    if (needsStorefrontRefetch) {
      persisted.push({ action: 'REFETCH_STOREFRONT', payload: { storeId: store.id } })
    }

    return persisted
  }

  private async patchStorefrontHtml(currentHtml: string, instruction: string, storeName: string): Promise<string | null> {
    const htmlSlice = currentHtml.length > 1600
      ? currentHtml.slice(0, 1200) + '\n[...middle truncated...]\n' + currentHtml.slice(-400)
      : currentHtml

    const result = await chat([
      { role: 'system', content: `You are patching an HTML storefront for "${storeName}". Apply ONLY the requested change. Return the COMPLETE updated HTML. No markdown. First line must be <!DOCTYPE html>.` },
      { role: 'user', content: `Instruction: ${instruction}\n\nCurrent HTML:\n${htmlSlice}` },
    ], { maxTokens: 2000 })

    const raw = result.content.trim()
    if (!raw.toLowerCase().startsWith('<!doctype html')) return null
    return raw
  }

  private async patchStorefrontManifest(storeId: string, instruction: string, store: { manifest?: unknown }) {
    const manifest = store.manifest as { palette?: Record<string, string>; typography?: Record<string, string>; sections?: Array<Record<string, unknown>> } | null
    if (!manifest || !Array.isArray(manifest.sections)) return false

    const lower = instruction.toLowerCase()
    const next = JSON.parse(JSON.stringify(manifest)) as NonNullable<typeof manifest>
    next.palette = { ...(next.palette ?? {}) }
    next.typography = { ...(next.typography ?? {}) }
    next.sections = Array.isArray(next.sections) ? next.sections : []

    if (/dark mode|dark theme|black/.test(lower)) {
      next.palette = { ...next.palette, bg: '#050505', surface: '#111111', text: '#f8fafc', muted: '#a1a1aa', accent: next.palette.accent ?? '#22c55e' }
    }
    if (/button|buttons/.test(lower) && /larger|bigger|large/.test(lower)) {
      next.sections = next.sections.map((section) => ({ ...section, buttonSize: 'large' }))
    }
    if (/font/.test(lower)) {
      const font = lower.includes('serif') ? 'Playfair Display' : lower.includes('mono') ? 'JetBrains Mono' : 'Inter'
      next.typography = { ...next.typography, headingFont: font, bodyFont: font === 'Playfair Display' ? 'Inter' : font }
    }
    if (/hide/.test(lower) && /newsletter/.test(lower)) {
      next.sections = next.sections.filter((section) => section.type !== 'newsletter')
    }
    if (/faq/.test(lower) && !next.sections.some((section) => section.type === 'faq')) {
      next.sections.push({ type: 'faq', headline: 'Questions customers ask', items: [] })
    }
    if (/countdown/.test(lower) && !next.sections.some((section) => section.type === 'countdown')) {
      next.sections.unshift({ type: 'countdown', label: 'Limited offer', endsInHours: 72 })
    }
    if (/bestseller|best seller|featured first/.test(lower)) {
      next.sections = next.sections.map((section) => section.type === 'product-grid' ? { ...section, style: 'featured-first' } : section)
    }
    if (/move/.test(lower) && /hero/.test(lower)) {
      next.sections = next.sections.sort((a, b) => a.type === 'hero' ? -1 : b.type === 'hero' ? 1 : 0)
    }

    await prisma.tenant.update({
      where: { id: storeId },
      data: { manifest: next as Prisma.InputJsonValue, updatedAt: new Date() },
    })
    return true
  }

  private async createInvoiceFromAgent(
    tenantId: string,
    payload: Extract<AgentAction, { action: 'CREATE_INVOICE' }>['payload'],
  ) {
    const items = (payload.items || []).filter((item) => item.description && Number(item.quantity) > 0)
    const subtotal = items.reduce((sum, item) => sum + Number(item.unitPrice) * Number(item.quantity), 0)
    const invoiceCount = await prisma.invoice.count({ where: { tenantId } })
    const number = `INV-${String(invoiceCount + 1).padStart(5, '0')}`

    const invoice = await prisma.invoice.create({
      data: {
        tenantId,
        number,
        customerName: payload.customerName,
        customerEmail: payload.customerEmail,
        subtotal: new Prisma.Decimal(subtotal),
        total: new Prisma.Decimal(subtotal),
        pdfUrl: `/api/v1/invoices/${number}/pdf`,
        items: {
          create: items.map((item) => ({
            description: item.description,
            quantity: Number(item.quantity),
            unitPrice: new Prisma.Decimal(item.unitPrice),
            total: new Prisma.Decimal(Number(item.unitPrice) * Number(item.quantity)),
          })),
        },
      },
    })

    await this.agentEvents.emit({
      tenantId,
      agent: 'InvoiceAgent',
      type: 'invoice.created',
      action: 'CREATE_INVOICE',
      payload: { invoiceId: invoice.id, number } as Prisma.InputJsonValue,
    }).catch(() => null)

    return invoice
  }

  private async resolveMaxProducts(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { owner: { select: { plan: true } } },
    })
    return planLimits(tenant?.owner?.plan).maxProductsPerStore
  }
}
