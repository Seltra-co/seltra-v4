import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { generateBlueprint, generateProducts, classifyLayout, generateManifest, generateHeroNavSources } from '../ai'
import { extractDNA } from '../ai/agents/dna.agent'
import { buildPlan } from '../ai/agents/plan.agent'
import { prisma } from '../db'
import { TenantEventsService } from '../internal-ops/events/tenant-events.service'
import type { CanonicalStore, GeneratedProduct } from '../types'
import type { BuildContext } from './build-events.service'
import { planLimits } from '../common/plan-limits'

type CreateStoreInput = {
  name: string
  businessType?: string
  targetAudience?: string
  prompt: string
}

function emitFileChunks(ctx: BuildContext | undefined, file: string, content: string) {
  if (!ctx) return
  const chunkSize = 220
  for (let i = 0; i < content.length; i += chunkSize) {
    ctx.emit({ type: 'chunk', file, content: content.slice(i, i + chunkSize) })
  }
}

@Injectable()
export class StoreService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly tenantEvents: TenantEventsService,
  ) {}

  async create(input: CreateStoreInput, authorization?: string, ctx?: BuildContext) {
    const prompt = [input.name, input.businessType, input.targetAudience, input.prompt]
      .filter(Boolean)
      .join('\n')
    const ownerId = await this.getUserIdFromAuth(authorization, false)
    const result = await this.createFromPrompt(prompt, ownerId, ctx)
    return result.tenant
  }

 async createFromPrompt(prompt: string, ownerId?: string, ctx?: BuildContext) {
  // Resolve product cap up front so it's available to every generateProducts() call below.
  let maxProducts = planLimits(undefined).maxProductsPerStore // free-tier default for guests
  if (ownerId) {
    const [existingCount, owner] = await Promise.all([
      prisma.tenant.count({ where: { ownerId } }),
      prisma.user.findUnique({ where: { id: ownerId }, select: { plan: true } }),
    ])
    const { maxStores, tier, maxProductsPerStore } = planLimits(owner?.plan)
    maxProducts = maxProductsPerStore
    if (existingCount >= maxStores) {
      throw new Error(
        tier === 'premium'
          ? `Premium allows up to ${maxStores} stores.`
          : 'Free tier allows 1 store. Upgrade to Premium to launch additional stores.',
      )
    }
  }
    ctx?.emit({ type: 'step', step: 'intent', status: 'started', label: 'Business intent' })
    ctx?.emit({ type: 'log', message: 'Reading merchant prompt...' })
    ctx?.emit({ type: 'step', step: 'blueprint', status: 'started', label: 'Blueprint' })
    ctx?.emit({ type: 'log', message: 'Generating store blueprint...' })
    const blueprintResult = await generateBlueprint(prompt)

    if (!blueprintResult.data) {
      throw new Error('Could not generate store blueprint — no data returned')
    }

    const blueprint = blueprintResult.data
    ctx?.emit({ type: 'step', step: 'intent', status: 'completed', label: 'Business intent' })
    ctx?.emit({ type: 'step', step: 'blueprint', status: 'completed', label: 'Blueprint' })
    ctx?.emit({ type: 'file', name: 'Blueprint.json', status: 'started' })
    emitFileChunks(ctx, 'Blueprint.json', JSON.stringify(blueprint, null, 2))
    ctx?.emit({ type: 'file', name: 'Blueprint.json', status: 'completed' })

    // ── Extract StoreDNA synchronously — zero LLM tokens, rule-based ──
    ctx?.emit({ type: 'step', step: 'dna', status: 'started', label: 'Brand DNA' })
    ctx?.emit({ type: 'log', message: 'Extracting brand DNA...' })
    const dna = extractDNA(
      prompt,
      blueprint.businessType ?? undefined,
      blueprint.targetAudience ?? undefined,
    )
    ctx?.emit({ type: 'step', step: 'dna', status: 'completed', label: 'Brand DNA' })
    ctx?.emit({ type: 'file', name: 'StoreDNA.json', status: 'started' })
    emitFileChunks(ctx, 'StoreDNA.json', JSON.stringify(dna, null, 2))
    ctx?.emit({ type: 'file', name: 'StoreDNA.json', status: 'completed' })

    ctx?.emit({ type: 'step', step: 'products', status: 'started', label: 'Products' })
    ctx?.emit({ type: 'log', message: 'Generating launch-ready product catalog...' })
    const [productResult, layoutResult] = await Promise.all([
      generateProducts(blueprint),
      classifyLayout(blueprint),
    ])

    let products = (productResult.products ?? []).length > 0
      ? productResult.products
      : []

    if (products.length === 0) {
      console.warn('[Store] Product generation returned 0 products — forcing deterministic fallback')
      ctx?.emit({ type: 'log', message: 'Product agent returned no products; switching to deterministic fallback...' })
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
    ctx?.emit({ type: 'step', step: 'products', status: 'completed', label: 'Products' })
    ctx?.emit({ type: 'file', name: 'Products.json', status: 'started' })
    emitFileChunks(ctx, 'Products.json', JSON.stringify(products, null, 2))
    ctx?.emit({ type: 'file', name: 'Products.json', status: 'completed' })

    // P0.2 — a plan derived from THIS prompt's actual blueprint/DNA/product count,
    // not a static 10-step list. Zero extra LLM calls — this is data we already have.
    const plan = buildPlan(blueprint, dna, products.length)
    ctx?.emit({ type: 'plan', items: plan })

    console.log(`[Store] Blueprint ready. Products to create: ${products.length}`)
    console.log(`[Store] StoreDNA: industry=${dna.industry}, personality=${dna.brandPersonality}, hero=${dna.heroStyle}`)

    ctx?.emit({ type: 'step', step: 'payments', status: 'started', label: 'Payments' })
    ctx?.emit({ type: 'log', message: 'Creating tenant, categories, products, and payment providers...' })
    const tenant = await this.createFromBlueprint(
      blueprint,
      products,
      layoutResult.variant,
      ownerId,
      undefined,
    )
    ctx?.emit({ type: 'step', step: 'payments', status: 'completed', label: 'Payments' })

    // ── Persist StoreDNA to tenant in background (non-blocking) ──
    prisma.tenant.update({
      where: { id: tenant.id },
      data: {  storeDNA: JSON.parse(JSON.stringify(dna)), },
    }).catch((err) =>
      console.warn(`[Store] Failed to persist storeDNA for ${tenant.id}:`, err),
    )

    let completedTenant = tenant

    // Normal API calls return once the tenant exists. Build sessions await the
    // full asset pipeline so the final SSE "done" event reflects real completion.
    if (ctx) {
      await this.generateAndSaveStorefrontAssets(tenant.id, blueprint, dna, ctx)
      completedTenant = await this.findByIdOrSlug(tenant.id)
    } else {
      this.generateAndSaveStorefrontAssets(tenant.id, blueprint, dna)
        .catch((err) =>
          console.error(`[StorefrontAssets] Background generation failed for ${tenant.id}:`, err),
        )
    }

    return {
      tenant: completedTenant,
      blueprint,
      dna,
      provider: blueprintResult.provider,
      layoutVariant: layoutResult.variant,
      storefrontCodeProvider: 'pending',
    }
  }

  private async generateAndSaveStorefrontAssets(
    tenantId: string,
    blueprint: CanonicalStore,
    dna?: unknown,
    ctx?: BuildContext,
  ) {
    console.log(`[StorefrontAssets] Starting background generation for tenant ${tenantId}`)
    ctx?.emit({ type: 'step', step: 'manifest', status: 'started', label: 'Manifest' })
    ctx?.emit({ type: 'log', message: 'Composing deterministic storefront manifest...' })

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        products: { include: { images: true, variants: true } },
        paymentProviders: true,
      },
    })

    if (!tenant) {
      console.error(`[StorefrontAssets] Tenant ${tenantId} not found — aborting`)
      return
    }

    console.log(`[StorefrontAssets] Found ${tenant.products.length} products for tenant ${tenantId}`)

    const products = tenant.products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price.toString(),
      currency: p.currency,
      category: p.category,
      images: p.images as Array<{ url: string; isPrimary?: boolean }>,
      variants: p.variants,
    }))

    const storeDNA = tenant.storeDNA ?? dna ?? null

    // P0.1 — the critic/refinement loop now runs inside generateManifest() itself.
    // These hooks just surface it as its own visible build step instead of it
    // happening silently between "Manifest" and "Hero".
    const manifestResult = await generateManifest(blueprint, storeDNA, products, {
      onCritiqueStart: () => {
        ctx?.emit({ type: 'step', step: 'critique', status: 'started', label: 'Design review' })
        ctx?.emit({ type: 'log', message: 'Reviewing layout against the storefront quality bar...' })
      },
      onCritiqueEnd: (score, fixesApplied) => {
        const fixNote = fixesApplied > 0 ? ` — ${fixesApplied} refinement${fixesApplied === 1 ? '' : 's'} applied` : ' — no fixes needed'
        ctx?.emit({ type: 'log', message: `Design score: ${score}/100${fixNote}` })
        ctx?.emit({ type: 'step', step: 'critique', status: 'completed', label: 'Design review' })
      },
    })

    ctx?.emit({ type: 'file', name: 'Manifest.json', status: 'started' })
    emitFileChunks(ctx, 'Manifest.json', JSON.stringify(manifestResult.manifest, null, 2))
    ctx?.emit({ type: 'file', name: 'Manifest.json', status: 'completed' })
    ctx?.emit({ type: 'step', step: 'manifest', status: 'completed', label: 'Manifest' })

    ctx?.emit({ type: 'step', step: 'hero', status: 'started', label: 'Hero' })
    ctx?.emit({ type: 'step', step: 'nav', status: 'started', label: 'Navigation' })
    ctx?.emit({ type: 'log', message: 'Generating isolated hero and navigation micro-components...' })
    const micro = await generateHeroNavSources({
      blueprint,
      manifest: manifestResult.manifest,
      dna: storeDNA,
      products,
    })
    ctx?.emit({ type: 'file', name: 'Hero.tsx', status: 'started' })
    emitFileChunks(ctx, 'Hero.tsx', micro.heroSource ?? '// Fallback: deterministic HeroSection')
    ctx?.emit({ type: 'file', name: 'Hero.tsx', status: 'completed' })
    ctx?.emit({ type: 'file', name: 'Navbar.tsx', status: 'started' })
    emitFileChunks(ctx, 'Navbar.tsx', micro.navSource ?? '// Fallback: deterministic DefaultNav')
    ctx?.emit({ type: 'file', name: 'Navbar.tsx', status: 'completed' })
    ctx?.emit({ type: 'step', step: 'hero', status: 'completed', label: 'Hero' })
    ctx?.emit({ type: 'step', step: 'nav', status: 'completed', label: 'Navigation' })

    ctx?.emit({ type: 'step', step: 'compile', status: 'started', label: 'Compile' })
    ctx?.emit({ type: 'log', message: 'Saving generated assets and refreshing preview...' })
    const manifestJson = JSON.stringify(manifestResult.manifest)
    const heroGeneratedAt = micro.heroSource ? new Date() : null
    const navGeneratedAt = micro.navSource ? new Date() : null

    await prisma.$executeRaw`
      UPDATE "Tenant"
      SET
        "manifest" = ${manifestJson}::jsonb,
        "heroSource" = ${micro.heroSource},
        "heroGeneratedAt" = ${heroGeneratedAt},
        "navSource" = ${micro.navSource},
        "navGeneratedAt" = ${navGeneratedAt},
        "updatedAt" = NOW()
      WHERE "id" = ${tenantId}
    `
    void this.tenantEvents.recordForTenant(tenantId, 'theme_updated', {
      manifestProvider: manifestResult.provider,
      heroNavProvider: micro.provider,
    })
    void this.tenantEvents.recordForTenant(tenantId, 'ai_invocation', {
      chunk: 'storefront_assets',
      model: [manifestResult.provider, micro.provider].filter(Boolean).join(','),
    })
    ctx?.emit({ type: 'step', step: 'compile', status: 'completed', label: 'Compile' })
    ctx?.emit({ type: 'step', step: 'deploy', status: 'started', label: 'Preview' })
    ctx?.emit({ type: 'step', step: 'deploy', status: 'completed', label: 'Deploy' })
    console.log(`[StorefrontAssets] Done for tenant ${tenantId} — manifest=${manifestResult.provider}; ${micro.provider}`)
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
    const updated = await prisma.tenant.update({
      where: { id: storeId },
      data: {
        storefrontCode: newHtml,
        storefrontVersion: (existing?.storefrontVersion ?? 0) + 1,
        storefrontGeneratedAt: new Date(),
      },
    })
    void this.tenantEvents.recordForTenant(storeId, 'theme_updated', { source: 'storefront_code_patch' })
    return updated
  }

  async regenerateStorefrontCode(storeId: string) {
    const store = await this.findByIdOrSlug(storeId)
    const canonical = (store.canonical ?? {}) as Record<string, unknown>
    const blueprint = canonical as unknown as CanonicalStore

    await this.generateAndSaveStorefrontAssets(store.id, blueprint)
    return this.findByIdOrSlug(store.id)
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
    data: {
      name?: string
      businessType?: string
      targetAudience?: string
      region?: string
      country?: string
      language?: string
      payoutMethod?: string
      payoutProvider?: string
      payoutProviderCode?: string
      payoutAccount?: string
    },
    authorization?: string,
  ) {
    const ownerId = await this.getUserIdFromAuth(authorization, true)
    const tenant = await prisma.tenant.findUnique({ where: { id } })
    if (!tenant || (tenant.ownerId && tenant.ownerId !== ownerId)) {
      throw new NotFoundException(`Store "${id}" not found`)
    }
    const preferences = {
      ...((tenant.preferences as Record<string, unknown> | null) ?? {}),
      ...(data.region ? { region: data.region } : {}),
      ...(data.language ? { language: data.language } : {}),
    }
    const updateData = {
      name: data.name,
      businessType: data.businessType,
      targetAudience: data.targetAudience,
      country: data.country,
      preferences,
      payoutMethod: data.payoutMethod,
      payoutProvider: data.payoutProvider,
      payoutProviderCode: data.payoutProviderCode,
      payoutAccount: data.payoutAccount,
      ownerId: tenant.ownerId ?? ownerId,
    }
    const updated = await prisma.tenant.update({
      where: { id },
      data: updateData,
      include: this.storeInclude(),
    })
    void this.tenantEvents.recordForTenant(id, 'settings_changed', updateData)
    return updated
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