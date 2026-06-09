//seltra-web/frontend/components/storefront/sections/BrandStory.tsx
'use client'
import { motion } from 'framer-motion'

export function BrandStory({ headline, body, stat, statLabel, layout }: {
  headline: string; body: string; stat?: string; statLabel?: string; layout: 'text-left' | 'text-center'
}) {
  const centered = layout === 'text-center'

  return (
    <section
      className="border-t"
      style={{
        borderColor: 'var(--store-border)',
        background: 'var(--store-bg)',
        paddingTop: 'clamp(4rem, 8vh, 6rem)',
        paddingBottom: 'clamp(4rem, 8vh, 6rem)',
        paddingLeft: 'clamp(1rem, 4vw, 2rem)',
        paddingRight: 'clamp(1rem, 4vw, 2rem)',
      }}
    >
      <div className={`grid gap-12 ${centered ? 'place-items-center' : 'lg:grid-cols-[1fr_1fr]'} max-w-5xl ${centered ? 'mx-auto text-center' : ''}`}>
        {/* Text column */}
        <div className={`flex flex-col gap-5 ${centered ? 'items-center max-w-xl' : 'justify-center'}`}>
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="store-eyebrow"
            style={{ color: 'var(--store-accent)' }}
          >
            Our story
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="store-heading text-[clamp(1.75rem,3.5vw,2.75rem)] font-black"
            style={{ lineHeight: 1.05 }}
          >
            {headline}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="text-[0.9375rem] leading-[1.9]"
            style={{ color: 'var(--store-muted)', maxWidth: '50ch' }}
          >
            {body}
          </motion.p>

          {stat && (
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-2"
            >
              <div
                className="store-heading text-5xl font-black"
                style={{ color: 'var(--store-accent)', lineHeight: 1 }}
              >
                {stat}
              </div>
              {statLabel && (
                <div className="store-eyebrow mt-1" style={{ color: 'var(--store-muted)' }}>
                  {statLabel}
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Visual column — decorative block when no stat/image */}
        {!centered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative hidden lg:block"
          >
            <div
              className="aspect-[4/3] w-full rounded-2xl"
              style={{ background: 'var(--store-accent-soft)' }}
            />
            {/* Floating accent card */}
            <div
              className="absolute -bottom-4 -right-4 rounded-xl border px-5 py-4"
              style={{
                background: 'var(--store-surface)',
                borderColor: 'var(--store-border)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
              }}
            >
              <div
                className="store-heading text-2xl font-black"
                style={{ color: 'var(--store-accent)' }}
              >
                100%
              </div>
              <div className="store-eyebrow mt-0.5" style={{ color: 'var(--store-muted)' }}>
                Satisfaction
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  )
}