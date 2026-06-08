'use client'
import { motion } from 'framer-motion'

const REVIEWS = ['Exceptional quality, fast delivery. Already on my second order.','My go-to store. Always consistent, always fresh.',"Best experience shopping local. Will definitely reorder.",'Arrived beautifully packaged. Exactly as described.','Great product, quick shipping, superb service.','Highly recommend to anyone who values quality.']

export function SocialProof({ style, headline, subtext }: { style: 'marquee'|'grid'|'cards'; headline?: string; subtext?: string }) {
  const stars = '★★★★★'
  if (style === 'marquee') return (
    <section className="storefront-section-tight overflow-hidden border-t" style={{ borderColor:'var(--store-border)' }}>
      {headline && <p className="store-eyebrow mb-4 text-center">{headline}</p>}
      <div className="store-marquee-wrap"><div className="store-marquee-inner">
        {[...REVIEWS,...REVIEWS].map((r, i) => <span key={i} className="whitespace-nowrap rounded-full border px-4 py-2 text-[0.8rem]" style={{ borderColor:'var(--store-border)', color:'var(--store-muted)', background:'var(--store-surface)' }}>{r} <span style={{ color:'var(--store-accent)' }}>{stars}</span></span>)}
      </div></div>
    </section>
  )
  return (
    <section className="storefront-section border-t" style={{ borderColor:'var(--store-border)' }}>
      {(headline||subtext) && <div className="mb-8 text-center">{headline && <h2 className="store-heading text-[clamp(1.4rem,3vw,2rem)] font-bold">{headline}</h2>}{subtext && <p className="mt-2 text-sm" style={{ color:'var(--store-muted)' }}>{subtext}</p>}</div>}
      <div className={style==='grid' ? 'grid gap-4 sm:grid-cols-3' : 'flex gap-4 overflow-x-auto pb-2'}>
        {REVIEWS.slice(0, style==='grid'?3:6).map((r, i) => (
          <motion.div key={i} initial={{ opacity:0, y:12 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ duration:0.4, delay:i*0.07 }} className="min-w-[220px] flex-shrink-0 rounded-[var(--store-radius)] border p-5" style={{ borderColor:'var(--store-border)', background:'var(--store-surface)' }}>
            <div className="mb-2 text-sm" style={{ color:'var(--store-accent)' }}>{stars}</div>
            <p className="text-[0.8rem] leading-relaxed" style={{ color:'var(--store-muted)' }}>{r}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
