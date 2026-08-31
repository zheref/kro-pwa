/**
 * The session's audible cue **schedule** — explicit absolute marks derived once
 * from the target, never a modulo over elapsed time.
 *
 * ## The defect this module exists to make unrepresentable
 *
 * The legacy `apps/web/src/hooks/useSessionTimer.ts` decided cues like this
 * (routed onto KC-IS-#21 from Copilot's round on KC-PR-#39):
 *
 * ```ts
 * const progressThreshold = (state.targetConfig.duration ?? 0) / 3
 * if (remaining <= 0) onSessionEnded()
 * else if (totalElapsed % progressThreshold === 0) onSessionProgress()
 * ```
 *
 * Two bugs in one line. `duration / 3` is fractional for every duration not
 * divisible by three — 25 min is 500 s, so the cue would need `totalElapsed` to
 * be an exact multiple of `500`, which the integer tick never produces — so the
 * cue **almost never fires**. And on the very first tick `totalElapsed` is `0`,
 * and `0 % anything === 0`, so it **does** fire, spuriously, at the start.
 *
 * The replacement is structural, not a repaired comparison:
 *
 * 1. **A schedule is a finite, sorted list of absolute second marks**, computed
 *    once from the target. There is no modulo anywhere in this file, so the
 *    fractional-divisor failure has nowhere to live.
 * 2. **A mark fires when elapsed *reaches or passes* it**, not when elapsed
 *    *equals* it — so a dropped, throttled or coalesced tick (a backgrounded
 *    tab; the reload recompute jumping ten minutes at once) still fires it.
 * 3. **A mark fires at most once**, decided against the marks already fired
 *    rather than against the current instant. Replaying the same tick, or
 *    ticking backwards, adds nothing.
 * 4. **`0` is never a mark.** `sessionCueSchedule` drops non-positive marks, so
 *    the start-of-session false positive cannot be scheduled in the first place.
 *
 * ## What canon actually schedules — the divergence, stated
 *
 * **KroApple has no mid-session progress cue at all.** `SessionSetupProducer.swift`
 * exposes exactly two audio effects — `producePlaySessionCompleteAudioEffect`
 * and `producePlayBreakCompleteAudioEffect` — and the reducer fires them only
 * where a countdown reaches zero or a finish-early clears the threshold. A
 * repository-wide search of `zheref/KroApple@2eff1cd` for a fractional or
 * periodic cue finds nothing: the only `AudioFeedbackClient` roles are
 * `sessionComplete`, `breakComplete`, `taskCompleteDuringSession` and
 * `taskCompleteOutsideSession`.
 *
 * So the faithful port of "canon's progress-cue rule" is: **the terminal mark
 * is the only mark.** `SESSION_PROGRESS_CUE_FRACTIONS` is therefore empty, and
 * the legacy `playProgress()` cue is **not** carried forward — it was a
 * web-only invention with no canon counterpart, and reproducing it here would
 * be inventing product behaviour rather than porting it.
 *
 * The `progressFractions` parameter stays because the *mechanism* is what
 * closes the defect: if canon ever gains a mid-session cue, it arrives as a
 * fraction in that constant and is derived into an explicit mark by the same
 * code path the terminal cue already uses — it can never re-enter as a modulo.
 */
import {
  FocusTimerMode,
  type TimeIntervalSeconds,
  defaultPomodoroConfig,
} from '@kro/core'
import type { SessionSoundRole } from './SessionVocabulary'

/** One scheduled cue: the elapsed second it fires at, and which sound it is. */
export interface SessionCueMark {
  /** Absolute elapsed seconds. Always `> 0`, always finite. */
  readonly at: TimeIntervalSeconds
  readonly role: SessionSoundRole
}

/**
 * The fractions of the target at which a **mid-session** cue fires.
 *
 * Empty, because canon fires none — see the header. Stated as a named,
 * greppable constant rather than an absent feature so a reader can tell
 * "checked, canon has none" from "nobody looked".
 */
export const SESSION_PROGRESS_CUE_FRACTIONS: readonly number[] = []

/**
 * Every cue a session will fire, sorted ascending, deduplicated, with the
 * terminal mark last.
 *
 * Stopwatch sessions schedule **nothing**: they have no target, so there is no
 * mark to derive — the same reason canon guards its completion branch with
 * `selectedMode == .countdown`. A non-positive or non-finite target schedules
 * nothing either, which is what keeps `0` from ever becoming a mark.
 */
export const sessionCueSchedule = (params: {
  readonly mode: FocusTimerMode
  readonly targetDuration: TimeIntervalSeconds
  /** Break countdowns end on `breakComplete`; focus ones on `sessionComplete`. */
  readonly isBreak?: boolean
  /** Defaults to canon's (empty) set. */
  readonly progressFractions?: readonly number[]
}): readonly SessionCueMark[] => {
  if (params.mode !== FocusTimerMode.countdown) return []
  const target = params.targetDuration
  if (!Number.isFinite(target) || target <= 0) return []

  const terminalRole: SessionSoundRole =
    params.isBreak === true ? 'breakComplete' : 'sessionComplete'
  const fractions =
    params.progressFractions ?? SESSION_PROGRESS_CUE_FRACTIONS

  const marks = new Map<TimeIntervalSeconds, SessionCueMark>()
  for (const fraction of fractions) {
    if (!Number.isFinite(fraction)) continue
    // A whole second, so the mark is a value an integer tick can reach or pass
    // — and `>= 1` so a tiny fraction of a short target can never resolve to 0.
    const at = Math.round(target * fraction)
    if (at <= 0 || at >= target) continue
    marks.set(at, { at, role: 'taskCompleteDuringSession' })
  }
  // The terminal mark always wins its second: a progress fraction of 1.0 is
  // excluded above, so this can only ever *add*.
  marks.set(target, { at: target, role: terminalRole })

  return [...marks.values()].sort((left, right) => left.at - right.at)
}

/**
 * The marks a tick crosses: scheduled at or before `elapsedDuration`, and not
 * already in `firedMarks`.
 *
 * The comparison is `mark.at <= elapsed` — *reached or passed*, never *equals*
 * — so the sequence of ticks can be irregular, coalesced, replayed or
 * out-of-order and every mark still fires exactly once. That is the whole
 * property the modulo comparison lacked.
 */
export const sessionCueMarksCrossed = (
  schedule: readonly SessionCueMark[],
  firedMarks: readonly TimeIntervalSeconds[],
  elapsedDuration: TimeIntervalSeconds,
): readonly SessionCueMark[] => {
  if (!Number.isFinite(elapsedDuration)) return []
  const alreadyFired = new Set(firedMarks)
  return schedule.filter(
    (mark) => mark.at <= elapsedDuration && !alreadyFired.has(mark.at),
  )
}

/**
 * The default target a session opens with when nothing else decides — the
 * Pomodoro 25-minute focus length.
 *
 * This is the second routed defect's answer. Legacy `useSession.ts`'s
 * `createSessionFragmentState()` built `new SessionConfig(undefined, 25min)`:
 * a session whose **duration was `undefined`** (so the timer read `0` until a
 * bootstrap effect replaced it) and whose **rest was 25 minutes** — the two
 * arguments transposed, and inconsistent with the 25/5 default the same file
 * installed moments later.
 *
 * There is no constructor here to mis-order: the target is read from #8's own
 * `defaultPomodoroConfig` (25 + 5), and the *live* default comes from the
 * `session.defaultDuration` preference (#11, 20 minutes) via
 * `SessionProducer`. This constant is only the floor a caller falls back to
 * when preferences have not loaded — never `undefined`, never a rest value.
 */
export const FALLBACK_SESSION_TARGET_DURATION: TimeIntervalSeconds =
  defaultPomodoroConfig.duration
