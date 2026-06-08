'use client'
import * as Accordion from '@radix-ui/react-accordion'
import { ChevronDown } from 'lucide-react'

const DEFAULT = [
  { question:'How long does delivery take?',    answer:'Most orders are delivered within 2–5 business days depending on your location.' },
  { question:'What is your return policy?',     answer:'We accept returns within 14 days of delivery. Items must be unused and in original packaging.' },
  { question:'Do you offer local pickup?',      answer:'Yes! Select local pickup at checkout.' },
  { question:'How do I track my order?',        answer:'You will receive a tracking link via email once your order ships.' },
]

export function FAQSection({ headline='Common questions', items }: { headline?: string; items?: Array<{ question: string; answer: string }> }) {
  const faqs = items?.length ? items : DEFAULT
  return (
    <section className="storefront-section border-t" style={{ borderColor:'var(--store-border)' }}>
      <h2 className="store-heading mb-8 text-[clamp(1.5rem,3vw,2rem)] font-bold">{headline}</h2>
      <Accordion.Root type="single" collapsible className="max-w-2xl space-y-2">
        {faqs.map((faq, i) => (
          <Accordion.Item key={i} value={String(i)} className="rounded-[var(--store-radius)] border" style={{ borderColor:'var(--store-border)' }}>
            <Accordion.Trigger className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-semibold" style={{ color:'var(--store-text)' }}>
              {faq.question}
              <ChevronDown className="h-4 w-4 flex-shrink-0 opacity-50 transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
            </Accordion.Trigger>
            <Accordion.Content className="overflow-hidden px-5 pb-4 text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down" style={{ color:'var(--store-muted)' }}>
              {faq.answer}
            </Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    </section>
  )
}
