/**
 * ≥7 mock variations of `EarlyAccessRequest` (`RC-13`), for suites driving a
 * form, a Producer or the route.
 *
 * Spread: convenient (typical, bare, androidVote), neutral (missingLocale)
 * and inconvenient (longEmail, unicodeLocalPart, plus the two addresses the
 * stubbed Services fail on: alreadyJoined, offline). Every address is on the
 * reserved `.invalid` / `example.*` domains, so a fixture can never reach a
 * real inbox.
 */
import type { EarlyAccessRequest } from '../EarlyAccessRequest'

const LONG_LOCAL_PART = 'a-very-patient-person-who-types-their-whole-name'

export const earlyAccessRequestMocks = {
  typical: {
    email: 'ada@example.com',
    platform: 'ios',
    source: 'hero',
    locale: 'en-US',
  } satisfies EarlyAccessRequest,

  /** No context at all — only the two required fields. */
  bare: {
    email: 'alan@example.net',
    platform: 'web',
    source: null,
    locale: null,
  } satisfies EarlyAccessRequest,

  androidVote: {
    email: 'linus@example.org',
    platform: 'android',
    source: 'platforms',
    locale: 'fi-FI',
  } satisfies EarlyAccessRequest,

  /** The stubbed Service answers this address with a 409. */
  alreadyJoined: {
    email: 'already@kro.invalid',
    platform: 'macos',
    source: 'hero',
    locale: 'en-GB',
  } satisfies EarlyAccessRequest,

  /** The stubbed Service answers this address with a network failure. */
  offline: {
    email: 'offline@kro.invalid',
    platform: 'ios',
    source: 'footer',
    locale: 'es-CO',
  } satisfies EarlyAccessRequest,

  /** A source but no locale — the browser sent no language tag. */
  missingLocale: {
    email: 'barbara@example.com',
    platform: 'windows',
    source: 'platforms',
    locale: null,
  } satisfies EarlyAccessRequest,

  /** An address far wider than any input box, still under 254 characters. */
  longEmail: {
    email: `${LONG_LOCAL_PART}.${LONG_LOCAL_PART}@subdomain.example.com`,
    platform: 'ipados',
    source: 'hero',
    locale: 'en-AU',
  } satisfies EarlyAccessRequest,

  /** A non-ASCII local part on an ASCII domain. */
  unicodeLocalPart: {
    email: 'josé.müller@example.org',
    platform: 'macos',
    source: 'footer',
    locale: 'de-DE',
  } satisfies EarlyAccessRequest,
}
