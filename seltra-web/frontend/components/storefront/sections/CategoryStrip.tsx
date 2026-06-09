//seltra-web/frontend/components/storefront/sections/CategoryStrip.tsx
'use client'
import { useState } from 'react'
export function CategoryStrip({ categories, headline }: { categories: string[]; headline?: string }) {
  const [active, setActive] = useState('All')
  if (!categories?.length) return null
  return (
    <section className="storefront-section-tight overflow-x-auto border-b" style={{ borderColor:'var(--store-border)' }}>
      {headline && <span className="store-eyebrow mb-2 block">{headline}</span>}
      <div className="flex gap-2">
        {['All', ...categories].map((cat) => (
          <button key={cat} onClick={() => setActive(cat)} className="whitespace-nowrap rounded-full border px-3.5 py-1 text-[0.72rem] font-medium transition-all"
            style={{ borderColor:active===cat?'var(--store-accent)':'var(--store-border)', color:active===cat?'var(--store-accent)':'var(--store-muted)', background:active===cat?'var(--store-accent-soft)':'transparent' }}>
            {cat}
          </button>
        ))}
      </div>
    </section>
  )
}
