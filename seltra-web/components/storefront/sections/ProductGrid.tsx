'use client'
import { ProductCard } from './ProductCard'
import type { StoreProduct } from './types'

interface Props { section: { columns: 2|3|4; style: string; limit?: number; showCategory?: boolean; sectionLabel?: string }; products: StoreProduct[]; onAddToCart: (p: StoreProduct) => void }

export function ProductGrid({ section, products, onAddToCart }: Props) {
  const limited  = products.slice(0, section.limit ?? 9)
  const colClass = section.columns===4 ? 'grid-cols-2 md:grid-cols-4' : section.columns===2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'
  return (
    <section className="storefront-section">
      <div className="mb-6 flex items-baseline justify-between">
        <span className="store-eyebrow">{section.sectionLabel ?? 'Products'}</span>
        <span className="store-eyebrow">{products.length} items</span>
      </div>
      <div className={`grid gap-4 ${colClass}`}>
        {limited.map((p, i) => <ProductCard key={p.id} product={p} showCategory={section.showCategory ?? true} index={i} onAddToCart={onAddToCart} />)}
      </div>
    </section>
  )
}
