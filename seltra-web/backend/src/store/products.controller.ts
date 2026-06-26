import {
  Body, Controller, Delete, Get, Headers, HttpCode,
  Param, Patch, Post,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { prisma } from '../db'
import { UnauthorizedException, NotFoundException } from '@nestjs/common'

class UpsertProductDto {
  name!: string
  description?: string
  price!: string
  currency?: string
  category?: string
  sku?: string
}

@Controller('seltra/store/:storeId/products')
export class ProductsController {
  constructor(private readonly jwtService: JwtService) {}

 @Get()
  async list(@Param('storeId') storeId: string, @Headers('authorization') auth?: string) {
    const tenant = await this.assertOwner(storeId, auth)
    return prisma.product.findMany({
      where: { tenantId: tenant.id },
      include: { images: true, variants: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  @Post()
  async create(
    @Param('storeId') storeId: string,
    @Body() body: UpsertProductDto,
    @Headers('authorization') auth?: string,
  ) {
    const tenant = await this.assertOwner(storeId, auth)
    return prisma.product.create({
      data: {
        tenantId: tenant.id,
        name: body.name,
        description: body.description,
        price: body.price,
        currency: body.currency ?? 'GHS',
        category: body.category,
        sku: body.sku,
        status: 'active',
        tags: [],
      },
      include: { images: true, variants: true },
    })
  }

  @Patch(':productId')
  async update(
    @Param('storeId') storeId: string,
    @Param('productId') productId: string,
    @Body() body: Partial<UpsertProductDto>,
    @Headers('authorization') auth?: string,
  ) {
    const tenant = await this.assertOwner(storeId, auth)
    const product = await prisma.product.findFirst({ where: { id: productId, tenantId: tenant.id } })
    if (!product) throw new NotFoundException('Product not found')
    return prisma.product.update({
      where: { id: productId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.price !== undefined && { price: body.price }),
        ...(body.currency !== undefined && { currency: body.currency }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.sku !== undefined && { sku: body.sku }),
      },
      include: { images: true, variants: true },
    })
  }

  @Delete(':productId')
  @HttpCode(200)
  async remove(
    @Param('storeId') storeId: string,
    @Param('productId') productId: string,
    @Headers('authorization') auth?: string,
  ) {
    const tenant = await this.assertOwner(storeId, auth)
    const product = await prisma.product.findFirst({ where: { id: productId, tenantId: tenant.id } })
    if (!product) throw new NotFoundException('Product not found')
    await prisma.product.delete({ where: { id: productId } })
    return { success: true, id: productId }
  }

  
private async assertOwner(storeId: string, authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '')
    if (!token) throw new UnauthorizedException('Missing token')
    let userId: string
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(token, {
        secret: process.env.JWT_SECRET || 'change-me',
      })
      userId = payload.sub
    } catch {
      throw new UnauthorizedException('Invalid token')
    }
    // Support both UUID and slug
    const tenant = await prisma.tenant.findFirst({
      where: { OR: [{ id: storeId }, { slug: storeId }], ownerId: userId },
    })
    if (!tenant) throw new NotFoundException('Store not found')
    return tenant
  }
}