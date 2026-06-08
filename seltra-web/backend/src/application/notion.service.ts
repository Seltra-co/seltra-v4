import { Injectable, Logger } from '@nestjs/common'
import type { ApplicationDto } from './application.dto'

type NotionProperty =
  | { title: Array<{ text: { content: string } }> }
  | { rich_text: Array<{ text: { content: string } }> }
  | { phone_number: string | null }
  | { email: string | null }
  | { select: { name: string } | null }
  | { checkbox: boolean }
  | { date: { start: string } }
  | { url: string | null }

@Injectable()
export class NotionService {
  private readonly logger = new Logger(NotionService.name)
  private readonly notionVersion = '2022-06-28'

  async createApplicationPage(data: ApplicationDto): Promise<string> {
    const apiKey = process.env.NOTION_API_KEY
    const databaseId = process.env.NOTION_APPLICATIONS_DB_ID
    if (!apiKey || !databaseId) {
      this.logger.warn('Notion credentials missing; application saved without Notion page')
      return ''
    }

    const res = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': this.notionVersion,
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties: this.properties(data),
      }),
    })

    const json = await res.json().catch(() => null)
    if (!res.ok) {
      this.logger.error(`Notion application create failed: ${json?.message || res.statusText}`)
      return ''
    }

    return json?.id || ''
  }

  private properties(data: ApplicationDto): Record<string, NotionProperty> {
    return {
      Name: this.title(data.full_name),
      Phone: { phone_number: data.phone || null },
      Email: { email: data.email || null },
      'Business Name': this.richText(data.business_name),
      'Store Name': this.richText(data.store_name),
      'Business Type': this.select(data.business_type),
      'What You Sell': this.richText(data.what_you_sell),
      'Based In': this.richText(data.based_in),
      'Monthly Revenue': this.select(data.monthly_revenue),
      'Existing Links': this.linkOrText(data.existing_links),
      'AI Familiarity': this.select(data.ai_familiarity),
      'Used AI Before': { checkbox: Boolean(data.ai_used_before) },
      'AI Tools': this.richText(data.ai_tools_used),
      'AI Feelings': this.richText(data.ai_feelings),
      'Allow AI Help': this.select(data.allow_ai_help),
      Status: this.select('Applied'),
      'Applied At': { date: { start: new Date().toISOString() } },
    }
  }

  private title(value?: string): NotionProperty {
    return { title: [{ text: { content: value || 'Untitled application' } }] }
  }

  private richText(value?: string): NotionProperty {
    return { rich_text: value ? [{ text: { content: value } }] : [] }
  }

  private select(value?: string): NotionProperty {
    return { select: value ? { name: value } : null }
  }

  private linkOrText(value?: string): NotionProperty {
    if (!value) return { rich_text: [] }
    const first = value.split(/\s+/).find(Boolean) || ''
    if (/^https?:\/\//i.test(first) && !/\s/.test(value.trim())) return { url: first }
    return this.richText(value)
  }
}
