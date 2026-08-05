import { chunkPassesGateWithReason, createHeroPromptSpec, heroCodegenSpec, repairChunk } from '../ai/agents/hero-nav-builder.agent'
import { runCritic } from '../ai/agents/critic.agent'
import { isFabricationGuarded } from '../ai/design-system/guards'
import { buildDesignBookPromptBlock } from '../ai/design-system/hero-design-book'

describe('hero-nav-builder gate', () => {
  it('allows displayName local variable declarations if only one rendered occurrence remains', () => {
    const source = `function StorefrontHero(props) {
      const displayName = props.store.displayName
      return React.createElement('div', { className: 'seltra-hero-media' }, displayName)
    }`

    const result = chunkPassesGateWithReason(source, 'hero')
    expect(result.ok).toBe(true)
    expect(result.reason).toBeUndefined()
  })

  it('allows displayName in alt/title attributes without counting as rendered headline', () => {
    const source = `function StorefrontHero(props) {
      return React.createElement('div', { className: 'seltra-hero-media' },
        React.createElement('img', { src: 'hero.jpg', alt: props.store.displayName }),
        React.createElement('h1', null, props.store.displayName)
      )
    }`

    const result = chunkPassesGateWithReason(source, 'hero')
    expect(result.ok).toBe(true)
  })

  it('allows two rendered displayName occurrences as a warning-level issue', () => {
    const source = `function StorefrontHero(props) {
      return React.createElement('div', { className: 'seltra-hero-media' }, props.store.displayName, ' ', props.store.displayName)
    }`

    const result = chunkPassesGateWithReason(source, 'hero')
    expect(result.ok).toBe(true)
    expect(result.reason).toBeUndefined()
  })

  it('rejects excessive rendered displayName occurrences', () => {
    const source = `function StorefrontHero(props) {
      return React.createElement('div', { className: 'seltra-hero-media' }, props.store.displayName, ' ', props.store.displayName, ' ', props.store.displayName)
    }`

    const result = chunkPassesGateWithReason(source, 'hero')
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('displayName rendered')
  })

  it('rejects map() without key prop inside callback', () => {
    const source = `function StorefrontHero(props) {
      return React.createElement('div', { className: 'seltra-hero-media' }, React.createElement('h1', null, props.store.displayName), props.products.map(p => React.createElement('div', null, p.name)))
    }`

    const result = chunkPassesGateWithReason(source, 'hero')
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('map() without key')
  })

  it('accepts map callbacks that assign key through a property assignment', () => {
    const source = `function StorefrontHero(props) {
      return React.createElement('div', { className: 'seltra-hero' },
        React.createElement('div', { className: 'seltra-hero-content' }, React.createElement('h1', null, props.store.displayName)),
        React.createElement('div', { className: 'seltra-hero-media' }, props.products.map((product) => {
          const itemProps = {}
          itemProps.key = product.id
          return React.createElement('div', itemProps, product.name)
        }))
      )
    }`

    const result = chunkPassesGateWithReason(source, 'hero')
    expect(result.ok).toBe(true)
  })

  it('rejects heroes that collapse CTA labels into bare text without an actions wrapper', () => {
    const source = `function StorefrontHero(props) {
      return React.createElement('div', { className: 'seltra-hero' },
        React.createElement('div', { className: 'seltra-hero-content' },
          React.createElement('h1', null, props.store.displayName),
          React.createElement('div', null, 'Explore Collection', 'Learn More')
        ),
        React.createElement('div', { className: 'seltra-hero-media' }, React.createElement('img', { src: 'hero.jpg', alt: '' }))
      )
    }`

    const result = chunkPassesGateWithReason(source, 'hero')
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('seltra-hero-actions')
  })

  it('repairs hero CTA rows when the primary button is missing the mandatory className', () => {
    const source = `function StorefrontHero(props) {
      return React.createElement('div', { className: 'seltra-hero' },
        React.createElement('div', { className: 'seltra-hero-content' },
          React.createElement('span', { className: 'seltra-hero-brand' }, props.store.displayName),
          React.createElement('h1', { className: 'seltra-hero-headline' }, 'Radiant Skin, Effortlessly'),
          React.createElement('p', { className: 'seltra-hero-tagline' }, 'Built to match your brand and products.'),
          React.createElement('div', { className: 'seltra-hero-actions' },
            React.createElement('button', { onClick: props.onShopNow }, 'Explore Collection'),
            React.createElement('button', { onClick: props.onOpenCart }, 'Learn More')
          )
        ),
        React.createElement('div', { className: 'seltra-hero-media' }, React.createElement('img', { src: 'hero.jpg', alt: '' }))
      )
    }`

    const repaired = repairChunk(source)
    expect(repaired).toContain('seltra-hero-cta-primary')
    const result = chunkPassesGateWithReason(repaired, 'hero')
    expect(result.ok).toBe(true)
  })


  it('uses a disabled secondary-card payload when building the hero prompt spec', () => {
    const promptSpec = createHeroPromptSpec({
      headline: 'Calm, elevated essentials',
      tagline: 'Designed for daily rituals',
      secondaryCard: { kind: 'pricing-tile', position: 'float-right', fields: { price: 'GHS 550', unit: 'from' } },
    } as any, false)

    expect(promptSpec.secondaryCard).toEqual({ kind: 'none', position: 'float-below', fields: {} })
    expect(heroCodegenSpec(promptSpec)).toMatchObject({
      headline: 'Calm, elevated essentials',
      tagline: 'Designed for daily rituals',
    })
  })

  it('rejects nested createElement without key on outer mapped item', () => {
    const source = `function StorefrontHero(props) {
      return React.createElement('div', { className: 'seltra-hero-media' },
        React.createElement('h1', null, props.store.displayName),
        props.products.map(p => React.createElement('div', null, React.createElement('span', { key: p.id }, p.name)))
      )
    }`

    const result = chunkPassesGateWithReason(source, 'hero')
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('map() without key')
  })

  it('rejects nav responsive hooks with inline display styles', () => {
    const source = `function StorefrontNav(props) {
      return React.createElement('nav', null,
        React.createElement('button', { className: 'seltra-hamburger', style: { display: 'none' }, onClick: props.onToggleMenu }, 'Menu'),
        React.createElement('div', { className: 'seltra-desktop-cats', style: { display: 'flex' } },
          props.categories.map(cat => React.createElement('button', { key: cat, onClick: () => props.onCategoryClick(cat) }, cat))
        ),
        React.createElement(props.CartIcon, null)
      )
    }`

    const result = chunkPassesGateWithReason(source, 'nav')
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('inline display or visibility styles')
  })

  it('rejects nav responsive hooks with inline visibility styles', () => {
    const source = `function StorefrontNav(props) {
      return React.createElement('nav', null,
        React.createElement('button', { className: 'seltra-hamburger', style: { visibility: 'hidden' }, onClick: props.onToggleMenu }, 'Menu'),
        React.createElement('div', { className: 'seltra-desktop-cats' },
          props.categories.map(cat => React.createElement('button', { key: cat, onClick: () => props.onCategoryClick(cat) }, cat))
        ),
        React.createElement(props.CartIcon, null)
      )
    }`

    const result = chunkPassesGateWithReason(source, 'nav')
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('inline display or visibility styles')
  })

  it('repairs inline display and visibility styles on nav hooks', () => {
    const source = `function StorefrontNav(props) {
      return React.createElement('nav', null,
        React.createElement('button', { className: 'seltra-hamburger', style: { display: 'none' }, onClick: props.onToggleMenu }, 'Menu'),
        React.createElement('div', { className: 'seltra-desktop-cats', style: { visibility: 'hidden' } },
          props.categories.map(cat => React.createElement('button', { key: cat, onClick: () => props.onCategoryClick(cat) }, cat))
        ),
        React.createElement(props.CartIcon, null)
      )
    }`

    const repaired = repairChunk(source)
    expect(repaired).not.toMatch(/display\s*:\s*['"](?:none|flex)['"]/i)
    expect(repaired).not.toMatch(/visibility\s*:\s*['"](?:hidden|visible)['"]/i)
  })

  it('rejects hero sources with inline layout styles', () => {
    const source = `function StorefrontHero(props) {
      return React.createElement('div', { className: 'seltra-hero', style: { flexDirection: 'row', padding: '6rem' } },
        React.createElement('div', { className: 'seltra-hero-content' }, React.createElement('h1', null, props.store.displayName)),
        React.createElement('div', { className: 'seltra-hero-media' }, React.createElement('div', { className: 'seltra-hero-secondary', style: { position: 'absolute' } }))
      )
    }`

    const result = chunkPassesGateWithReason(source, 'hero')
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('inline layout styles')
  })

  it('accepts secondary card nested inside seltra-hero-media even with deeper createElement tree', () => {
    const source = `function StorefrontHero(props) {
      return React.createElement('div', { className: 'seltra-hero' },
        React.createElement('div', { className: 'seltra-hero-media' },
          React.createElement('div', { className: 'seltra-hero-image' },
            React.createElement('div', { className: 'seltra-hero-secondary' }, 'Promo')
          )
        ),
        React.createElement('div', { className: 'seltra-hero-content' }, React.createElement('h1', null, props.store.displayName))
      )
    }`

    const result = chunkPassesGateWithReason(source, 'hero')
    expect(result.ok).toBe(true)
    expect(result.reason).toBeUndefined()
  })

  it('rejects hero that places more than two textual nodes inside seltra-hero-media', () => {
    const source = `function StorefrontHero(props) {
      const imageContent = React.createElement('div', { className: 'img' }, 'img')
      return React.createElement('div', { className: 'seltra-hero', 'data-archetype': 'split' },
        React.createElement('div', { className: 'seltra-hero-media' },
          imageContent,
          React.createElement('div', { style: { backgroundColor: 'rgba(0,0,0,0.2)', display: 'flex' } },
            React.createElement('h1', null, props.store.displayName),
            React.createElement('p', null, 'Tagline'),
            React.createElement('div', null, 'CTA')
          )
        )
      )
    }`

    const result = chunkPassesGateWithReason(source, 'hero')
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('too many textual content nodes')
  })

  it('falls back to safe design-book tokens for unknown model enum values', () => {
    expect(() => buildDesignBookPromptBlock('spacious' as any, 'cinematic' as any)).not.toThrow()
    const promptBlock = buildDesignBookPromptBlock('spacious' as any, 'cinematic' as any)
    expect(promptBlock).toContain('Tagline')
    expect(promptBlock).toContain('MEDIA PANEL')
  })

  it('rejects meta webpage section labels as fabricated trust chips', () => {
    expect(isFabricationGuarded('Featured Collections')).toBe(false)
    expect(isFabricationGuarded('Newsletter signup')).toBe(false)
    expect(isFabricationGuarded('Full-width hero banner')).toBe(false)
  })

  it('rejects editorial-commerce heroes without an explicit scrim layer', () => {
    const source = `function StorefrontHero(props) {
      return React.createElement('div', { className: 'seltra-hero', 'data-archetype': 'editorial-commerce' },
        React.createElement('div', { className: 'seltra-hero-content' }, React.createElement('h1', null, props.store.displayName)),
        React.createElement('div', { className: 'seltra-hero-media' }, React.createElement('img', { src: 'hero.jpg', alt: '' }))
      )
    }`

    const result = chunkPassesGateWithReason(source, 'hero')
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('scrim')
  })

  it('allows editorial-commerce heroes with an explicit scrim layer', () => {
    const source = `function StorefrontHero(props) {
      return React.createElement('div', { className: 'seltra-hero', 'data-archetype': 'editorial-commerce' },
        React.createElement('div', { className: 'seltra-hero-content' }, React.createElement('h1', null, props.store.displayName)),
        React.createElement('div', { className: 'seltra-hero-media' },
          React.createElement('img', { src: 'hero.jpg', alt: '' }),
          React.createElement('div', { className: 'seltra-hero-scrim', style: { background: 'linear-gradient(90deg, rgba(0,0,0,0.65), rgba(0,0,0,0.15))' } })
        )
      )
    }`

    const result = chunkPassesGateWithReason(source, 'hero')
    expect(result.ok).toBe(true)
  })

  it('allows map() with key prop', () => {
    const source = `function StorefrontHero(props) {
      return React.createElement('div', { className: 'seltra-hero-media' }, React.createElement('h1', null, props.store.displayName), props.products.map(p => React.createElement('div', { key: p.id }, p.name)))
    }`

    const result = chunkPassesGateWithReason(source, 'hero')
    expect(result.ok).toBe(true)
  })

  it('flags missing layered hero composition for layered archetypes', () => {
    const report = runCritic({
      sections: [],
      palette: { bg: '#ffffff', surface: '#f8f8f8', accentSoft: '#efe8ff' },
      typography: { headingFont: 'Inter', bodyFont: 'DM Sans' },
      heroSpec: { archetype: 'product-spotlight-floating', motionProfile: 'staggered-reveal' },
      heroSource: `function StorefrontHero(props) { return React.createElement('div', { className: 'seltra-hero' }, React.createElement('h1', null, props.store.displayName)) }`,
    }, {
      businessName: 'Test Store',
      businessType: 'Retail',
      targetAudience: 'Shoppers',
      storeFeatures: [],
    } as any)

    expect(report.issues.some((issue) => issue.id === 'hero-missing-layering')).toBe(true)
  })

  it('flags missing motion pattern for staggered reveal heroes', () => {
    const report = runCritic({
      sections: [],
      palette: { bg: '#ffffff', surface: '#f8f8f8', accentSoft: '#efe8ff' },
      typography: { headingFont: 'Inter', bodyFont: 'DM Sans' },
      heroSpec: { archetype: 'editorial-commerce', motionProfile: 'staggered-reveal' },
      heroSource: `function StorefrontHero(props) { return React.createElement('div', { className: 'seltra-hero' }, React.createElement('h1', null, props.store.displayName)) }`,
    }, {
      businessName: 'Test Store',
      businessType: 'Retail',
      targetAudience: 'Shoppers',
      storeFeatures: [],
    } as any)

    expect(report.issues.some((issue) => issue.id === 'hero-missing-motion-profile')).toBe(true)
  })
})
