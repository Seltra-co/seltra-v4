export interface Job {
  slug: string
  title: string
  team: string
  location: string
  type: string
  compensation: string
  summary: string
  mission: string
  responsibilities: string[]
  youAre: string[]
  niceToHave: string[]
  stage: string
}

export const JOBS: Job[] = [
  {
    slug: 'founding-gtm-operations-partner',
    title: 'Founding GTM & Operations Partner',
    team: 'Founding team',
    location: 'Accra, Ghana - Remote-friendly',
    type: 'Full-time or part-time',
    compensation: 'Cash + meaningful equity',
    summary:
      'Help us onboard our first merchants, shape go-to-market, and build the operational backbone of an AI-native commerce stack.',
    mission:
      'Own everything that turns Seltra from a product into a movement: getting the first 100 merchants live, shaping our positioning in the African commerce ecosystem, and building the playbooks our future team will run.',
    responsibilities: [
      'Own merchant pipeline end-to-end, from outreach and demos to onboarding and activation.',
      'Run weekly merchant interviews and turn insights into product, marketing, and pricing decisions.',
      'Design and operate the early sales motion across inbound, partnerships, and community.',
      'Stand up internal operations: CRM, support, analytics, and fulfillment workflows.',
      'Represent Seltra at events, in communities, and with early partners and investors.',
      'Work directly with the founders on company strategy and storytelling.',
    ],
    youAre: [
      'A builder who has shipped real things: businesses, communities, campaigns, or products.',
      'Comfortable speaking with shop owners, traders, and founders every single day.',
      'Structured, fast, and unfazed by ambiguity.',
      'Excited by AI and how it changes the shape of small-business operations.',
    ],
    niceToHave: [
      'Experience in commerce, payments, fintech, or SaaS in an African market.',
      'Have started or operated a business of your own.',
      'Strong writing and on-camera comfort.',
    ],
    stage:
      'Pre-seed. Tiny founding team. You will be on the cap table from day one and shape the company at its foundation.',
  },
]

export const getJob = (slug: string) => JOBS.find((job) => job.slug === slug)
