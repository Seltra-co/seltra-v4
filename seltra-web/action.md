# Seltra V4 — Agent & Storefront Architecture Upgrade Plan
**Launch: July 22, 2026 — 6 days out from this doc.** Everything below is split into **P0 (ship-blocking or launch-safe, do before the 22nd)**, **P1 (weeks 2–4 post-launch)**, and **P2 (v4.x roadmap, matches the multi-agent whiteboard)**. Do not attempt P1/P2 before launch — a half-finished architecture change is a worse launch risk than the "instant build" feeling.

---

## 0. What we actually learned from studying the enginex flow

Watching the build (prompt → task list → terminal → file tree → live preview) confirms it's the now-standard **Bolt/Lovable/v0-class pattern**, not a Seltra-specific trick:

1. **A visible plan comes first.** Before any code is written, the agent prints a concrete, prompt-specific task list ("Set up project", "Build hero", "Build services list", "Wire booking form"...). It's not a generic 10-step progress bar — it's derived from *this* prompt.
2. **The "thinking" is real work, not a fake delay.** Because it's running an actual WebContanier (real `npm install`, real dev server boot, real file writes), the terminal output is authentic. That's *why* it feels slower and more trustworthy than a spinner — the user is watching genuine I/O.
3. **Work is incremental and file-scoped.** Each task ticks off as its file is written, with a diff/checkmark, not "10 hidden steps that all complete at once."
4. **There's a visible self-check pass** near the end (lint/build error recovery, sometimes a second pass on a section).

None of this requires copying anyone's code — it's a UX/architecture pattern, and Seltra already has *most of the underlying machinery* (critic → refinement → validator loop) — it's just invisible to the merchant and, in the blueprint/product path, fast enough that it reads as fake.

---

## 0.5 Your friend's feedback + the whiteboard — where they actually land in this plan

Both inputs matter and neither is reflected above yet, so putting them on the record here before the gap analysis:

**The conversation.** You described the current setup accurately to him as "variant deterministic architecture" — internal themes/components/layouts/industry categorizations, LLM takes over once intent + industry are derived. His diagnosis was specific, not generic: *"You are using the same prompt structure and hyperparameters — especially temperature — for the LLM... apply some stochasticity... have a prompting SLM that constructs the user prompt and adjusts the hyperparameters within specific ranges, so the system stays auditable."*

That's a different lever than anything in §2. Section/theme/layout selection being deterministic is fine and should stay (that's your commerce-safety guarantee — cart/checkout/pricing must never drift). But the two things that *are* pure LLM calls — hero copy and nav copy in `hero-nav-builder.agent.ts` — currently run through `codegenChat()` with no temperature parameter at all, meaning they inherit whatever the client defaults to, identically, every time, for every merchant. That's likely the actual mechanical reason two different salons can come out sounding the same: not the section library, the missing stochasticity on the only two genuinely generative calls you have.

His fix — a small model (or even a deterministic rule layer, cheaper than a second SLM call) that takes the merchant prompt + `brandVoice` and picks a temperature *within an audited range* (say 0.55–0.85, never fully open) before calling `codegenChat` for hero/nav — is the right shaped fix. It's **not P0**: it touches the generation contract for your only LLM-owned surface area, six days before real merchants hit it, and "auditable range" needs actual testing to find the range that doesn't produce garbage. This goes into P1 below as its own item, directly ahead of the tool/skill schema work, because it's cheap once P0 ships and it's the most direct answer to "why do stores feel similar" that either of you have raised.

**The whiteboard (V4 Uni-Agent System).** Mapped against what's actually in the repo today:

| Whiteboard block | Current implementation | Status |
|---|---|---|
| Input (NLP) | `agent.service.ts` `sendMessage()` intake | ✅ exists |
| Context (history, meta) | `context-engine.service.ts` (`ContextEngine.build()`) | ✅ exists, feeds tenant/order/product signal into every message |
| Memory | `merchants-context.ts` (`MerchantContext`: tone, price range, recent intents, key phrases) | ✅ exists — matches your "short-term / session memory, stored in prompt" note almost exactly |
| Storage: Relational DB | Postgres via Prisma | ✅ exists |
| Storage: RAG | — | ❌ not built. Nothing in `agent.service.ts` retrieves from a vector store; `ContextEngine` is hand-assembled SQL, not embedding search |
| Tools (APIs, internal services) | `MoolreService.sendSms`, Cloudinary upload, product CRUD via `executeActions()` | ✅ exists but implicit — not a registered tool list, just a big `if (action.action === ...)` switch |
| Skills (Planning / Executor / Feedback loop) | Planning: none explicit. Executor: `executeActions()`. Feedback loop: `critic.agent.ts` → `refinement.engine.ts` → `validator.agent.ts` — but only for storefront generation, not for the merchant-facing chat agent | ⚠️ partial — the feedback loop you drew exists, just scoped to codegen, not to the conversational agent |
| LLM base ladder (Groq → Gemini → GPT → Claude) | `client.ts` only has Groq → Ollama | ❌ not built — real gap between whiteboard and code |

Net: you're closer to the V4 diagram than it feels like, because Context + Memory + a Feedback loop already exist — they're just not drawn together as a system, and RAG + the multi-provider ladder are the two pieces with nothing behind them yet. Both are P2 (RAG needs a real corpus decision — product catalog embeddings? merchant conversation history? — and the model ladder is a cost/infra decision, not a code change you want live during launch week).

---

## 1. Gap analysis: Seltra V4 today vs. the pattern

| Pattern element | Seltra V4 today | Gap |
|---|---|---|
| Visible plan before build | `AgentBuildStream` uses a **fixed** `STEP_DEFS` array (10 generic steps) | Steps aren't derived from the merchant's prompt — always the same 10 labels regardless of business |
| Real, visible "thinking" | `critic.agent.ts` → `refinement.engine.ts` → `validator.agent.ts` already run a genuine multi-pass quality loop (up to 2 refinement iterations + post-render validation + one retry) | **None of this is emitted as `BuildEvent`s.** It runs silently inside `getManifest()` / `generateStorefrontCode()`, so the merchant never sees the exact thing that would make the build feel legitimate |
| Incremental file reveal | `emitFileChunks` streams `Blueprint.json`, `StoreDNA.json`, `Products.json`, `Manifest.json`, `Hero.tsx`, `Navbar.tsx` | Good — this part is already close to the pattern. Just needs the critic/validator steps inserted between "Manifest" and "Hero" |
| Self-check / repair pass | `resolveRepairs()` + one retry already exists in `generateStorefrontCode` | Not surfaced. A visible "Reviewing generated storefront…" step with a real pass/fail score would read exactly like Lovable's fix-up pass |
| Uniqueness strategy | "Variant deterministic": theme + layout + composition rules select from a fixed palette/section library, LLM only owns hero + nav copy | This is fine and *should stay* — the fix per your notes isn't structural uniqueness, it's **branding depth** (see §3) |

**Bottom line: you don't need a new pipeline. You need to (a) surface the pipeline you already built, and (b) make the plan step dynamic instead of a static list.** That is a 1–2 day job, not a rewrite — which is why it's P0.

---

## 2. P0 — ship before July 22

### P0.1 — Make the build stream show the real pipeline (surface, don't fake)
**Files:** `backend/src/store/store.service.ts`, `backend/src/ai/agents/storefront-codegen.agent.ts`, `backend/src/store/build-events.service.ts`, `frontend/components/storefront/AgentBuildStream.tsx`

- Add two new `BuildEvent` steps to `STEP_DEFS`: `critique` ("Reviewing design quality") and `validate` ("Final quality check").
- Thread a `BuildContext | undefined` param into `refineManifest()` and `validateStorefrontHtml()` call sites inside `generateStorefrontCode()`, and emit:
  - `step critique started` → run `refineManifest` → `step critique completed` with a log line like `Design score: {finalReport.score}/100 ({fixesApplied.length} refinements applied)`.
  - `step validate started` → run `validateStorefrontHtml` → `step validate completed` with `Validator score: {score}/100`.
- This is **zero new latency** — you're just emitting events around work that already happens. It will *look* slower (in a good way) because the merchant sees two extra ticks with real scores, not because you added a `setTimeout`.

### P0.2 — Dynamic plan instead of static `STEP_DEFS`
**Files:** `blueprint.agent.ts`, `store.service.ts`, `AgentBuildStream.tsx`

- Right after `generateBlueprint()` resolves, derive a **prompt-specific task list** for free from data you already have — no extra LLM call:
  ```
  Build {brandName}
  ├─ Hero — {heroStyle from DNA}
  ├─ Trust bar — {storeFeatures.length} signals
  ├─ Category strip — {productCategories.join(', ')}
  ├─ Product grid — {N} products generated
  ├─ {any industry extras: FAQ / featured-drop / brand-story}
  └─ Checkout — Moolre
  ```
- Emit this as a single `plan` event right after the Blueprint step completes. Render it in `AgentBuildStream` as a checklist under the existing step list (Lovable/enginex-style "here's what I'm building" moment). This directly answers your "it looks too instant" note — the merchant sees a *specific* plan for *their* barbershop, not a progress bar.

### P0.3 — Fix the two competing radius/card systems (real bug, cheap fix)
**Files:** `storefront-codegen.agent.ts` (`buildCSS`), `StorefrontCanvas.tsx` (`RADIUS_MAP`)

- The raw-HTML codegen path (`storefront-codegen.agent.ts`) hardcodes `--r: .5rem; --r2: .75rem` for card radius, completely independent of the React path's `--store-radius` token system in `StorefrontCanvas.tsx`. Two storefronts built from the same blueprint on different rendering paths can literally have different corner radii.
- Fix: derive `--r`/`--r2` in `buildCSS()` from the same `RADIUS_MAP` keyed by `themeKey`, so both paths agree. This is your "card radius improve" note — the real issue isn't that radius is wrong, it's that it's inconsistent.

### P0.4 — Branded, not forced-unique (your #1 V4 principle)
**Files:** `blueprint.agent.ts`, `hero-nav-builder.agent.ts`, `storefront-codegen.agent.ts`

- Add one field to the blueprint schema: `brandVoice` (a 3–6 word tone descriptor the blueprint LLM already has enough context to produce, e.g. *"warm, confident, no-fuss"*). Zero extra calls — just extend the existing `SYSTEM_PROMPT` JSON shape in `blueprint.agent.ts` and `enforceDefaults()`.
- Pass `brandVoice` into `promptFor('hero', ...)` and the brand-story fallback copy in `refinement.engine.ts` (`IMPROVE_BRAND_STORY_BODY`) so hero tagline, brand-story body, and footer tagline all sound like *one brand* instead of three independently-generated fragments. This is cheap, on-brief for your note, and doesn't touch the deterministic section/layout system at all.

### P0.5 — Logistics/transport industry (additive, no breaking change)
**File:** `composition-rules.ts`

- Add `logistics` (and optionally `transport`) to `COMPOSITION_RULES`, `INDUSTRY_ICONS`, and the keyword list in `detectIndustry()`. Suggested: `theme: 'cool-modern'`, `layout: 'conversion'`, `includeSections: ['trust-bar','faq']`, icons themed around tracking/delivery/coverage/fleet. Pure data addition — safe to ship day-of if needed.

### P0.6 — Mobile pass on the generated storefront (not the dashboard)
**File:** `storefront-codegen.agent.ts` (`buildCSS`)

- Current `@media(max-width:640px)` block is thin. Add explicit rules for: hero button stacking, trust-bar wrapping to 2 columns instead of shrinking to illegible size, product-grid dropping to comfortable 2-col with adequate tap targets (44px min), and nav category row already scrolls — confirm it doesn't clip under the cart button. This is the block real customers will hit first on launch day (WhatsApp/Instagram traffic is mobile-first) — treat as launch-blocking, not cosmetic.

### P0.7 — Close the known Moolre/Paystack risk before anything else
This is already flagged in your own notes as the highest launch risk (frontend checkout expects Paystack-shaped fields, backend is on Moolre). **Nothing in this document should be worked on before that's verified.** Suggest: one focused pass tracing `checkout()` → `/api/v1/payment/*` → `MoolreService` response shape → what `order-success` page's `verify` endpoint expects, and a fixture test with a real Moolre sandbox response.

---

## 3. P1 — weeks 2–4 post-launch (do not start before the 22nd)

- **Controlled stochasticity on hero/nav generation (your friend's fix).** `codegenChat()` in `client.ts` currently passes no `temperature` at all for `promptFor('hero', ...)` / `promptFor('nav', ...)`. Add a small deterministic-first mapper — `brandVoice` + industry → a temperature in an audited range (start narrow, e.g. 0.55–0.8, widen only after you've seen enough real output not to trust it blindly) — before calling Groq. Log the chosen value on every generation (`AgentEvent` already has a `payload` field for exactly this) so it's auditable per his requirement, not a silent knob. Do **not** apply this to blueprint/product/manifest generation — those stay deterministic; this is scoped to the two calls that are already meant to be creative.
- **Formal tool/skill schema for `AgentService`.** Today `AgentAction` is a hand-rolled union type and `inferredActionsFromMessage()` is regex-based. Move to explicit function-calling schemas (JSON schema per action) so the merchant-facing agent has a real tool registry instead of prompt-string parsing + regex fallback. This is your "agent have a modern experience — with tools, skills" note — it's the right instinct, but it's a contract change across `AgentService`, the system prompt, and the frontend action renderer, so it needs a real week, not a launch-week patch.
- **Section-level critique, not just manifest-level.** `critic.agent.ts` scores the whole manifest. Extend it to also score generated hero/nav *source* (currently only gated by `chunkPassesGate`, which checks structure, not quality) so "improving" becomes a real visible step for the LLM-owned components too.
- **Iterable components with history.** Store a `manifestVersion` + diff on every agent-driven `PATCH_STOREFRONT` so "undo last change" and "show what changed" become possible — right now each patch overwrites `manifest` wholesale.
- **Merchant-editable brand kit.** Expose `palette`/`typography` as an editable panel in the dashboard that writes back into `tenant.canonical`, instead of purely inferred by `dna.agent.ts`. Feeds directly off P0.4's `brandVoice` groundwork.

## 4. P2 — v4.x, matches the whiteboard's Uni-Agent → Multi-Agent roadmap

- Planner agent → section-writer agents (per-section, not just hero/nav) → critic agent → merge, replacing the current single-pass `getManifest()` + two LLM-owned components.
- Expand LLM-owned surface area beyond hero/nav once Groq TPM budget and the `codegenPrimaryTokensUsed` ceiling allow it (see `client.ts` budget comments — this is a real constraint, not a design choice, so it's gated on infra/cost first).
- Base model ladder from the whiteboard (Groq → Gemini → GPT → Claude) as an actual fallback chain in `client.ts`, not just Groq → Ollama.

---

## 5. Sequencing for the next 6 days

| Day | Work |
|---|---|
| Today/Tomorrow | P0.7 (Moolre/Paystack checkout verification) — blocking, do first |
| Day 2–3 | P0.1 + P0.2 (surface real pipeline + dynamic plan) |
| Day 3–4 | P0.3 + P0.6 (radius consistency + mobile pass) |
| Day 4–5 | P0.4 (brand voice) + P0.5 (logistics industry) |
| Day 5–6 | Full regression on the 15 waitlisted merchants' actual prompts, soft-launch dry run |

Do not touch §3 or §4 before the 22nd. The build-stream and branding work in §2 is scoped specifically to be additive and non-breaking to the deterministic pipeline you already trust in production.