/**
 * The *Expires at* section's pure rules — the port of canon's `ExpiryPreset`
 * enum, `ExpiryPillRow`'s `orderedTokens` / `selectedToken`, and the
 * `userDidSelectExpiry` invariant in `TriageFeature`.
 *
 * Canon splits this across a `KroUI` enum (the preset maths), a private view
 * struct (the ordering) and a reducer arm (the snap-back). All three are
 * business rules under this stack's contract — *"UI carries zero arithmetic"* —
 * so they land together here and #26 renders the outcome.
 *
 * ## The invariant, in one sentence
 *
 * *"Whenever a scheduled date is set, expiry must also be set."* The reducer
 * enforces it by **snapping a cleared expiry back** to the same one-hour-after
 * default the rest of the screen seeds with; the View then hides its Clear
 * affordance *"to keep the UI honest"*. Expiry **without** a scheduled date is
 * explicitly permitted, which is why the snap-back is conditional on a
 * scheduled date existing rather than unconditional.
 */
import { assertNever } from '@kro/core'

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS

// ---------------------------------------------------------------------------
// The presets
// ---------------------------------------------------------------------------

/** `ExpiryPreset.allCases`, in canon declaration order — which is pill order. */
export const TriageExpiryPreset = {
  atTheMoment: 'atTheMoment',
  oneHour: 'oneHour',
  twoHours: 'twoHours',
  fourHours: 'fourHours',
  endOfDay: 'endOfDay',
  endOfWeek: 'endOfWeek',
} as const

export type TriageExpiryPreset =
  (typeof TriageExpiryPreset)[keyof typeof TriageExpiryPreset]

export const triageExpiryPresets: readonly TriageExpiryPreset[] = [
  TriageExpiryPreset.atTheMoment,
  TriageExpiryPreset.oneHour,
  TriageExpiryPreset.twoHours,
  TriageExpiryPreset.fourHours,
  TriageExpiryPreset.endOfDay,
  TriageExpiryPreset.endOfWeek,
]

/** `ExpiryPreset.label`, verbatim. Note "An hour later", not "1h later". */
export const triageExpiryPresetLabel = (preset: TriageExpiryPreset): string => {
  switch (preset) {
    case TriageExpiryPreset.atTheMoment:
      return 'At the moment'
    case TriageExpiryPreset.oneHour:
      return 'An hour later'
    case TriageExpiryPreset.twoHours:
      return '2h later'
    case TriageExpiryPreset.fourHours:
      return '4h later'
    case TriageExpiryPreset.endOfDay:
      return 'EoD'
    case TriageExpiryPreset.endOfWeek:
      return 'EoW'
    default:
      return assertNever(preset)
  }
}

/**
 * Which weekday the calendar week starts on, as `Date.getDay()` numbers
 * (0 = Sunday … 6 = Saturday).
 *
 * **A named divergence.** Canon reads `Calendar.current`, whose `firstWeekday`
 * follows the device locale, so "the calendar week containing the scheduled
 * date" is a different week for a `en_US` user (Sunday) than for a `en_GB` one
 * (Monday). JavaScript has no locale-aware week-start in a form this tier can
 * read without a platform API, and guessing one silently would make EoW
 * non-deterministic under test. So the boundary is an **explicit parameter**
 * defaulting to Sunday — `Calendar.current`'s value in the locale canon's own
 * snapshot suite runs under. #26 may thread the user's preference through when
 * the settings surface exposes one.
 */
export const TRIAGE_DEFAULT_FIRST_WEEKDAY = 0

export interface TriageExpiryOptions {
  /** 0 = Sunday … 6 = Saturday. See `TRIAGE_DEFAULT_FIRST_WEEKDAY`. */
  readonly firstWeekday?: number
}

/** 23:59:00 local on `reference`'s own calendar day. */
const endOfLocalDay = (reference: Date): Date => {
  const end = new Date(reference)
  end.setHours(23, 59, 0, 0)
  return end
}

/**
 * `ExpiryPreset.date(relativeTo:)` — every preset is computed **relative to the
 * scheduled date**, never to `now`, *"so the row always reads as offsets from
 * 'when the user said this is happening'"*.
 *
 * The three hour offsets are absolute-time additions. Canon writes them as
 * `Calendar.date(byAdding: .hour, …)`, which is also absolute-time addition, so
 * "an hour later" survives a DST transition as 60 real minutes on both stacks
 * rather than as the same wall-clock minute an hour on.
 *
 * `endOfDay` and `endOfWeek` are the opposite — wall-clock 23:59 on a *day* —
 * so they are built by setting local components, exactly as canon's
 * `bySettingHour:minute:second:of:` does.
 */
export const triageExpiryPresetDate = (
  preset: TriageExpiryPreset,
  scheduled: Date,
  options: TriageExpiryOptions = {},
): Date => {
  switch (preset) {
    case TriageExpiryPreset.atTheMoment:
      return new Date(scheduled)
    case TriageExpiryPreset.oneHour:
      return new Date(scheduled.getTime() + HOUR_MS)
    case TriageExpiryPreset.twoHours:
      return new Date(scheduled.getTime() + 2 * HOUR_MS)
    case TriageExpiryPreset.fourHours:
      return new Date(scheduled.getTime() + 4 * HOUR_MS)
    case TriageExpiryPreset.endOfDay:
      return endOfLocalDay(scheduled)
    case TriageExpiryPreset.endOfWeek: {
      // `Calendar.dateInterval(of: .weekOfYear, …)` then "step back to the last
      // day in it, and pin the time to 23:59" — the interval's `end` is the
      // *next* week's start, hence the -1 day canon applies and the `6 -`
      // offset here.
      const firstWeekday = options.firstWeekday ?? TRIAGE_DEFAULT_FIRST_WEEKDAY
      const startOfDay = new Date(scheduled)
      startOfDay.setHours(0, 0, 0, 0)
      const offsetIntoWeek = (startOfDay.getDay() - firstWeekday + 7) % 7
      const lastDay = new Date(startOfDay)
      lastDay.setDate(startOfDay.getDate() + (6 - offsetIntoWeek))
      return endOfLocalDay(lastDay)
    }
    default:
      return assertNever(preset)
  }
}

/**
 * `TriageFeature.State.defaultExpiry(from:)` — *"one hour after the scheduled
 * date"*, and `nil` when there is no scheduled date to anchor on.
 *
 * It is deliberately the **same** computation as the `oneHour` preset, because
 * canon's default is that preset: seeding expiry lights the "An hour later"
 * pill rather than the Custom one, which is what makes a freshly seeded form
 * read as pre-selected instead of bespoke.
 */
export const defaultTriageExpiry = (scheduled: Date | null): Date | null =>
  scheduled === null
    ? null
    : triageExpiryPresetDate(TriageExpiryPreset.oneHour, scheduled)

// ---------------------------------------------------------------------------
// The invariant
// ---------------------------------------------------------------------------

/**
 * `userDidSelectExpiry`'s body — the snap-back.
 *
 * A cleared expiry with a scheduled date in place returns to `scheduled + 1h`
 * (canon's `?? scheduled` fallback is unreachable here, since the offset always
 * produces a date, but it is kept as the same total function). Any other
 * selection — including clearing expiry when **no** scheduled date is set —
 * passes straight through: *"Setting only expiry (no scheduled date) is
 * permitted."*
 */
export const triageExpiryAfterSelection = (params: {
  readonly picked: Date | null
  readonly scheduled: Date | null
}): Date | null => {
  const { picked, scheduled } = params
  if (picked !== null) return picked
  if (scheduled === null) return null
  return defaultTriageExpiry(scheduled) ?? scheduled
}

/**
 * The invariant as a predicate, so a test can assert the *rule* rather than one
 * transition: a scheduled date implies an expiry; an expiry alone is fine.
 */
export const triageExpiryInvariantHolds = (params: {
  readonly scheduled: Date | null
  readonly expiry: Date | null
}): boolean => params.scheduled === null || params.expiry !== null

// ---------------------------------------------------------------------------
// Selected-first pill ordering
// ---------------------------------------------------------------------------

/**
 * `ExpiryPillRow.ExpiryPillToken` — one slot in the pill row: a preset, or the
 * **informational** Custom indicator.
 *
 * Custom *"does NOT toggle the picker (picker is always there). It lights up
 * when the current expiry doesn't match any preset"* — so it is a readout, not
 * a control, and this model gives it no selection behaviour of its own.
 */
export type TriageExpiryToken =
  | { readonly kind: 'preset'; readonly preset: TriageExpiryPreset }
  | { readonly kind: 'custom' }

const presetToken = (preset: TriageExpiryPreset): TriageExpiryToken => ({
  kind: 'preset',
  preset,
})

const CUSTOM_TOKEN: TriageExpiryToken = { kind: 'custom' }

/** The row as declared: every preset in order, then Custom. */
export const triageExpiryTokens: readonly TriageExpiryToken[] = [
  ...triageExpiryPresets.map(presetToken),
  CUSTOM_TOKEN,
]

const sameToken = (
  left: TriageExpiryToken,
  right: TriageExpiryToken,
): boolean =>
  left.kind === 'custom'
    ? right.kind === 'custom'
    : right.kind === 'preset' && left.preset === right.preset

/**
 * `selectedToken` — the pill currently driving the row's highlight.
 *
 * `null` when there is no expiry to attribute, the matching **preset** when one
 * computes to exactly this instant, and `custom` otherwise. The comparison is
 * canon's `==` on `Date`, i.e. exact equality — a picker landing one second off
 * an hour boundary lights Custom, which is the behaviour the Custom pill exists
 * to report.
 *
 * With no scheduled date there is no anchor to compute presets against, so the
 * answer is `null` rather than `custom`: canon does not render the pill row at
 * all in that case (*"the section falls back to a compact DatePicker"*).
 */
export const selectedTriageExpiryToken = (params: {
  readonly scheduled: Date | null
  readonly expiry: Date | null
  readonly options?: TriageExpiryOptions
}): TriageExpiryToken | null => {
  const { scheduled, expiry } = params
  if (scheduled === null || expiry === null) return null
  const match = triageExpiryPresets.find(
    (preset) =>
      triageExpiryPresetDate(
        preset,
        scheduled,
        params.options ?? {},
      ).getTime() === expiry.getTime(),
  )
  return match === undefined ? CUSTOM_TOKEN : presetToken(match)
}

/**
 * `orderedTokens` — *"the currently selected token (preset or Custom) lands
 * first; the rest keep their declared order. When nothing is selected the row
 * reads as declared."*
 *
 * This is the model half of the doc's **selected-first ordering**; the scroll
 * reset that accompanies it is a one-shot the slice raises (see
 * `expiryScrollNonce` in `TriageFeature`), because a scroll position is the
 * view's to own and the *instruction* to reset it is not.
 */
export const orderedTriageExpiryTokens = (params: {
  readonly scheduled: Date | null
  readonly expiry: Date | null
  readonly options?: TriageExpiryOptions
}): readonly TriageExpiryToken[] => {
  const selected = selectedTriageExpiryToken(params)
  if (selected === null) return triageExpiryTokens
  return [
    selected,
    ...triageExpiryTokens.filter((token) => !sameToken(token, selected)),
  ]
}

/** Whether the Custom indicator is lit — `isCustomSelected`. */
export const isTriageExpiryCustom = (params: {
  readonly scheduled: Date | null
  readonly expiry: Date | null
  readonly options?: TriageExpiryOptions
}): boolean => selectedTriageExpiryToken(params)?.kind === 'custom'
