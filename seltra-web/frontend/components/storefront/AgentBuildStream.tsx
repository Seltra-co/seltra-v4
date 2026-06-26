//seltra-web/frontend/components/storefront/AgentBuildStream.tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import { Check, Loader2, Brain, Package, Palette, CreditCard, Rocket, Zap } from 'lucide-react'

const STEP_DEFS = [
  { key:'intent',    label:'Understanding your business', sub:'Extracting brand DNA from your prompt',  icon:Brain    },
  { key:'blueprint', label:'Reasoning about your store',  sub:'Selecting layout, theme, and sections', icon:Zap      },
  { key:'products',  label:'Building your catalog',       sub:'Generating 20+ launch-ready products',    icon:Package  },
  { key:'brand',     label:'Designing your brand',        sub:'Palette, fonts, and visual identity',   icon:Palette  },
  { key:'payments',  label:'Setting up payments',         sub:'Wiring Paystack for GHS checkout',      icon:CreditCard },
  { key:'deploy',    label:'Deploying your storefront',   sub:'Publishing to yourstore.seltra.co',     icon:Rocket   },
]

const LINES: Record<string, string[]> = {
  intent:    ['→ reading business prompt...', '  extracting: industry, audience, tone', '  mapping brand personality signals...', '✓ business DNA locked'],
  blueprint: ['→ selecting layout template...', '  matching composition rules...', '  resolving section order and hierarchy...', '✓ storefront blueprint ready'],
  products:  ['→ generating product catalog...', '  naming + pricing 8 SKUs', '  assigning categories and images...', '✓ catalog generated'],
  brand:     ['→ building brand identity...', '  primary color · fonts · spacing', '  deriving accent soft palette...', '✓ brand kit applied'],
  payments:  ['→ connecting Paystack...', '  GHS + mobile money enabled', '  wiring checkout callbacks...', '✓ checkout ready'],
  deploy:    ['→ publishing storefront...', '  running critic + refinement loop...', '  edge deploy complete', '✓ store is live'],
}

export function AgentBuildStream({
  storeName,
  buildSteps,
  isBuilding,
}: {
  storeName: string
  buildSteps: Array<{ label: string; done: boolean }>
  isBuilding: boolean
}) {
  const [lines, setLines] = useState<string[]>([])
  const [visibleStepIndex, setVisibleStepIndex] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isBuilding) return
    setLines([])
    setVisibleStepIndex(0)

    let stepIdx = 0
    let lineIdx = 0

    const tick = () => {
      if (stepIdx >= STEP_DEFS.length) return
      const key = STEP_DEFS[stepIdx]?.key
      if (!key) return

      const stepLines = LINES[key] ?? []

      if (lineIdx < stepLines.length) {
        const line = stepLines[lineIdx]
        if (typeof line === 'string') {
          setLines((prev) => [...prev.slice(-40), line])
        }
        lineIdx++
        timerRef.current = setTimeout(tick, 1200)
      } else {
        stepIdx++
        lineIdx = 0
        setVisibleStepIndex(stepIdx)
        if (stepIdx < STEP_DEFS.length) {
          timerRef.current = setTimeout(tick, 900)
        }
      }
    }

    timerRef.current = setTimeout(tick, 400)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [isBuilding])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [lines])

  const done = buildSteps.filter((s) => s.done).length
  const pct  = Math.round((done / Math.max(buildSteps.length, 1)) * 100)

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-primary opacity-70">{'// agent is building'}</div>
          <div className="mt-0.5 truncate text-base font-semibold">{storeName || 'Your store'}</div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-400" />
          <span className="font-mono text-[11px] text-yellow-400">WORKING</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-primary transition-all duration-700"
          style={{ width: `${Math.max(pct, Math.round((visibleStepIndex / STEP_DEFS.length) * 100))}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {STEP_DEFS.map((def, i) => {
          const isDone   = i < visibleStepIndex
          const isActive = i === visibleStepIndex && isBuilding
          const Icon     = def.icon
          return (
            <div
              key={def.key}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all duration-300 ${
                isDone   ? 'opacity-50' :
                isActive ? 'border border-primary/25 bg-primary/10' :
                           'opacity-20'
              }`}
            >
              <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border ${
                isDone   ? 'border-primary/40 text-primary' :
                isActive ? 'border-primary text-primary' :
                           'border-border text-muted-foreground'
              }`}>
                {isDone   ? <Check className="h-3.5 w-3.5" /> :
                 isActive ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
                            <Icon className="h-3.5 w-3.5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className={`truncate font-medium ${
                  isDone   ? 'text-foreground/60' :
                  isActive ? 'text-foreground' :
                             'text-muted-foreground'
                }`}>
                  {def.label}
                </div>
                {isActive && (
                  <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{def.sub}</div>
                )}
              </div>
              {isDone && <span className="font-mono text-[10px] text-primary">✓</span>}
            </div>
          )
        })}
      </div>

      {/* Terminal log */}
     <div
        ref={scrollRef}
        className="overflow-y-auto rounded-xl border border-border bg-card/30 p-4 font-mono text-[11px] space-y-1"
        style={{ minHeight: 120, maxHeight: 220 }}
      >
        {lines.length === 0 && (
          <span className="text-muted-foreground">
            $ initialising agent<span className="animate-pulse">_</span>
          </span>
        )}
        {lines.map((l, i) => (
          <div
            key={i}
            className={
              l.startsWith('✓') ? 'text-primary' :
              l.startsWith('→') ? 'text-foreground/80' :
              'text-muted-foreground'
            }
          >
            {l}
          </div>
        ))}
        {isBuilding && <span className="text-muted-foreground animate-pulse">_</span>}
      </div>
    </div>
  )
}