//apps/api/src/orders/orders.module.ts
import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { OrdersController } from './orders.controller'
import { OrdersService } from './orders.service'
import { TenantEventsService } from '../internal-ops/events/tenant-events.service'

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'change-me',
    }),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, TenantEventsService],
})
export class OrdersModule {}
