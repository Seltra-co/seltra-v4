'use client'
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mail, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001'

function setToken(t: string) { localStorage.setItem('seltra:token', t) }
function setUser(u: unknown)  { localStorage.setItem('seltra:user', JSON.stringify(u)) }
function getToken()           { return typeof window !== 'undefined' ? localStorage.getItem('seltra:token') : null }

async function apiPost<T>(path: string, body: unknown): Promise<{ data: T | null; error: string | null }> {
  try {
    const res  = await fetch(`${API_BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) return { data: null, error: json?.message ?? `HTTP ${res.status}` }
    return { data: json as T, error: null }
  } catch (e) { return { data: null, error: e instanceof Error ? e.message : 'Network error' } }
}

type AuthResponse = { access_token?: string; token?: string; user: unknown }

function AuthContent() {
  const router        = useRouter()
  const params        = useSearchParams()
  const next          = params.get('next') ?? '/dashboard'
  const [mode, setMode]       = useState<'login' | 'signup'>('login')
  const [view, setView]       = useState<'root' | 'email'>('root')
  const [email, setEmail]     = useState('')
  const [password, setPass]   = useState('')
  const [name, setName]       = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { if (getToken()) router.replace('/dashboard') }, [router])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const path = mode === 'signup' ? '/api/v1/auth/signup' : '/api/v1/auth/signin'
    const body = mode === 'signup' ? { email, password, name } : { email, password }
    const { data, error } = await apiPost<AuthResponse>(path, body)
    if (error || !data) { toast.error(error ?? 'Auth failed'); setLoading(false); return }
    const tok = data.access_token ?? (data as { token?: string }).token ?? ''
    setToken(tok); setUser(data.user)
    router.replace(mode === 'signup' ? '/dashboard' : next)
    setLoading(false)
  }

  const handleGoogle = () => {
    const redirect = encodeURIComponent(`${window.location.origin}${next}`)
    window.location.href = `${API_BASE}/api/v1/auth/oauth/google?redirect_uri=${redirect}`
  }

  const isSignup = mode === 'signup'

  return (
    <div className="auth-aurora relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_30%,hsl(0_0%_0%/0.6))]" />
      <div className="relative w-full max-w-md">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20">
            <span className="font-mono text-sm font-bold text-primary">S</span>
          </div>
          <span className="font-mono text-lg font-semibold text-white">seltra</span>
        </Link>
        <div className="glass rounded-3xl p-7 sm:p-9">
          {view === 'root' ? (
            <>
              <div className="mb-8 flex flex-col items-center text-center">
                <h1 className="text-xl font-semibold text-white/95">
                  {isSignup ? 'Create your Seltra account' : 'Sign in to your account'}
                </h1>
                <p className="mt-1 text-sm text-white/50">
                  {isSignup ? 'Your AI commerce agent is one minute away.' : "Welcome back. Let's keep building."}
                </p>
              </div>
              <div className="space-y-3">
                <Button onClick={handleGoogle} className="h-12 w-full rounded-full bg-white font-medium text-black hover:bg-white/90">
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3-3C17.2 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.5 2.7C6 7.1 8.8 5 12 5z"/>
                    <path fill="#4285F4" d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.2c-.3 1.4-1.1 2.6-2.3 3.4l3.5 2.7c2.1-1.9 3.6-4.8 3.6-8.3z"/>
                    <path fill="#FBBC05" d="M5.1 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3L1.6 7C.6 8.5 0 10.2 0 12s.6 3.5 1.6 5l3.5-2.7z"/>
                    <path fill="#34A853" d="M12 23c3 0 5.6-1 7.5-2.7l-3.5-2.7c-1 .7-2.3 1.1-4 1.1-3.2 0-5.9-2.1-6.9-5l-3.5 2.7C3.5 20.4 7.4 23 12 23z"/>
                  </svg>
                  Continue with Google
                </Button>
                <Button onClick={() => setView('email')} variant="outline" className="h-12 w-full rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                  <Mail className="mr-2 h-4 w-4" /> Continue with Email
                </Button>
              </div>
              <p className="mt-8 text-center text-sm text-white/50">
                {isSignup ? 'Have an account? ' : "Don't have an account? "}
                <button onClick={() => setMode(isSignup ? 'login' : 'signup')} className="text-white underline-offset-2 hover:underline">
                  {isSignup ? 'Sign in' : 'Sign up'}
                </button>
              </p>
            </>
          ) : (
            <>
              <button onClick={() => setView('root')} className="mb-5 flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
                <ArrowLeft className="h-3.5 w-3.5" /> back
              </button>
              <h1 className="mb-6 text-xl font-semibold text-white/95">
                {isSignup ? 'Create with email' : 'Sign in with email'}
              </h1>
              <form onSubmit={handleAuth} className="space-y-3">
                {isSignup && (
                  <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required
                    className="h-12 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-white/40" />
                )}
                <Input type="email" placeholder="you@store.com" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-white/40" />
                <Input type="password" placeholder="Password" required minLength={8} value={password} onChange={(e) => setPass(e.target.value)}
                  className="h-12 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-white/40" />
                <Button type="submit" disabled={loading} className="h-12 w-full rounded-full bg-white font-medium text-black hover:bg-white/90">
                  {loading ? '…' : isSignup ? 'Create account' : 'Sign in'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthContent />
    </Suspense>
  )
}
