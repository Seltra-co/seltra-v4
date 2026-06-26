//apps/api/src/main.ts
import { NestFactory } from '@nestjs/core'
import { Logger } from '@nestjs/common'
import { AppModule } from './app.module'
import * as bodyParser from 'body-parser'

async function bootstrap() {
  const logger = new Logger('Bootstrap')
  const app = await NestFactory.create(AppModule)

  // Raise JSON + raw body limits to handle base64 image uploads (default is 100kb)
  app.use(bodyParser.json({ limit: '15mb' }))
  app.use(bodyParser.urlencoded({ limit: '15mb', extended: true }))

  app.enableCors({
    origin: ['http://localhost:3000', 'https://seltra.co', 'https://www.seltra.co', 'https://seltra-merchant.vercel.app/'],

    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders:['Content-Type', 'Authorization'],
    credentials: true,
  })
  app.setGlobalPrefix('api/v1')

  //Graceful shutdown — lets Render drain requests before killing the process
  app.enableShutdownHooks()

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001
  await app.listen(port)

  const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`
  logger.log(`Seltra API is running on port ${port}`)
  logger.log(`Health endpoint: ${baseUrl}/api/v1/health`)
  logger.log(`Keep-alive cron: self-ping every 14 minutes`)
}

bootstrap()
