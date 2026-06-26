//backend/src/agent/agent.service.ts
import { Injectable, NotFoundException } from '@nestjs/common'
import { chat } from '../ai'
import { prisma } from '../db'
import { StoreService } from '../store/store.service'
import { loadMerchantContext, updateMerchantContext } from '../ai/agents/merchants-context'

export type AgentAction =
  | { action: 'ADD_PRODUCT'; payload: { id?: string; name: string; price: number | string; currency: string; description?: string; category?: string } }
  | { action: 'UPDATE_PRODUCT'; payload: { id: string; name?: string; price?: number | string; description?: string; category?: string } }
  | { action: 'DELETE_PRODUCT'; payload: { id: string; name?: string } }
  | { action: 'UPDATE_THEME'; payload: { primaryColor?: string; font?: string } }
  | { action: 'SET_POLICY'; payload: { type: 'shipping' | 'returns'; content: string } }
  | { action: 'REFETCH_STOREFRONT'; payload: { storeId: string } }
  | { action: 'PATCH_STOREFRONT'; payload: { instruction: string } }
  | { action: 'REGENERATE_STOREFRONT'; payload: { reason?: string } }
  | { action: 'UPDATE_STORE_META'; payload: { name?: string; businessType?: string; targetAudience?: string } }

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
  { "action": "UPDATE_THEME", "payload": { "primaryColor"?: string, "font"?: string } },
  { "action": "SET_POLICY", "payload": { "type": "shipping"|"returns", "content": string } },
  { "action": "PATCH_STOREFRONT", "payload": { "instruction": string } },
  { "action": "REGENERATE_STOREFRONT", "payload": { "reason": string } }
]

Rules:
- For product price updates, emit UPDATE_PRODUCT with the product id and new price.
- For UI/visual changes, emit PATCH_STOREFRONT with a precise instruction.
- For complete look overhauls, emit REGENERATE_STOREFRONT.
- If no action is needed, omit ---ACTIONS--- entirely.
- Default currency is GHS. Always reply in the same language the merchant uses.`

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

@Injectable()
export class AgentService {
  constructor(private readonly storeService: StoreService) {}

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
    const canonical = (store.canonical || {}) as Record<string, unknown>
    const tech = canonical.recommendedTechStack as { paymentGateways?: string[] } | undefined

    // Load merchant context
    const context = await loadMerchantContext(store.id)

    let result
    try {
      result = await chat([
        { role: 'system', content: SELTRA_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            buildContextBlock(context),
            `Store context:`,
            JSON.stringify({
              id: store.id,
              name: store.name,
              businessType: store.businessType,
              targetAudience: store.targetAudience,
              layoutVariant: canonical.layoutVariant,
              productCategories: canonical.productCategories,
              paymentGateways: tech?.paymentGateways,
              hasStorefrontCode: Boolean((store as { storefrontCode?: string }).storefrontCode),
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
    } catch {
      return {
        reply: `I saved the conversation for ${store.name}. The AI provider is offline but will reconnect shortly.`,
        conversationId: nextConversationId,
        actions: [],
      }
    }

    const parsed = parseActions(result.content)
    const persistedActions = await this.executeActions(store, parsed.actions)

    // Update merchant context in background
    const industry = (store as { storeDNA?: { industry?: string } }).storeDNA?.industry ?? 'general'
    const brandPersonality = (store as { storeDNA?: { brandPersonality?: string } }).storeDNA?.brandPersonality ?? 'minimal'
    const lastAction = persistedActions[0]?.action ?? undefined
    updateMerchantContext(store.id, store.name, industry, brandPersonality, message, lastAction).catch(() => null)

    return {
      reply: parsed.reply || result.content,
      conversationId: nextConversationId,
      actions: persistedActions,
    }
  }

  private async executeActions(store: Awaited<ReturnType<typeof StoreService.prototype.findByIdOrSlug>>, actions: AgentAction[]) {
    const persisted: AgentAction[] = []
    let needsStorefrontRefetch = false

    for (const action of actions) {

      // ── ADD PRODUCT ────────────────────────────────────────────────────
      if (action.action === 'ADD_PRODUCT') {
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
          persisted.push({ action: 'REGENERATE_STOREFRONT', payload: { reason: 'no existing code' } })
        }
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
}