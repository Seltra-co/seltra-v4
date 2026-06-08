//seltra-web/backend/src/agent/agent.service.ts

import { Injectable } from '@nestjs/common'
import { chat } from '../ai'
import { prisma } from '../db'
import { StoreService } from '../store/store.service'
import { generateStorefrontCode } from '../ai/agents/storefront-codegen.agent'

export type AgentAction =
  | {
      action: 'ADD_PRODUCT'
      payload: { id?: string; name: string; price: number | string; currency: string; description?: string; category?: string }
    }
  | { action: 'UPDATE_THEME'; payload: { primaryColor?: string; font?: string } }
  | { action: 'SET_POLICY'; payload: { type: 'shipping' | 'returns'; content: string } }
  | { action: 'REFETCH_STOREFRONT'; payload: { storeId: string } }
  | { action: 'PATCH_STOREFRONT'; payload: { instruction: string } }
  | { action: 'REGENERATE_STOREFRONT'; payload: { reason?: string } }

// ── Updated system prompt: agent now knows about storefront code actions ───
export const SELTRA_SYSTEM_PROMPT = `You are the Seltra commerce agent. You help merchants build and manage their online stores.

Keep replies concise and useful. When the merchant asks for a storefront update, emit structured JSON actions.

Actions format (append after your human-readable reply, separated by ---ACTIONS---):
[
  { "action": "ADD_PRODUCT", "payload": { "name": string, "price": number, "currency": "GHS"|"NGN", "description": string } },
  { "action": "UPDATE_THEME", "payload": { "primaryColor": string, "font": string } },
  { "action": "SET_POLICY", "payload": { "type": "shipping"|"returns", "content": string } },
  { "action": "PATCH_STOREFRONT", "payload": { "instruction": string } },
  { "action": "REGENERATE_STOREFRONT", "payload": { "reason": string } }
]

Use PATCH_STOREFRONT when the merchant wants a visual change to their store (colors, layout, hero text, product display).
Use REGENERATE_STOREFRONT when the merchant wants a completely new look.
If no actions are needed, omit the ---ACTIONS--- section.
Always reply in the same language the merchant uses. Default currency is GHS.`

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

@Injectable()
export class AgentService {
  constructor(private readonly storeService: StoreService) {}

  async buildStore(prompt: string) {
    const { tenant, blueprint, provider, layoutVariant } =
      await this.storeService.createFromPrompt(prompt)
    return {
      success: true,
      provider,
      tenantId: tenant.id,
      storeUrl: `${blueprint.storeSlug}.seltra.store`,
      layoutVariant,
      blueprint,
      products: tenant.products,
      categoriesCreated: tenant.categories.length,
      message: `Store "${blueprint.businessName}" is live at ${blueprint.storeSlug}.seltra.store`,
    }
  }

  async sendMessage(storeId: string, message: string, conversationId?: string) {
    const nextConversationId = makeConversationId(conversationId)
    const store = await this.storeService.findByIdOrSlug(storeId)
    const canonical = (store.canonical || {}) as Record<string, unknown>
    const tech = canonical.recommendedTechStack as { paymentGateways?: string[] } | undefined

    let result
    try {
      result = await chat([
        { role: 'system', content: SELTRA_SYSTEM_PROMPT },
        {
          role: 'user',
          content:
            `Store context:\n${JSON.stringify({
              id: store.id,
              name: store.name,
              businessType: store.businessType,
              targetAudience: store.targetAudience,
              layoutVariant: canonical.layoutVariant,
              productCategories: canonical.productCategories,
              paymentGateways: tech?.paymentGateways,
              hasStorefrontCode: Boolean((store as { storefrontCode?: string }).storefrontCode),
              storefrontVersion: (store as { storefrontVersion?: number }).storefrontVersion ?? 0,
              products: store.products?.slice(0, 6).map((product) => ({
                id: product.id,
                name: product.name,
                price: product.price.toString(),
                currency: product.currency,
                category: product.category,
              })),
            })}\n\nMerchant message:\n${message}`,
        },
      ], { maxTokens: 450 })
    } catch {
      return {
        reply: `I saved the conversation for ${store.name}. The live AI provider is offline, but your storefront is ready for updates once the agent reconnects.`,
        conversationId: nextConversationId,
        actions: [],
      }
    }

    const parsed = parseActions(result.content)
    const persistedActions = await this.executeActions(store, parsed.actions)

    return {
      reply: parsed.reply || result.content,
      conversationId: nextConversationId,
      actions: persistedActions,
    }
  }

  private async executeActions(store: Awaited<ReturnType<StoreService['findByIdOrSlug']>>, actions: AgentAction[]) {
    const persisted: AgentAction[] = []

    for (const action of actions) {
      if (action.action === 'ADD_PRODUCT') {
        const payload = action.payload
        const product = await prisma.product.create({
          data: {
            tenantId: store.id,
            name: payload.name,
            description: payload.description,
            price: payload.price.toString(),
            currency: payload.currency || 'GHS',
            category: payload.category || 'Featured',
            tags: ['agent-created'],
            status: 'active',
          },
        })
        persisted.push({
          action: 'ADD_PRODUCT',
          payload: {
            id: product.id,
            name: product.name,
            price: product.price.toString(),
            currency: product.currency,
            description: product.description || undefined,
            category: product.category || undefined,
          },
        })
      }

      if (action.action === 'UPDATE_THEME') {
        const canonical = (store.canonical || {}) as Record<string, unknown>
        await prisma.tenant.update({
          where: { id: store.id },
          data: {
            canonical: {
              ...canonical,
              theme: { ...((canonical.theme as Record<string, unknown>) || {}), ...action.payload },
            },
          },
        })
        persisted.push(action)
      }

      if (action.action === 'SET_POLICY') {
        const type = action.payload.type === 'returns' ? 'Returns' : 'Shipping'
        await prisma.shippingZone.upsert({
          where: { tenantId_name: { tenantId: store.id, name: type } },
          update: { metadata: action.payload },
          create: { tenantId: store.id, name: type, metadata: action.payload },
        })
        persisted.push(action)
      }

      // ── NEW: patch storefront via instruction ──────────────────────────
      if (action.action === 'PATCH_STOREFRONT') {
        const existing = (store as { storefrontCode?: string }).storefrontCode
        if (existing) {
          try {
            const patchResult = await this.patchStorefrontHtml(
              existing,
              action.payload.instruction,
              store.name,
            )
            if (patchResult) {
              await this.storeService.patchStorefrontCode(store.id, patchResult)
              persisted.push(action)
            }
          } catch (e) {
            console.warn('[AgentService] PATCH_STOREFRONT failed, triggering regenerate:', e)
            await this.storeService.regenerateStorefrontCode(store.id)
            persisted.push({ action: 'REGENERATE_STOREFRONT', payload: { reason: 'patch failed' } })
          }
        } else {
          // No existing code — regenerate
          await this.storeService.regenerateStorefrontCode(store.id)
          persisted.push({ action: 'REGENERATE_STOREFRONT', payload: { reason: 'no existing code' } })
        }
      }

      // ── NEW: full regeneration ─────────────────────────────────────────
      if (action.action === 'REGENERATE_STOREFRONT') {
        await this.storeService.regenerateStorefrontCode(store.id)
        persisted.push(action)
      }
    }

    if (persisted.length > 0) {
      persisted.push({ action: 'REFETCH_STOREFRONT', payload: { storeId: store.id } })
    }

    return persisted
  }

  // ── Surgical HTML patch via LLM ────────────────────────────────────────
  private async patchStorefrontHtml(
    currentHtml: string,
    instruction: string,
    storeName: string,
  ): Promise<string | null> {
    // Send a compact slice of the HTML (first 1200 chars + last 400 chars) to stay within token budget
    const htmlSlice =
      currentHtml.length > 1600
        ? currentHtml.slice(0, 1200) + '\n[...middle truncated...]\n' + currentHtml.slice(-400)
        : currentHtml

    const result = await chat([
      {
        role: 'system',
        content: `You are patching an HTML storefront for "${storeName}". 
Apply ONLY the requested change to the HTML. 
Return the COMPLETE updated HTML. 
Do not add markdown or explanation. First line must be <!DOCTYPE html>.`,
      },
      {
        role: 'user',
        content: `Instruction: ${instruction}\n\nCurrent HTML:\n${htmlSlice}`,
      },
    ], { maxTokens: 2000 })

    const raw = result.content.trim()
    if (!raw.toLowerCase().startsWith('<!doctype html')) return null
    return raw
  }
}