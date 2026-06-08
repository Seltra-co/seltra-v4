import { Module } from '@nestjs/common'
import { ApplicationController } from './application.controller'
import { ApplicationService } from './application.service'
import { NotionService } from './notion.service'

@Module({
  controllers: [ApplicationController],
  providers: [ApplicationService, NotionService],
})
export class ApplicationModule {}
