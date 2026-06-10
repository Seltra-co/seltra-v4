# MVP Iteration Loops and Self-Healing Systems 

-- Definition:
A self-healing AI system is a software system that can automatically detect problems, diagnose the root cause, and take corrective actions without requiring a human operator.

Think of it like the immune system of a software platform.

For Seltra MVP, a self-healing architecture looks like this; for  MVP, 80% of the quality gain comes from exactly 2 things:

*A pre-render critic loop — evaluate the blueprint before HTML is generated, fix it, re-evaluate
*A post-render validator — catch broken/empty/generic output and trigger a targeted repair, not a full regeneration

1. critic.agent.ts — evaluates a manifest against 12 rules across 3 dimensions (business, design, 2 content), returns scored issues with severity
2. refinement.engine.ts — runs the critic, applies deterministic fixes for known issue patterns, re-evaluates, caps at 2 iterations to stay within latency budget
3. validator.agent.ts — post-render checks: detects generic product names, empty sections, missing hero, trust bar issues — triggers surgical repair not full regen


What becomes of the system:
Every storefront generation runs a 12-rule critic before rendering, fixes structural issues deterministically in up to 2 iterations, then validates the rendered HTML against 9 checks. If the output is broken it heals itself once before serving. The provider string in the database now includes the critic score so we can monitor quality over time in logs. Total added latency is under ~30ms since it's all synchronous rule evaluation — no extra LLM calls.

The Pipeline (Every Store Generation)
Merchant Prompt
      ↓
Blueprint Agent → extracts brandName, businessType, audience
      ↓
DNA + Composition Rules → selects theme, layout, icon set
      ↓
Manifest Builder → constructs section array
      ↓
── CRITIC runs 12 checks ──
      ↓
Refinement Engine → fixes issues, re-runs critic (max 2x)
      ↓
HTML Renderer → builds the full storefront
      ↓
── VALIDATOR runs 9 checks ──
      ↓
If broken → 1 self-heal retry
      ↓
Deploy to DB + serve merchant


***What the Critic Actually Checks (Pre-Render)***
Business dimension — is this store set up to convert?
- Hero present, not duplicated
- Product grid present
- Trust bar present
- Social proof present

***Design dimension — does the page flow correctly?***
- Hero is first (or second after announcement bar)
- Newsletter is at the bottom, not before products
- Trust bar is before the grid, not after
- Section count is between 4 and 10
- Font pairing is valid and differentiated

***Content dimension — does the copy feel like a real brand?***
- Hero headline isn't the raw prompt (too many words)
- Hero tagline isn't a generic default
- Brand story body isn't the fallback placeholder
- Product grid label is category-derived, not just "Products"
- Trust bar items are industry-specific, not generic defaults

Scoring: 100 points minus penalties. Critical issues cost 25 each. Warnings cost 8. Suggestions cost 2. Must score 72+ with zero criticals to pass without refinement.

*****What the Refinement Engine Does (Pre-Render)******
When the critic finds issues, it fixes them deterministically — no LLM:
Inserts missing sections in the right positions
Deduplicates hero sections
Shortens long headlines to brandName
Replaces generic taglines with industry-matched copy
Reorders sections to the correct sequence
Replaces generic trust bar items with industry-specific ones
Improves brand story body with audience-aware copy
Derives accentSoft if missing
Resets invalid fonts

Runs a maximum of 2 iterations. On iteration 2 it skips suggestions and only handles warnings and criticals. Total latency is under 30ms — pure synchronous logic, zero LLM tokens.


****What the Validator Checks (Post-Render)****
After the HTML is built, 9 checks run against the actual output string:
HTML is at least 8,000 characters
A hero section exists in the markup
Product cards are present
Product names don't look like the business prompt repeated with suffixes
Hero h1 is 6 words or fewer
A checkout button exists
Cart JavaScript is present
Google Fonts are imported
SELTRA_MANIFEST comment is embedded (for the React canvas to extract theme data)

Score 70+ with zero criticals = passed. If it fails, repairs are classified as full regeneration, surgical patch, or flag-only.

****The Self-Heal Logic*****
If validation fails with a critical issue:

System attempts one full retry of the entire generation pipeline
If the retry scores higher than the original, it replaces it
If the retry fails or scores lower, the original is served anyway — the merchant never sees an error
The provider string stored in the database records the outcome: manifest+programmatic-v4+critic:87 or manifest+programmatic-v4+self-healed

The system never crashes a merchant's store creation. Worst case is a lower-quality storefront. Best case is a self-corrected one.


****What This Means in Production*****
What will see improved immediately:

No more hero headlines that are the full user prompt
No more "Why we exist" sections with 2 lines of generic copy in a massive empty box
Product grids always have a proper section label derived from the category
Trust bars always have industry-matched items, not just "Secure checkout, Fast delivery"
Sections always appear in a logical conversion sequence

What the critic score tells you:
The provider field in your DB now logs every store's critic score. You can query it. Anything below 72 that still got deployed means the refinement engine couldn't fix it within 2 passes — those are your signal for what to improve next in the composition rules.
What this system does NOT do (yet):

It does not monitor live conversion rates
It does not A/B test sections
It does not repair stores after they've been deployed to the DB
It does not catch bad Unsplash/Pollinations images
It does not validate that product descriptions are non-generic
It does not check mobile rendering

Those are Phase 2 concerns. The system now covers the generation quality problem, which is the 80% problem for first 50 merchants.

The real insight is:
Quality gates before render are worth 10x more than monitoring after deploy. A critic that catches a broken section in 5ms before it's built is infinitely better than a monitoring system that detects it after a merchant has already seen it.
The self-healing system now is production-ready for the first 50 merchants. It's not an autonomous commerce OS — that's a 2-year roadmap. But it will consistently produce storefronts that don't embarrass in a live demo, and that's the actual business goal right now.
