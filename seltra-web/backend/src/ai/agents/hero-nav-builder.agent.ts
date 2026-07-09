import { codegenChat } from '../client'
import type { CanonicalStore } from '../../types'
import type { StoreManifest } from './manifest.agent'

type Role = 'hero' | 'nav'

interface BuildInput {
  blueprint: CanonicalStore
  manifest: StoreManifest
  dna: unknown
  products: Array<{
    id: string
    name: string
    description?: string | null
    price: string | number
    currency?: string
    category?: string | null
    images?: Array<{ url: string; isPrimary?: boolean }>
  }>
}

interface StackFrame { type: 'tag' | 'paren' | 'brace' | 'bracket'; value: string }

function computeUnclosedStack(source: string): StackFrame[] {
  const stack: StackFrame[] = []
  for (let i = 0; i < source.length; i++) {
    const c = source[i]
    if (c === '"' || c === "'" || c === '`') {
      const q = c; i++
      while (i < source.length && source[i] !== q) { if (source[i] === '\\') i++; i++ }
      continue
    }
    if (c === '/' && source[i + 1] === '/') { while (i < source.length && source[i] !== '\n') i++; continue }
    if (c === '/' && source[i + 1] === '*') { i += 2; while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) i++; i++; continue }
    if (c === '(') stack.push({ type: 'paren', value: '(' })
    else if (c === '{') stack.push({ type: 'brace', value: '{' })
    else if (c === '[') stack.push({ type: 'bracket', value: '[' })
    else if (c === ')' && stack[stack.length - 1]?.type === 'paren') stack.pop()
    else if (c === '}' && stack[stack.length - 1]?.type === 'brace') stack.pop()
    else if (c === ']' && stack[stack.length - 1]?.type === 'bracket') stack.pop()
  }
  return stack
}

function detectTruncation(source: string): boolean {
  const trimmed = source.trimEnd()
  const backticks = (trimmed.match(/`/g) ?? []).length
  if (backticks % 2 !== 0) return true
  if (!/\}\s*$/.test(trimmed)) return true
  return computeUnclosedStack(trimmed).length > 0
}

function repairTruncation(source: string): string {
  let s = source.trimEnd()
  for (const frame of computeUnclosedStack(s).reverse()) {
    if (frame.type === 'paren') s += ')'
    if (frame.type === 'brace') s += '}'
    if (frame.type === 'bracket') s += ']'
  }
  if (!/\}\s*$/.test(s)) s += '\n}'
  return s
}

function sanitizeSource(raw: string): string {
  let s = raw.trim()
  if (s.startsWith('```javascript')) s = s.slice(13)
  else if (s.startsWith('```jsx')) s = s.slice(6)
  else if (s.startsWith('```js')) s = s.slice(5)
  else if (s.startsWith('```')) s = s.slice(3)
  if (s.endsWith('```')) s = s.slice(0, -3)
  return s
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/^(['"])use client\1;?\s*/g, '')
    .split('\n')
    .filter((line) => {
      const t = line.trim()
      return !t.startsWith('import ') && !t.startsWith('export ') && !/\brequire\s*\(/.test(t)
    })
    .join('\n')
    .trim()
}

function repairChunk(raw: string): string {
  let s = sanitizeSource(raw)
  if (detectTruncation(s)) s = repairTruncation(s)
  if (detectTruncation(s)) s = repairTruncation(s)
  return s
}

function chunkPassesGate(source: string, role: Role): boolean {
  if (!source.includes(role === 'hero' ? 'function StorefrontHero' : 'function StorefrontNav')) return false
  if (role === 'hero' && !source.includes('props.store.displayName')) return false
  if (role === 'nav' && !source.includes('props.CartIcon')) return false
  if (/useState\s*\(|useContext\s*\(|createContext\s*\(|postMessage\s*\(|localStorage/.test(source)) return false
  if (/window\.|document\.|import\s|export\s|require\s*\(|`/.test(source)) return false
  if (detectTruncation(source)) return false
  return true
}

function brandContext(input: BuildInput): string {
  const productSample = input.products.slice(0, 6).map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    currency: p.currency ?? 'GHS',
    category: p.category,
    image: p.images?.find((i) => i.isPrimary)?.url ?? p.images?.[0]?.url ?? null,
  }))
  return JSON.stringify({
    blueprint: input.blueprint,
    manifest: input.manifest,
    dna: input.dna,
    products: productSample,
  })
}

const SHARED_RULES = `Return only JavaScript. No markdown.
Use React.createElement only. Do not use JSX, imports, exports, TypeScript, template literals, window, document, localStorage, postMessage, useState, useContext, createContext, or any hooks.
Use only callback props provided. ASCII only.
Icons may only be inline svg with circle, rect, line, or ellipse shapes and strokeWidth:2.`

function promptFor(role: Role, input: BuildInput): string {
  const base = `${SHARED_RULES}
Brand data: ${brandContext(input)}`
  if (role === 'hero') {
    return `${base}
Write function StorefrontHero(props) for props { store, products, features, onShopNow, onOpenCart }.
It must be unique, polished, responsive, and only call props.onShopNow() or props.onOpenCart().
The main brand headline must use props.store.displayName exactly. Do not hardcode the business prompt, audience, location, or a generic store name as the brand headline.
Use CSS variables var(--store-bg), var(--store-surface), var(--store-text), var(--store-muted), var(--store-accent), var(--store-accent-text), var(--store-border).
End with the closing brace of StorefrontHero.`
  }
  return `${base}
Write function StorefrontNav(props) for props { displayName, businessType, categories, cartCount, CartIcon, onOpenCart, onCategoryClick, onLogoClick }.
It must be a sticky storefront navbar. Category buttons call props.onCategoryClick(category). Logo calls props.onLogoClick(). Cart calls props.onOpenCart().
The brand text must be exactly props.displayName. The cart button must render React.createElement(props.CartIcon, ...) and must not create its own cart svg or text-only icon.
Use CSS variables var(--store-bg), var(--store-surface), var(--store-text), var(--store-muted), var(--store-accent), var(--store-accent-text), var(--store-border).
End with the closing brace of StorefrontNav.`
}

async function buildOne(role: Role, input: BuildInput): Promise<{ source: string | null; provider: string; error: string | null }> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await codegenChat([{ role: 'user', content: promptFor(role, input) }], role === 'hero' ? 1800 : 1200, role)
      const source = repairChunk(result.content)
      if (chunkPassesGate(source, role)) return { source, provider: result.provider, error: null }
    } catch (error) {
      if (attempt === 1) return { source: null, provider: 'fallback:null', error: error instanceof Error ? error.message : String(error) }
    }
  }
  return { source: null, provider: 'fallback:null', error: `${role} failed validation` }
}

export async function generateHeroNavSources(input: BuildInput): Promise<{
  heroSource: string | null
  navSource: string | null
  provider: string
  error: string | null
}> {
  const [hero, nav] = await Promise.all([buildOne('hero', input), buildOne('nav', input)])
  return {
    heroSource: hero.source,
    navSource: nav.source,
    provider: `hero:${hero.provider},nav:${nav.provider}`,
    error: [hero.error, nav.error].filter(Boolean).join('; ') || null,
  }
}
