//seltra-web/frontend/components/storefront/AgentBuildStream.tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import { Check, Loader2, Brain, Package, Palette, CreditCard, Rocket, Zap } from 'lucide-react'

const STEP_DEFS = [
  { key:'intent',    label:'Understanding your business', sub:'Extracting brand DNA from your prompt',  icon:Brain    },
  { key:'blueprint', label:'Reasoning about your store',  sub:'Selecting layout, theme, and sections', icon:Zap      },
  { key:'products',  label:'Building your catalog',       sub:'Generating 8 launch-ready products',    icon:Package  },
  { key:'brand',     label:'Designing your brand',        sub:'Palette, fonts, and visual identity',   icon:Palette  },
  { key:'payments',  label:'Setting up payments',         sub:'Wiring Paystack for GHS checkout',      icon:CreditCard },
  { key:'deploy',    label:'Deploying your storefront',   sub:'Publishing to yourstore.seltra.store',  icon:Rocket   },
]
const LINES: Record<string,string[]> = {
  intent:    ['→ reading business prompt...','  extracting: industry, audience, tone','✓ business DNA locked'],
  blueprint: ['→ selecting layout template...','  matching composition rules...','✓ storefront blueprint ready'],
  products:  ['→ generating product catalog...','  naming + pricing 8 SKUs','✓ catalog generated'],
  brand:     ['→ building brand identity...','  primary color · fonts · spacing','✓ brand kit applied'],
  payments:  ['→ connecting Paystack...','  GHS + mobile money enabled','✓ checkout ready'],
  deploy:    ['→ publishing storefront...','  edge deploy complete','✓ store is live'],
}

export function AgentBuildStream({ storeName, buildSteps, isBuilding }: { storeName: string; buildSteps: Array<{ label: string; done: boolean }>; isBuilding: boolean }) {
  const [lines, setLines] = useState<string[]>([])
  const [curKey, setCurKey] = useState<string|null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const ai = buildSteps.findIndex((s) => !s.done)
  const activeStep = STEP_DEFS[ai] ?? null

  useEffect(() => {
    if (!isBuilding || !activeStep || activeStep.key === curKey) return
    setCurKey(activeStep.key); const ls = LINES[activeStep.key] ?? []; let i = 0
    const iv = setInterval(() => { if (i >= ls.length) { clearInterval(iv); return }; setLines((p) => [...p.slice(-30), ls[i]]); i++ }, 240)
    return () => clearInterval(iv)
  }, [activeStep, isBuilding, curKey])

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior:'smooth' }) }, [lines])

  const done = buildSteps.filter((s) => s.done).length
  const pct  = Math.round((done / Math.max(buildSteps.length, 1)) * 100)

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <div><div className="font-mono text-[10px] uppercase tracking-wider text-primary opacity-70">{'// agent is building'}</div><div className="mt-0.5 truncate text-sm font-semibold">{storeName||'Your store'}</div></div>
        <div className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-400" /><span className="font-mono text-[10px] text-yellow-400">WORKING</span></div>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width:`${pct}%` }} /></div>
      <div className="space-y-1.5">
        {STEP_DEFS.map((def, i) => {
          const step = buildSteps[i]; const isDone = step?.done ?? false; const isActive = i===ai && isBuilding; const Icon = def.icon
          return (
            <div key={def.key} className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs transition-all ${isDone?'opacity-60':isActive?'border border-primary/20 bg-primary/10':'opacity-30'}`}>
              <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border ${isDone?'border-primary/40 text-primary':isActive?'border-primary text-primary':'border-border text-muted-foreground'}`}>
                {isDone?<Check className="h-3 w-3" />:isActive?<Loader2 className="h-3 w-3 animate-spin" />:<Icon className="h-3 w-3" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className={`truncate font-medium ${isDone?'text-foreground/70':isActive?'text-foreground':'text-muted-foreground'}`}>{def.label}</div>
                {isActive && <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{def.sub}</div>}
              </div>
            </div>
          )
        })}
      </div>
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto rounded-lg border border-border bg-card/30 p-3 font-mono text-[11px] space-y-0.5">
        {lines.length===0&&<span className="text-muted-foreground">$ initialising agent<span className="animate-pulse">_</span></span>}
        {lines.map((l, i) => <div key={i} className={l.startsWith('✓')?'text-primary':l.startsWith('→')?'text-foreground/80':'text-muted-foreground'}>{l}</div>)}
        {isBuilding&&<span className="text-muted-foreground animate-pulse">_</span>}
      </div>
    </div>
  )
}
