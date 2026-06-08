'use client'
import { motion } from 'framer-motion'

export function BrandStory({ headline, body, stat, statLabel, layout }: { headline: string; body: string; stat?: string; statLabel?: string; layout: 'text-left' | 'text-center' }) {
  const c = layout === 'text-center'
  return (
    <section className="storefront-section border-t" style={{ borderColor:'var(--store-border)' }}>
      <div className={`max-w-2xl ${c ? 'mx-auto text-center' : ''}`}>
        <motion.h2 initial={{ opacity:0, y:16 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ duration:0.5 }} className="store-heading mb-4 text-[clamp(1.6rem,3vw,2.25rem)] font-bold">{headline}</motion.h2>
        <motion.p initial={{ opacity:0, y:12 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ duration:0.5, delay:0.1 }} className="leading-[1.85] text-[0.9375rem]" style={{ color:'var(--store-muted)' }}>{body}</motion.p>
        {stat && <motion.div initial={{ opacity:0 }} whileInView={{ opacity:1 }} viewport={{ once:true }} transition={{ duration:0.5, delay:0.2 }} className="mt-6">
          <div className="store-heading text-5xl font-bold" style={{ color:'var(--store-accent)' }}>{stat}</div>
          {statLabel && <div className="store-eyebrow mt-1">{statLabel}</div>}
        </motion.div>}
      </div>
    </section>
  )
}
