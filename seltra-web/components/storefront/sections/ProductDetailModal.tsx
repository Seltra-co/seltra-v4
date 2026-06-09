'use client'
import { AnimatePresence, motion } from 'framer-motion'
import Image from 'next/image'
import { Check, ShoppingBag, X } from 'lucide-react'
import type { StoreProduct } from './types'

interface Props {
  product: StoreProduct | null
  onClose: () => void
  onAddToCart: (p: StoreProduct) => void
  inCart: boolean
}

export function ProductDetailModal({ product, onClose, onAddToCart, inCart }: Props) {
  const imgUrl = product?.images?.find((i) => i.isPrimary)?.url ?? product?.images?.[0]?.url ?? ''
  const hasImg = imgUrl && !imgUrl.startsWith('data:')

  return (
    <AnimatePresence>
      {product && (
        <>
          <motion.div
            key="pdm-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="store-cart-overlay"
            onClick={onClose}
          />

          <motion.div
            key="pdm-modal"
            initial={{ opacity: 0, scale: 0.97, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 16 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="relative w-full max-w-2xl overflow-hidden rounded-2xl border shadow-2xl"
              style={{ background:'var(--store-surface)', borderColor:'var(--store-border)' }}
            >
              <button
                onClick={onClose}
                className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border opacity-60 transition-opacity hover:opacity-100"
                style={{ borderColor:'var(--store-border)', background:'var(--store-surface)', color:'var(--store-text)' }}
                aria-label="Close product details"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="grid md:grid-cols-2">
                <div className="relative aspect-square overflow-hidden" style={{ background:'var(--store-accent-soft)' }}>
                  {hasImg
                    ? <Image src={imgUrl} alt={product.name} fill className="object-cover" priority />
                    : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-5xl font-bold opacity-15" style={{ fontFamily:'var(--store-heading-font), serif', color:'var(--store-accent)' }}>
                          {product.name.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                    )
                  }
                </div>

                <div className="flex flex-col gap-4 p-6 md:p-8">
                  {product.category && (
                    <span className="store-eyebrow" style={{ color:'var(--store-accent)' }}>{product.category}</span>
                  )}
                  <h2
                    className="store-heading text-2xl font-black leading-tight text-balance"
                    style={{ fontFamily:'var(--store-heading-font), serif' }}
                  >
                    {product.name}
                  </h2>
                  {product.description && (
                    <p className="text-sm leading-relaxed" style={{ color:'var(--store-muted)' }}>
                      {product.description}
                    </p>
                  )}

                  <div className="flex items-baseline gap-2">
                    <span
                      className="text-2xl font-extrabold"
                      style={{ fontFamily:'var(--store-heading-font), serif', color:'var(--store-accent)' }}
                    >
                      {product.currency} {Number(product.price).toFixed(2)}
                    </span>
                  </div>

                  {product.variants && product.variants.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {product.variants.map((v) => (
                        <span
                          key={`${v.name}-${v.value}`}
                          className="rounded-full border px-3 py-1 text-xs"
                          style={{ borderColor:'var(--store-border)', color:'var(--store-muted)' }}
                        >
                          {v.name}: {v.value}
                        </span>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => { onAddToCart(product); onClose() }}
                    className="store-btn-primary mt-auto flex w-full items-center justify-center gap-2 py-3 text-sm font-bold"
                    style={{ borderRadius:'var(--store-radius)' }}
                  >
                    {inCart
                      ? <><Check className="h-4 w-4" /> Added to cart</>
                      : <><ShoppingBag className="h-4 w-4" /> Add to cart</>
                    }
                  </button>

                  <p className="text-center text-[0.68rem]" style={{ color:'var(--store-muted)' }}>
                    Secure checkout | Fast delivery
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
