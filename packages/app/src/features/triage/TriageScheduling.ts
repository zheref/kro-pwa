/**
 * The default-scheduled-date rules — the port of
 * `TriageFeature.defaultDueDate(for:now:nextFreeSlotToday:)` plus the gap
 * search its own doc comment delegates to the caller.
 *
 * ## Why the gap search lives here and not upstream
 *
 * Canon's helper takes the gap as a parameter and says so: *"caller is
 * responsible for computing the next gap **big enough to cover the task
 * duration**"*. Its one caller — `InboxFeature.nextFreeSlotToday` — does not do
 * that: it steps past overlapping intervals from the next quarter hour and
 * never consults a duration. So the shipped seed is duration-blind while both
 * the doc (*"the soonest open calendar gap big enough to cover the task
 * duration"*) and the reducer's own contract say it should not be. KC-IS-#25
 * binds the doc, so the search is implemented here — where the duration is
 * actually known — and the parent-supplied seed is kept as canon's fallback.
 *
 * That also fixes an ordering problem the parent-computed seed has: duration is
 * picked **inside** Triage, often after the quadrant, so a seed computed at
 * open time cannot have accounted for it. Re-running the search on each
 * quadrant pick is what makes "big enough for the duration" mean anything.
 *
 * ## The busy intervals are a projection, not the pool
 *
 * The slice holds `{start, end}` pairs rather than the day's endeavors, for the
 * reason `CaptureRules` gives about single-row reads: the search needs two
 * numbers per event, and keeping whole domain objects in state to re-derive
 * them on every quadrant tap is work the reducer should not repeat.
 *
 * Everything here is pure; `now` and the day's intervals arrive as arguments.
 */
import {
  EisenhowerQuadrant,
  type Endeavor,
  assertNever,
  isSameCalendarDay,
} from '@kro/core'

const MINUTE_MS = 60_000

/** The grain every slot in the product snaps to. */
export const TRIAGE_QUARTER_HOUR_MINUTES = 15

/** *"One week out"* — the Schedule quadrant's seed, in days. */
export const TRIAGE_SCHEDULE_LEAD_DAYS = 7

/** One busy block on the local day: `[start, end)`. */
export interface TriageBusyInterval {
  readonly start: Date
  readonly end: Date
}

/** 23:59:00 local — canon's `bySettingHour: 23, minute: 59, second: 0`. */
export const endOfTriageDay = (reference: Date): Date => {
  const end = new Date(reference)
  end.setHours(23, 59, 0, 0)
  return end
}

/**
 * The next quarter hour, strictly later than `reference`.
 *
 * `((minute / 15) + 1) * 15` from the top of the hour, so 10:00 offers 10:15
 * and 10:59 offers 11:00 — the search must never start on a slot that has
 * already begun.
 *
 * Duplicated from the capture lane rather than imported: a feature reaching
 * into a sibling feature's module is precisely what `UZF-6`/`RC-20` forbid, and
 * promoting the helper into `@kro/core` is a change outside this issue's lane.
 */
export const nextTriageQuarterHour = (reference: Date): Date => {
  const topOfHour = new Date(reference)
  topOfHour.setMinutes(0, 0, 0)
  const bumped =
    (Math.floor(reference.getMinutes() / TRIAGE_QUARTER_HOUR_MINUTES) + 1) *
    TRIAGE_QUARTER_HOUR_MINUTES
  return new Date(topOfHour.getTime() + bumped * MINUTE_MS)
}

/**
 * Today's timed endeavors as busy blocks, earliest first.
 *
 * "Timed" is `start != null` on the same calendar day as `day`; an endeavor
 * with no duration occupies a zero-length block, which cannot contain a
 * candidate and therefore never pushes one — the same treatment
 * `InboxFeature.nextFreeSlotToday` gives it (`duration ?? 0`).
 *
 * The issue's scope note — *"no calendar-gap search beyond the local day
 * cache"* — is why this reads the pool it is handed and never a calendar
 * service.
 */
export const triageBusyIntervalsFor = (
  endeavors: readonly Endeavor[],
  day: Date,
): readonly TriageBusyInterval[] =>
  endeavors
    .flatMap((endeavor) => {
      const start = endeavor.start
      if (start === null || !isSameCalendarDay(start, day)) return []
      const duration = endeavor.duration ?? 0
      return [{ start, end: new Date(start.getTime() + duration * 1000) }]
    })
    .sort((left, right) => left.start.getTime() - right.start.getTime())

/**
 * The soonest open gap on the local day that fits `durationSeconds`.
 *
 * The sweep starts at the next quarter hour and pushes the candidate past any
 * block the *whole* proposed slot would collide with — `interval.start <
 * candidate + duration && interval.end > candidate` — which is what makes the
 * search duration-aware rather than merely "not starting inside a meeting". One
 * ordered pass suffices because the intervals are sorted by start and the
 * candidate only ever moves forward.
 *
 * `durationSeconds` of `null` (no chip picked yet) is treated as zero, which
 * collapses the test to canon's own containment check — so an un-estimated
 * endeavor gets exactly the shipped `nextFreeSlotToday` answer and nothing is
 * invented for it.
 *
 * The fallback is canon's: a candidate at or past end of day returns end of
 * day, so the seed is always a real moment on the day the user is looking at.
 */
export const soonestOpenTriageGap = (params: {
  readonly intervals: readonly TriageBusyInterval[]
  readonly now: Date
  readonly durationSeconds: number | null
}): Date => {
  const { intervals, now } = params
  const durationMs = Math.max(0, params.durationSeconds ?? 0) * 1000
  const endOfDay = endOfTriageDay(now)

  let candidate = nextTriageQuarterHour(now)
  for (const interval of intervals) {
    const candidateEnd = candidate.getTime() + durationMs
    if (
      interval.start.getTime() < candidateEnd &&
      interval.end.getTime() > candidate.getTime()
    ) {
      candidate = interval.end
    }
  }

  return candidate.getTime() < endOfDay.getTime() ? candidate : endOfDay
}

/** The inputs the per-quadrant default reads. */
export interface TriageDueDefaultInputs {
  readonly now: Date
  readonly durationSeconds: number | null
  readonly busyIntervals: readonly TriageBusyInterval[]
  /**
   * `nextFreeSlotToday` — canon's parent-supplied seed (the Inbox computes it
   * at the moment the Triage button is tapped). Used only when this session
   * carries no day cache at all, so a caller that has a seed but no pool still
   * gets canon's answer rather than a bare end-of-day.
   */
  readonly nextFreeSlotToday: Date | null
}

/**
 * `defaultDueDate(for:now:nextFreeSlotToday:)` — the conservative per-quadrant
 * seed, which *"the user can override by editing the date picker after a
 * quadrant tap"*.
 *
 * - **Urgent column (Prioritize, Delegate)** — the soonest open gap big enough
 *   for the duration, *"falls back to end-of-day when no gap is known"*.
 *   Delegate shares Prioritize's seed *"because Delegate also lives in the
 *   Urgent column"*.
 * - **Schedule** — one week out, by calendar day so the wall-clock time of day
 *   survives a DST transition (canon's `byAdding: .day` behaves the same way).
 *   Note it counts from **`now`**, not from any date already on the endeavor.
 * - **Archive** — `null`: *"no scheduled date is needed to archive an
 *   endeavor."*
 */
export const defaultTriageDueDate = (
  quadrant: EisenhowerQuadrant,
  inputs: TriageDueDefaultInputs,
): Date | null => {
  switch (quadrant) {
    case EisenhowerQuadrant.prioritize:
    case EisenhowerQuadrant.delegate: {
      if (
        inputs.busyIntervals.length === 0 &&
        inputs.nextFreeSlotToday !== null
      ) {
        return inputs.nextFreeSlotToday
      }
      return soonestOpenTriageGap({
        intervals: inputs.busyIntervals,
        now: inputs.now,
        durationSeconds: inputs.durationSeconds,
      })
    }
    case EisenhowerQuadrant.decide: {
      const weekOut = new Date(inputs.now)
      weekOut.setDate(weekOut.getDate() + TRIAGE_SCHEDULE_LEAD_DAYS)
      return weekOut
    }
    case EisenhowerQuadrant.delete:
      return null
    default:
      return assertNever(quadrant)
  }
}
