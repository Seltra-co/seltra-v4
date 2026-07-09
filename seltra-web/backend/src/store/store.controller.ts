import { Body, Controller, Delete, Get, Headers, HttpCode, Param, Patch, Post, Sse } from '@nestjs/common'
import { StoreService } from './store.service'
import { BuildEventsService } from './build-events.service'

class CreateStoreDto {
  name!: string
  businessType?: string
  targetAudience?: string
  prompt!: string
}

class UpdateStoreDto {
  name?: string
  businessType?: string
  targetAudience?: string
}

@Controller('seltra/store')
export class StoreController {
  constructor(
    private readonly storeService: StoreService,
    private readonly buildEvents: BuildEventsService,
  ) {}

  @Post()
  async create(@Body() body: CreateStoreDto, @Headers('authorization') authorization?: string) {
    const store = await this.storeService.create(body, authorization)
    return { store }
  }

  @Post('build')
  @HttpCode(202)
  startBuild(@Body() body: CreateStoreDto, @Headers('authorization') authorization?: string) {
    const ctx = this.buildEvents.createSession()
    ctx.emit({ type: 'log', message: `Build session ${ctx.buildId} started.` })
    this.storeService.create(body, authorization, ctx)
      .then((store) => {
        ctx.emit({ type: 'preview', url: store.storeUrl ?? `${store.slug}.seltra.co`, store })
        ctx.emit({ type: 'done', store })
      })
      .catch((error) => {
        ctx.emit({ type: 'error', message: error instanceof Error ? error.message : String(error) })
      })
    return { buildId: ctx.buildId }
  }

  @Sse('build/:id/events')
  streamBuild(@Param('id') id: string) {
    return this.buildEvents.stream(id)
  }

  @Get()
  async findMine(@Headers('authorization') authorization?: string) {
    const stores = await this.storeService.findMine(authorization)
    return stores.map((s) => ({
      ...s,
      storefrontCode: s.storefrontCode ?? null,
      storefrontVersion: s.storefrontVersion ?? 0,
      manifest: s.manifest ?? null,
      heroSource: s.heroSource ?? null,
      navSource: s.navSource ?? null,
    }))
  }

  @Get(':slug')
  async findOne(@Param('slug') slug: string) {
    const store = await this.storeService.findBySlug(slug)
    return {
      ...store,
      storefrontCode: store.storefrontCode ?? null,
      storefrontVersion: store.storefrontVersion ?? 0,
      manifest: store.manifest ?? null,
      heroSource: store.heroSource ?? null,
      navSource: store.navSource ?? null,
    }
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: UpdateStoreDto,
    @Headers('authorization') authorization?: string,
  ) {
    return this.storeService.update(id, body, authorization)
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    return this.storeService.delete(id, authorization)
  }

  @Post(':id/regenerate')
  @HttpCode(200)
  async regenerateStorefront(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    await this.storeService.regenerateStorefrontCodeForOwner(id, authorization)
    return { success: true, message: 'Storefront regeneration queued' }
  }
}
