//seltra/backend/src/payment/moolre.service.ts
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
    txid?: string          
    reference?: string 
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
  private readonly businessEmail = process.env.MOOLRE_BUSINESS_EMAIL || process.env.MOOLRE_API_USER || ''

  // private publicHeaders() {
  //   return {
  //     'X-API-USER': this.apiUser,
  //     'X-API-PUBKEY': this.apiPubKey,
  //     'Content-Type': 'application/json',
  //   }
  // }

  // private privateHeaders() {
  //   return {
  //     'X-API-USER': this.apiUser,
  //     'X-API-KEY': this.apiKey,
  //     'Content-Type': 'application/json',
  //   }
  // }
  private publicHeaders() {
  const headers: Record<string, string> = {
    'X-API-USER': this.apiUser,
    'Content-Type': 'application/json',
  }
  // In sandbox, X-API-PUBKEY is not required and can cause errors if wrong
  if (process.env.MOOLRE_SANDBOX !== 'true' && this.apiPubKey) {
    headers['X-API-PUBKEY'] = this.apiPubKey
  }
  return headers
}

private privateHeaders() {
  const headers: Record<string, string> = {
    'X-API-USER': this.apiUser,
    'Content-Type': 'application/json',
  }
  // In sandbox, X-API-KEY is not required
  if (process.env.MOOLRE_SANDBOX !== 'true' && this.apiKey) {
    headers['X-API-KEY'] = this.apiKey
  }
  return headers
}

  /**
   * Generate a hosted Moolre POS payment link.
   * Endpoint: POST /embed/link
   * Returns authorization_url like https://pos.moolre.com/xxxxx
   */
  async generatePaymentLink(params: {
    amount: number
    reference: string
    callbackUrl: string
    redirectUrl?: string
  }): Promise<MoolrePaymentLinkResponse> {
    try {
      const body = {
        type: 1,
        amount: String(params.amount),
        email: this.businessEmail,
        externalref: params.reference,
        callback: params.callbackUrl,
        redirect: params.redirectUrl || params.callbackUrl,
        reusable: '0',
        currency: 'GHS',
        accountnumber: this.accountNumber,
      }

      console.log('[Moolre] generatePaymentLink request:', JSON.stringify({ ...body, accountnumber: '***' }))

      const res = await fetch(`${MOOLRE_BASE}/embed/link`, {
        method: 'POST',
        headers: this.publicHeaders(),
        body: JSON.stringify(body),
      })

      const raw = await res.json().catch(() => null)
      console.log('[Moolre] generatePaymentLink response:', JSON.stringify(raw))

      if (!raw || raw.status !== 1) {
        return {
          success: false,
          reference: params.reference,
          error: raw?.message || `Moolre payment link generation failed (code: ${raw?.code})`,
        }
      }

      // Response: { status:1, code:"POS09", data: { authorization_url, reference } }
      const paymentUrl = raw.data?.authorization_url as string | undefined

      if (!paymentUrl) {
        return {
          success: false,
          reference: params.reference,
          error: 'Moolre returned success but no authorization_url in response',
        }
      }

      return {
        success: true,
        paymentUrl,
        reference: raw.data?.reference || params.reference,
        moolreId: raw.data?.reference,
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

  /**
   * Check payment status by externalref.
   * Endpoint: POST /open/transact/status
   */
  async checkPaymentStatus(externalref: string): Promise<MoolreStatusResponse> {
    try {
      const res = await fetch(`${MOOLRE_BASE}/open/transact/status`, {
        method: 'POST',
        headers: this.privateHeaders(),
        body: JSON.stringify({
          type: 1,
          idtype: '1', // 1 = externalref
          id: externalref,
          accountnumber: this.accountNumber,
        }),
      })

      const raw = await res.json().catch(() => null)
      console.log('[Moolre] checkPaymentStatus response:', JSON.stringify(raw))

      if (!raw || raw.status !== 1) {
        return {
          success: false,
          status: 'pending', // treat unknown as pending, not failed
          error: raw?.message || 'Status check failed',
        }
      }

      const txstatus = raw.data?.txstatus as number | undefined
      // txstatus: 1=success, 2=failed, 0/undefined=pending
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
        status: 'pending',
        error: err instanceof Error ? err.message : 'Unknown error',
      }
    }
  }
}