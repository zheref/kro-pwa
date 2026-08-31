/**
 * The running-session anchor's persisted document — canon
 * `KroCore/Model/Session/PersistedRunningSession.swift`, whose `fileURL`
 * extension resolves `Documents/runningSession.json`.
 *
 * ## What canon's contract actually is
 *
 * Three properties, stated by canon's own header comment:
 *
 * > *Anchored running-session state persisted to disk so the session pill and
 * > session sheet recover correctly after a kill/relaunch. Elapsed time is
 * > derived from `fragments` against the current `Date.now`; the 1-second
 * > display tick does NOT contribute to the model. **Writes happen on phase
 * > transitions (start / pause / resume / finish / abort) only.***
 *
 * So: **one document**, **whole-document replace**, **written only on a phase
 * transition**. The file path is the mechanism; those three are the contract,
 * and they are what this port must preserve. #8 already ported the model and
 * every derivation over it; this file adds only the wire form, because the
 * anchor has to survive a reload and `Date` does not survive `JSON.stringify`
 * unaided.
 *
 * ## Why the web writes epoch millis rather than ISO strings
 *
 * `JSON.stringify(new Date())` produces an ISO-8601 string, and `JSON.parse`
 * gives it back as a `string` — so a naive round-trip yields an anchor whose
 * `fragments[0].start` is not a `Date`, and every duration computed from it is
 * `NaN`. That failure is silent: the pill renders, the numbers are nonsense.
 * The document therefore stores each instant as an explicit epoch-millisecond
 * **number**, matching the watermark encoding used everywhere else in this
 * module, and `decodeRunningSessionAnchor` rebuilds real `Date`s.
 *
 * The anchor is **local-only** — it never reaches Kro Cloud, so it is under no
 * obligation to match Apple's on-disk bytes, and this file deliberately does
 * not pretend otherwise (contrast `PerformanceRecord`, which is a synced row
 * and does match Apple byte-for-byte).
 *
 * ## Corruption is "no session", never a throw
 *
 * A document that is not an object, or whose phase/mode is unrecognised, or
 * that violates the fragment invariants #8 defined (`isRunningSessionConsistent`
 * — at most one open fragment, none open while paused), decodes to `null`. A
 * plausible-looking wrong number is worse than no session at all: the user sees
 * a pill claiming a session that cannot be resumed, and every elapsed figure
 * derived from it is wrong. `null` puts them back on `ready`, which is the one
 * state a cleared anchor already means.
 */
import type { FocusSessionFragment } from '../domain/session/FocusSessionFragment'
import { makeFocusSessionFragment } from '../domain/session/FocusSessionFragment'
import { focusTimerModeFromRawValue } from '../domain/session/FocusTimerMode'
import type { PersistedRunningSession } from '../domain/session/PersistedRunningSession'
import {
  isRunningSessionConsistent,
  makePersistedRunningSession,
  makePersistedSessionEndeavor,
  persistedSessionPhaseFromRawValue,
} from '../domain/session/PersistedRunningSession'
import type { EpochMillis } from './EpochMillis'
import { dateFromEpochMillis, epochMillisFromDate } from './EpochMillis'

/**
 * The storage key for the single anchor document.
 *
 * It sits **inside** the `kro:` preference namespace, which is a decision, not
 * a default: the anchor is per-account state (it names an endeavor by id), so
 * signing out must take it with everything else. Storing it outside the
 * namespace would leave one user's running session visible to the next person
 * who signs in on a shared device — the exact leak the wipe exists to prevent.
 */
export const RUNNING_SESSION_ANCHOR_KEY = 'kro:session.running'

/** One fragment, on the wire. `end` is `null` while the fragment is open. */
export interface EncodedSessionFragment {
  readonly start: EpochMillis
  readonly end: EpochMillis | null
}

/** The anchor document — one JSON object, replaced whole on every write. */
export interface RunningSessionAnchorDocument {
  readonly endeavor: {
    readonly id: string
    readonly symbol: string
    readonly title: string
    readonly duration: number | null
  }
  readonly targetDuration: number
  readonly mode: string
  readonly fragments: readonly EncodedSessionFragment[]
  readonly phase: string
}

const encodeFragment = (
  fragment: FocusSessionFragment,
): EncodedSessionFragment => ({
  start: epochMillisFromDate(fragment.start),
  end: fragment.end === null ? null : epochMillisFromDate(fragment.end),
})

/** The anchor as one document. Total — every session has a wire form. */
export const encodeRunningSessionAnchor = (
  session: PersistedRunningSession,
): RunningSessionAnchorDocument => ({
  endeavor: {
    id: session.endeavor.id,
    symbol: session.endeavor.symbol,
    title: session.endeavor.title,
    duration: session.endeavor.duration,
  },
  targetDuration: session.targetDuration,
  mode: session.mode,
  fragments: session.fragments.map(encodeFragment),
  phase: session.phase,
})

const decodeFragment = (raw: unknown): FocusSessionFragment | null => {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
  const entry = raw as Record<string, unknown>
  if (typeof entry.start !== 'number') return null
  if (entry.end !== null && typeof entry.end !== 'number') return null
  return makeFocusSessionFragment({
    start: dateFromEpochMillis(entry.start),
    end: entry.end === null ? null : dateFromEpochMillis(entry.end),
  })
}

/**
 * A stored document back, or `null` when it does not describe a resumable
 * session. See the file header for why `null` rather than a throw or a
 * best-effort partial.
 *
 * The consistency check at the end is #8's own predicate, reused rather than
 * restated: `isRunningSessionConsistent` exists precisely so "a hydration path
 * (#10) can reject a corrupt anchor rather than compute a plausible-looking
 * wrong number from it". This is that path.
 */
export const decodeRunningSessionAnchor = (
  raw: unknown,
): PersistedRunningSession | null => {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
  // Named `payload`, not `document`: `packages/core` is machine-checked
  // platform-free, and `scripts/check-platform-free.mjs` reads a bare
  // `document.` as the DOM global regardless of scope.
  const payload = raw as Record<string, unknown>

  const endeavorRaw = payload.endeavor
  if (
    typeof endeavorRaw !== 'object' ||
    endeavorRaw === null ||
    Array.isArray(endeavorRaw)
  ) {
    return null
  }
  const endeavor = endeavorRaw as Record<string, unknown>
  if (
    typeof endeavor.id !== 'string' ||
    typeof endeavor.symbol !== 'string' ||
    typeof endeavor.title !== 'string'
  ) {
    return null
  }

  if (typeof payload.targetDuration !== 'number') return null
  if (typeof payload.mode !== 'string') return null
  if (typeof payload.phase !== 'string') return null
  if (!Array.isArray(payload.fragments)) return null

  const mode = focusTimerModeFromRawValue(payload.mode)
  if (mode === null) return null
  const phase = persistedSessionPhaseFromRawValue(payload.phase)
  if (phase === null) return null

  const fragments: FocusSessionFragment[] = []
  for (const entry of payload.fragments) {
    const fragment = decodeFragment(entry)
    // One bad fragment invalidates the whole anchor: the elapsed figure is a
    // sum over all of them, so silently dropping one produces a session that
    // is short by exactly the period the user cannot see.
    if (fragment === null) return null
    fragments.push(fragment)
  }

  const session = makePersistedRunningSession({
    endeavor: makePersistedSessionEndeavor({
      id: endeavor.id,
      symbol: endeavor.symbol,
      title: endeavor.title,
      duration:
        typeof endeavor.duration === 'number' ? endeavor.duration : null,
    }),
    targetDuration: payload.targetDuration,
    mode,
    fragments,
    phase,
  })

  return isRunningSessionConsistent(session) ? session : null
}
