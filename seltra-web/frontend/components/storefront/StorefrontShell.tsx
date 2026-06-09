//seltra-web/frontend/components/storefront/StorefrontShell.tsx
'use client'
import { useState, useRef, useEffect, type ReactNode } from 'react'
import { Monitor, Smartphone, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

const DESIGN_WIDTH = 1280
const BASE = process.env.NEXT_PUBLIC_STOREFRONT_URL ?? ''

export function StorefrontShell({ slug, children }: { slug: string; children: ReactNode }) {
  const [device, setDevice] = useState<'desktop'|'mobile'>('desktop')
  const wrapRef = useRef<HTMLDivElement>(null); const [scale, setScale] = useState(1)

  useEffect(() => {
    if (device !== 'desktop') return
    const compute = () => { if (wrapRef.current) setScale(Math.min(1, wrapRef.current.getBoundingClientRect().width / DESIGN_WIDTH)) }
    compute(); const ro = new ResizeObserver(compute); if (wrapRef.current) ro.observe(wrapRef.current); return () => ro.disconnect()
  }, [device])

  return (
    <div className="flex h-full min-h-0 flex-col bg-card/20">
      <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-card/40 px-3 py-2">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-wider text-primary">{'// your store'}</div>
          <div className="truncate font-mono text-[11px] text-muted-foreground">{slug}.seltra.store</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border bg-background/70 p-0.5">
            {(['desktop','mobile'] as const).map((d) => (
              <button key={d} onClick={() => setDevice(d)} className={`flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors ${device===d?'bg-primary/15 text-primary':'hover:text-foreground'}`}>
                {d==='desktop'?<Monitor className="h-3.5 w-3.5" />:<Smartphone className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" asChild>
            <Link href={`${BASE}/store/${slug}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /> Open store</Link>
          </Button>
        </div>
      </div>
      <div className="relative flex-1 overflow-hidden bg-muted/10">
        <div className="absolute inset-0 overflow-y-auto overflow-x-hidden p-2">
          {device==='mobile' ? (
            <div className="mx-auto w-[390px] overflow-hidden rounded-xl border border-border bg-background shadow-xl">{children}</div>
          ) : (
            <div ref={wrapRef} className="w-full overflow-hidden rounded-xl border border-border bg-background shadow-xl">
              <div style={{ width:DESIGN_WIDTH, transformOrigin:'top left', transform:`scale(${scale})` }}
                ref={(el) => { if (!el) return; const u = () => { if (el.parentElement) el.parentElement.style.height=`${el.scrollHeight*scale}px` }; u(); const ro = new ResizeObserver(u); ro.observe(el) }}>
                {children}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
