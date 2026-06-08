//seltra-web/backend/src/store/store.service.ts

import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { generateBlueprint, generateProducts, classifyLayout } from '../ai'
import { generateStorefrontCode } from '../ai/agents/storefront-codegen.agent'
import { extractDNA } from '../ai/agents/dna.agent'
import { prisma } from '../db'
import { Prisma } from '@prisma/client'
import type { CanonicalStore, GeneratedProduct } from '../types'

type CreateStoreInput = {
  name: string
  businessType?: string
  targetAudience?: string
  prompt: string
}

@Injectable()
export class StoreService {
  constructor(private readonly jwtService: JwtService) {}

  async create(input: CreateStoreInput, authorization?: string) {
    const prompt = [input.name, input.businessType, input.targetAudience, input.prompt]
      .filter(Boolean)
      .join('\n')
    const ownerId = await this.getUserIdFromAuth(authorization, false)
    const result = await this.createFromPrompt(prompt, ownerId)
    return result.tenant
  }

  async createFromPrompt(prompt: string, ownerId?: string) {
    const blueprintResult = await generateBlueprint(prompt)

    if (!blueprintResult.data) {
      throw new Error('Could not generate store blueprint — no data returned')
    }

    const blueprint = blueprintResult.data

    // ── Extract StoreDNA synchronously — zero LLM tokens, rule-based ──
    const dna = extractDNA(
      prompt,
      blueprint.businessType ?? undefined,
      blueprint.targetAudience ?? undefined,
    )

    const [productResult, layoutResult] = await Promise.all([
      generateProducts(blueprint),
      classifyLayout(blueprint),
    ])

    let products = (productResult.products ?? []).length > 0
      ? productResult.products
      : []

    if (products.length === 0) {
      console.warn('[Store] Product generation returned 0 products — forcing deterministic fallback')
      const savedFlag = process.env.SELTRA_LLM_PRODUCTS
      process.env.SELTRA_LLM_PRODUCTS = 'false'
      try {
        const fallbackResult = await generateProducts(blueprint)
        products = fallbackResult.products
      } finally {
        process.env.SELTRA_LLM_PRODUCTS = savedFlag
      }
      console.log(`[Store] Fallback generated ${products.length} products`)
    }

    console.log(`[Store] Blueprint ready. Products to create: ${products.length}`)
    console.log(`[Store] StoreDNA: industry=${dna.industry}, personality=${dna.brandPersonality}, hero=${dna.heroStyle}`)

    const tenant = await this.createFromBlueprint(
      blueprint,
      products,
      layoutResult.variant,
      ownerId,
      undefined,
    )

    // ── Persist StoreDNA to tenant in background (non-blocking) ──
    prisma.tenant.update({
      where: { id: tenant.id },
      data: {  storeDNA: JSON.parse(JSON.stringify(dna)), },
    }).catch((err) =>
      console.warn(`[Store] Failed to persist storeDNA for ${tenant.id}:`, err),
    )

    // Fire-and-forget: codegen with real Prisma IDs
    this.generateAndSaveStorefrontCode(tenant.id, blueprint, layoutResult.variant)
      .catch((err) =>
        console.error(`[Codegen] Background generation failed for ${tenant.id}:`, err),
      )

    return {
      tenant,
      blueprint,
      dna,
      provider: blueprintResult.provider,
      layoutVariant: layoutResult.variant,
      storefrontCodeProvider: 'pending',
    }
  }

  private async generateAndSaveStorefrontCode(
    tenantId: string,
    blueprint: CanonicalStore,
    layoutVariant: string,
  ) {
    console.log(`[Codegen] Starting background codegen for tenant ${tenantId}`)

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        products: { include: { images: true, variants: true } },
        paymentProviders: true,
      },
    })

    if (!tenant) {
      console.error(`[Codegen] Tenant ${tenantId} not found — aborting`)
      return
    }

    console.log(`[Codegen] Found ${tenant.products.length} products for tenant ${tenantId}`)

    const codegenResult = await generateStorefrontCode({
      blueprint,
      products: tenant.products.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price.toString(),
        currency: p.currency,
        category: p.category,
        images: p.images as Array<{ url: string; isPrimary?: boolean }>,
        variants: p.variants,
      })),
      tenantId,
      paymentGateways: tenant.paymentProviders.map((pp) => pp.provider),
      layoutHint: layoutVariant,
    })

    await this.patchStorefrontCode(tenantId, codegenResult.html)
    console.log(`[Codegen] Done for tenant ${tenantId} — provider: ${codegenResult.provider}`)
  }

  async createFromBlueprint(
    blueprint: CanonicalStore,
    products: GeneratedProduct[],
    layoutVariant: 'editorial' | 'grid' | 'bold' = 'grid',
    ownerId?: string,
    storefrontCode?: string,
  ) {
    const slug = await this.uniqueSlug(blueprint.storeSlug)

    console.log(
      `[Store] Creating tenant "${blueprint.businessName}" with slug "${slug}" and ${products.length} products`,
    )

    try {
      const tenant = await prisma.tenant.create({
        data: {
          ownerId,
          name: blueprint.businessName,
          slug,
          businessType: blueprint.businessType,
          targetAudience: blueprint.targetAudience,
          platform: 'Seltra',
          status: 'active',
          canonical: {
            ...(blueprint as object),
            layoutVariant,
          },
          storeUrl: `${slug}.seltra.co`,
          storefrontCode: storefrontCode ?? null,
          storefrontVersion: storefrontCode ? 1 : 0,
          storefrontGeneratedAt: storefrontCode ? new Date() : null,
          categories: {
            create: blueprint.productCategories.map((name) => ({ name })),
          },
          paymentProviders: {
            create: blueprint.recommendedTechStack.paymentGateways.map((provider) => ({
              provider,
              config: {},
            })),
          },
          products: {
            create: products.map((product, index) => {
              const priceStr = product.price != null ? String(product.price) : '0'
              const tags = Array.isArray(product.tags) ? product.tags.map(String) : []

              console.log(
                `[Store]   Product[${index}]: "${product.name}" price="${priceStr}" category="${product.category}"`,
              )

              return {
                name: product.name,
                description: product.description ?? null,
                price: priceStr,
                currency: product.currency || 'GHS',
                category: product.category ?? null,
                sku: product.sku ?? null,
                tags,
                status: 'active',
                images: {
                  create: (product.images ?? [])
                    .filter((img) => Boolean(img?.url))
                    .map((image) => ({
                      url: image.url,
                      isPrimary: image.isPrimary ?? true,
                    })),
                },
                variants: {
                  create: (product.variants ?? [])
                    .filter((v) => v?.name && v?.value)
                    .map((variant) => ({
                      name: variant.name,
                      value: variant.value,
                    })),
                },
              }
            }),
          },
        },
        include: this.storeInclude(),
      })

      console.log(`[Store] Created tenant ${tenant.id} with ${tenant.products.length} products`)
      return tenant
    } catch (err) {
      console.error('[Store] prisma.tenant.create failed:', err)
      throw err
    }
  }

  async patchStorefrontCode(storeId: string, newHtml: string) {
    const existing = await prisma.tenant.findUnique({
      where: { id: storeId },
      select: { storefrontVersion: true },
    })
    return prisma.tenant.update({
      where: { id: storeId },
      data: {
        storefrontCode: newHtml,
        storefrontVersion: (existing?.storefrontVersion ?? 0) + 1,
        storefrontGeneratedAt: new Date(),
      },
    })
  }

  async regenerateStorefrontCode(storeId: string) {
    const store = await this.findByIdOrSlug(storeId)
    const canonical = (store.canonical ?? {}) as Record<string, unknown>
    const blueprint = canonical as unknown as CanonicalStore

    const codegenResult = await generateStorefrontCode({
      blueprint,
      products: store.products.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price.toString(),
        currency: p.currency,
        category: p.category,
        images: p.images as Array<{ url: string; isPrimary?: boolean }>,
        variants: p.variants,
      })),
      tenantId: store.id,
      paymentGateways: store.paymentProviders.map((pp) => pp.provider),
      layoutHint: (canonical.layoutVariant as string) ?? 'grid',
    })

    return this.patchStorefrontCode(store.id, codegenResult.html)
  }

  async findBySlug(slug: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      include: this.storeInclude(),
    })
    if (!tenant) throw new NotFoundException(`Store "${slug}" not found`)
    return this.withDerivedFields(tenant)
  }

  async findByIdOrSlug(idOrSlug: string) {
    const tenant = await prisma.tenant.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      include: this.storeInclude(),
    })
    if (!tenant) throw new NotFoundException(`Store "${idOrSlug}" not found`)
    return tenant
  }

  async findMine(authorization?: string) {
    const ownerId = await this.getUserIdFromAuth(authorization, true)
    return prisma.tenant.findMany({
      where: { ownerId },
      include: this.storeInclude(),
      orderBy: { updatedAt: 'desc' },
    })
  }

  async update(
    id: string,
    data: { name?: string; businessType?: string; targetAudience?: string },
    authorization?: string,
  ) {
    const ownerId = await this.getUserIdFromAuth(authorization, true)
    const tenant = await prisma.tenant.findUnique({ where: { id } })
    if (!tenant || (tenant.ownerId && tenant.ownerId !== ownerId)) {
      throw new NotFoundException(`Store "${id}" not found`)
    }
    return prisma.tenant.update({
      where: { id },
      data: { ...data, ownerId: tenant.ownerId ?? ownerId },
      include: this.storeInclude(),
    })
  }

  async delete(id: string, authorization?: string) {
    const ownerId = await this.getUserIdFromAuth(authorization, true)
    const tenant = await prisma.tenant.findUnique({ where: { id } })
    if (!tenant || tenant.ownerId !== ownerId) {
      throw new NotFoundException(`Store "${id}" not found`)
    }
    await prisma.tenant.delete({ where: { id } })
    return { success: true }
  }

  async regenerateStorefrontCodeForOwner(storeId: string, authorization?: string) {
    const ownerId = await this.getUserIdFromAuth(authorization, true)
    const tenant = await prisma.tenant.findUnique({ where: { id: storeId } })
    if (!tenant || tenant.ownerId !== ownerId) {
      throw new NotFoundException(`Store "${storeId}" not found`)
    }
    return this.regenerateStorefrontCode(storeId)
  }

  private async getUserIdFromAuth(authorization: string | undefined, required: true): Promise<string>
  private async getUserIdFromAuth(
    authorization: string | undefined,
    required: false,
  ): Promise<string | undefined>
  private async getUserIdFromAuth(authorization?: string, required = true) {
    const token = authorization?.replace(/^Bearer\s+/i, '')
    if (!token) {
      if (required) throw new UnauthorizedException('Missing bearer token')
      return undefined
    }
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(token, {
        secret: process.env.JWT_SECRET || 'change-me',
      })
      return payload.sub
    } catch {
      if (required) throw new UnauthorizedException('Invalid bearer token')
      return undefined
    }
  }

  private withDerivedFields<T extends { canonical: unknown }>(tenant: T) {
    const canonical = tenant.canonical as Record<string, unknown>
    return {
      ...tenant,
      layoutVariant: (canonical?.layoutVariant as string) || 'grid',
      theme: canonical?.theme || {},
    }
  }

  private async uniqueSlug(baseSlug: string) {
    const base = baseSlug || `seltra-store-${Date.now()}`
    let slug = base
    let suffix = 2
    while (await prisma.tenant.findUnique({ where: { slug }, select: { id: true } })) {
      slug = `${base}-${suffix}`
      suffix += 1
    }
    return slug
  }

  private storeInclude() {
    return {
      products: { include: { images: true, variants: true } },
      categories: true,
      paymentProviders: true,
      shippingZones: true,
    } as const
  }
}