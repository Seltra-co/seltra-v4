import { Body, Controller, Get, Headers, Post, Query } from '@nestjs/common'
import { PaymentService } from './payment.service'

class InitializePaymentDto {
  tenantId!: string
  items!: Array<{
    productId?: string
    product?: { id?: string; name?: string; price?: string | number }
    name?: string
    quantity: number
    price?: string | number
  }>
  customerEmail!: string
  customerName?: string
  customerPhone?: string
  shippingAddress?: string
  shippingCity?: string
  shippingCountry?: string
  marketingOptIn?: boolean
  callbackUrl?: string
}

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('initialize')
  initialize(@Body() body: InitializePaymentDto) {
    return this.paymentService.initializePayment(
      body.tenantId,
      body.items,
      body.customerEmail,
      body.customerName,
      {
        customerPhone: body.customerPhone,
        shippingAddress: body.shippingAddress,
        shippingCity: body.shippingCity,
        shippingCountry: body.shippingCountry,
        marketingOptIn: body.marketingOptIn,
      },
      body.callbackUrl,
    )
  }

  @Get('ledger')
  ledger(@Headers('authorization') authorization?: string, @Query('tenantId') tenantId?: string) {
    return this.paymentService.getMerchantLedger(authorization, tenantId)
  }

  @Get('sales')
  sales(
    @Headers('authorization') authorization: string | undefined,
    @Query('tenantId') tenantId?: string,
    @Query('page') page = '1',
    @Query('perPage') perPage = '20',
  ) {
    return this.paymentService.getMerchantSales(
      authorization,
      Number(page) || 1,
      Number(perPage) || 20,
      tenantId,
    )
  }

  @Get('orders')
  orders(
    @Headers('authorization') authorization: string | undefined,
    @Query('tenantId') tenantId?: string,
    @Query('page') page = '1',
    @Query('perPage') perPage = '20',
  ) {
    return this.paymentService.getMerchantSales(
      authorization,
      Number(page) || 1,
      Number(perPage) || 20,
      tenantId,
    )
  }

  @Get('customers')
  customers(
    @Headers('authorization') authorization: string | undefined,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.paymentService.getMerchantCustomers(authorization, tenantId)
  }

  @Get('verify')
  verify(@Query('reference') reference: string) {
    return this.paymentService.verifyPayment(reference)
  }
}
