import { Body, Controller, HttpCode, Post } from '@nestjs/common'
import { PaymentService } from './payment.service'
import type { MoolreWebhookBody } from './moolre.service'

@Controller('webhooks/moolre')
export class MoolreWebhookController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @HttpCode(200)
  handle(@Body() body: MoolreWebhookBody) {
    return this.paymentService.handleMoolreWebhook(body)
  }
}
