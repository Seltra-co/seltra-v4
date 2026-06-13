import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Fraunces } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'
import { StoreProvider } from '@/context/StoreContext'
import './globals.css'

const displayFont = Fraunces({
  variable: '--font-display',
  subsets: ['latin'],
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://www.seltra.co'),
  title: {
    default: 'Seltra — Launch a full storefront today. AI agents run the business.',
    template: '%s | Seltra',
  },
  description:
    'Seltra deploys autonomous AI agents that manage storefronts, payments, fulfillment, marketing, and customer support — so merchants can launch and run an online business in minutes.',
  keywords: [
    'AI commerce platform',
    'autonomous AI agents',
    'storefront builder Africa',
    'AI ecommerce Ghana',
    'AI merchant tools',
    'online store builder',
    'AI agents for business',
  ],
  authors: [{ name: 'Seltra' }],
  creator: 'Seltra',
  publisher: 'Seltra',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://www.seltra.co',
    siteName: 'Seltra',
    title: 'Seltra — Launch a full storefront today. AI agents run the business.',
    description:
      'Autonomous AI agents that handle commerce operations, marketing, payments, and fulfillment for your online store.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Seltra — AI agents for commerce',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@seltra_co',
    creator: '@seltra_co',
    title: 'Seltra — Launch a full storefront today. AI agents run the business.',
    description:
      'Autonomous AI agents that handle commerce operations, marketing, payments, and fulfillment for your online store.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  alternates: {
    canonical: 'https://www.seltra.co',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} ${displayFont.variable}`}
    >
      <body suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
          storageKey="seltra-theme"
        >
          <StoreProvider>
            {children}
          </StoreProvider>
          <Toaster
            position="bottom-left"
            toastOptions={{
              style: {
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                color: 'hsl(var(--foreground))',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}