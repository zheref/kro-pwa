/**
 * The platforms the sign-up offers, in the order the picker lists them: the
 * Apple devices first, the web, then what is still on the way.
 */
import type { KroPlatform } from '@kro/core'

export const EARLY_ACCESS_PLATFORM_ORDER: readonly KroPlatform[] = [
  'ios',
  'ipados',
  'macos',
  'watchos',
  'web',
  'android',
  'windows',
]

/**
 * The notice under the email field: what is kept, why, for how long, and how
 * to be removed. It names everything the request carries (SEC-8) — the
 * address and platform, plus the page part, language and time the sign-up
 * records — and the removal path the page actually has (the footer link).
 */
export const EARLY_ACCESS_PRIVACY_NOTICE =
  "We keep your address and platform pick only to tell you when early access opens, then delete them. The sign-up also records which part of the page you used, your browser's language and the time. To be removed sooner, write to us through the link in the footer."

/** The line beside the submit button, in plain visitor language. */
export const EARLY_ACCESS_PROMISE =
  "We don't show sign-up counts, ratings or quotes here. We'll email you when your platform is ready."
