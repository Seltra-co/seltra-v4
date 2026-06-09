'use client'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { StoreProduct } from './types'

const container = { hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } } }
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.4, 0, 0.2, 1] } } }
const imgReveal = { hidden: { opacity: 0, scale: 1.04 }, show: { opacity: 1, scale: 1, transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] } } }

function getHeroImg(products: StoreProduct[]) {
  for (const p of products) { const u = p.images?.find((i) => i.isPrimary)?.url ?? p.images?.[0]?.url ?? ''; if (u && !u.startsWith('data:')) return u }
  return null
}
function Eyebrow({ text }: { text: string }) {
  return <motion.div variants={item}><Badge variant="secondary" className="font-mono text-[0.6rem] uppercase tracking-widest px-2.5 py-1" style={{ background:'var(--store-accent-soft)', color:'var(--store-accent)' }}>{text}</Badge></motion.div>
}
function Pills({ features }: { features: string[] }) {
  if (!features.length) return null
  return <motion.div variants={item} className="flex flex-wrap gap-2 pt-1">{features.slice(0,4).map((f) => <span key={f} className="rounded-full border px-2.5 py-0.5 text-[0.68rem] opacity-60" style={{ borderColor:'var(--store-border)', color:'var(--store-text)' }}>{f}</span>)}</motion.div>
}
function CTA({ label = 'Shop now' }: { label?: string }) {
  return <motion.div variants={item}><Button className="store-btn-primary gap-2 px-6 py-2.5 text-sm" style={{ background:'var(--store-accent)', color:'var(--store-accent-text)', borderRadius:'var(--store-radius)' }}>{label} <ArrowRight className="h-3.5 w-3.5" /></Button></motion.div>
}

type S = { type: string; headline: string; tagline?: string; subtext?: string; eyebrow?: string; ctaLabel?: string }
interface Props { section: S; products: StoreProduct[]; features: string[]; storeName: string }

export function HeroSection({ section, products, features }: Props) {
  const imgUrl = getHeroImg(products)
  const t = section.type

  if (t === 'hero-minimal') return (
    <section className="flex min-h-[clamp(40vh,50vh,65vh)] items-center border-b" style={{ background:'var(--store-bg)', borderColor:'var(--store-border)' }}>
      <motion.div variants={container} initial="hidden" animate="show" className="flex max-w-2xl flex-col gap-3 px-[clamp(1.5rem,5vw,4rem)]">
        {section.eyebrow && <Eyebrow text={section.eyebrow} />}
        <motion.h1 variants={item} className="store-heading text-[clamp(2.5rem,5vw,4rem)] font-light tracking-tighter">{section.headline}</motion.h1>
        {section.subtext && <motion.p variants={item} className="text-sm leading-relaxed" style={{ color:'var(--store-muted)' }}>{section.subtext}</motion.p>}
        <CTA label={section.ctaLabel} />
      </motion.div>
    </section>
  )

  if (t === 'hero-split') return (
    <section className="grid min-h-[clamp(55vh,70vh,85vh)] overflow-hidden border-b md:grid-cols-2" style={{ background:'var(--store-bg)', borderColor:'var(--store-border)' }}>
      {/* Left: copy column */}
      <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col justify-center gap-5 px-[clamp(1.5rem,5vw,4rem)] py-16">
        {/* Trust pill */}
        <motion.div variants={item}>
          <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium" style={{ borderColor:'var(--store-border)', background:'var(--store-surface)', color:'var(--store-muted)' }}>
            <span style={{ color:'var(--store-accent)' }}>✦</span>
            {section.eyebrow ?? 'Trusted by customers'}
          </span>
        </motion.div>

        <motion.h1 variants={item} className="store-heading text-[clamp(2.75rem,5.5vw,4.5rem)] font-black text-balance">
          {section.headline}
        </motion.h1>

        {section.tagline && (
          <motion.p variants={item} className="text-base font-semibold" style={{ color:'var(--store-muted)' }}>
            {section.tagline}
          </motion.p>
        )}
        {section.subtext && (
          <motion.p variants={item} className="max-w-md text-sm leading-relaxed" style={{ color:'var(--store-muted)' }}>
            {section.subtext}
          </motion.p>
        )}

        <Pills features={features} />

        {/* CTA row: primary + outline */}
        <motion.div variants={item} className="flex flex-wrap items-center gap-3 pt-1">
          <Button className="store-btn-primary gap-2 px-6 py-2.5 text-sm" style={{ background:'var(--store-accent)', color:'var(--store-accent-text)', borderRadius:'var(--store-radius)' }}>
            {section.ctaLabel ?? 'Shop now'} <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <Button className="store-btn-outline gap-2 px-5 py-2.5 text-sm" style={{ borderRadius:'var(--store-radius)' }}>
            See collection
          </Button>
        </motion.div>

        {/* Inline trust signals */}
        <motion.div variants={item} className="flex flex-wrap gap-4 pt-1">
          {['Free delivery', 'Secure checkout', 'Easy returns'].map((t) => (
            <span key={t} className="store-trust-item">
              <span style={{ color:'var(--store-accent)' }}>✓</span> {t}
            </span>
          ))}
        </motion.div>
      </motion.div>

      {/* Right: image column */}
      <motion.div variants={imgReveal} initial="hidden" animate="show" className="relative min-h-[300px]">
        {imgUrl
          ? <Image src={imgUrl} alt={section.headline} fill className="object-cover" priority />
          : <div className="absolute inset-0" style={{ background:`linear-gradient(135deg, var(--store-accent-soft), var(--store-surface))` }} />
        }

        {/* Floating stat card - desktop only */}
        <div className="store-stat-card absolute bottom-6 left-6 hidden md:flex" style={{ minWidth:'9rem' }}>
          <span className="store-stat-card__number">4.9★</span>
          <span className="store-stat-card__label">Customer rating</span>
        </div>
      </motion.div>
    </section>
  )

  if (t === 'hero-fullbleed') return (
    <section className="relative flex min-h-[clamp(70vh,85vh,100vh)] items-end justify-center overflow-hidden text-center">
      <div className="absolute inset-0 z-0" style={{ background:'linear-gradient(to top, #050505 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.2) 100%)' }} />
      {imgUrl && <motion.div variants={imgReveal} initial="hidden" animate="show" className="absolute inset-0 z-[-1]"><Image src={imgUrl} alt="" fill className="object-cover opacity-40" priority aria-hidden /></motion.div>}
      <motion.div variants={container} initial="hidden" animate="show" className="relative z-10 flex max-w-5xl flex-col items-center gap-5 px-6 pb-16 pt-24" style={{ color:'#ffffff' }}>
        {section.eyebrow && <motion.div variants={item}><span className="font-mono text-[0.65rem] uppercase tracking-widest opacity-60">{section.eyebrow}</span></motion.div>}
        <motion.h1 variants={item} className="font-black leading-none tracking-tight" style={{ fontFamily:'var(--store-heading-font), serif', fontSize:'clamp(4rem,14vw,10rem)', textShadow:'0 2px 32px rgba(0,0,0,0.3)' }}>{section.headline}</motion.h1>
        {section.tagline && <motion.p variants={item} className="text-[clamp(0.95rem,2vw,1.1rem)] font-semibold opacity-80">{section.tagline}</motion.p>}
        {section.subtext  && <motion.p variants={item} className="max-w-lg text-sm leading-relaxed opacity-60">{section.subtext}</motion.p>}
        <CTA label={section.ctaLabel} />
      </motion.div>
    </section>
  )

  if (t === 'hero-editorial') return (
    <section className="relative flex min-h-[clamp(60vh,75vh,90vh)] items-center overflow-hidden" style={{ background:'var(--store-bg)' }}>
      {imgUrl ? (
        <motion.div variants={imgReveal} initial="hidden" animate="show" className="absolute inset-0 z-0">
          <Image src={imgUrl} alt="" fill className="object-cover object-right" priority aria-hidden />
          <div className="absolute inset-0" style={{ background:`linear-gradient(to right, var(--store-bg) 30%, color-mix(in srgb, var(--store-bg) 60%, transparent) 60%, transparent 100%)` }} />
        </motion.div>
      ) : <div className="store-hero-mesh absolute inset-0 z-0" />}
      <motion.div variants={container} initial="hidden" animate="show" className="relative z-10 flex max-w-2xl flex-col gap-5 px-[clamp(1.5rem,5vw,4rem)] py-20">
        {section.eyebrow && <Eyebrow text={section.eyebrow} />}
        <motion.h1 variants={item} className="store-heading text-[clamp(2.75rem,6vw,5rem)] font-black" style={{ fontStyle:'italic' }}>{section.headline}</motion.h1>
        {section.tagline && <motion.p variants={item} className="text-lg font-medium" style={{ color:'var(--store-muted)' }}>{section.tagline}</motion.p>}
        {section.subtext  && <motion.p variants={item} className="text-sm leading-relaxed" style={{ color:'var(--store-muted)' }}>{section.subtext}</motion.p>}
        <Pills features={features} />
        <CTA label={section.ctaLabel} />
      </motion.div>
    </section>
  )

  // hero-centered (default)
  return (
    <section className="relative flex min-h-[clamp(65vh,80vh,95vh)] items-center justify-center overflow-hidden text-center" style={{ background:'var(--store-bg)' }}>
      <div className="store-hero-mesh absolute inset-0 z-0" />
      {imgUrl && (
        <motion.div variants={imgReveal} initial="hidden" animate="show" className="absolute inset-0 z-0">
          <Image src={imgUrl} alt="" fill className="object-cover object-center opacity-[0.12]" priority aria-hidden />
          <div className="absolute inset-0" style={{ background:`linear-gradient(to bottom, var(--store-bg) 0%, transparent 30%, var(--store-bg) 100%)` }} />
        </motion.div>
      )}
      <motion.div variants={container} initial="hidden" animate="show" className="relative z-10 flex max-w-3xl flex-col items-center gap-4 px-6 py-20">
        {section.eyebrow && <Eyebrow text={section.eyebrow} />}
        <motion.h1 variants={item} className="store-heading text-[clamp(3rem,9vw,6.5rem)] font-black leading-none">{section.headline}</motion.h1>
        {section.tagline && <motion.p variants={item} className="text-[clamp(0.95rem,2vw,1.15rem)] font-semibold" style={{ color:'var(--store-muted)' }}>{section.tagline}</motion.p>}
        {section.subtext  && <motion.p variants={item} className="max-w-prose text-[0.9375rem] leading-relaxed" style={{ color:'var(--store-muted)' }}>{section.subtext}</motion.p>}
        <Pills features={features} />
        {/* CTA row */}
        <motion.div variants={item} className="flex flex-wrap items-center justify-center gap-3">
          <Button className="store-btn-primary gap-2 px-6 py-2.5 text-sm" style={{ background:'var(--store-accent)', color:'var(--store-accent-text)', borderRadius:'var(--store-radius)' }}>
            {section.ctaLabel ?? 'Shop now'} <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <Button className="store-btn-outline gap-2 px-5 py-2.5 text-sm" style={{ borderRadius:'var(--store-radius)' }}>
            Browse all
          </Button>
        </motion.div>
      </motion.div>
    </section>
  )
}
