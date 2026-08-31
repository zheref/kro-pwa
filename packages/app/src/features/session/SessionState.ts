/**
 * The session slice's `State` (`RC-24`, `UZF-8`, `UZF-9`).
 *
 * Split into its own file — the shape plus its initial value runs past the
 * ~40-line threshold `RC-1` sets, the same reason `EndeavorDetailState.ts`
 * exists (#29). Everything else about it is `RC-24`: domain types only,
 * `readonly` throughout, one discriminated lifecycle field.
 *
 * ## The three fields that carry the feature's hard guarantees
 *
 * **`anchor`** is the single source of elapsed time. There is no tick counter
 * anywhere in this state: `elapsedDuration` is *derived* from the anchor's
 * fragments against `now` on every read (`SessionSelectors.ts`), which is what
 * makes the session kill-resilient — a reload re-reads the fragments and gets a
 * figure that agrees with wall-clock reality even if the tab was closed for ten
 * minutes (`docs/Features/Session.md` § Persistence). Storing a counter here
 * would create a second answer that drifts the moment a tick is throttled.
 *
 * **`now`** is the display clock, and it is *state* rather than a read. Reducers
 * never call `Date.now()` (`RC-24`, `UZF-13`); the tick Producer supplies the
 * instant as the event's payload and this field records it. Every derived time
 * is computed against it, so a suite states the moment it is asking about
 * instead of mocking a global.
 *
 * **`conclusion`** is the exactly-once claim. It moves `none → pending →
 * recording → recorded` and never backwards within one session, and each of
 * those moves happens in a **synchronous** reducer arm — so two ticks racing to
 * observe the same countdown hitting zero cannot both claim it. See
 * `SessionShifters.ts` (`withSessionAwaitingResolution`) and
 * `SessionProducer.ts` (`recordSessionPerformanceThunk`'s `condition`).
 */
import type {
  FocusTimerMode,
  PersistedRunningSession,
  Perform,
  SessionLaunchSource,
  TimeIntervalSeconds,
} from '@kro/core'
import {
  FocusTimerMode as TimerMode,
  defaultPomodoroConfig,
  minutesInSeconds,
} from '@kro/core'
import { FALLBACK_SESSION_TARGET_DURATION } from './SessionCues'
import type { SessionIdentity } from './SessionIdentity'
import type { SessionException } from './SessionException'
import type { SessionOutcome } from './SessionOutcome'
import { SessionPhase } from './SessionVocabulary'

/**
 * The one lifecycle field (`RC-24`, `UZF-9`). `loading`/`loaded` describe the
 * preference + anchor hydration; `failed` is shared by every operation that can
 * report one, via the single `withException` Shifter.
 *
 * Note what it deliberately is **not**: it is not the session's phase. A
 * session can be `running` while `load` is `failed` (an anchor write failed but
 * the clock is still correct), and conflating the two would make an I/O failure
 * look like a stopped session.
 */
export type SessionLoadState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'loaded' }
  | { readonly kind: 'failed'; readonly exception: SessionException }

/**
 * The five `session.*` preferences the running session honours (#11), in
 * seconds where canon stores minutes — this feature speaks one unit, and the
 * conversion happens once, at the read.
 */
export interface SessionPreferences {
  /** `session.defaultDuration` — the post-break reset and the launch fallback. */
  readonly defaultDuration: TimeIntervalSeconds
  /** `session.defaultBreakDuration` — the break countdown's target. */
  readonly defaultBreakDuration: TimeIntervalSeconds
  /** `session.autoStartBreak` — off by default, per canon. */
  readonly autoStartBreak: boolean
  /** `session.keepScreenAwake` — honoured by the wake-lock dispatch. */
  readonly keepScreenAwake: boolean
  /** `session.soundOnEnd` — honoured by the end-of-session cue. */
  readonly soundOnEnd: boolean
}

/**
 * The three flag × preference gates (#11's `FeatureFlagGating`), resolved once
 * per load. Every one is **off** at `statusQuo`, because
 * `sessionStopwatch`/`sessionBreak`/`sessionDurationLearning` are all disabled
 * in the shipped flag set — so the shipped session is a countdown, with no
 * break offered and no duration learning, and this record says so out loud
 * rather than leaving a reader to re-derive it.
 */
export interface SessionAvailability {
  readonly isStopwatchAvailable: boolean
  readonly areBreaksAvailable: boolean
  readonly isDurationLearningEnabled: boolean
}

/**
 * The exactly-once conclusion claim.
 *
 * `pending` is created by exactly one synchronous reducer arm per conclusion;
 * `recording` is entered by `recordSessionPerformanceThunk`'s `condition` +
 * `.pending` pair, which RTK runs synchronously at dispatch time. Between them,
 * neither a racing tick nor a racing dispatch can produce a second record.
 *
 * `breakElapsed` is the break's twin: a break is **never** a performance
 * (`docs/Features/Session.md` § Performances), so it carries no outcome — but
 * it still owes the Producer exactly one `breakComplete` cue and one anchor
 * clear, and it claims them the same way.
 */
export type SessionConclusion =
  | { readonly kind: 'none' }
  | { readonly kind: 'pending'; readonly outcome: SessionOutcome }
  | { readonly kind: 'recording'; readonly outcome: SessionOutcome }
  | {
      readonly kind: 'recorded'
      readonly outcome: SessionOutcome
      readonly performance: Perform
    }
  | { readonly kind: 'breakElapsed'; readonly endedAt: Date }
  | { readonly kind: 'breakFinished' }

export interface SessionState {
  readonly load: SessionLoadState
  /** The runtime phase. `ready` means "no anchor", and the two agree always. */
  readonly phase: SessionPhase
  /** The anchored session, or `null` in `ready`. The only elapsed-time source. */
  readonly anchor: PersistedRunningSession | null
  /** Who the session is for. `null` before a launch surface prepares one. */
  readonly identity: SessionIdentity | null
  readonly mode: FocusTimerMode
  readonly targetDuration: TimeIntervalSeconds
  /** Which rule chose `mode`/`targetDuration` — for the setup sheet's hint. */
  readonly launchSource: SessionLaunchSource | null
  /** The last instant a tick synced. Never read from a clock in this tier. */
  readonly now: Date | null
  readonly preferences: SessionPreferences
  readonly availability: SessionAvailability
  /** Canon's tomato counter: completed/finished performances for this endeavor. */
  readonly completedSessionsCount: number
  readonly conclusion: SessionConclusion
  /** Whether the sheet is auto-presented at the conclusion screen. */
  readonly isPresentingConclusion: boolean
  readonly isEditingTitle: boolean
  readonly editedTitle: string
  readonly isEditingSymbol: boolean
}

/**
 * The preference defaults, straight from #11's declared `defaultValue`s
 * (20 min focus, 5 min break, auto-start off, keep-awake on, sound on) so a
 * surface that renders before `loadSessionPreferencesThunk` resolves shows the
 * same numbers it will show afterwards.
 */
export const defaultSessionPreferences: SessionPreferences = {
  defaultDuration: minutesInSeconds(20),
  defaultBreakDuration: minutesInSeconds(5),
  autoStartBreak: false,
  keepScreenAwake: true,
  soundOnEnd: true,
}

/** Every gate off — the `statusQuo` baseline, and the honest cold-start answer. */
export const defaultSessionAvailability: SessionAvailability = {
  isStopwatchAvailable: false,
  areBreaksAvailable: false,
  isDurationLearningEnabled: false,
}

/**
 * The initial state.
 *
 * `targetDuration` opens at #8's `defaultPomodoroConfig.duration` — 25 minutes,
 * the focus half of the canonical 25 + 5 preset — and **never** at
 * `undefined`, and never at a rest value. That is the second routed defect's
 * fix, stated where it is checkable: legacy `useSession.ts` built
 * `new SessionConfig(undefined, secondsFromMinutes(25))`, i.e. duration
 * *undefined* and 25 minutes as the **rest**, so the timer read zero until a
 * bootstrap effect replaced it. There is no positional constructor to
 * mis-order here, and `FALLBACK_SESSION_TARGET_DURATION` reads its value from
 * the preset rather than restating the number.
 */
export const initialSessionState: SessionState = {
  load: { kind: 'idle' },
  phase: SessionPhase.ready,
  anchor: null,
  identity: null,
  mode: TimerMode.countdown,
  targetDuration: FALLBACK_SESSION_TARGET_DURATION,
  launchSource: null,
  now: null,
  preferences: defaultSessionPreferences,
  availability: defaultSessionAvailability,
  completedSessionsCount: 0,
  conclusion: { kind: 'none' },
  isPresentingConclusion: false,
  isEditingTitle: false,
  editedTitle: '',
  isEditingSymbol: false,
}

/** Pins the initial target to #8's preset rather than a literal (see above). */
export const POMODORO_FOCUS_DURATION: TimeIntervalSeconds =
  defaultPomodoroConfig.duration

/** The rest half of the same preset — 5 minutes. Never the focus value. */
export const POMODORO_REST_DURATION: TimeIntervalSeconds =
  defaultPomodoroConfig.rest ?? minutesInSeconds(5)
