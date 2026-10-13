'use client'

import { LandingPage } from '@kro/app'
import { hubUrl } from '../../hostRouting'

/**
 * `RC-39` client wrapper for the landing: imports the shared Page and forwards
 * the values only this shell knows — the app's canonical address, from the hub
 * host env, and the contact address the server read. Nothing else lives here.
 */
export function LandingPageClient({
  contactEmail = null,
}: {
  readonly contactEmail?: string | null
}) {
  return <LandingPage hubUrl={hubUrl()} contactEmail={contactEmail} />
}
