'use client'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { ArrowRight, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { StoreProduct } from './types'

const container = { hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } } }
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.4, 0, 0.2, 1] } } }
const imgReveal = { hidden: { opacity: 0, scale: 1.04 }, show: { opacity: 1, scale: 1, transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] } } }

function isValidImageUrl(url?: string | null) {
  if (!url) return false

  return (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:image')
  )
}

function getHeroImg(products: StoreProduct[]) {
  for (const p of products) {
    const u =
      p.images?.find((i) => i.isPrimary)?.url ??
      p.images?.[0]?.url

    if (isValidImageUrl(u)) return u
  }

  return null
}

function Eyebrow({ text }: { text: string }) {
  return <motion.div variants={item}><Badge variant="secondary" className="font-mono text-[0.6rem] uppercase tracking-widest px-2.5 py-1" style={{ background:'var(--store-accent-soft)', color:'var(--store-accent)', borderRadius:'var(--store-radius-full)' }}>{text}</Badge></motion.div>
}

function Pills({ features }: { features: string[] }) {
  if (!features.length) return null
  return <motion.div variants={item} className="flex flex-wrap gap-2 pt-1">{features.slice(0,4).map((f) => <span key={f} className="rounded-full border px-2.5 py-0.5 text-[0.68rem] opacity-60" style={{ borderColor:'var(--store-border)', color:'var(--store-text)', borderRadius:'var(--store-radius-full)' }}>{f}</span>)}</motion.div>
}

function CTA({ label = 'Shop now' }: { label?: string }) {
  return (
    <motion.div variants={item}>
      <Button className="store-btn-primary gap-2 px-6 py-2.5 text-sm" style={{ background:'var(--store-accent)', color:'var(--store-accent-text)', borderRadius:'var(--store-radius-full)' }}>
        {label} <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </motion.div>
  )
}

// Floating stat/review badge — the Epoche/On-running reference motif: a small
// elevated card sitting on top of the hero image, not baked into it.
function FloatingStatCard({ position = 'bottom-left' }: { position?: 'bottom-left' | 'top-right' }) {
  const pos = position === 'top-right'
    ? { top: '1.25rem', right: '1.25rem' }
    : { bottom: '1.25rem', left: '1.25rem' }
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="store-stat-card absolute hidden md:flex"
      style={{ ...pos, minWidth: '10rem' }}
    >
      <div className="flex items-center gap-1" style={{ color: 'var(--store-accent)' }}>
        {[...Array(5)].map((_, i) => <Star key={i} className="h-3 w-3 fill-current" />)}
      </div>
      <span className="store-stat-card__number" style={{ fontSize: '1.1rem' }}>Loved by customers</span>
      <span className="store-stat-card__label">Real reviews, real orders</span>
    </motion.div>
  )
}

// Decorative organic blob — the child.com / Anthropologie reference accent
// shape. Pure CSS/SVG, themed off accentSecondary so it doesn't fight the
// hero image or headline.
function HeroBlob({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <path
        fill="var(--store-accent-secondary, var(--store-accent))"
        opacity="0.16"
        d="M45.3,-58.5C58.6,-49.6,68.9,-34.9,72.4,-18.6C75.9,-2.3,72.6,15.6,64.1,30.6C55.6,45.6,41.9,57.7,26.1,64.2C10.3,70.7,-7.6,71.6,-24.4,66.6C-41.2,61.6,-56.9,50.7,-65.8,35.6C-74.7,20.5,-76.8,1.2,-72.5,-15.9C-68.2,-33,-57.5,-47.9,-43.6,-56.8C-29.7,-65.7,-14.9,-68.6,1.5,-70.6C17.8,-72.6,32,-67.4,45.3,-58.5Z"
        transform="translate(100 100)"
      />
    </svg>
  )
}

type S = { type: string; headline: string; tagline?: string; subtext?: string; eyebrow?: string; ctaLabel?: string }
interface Props {
  section: S
  products: StoreProduct[]
  features: string[]
  storeName: string
  heroImageUrl?: string
}

export function HeroSection({
    section,
    products,
    features,
    heroImageUrl,
}: Props) {
  const imgUrl = isValidImageUrl(heroImageUrl)
  ? heroImageUrl
  : getHeroImg(products)
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
    <section className="relative grid min-h-[clamp(55vh,70vh,85vh)] overflow-hidden border-b md:grid-cols-2" style={{ background:'var(--store-bg)', borderColor:'var(--store-border)' }}>
      <HeroBlob className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 md:h-80 md:w-80" />

      <motion.div variants={container} initial="hidden" animate="show" className="relative z-10 flex flex-col justify-center gap-5 px-[clamp(1.5rem,5vw,4rem)] py-16">
        <motion.div variants={item}>
          <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium" style={{ borderColor:'var(--store-border)', background:'var(--store-surface)', color:'var(--store-muted)', borderRadius:'var(--store-radius-full)' }}>
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

        <motion.div variants={item} className="flex flex-wrap items-center gap-3 pt-1">
          <Button className="store-btn-primary gap-2 px-6 py-2.5 text-sm" style={{ background:'var(--store-accent)', color:'var(--store-accent-text)', borderRadius:'var(--store-radius-full)' }}>
            {section.ctaLabel ?? 'Shop now'} <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <Button className="store-btn-outline gap-2 px-5 py-2.5 text-sm" style={{ borderRadius:'var(--store-radius-full)' }}>
            See collection
          </Button>
        </motion.div>

        <motion.div variants={item} className="flex flex-wrap gap-4 pt-1">
          {['Free delivery', 'Secure checkout', 'Easy returns'].map((label) => (
            <span key={label} className="store-trust-item">
              <span style={{ color:'var(--store-accent)' }}>✓</span> {label}
            </span>
          ))}
        </motion.div>
      </motion.div>

      <motion.div variants={imgReveal} initial="hidden" animate="show" className="relative min-h-[300px] p-4 md:p-6">
        <div
          className="relative h-full w-full overflow-hidden"
          style={{ borderRadius: 'var(--store-radius-2xl)', boxShadow: 'var(--store-shadow)' }}
        >
          {imgUrl
            ? <Image src={imgUrl} alt={section.headline} fill className="object-cover" priority />
            : <div className="absolute inset-0" style={{ background:`linear-gradient(135deg, var(--store-accent-soft), var(--store-surface))` }} />
          }
        </div>
        <FloatingStatCard position="bottom-left" />
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
        <Button className="store-btn-primary gap-2 px-6 py-2.5 text-sm" style={{ background:'var(--store-accent)', color:'var(--store-accent-text)', borderRadius:'var(--store-radius-full)' }}>
          {section.ctaLabel ?? 'Shop now'} <ArrowRight className="h-3.5 w-3.5" />
        </Button>
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

  // hero-centered (default) — the child.com / Epoche reference: large rounded
  // gradient card behind the content instead of a flat full-bleed background,
  // with a floating rating badge in the corner.
  return (
    <section className="relative overflow-hidden px-4 pt-6 md:px-6" style={{ background:'var(--store-bg)' }}>
      <div
        className="store-hero-gradient-card store-hero-mesh relative flex min-h-[clamp(60vh,75vh,88vh)] items-center justify-center overflow-hidden text-center"
        style={{ borderRadius: 'var(--store-radius-2xl)', boxShadow: 'var(--store-shadow)' }}
      >
        {imgUrl && (
          <motion.div variants={imgReveal} initial="hidden" animate="show" className="absolute inset-0 z-0">
            <Image src={imgUrl} alt="" fill className="object-cover object-center opacity-[0.14]" priority aria-hidden />
          </motion.div>
        )}
        <motion.div variants={container} initial="hidden" animate="show" className="relative z-10 flex max-w-3xl flex-col items-center gap-4 px-6 py-20">
          {section.eyebrow && <Eyebrow text={section.eyebrow} />}
          <motion.h1 variants={item} className="store-heading text-[clamp(3rem,9vw,6.5rem)] font-black leading-none">{section.headline}</motion.h1>
          {section.tagline && <motion.p variants={item} className="text-[clamp(0.95rem,2vw,1.15rem)] font-semibold" style={{ color:'var(--store-muted)' }}>{section.tagline}</motion.p>}
          {section.subtext  && <motion.p variants={item} className="max-w-prose text-[0.9375rem] leading-relaxed" style={{ color:'var(--store-muted)' }}>{section.subtext}</motion.p>}
          <Pills features={features} />
          <motion.div variants={item} className="flex flex-wrap items-center justify-center gap-3">
            <Button className="store-btn-primary gap-2 px-6 py-2.5 text-sm" style={{ background:'var(--store-accent)', color:'var(--store-accent-text)', borderRadius:'var(--store-radius-full)' }}>
              {section.ctaLabel ?? 'Shop now'} <ArrowRight className="h-3.5 w-3.5" />
            </Button>
            <Button className="store-btn-outline gap-2 px-5 py-2.5 text-sm" style={{ borderRadius:'var(--store-radius-full)' }}>
              Browse all
            </Button>
          </motion.div>
        </motion.div>
        <FloatingStatCard position="top-right" />
      </div>
    </section>
  )
}