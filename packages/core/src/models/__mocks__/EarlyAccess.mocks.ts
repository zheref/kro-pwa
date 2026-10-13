/**
 * ≥7 mock variations of the early-access domain (`RC-13`): receipts and the
 * requests that produce them.
 *
 * Spread: convenient (typical, justJoined, androidVote), neutral (noPosition)
 * and inconvenient (unicodeEmail, longEmail, staleJoinedAt). Every address is
 * on the reserved `.invalid` / `example.*` domains, so a fixture can never
 * reach a real inbox.
 */
import type { EarlyAccessReceipt } from '../EarlyAccessReceipt'
import type { EarlyAccessRequest } from '../EarlyAccessRequest'

const LONG_LOCAL_PART = 'a-very-patient-person-who-types-their-whole-name'

export const earlyAccessMocks = {
  /** The happy path: an iPhone visitor, third in line. */
  typical: {
    id: 'ea-0001',
    email: 'ada@example.com',
    platform: 'ios',
    position: 3,
    joinedAt: new Date('2026-10-01T09:30:00.000Z'),
  } satisfies EarlyAccessReceipt,

  /** Joined seconds ago — exercises "just now" presentation. */
  justJoined: {
    id: 'ea-0002',
    email: 'grace@example.com',
    platform: 'macos',
    position: 1,
    joinedAt: new Date('2026-10-12T12:00:00.000Z'),
  } satisfies EarlyAccessReceipt,

  /** A vote for a platform Kro does not ship on yet. */
  androidVote: {
    id: 'ea-0003',
    email: 'linus@example.org',
    platform: 'android',
    position: 42,
    joinedAt: new Date('2026-10-05T18:45:00.000Z'),
  } satisfies EarlyAccessReceipt,

  /** Neutral: a webhook sink with no queue reports no position. */
  noPosition: {
    id: 'ea-0004',
    email: 'alan@example.net',
    platform: 'web',
    position: null,
    joinedAt: new Date('2026-10-10T07:00:00.000Z'),
  } satisfies EarlyAccessReceipt,

  /** Non-ASCII local part and an internationalised domain. */
  unicodeEmail: {
    id: 'ea-0005',
    email: '山田.太郎@例え.テスト',
    platform: 'ipados',
    position: 7,
    joinedAt: new Date('2026-10-08T22:05:00.000Z'),
  } satisfies EarlyAccessReceipt,

  /** An address far wider than any input box. */
  longEmail: {
    id: 'ea-0006',
    email: `${LONG_LOCAL_PART}.${LONG_LOCAL_PART}@subdomain.example.com`,
    platform: 'windows',
    position: 1024,
    joinedAt: new Date('2026-10-09T11:11:11.000Z'),
  } satisfies EarlyAccessReceipt,

  /** Joined a year ago — exercises stale-timestamp presentation. */
  staleJoinedAt: {
    id: 'ea-0007',
    email: 'old-timer@example.com',
    platform: 'watchos',
    position: 2,
    joinedAt: new Date('2025-09-01T08:00:00.000Z'),
  } satisfies EarlyAccessReceipt,
}

/** Requests, for suites driving a form or a Producer. */
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
}
