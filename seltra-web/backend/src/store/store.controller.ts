import { Body, Controller, Delete, Get, Headers, HttpCode, Param, Patch, Post } from '@nestjs/common'
import { StoreService } from './store.service'

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
  constructor(private readonly storeService: StoreService) {}

  @Post()
  async create(@Body() body: CreateStoreDto, @Headers('authorization') authorization?: string) {
    const store = await this.storeService.create(body, authorization)
    return { store }
  }

  @Get()
  async findMine(@Headers('authorization') authorization?: string) {
    const stores = await this.storeService.findMine(authorization)
    return stores.map((s) => ({
      ...s,
      storefrontCode: s.storefrontCode ?? null,
      storefrontVersion: s.storefrontVersion ?? 0,
    }))
  }

  @Get(':slug')
  async findOne(@Param('slug') slug: string) {
    const store = await this.storeService.findBySlug(slug)
    return {
      ...store,
      storefrontCode: store.storefrontCode ?? null,
      storefrontVersion: store.storefrontVersion ?? 0,
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