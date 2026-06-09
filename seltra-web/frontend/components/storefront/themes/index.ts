//seltra-web/frontend/components/storefront/themes/index.ts
export type ThemeKey = 'luxury' | 'bold-dark' | 'minimal-light' | 'editorial' | 'warm-earth' | 'cool-modern' | 'vibrant'

export interface DesignTokens {
  primaryColor: string; surfaceColor: string; borderColor: string; textColor: string
  mutedColor: string; accentColor: string; accentTextColor: string; accentSoftColor: string
  headingFont: string; bodyFont: string
  borderRadius: 'sharp' | 'rounded' | 'pill'
  spacing: 'compact' | 'comfortable' | 'spacious'
  shadow: 'none' | 'subtle' | 'elevated'
}

export const THEMES: Record<ThemeKey, DesignTokens> = {
  luxury:          { primaryColor:'#faf9f7', surfaceColor:'#ffffff', borderColor:'#e8e4df', textColor:'#1a1a1a', mutedColor:'#7a7060', accentColor:'#b8860b', accentTextColor:'#ffffff', accentSoftColor:'#fdf5e4', headingFont:'Playfair Display', bodyFont:'DM Sans',  borderRadius:'rounded', spacing:'spacious',    shadow:'subtle'   },
  'bold-dark':     { primaryColor:'#0d0d0d', surfaceColor:'#141414', borderColor:'#2a2a2a', textColor:'#f0f0f0', mutedColor:'#888888', accentColor:'#ff3c00', accentTextColor:'#ffffff', accentSoftColor:'#1f1008', headingFont:'Bebas Neue',       bodyFont:'Inter',   borderRadius:'sharp',   spacing:'compact',     shadow:'none'     },
  'minimal-light': { primaryColor:'#fafafa', surfaceColor:'#ffffff', borderColor:'#e5e5e5', textColor:'#1a1a1a', mutedColor:'#717171', accentColor:'#2563eb', accentTextColor:'#ffffff', accentSoftColor:'#eff6ff', headingFont:'Syne',             bodyFont:'Inter',   borderRadius:'rounded', spacing:'comfortable', shadow:'subtle'   },
  editorial:       { primaryColor:'#f8f6f3', surfaceColor:'#ffffff', borderColor:'#e0d8ce', textColor:'#1c1815', mutedColor:'#8c7b6b', accentColor:'#c4622d', accentTextColor:'#ffffff', accentSoftColor:'#f9ede8', headingFont:'Fraunces',         bodyFont:'DM Sans', borderRadius:'rounded', spacing:'spacious',    shadow:'subtle'   },
  'warm-earth':    { primaryColor:'#faf7f2', surfaceColor:'#ffffff', borderColor:'#e8dfd0', textColor:'#2d2419', mutedColor:'#8a7560', accentColor:'#c4622d', accentTextColor:'#ffffff', accentSoftColor:'#f5ece6', headingFont:'Fraunces',         bodyFont:'DM Sans', borderRadius:'pill',    spacing:'comfortable', shadow:'subtle'   },
  'cool-modern':   { primaryColor:'#f0f4f8', surfaceColor:'#ffffff', borderColor:'#dde3ea', textColor:'#0f1923', mutedColor:'#627282', accentColor:'#0070f3', accentTextColor:'#ffffff', accentSoftColor:'#e8f0fe', headingFont:'Inter',            bodyFont:'Inter',   borderRadius:'rounded', spacing:'comfortable', shadow:'elevated' },
  vibrant:         { primaryColor:'#0a0a0a', surfaceColor:'#111111', borderColor:'#1f1f1f', textColor:'#ffffff', mutedColor:'#888888', accentColor:'#00e676', accentTextColor:'#000000', accentSoftColor:'#00e67615', headingFont:'Syne',           bodyFont:'Inter',   borderRadius:'rounded', spacing:'compact',     shadow:'none'     },
}

export function getTheme(key: ThemeKey): DesignTokens { return THEMES[key] ?? THEMES['minimal-light'] }

export function tokensToPalette(t: DesignTokens) {
  return { bg: t.primaryColor, surface: t.surfaceColor, border: t.borderColor, text: t.textColor, muted: t.mutedColor, accent: t.accentColor, accentText: t.accentTextColor, accentSoft: t.accentSoftColor }
}
