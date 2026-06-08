import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PaymentController } from './payment.controller'
import { PaymentService } from './payment.service'
import { PaystackService } from './paystack.service'
import { PaystackWebhookController } from './paystack-webhook.controller'

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'change-me',
    }),
  ],
  controllers: [PaymentController, PaystackWebhookController],
  providers: [PaymentService, PaystackService],
  exports: [PaymentService],
})
export class PaymentModule {}
