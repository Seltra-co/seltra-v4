'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { CheckCircle, ShoppingBag, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001'

export default function OrderSuccessPage() {
  const params = useParams<{ slug: string }>()
  const [status, setStatus] = useState('Confirming your payment...')

  useEffect(() => {
    const search = new URLSearchParams(window.location.search)
    const reference = search.get('reference') || search.get('trxref')
    if (!reference) {
      setStatus('Your order is confirmed. Receipt details will follow by email.')
      return
    }

    let cancelled = false
    const verify = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/payment/verify?reference=${encodeURIComponent(reference)}`)
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        setStatus(data?.success ? 'Payment received. Your order is pending fulfillment.' : 'Payment is being confirmed. Receipt details will follow by email.')
      } catch {
        if (!cancelled) setStatus('Payment is being confirmed. Receipt details will follow by email.')
      }
    }
    void verify()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="max-w-md w-full text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="flex justify-center mb-6"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle className="h-10 w-10 text-primary" />
          </div>
        </motion.div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Order confirmed!</h1>
        <p className="text-muted-foreground mb-8">
          {status}
        </p>
        <div className="flex flex-col gap-3">
          <Button asChild className="w-full gap-2">
            <Link href={`/store/${params.slug}`}>
              <ShoppingBag className="h-4 w-4" /> Continue shopping
            </Link>
          </Button>
          <Button variant="outline" asChild className="w-full gap-2">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" /> Back to dashboard
            </Link>
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
