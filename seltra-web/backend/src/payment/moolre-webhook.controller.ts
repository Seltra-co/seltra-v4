// import { Body, Controller, HttpCode, Post } from '@nestjs/common'
// import { PaymentService } from './payment.service'
// import type { MoolreWebhookBody } from './moolre.service'

// @Controller('webhooks/moolre')
// export class MoolreWebhookController {
//   constructor(private readonly paymentService: PaymentService) {}

//   @Post()
//   @HttpCode(200)
//   handle(@Body() body: MoolreWebhookBody) {
//     return this.paymentService.handleMoolreWebhook(body)
//   }
// }
// import { Body, Controller, Get, HttpCode, Post, Query, Res } from '@nestjs/common'
// import { Response } from 'express'
// import { PaymentService } from './payment.service'
// import type { MoolreWebhookBody } from './moolre.service'

// //@route /webhooks/moolre
// @Controller('webhooks/moolre')
// export class MoolreWebhookController {
//   constructor(private readonly paymentService: PaymentService) {}

//   /**
//    * POST — Moolre server-to-server webhook (authoritative payment confirmation)
//    */
//   @Post()
//   @HttpCode(200)
//   handle(@Body() body: MoolreWebhookBody) {
//     return this.paymentService.handleMoolreWebhook(body)
//   }

//   /**
//    * GET — Browser redirect after customer completes payment on Moolre POS page.
//    * NOT authoritative — just bounces the browser to the frontend success page.
//    * Moolre appends: ?status=success&reference=seltra_xxx
//    */
//   @Get()
//   redirect(
//     @Query('status') status: string,
//     @Query('reference') reference: string,
//     @Res() res: Response,
//   ) {
//     const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000'
//     // Extract the store slug from the reference: seltra_{slug}_{ts}_{rand}
//     const slug = reference?.split('_')[1] || ''

//     if (status === 'success' && reference) {
//       return res.redirect(
//         `${frontendBase}/store/${slug}/order/success?reference=${encodeURIComponent(reference)}`,
//       )
//     }

//     return res.redirect(
//       `${frontendBase}/store/${slug}/order/failed?reference=${encodeURIComponent(reference ?? '')}`,
//     )
//   }
// }
import { Body, Controller, Get, HttpCode, Post, Query, Res } from '@nestjs/common'
import { Response } from 'express'
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

  @Get()
  redirect(
    @Query('status') status: string,
    @Query('reference') reference: string,
    @Res() res: Response,
  ) {
    // reference format: seltra_{slug}_{timestamp}_{rand}
    // slug may contain hyphens but NOT underscores (generateReference uses tenant.slug)
    // So: drop first segment "seltra", drop last two segments (ts + rand), rejoin remainder
    const parts = (reference ?? '').split('_')
    // parts: ["seltra", ...slugParts..., "1782492502871", "d5a8d542"]
    const slug = parts.length >= 4 ? parts.slice(1, -2).join('_') : ''

    const frontendBase = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '')

    console.log(`[Moolre] Redirect GET: status=${status} reference=${reference} slug=${slug}`)

    if (status === 'success' && reference) {
      return res.redirect(
        `${frontendBase}/store/${slug}/order/success?reference=${encodeURIComponent(reference)}`,
      )
    }

    return res.redirect(
      `${frontendBase}/store/${slug}/order/failed?reference=${encodeURIComponent(reference ?? '')}`,
    )
  }
}