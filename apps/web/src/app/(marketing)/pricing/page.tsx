import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { isLandingEnabled } from '../landingFlag'
import { LANDING_FALLBACK_DESTINATION } from '../landingRoute'
import { PricingPageClient } from './PricingPageClient'

/**
 * `/pricing` — the pricing page, in the `(marketing)` group beside the landing
 * (the same layout: providers, skip link, analytics tag).
 *
 * A passive Server Component (`RC-38`): it reads the `landingPage` flag — the
 * one kill switch for the marketing surface (`UZF-22`) — and either forwards
 * to the client wrapper or, with the flag off, 307s to My Day exactly as `/`
 * does. No hook, no store read, no markup of its own.
 *
 * On the hub host it is not reached: the middleware sends `/pricing` there to
 * the same path on the apex (see `hostRouting.ts`).
 */
export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Kro is free for the loop as it ships, on every platform. Plus adds the AI that plans with you, at launch pricing of $5 a month or $48 a year. Plus is not on sale yet.',
  alternates: { canonical: '/pricing' },
}

export default function PricingRoute() {
  if (!isLandingEnabled()) redirect(LANDING_FALLBACK_DESTINATION)
  return <PricingPageClient />
}
