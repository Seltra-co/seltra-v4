import Link from 'next/link'
import { Github, Twitter } from 'lucide-react'

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background py-10">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <Link href="/" className="mb-2 flex items-center gap-2">
              <img src="/seltra/seltra-icon.png" alt="Seltra" className="h-6 w-6 rounded-md" />
              <span className="font-mono font-semibold">seltra</span>
            </Link>
            <p className="max-w-md text-sm text-muted-foreground">Commerce that runs itself.</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 font-mono text-xs text-muted-foreground sm:gap-6">
            <Link href="/careers" className="transition-colors hover:text-primary">careers</Link>
            <Link href="/terms" className="transition-colors hover:text-primary">terms</Link>
            <Link href="/privacy" className="transition-colors hover:text-primary">privacy</Link>
            <a href="https://x.com/seltra" target="_blank" rel="noreferrer" className="transition-colors hover:text-primary" aria-label="Twitter">
              <Twitter className="h-4 w-4" />
            </a>
            <a href="https://github.com/" target="_blank" rel="noreferrer" className="transition-colors hover:text-primary" aria-label="GitHub">
              <Github className="h-4 w-4" />
            </a>
          </div>
        </div>
        <div className="mt-8 flex flex-col justify-between gap-2 border-t border-border pt-6 font-mono text-[11px] text-muted-foreground sm:flex-row">
          <div>Copyright 2026 Seltra Inc. All rights reserved.</div>
          <div>seltra.co / v0.1.0 / all systems <span className="text-primary">online</span></div>
        </div>
      </div>
    </footer>
  )
}
