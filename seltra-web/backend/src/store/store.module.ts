import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { StoreController } from './store.controller'
import { StoreService } from './store.service'
import { ProductsController } from './products.controller'
import { CloudinaryController } from './cloudinary.controller'
import { BuildEventsService } from './build-events.service'
import { TenantEventsService } from '../internal-ops/events/tenant-events.service'

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'change-me',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [StoreController, ProductsController, CloudinaryController],
  providers: [StoreService, BuildEventsService, TenantEventsService],
  exports: [StoreService],
})
export class StoreModule {}
