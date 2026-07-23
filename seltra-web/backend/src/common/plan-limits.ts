
/*
Tier limits (1 store/50 products free → 3 stores/100 products premium)
 */
export type PlanTier = 'free' | 'premium'

export function planLimits(plan?: string | null) {
  const tier: PlanTier = plan === 'premium' ? 'premium' : 'free'
  return {
    tier,
    maxStores: tier === 'premium' ? 3 : 1,
    maxProductsPerStore: tier === 'premium' ? 100 : 50,
  }
}