/**
 * The session feature's own vocabulary — the runtime phase, the pill's visual
 * contract, and the two literals canon spells inline.
 *
 * Ported from canon `Kro/Application/Session/SessionSetupFeature.swift`
 * (`SessionPhase`, `isActivePhase`), `SessionSetupSelectors.swift`
 * (`statusLabelSelector`) and `docs/Features/Session.md` § Visual contract.
 *
 * ## Why a *second* phase type exists beside `PersistedSessionPhase`
 *
 * `@kro/core`'s `PersistedSessionPhase` (#8) deliberately has **four** cases:
 * `running`, `paused`, `break`, `concluded`. It has no `ready`, because a
 * cleared anchor (`null`) *is* "ready" — modelling it would create a second,
 * silent way to say the same thing on disk.
 *
 * The runtime has five, exactly as canon's reducer does: a session sheet can be
 * open in `ready` with no anchor at all. So this module owns the runtime enum
 * and the two total conversions between the pair, rather than widening the
 * persistence type or teaching every call site to special-case `null`.
 */
import { PersistedSessionPhase } from '@kro/core'
import type { ThunkExtra } from '../../library/store'

/**
 * Canon's `SessionSoundType` — the four session sound roles, read off the
 * **service manifest** rather than imported from the Service that declares it.
 *
 * `check-uzf-boundaries.mjs` refuses any feature-tier import of a module under
 * `services/` (`RC-6`, `RC-21`), and `@kro/core` is machine-enforced
 * platform-free, so a web audio role cannot live there either. Deriving it from
 * `ThunkExtra` — `RC-21`'s "single, closed manifest" — leaves one declaration
 * site and no copy to drift. `features/platform/PlatformVocabulary.ts` derives
 * the same type the same way for the same reason; this lane derives its own
 * rather than reaching into a sibling feature's folder (`UZF-6`).
 */
export type SessionSoundRole = Parameters<
  ThunkExtra['audioFeedbackService']['play']
>[0]

/** Canon's `SessionPhase`, all five cases, in canon declaration order. */
export const SessionPhase = {
  /** Pre-session: the user is configuring duration and mode. No anchor. */
  ready: 'ready',
  /** A countdown or stopwatch is actively running. */
  running: 'running',
  /** Time accounting is frozen; every fragment is closed. */
  paused: 'paused',
  /** Time is up (or a finish-early cleared the threshold); awaiting a choice. */
  concluded: 'concluded',
  /** The short break that follows a focus session. */
  break: 'break',
} as const

export type SessionPhase = (typeof SessionPhase)[keyof typeof SessionPhase]

/** The cases in canon declaration order. */
export const sessionPhases: readonly SessionPhase[] = [
  SessionPhase.ready,
  SessionPhase.running,
  SessionPhase.paused,
  SessionPhase.concluded,
  SessionPhase.break,
]

/**
 * The runtime phase a stored anchor describes. Total in this direction: every
 * persisted case has a runtime twin.
 */
export const sessionPhaseFromPersisted = (
  phase: PersistedSessionPhase,
): SessionPhase => {
  switch (phase) {
    case PersistedSessionPhase.running:
      return SessionPhase.running
    case PersistedSessionPhase.paused:
      return SessionPhase.paused
    case PersistedSessionPhase.break:
      return SessionPhase.break
    default:
      return SessionPhase.concluded
  }
}

/**
 * The persisted phase a runtime phase writes, or `null` for `ready` — which is
 * not a document but the *absence* of one, and whose caller clears the anchor
 * rather than writing it.
 */
export const persistedPhaseFromSessionPhase = (
  phase: SessionPhase,
): PersistedSessionPhase | null => {
  switch (phase) {
    case SessionPhase.running:
      return PersistedSessionPhase.running
    case SessionPhase.paused:
      return PersistedSessionPhase.paused
    case SessionPhase.break:
      return PersistedSessionPhase.break
    case SessionPhase.concluded:
      return PersistedSessionPhase.concluded
    default:
      return null
  }
}

/**
 * Canon's `isActivePhase` — whether time is accruing and the screen should be
 * held awake. `running` and `break`, and nothing else.
 */
export const isActiveSessionPhase = (phase: SessionPhase): boolean =>
  phase === SessionPhase.running || phase === SessionPhase.break

/**
 * Whether the pill is on screen at all. Canon's `isSessionRunningSelector`
 * blocks interactive dismissal for `running`/`paused`/`break`; the pill is
 * additionally visible at `concluded`, where it carries the "mark complete"
 * affordance (`docs/Features/Session.md` § States).
 */
export const isSessionPillVisiblePhase = (phase: SessionPhase): boolean =>
  phase !== SessionPhase.ready

/** Canon's `statusLabelSelector`, literal for literal. */
export const sessionStatusLabel = (phase: SessionPhase): string => {
  switch (phase) {
    case SessionPhase.ready:
      return 'READY'
    case SessionPhase.running:
      return 'FOCUSED'
    case SessionPhase.paused:
      return 'PAUSED'
    case SessionPhase.concluded:
      return 'COMPLETED'
    default:
      return 'BREAK'
  }
}

/**
 * The pill's tint, per `docs/Features/Session.md` § Visual contract: a vivid
 * hue while something is advancing, and the system glass otherwise.
 *
 * `chrome` is named for what it *does* — the pill recedes into the chrome and
 * inherits the tab bar's material — rather than for a colour, because the
 * colour is the design system's (#6) and this tier has none.
 */
export const SessionTint = {
  /** `.running` — the focus hue the sheet and the pill share. */
  focus: 'focus',
  /** `.break` — the soft beige the break shares with the sheet. */
  break: 'break',
  /** `.paused` / `.concluded` — no custom tint; system Liquid Glass. */
  chrome: 'chrome',
} as const

export type SessionTint = (typeof SessionTint)[keyof typeof SessionTint]

export const sessionTintForPhase = (phase: SessionPhase): SessionTint => {
  switch (phase) {
    case SessionPhase.running:
      return SessionTint.focus
    case SessionPhase.break:
      return SessionTint.break
    default:
      return SessionTint.chrome
  }
}

/**
 * The pill's single trailing button, per the "Pill affordance per phase"
 * diagram in `docs/Features/Session.md`.
 */
export const SessionPillAffordance = {
  /** Running or on a break — tapping freezes the clock. */
  pause: 'pause',
  /** Paused — tapping resumes. */
  resume: 'resume',
  /** Concluded — the blue checkmark that closes the endeavor. */
  markComplete: 'markComplete',
  /** Ready — the pill is hidden and offers nothing. */
  none: 'none',
} as const

export type SessionPillAffordance =
  (typeof SessionPillAffordance)[keyof typeof SessionPillAffordance]

export const sessionPillAffordanceForPhase = (
  phase: SessionPhase,
): SessionPillAffordance => {
  switch (phase) {
    case SessionPhase.running:
    case SessionPhase.break:
      return SessionPillAffordance.pause
    case SessionPhase.paused:
      return SessionPillAffordance.resume
    case SessionPhase.concluded:
      return SessionPillAffordance.markComplete
    default:
      return SessionPillAffordance.none
  }
}

/**
 * The title the pill shows during a break — canon's
 * `SessionConfig(title: "Break", …)`, and `docs/Features/Session.md`: *"the
 * pill shows 'Break' in place of the endeavor title"*.
 */
export const BREAK_SESSION_TITLE = 'Break'

/**
 * The title a blank focus session opens with. Editing it (or its symbol)
 * promotes the session to a real endeavor — `docs/Features/Session.md`
 * § Anonymous "Focus Session" promotion.
 */
export const ANONYMOUS_SESSION_TITLE = 'Focus Session'

/** The glyph a blank focus session opens with. */
export const ANONYMOUS_SESSION_SYMBOL = '🍅'
