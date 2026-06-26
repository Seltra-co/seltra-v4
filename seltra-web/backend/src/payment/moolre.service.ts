//moorle
import { Injectable } from '@nestjs/common'

const MOOLRE_BASE = process.env.MOOLRE_SANDBOX === 'true'
  ? 'https://sandbox.moolre.com'
  : 'https://api.moolre.com'

export type MoolrePaymentLinkResponse = {
  success: boolean
  paymentUrl?: string
  reference: string
  moolreId?: string
  error?: string
}

export type MoolreStatusResponse = {
  success: boolean
  status?: 'pending' | 'success' | 'failed'
  txstatus?: number
  transactionid?: string
  externalref?: string
  amount?: string
  error?: string
}

export type MoolreWebhookBody = {
  status: number
  code: string
  message: string
  data?: {
    txstatus?: number
    txtype?: number
    accountnumber?: string
    payer?: string
    payee?: string
    amount?: string
    value?: string
    transactionid?: string
    externalref?: string
    thirdpartyref?: string
    ts?: string
    customerEmail?: string
    customerName?: string
    metadata?: string
  }
}

@Injectable()
export class MoolreService {
  private readonly apiUser = process.env.MOOLRE_API_USER || ''
  private readonly apiKey = process.env.MOOLRE_API_KEY || ''
  private readonly apiPubKey = process.env.MOOLRE_API_PUBKEY || ''
  private readonly accountNumber = process.env.MOOLRE_ACCOUNT_NUMBER || ''

  private privateHeaders() {
    return {
      'X-API-USER': this.apiUser,
      'X-API-KEY': this.apiKey,
      'Content-Type': 'application/json',
    }
  }

  private publicHeaders() {
    return {
      'X-API-USER': this.apiUser,
      'X-API-PUBKEY': this.apiPubKey,
      'Content-Type': 'application/json',
    }
  }

  async generatePaymentLink(params: {
    amount: number
    reference: string
    callbackUrl: string
  }): Promise<MoolrePaymentLinkResponse> {
    try {
      const res = await fetch(`${MOOLRE_BASE}/open/transact/payment`, {
        method: 'POST',
        headers: this.publicHeaders(),
        body: JSON.stringify({
          type: 1,
          amount: String(params.amount),
          callback: params.callbackUrl,
          externalref: params.reference,
          accountnumber: this.accountNumber,
          currency: 'GHS',
        }),
      })

      const raw = await res.json().catch(() => null)
      console.log('[Moolre] generatePaymentLink response:', JSON.stringify(raw))

      if (!raw || raw.status !== 1) {
        return {
          success: false,
          reference: params.reference,
          error: raw?.message || 'Moolre payment link generation failed',
        }
      }

      const link = raw.data?.link as string | undefined

      return {
        success: true,
        paymentUrl: link,
        reference: params.reference,
        moolreId: raw.data?.transactionid,
      }
    } catch (err) {
      console.error('[Moolre] generatePaymentLink error:', err)
      return {
        success: false,
        reference: params.reference,
        error: err instanceof Error ? err.message : 'Unknown error',
      }
    }
  }

  async checkPaymentStatus(externalref: string): Promise<MoolreStatusResponse> {
    try {
      const res = await fetch(`${MOOLRE_BASE}/open/transact/status`, {
        method: 'POST',
        headers: this.privateHeaders(),
        body: JSON.stringify({
          type: 1,
          idtype: '1',
          id: externalref,
          accountnumber: this.accountNumber,
        }),
      })

      const raw = await res.json().catch(() => null)
      console.log('[Moolre] checkPaymentStatus response:', JSON.stringify(raw))

      if (!raw || raw.status !== 1) {
        return {
          success: false,
          status: 'failed',
          error: raw?.message || 'Status check failed',
        }
      }

      const txstatus = raw.data?.txstatus as number | undefined
      const mappedStatus =
        txstatus === 1 ? 'success' : txstatus === 2 ? 'failed' : 'pending'

      return {
        success: true,
        status: mappedStatus,
        txstatus,
        transactionid: raw.data?.transactionid,
        externalref: raw.data?.externalref,
        amount: raw.data?.amount,
      }
    } catch (err) {
      console.error('[Moolre] checkPaymentStatus error:', err)
      return {
        success: false,
        status: 'failed',
        error: err instanceof Error ? err.message : 'Unknown error',
      }
    }
  }
}