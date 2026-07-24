# ACTION.md — Seltra V4: Image Generation Pipeline (Cloudflare FLUX) + Responsiveness Fixes



## 0. Context (read first)

Seltra v4 currently sources product images via `image-sourcing.agent.ts` in this fallback order:
`Pexels → Pixabay → Unsplash → deterministic SVG placeholder (productArtDataUrl)`.

There is **no real image generation** wired into the product pipeline. `image-generator.ts` exists (calls `fal.ai/flux/schnell`) but **nothing calls it** — `product.agent.ts` calls `sourceImage()`, not `generateProductImage()`. Cloudflare Workers AI (`providers/cloudflare.ts`) already has a working `callCloudflare()` fetch wrapper, cooldown/retry logic, and model routing — but it only lists **text/codegen models** in `CF_MODELS`. No image models exist there yet.

Goal: replace the stock-photo fallback chain with **Cloudflare Workers AI FLUX generation**, driven by a **Visual Style Profile** derived from the existing `StoreDNA` (`dna.agent.ts`), so all products in one store look like one coherent shoot — while staying inside the free Workers AI daily allocation for ~20+ merchants × 50 products.

---

## 1. Environment variables to add

Add to `.env` (backend):

```
# Cloudflare Workers AI — image generation
CF_IMAGE_HERO_MODEL=@cf/black-forest-labs/flux-2-dev
CF_IMAGE_PRODUCT_MODEL=@cf/black-forest-labs/flux-2-klein-9b
CF_IMAGE_DRAFT_MODEL=@cf/black-forest-labs/flux-2-klein-4b
CF_IMAGE_FALLBACK_MODEL=@cf/black-forest-labs/flux-1-schnell
SELTRA_IMAGE_PROVIDER=cloudflare        # cloudflare | stock | svg
SELTRA_IMAGE_CACHE_ENABLED=true
```

`CF_ACCOUNT_ID` and `CF_AI_API_TOKEN` already exist — reuse them, do not duplicate.

Keep `UNSPLASH_ACCESS_KEY` / `PEXELS_API_KEY` / `PIXABAY_API_KEY` as **last-resort fallback only** (see §5), don't delete them.

---

## 2. New file: `backend/src/ai/providers/cloudflare-images.ts`

This is the core new module. It must:

1. Call Workers AI image models via `CF_API_BASE/{account}/ai/run/{model}` (same base as `callCloudflare` in `cloudflare.ts` — reuse that file's `fetchWithTimeout`, cooldown/backoff state machine, and model-state map pattern rather than re-implementing it).
2. Workers AI image endpoints return **raw binary (PNG/JPEG bytes)**, not JSON with a URL — this is different from the text models already integrated. Detect via `res.headers.get('content-type')` starting with `image/`; if so, read `await res.arrayBuffer()` and base64-encode it. If Cloudflare returns JSON with `result.image` (base64) instead (some FLUX variants do), handle both shapes defensively.
3. Upload the resulting bytes to **Cloudinary** (already configured in `cloudinary.controller.ts` — reuse the same `cloudinary.uploader.upload` call, but accept a `Buffer`/base64 string directly rather than requiring an HTTP round-trip through the controller). Extract the upload logic from `CloudinaryController.uploadProductImage` into a shared helper `backend/src/store/cloudinary.service.ts` with an exported function:
   ```
   uploadImageBuffer(base64: string, mimeType: string, publicId: string): Promise<{ secure_url: string }>
   ```
   Both `CloudinaryController` and the new image pipeline should call this shared helper — don't duplicate the `cloudinary.config()` call.
4. Implement **prompt-hash caching** so identical prompts never regenerate:
   - Hash = `sha256(prompt + model)`.
   - Before generating, check Postgres table `GeneratedImageCache` (new Prisma model, §3) for a row with that hash → if found and not expired, return its `url` immediately, skip the CF call entirely. This is the "40–70% cost reduction" mechanism referenced in your notes.
   - After a successful generation + upload, write the row.
5. Export three functions matching the three model tiers:
   ```
   generateHeroImage(prompt: string): Promise<string | null>       // flux-2-dev
   generateProductImage(prompt: string): Promise<string | null>    // flux-2-klein-9b
   generateDraftImage(prompt: string): Promise<string | null>      // flux-2-klein-4b, used for instant preview while real gen runs
   ```
   Each internally falls back down the FLUX tier chain on failure (dev → klein-9b → klein-4b → schnell), mirroring the `ROLE_CANDIDATES` pattern already used in `cfCodegen`. On total failure, return `null` (never throw) so callers can fall through to stock/SVG.
6. Respect per-model cooldown using the **same** `modelState` map already in `cloudflare.ts` — either export that map/helpers from `cloudflare.ts` (add `export` to `getModelState`, `recordSuccess`, `recordError`, `isModelAvailable`) and import them, or duplicate the ~15-line state machine into this file. Prefer exporting — avoids two independent cooldown trackers fighting over the same account's rate limit.

---

## 3. Prisma schema addition

Add to `schema.prisma`:

```prisma
model GeneratedImageCache {
  id         String   @id @default(uuid())
  promptHash String   @unique
  prompt     String
  model      String
  url        String
  createdAt  DateTime @default(now())

  @@index([promptHash])
}
```

Run `npx prisma migrate dev --name add_generated_image_cache` after pasting.

---

## 4. Visual Style Profile — extend `dna.agent.ts`, don't create a parallel system

Your `StoreDNA` type (`store-dna.ts`) already carries `colorMood`, `visualDensity`, `palette`. Add three new fields so the image pipeline has a photographic brief, not just a color brief:

```ts
// add to StoreDNA interface in store-dna.ts
lighting: 'soft-daylight' | 'studio-softbox' | 'moody-dramatic' | 'bright-flatlay'
cameraStyle: '85mm-editorial' | 'flatlay-overhead' | 'lifestyle-context' | 'macro-detail'
backgroundStyle: 'warm-neutral' | 'pure-white' | 'dark-studio' | 'textured-surface'
```

In `dna.agent.ts`, add a small derivation map keyed off `themeKey` (you already have `PALETTE_MAP`/`TYPOGRAPHY_MAP` — add a sibling `VISUAL_STYLE_MAP: Record<ThemeKey, Pick<StoreDNA,'lighting'|'cameraStyle'|'backgroundStyle'>>` with 7 entries matching your 7 theme keys, e.g. `luxury → { lighting: 'studio-softbox', cameraStyle: '85mm-editorial', backgroundStyle: 'warm-neutral' }`, `'bold-dark' → { lighting: 'moody-dramatic', cameraStyle: 'lifestyle-context', backgroundStyle: 'dark-studio' }`, etc. Fill in the remaining 5 to taste, this is zero-LLM-token rule-based logic exactly like your existing maps).

Add a pure function in the same file:

```ts
export function buildImagePromptPrefix(dna: StoreDNA): string {
  // returns e.g.
  // "editorial studio photograph, soft daylight, warm neutral backdrop, 85mm lens, minimal shadow, premium commercial aesthetic"
}
```

Every image prompt (hero AND every product) must be built as:
`${buildImagePromptPrefix(dna)}, ${specificSubjectDescription}`

This is the mechanism that makes a 20-product catalog look like one coherent photoshoot instead of 20 disconnected renders — it's the single most important correctness requirement in this whole task.

---

## 5. Rewire `image-sourcing.agent.ts`

Current fallback order: `Pexels → Pixabay → Unsplash → SVG`.
New order: `Cloudflare FLUX (with DNA-aware prompt) → Pexels → Pixabay → Unsplash → SVG`.

Change `sourceImage(name, category)` signature to `sourceImage(name, category, dna?: StoreDNA)`. At the top of the function body:

```ts
if (process.env.SELTRA_IMAGE_PROVIDER === 'cloudflare' && dna) {
  const prompt = `${buildImagePromptPrefix(dna)}, ${name}, ${category}, product photography`
  const generated = await generateProductImage(prompt)
  if (generated) return generated
  // fall through to existing stock chain only if CF fails
}
```

Update the caller in `product.agent.ts` (`attachProductImages`) to pass `dna` through — this means `generateProducts()` needs an optional `dna: StoreDNA` param threaded from `StoreService.generateAndSaveStorefrontAssets` (which already computes `storeDNA` right before calling `generateManifest` — pass the same object one function further into `generateProducts`).

**Important sequencing bug to fix while you're in there:** currently `generateProducts()` is called in `createFromPrompt()` *before* `extractDNA()` even though DNA is computed a few lines earlier in the same function — reorder so `dna` exists before `generateProducts(blueprint, maxProducts, dna)` is invoked, and pass it.

---

## 6. Wire the Hero image too

`hero-nav-builder.agent.ts` generates the Hero **component code** but the hero background image itself currently comes from whatever product photo happens to be primary (`heroImg()` in `storefront-codegen.agent.ts`). Add a dedicated hero image generation call in `StoreService.generateAndSaveStorefrontAssets`, right before/parallel to `generateHeroNavSources`:

```ts
const heroImagePrompt = `${buildImagePromptPrefix(dna)}, hero lifestyle photograph for ${blueprint.businessName}, ${blueprint.businessType}`
const heroImageUrl = await generateHeroImage(heroImagePrompt) // flux-2-dev, quality matters most here
```

Persist `heroImageUrl` into `tenant.canonical.heroImageUrl` — the frontend (`StorefrontCanvas.tsx`) **already reads** `store.canonical?.heroImageUrl` and prefers it over the micro-component hero source (`heroImageUrl ? null : store.heroSource`), so no frontend change is needed here — it's already built to consume this field, it's just never been populated by generation.

---

## 7. Instant-preview draft image (nice-to-have, do last if time permits)

Per your ChatGPT notes: while the merchant waits, show a fast `klein-4b` draft immediately, then swap to the real image when `klein-9b`/`dev` finishes. Implementation: in `BuildEventsService`, emit a new event type `{ type: 'image-draft', productId, url }` right after draft generation, before the full product batch resolves. `AgentBuildStream.tsx` would need a small handler to display it — **skip this for launch night, ship phases 1–6 first**, this is polish.

---

## 8. Rate-limit / capacity math (why this survives free tier)

- Workers AI free daily allocation is per-account, shared across all merchants. With ~20 merchants × up to 50 products (free tier `planLimits`), a full-catalog generation is ~1000 image calls if cache is cold. The `GeneratedImageCache` hash lookup (§2.4) is what keeps this sustainable — repeat words like "Starter Set", "Signature Bundle" (your `BASE_NAMES` pool) plus a shared DNA prefix means **massive prompt overlap across merchants in the same industry**, so cache hit rate should be high after the first few stores.
- Use `klein-9b` (fast/cheap) for all per-product images, reserve `flux-2-dev` (slow/best) for the single hero image per store only — this matches your own ChatGPT-derived recommendation and keeps total inference cost near-minimal.
- Keep the existing Pexels/Pixabay/Unsplash/SVG chain intact as the safety net for when Workers AI cooldowns trip (§2, reuses `cloudflare.ts`'s existing exponential backoff) — this guarantees a merchant onboarding tonight never sees a broken image even under load.

---

## 9. Testing checklist for the next instance

1. Set `SELTRA_IMAGE_PROVIDER=cloudflare`, build a test store, confirm: hero image ≠ product image ≠ stock photo; all images share visible lighting/background consistency.
2. Kill `CF_AI_API_TOKEN` temporarily → confirm fallback to Pexels/SVG chain still works (no thrown errors, no broken `<img>`).
3. Build two stores in the same industry (e.g. both `beauty`) → confirm `GeneratedImageCache` hit on the second store's shared BASE_NAMES products (check DB row count vs number of CF calls in logs).
4. Confirm `tenant.canonical.heroImageUrl` is populated and `StorefrontCanvas` renders it (no frontend code change should be required — this is a regression check only).

---

## 10. Explicitly out of scope for this pass

Merchant-photo-upload-to-AI-enhancement pipeline (Phase 2 in your ChatGPT notes) is a separate, larger feature (background removal, lighting correction) — do not start it until Phases 1–9 above are shipped and stable.

