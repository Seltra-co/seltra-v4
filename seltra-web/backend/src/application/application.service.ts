import { BadRequestException, Injectable } from '@nestjs/common'
import { prisma } from '../db'
import { ApplicationDto, normalizeApplicationDto } from './application.dto'
import { NotionService } from './notion.service'

@Injectable()
export class ApplicationService {
  constructor(private readonly notionService: NotionService) {}

  async submitApplication(dto: ApplicationDto) {
    const data = normalizeApplicationDto(dto)
    const application = await prisma.merchantApplication.create({ data })
    const notionPageId = await this.notionService.createApplicationPage(dto)

    if (notionPageId) {
      await prisma.merchantApplication.update({
        where: { id: application.id },
        data: { notionPageId },
      })
    }

    return { success: true, applicationId: application.id }
  }

  async verifyMerchantId(merchantId: string) {
    const id = merchantId?.trim()
    if (!id) throw new BadRequestException('Missing Merchant ID')

    const application = await prisma.merchantApplication.findFirst({
      where: { merchantId: id, status: 'approved' },
    })

    if (!application) return { valid: false }
    return {
      valid: true,
      businessName: application.businessName,
      storeName: application.storeName,
      fullName: application.fullName,
    }
  }
}
