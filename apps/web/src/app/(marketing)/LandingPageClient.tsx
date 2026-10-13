'use client'

import { LandingPage } from '@kro/app'
import { hubUrl } from '../../hostRouting'

/**
 * `RC-39` client wrapper for the landing: imports the shared Page and forwards
 * the one value only this shell knows — the app's canonical address, from the
 * hub host env (`/my-day` on localhost and previews). Nothing else lives here.
 */
export function LandingPageClient() {
  return <LandingPage hubUrl={hubUrl()} />
}
