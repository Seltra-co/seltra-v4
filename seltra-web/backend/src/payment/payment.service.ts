//seltra/backend/src/payment/payment.service.ts
import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Prisma } from '@prisma/client'
import { createHmac, randomBytes } from 'crypto'
import { prisma } from '../db'
import { PaystackService } from './paystack.service'

type CheckoutItem = {
  productId?: string
  product?: { id?: string; name?: string; price?: string | number }
  name?: string
  quantity: number
  price?: string | number
}

type CustomerDetails = {
  customerPhone?: string
  shippingAddress?: string
  shippingCity?: string
  shippingCountry?: string
  marketingOptIn?: boolean
}

type WebhookPayload = {
  event?: string
  data?: {
    reference?: string
    status?: string
    amount?: number
    currency?: string
    customer?: { email?: string; first_name?: string; last_name?: string }
    metadata?: {
      tenantId?: string
      tenantSlug?: string
      customerName?: string
      customerPhone?: string
      shippingAddress?: string
      shippingCity?: string
      shippingCountry?: string
      marketingOptIn?: boolean
      items?: CheckoutItem[]
      cart?: CheckoutItem[]
    }
  }
}

type WebhookMetadata = NonNullable<NonNullable<WebhookPayload['data']>['metadata']>

export type { WebhookPayload }

@Injectable()
export class PaymentService {
  constructor(
    private readonly paystackService: PaystackService,
    private readonly jwtService: JwtService,
  ) {}

  generateReference(tenantSlug: string) {
    const random = randomBytes(4).toString('hex')
    return `seltra_${tenantSlug}_${Date.now()}_${random}`
  }

  parseReference(ref: string): { tenantSlug: string } | null {
    const parts = ref.split('_')
    if (parts.length < 4 || parts[0] !== 'seltra' || !parts[1] || !parts[2]) return null
    return { tenantSlug: parts[1] }
  }

  async initializePayment(
    tenantId: string,
    items: CheckoutItem[],
    customerEmail: string,
    customerName?: string,
    customerDetails: CustomerDetails = {},
    callbackUrl?: string,
  ) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
    if (!tenant) throw new NotFoundException('Store not found')

    const normalizedItems = this.normalizeItems(items)
    const totalAmount = normalizedItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const reference = this.generateReference(tenant.slug)
    const currency = 'GHS'
    const authorization = await this.paystackService.initializeTransaction({
      email: customerEmail,
      amount: Math.round(totalAmount * 100),
      currency,
      reference,
      callback_url: callbackUrl,
      metadata: {
        tenantId,
        tenantSlug: tenant.slug,
        customerName,
        ...customerDetails,
        items: normalizedItems,
      },
    })

    const customer = await this.upsertCustomer(tenantId, customerEmail, customerName, customerDetails)

    const order = await prisma.order.create({
      data: {
        tenantId,
        customerId: customer.id,
        customerEmail,
        customerName: customerName || '',
        customerPhone: customerDetails.customerPhone,
        shippingAddress: customerDetails.shippingAddress,
        shippingCity: customerDetails.shippingCity,
        shippingCountry: customerDetails.shippingCountry,
        marketingOptIn: Boolean(customerDetails.marketingOptIn),
        totalAmount,
        currency,
        status: 'pending',
        paystackRef: reference,
        items: normalizedItems as unknown as Prisma.InputJsonValue,
      },
    })

    return {
      authorization_url: authorization.authorization_url,
      authorizationUrl: authorization.authorization_url,
      reference,
      orderId: order.id,
    }
  }

  async handleWebhook(payload: WebhookPayload, paystackSignature?: string) {
    this.verifyWebhookSignature(payload, paystackSignature)

    const event = payload.event || ''
    const reference = payload.data?.reference
    if (!reference) return { received: true }

    const parsed = this.parseReference(reference)
    const grossAmount = new Prisma.Decimal((payload.data?.amount || 0) / 100)
    const existing = await prisma.paystackEvent.upsert({
      where: { reference },
      update: { rawPayload: payload as Prisma.InputJsonValue },
      create: {
        reference,
        event,
        tenantSlug: parsed?.tenantSlug || payload.data?.metadata?.tenantSlug,
        tenantId: payload.data?.metadata?.tenantId,
        amount: grossAmount,
        currency: payload.data?.currency || 'GHS',
        customerEmail: payload.data?.customer?.email,
        customerName: payload.data?.metadata?.customerName || this.customerNameFromPayload(payload),
        rawPayload: payload as Prisma.InputJsonValue,
      },
    })

    if (existing.processed) return { received: true }

    if (event === 'charge.success' && payload.data?.status === 'success') {
      const tenant = await prisma.tenant.findFirst({
        where: {
          OR: [
            { slug: parsed?.tenantSlug || '' },
            { id: payload.data.metadata?.tenantId || '' },
          ],
        },
      })
      if (!tenant) throw new NotFoundException('Tenant for Paystack reference not found')

      const items = this.normalizeItems(payload.data.metadata?.items || payload.data.metadata?.cart || [])
      const existingOrder = await prisma.order.findFirst({ where: { paystackRef: reference } })
      const customerEmail = payload.data.customer?.email || existingOrder?.customerEmail || ''
      const customerName = payload.data.metadata?.customerName || this.customerNameFromPayload(payload)
      const customerDetails = this.customerDetailsFromMetadata(payload.data.metadata)
      const customer = customerEmail
        ? await this.upsertCustomer(tenant.id, customerEmail, customerName, customerDetails)
        : null
      const order = existingOrder
        ? await prisma.order.update({
            where: { id: existingOrder.id },
            data: {
              customerId: customer?.id ?? existingOrder.customerId,
              status: 'paid',
              totalAmount: grossAmount,
              currency: payload.data.currency || 'GHS',
              customerEmail,
              customerName,
              customerPhone: customerDetails.customerPhone,
              shippingAddress: customerDetails.shippingAddress,
              shippingCity: customerDetails.shippingCity,
              shippingCountry: customerDetails.shippingCountry,
              marketingOptIn: Boolean(customerDetails.marketingOptIn),
              items: items as unknown as Prisma.InputJsonValue,
            },
          })
        : await prisma.order.create({
            data: {
          tenantId: tenant.id,
          customerId: customer?.id,
          customerEmail,
          customerName,
          customerPhone: customerDetails.customerPhone,
          shippingAddress: customerDetails.shippingAddress,
          shippingCity: customerDetails.shippingCity,
          shippingCountry: customerDetails.shippingCountry,
          marketingOptIn: Boolean(customerDetails.marketingOptIn),
          totalAmount: grossAmount,
          currency: payload.data.currency || 'GHS',
          status: 'paid',
          paystackRef: reference,
          items: items as unknown as Prisma.InputJsonValue,
        },
          })

      await this.creditMerchantLedger(tenant.id, order.id, grossAmount, reference)
    }

    return { received: true }
  }

  async verifyPayment(reference: string) {
    if (!reference) throw new BadRequestException('Missing payment reference')

    const verification = await this.paystackService.verifyTransaction(reference)
    if (!verification.status || verification.data?.status !== 'success') {
      return {
        success: false,
        status: verification.data?.status || 'unknown',
        message: verification.message || 'Payment has not been confirmed by Paystack',
      }
    }

    const existingOrder = await prisma.order.findFirst({ where: { paystackRef: reference } })
    const parsed = this.parseReference(reference)
    const tenant = existingOrder
      ? await prisma.tenant.findUnique({ where: { id: existingOrder.tenantId } })
      : await prisma.tenant.findFirst({ where: { slug: parsed?.tenantSlug || '' } })
    if (!tenant) throw new NotFoundException('Tenant for Paystack reference not found')

    const metadata = verification.data.metadata || {}
    const customerEmail = verification.data.customer?.email || existingOrder?.customerEmail || ''
    if (!customerEmail) throw new BadRequestException('Paystack verification did not include a customer email')

    const customerName =
      this.stringFromMeta(metadata, 'customerName') ||
      existingOrder?.customerName ||
      [verification.data.customer?.first_name, verification.data.customer?.last_name].filter(Boolean).join(' ')
    const customerDetails = this.customerDetailsFromRecord(metadata)
    const customer = await this.upsertCustomer(tenant.id, customerEmail, customerName, customerDetails)
    const grossAmount = new Prisma.Decimal((verification.data.amount || 0) / 100)
    const currency = verification.data.currency || existingOrder?.currency || 'GHS'
    const items = this.checkoutItemsFromMetadata(metadata, existingOrder?.items)

    const order = existingOrder
      ? await prisma.order.update({
          where: { id: existingOrder.id },
          data: {
            customerId: customer.id,
            customerEmail,
            customerName,
            customerPhone: customerDetails.customerPhone,
            shippingAddress: customerDetails.shippingAddress,
            shippingCity: customerDetails.shippingCity,
            shippingCountry: customerDetails.shippingCountry,
            marketingOptIn: Boolean(customerDetails.marketingOptIn),
            totalAmount: grossAmount,
            currency,
            status: 'paid',
            items: items as unknown as Prisma.InputJsonValue,
          },
        })
      : await prisma.order.create({
          data: {
            tenantId: tenant.id,
            customerId: customer.id,
            customerEmail,
            customerName,
            customerPhone: customerDetails.customerPhone,
            shippingAddress: customerDetails.shippingAddress,
            shippingCity: customerDetails.shippingCity,
            shippingCountry: customerDetails.shippingCountry,
            marketingOptIn: Boolean(customerDetails.marketingOptIn),
            totalAmount: grossAmount,
            currency,
            status: 'paid',
            paystackRef: reference,
            items: items as unknown as Prisma.InputJsonValue,
          },
        })

    await prisma.paystackEvent.upsert({
      where: { reference },
      update: {
        event: 'charge.success',
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        amount: grossAmount,
        currency,
        customerEmail,
        customerName,
        rawPayload: verification as unknown as Prisma.InputJsonValue,
      },
      create: {
        reference,
        event: 'charge.success',
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        amount: grossAmount,
        currency,
        customerEmail,
        customerName,
        rawPayload: verification as unknown as Prisma.InputJsonValue,
      },
    })

    await this.creditMerchantLedger(tenant.id, order.id, grossAmount, reference)
    const refreshedOrder = await prisma.order.findUnique({ where: { id: order.id } })

    return {
      success: true,
      order: refreshedOrder ? { ...refreshedOrder, items: this.parseJsonItems(refreshedOrder.items) } : order,
    }
  }

  async creditMerchantLedger(
    tenantId: string,
    orderId: string,
    grossAmountInput: Prisma.Decimal | number,
    reference?: string,
  ) {
    const grossAmount = new Prisma.Decimal(grossAmountInput)
    const feePercent = new Prisma.Decimal(process.env.SELTRA_FEE_PERCENT || 0)
    const seltraFee = grossAmount.mul(feePercent).div(100)
    const merchantAmount = grossAmount.minus(seltraFee)

    const existingTx = await prisma.ledgerTransaction.findFirst({ where: { orderId, type: 'credit' } })
    if (existingTx) {
      await prisma.paystackEvent.updateMany({ where: { reference }, data: { processed: true, tenantId } })
      return existingTx
    }

    const ledger = await prisma.merchantLedger.upsert({
      where: { tenantId },
      update: {
        balance: { increment: merchantAmount },
      },
      create: {
        tenantId,
        balance: merchantAmount,
        currency: 'GHS',
      },
    })

    const tx = await prisma.ledgerTransaction.create({
      data: {
        ledgerId: ledger.id,
        orderId,
        type: 'credit',
        amount: merchantAmount,
        currency: 'GHS',
        description: `Order payment credited${reference ? ` (${reference})` : ''}`,
        meta: { grossAmount, seltraFee, reference } as unknown as Prisma.InputJsonValue,
      },
    })

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'paid',
        disbursed: false,
        merchantAmount,
        seltraFee,
      },
    })
    await prisma.paystackEvent.updateMany({ where: { reference }, data: { processed: true, tenantId } })

    return tx
  }

  async getMerchantLedger(authorization?: string, tenantId?: string) {
    const resolvedTenantId = await this.resolveTenantId(authorization, tenantId)
    const ledger = await prisma.merchantLedger.upsert({
      where: { tenantId: resolvedTenantId },
      update: {},
      create: { tenantId: resolvedTenantId, balance: 0, currency: 'GHS' },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    })
    return ledger
  }

  async getMerchantSales(authorization: string | undefined, page = 1, perPage = 20, tenantId?: string) {
    const resolvedTenantId = await this.resolveTenantId(authorization, tenantId)
    const skip = (page - 1) * perPage
    const where = { tenantId: resolvedTenantId, status: 'paid' }
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: perPage,
      }),
      prisma.order.count({ where }),
    ])
    return {
      data: orders.map((order) => ({ ...order, items: order.items })),
      total,
      page,
      perPage,
    }
  }

  async getMerchantCustomers(authorization?: string, tenantId?: string) {
    const resolvedTenantId = await this.resolveTenantId(authorization, tenantId)
    const customers = await prisma.customer.findMany({
      where: { tenantId: resolvedTenantId },
      include: {
        orders: {
          where: { status: { in: ['paid', 'processing', 'shipped', 'delivered'] } },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return customers.map((customer) => {
      const totalSpent = customer.orders.reduce(
        (sum, order) => sum.add(order.totalAmount),
        new Prisma.Decimal(0),
      )
      const lastOrder = customer.orders[0]

      return {
        id: customer.id,
        tenantId: customer.tenantId,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        city: customer.city,
        country: customer.country,
        marketingOptIn: customer.marketingOptIn,
        orderCount: customer.orders.length,
        totalSpent,
        currency: lastOrder?.currency || 'GHS',
        lastOrderAt: lastOrder?.createdAt,
        isRecurring: customer.orders.length > 1,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
      }
    })
  }

  async resolveTenantId(authorization?: string, requestedTenantId?: string) {
    const userId = await this.userIdFromAuth(authorization)
    if (requestedTenantId) {
      const tenant = await prisma.tenant.findFirst({ where: { id: requestedTenantId, ownerId: userId } })
      if (!tenant) throw new NotFoundException('Store not found')
      return tenant.id
    }

    const tenant = await prisma.tenant.findFirst({
      where: { ownerId: userId },
      orderBy: { updatedAt: 'desc' },
    })
    if (!tenant) throw new NotFoundException('No store found for this merchant')
    return tenant.id
  }

  private normalizeItems(items: CheckoutItem[]) {
    return (items || []).map((item) => {
      const product = item.product || {}
      const price = Number(item.price ?? product.price ?? 0)
      const quantity = Number(item.quantity || 1)
      return {
        productId: item.productId || product.id,
        productName: item.name || product.name || 'Product',
        quantity,
        price,
      }
    })
  }

  private verifyWebhookSignature(payload: WebhookPayload, signature?: string) {
    const secret = process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY
    if (!secret) return
    const expected = createHmac('sha512', secret).update(JSON.stringify(payload)).digest('hex')
    if (!signature || signature !== expected) throw new UnauthorizedException('Invalid Paystack signature')
  }

  private async upsertCustomer(
    tenantId: string,
    email: string,
    name?: string,
    details: CustomerDetails = {},
  ) {
    const normalizedEmail = email.trim().toLowerCase()
    return prisma.customer.upsert({
      where: {
        tenantId_email: {
          tenantId,
          email: normalizedEmail,
        },
      },
      update: {
        name: name || undefined,
        phone: details.customerPhone || undefined,
        address: details.shippingAddress || undefined,
        city: details.shippingCity || undefined,
        country: details.shippingCountry || undefined,
        marketingOptIn: Boolean(details.marketingOptIn),
      },
      create: {
        tenantId,
        email: normalizedEmail,
        name: name || '',
        phone: details.customerPhone,
        address: details.shippingAddress,
        city: details.shippingCity,
        country: details.shippingCountry,
        marketingOptIn: Boolean(details.marketingOptIn),
      },
    })
  }

  private customerDetailsFromMetadata(metadata?: WebhookMetadata): CustomerDetails {
    return {
      customerPhone: metadata?.customerPhone,
      shippingAddress: metadata?.shippingAddress,
      shippingCity: metadata?.shippingCity,
      shippingCountry: metadata?.shippingCountry,
      marketingOptIn: Boolean(metadata?.marketingOptIn),
    }
  }

  private customerDetailsFromRecord(metadata?: Record<string, unknown>): CustomerDetails {
    return {
      customerPhone: this.stringFromMeta(metadata, 'customerPhone'),
      shippingAddress: this.stringFromMeta(metadata, 'shippingAddress'),
      shippingCity: this.stringFromMeta(metadata, 'shippingCity'),
      shippingCountry: this.stringFromMeta(metadata, 'shippingCountry'),
      marketingOptIn: Boolean(metadata?.marketingOptIn),
    }
  }

  private checkoutItemsFromMetadata(metadata?: Record<string, unknown>, fallback?: unknown) {
    const items = Array.isArray(metadata?.items) ? metadata.items : Array.isArray(metadata?.cart) ? metadata.cart : fallback
    return this.parseJsonItems(items)
  }

  private parseJsonItems(items: unknown) {
    return Array.isArray(items) ? items : []
  }

  private stringFromMeta(metadata: Record<string, unknown> | undefined, key: string) {
    const value = metadata?.[key]
    return typeof value === 'string' ? value : undefined
  }

  private async userIdFromAuth(authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '')
    if (!token) throw new UnauthorizedException('Missing bearer token')
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(token, {
        secret: process.env.JWT_SECRET || 'change-me',
      })
      return payload.sub
    } catch {
      throw new UnauthorizedException('Invalid bearer token')
    }
  }

  private customerNameFromPayload(payload: WebhookPayload) {
    return [payload.data?.customer?.first_name, payload.data?.customer?.last_name].filter(Boolean).join(' ')
  }
}
