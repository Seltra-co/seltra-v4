'use client'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { CheckCircle, ShoppingBag, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'

export default function OrderSuccessPage() {
  const params = useParams<{ slug: string }>()

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
          Thank you for your purchase. You will receive a receipt by email shortly.
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
