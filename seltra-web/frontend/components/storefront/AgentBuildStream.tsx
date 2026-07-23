'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Loader2, Brain, Package, Palette, CreditCard, Rocket, Zap, FileCode2, AlertCircle, Sparkles } from 'lucide-react'
import type { StoreData } from './StorefrontPreview'

type PlanItem = { label: string; detail: string }

type BuildEvent =
  | { type: 'step'; step: string; status: 'started' | 'completed' | 'failed'; label?: string }
  | { type: 'log'; message: string }
  | { type: 'plan'; items: PlanItem[] }
  | { type: 'file'; name: string; status: 'started' | 'completed' | 'failed' }
  | { type: 'chunk'; file: string; content: string }
  | { type: 'preview'; url: string; store?: StoreData }
  | { type: 'done'; store?: StoreData }
  | { type: 'error'; message: string }

type StepState = { key: string; label: string; status: 'pending' | 'started' | 'completed' | 'failed' }
type FileState = { name: string; status: 'started' | 'completed' | 'failed'; content: string }

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001'

const STEP_DEFS = [
  { key: 'intent', label: 'Business intent', icon: Brain },
  { key: 'blueprint', label: 'Blueprint', icon: Zap },
  { key: 'dna', label: 'Brand DNA', icon: Palette },
  { key: 'products', label: 'Products', icon: Package },
  { key: 'payments', label: 'Payments', icon: CreditCard },
  { key: 'manifest', label: 'Manifest', icon: FileCode2 },
  { key: 'critique', label: 'Design review', icon: Sparkles },
  { key: 'hero', label: 'Hero', icon: FileCode2 },
  { key: 'nav', label: 'Navigation', icon: FileCode2 },
  { key: 'compile', label: 'Compile', icon: Zap },
  { key: 'deploy', label: 'Preview', icon: Rocket },
]

function initialSteps(): StepState[] {
  return STEP_DEFS.map((step) => ({ key: step.key, label: step.label, status: 'pending' }))
}

function eventSourceUrl(buildId: string) {
  return `${API_BASE}/api/v1/seltra/store/build/${encodeURIComponent(buildId)}/events`
}

export function AgentBuildStream({
  storeName,
  buildId,
  onDone,
  onError,
}: {
  storeName: string
  buildId?: string | null
  onDone?: (store: StoreData) => void
  onError?: (message: string) => void
}) {
  const [steps, setSteps] = useState<StepState[]>(() => initialSteps())
  const [plan, setPlan] = useState<PlanItem[]>([])
  const [logs, setLogs] = useState<string[]>([])
  const [files, setFiles] = useState<Record<string, FileState>>({})
  const [status, setStatus] = useState<'idle' | 'working' | 'done' | 'error'>('idle')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!buildId) return
    setSteps(initialSteps())
    setPlan([])
    setLogs([])
    setFiles({})
    setPreviewUrl(null)
    setStatus('working')

    const source = new EventSource(eventSourceUrl(buildId))

    const handle = (event: MessageEvent<string>) => {
      const parsed = JSON.parse(event.data) as BuildEvent

      if (parsed.type === 'log') {
        setLogs((prev) => [...prev.slice(-80), `> ${parsed.message}`])
      }

      if (parsed.type === 'plan') {
        setPlan(parsed.items)
      }

      if (parsed.type === 'step') {
        setSteps((prev) => prev.map((step) =>
          step.key === parsed.step
            ? { ...step, label: parsed.label ?? step.label, status: parsed.status }
            : step,
        ))
        if (parsed.status === 'started') setLogs((prev) => [...prev.slice(-80), `> ${parsed.label ?? parsed.step} started`])
        if (parsed.status === 'completed') setLogs((prev) => [...prev.slice(-80), `✓ ${parsed.label ?? parsed.step} completed`])
      }

      if (parsed.type === 'file') {
        setFiles((prev) => ({
          ...prev,
          [parsed.name]: {
            name: parsed.name,
            status: parsed.status,
            content: prev[parsed.name]?.content ?? '',
          },
        }))
      }

      if (parsed.type === 'chunk') {
        setFiles((prev) => ({
          ...prev,
          [parsed.file]: {
            name: parsed.file,
            status: prev[parsed.file]?.status ?? 'started',
            content: (prev[parsed.file]?.content ?? '') + parsed.content,
          },
        }))
      }

      if (parsed.type === 'preview') {
        setPreviewUrl(parsed.url)
        setLogs((prev) => [...prev.slice(-80), `✓ Preview updated: ${parsed.url}`])
      }

      if (parsed.type === 'done') {
        setStatus('done')
        setLogs((prev) => [...prev.slice(-80), '✓ Build successful'])
        source.close()
        if (parsed.store) onDone?.(parsed.store)
      }

      if (parsed.type === 'error') {
        setStatus('error')
        setLogs((prev) => [...prev.slice(-80), `! ${parsed.message}`])
        source.close()
        onError?.(parsed.message)
      }
    }

    source.onmessage = handle
    for (const eventName of ['step', 'log', 'plan', 'file', 'chunk', 'preview', 'done', 'error']) {
      source.addEventListener(eventName, handle as EventListener)
    }
    source.onerror = () => {
      setStatus('error')
      setLogs((prev) => [...prev.slice(-80), '! Build stream disconnected'])
      source.close()
      onError?.('Build stream disconnected')
    }

    return () => source.close()
  }, [buildId, onDone, onError])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [logs, files])

  const doneCount = steps.filter((step) => step.status === 'completed').length
  const pct = Math.round((doneCount / Math.max(steps.length, 1)) * 100)
  const fileList = useMemo(() => Object.values(files), [files])
  const activeFile = fileList.find((file) => file.status === 'started') ?? fileList[fileList.length - 1]

  return (
    <div className="grid h-full min-h-0 gap-4 p-6 lg:grid-cols-[minmax(260px,.8fr)_minmax(360px,1.2fr)]">
      <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-wider text-primary opacity-70">{'// live build stream'}</div>
            <div className="mt-0.5 truncate text-base font-semibold">{storeName || 'Your store'}</div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`h-2 w-2 rounded-full ${status === 'done' ? 'bg-primary' : status === 'error' ? 'bg-red-400' : 'animate-pulse bg-yellow-400'}`} />
            <span className={`font-mono text-[11px] ${status === 'error' ? 'text-red-400' : status === 'done' ? 'text-primary' : 'text-yellow-400'}`}>
              {status === 'done' ? 'DONE' : status === 'error' ? 'ERROR' : 'WORKING'}
            </span>
          </div>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>

        {/* P0.2 — the plan, specific to this prompt, not a generic progress bar */}
        {plan.length > 0 && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
            <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-primary">
              <Sparkles className="h-3 w-3" /> Building this store
            </div>
            <div className="space-y-1.5">
              {plan.map((item) => (
                <div key={item.label} className="flex items-start gap-2 text-xs">
                  <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-primary" />
                  <div className="min-w-0">
                    <span className="font-medium text-foreground">{item.label}</span>
                    <span className="text-muted-foreground"> — {item.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          {steps.map((def) => {
            const meta = STEP_DEFS.find((step) => step.key === def.key)
            const Icon = meta?.icon ?? Zap
            const isDone = def.status === 'completed'
            const isActive = def.status === 'started'
            const isFailed = def.status === 'failed'
            return (
              <div
                key={def.key}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all ${
                  isDone ? 'opacity-60' :
                  isActive ? 'border border-primary/25 bg-primary/10' :
                  isFailed ? 'border border-red-500/25 bg-red-500/10' :
                  'opacity-35'
                }`}
              >
                <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border ${
                  isDone ? 'border-primary/40 text-primary' :
                  isActive ? 'border-primary text-primary' :
                  isFailed ? 'border-red-400 text-red-400' :
                  'border-border text-muted-foreground'
                }`}>
                  {isDone ? <Check className="h-3.5 w-3.5" /> :
                   isActive ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
                   isFailed ? <AlertCircle className="h-3.5 w-3.5" /> :
                   <Icon className="h-3.5 w-3.5" />}
                </div>
                <div className="min-w-0 flex-1 truncate font-medium">{def.label}</div>
              </div>
            )
          })}
        </div>

        <div
          ref={scrollRef}
          className="min-h-[150px] overflow-y-auto rounded-xl border border-border bg-card/30 p-4 font-mono text-[11px]"
        >
          {logs.length === 0 && <span className="text-muted-foreground">$ waiting for build events...</span>}
          {logs.map((line, i) => (
            <div key={i} className={line.startsWith('✓') ? 'text-primary' : line.startsWith('!') ? 'text-red-400' : 'text-muted-foreground'}>
              {line}
            </div>
          ))}
          {previewUrl && <div className="mt-2 text-primary">preview: {previewUrl}</div>}
        </div>
      </div>

      <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card/30">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          {fileList.length === 0 ? (
            <span className="font-mono text-[11px] text-muted-foreground">No generated files yet</span>
          ) : fileList.map((file) => (
            <span key={file.name} className={`rounded-md border px-2 py-1 font-mono text-[10px] ${
              file.status === 'completed' ? 'border-primary/30 text-primary' : 'border-border text-muted-foreground'
            }`}>
              {file.name}
            </span>
          ))}
        </div>
        <pre className="min-h-0 flex-1 overflow-auto p-4 text-[11px] leading-relaxed text-muted-foreground">
          <code>{activeFile?.content || '// generated code and data will stream here'}</code>
        </pre>
      </div>
    </div>
  )
}