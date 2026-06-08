import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default async function OrderSuccessPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-sm text-center">
        <CheckCircle className="mx-auto mb-4 h-14 w-14 text-primary" />
        <h1 className="mb-2 text-2xl font-bold tracking-tight">Order confirmed!</h1>
        <p className="mb-6 text-sm text-muted-foreground">Thank you for your purchase. Receipt sent by email.</p>
        <Button asChild><Link href={`/store/${slug}`}>Continue shopping</Link></Button>
      </div>
    </div>
  )
}
