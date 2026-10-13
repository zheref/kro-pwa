'use client'

import { PricingPage } from '@kro/app'
import { hubUrl } from '../../../hostRouting'

/**
 * `RC-39` client wrapper for the pricing page: imports the shared Page and
 * forwards the one value only this shell knows — the app's canonical address,
 * from the hub host env. Nothing else lives here.
 */
export function PricingPageClient() {
  return <PricingPage hubUrl={hubUrl()} />
}
