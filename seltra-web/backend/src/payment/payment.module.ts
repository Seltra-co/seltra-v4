// seltra/backend/src/payment/payment.module.ts
import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PaymentController } from './payment.controller'
import { PaymentService } from './payment.service'
import { PaystackService } from './paystack.service'
import { PaystackWebhookController } from './paystack-webhook.controller'
import { MoolreService } from './moolre.service'
import { MoolreWebhookController } from './moolre-webhook.controller'

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'change-me',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [PaymentController, PaystackWebhookController, MoolreWebhookController],
  providers: [PaymentService, PaystackService, MoolreService],
  exports: [PaymentService],
})
export class PaymentModule {}