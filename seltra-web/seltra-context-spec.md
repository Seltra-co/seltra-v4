version 1.0.0

# Seltra Context Engineering + Merchant Memory + Conversation Layer

**Status: Spec | Phase 4 of Seltra MVP**
**Prerequisite reading: composition-research.md, action.md**

---

## What This Spec Covers

Phases 1–3 gave Seltra the ability to generate a unique storefront from a single merchant prompt. Phase 4 gives Seltra the ability to *remember* what was built, *understand* what a merchant wants to change, and *apply* that change surgically without destroying what already works.

The deliverable is a three-layer system:

1. **Store Memory Layer** — durable, queryable record of the store's current state and how it got there
2. **Context Engineering Layer** — what gets injected into each agent call, and how it is compressed
3. **Conversation + CRUD Layer** — the merchant chat interface wired to manifest patching and store operations

---

## Why Not LangChain / LangGraph / CrewAI

This is the question the team needs to answer once, then not revisit:

**LangChain**: Abstracts LLM calls behind a chain interface. Useful when you have many heterogeneous chains to compose. Seltra has one primary agent (storefront agent) with a well-defined input/output contract. LangChain's abstraction cost exceeds its benefit here. The framework also has a history of breaking API changes between minor versions.

**LangGraph**: Correct framework for stateful, branching agent workflows where you need checkpoint/resume and conditional edges. The right choice when a Seltra agent needs to ask the merchant a clarifying question, wait for a response, and resume from the same state. **This is the upgrade target**, not the starting point. Build the internal layer described below so it can be replaced by LangGraph when the conversation complexity justifies it — specifically when you hit multi-turn ambiguity resolution that requires graph branching.

**CrewAI**: Role-based multi-agent orchestration. Seltra does not need multiple agents collaborating on a single storefront operation today. One well-prompted agent with good context engineering outperforms a crew at this scale.

**Decision: Build a thin internal layer.** It has three components: `StoreMemory`, `ContextBuilder`, and `AgentService`. Each is a single TypeScript file. The total surface is ~400 lines. LangGraph can be dropped in at `AgentService` when needed without touching `StoreMemory` or `ContextBuilder`.

---

## Architecture

```
Merchant message
      │
      ▼
┌─────────────────────────────────────────────────────┐
│  ContextBuilder                                     │
│  - loads current StoreMemory                        │
│  - selects relevant history (last N turns + diffs)  │
│  - builds system prompt with injected context       │
│  - stays within token budget                        │
└────────────────────────┬────────────────────────────┘
                         │
                         ▼
              ┌─────────────────┐
              │   LLM Call      │
              │ (claude-sonnet  │
              │  or groq)       │
              └────────┬────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  ActionRouter                                       │
│  - parses structured action from response           │
│  - routes to: ManifestPatcher | StoreDataMutator    │
│               ProductCRUD | ContentEditor           │
└────────────────────────┬────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│  StoreMemory.persist()                              │
│  - writes manifest diff to ConversationTurn         │
│  - updates Tenant.storefrontManifest                │
│  - invalidates preview cache                        │
└─────────────────────────────────────────────────────┘
```

---

## Layer 1 — Store Memory

### 1.1 Schema additions

```prisma
model Tenant {
  // ... existing fields

  // The live manifest — source of truth for what renders
  storefrontManifest  Json?
  storefrontVersion   Int       @default(0)

  // Conversation history
  turns               ConversationTurn[]
}

model ConversationTurn {
  id          String   @id @default(cuid())
  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  role        String   // 'user' | 'agent'
  content     String   // raw message text
  actions     Json?    // structured actions the agent took
  manifestDiff Json?   // before/after manifest snapshot for this turn
  createdAt   DateTime @default(now())

  @@index([tenantId, createdAt])
}
```

The `storefrontManifest` column replaces `storefrontCode` as the live store state. `storefrontCode` (HTML) becomes a render cache — it is regenerated from the manifest on demand, not stored as the primary artifact.

### 1.2 StoreMemory service

```typescript
// seltra-web/backend/src/ai/memory/store-memory.ts

export type StoreTurn = {
  role: 'user' | 'agent'
  content: string
  actions?: AgentAction[]
  manifestDiff?: { before: Partial<StoreManifest>; after: Partial<StoreManifest> }
  createdAt: Date
}

export class StoreMemory {
  constructor(private tenantId: string) {}

  async getCurrentManifest(): Promise<StoreManifest | null> {
    const tenant = await db.tenant.findUnique({
      where: { id: this.tenantId },
      select: { storefrontManifest: true }
    })
    return tenant?.storefrontManifest as StoreManifest | null
  }

  async getRecentTurns(limit = 10): Promise<StoreTurn[]> {
    return db.conversationTurn.findMany({
      where: { tenantId: this.tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit
    }) as StoreTurn[]
  }

  async persistTurn(turn: Omit<StoreTurn, 'createdAt'>): Promise<void> {
    await db.conversationTurn.create({
      data: { tenantId: this.tenantId, ...turn }
    })
  }

  async applyManifestPatch(patch: ManifestPatch): Promise<StoreManifest> {
    const current = await this.getCurrentManifest() ?? deriveManifest(/* store */)
    const updated = applyPatch(current, patch)
    await db.tenant.update({
      where: { id: this.tenantId },
      data: {
        storefrontManifest: updated,
        storefrontVersion: { increment: 1 }
      }
    })
    return updated
  }
}
```

### 1.3 ManifestPatch type

```typescript
// Patches are intentionally narrow — they describe a surgical change, not a full replacement.
export type ManifestPatch = {
  // Add or replace a section at an index
  upsertSection?: { index?: number; section: ManifestSection }
  // Remove a section by type or index
  removeSection?: { type?: string; index?: number }
  // Reorder sections
  reorderSections?: string[]  // array of section types in new order
  // Update palette tokens
  updatePalette?: Partial<StorePalette>
  // Update typography
  updateTypography?: Partial<StoreTypography>
}

function applyPatch(manifest: StoreManifest, patch: ManifestPatch): StoreManifest {
  let sections = [...manifest.sections]

  if (patch.removeSection) {
    sections = sections.filter((s, i) =>
      patch.removeSection!.type ? s.type !== patch.removeSection!.type
      : i !== patch.removeSection!.index
    )
  }

  if (patch.upsertSection) {
    const { index, section } = patch.upsertSection
    if (index !== undefined) {
      sections.splice(index, 0, section)
    } else {
      const existing = sections.findIndex(s => s.type === section.type)
      if (existing >= 0) sections[existing] = section
      else sections.push(section)
    }
  }

  if (patch.reorderSections) {
    const byType = Object.fromEntries(sections.map(s => [s.type, s]))
    sections = patch.reorderSections.map(t => byType[t]).filter(Boolean)
  }

  return {
    sections,
    palette: { ...manifest.palette, ...patch.updatePalette },
    typography: { ...manifest.typography, ...patch.updateTypography }
  }
}
```

---

## Layer 2 — Context Engineering

The context window is the store's working memory. The ContextBuilder's job is to fill it with the right things without wasting tokens on irrelevant history.

### 2.1 Token budget allocation

For a 4k token context budget (conservative for Groq free tier):

```
System prompt base:           ~400 tokens
Store profile summary:        ~300 tokens
Current manifest (JSON):      ~500 tokens
Recent turns (last 6):        ~1,200 tokens
Instruction for this turn:    ~200 tokens
Response buffer:              ~1,400 tokens
Total:                        ~4,000 tokens
```

On Claude Sonnet (200k context): expand recent turns to 40+ and include full manifest history.

### 2.2 ContextBuilder

```typescript
// seltra-web/backend/src/ai/context/context-builder.ts

export class ContextBuilder {
  constructor(
    private memory: StoreMemory,
    private store: StoreData,
    private tokenBudget = 3500
  ) {}

  async build(userMessage: string): Promise<{ systemPrompt: string; messages: ChatMessage[] }> {
    const manifest = await this.memory.getCurrentManifest()
    const turns = await this.memory.getRecentTurns(8)

    const systemPrompt = this.buildSystemPrompt(manifest)
    const messages = this.buildMessages(turns, userMessage)

    return { systemPrompt, messages }
  }

  private buildSystemPrompt(manifest: StoreManifest | null): string {
    return `
You are the Seltra storefront agent for ${this.store.name}.
You help merchants build and refine their online store through conversation.

## Store Profile
Name: ${this.store.name}
Type: ${this.store.businessType ?? 'General'}
Audience: ${this.store.targetAudience ?? 'Shoppers'}
Products: ${this.store.products?.length ?? 0} products across ${
      [...new Set(this.store.products?.map(p => p.category).filter(Boolean))].join(', ') || 'various categories'
    }

## Current Storefront Manifest
${manifest ? JSON.stringify(manifest, null, 2) : 'No manifest yet — store pending generation.'}

## Your Capabilities
You can perform the following actions. Respond with a JSON action block after your message.

### Manifest Actions (storefront structure)
- PATCH_MANIFEST: modify section layout, palette, or typography
- REGENERATE_MANIFEST: full regeneration from a new description

### Store Data Actions (product/content CRUD)
- ADD_PRODUCT: add a new product
- UPDATE_PRODUCT: change product name, price, description, images
- REMOVE_PRODUCT: remove a product by id or name
- UPDATE_STORE_INFO: change store name, description, hero copy, contact info

### Conversation Actions
- CLARIFY: ask the merchant a clarifying question before acting
- CONFIRM: describe what you're about to do and ask for confirmation

## Response Format
Always respond with:
1. A friendly message to the merchant (2–4 sentences)
2. A JSON action block (or null if no action needed):

\`\`\`json
{
  "action": "PATCH_MANIFEST",
  "payload": { ... }
}
\`\`\`

## Rules
- Never regenerate the full manifest when a patch will do
- If the instruction is ambiguous, use CLARIFY, not a guess
- Palette and typography changes never require section regeneration
- Product CRUD never requires manifest changes unless the merchant requests layout changes
- Keep your message conversational — you are their store's agent, not a form
`
  }

  private buildMessages(turns: StoreTurn[], userMessage: string): ChatMessage[] {
    // Convert stored turns to LLM message format (oldest first)
    const history = [...turns].reverse().flatMap(t => [{
      role: t.role === 'user' ? 'user' : 'assistant',
      content: t.content
    }])

    return [...history, { role: 'user', content: userMessage }]
  }
}
```

### 2.3 Context compression for long histories

When `turns.length > 20`, summarize older turns before injecting:

```typescript
async function summarizeOldTurns(turns: StoreTurn[]): Promise<string> {
  // Call a cheap/fast model (haiku or llama-instant) to summarize
  const summary = await chat([{
    role: 'user',
    content: `Summarize these storefront conversation turns as a brief history of what was built and changed. Be factual and brief.\n\n${
      turns.map(t => `${t.role}: ${t.content}`).join('\n')
    }`
  }], { maxTokens: 300 })

  return `## Prior Conversation Summary\n${summary.content}`
}
```

This keeps the context window clean without losing the thread of what the merchant has asked for.

---

## Layer 3 — Conversation + CRUD

### 3.1 Agent endpoint

```typescript
// seltra-web/backend/src/api/routes/agent.route.ts
// Replaces or extends the existing agent endpoint

router.post('/api/v1/seltra/agent/:tenantId/message', async (req, res) => {
  const { tenantId } = req.params
  const { message } = req.body

  const memory = new StoreMemory(tenantId)
  const store = await getStoreData(tenantId)
  const builder = new ContextBuilder(memory, store)

  const { systemPrompt, messages } = await builder.build(message)

  // Persist user turn
  await memory.persistTurn({ role: 'user', content: message })

  // LLM call
  const response = await chat(messages, { system: systemPrompt, maxTokens: 1000 })

  // Parse action
  const { text, action } = parseAgentResponse(response.content)

  // Execute action
  let manifestDiff = null
  if (action) {
    manifestDiff = await executeAction(action, tenantId, memory, store)
  }

  // Persist agent turn
  await memory.persistTurn({
    role: 'agent',
    content: text,
    actions: action ? [action] : undefined,
    manifestDiff
  })

  res.json({ message: text, action, manifestDiff })
})
```

### 3.2 Action executor

```typescript
// seltra-web/backend/src/ai/actions/action-executor.ts

export async function executeAction(
  action: AgentAction,
  tenantId: string,
  memory: StoreMemory,
  store: StoreData
): Promise<ManifestDiff | null> {

  switch (action.action) {
    case 'PATCH_MANIFEST': {
      const before = await memory.getCurrentManifest()
      const after = await memory.applyManifestPatch(action.payload as ManifestPatch)
      return { before, after }
    }

    case 'REGENERATE_MANIFEST': {
      const before = await memory.getCurrentManifest()
      const profile = buildStoreProfile(store, action.payload.description)
      const after = await generateManifest(profile)  // calls LLM
      await memory.applyManifestPatch({ /* full replacement */ })
      return { before, after }
    }

    case 'ADD_PRODUCT':
      await db.product.create({ data: { tenantId, ...action.payload } })
      return null

    case 'UPDATE_PRODUCT':
      await db.product.update({ where: { id: action.payload.id }, data: action.payload })
      return null

    case 'REMOVE_PRODUCT':
      await db.product.delete({ where: { id: action.payload.id } })
      return null

    case 'UPDATE_STORE_INFO':
      await db.tenant.update({ where: { id: tenantId }, data: action.payload })
      return null

    case 'CLARIFY':
    case 'CONFIRM':
      return null  // No side effects — response text handles these
  }
}
```

### 3.3 Frontend: wiring the chat to the live preview

The merchant chat panel should:

1. Send messages to `/api/v1/seltra/agent/:tenantId/message`
2. On response, check `manifestDiff` — if present, refetch the store data (which now has the updated `storefrontManifest`) and re-render `StorefrontCanvas`
3. Show a subtle "updated" indicator when the preview re-renders
4. Display action summaries inline in the chat (e.g., "I added a before-after section between your hero and product grid.")

The key frontend change is that `StorefrontPreview` should accept the manifest as a prop (or refetch on version change) rather than polling for `storefrontCode`. The version number (`storefrontVersion`) is the cache key.

```typescript
// In StorefrontPreview — replace the storefrontCode poll with a version-aware fetch

useEffect(() => {
  loadStore()
}, [storeSlug, activeStore?.storefrontVersion])  // version bump triggers re-render
```

---

## Layer 4 — Conversation UX Principles

The agent is not a chatbot. It is a store-builder that communicates through conversation. These principles should govern the UI and the system prompt:

**4.1 Actions are visible.** When the agent changes something, it says what it changed in plain language. "I've updated your hero headline and added a before-after section below your product grid." Not just "Done."

**4.2 Clarify before acting on ambiguous instructions.** "Make it more premium" could mean palette (gold tones), typography (serif), section composition (remove busy sections), or all three. The agent asks: "When you say premium — are you thinking more refined colors, or a different layout feel, or both?"

**4.3 Undo is a conversation action.** "Actually, undo that hero change" should work. The `manifestDiff` stored on each turn enables this: the agent can look at the last turn's `before` snapshot and restore it.

**4.4 The agent remembers merchant preferences.** If a merchant has said "keep the layout minimal" twice, that preference should be in the system prompt. The `ConversationTurn` history makes this extractable. A future enhancement: persist explicit preferences to a `TenantPreferences` JSON column.

**4.5 Product and content changes are immediate, manifest changes show in preview.** Product additions appear in the grid instantly (the `products` prop updates). Manifest changes (section add/remove/reorder) trigger a preview refresh. The distinction should be invisible to the merchant but matters for the implementation.

---

## Migration Path

### From current system to this spec:

**Step 1** — Add `storefrontManifest` and `ConversationTurn` to schema. Backfill `storefrontManifest` by calling `deriveManifest(store)` for all existing tenants. Zero breaking changes.

**Step 2** — Build `StoreMemory` and `ContextBuilder`. Wire them into a new agent endpoint alongside the existing one. Run both in parallel.

**Step 3** — Update `StorefrontPreview` to read from `storefrontManifest` instead of polling for `storefrontCode`. The canvas renderer already accepts a manifest — this is a data source change only.

**Step 4** — Update the chat UI to display action summaries and trigger preview refreshes on `manifestDiff` responses.

**Step 5** — Deprecate the old blueprint agent endpoint once all stores have a `storefrontManifest`.

---

## When to Adopt LangGraph

Add LangGraph when any of these is true:

- The agent needs to pause, ask a clarifying question, and resume from the exact same state after the answer
- You need retries with state recovery (agent fails mid-action, user wants to retry)
- You have two or more agents that need to hand off state (e.g., a "design agent" and a "copy agent")
- Conversation branching becomes complex enough that a flat array of turns is insufficient to represent the state

Until then, the internal layer described here is simpler, faster to ship, and easier to debug.

---

## Open Questions for Phase 4

1. Should `CLARIFY` turns be stored in `ConversationTurn`? Yes — they are part of the merchant's intent history.

2. Should the agent have access to order and sales data? Yes, eventually. "Make the bestseller more prominent" requires knowing which product is the bestseller. Add a read-only `OrderSummary` to `StoreMemory.getRecentTurns` context when available.

3. Should manifest regeneration be gated behind a confirmation? Yes, always. Full regeneration destroys merchant customization. The `CONFIRM` action type exists for this.

4. What is the correct session model? One conversation per store (continuous), or one conversation per session? Recommendation: one continuous conversation per store, trimmed by the summarization strategy in Section 2.3.

5. Should merchants be able to see their conversation history? Yes — it builds trust. A collapsible history panel in the dashboard is a Phase 4 milestone, not a Phase 5 stretch goal.

---

*This spec is the handoff document for the Phase 4 engineer or Claude instance. Read `composition-research.md` first. Read `action.md` for Phase 1–3 context. Then start at Layer 1 Schema.*
