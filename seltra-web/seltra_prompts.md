Launch a digital product store for African creators and entrepreneurs — selling premium Notion templates, Canva business kits, Excel financial trackers, and editable pitch deck bundles. Target audience is early-stage founders and side hustlers in Ghana, Nigeria, and Kenya who need professional business tools without the agency price tag. Products are instantly downloadable after payment. Price range GHS 49 – GHS 350. Accept Paystack and mobile money. Store name: Buildr Studio. Brand tone: sharp, no-fluff, built-for-doers. Homepage should lead with the bestseller bundle (Business Starter Pack — 5 templates, GHS 199) and show a live counter of downloads.



Build a skincare brand for young women in Accra and Lagos — selling handmade shea butter body creams, black soap face washes, and turmeric glow serums.Build a skincare brand for young women in Accra and Lagos — selling handmade shea butter body creams, black soap face washes, and turmeric glow serums. Products are made in small batches, no harsh chemicals, positioned between mass-market and luxury. Target customer is a 22–34 year old woman who follows skincare TikTok, cares about ingredients, and is tired of products that weren't made for her skin tone. Price range GHS 85 – GHS 420. Accept Paystack. Store name: Aya Skin. Brand tone: warm, confident, science-meets-tradition. Feature the Glow Starter Kit (cleanser + serum + moisturizer bundle, GHS 299) above the fold. Add a short "why we make it" story section and customer photo reviews.


Launch a contemporary African streetwear brand for men aged 18–30 in Accra, Lagos, and the diaspora — selling graphic tees, cargo pants, and hoodies that blend Kente patterns with street silhouettes. Limited drops, not a permanent catalog. Each collection is 6–8 pieces, restocked only when sold out. Price range $28 – $95. Accept Paystack and Stripe for diaspora customers. Store name: KROM. Brand tone: raw, minimal, culturally rooted — no corporate energy. Lead the homepage with the current drop countdown timer and a single hero product. Show an "already gone" archive of past drops to build scarcity. Add a waitlist signup for the next drop.


Build a B2B supply store for restaurant and food business owners across Ghana — selling wholesale packaging (takeaway boxes, kraft bags, cup sleeves), branded label printing, and bulk disposable cutlery. Minimum order quantities apply. Customers are chop bar owners, cloud kitchens, catering companies, and fast food startups who currently order from Accra's industrial area in person. Price is per-carton, not per-unit. Accept bank transfer and Paystack business. Store name: PackIt Ghana. Brand tone: straightforward, reliable, built for operators. Homepage should show top 5 bestselling SKUs with MOQ and lead time clearly stated. Add a bulk quote request form for custom orders above 500 units


My brand is Lumière Skin — a premium skincare line for Ghanaian women with melanin-rich skin. We sell vitamin C serums, shea butter moisturizers, and glow face oils. Our customers are women aged 25–40 who care about clean, effective ingredients. Based in Kumasi, shipping nationwide.




//seltra context engineering MVP:
- memory
-

//payment agent  - payment
//order agent - orders
//sales agent - store sales
//store agent - merchant store
//customer agent - customer satisfaction, success and service
//analytics agent - analytics
//marketing agent - emails, contact 
//dispatch agent - delivery, drop shipping etc




MERCHANT ID:
Rules for Seltra Ops:
Must be unique.
Put it in the MerchantApplication.merchantId field.
Set status to:
approved

//Then dashboard: 
The app verifies only records where:
merchantId = input
status = "approved"

So a working approved merchant record needs:
status: approved
merchantId: SELTRA-2026-0001
A rejected, pending, or blank merchantId will not activate the dashboard.


SELTRA-2026-0001
SELTRA-2026-0002
SELTRA-GH-0001
SELTRA-ZURI-8K2Ps


-Seltra Ops Admin creates merchant credentials;
When merchant logins in we always send an OTP to their phone to verify
Also, how do we make sure ops team does not know or break into merchant dashboard, if anything we can only reset their credentials on ops dashboard

-Seltra ensures trust, safety and business continuity 



************ 
IMPORTANT FIXES:
StorefrontShell.tsx — two bugs fixed:
The empty scroll space was caused by CSS-only height compensation that doesn't work reliably across browsers — after transform: scale(), the element's layout box stays at its original size but the visual footprint shrinks, leaving a gap. The fix uses a ResizeObserver on the inner div to measure its scrollHeight after render and imperatively sets the wrapper's height to scrollHeight * scale. This happens after every content resize (lazy images, etc.), so the wrapper always collapses to exactly what's visible.
The "forced/clipped" scale was the static 0.58 fallback being wrong for any panel width that isn't exactly ~740px. The fix adds a ResizeObserver on the wrapper div itself to recompute scale = containerWidth / 1280 live. This means the preview fills the panel correctly at any dashboard layout width.




*************
NEW
seltra-context-spec.md — the Phase 4 handoff: The answer to LangGraph/LangChain/CrewAI is build thin internal layer now, LangGraph when you hit genuine graph-branching needs (the spec defines exactly when that threshold is). The three layers are:

StoreMemory — ConversationTurn table + storefrontManifest as the live store state (replaces storefrontCode as primary artifact)
ContextBuilder — injects current manifest + recent turns into each agent call within a token budget, with a summarization path for long histories
Action executor — routes PATCH_MANIFEST / REGENERATE_MANIFEST / ADD_PRODUCT / UPDATE_PRODUCT / CLARIFY / CONFIRM to the right side effect

The migration is additive — nothing in Phases 1–3 breaks.