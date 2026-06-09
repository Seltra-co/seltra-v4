'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { ArrowRight } from 'lucide-react'

export function Newsletter({ headline, subtext, placeholder='Enter your email' }: { headline: string; subtext: string; placeholder?: string }) {
  const [submitted, setSubmitted] = useState(false)
  const [value, setValue]         = useState('')
  return (
    <section className="storefront-section" style={{ background:'var(--store-accent-soft)', borderTop:'1px solid var(--store-border)' }}>
      <div className="mx-auto max-w-lg text-center">
        <h2 className="store-heading mb-2 text-[clamp(1.5rem,3vw,2rem)] font-bold" style={{ color:'var(--store-text)' }}>{headline}</h2>
        <p className="mb-6 text-sm" style={{ color:'var(--store-muted)' }}>{subtext}</p>
        {submitted ? (
          <motion.p initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} className="font-semibold" style={{ color:'var(--store-accent)' }}>✓ You&apos;re in. Welcome.</motion.p>
        ) : (
          <div className="flex gap-2">
            <Input type="email" value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} onKeyDown={(e) => e.key==='Enter' && value.includes('@') && setSubmitted(true)} className="flex-1 border bg-white text-sm" style={{ borderColor:'var(--store-border)', borderRadius:'var(--store-radius)' }} />
            <button onClick={() => value.includes('@') && setSubmitted(true)} className="store-btn-primary flex items-center gap-1.5 px-4 py-2 text-sm">Subscribe <ArrowRight className="h-3.5 w-3.5" /></button>
          </div>
        )}
        <p className="mt-3 text-[0.7rem]" style={{ color:'var(--store-muted)' }}>No spam. Unsubscribe anytime.</p>
      </div>
    </section>
  )
}
