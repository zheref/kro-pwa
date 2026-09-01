/**
 * SCAFFOLDING — ≥7 mock variations of the demo domain model (`RC-13`).
 *
 * The spread is the canonical one: convenient (typical, freshlyIssued,
 * withSignature), neutral (emptyMessage, noSignature) and inconvenient
 * (longMessage, unicode, stale). Stories, render tests and Service fixtures all
 * consume these — a domain value is never written inline in a test.
 */
import type { Greeting } from '../Greeting'

export const greetingMocks = {
  /** The happy path: a short greeting issued this morning. */
  typical: {
    id: 'greeting-1',
    recipient: 'ada',
    message: 'Good morning, Ada.',
    signature: '— Kro',
    issuedAt: new Date('2026-01-15T08:00:00.000Z'),
  } satisfies Greeting,

  /** Just written — exercises "issued seconds ago" formatting. */
  freshlyIssued: {
    id: 'greeting-2',
    recipient: 'grace',
    message: 'Welcome back, Grace.',
    signature: '— Kro',
    issuedAt: new Date('2026-01-15T08:59:59.000Z'),
  } satisfies Greeting,

  /** Months old — exercises stale-timestamp presentation. */
  stale: {
    id: 'greeting-3',
    recipient: 'alan',
    message: 'Long time no see, Alan.',
    signature: '— Kro',
    issuedAt: new Date('2025-03-02T11:30:00.000Z'),
  } satisfies Greeting,

  /** The optional field is absent — the layout must not reserve space for it. */
  noSignature: {
    id: 'greeting-4',
    recipient: 'linus',
    message: 'Hey Linus.',
    signature: null,
    issuedAt: new Date('2026-01-14T19:45:00.000Z'),
  } satisfies Greeting,

  /** Neutral / empty: a greeting whose body never arrived. */
  emptyMessage: {
    id: 'greeting-5',
    recipient: 'nobody',
    message: '',
    signature: null,
    issuedAt: new Date('2026-01-10T06:00:00.000Z'),
  } satisfies Greeting,

  /** Inconvenient: a body far longer than any line box. */
  longMessage: {
    id: 'greeting-6',
    recipient: 'verbose',
    message: 'A very warm and thoroughly unnecessary welcome to you. '
      .repeat(8)
      .trim(),
    signature: '— Kro, at length',
    issuedAt: new Date('2026-01-12T13:20:00.000Z'),
  } satisfies Greeting,

  /** Inconvenient: non-ASCII names, emoji, and right-to-left text. */
  unicode: {
    id: 'greeting-7',
    recipient: '山田',
    message: 'おはよう、山田さん 🌸 — مرحبا',
    signature: '— クロ',
    issuedAt: new Date('2026-01-13T22:05:00.000Z'),
  } satisfies Greeting,
}
