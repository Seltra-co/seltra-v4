//apps/api/src/agent/agent.module.ts
import { Module } from '@nestjs/common'
import { AgentController } from './agent.controller'
import { AgentService } from './agent.service'
import { StoreModule } from '../store/store.module'

@Module({
  imports: [StoreModule],
  controllers: [AgentController],
  providers: [AgentService],
})
export class AgentModule {}
