'use client'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Plus, ShoppingBag } from 'lucide-react'
import type { StoreProduct } from './types'

function GradientTile({ name, seed }: { name: string; seed: string }) {
  const hash  = [...seed].reduce((a, c) => a + c.charCodeAt(0), 0)
  const angle = hash % 360
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ background:`linear-gradient(${angle}deg, var(--store-accent-soft), var(--store-surface))` }}
    >
      <span
        className="select-none text-[2.5rem] font-bold opacity-15"
        style={{ fontFamily:'var(--store-heading-font), serif', color:'var(--store-accent)' }}
      >
        {name.slice(0, 2).toUpperCase()}
      </span>
    </div>
  )
}

interface Props {
  product: StoreProduct
  showCategory?: boolean
  compact?: boolean
  index?: number
  isBestseller?: boolean
  onAddToCart: (p: StoreProduct) => void
  onViewDetail?: (p: StoreProduct) => void
}

export function ProductCard({ product, showCategory = true, compact = false, index = 0, isBestseller = false, onAddToCart, onViewDetail }: Props) {
  const imgUrl = product.images?.find((i) => i.isPrimary)?.url ?? product.images?.[0]?.url ?? ''
  const hasImg = imgUrl && !imgUrl.startsWith('data:')
  const price  = Number(product.price).toFixed(2)

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: index * 0.07, ease: [0.4, 0, 0.2, 1] }}
      className="store-product-card group flex flex-col"
      onClick={(e) => {
        const target = e.target as HTMLElement
        if (target.closest('button')) return
        onViewDetail?.(product)
      }}
      style={{ cursor: onViewDetail ? 'pointer' : 'default' }}
    >
      {/* Image area */}
      <div className="relative aspect-[4/3] overflow-hidden" style={{ background:'var(--store-accent-soft)' }}>
        {hasImg
          ? <Image src={imgUrl} alt={product.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width:640px) 50vw,(max-width:1024px) 33vw,25vw" />
          : <GradientTile name={product.name} seed={product.id} />
        }

        {isBestseller && (
          <span className="store-badge-bestseller">Bestseller</span>
        )}

        <button
          onClick={() => onAddToCart(product)}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 translate-y-2 flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[0.72rem] font-bold opacity-0 shadow-lg transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100"
          style={{ background:'var(--store-text)', color:'var(--store-bg)' }}
        >
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>

      {/* Details */}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        {showCategory && product.category && (
          <span
            className="store-eyebrow"
            style={{ color:'var(--store-accent)' }}
          >
            {product.category}
          </span>
        )}

        <h3
          className="text-sm font-bold leading-snug"
          style={{ fontFamily:'var(--store-heading-font), serif', color:'var(--store-text)' }}
        >
          {product.name}
        </h3>

        {!compact && product.description && (
          <p className="line-clamp-2 text-[0.73rem] leading-relaxed" style={{ color:'var(--store-muted)' }}>
            {product.description}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex flex-col">
            <span className="text-sm font-extrabold" style={{ fontFamily:'var(--store-heading-font), serif', color:'var(--store-accent)' }}>
              {product.currency} {price}
            </span>
          </div>
          <button
            onClick={() => onAddToCart(product)}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.7rem] font-bold transition-all duration-150"
            style={{ background:'var(--store-accent-soft)', color:'var(--store-accent)', borderRadius:'var(--store-radius-full)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--store-accent)'; e.currentTarget.style.color = 'var(--store-accent-text)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--store-accent-soft)'; e.currentTarget.style.color = 'var(--store-accent)' }}
          >
            <ShoppingBag className="h-3 w-3" /> Add
          </button>
        </div>
      </div>
    </motion.article>
  )
}
