//seltra-web/frontend/components/storefront/sections/ProductCard.tsx
'use client'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { ShoppingBag } from 'lucide-react'
import type { StoreProduct } from './types'

function GradientTile({ name, seed }: { name: string; seed: string }) {
  const hash = [...seed].reduce((a, c) => a + c.charCodeAt(0), 0)
  const angle = hash % 360
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ background: `linear-gradient(${angle}deg, var(--store-accent-soft), var(--store-surface))` }}
    >
      <span
        className="select-none text-[2.25rem] font-bold opacity-[0.12]"
        style={{ fontFamily: 'var(--store-heading-font), serif', color: 'var(--store-accent)' }}
      >
        {name.slice(0, 2).toUpperCase()}
      </span>
    </div>
  )
}

// Trim long product names to at most 3 words + ellipsis
function trimProductName(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length <= 4) return name
  return words.slice(0, 4).join(' ') + '…'
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

export function ProductCard({
  product, showCategory = true, compact = false,
  index = 0, isBestseller = false, onAddToCart, onViewDetail,
}: Props) {
  const imgUrl = product.images?.find((i) => i.isPrimary)?.url ?? product.images?.[0]?.url ?? ''
  const hasImg = imgUrl && !imgUrl.startsWith('data:')
  const price = Number(product.price).toFixed(2)
  const displayName = trimProductName(product.name)

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: [0.4, 0, 0.2, 1] }}
      className="store-product-card group flex flex-col"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return
        onViewDetail?.(product)
      }}
      style={{ cursor: onViewDetail ? 'pointer' : 'default' }}
    >
      {/* Image — square 1:1 */}
      <div
        className="relative overflow-hidden"
        style={{ aspectRatio: '1 / 1', background: 'var(--store-accent-soft)' }}
      >
        {hasImg ? (
          <Image
            src={imgUrl}
            alt={displayName}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            sizes="(max-width:640px) 50vw,(max-width:1024px) 33vw,25vw"
          />
        ) : (
          <GradientTile name={product.name} seed={product.id} />
        )}

        {isBestseller && (
          <span className="store-badge-bestseller">Bestseller</span>
        )}

        {/* Quick-add on hover */}
        <button
          onClick={() => onAddToCart(product)}
          className="absolute bottom-3 left-1/2 flex -translate-x-1/2 translate-y-2 items-center gap-1.5 rounded-full px-4 py-1.5 text-[0.72rem] font-bold opacity-0 shadow-lg transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100"
          style={{ background: 'var(--store-text)', color: 'var(--store-bg)', whiteSpace: 'nowrap' }}
        >
          + Add
        </button>
      </div>

      {/* Details */}
      <div className="flex flex-1 flex-col gap-1 p-3">
        {showCategory && product.category && (
          <span className="store-eyebrow" style={{ color: 'var(--store-accent)' }}>
            {product.category}
          </span>
        )}

        <h3
          className="text-sm font-bold leading-snug"
          style={{
            fontFamily: 'var(--store-heading-font), serif',
            color: 'var(--store-text)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {displayName}
        </h3>

        {!compact && product.description && (
          <p
            className="text-[0.72rem] leading-relaxed"
            style={{
              color: 'var(--store-muted)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {product.description}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between pt-2">
          <span
            className="text-sm font-extrabold"
            style={{ fontFamily: 'var(--store-heading-font), serif', color: 'var(--store-accent)' }}
          >
            {product.currency} {price}
          </span>
          <button
            onClick={() => onAddToCart(product)}
            className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[0.68rem] font-bold transition-all duration-150"
            style={{
              background: 'var(--store-accent-soft)',
              color: 'var(--store-accent)',
              border: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--store-accent)'
              e.currentTarget.style.color = 'var(--store-accent-text)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--store-accent-soft)'
              e.currentTarget.style.color = 'var(--store-accent)'
            }}
          >
            <ShoppingBag style={{ width: '0.7rem', height: '0.7rem' }} /> Add
          </button>
        </div>
      </div>
    </motion.article>
  )
}