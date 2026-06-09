'use client'
import { Check } from 'lucide-react'
export function TrustBar({ items }: { items: string[] }) {
  const safe = items?.length ? items : ['Secure checkout','Fast delivery','Easy returns','Local support']
  return (
    <section className="storefront-section-tight flex flex-wrap items-center justify-center gap-x-8 gap-y-3 border-y" style={{ borderColor:'var(--store-border)' }}>
      {safe.map((item) => <div key={item} className="store-trust-item"><Check className="h-3.5 w-3.5 flex-shrink-0" style={{ color:'var(--store-accent)' }} />{item}</div>)}
    </section>
  )
}
