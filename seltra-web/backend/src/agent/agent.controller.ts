//apps/api/src/agent/agent.controller.ts
import { Body, Controller, HttpCode, Post, Res } from '@nestjs/common'
import type { Response } from 'express'
import { AgentService } from './agent.service'

class BuildStoreDto {
  prompt!: string
}

class AgentMessageDto {
  storeId!: string
  message!: string
  conversationId?: string
}

@Controller('seltra/agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('build')
  @HttpCode(200)
  buildStore(@Body() body: BuildStoreDto) {
    return this.agentService.buildStore(body.prompt)
  }

  @Post('message')
  @HttpCode(200)
  sendMessage(@Body() body: AgentMessageDto) {
    return this.agentService.sendMessage(body.storeId, body.message, body.conversationId)
  }

  @Post('stream')
  @HttpCode(200)
  async streamMessage(@Body() body: AgentMessageDto, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')

    const result = await this.agentService.sendMessage(
      body.storeId,
      body.message,
      body.conversationId,
    )

    for (const chunk of result.reply.match(/.{1,32}(\s|$)/g) ?? [result.reply]) {
      res.write(`data: ${JSON.stringify({ chunk, conversationId: result.conversationId })}\n\n`)
    }

    res.write(`data: ${JSON.stringify({ conversationId: result.conversationId, actions: result.actions })}\n\n`)
    res.write('data: [DONE]\n\n')
    res.end()
  }
}
