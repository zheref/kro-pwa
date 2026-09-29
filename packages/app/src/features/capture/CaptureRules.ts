/**
 * The capture prompt's and the Inbox's pure rules — the port of canon's
 * `Kro/Components/EndeavorInputPrompt.swift` (its enums, its draft, its
 * validation gate and its `EndeavorInputResult → Endeavor` conversion),
 * `Kro/Application/Inbox/InboxSelectors.swift` (the two sections' predicates)
 * and the capture-routing branch in `Kro/Application/Main/MainFeature.swift`.
 *
 * Everything here is a **pure function of its arguments**. No clock, no store,
 * no service, no identity source: `now` and `id` always arrive as parameters,
 * exactly as `DoRules` does, so a quarter-hour boundary or an 8-second undo
 * window is a plain unit test rather than a mocked global (`UZF-10`,
 * `UZF-11`).
 *
 * ## Two `Kind` vocabularies, deliberately
 *
 * `EndeavorInputPrompt.swift` declares its **own** `EndeavorKind` — four cases
 * (task/event/reminder/habit) — which is *not* `KroCore.Endeavor.Kind` (seven
 * cases). The prompt's is the chip strip; the domain's is the model. Canon
 * keeps them apart and bridges them in `toEndeavor()`; so does this file, as
 * `CaptureKind` → `endeavorKindForCaptureKind`. Collapsing them would offer the
 * user a "Blueprint" chip that canon has never shown.
 *
 * ## Delays are data, not sleeps
 *
 * Canon implements both post-capture delays with `clock.sleep(.milliseconds(500))`
 * inside an effect. There is no timer Service in this repo's `ThunkExtra`, and
 * this issue's file lane is one reducer line in `store.ts` — so the delay is
 * carried on the navigation **intent** (`deliverAfterMs` + `decidedAt`) and the
 * shell delivers it. `isCaptureIntentDue` is the same decision, made against an
 * injected instant instead of a slept-through one, which is also why it is
 * testable without fake timers.
 */
import {
  type Defer,
  type Endeavor,
  EndeavorHost,
  EndeavorKind,
  EndeavorStatus,
  type Month,
  type RepeatConfig,
  type WeekDay,
  assertNever,
  dailyBase,
  type ReconciliationContext,
  awaitsTriage,
  canBeTriaged,
  isSameCalendarDay,
  makeReconciliationContext,
  resolvedKind,
  makeDefer,
  makeEndeavor,
  makeRepeatConfig,
  monthlyBase,
  weeklyBase,
  yearlyBase,
} from '@kro/core'
import { computedSymbol } from '../../design/endeavor/endeavorCardModel'

// ---------------------------------------------------------------------------
// Kinds — the prompt's four chips
// ---------------------------------------------------------------------------

/**
 * The prompt's kind chips, in canon's `allCases` order — the order the strip
 * renders left to right.
 */
export const CaptureKind = {
  task: 'task',
  habit: 'habit',
  event: 'event',
  reminder: 'reminder',
} as const

export type CaptureKind = (typeof CaptureKind)[keyof typeof CaptureKind]

/** `EndeavorKind.allCases` on the prompt's own enum. */
export const captureKinds: readonly CaptureKind[] = [
  CaptureKind.task,
  CaptureKind.habit,
  CaptureKind.event,
  CaptureKind.reminder,
]

/** `EndeavorKind.label` — the chip's title, verbatim. */
export const captureKindLabel = (kind: CaptureKind): string => {
  switch (kind) {
    case CaptureKind.task:
      return 'Task'
    case CaptureKind.event:
      return 'Event'
    case CaptureKind.reminder:
      return 'Reminder'
    case CaptureKind.habit:
      return 'Habit'
    default:
      return assertNever(kind)
  }
}

/**
 * `EndeavorKind.tint` — the kind's badge colour (`resolvedKind.badgeColor`),
 * so a kind reads the same colour in the prompt as on every card.
 */
export const captureKindTint = (
  kind: CaptureKind,
): 'kindTask' | 'kindEvent' | 'kindReminder' | 'kindHabit' => {
  switch (kind) {
    case CaptureKind.task:
      return 'kindTask'
    case CaptureKind.event:
      return 'kindEvent'
    case CaptureKind.reminder:
      return 'kindReminder'
    case CaptureKind.habit:
      return 'kindHabit'
    default:
      return assertNever(kind)
  }
}

/** `EndeavorKind.glyph` — SF Symbol names, mapped to web icons by #6. */
export const captureKindGlyph = (kind: CaptureKind): string => {
  switch (kind) {
    case CaptureKind.task:
      return 'checkmark.circle'
    case CaptureKind.event:
      return 'calendar'
    case CaptureKind.reminder:
      return 'bell'
    case CaptureKind.habit:
      return 'repeat.circle'
    default:
      return assertNever(kind)
  }
}

/** `EndeavorKind.placeholder` — the title field's prompt copy, verbatim. */
export const captureKindPlaceholder = (kind: CaptureKind): string => {
  switch (kind) {
    case CaptureKind.task:
      return 'What do you want to do?'
    case CaptureKind.event:
      return 'Name this event…'
    case CaptureKind.reminder:
      return 'What do you need to remember?'
    case CaptureKind.habit:
      return 'What habit do you want to build?'
    default:
      return assertNever(kind)
  }
}

/**
 * The bridge canon makes inside `toEndeavor()`: the prompt's `.event` builds a
 * `.calendarEvent`; every other chip keeps its name.
 */
export const endeavorKindForCaptureKind = (kind: CaptureKind): EndeavorKind => {
  switch (kind) {
    case CaptureKind.task:
      return EndeavorKind.task
    case CaptureKind.event:
      return EndeavorKind.calendarEvent
    case CaptureKind.reminder:
      return EndeavorKind.reminder
    case CaptureKind.habit:
      return EndeavorKind.habit
    default:
      return assertNever(kind)
  }
}

/**
 * `EndeavorKind.defaultRewards` — tasks open at 30 (a real unit of work),
 * habits at the lighter 10, and the kinds that earn nothing at 0.
 */
export const captureKindDefaultRewards = (kind: CaptureKind): number => {
  switch (kind) {
    case CaptureKind.task:
      return 30
    case CaptureKind.habit:
      return 10
    case CaptureKind.event:
    case CaptureKind.reminder:
      return 0
    default:
      return assertNever(kind)
  }
}

/** `EndeavorKind.earnsRewards` — tasks and habits. */
export const captureKindEarnsRewards = (kind: CaptureKind): boolean =>
  kind === CaptureKind.task || kind === CaptureKind.habit

/**
 * `EndeavorKind.supportsDuration` — tasks and habits. Events derive theirs
 * from the start/end pair instead.
 */
export const captureKindSupportsDuration = (kind: CaptureKind): boolean =>
  kind === CaptureKind.task || kind === CaptureKind.habit

/** `EndeavorKind.supportsValue` — canon defines it as `supportsDuration`. */
export const captureKindSupportsValue = (kind: CaptureKind): boolean =>
  captureKindSupportsDuration(kind)

/**
 * `EndeavorKind.requiresValue` — a task, subject to the host being able to
 * store one (`isCaptureValueRequired`).
 */
export const captureKindRequiresValue = (kind: CaptureKind): boolean =>
  kind === CaptureKind.task

/** `EndeavorKind.requiresTime` — a habit is a commitment to a moment. */
export const captureKindRequiresTime = (kind: CaptureKind): boolean =>
  kind === CaptureKind.habit

/** `EndeavorKind.requiresRecurrence` — a habit that never repeats is a task. */
export const captureKindRequiresRecurrence = (kind: CaptureKind): boolean =>
  kind === CaptureKind.habit

/** What a kind can carry — the prompt's chips and panels read this, whole. */
export interface CaptureKindCapabilities {
  readonly earnsRewards: boolean
  readonly supportsValue: boolean
  readonly supportsDuration: boolean
  /** A habit's time is required, so its time chip offers no Clear. */
  readonly isTimeClearable: boolean
}

export const captureKindCapabilities = (
  kind: CaptureKind,
): CaptureKindCapabilities => ({
  earnsRewards: captureKindEarnsRewards(kind),
  supportsValue: captureKindSupportsValue(kind),
  supportsDuration: captureKindSupportsDuration(kind),
  isTimeClearable: !captureKindRequiresTime(kind),
})

// ---------------------------------------------------------------------------
// Hosting destinations
// ---------------------------------------------------------------------------

/** `EndeavorHostingDestination`, in canon's `allCases` order. */
export const CaptureDestination = {
  local: 'local',
  appleReminders: 'appleReminders',
  appleCalendar: 'appleCalendar',
  kroCloud: 'kroCloud',
} as const

export type CaptureDestination =
  (typeof CaptureDestination)[keyof typeof CaptureDestination]

export const captureDestinations: readonly CaptureDestination[] = [
  CaptureDestination.local,
  CaptureDestination.appleReminders,
  CaptureDestination.appleCalendar,
  CaptureDestination.kroCloud,
]

/**
 * `EndeavorHostingDestination(rawValue:)` — narrows a stored raw value, `null`
 * when it names no case. This is what makes the persisted last-used value safe
 * to read: canon's own restore falls back to `.local` on an unrecognised
 * string.
 */
export const captureDestinationFromRawValue = (
  raw: string,
): CaptureDestination | null =>
  captureDestinations.find((destination) => destination === raw) ?? null

/** `EndeavorHostingDestination.label`, verbatim. Note "Kro Cloud", not "Kro". */
export const captureDestinationLabel = (
  destination: CaptureDestination,
): string => {
  switch (destination) {
    case CaptureDestination.kroCloud:
      return 'Kro Cloud'
    case CaptureDestination.appleReminders:
      return 'Reminders'
    case CaptureDestination.appleCalendar:
      return 'Calendar'
    case CaptureDestination.local:
      return 'On Device'
    default:
      return assertNever(destination)
  }
}

/** `EndeavorHostingDestination.glyph`. */
export const captureDestinationGlyph = (
  destination: CaptureDestination,
): string => {
  switch (destination) {
    case CaptureDestination.kroCloud:
      return 'cloud.fill'
    case CaptureDestination.appleReminders:
      return 'heart.circle.fill'
    case CaptureDestination.appleCalendar:
      return 'calendar.circle.fill'
    case CaptureDestination.local:
      return 'iphone'
    default:
      return assertNever(destination)
  }
}

/**
 * `EndeavorHostingDestination.tint` as a token name rather than a `Color`.
 * #6 owns the palette; this is the role canon paints, so the two cannot drift.
 * `.local`'s `Color.secondary` has no hue — it is the theme's secondary role.
 */
export const captureDestinationTint = (
  destination: CaptureDestination,
): string => {
  switch (destination) {
    case CaptureDestination.kroCloud:
      return 'indigo'
    case CaptureDestination.appleReminders:
      return 'blue'
    case CaptureDestination.appleCalendar:
      return 'red'
    case CaptureDestination.local:
      return 'secondary'
    default:
      return assertNever(destination)
  }
}

/** The `destination → Endeavor.Host` map from `toEndeavor()`, verbatim. */
export const endeavorHostForDestination = (
  destination: CaptureDestination,
): EndeavorHost => {
  switch (destination) {
    case CaptureDestination.appleReminders:
      return EndeavorHost.appleReminders
    case CaptureDestination.appleCalendar:
      return EndeavorHost.appleCalendar
    case CaptureDestination.local:
      return EndeavorHost.local
    case CaptureDestination.kroCloud:
      return EndeavorHost.supabase
    default:
      return assertNever(destination)
  }
}

/**
 * `EndeavorHostingDestination.storesKroEnhancedFields` — whether the host
 * owns the record outright and can therefore persist value, effort and expiry.
 * Foreign hosts have nowhere to put them, so the prompt never *requires* a
 * value one of them would drop on save.
 */
export const captureDestinationStoresKroEnhancedFields = (
  destination: CaptureDestination,
): boolean => {
  switch (destination) {
    case CaptureDestination.local:
    case CaptureDestination.kroCloud:
      return true
    case CaptureDestination.appleReminders:
    case CaptureDestination.appleCalendar:
      return false
    default:
      return assertNever(destination)
  }
}

/**
 * `EndeavorHostingDestination.supported(for:)`, in canon's preference order,
 * minus `googleCalendar` — a destination this web prompt has no case for.
 */
export const supportedCaptureDestinations = (
  kind: CaptureKind,
): readonly CaptureDestination[] => {
  switch (kind) {
    case CaptureKind.task:
    case CaptureKind.habit:
      return [
        CaptureDestination.kroCloud,
        CaptureDestination.local,
        CaptureDestination.appleReminders,
      ]
    case CaptureKind.event:
      return [
        CaptureDestination.appleCalendar,
        CaptureDestination.kroCloud,
        CaptureDestination.local,
      ]
    case CaptureKind.reminder:
      return [CaptureDestination.appleReminders, CaptureDestination.local]
    default:
      return assertNever(kind)
  }
}

/**
 * What the host picker may offer for a kind: canon's `supported(for:)`
 * intersected with what this browser actually has, in canon's preference
 * order. Local is supported by every kind and always available, so the list
 * is never empty in practice; `.local` is still returned as the floor.
 */
export const captureDestinationsForKind = (
  kind: CaptureKind,
  available: readonly CaptureDestination[],
): readonly CaptureDestination[] => {
  const offered = supportedCaptureDestinations(kind).filter((destination) =>
    available.includes(destination),
  )
  return offered.length > 0 ? offered : [CaptureDestination.local]
}

/**
 * The destination a draft of `kind` should carry: `preferred` while it is
 * still offered, otherwise the first one the kind's preference order offers.
 */
export const resolvedCaptureDestination = (
  kind: CaptureKind,
  preferred: CaptureDestination,
  available: readonly CaptureDestination[],
): CaptureDestination => {
  const offered = captureDestinationsForKind(kind, available)
  return offered.includes(preferred)
    ? preferred
    : (offered[0] ?? CaptureDestination.local)
}

/**
 * The storage key canon's `@AppStorage("lastEndeavorHostingDestination")`
 * writes, kept **verbatim and un-namespaced**.
 *
 * It is deliberately outside the `kro:` preferences namespace, exactly as canon
 * has it: `Preferences.clearAll()` on sign-out wipes `kro:` and nothing else,
 * so the last-used host survives a sign-out on iOS and does here too. Prefixing
 * it would be a behaviour change dressed as a port.
 */
export const LAST_USED_DESTINATION_KEY = 'lastEndeavorHostingDestination'

/**
 * `lastUsedDestination` — the restore, including canon's fallback: an
 * unrecognised (or absent, or non-string) stored value resolves to `.local`.
 */
export const lastUsedDestinationFromStored = (
  stored: unknown,
): CaptureDestination =>
  (typeof stored === 'string'
    ? captureDestinationFromRawValue(stored)
    : null) ?? CaptureDestination.local

/**
 * `availableHostingDestinations` — canon's derivation from integration state,
 * with the two Apple hosts unreachable on web (#1: EventKit has no browser
 * counterpart) and therefore only ever present when a caller says so.
 *
 * Local is always first; canon's own guard against an empty list (`safeDestinations`)
 * lives in the prompt's `init` and is applied here instead, at the one place
 * the list is built.
 */
export const availableCaptureDestinations = (integrations: {
  readonly appleRemindersAuthorized?: boolean
  readonly appleCalendarAuthorized?: boolean
  readonly kroCloudEnabled?: boolean
}): readonly CaptureDestination[] => {
  const destinations: CaptureDestination[] = [CaptureDestination.local]
  if (integrations.appleRemindersAuthorized === true) {
    destinations.push(CaptureDestination.appleReminders)
  }
  if (integrations.appleCalendarAuthorized === true) {
    destinations.push(CaptureDestination.appleCalendar)
  }
  if (integrations.kroCloudEnabled === true) {
    destinations.push(CaptureDestination.kroCloud)
  }
  return destinations
}

// ---------------------------------------------------------------------------
// Recurrence
// ---------------------------------------------------------------------------

/**
 * `EndeavorRecurrence` — the repeat chip's five shapes. `weekdays` and `month`
 * are typed as the domain's own enums rather than canon's `Set<Int>` / `Int`,
 * so the `Month(rawValue:) ?? .january` fallback canon needs cannot arise.
 */
export type CaptureRecurrence =
  | { readonly kind: 'never' }
  | { readonly kind: 'daily'; readonly interval: number }
  | {
      readonly kind: 'weekly'
      readonly interval: number
      readonly weekdays: readonly WeekDay[]
    }
  | {
      readonly kind: 'monthly'
      readonly interval: number
      readonly day: number
    }
  | {
      readonly kind: 'yearly'
      readonly interval: number
      readonly month: Month
      readonly day: number
    }

/** `.never` — the draft's default. */
export const NO_RECURRENCE: CaptureRecurrence = { kind: 'never' }

/** `EndeavorRecurrence.label`, verbatim including the "every N" plural rule. */
export const captureRecurrenceLabel = (
  recurrence: CaptureRecurrence,
): string => {
  switch (recurrence.kind) {
    case 'never':
      return 'Never'
    case 'daily':
      return recurrence.interval === 1
        ? 'Daily'
        : `Every ${recurrence.interval} days`
    case 'weekly':
      return recurrence.interval === 1
        ? 'Weekly'
        : `Every ${recurrence.interval} weeks`
    case 'monthly':
      return recurrence.interval === 1
        ? 'Monthly'
        : `Every ${recurrence.interval} months`
    case 'yearly':
      return recurrence.interval === 1
        ? 'Yearly'
        : `Every ${recurrence.interval} years`
    default:
      return assertNever(recurrence)
  }
}

/** The `EndeavorRecurrence → Endeavor.RepeatConfig` map, `null` for `.never`. */
export const repeatConfigFromCaptureRecurrence = (
  recurrence: CaptureRecurrence,
): RepeatConfig | null => {
  switch (recurrence.kind) {
    case 'never':
      return null
    case 'daily':
      return makeRepeatConfig(dailyBase(), recurrence.interval)
    case 'weekly':
      return makeRepeatConfig(
        weeklyBase(recurrence.weekdays),
        recurrence.interval,
      )
    case 'monthly':
      return makeRepeatConfig(monthlyBase(recurrence.day), recurrence.interval)
    case 'yearly':
      return makeRepeatConfig(
        yearlyBase(recurrence.day, recurrence.month),
        recurrence.interval,
      )
    default:
      return assertNever(recurrence)
  }
}

// ---------------------------------------------------------------------------
// Quarter-hour arithmetic
// ---------------------------------------------------------------------------

/** The grain every slot in the product snaps to. */
export const QUARTER_HOUR_MINUTES = 15

const MINUTE_MS = 60_000

/**
 * `InboxRowWrapper.nextFreeSlot(from:)` — round **up** to the next quarter
 * hour, seconds dropped.
 *
 * Strictly later than `reference`, always: canon computes
 * `((minute / 15) + 1) * 15` from the top of the hour, so 10:00 offers 10:15
 * (not 10:00) and 10:59 offers 11:00. This is the "Add for Today" prefill, so
 * offering a slot that has already begun would be the bug.
 */
export const nextQuarterHourSlot = (reference: Date): Date => {
  const topOfHour = new Date(reference)
  topOfHour.setMinutes(0, 0, 0)
  const bumped =
    (Math.floor(reference.getMinutes() / QUARTER_HOUR_MINUTES) + 1) *
    QUARTER_HOUR_MINUTES
  return new Date(topOfHour.getTime() + bumped * MINUTE_MS)
}

/**
 * `TimelineLayout.nearestSlot(to:)` — round to the **nearest** quarter hour
 * from the start of the day, halves going up.
 *
 * This is the prompt draft's seed, not the Add-for-Today prefill: canon opens a
 * fresh draft on "the quarter hour nearest now, matching the grain the timeline
 * snaps to", because the top of the hour "would be up to 59 minutes away from
 * what the user is actually looking at". The two round differently on purpose.
 */
export const nearestQuarterHourSlot = (reference: Date): Date => {
  const dayStart = new Date(reference)
  dayStart.setHours(0, 0, 0, 0)
  const slotMs = QUARTER_HOUR_MINUTES * MINUTE_MS
  const elapsed = reference.getTime() - dayStart.getTime()
  return new Date(dayStart.getTime() + Math.round(elapsed / slotMs) * slotMs)
}

/**
 * `toEndeavor()`'s date+time merge: the calendar day of `date`, at the hour and
 * minute of `time`. Seconds are dropped, as canon's
 * `dateComponents([.year, .month, .day]) + [.hour, .minute]` rebuild drops them.
 */
export const combineDateAndTime = (date: Date, time: Date): Date => {
  const combined = new Date(date)
  combined.setHours(time.getHours(), time.getMinutes(), 0, 0)
  return combined
}

/**
 * `InboxFeature.nextFreeSlotToday(in:now:)` — the soonest open gap today.
 *
 * Starts at the next quarter hour and steps past any of today's timed
 * endeavors whose interval contains the candidate, in start order (a later
 * event can itself contain the bumped candidate, which is why the scan
 * continues rather than stopping at the first hit). Capped at 23:59 today.
 *
 * It is Triage's seed, not Add-for-Today's — canon seeds the Triage form with
 * it when a row's **Triage** button is tapped. It lives here because it lives
 * in canon's `InboxFeature`; #25 consumes it.
 */
export const nextFreeSlotToday = (
  endeavors: readonly Endeavor[],
  now: Date,
): Date => {
  const endOfDay = new Date(now)
  endOfDay.setHours(23, 59, 0, 0)

  let candidate = nextQuarterHourSlot(now)

  const todaysIntervals = endeavors
    .flatMap((endeavor) => {
      const start = endeavor.start
      if (start === null || !isSameCalendarDay(start, now)) return []
      const duration = endeavor.duration ?? 0
      return [{ start, end: new Date(start.getTime() + duration * 1000) }]
    })
    .sort((left, right) => left.start.getTime() - right.start.getTime())

  for (const interval of todaysIntervals) {
    if (
      interval.start.getTime() <= candidate.getTime() &&
      candidate.getTime() < interval.end.getTime()
    ) {
      candidate = interval.end
    }
  }

  return candidate.getTime() < endOfDay.getTime() ? candidate : endOfDay
}

// ---------------------------------------------------------------------------
// The draft
// ---------------------------------------------------------------------------

/**
 * `EndeavorPromptDraft` — the live, editable prompt state.
 *
 * `hasTime` / `hasEndTime` are canon's own flags and are what make "no time"
 * distinguishable from "midnight": the draft always carries a *candidate*
 * instant so the picker has something to open on, and the flag says whether the
 * user has actually committed to it.
 */
export interface CaptureDraft {
  readonly title: string
  readonly kind: CaptureKind
  /**
   * Due / start **day**. Time-of-day here is never read.
   *
   * Always a real candidate instant, exactly like `time`/`endTime` — so the
   * date panel has something to open on even while `hasDate` is `false`.
   */
  readonly date: Date
  /**
   * Whether the user has committed to `date`, mirroring `hasTime`.
   *
   * **KC-IS-#75.** Canon's `EndeavorInputPrompt` draft has no equivalent
   * flag — its date chip is always `isSet: true` and offers no clear
   * affordance — so a Task built from it can never reach Pending Triage
   * (`start === null && due === null`), even though canon's own Inbox spec
   * defines Pending Triage as "every unscheduled non-event endeavor". This
   * flag is what makes that state reachable: `false` for a Task or Reminder
   * means the capture submits with no due date. An Event forces this back to
   * `true` the moment its kind is selected (`withKindSelected`) and its own
   * Clear affordance is never offered — `Endeavor.event(...)` has no way to
   * represent an event without a start.
   */
  readonly hasDate: boolean
  readonly hasTime: boolean
  readonly time: Date
  readonly hasEndTime: boolean
  readonly endTime: Date
  readonly rewards: number
  /**
   * `true` once the user has moved the rewards stepper. Until then the value
   * tracks the kind's default, so Habit → Task re-seeds 10 → 30.
   */
  readonly hasCustomRewards: boolean
  /** 1–5 value-to-goals rating (Kro-enhanced). Tasks and habits only. */
  readonly value: number | null
  /** Optional estimate, in seconds. Tasks and habits only; never mandatory. */
  readonly duration: number | null
  /**
   * The emoji chosen from the picker. Deliberately **not** written into
   * `title` while typing — it is folded in at save by
   * `captureTitleForPersistence`, exactly as canon does.
   */
  readonly pickedEmoji: string | null
  readonly recurrence: CaptureRecurrence
  readonly destination: CaptureDestination
}

/** The habit seed canon calls `.everyDay`. */
export const EVERY_DAY_RECURRENCE: CaptureRecurrence = {
  kind: 'daily',
  interval: 1,
}

/** The value rating's bounds. */
export const MINIMUM_CAPTURE_VALUE = 1
export const MAXIMUM_CAPTURE_VALUE = 5

/** `valueLabels` — shared with Triage so one rating means one thing. */
export const CAPTURE_VALUE_LABELS: readonly string[] = [
  'Trivial',
  'Minor',
  'Meaningful',
  'Major',
  'Life-changing',
]

/** The descriptor for a rating, or `null` outside 1…5. */
export const captureValueLabel = (value: number): string | null =>
  CAPTURE_VALUE_LABELS[value - 1] ?? null

/** `durationLabel(minutes:)` — Triage's duration chip wording, verbatim. */
export const captureDurationLabel = (minutes: number): string => {
  switch (minutes) {
    case 1:
      return 'A minute'
    case 120:
      return '2 hours'
    case 180:
      return '3 hours'
    default:
      return `${minutes} min`
  }
}

/**
 * `applyKindChanged(to:)` — re-seeds every kind-derived default, leaving
 * anything the user explicitly touched alone. Canon's event-end resolution is
 * not ported here; this repo's event rules (both times required, never
 * auto-filled) stand. `hasDate` is pinned for an Event (`KC-IS-#75`).
 */
export const applyCaptureKindDefaults = (
  draft: CaptureDraft,
  kind: CaptureKind,
): CaptureDraft => ({
  ...draft,
  kind,
  rewards: draft.hasCustomRewards
    ? draft.rewards
    : captureKindDefaultRewards(kind),
  duration: captureKindSupportsDuration(kind) ? draft.duration : null,
  value: captureKindSupportsValue(kind) ? draft.value : null,
  recurrence:
    captureKindRequiresRecurrence(kind) && draft.recurrence.kind === 'never'
      ? EVERY_DAY_RECURRENCE
      : draft.recurrence,
  hasTime: captureKindRequiresTime(kind) ? true : draft.hasTime,
  hasDate: kind === CaptureKind.event ? true : draft.hasDate,
})

/** The rewards stepper's bounds. */
export const MINIMUM_CAPTURE_REWARDS = 1
export const MAXIMUM_CAPTURE_REWARDS = 999

/**
 * `EndeavorPromptDraft.init(initialKind:initialStart:)`.
 *
 * With an `initialStart` (the Plan timeline's press-to-create) the draft opens
 * **already scheduled** — that day, that start, a one-hour end — so the user
 * only types a title. Without one it is unscheduled and merely *offers* the
 * quarter hour nearest `now`.
 */
export const makeCaptureDraft = (params: {
  readonly kind: CaptureKind
  readonly now: Date
  readonly initialStart?: Date | null
  readonly destination: CaptureDestination
}): CaptureDraft => {
  const initialStart = params.initialStart ?? null
  const base = initialStart ?? nearestQuarterHourSlot(params.now)
  const endTime = new Date(base.getTime() + 60 * MINUTE_MS)
  const date = new Date(initialStart ?? params.now)
  date.setHours(0, 0, 0, 0)

  const seeded: CaptureDraft = {
    title: '',
    kind: params.kind,
    date,
    // Matches canon's own `isSet: true` seed — a fresh capture still opens
    // dated by default. `hasDate` only ever turns false through an explicit
    // Clear (`withDateCleared`).
    hasDate: true,
    hasTime: initialStart !== null,
    time: base,
    hasEndTime: initialStart !== null,
    endTime,
    rewards: captureKindDefaultRewards(params.kind),
    hasCustomRewards: false,
    value: null,
    duration: null,
    pickedEmoji: null,
    recurrence: NO_RECURRENCE,
    destination: params.destination,
  }
  // Opening *on* a kind and switching *to* it seed the same defaults.
  return applyCaptureKindDefaults(seeded, params.kind)
}

/** Canon's stepper clamp — 1…999, applied wherever the value is set. */
export const clampCaptureRewards = (points: number): number =>
  Math.min(
    MAXIMUM_CAPTURE_REWARDS,
    Math.max(MINIMUM_CAPTURE_REWARDS, Math.trunc(points)),
  )

// ---------------------------------------------------------------------------
// Validation — and *why* Add is disabled
// ---------------------------------------------------------------------------

/**
 * What is standing between the draft and a capture.
 *
 * Canon only computes a boolean (`canSubmit`), because SwiftUI's disabled Add
 * button carries no explanation. The epic's a11y contract requires the opposite
 * — *"disabled submit controls name what blocks them"* — so the boolean is
 * derived from a **named reason** here rather than the other way round.
 */
export const CaptureBlocker = {
  missingTitle: 'missingTitle',
  missingEventStart: 'missingEventStart',
  missingEventEnd: 'missingEventEnd',
  missingEventStartAndEnd: 'missingEventStartAndEnd',
  missingHabitTime: 'missingHabitTime',
  missingHabitRecurrence: 'missingHabitRecurrence',
  missingValue: 'missingValue',
} as const

export type CaptureBlocker =
  (typeof CaptureBlocker)[keyof typeof CaptureBlocker]

/** `title.trimmingCharacters(in: .whitespacesAndNewlines)`. */
export const trimmedCaptureTitle = (draft: CaptureDraft): string =>
  draft.title.trim()

/**
 * The one blocker to report, or `null` when Add is enabled.
 *
 * Order matters and follows `commitIfValid`: the empty-title guard runs first,
 * so an untitled event is reported as untitled rather than as missing times.
 * Events are the only stricter case — canon: *"they MUST carry both a start
 * (date + time) and an end before Add becomes valid"* — because
 * `Endeavor.event(...)` has no way to represent an event without a start and a
 * duration.
 */
export const captureBlocker = (draft: CaptureDraft): CaptureBlocker | null => {
  if (trimmedCaptureTitle(draft).length === 0) {
    return CaptureBlocker.missingTitle
  }
  if (draft.kind === CaptureKind.event) {
    if (!draft.hasTime && !draft.hasEndTime) {
      return CaptureBlocker.missingEventStartAndEnd
    }
    if (!draft.hasTime) return CaptureBlocker.missingEventStart
    if (!draft.hasEndTime) return CaptureBlocker.missingEventEnd
  }
  if (captureKindRequiresTime(draft.kind) && !draft.hasTime) {
    return CaptureBlocker.missingHabitTime
  }
  if (
    captureKindRequiresRecurrence(draft.kind) &&
    draft.recurrence.kind === 'never'
  ) {
    return CaptureBlocker.missingHabitRecurrence
  }
  if (isCaptureValueRequired(draft) && draft.value === null) {
    return CaptureBlocker.missingValue
  }
  return null
}

/**
 * `isValueRequired` — the kind demands a rating **and** the host can store
 * one. A task bound for Reminders is never blocked over a number the host
 * would drop.
 */
export const isCaptureValueRequired = (draft: CaptureDraft): boolean =>
  captureKindRequiresValue(draft.kind) &&
  captureDestinationStoresKroEnhancedFields(draft.destination)

/** The copy a disabled Add announces. */
export const captureBlockerReason = (
  blocker: CaptureBlocker,
  kind: CaptureKind,
  destination: CaptureDestination,
): string => {
  switch (blocker) {
    case CaptureBlocker.missingTitle:
      return `Enter a title to add this ${captureKindLabel(kind).toLowerCase()}.`
    case CaptureBlocker.missingEventStartAndEnd:
      return 'Pick a start time and an end time to add this event.'
    case CaptureBlocker.missingEventStart:
      return 'Pick a start time to add this event.'
    case CaptureBlocker.missingEventEnd:
      return 'Pick an end time to add this event.'
    case CaptureBlocker.missingHabitTime:
      return 'Pick a time to add this habit.'
    case CaptureBlocker.missingHabitRecurrence:
      return 'Pick a repeat schedule to add this habit.'
    case CaptureBlocker.missingValue:
      // Names the host that demands it, as canon's "Required for <host>" does.
      return `Pick a value rating — required for ${captureDestinationLabel(destination)}.`
    default:
      return assertNever(blocker)
  }
}

/** The reason string for a draft, or `null` when nothing blocks submission. */
export const captureBlockedReason = (draft: CaptureDraft): string | null => {
  const blocker = captureBlocker(draft)
  return blocker === null
    ? null
    : captureBlockerReason(blocker, draft.kind, draft.destination)
}

/** `canSubmit` — `!isEmpty && !isEventMissingTimes`, by another route. */
export const canSubmitCapture = (draft: CaptureDraft): boolean =>
  captureBlocker(draft) === null

// ---------------------------------------------------------------------------
// The result, and its domain conversion
// ---------------------------------------------------------------------------

/** `EndeavorInputResult` — what a confirmed prompt emits. */
export interface CaptureResult {
  readonly title: string
  readonly kind: CaptureKind
  /** `null` for habits — they are timeless and carry no date. */
  readonly date: Date | null
  /** Start time (or the single time for task/reminder). `null` when unset. */
  readonly time: Date | null
  /** End time. Non-`null` for events only. */
  readonly endTime: Date | null
  readonly destination: CaptureDestination
  readonly recurrence: CaptureRecurrence
  /** `null` for the kinds that earn nothing — reminder and event. */
  readonly rewards: number | null
  /** 1–5 rating; always `null` for the kinds that do not support one. */
  readonly value: number | null
  /** Estimate in seconds; always `null` for the kinds without one. */
  readonly duration: number | null
}

// ---------------------------------------------------------------------------
// The symbol, and the persisted title
// ---------------------------------------------------------------------------

/**
 * The first emoji **anywhere** in a string — `Character.isEmojiSymbol` over
 * whole grapheme-ish sequences (variation selectors, skin tones, ZWJ joins).
 * Same pattern as `leadingEmoji`, un-anchored.
 */
const FIRST_EMOJI =
  /\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier}|\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*/u

/**
 * `titleForPersistence` — the title as it is actually stored.
 *
 * Kro has no emoji column: the emoji in the title *is* the symbol. So a pick
 * replaces the **first** emoji found anywhere in the trimmed title (a leading
 * one also normalizes the whitespace after it), or is prepended when there is
 * none. With no pick the trimmed title is stored as typed — an inferred
 * keyword symbol is a preview affordance, never persisted.
 */
export const captureTitleForPersistence = (
  title: string,
  pickedEmoji: string | null,
): string => {
  const trimmed = title.trim()
  if (pickedEmoji === null) return trimmed
  const match = FIRST_EMOJI.exec(trimmed)
  if (match === null) {
    return trimmed.length === 0 ? pickedEmoji : `${pickedEmoji} ${trimmed}`
  }
  if (match.index > 0) {
    return (
      trimmed.slice(0, match.index) +
      pickedEmoji +
      trimmed.slice(match.index + match[0].length)
    )
  }
  const body = trimmed.slice(match[0].length).trimStart()
  return body.length === 0 ? pickedEmoji : `${pickedEmoji} ${body}`
}

/**
 * `resolvedSymbol` — the title row's badge: a pick wins over a typed emoji,
 * else the same `computedSymbol` rules every saved card renders with.
 */
export const captureResolvedSymbol = (draft: CaptureDraft): string =>
  draft.pickedEmoji ?? computedSymbol(trimmedCaptureTitle(draft))

/**
 * `commitIfValid()` — the result, or `null` when the draft may not be
 * submitted.
 *
 * The per-kind projections are canon's, verbatim, plus one this repo adds:
 * habits drop the date, only tasks and habits carry rewards, and only an
 * event with a committed end carries `endTime`. **`date` also drops to `null`
 * whenever `hasDate` is `false`** (`KC-IS-#75`) — canon's own draft has no
 * such flag and always emits `draft.dueDate`, which is exactly why a Task
 * built through its prompt can never reach Pending Triage. `hasDate` stays
 * pinned `true` for an event (`withKindSelected`, `withDateCleared`), so this
 * branch never drops an event's date.
 */
export const captureResultFromDraft = (
  draft: CaptureDraft,
): CaptureResult | null => {
  if (!canSubmitCapture(draft)) return null
  const isEvent = draft.kind === CaptureKind.event
  return {
    title: captureTitleForPersistence(draft.title, draft.pickedEmoji),
    kind: draft.kind,
    date:
      draft.kind === CaptureKind.habit
        ? null
        : draft.hasDate
          ? draft.date
          : null,
    time: draft.hasTime ? draft.time : null,
    endTime: isEvent && draft.hasEndTime ? draft.endTime : null,
    destination: draft.destination,
    recurrence: draft.recurrence,
    rewards: captureKindEarnsRewards(draft.kind) ? draft.rewards : null,
    value: captureKindSupportsValue(draft.kind) ? draft.value : null,
    duration: captureKindSupportsDuration(draft.kind) ? draft.duration : null,
  }
}

/**
 * `isValidForCreation` — the boundary guard Main applies before building.
 *
 * Belt and braces on top of `captureResultFromDraft`: an event result missing
 * any of date / start / end is refused rather than silently built into a
 * shapeless event.
 */
export const isCaptureResultValidForCreation = (
  result: CaptureResult,
): boolean =>
  result.kind !== CaptureKind.event ||
  (result.date !== null && result.time !== null && result.endTime !== null)

/** Canon's floor on a built event's duration: `max(end - start, 60)` seconds. */
export const MINIMUM_EVENT_DURATION_SECONDS = 60

/**
 * `toEndeavor()` — the result as a domain `Endeavor`.
 *
 * `id` and `now` are parameters because this tier owns neither: canon's
 * `Endeavor.task(...)` mints a `UUID()` and stamps `createdAt: Date()`, and
 * both are injected here so a capture is reproducible in a test.
 *
 * `createdAt` is explicit for canon's stated reason — the Inbox sorts on it,
 * and a task without one sorts to the bottom forever.
 */
export const endeavorFromCaptureResult = (
  result: CaptureResult,
  options: { readonly id: string; readonly now: Date },
): Endeavor => {
  const host = endeavorHostForDestination(result.destination)

  if (
    result.kind === CaptureKind.event &&
    result.date !== null &&
    result.time !== null &&
    result.endTime !== null
  ) {
    const start = combineDateAndTime(result.date, result.time)
    const end = combineDateAndTime(result.date, result.endTime)
    const duration = Math.max(
      (end.getTime() - start.getTime()) / 1000,
      MINIMUM_EVENT_DURATION_SECONDS,
    )
    return makeEndeavor({
      id: options.id,
      title: result.title,
      kind: EndeavorKind.calendarEvent,
      start,
      duration,
      createdAt: options.now,
      hostedBy: [host],
    })
  }

  const due =
    result.date === null
      ? null
      : result.time === null
        ? result.date
        : combineDateAndTime(result.date, result.time)

  return makeEndeavor({
    id: options.id,
    title: result.title,
    kind: endeavorKindForCaptureKind(result.kind),
    status: EndeavorStatus.pending,
    due,
    repeatConfig: repeatConfigFromCaptureRecurrence(result.recurrence),
    createdAt: options.now,
    sessionPoints: result.rewards,
    value: result.value,
    duration: result.duration,
    hostedBy: [host],
  })
}

/**
 * The rest of a multi-add's Just Created rows, in the order they were added —
 * the same non-event guard as the single slot.
 */
export const alsoJustCreatedEndeavors = (
  endeavors: readonly Endeavor[],
  ids: readonly string[],
): readonly Endeavor[] =>
  ids.flatMap((id) => {
    const found = endeavors.find((endeavor) => endeavor.id === id)
    return found === undefined || found.kind === EndeavorKind.calendarEvent
      ? []
      : [found]
  })

/**
 * Where a multi-add from the suggestions pane takes the user: the Inbox with
 * every Inbox-bound row Just Created when at least one landed there; else —
 * every one an event — the Plan, exactly like a single event capture. `null`
 * for an empty batch.
 */
export const multiAddIntentFor = (
  added: readonly Endeavor[],
  now: Date,
): CaptureNavigationIntent | null => {
  const inboxBound = added.filter(
    (endeavor) => captureRouteFor(endeavor).kind === 'inbox',
  )
  const first = inboxBound[0]
  if (first === undefined) {
    const event = added[0]
    return event === undefined ? null : captureIntentFor(event, now)
  }
  const route: InboxCaptureRoute = {
    kind: 'inbox',
    endeavorId: first.id,
    additionalEndeavorIds: inboxBound.slice(1).map((endeavor) => endeavor.id),
  }
  return { route, decidedAt: now, deliverAfterMs: captureRouteDelayMs(route) }
}

// ---------------------------------------------------------------------------
// Capture routing
// ---------------------------------------------------------------------------

/**
 * `clock.sleep(for: .milliseconds(500))` in `produceShowInboxAfterDelayEffect`
 * — the pause that lets the prompt finish dismissing before the Inbox sheet
 * arrives.
 */
export const CAPTURE_INBOX_DELAY_MS = 500

/**
 * The same 500 ms in `produceNavigateToPlanForEventAfterDelayEffect`, whose own
 * comment says it *matches the inbox-after-delay cadence*. Two constants rather
 * than one shared value because canon declares two, and a future product
 * decision could move one without the other.
 */
export const CAPTURE_PLAN_ROUTE_DELAY_MS = 500

/**
 * Add for Today switches tabs in the same reducer step as the confirmation —
 * canon's `.scheduledForToday` mutates `selectedElement` and `scrollTarget`
 * inline, with no `clock.sleep`. The zero is named so the routing table reads
 * uniformly and so the absence of a delay is a stated decision.
 */
export const ADD_FOR_TODAY_ROUTE_DELAY_MS = 0

/** `ActionToastModel(duration: 8)` — the Undo window. */
export const ADD_FOR_TODAY_UNDO_WINDOW_MS = 8_000

/**
 * Where a capture (or a scheduling) sends the user.
 *
 * The Plan case carries exactly what canon seeds onto `PlanFeature.State`:
 * `selectedDate` (`day`), `scrollTarget`, and `recentlyAddedEndeavors` — which
 * in canon does double duty as *"the bluish just-created row highlight AND
 * tells PlanScreen's TimelineDayViewModel to open in `.list` mode"*. Those two
 * jobs are separate fields here (`highlight`, `listMode`) because the
 * scheduling path wants neither, and inferring both from one array is what made
 * canon's comment necessary in the first place.
 */
export interface PlanCaptureRoute {
  readonly kind: 'plan'
  /** `selectedDate` — the day the surface should show. */
  readonly day: Date
  /** `scrollTarget` — the moment to bring into view. */
  readonly scrollTarget: Date
  readonly endeavorId: string
  /** The bluish just-created accent on that row. */
  readonly highlight: boolean
  /** Open the day in the chronological list, not the timeline. */
  readonly listMode: boolean
}

export interface InboxCaptureRoute {
  readonly kind: 'inbox'
  readonly endeavorId: string
  /**
   * Further endeavors created in the same step (a multi-add from the
   * suggestions pane), shown beneath the first in the Just Created slot.
   */
  readonly additionalEndeavorIds?: readonly string[]
}

export type CaptureRoute = PlanCaptureRoute | InboxCaptureRoute

/**
 * A route plus when it was decided and how long the shell should wait before
 * performing it. `RC-17` keeps navigation itself in a Service invoked from a
 * Producer; this is the *decision*, which is business logic and belongs in the
 * slice — the shell (#13/#24) consumes it and calls the router.
 */
export interface CaptureNavigationIntent {
  readonly route: CaptureRoute
  readonly decidedAt: Date
  readonly deliverAfterMs: number
}

/**
 * The routing branch of `.userDidAddEndeavor`, as a pure decision.
 *
 * An **event** goes to Plan — day, list mode, scrolled to and highlighted — and
 * the Inbox never opens for it; *"this is the only path that auto-navigates a
 * captured endeavor away from the Inbox"*. Everything else opens the Inbox and
 * never auto-navigates, *"even when it would apply to today"*.
 *
 * An event with no `start` cannot be routed to a slot, so it falls to the Inbox
 * branch — canon's `if newEndeavor.kind == .calendarEvent, let eventStart` has
 * exactly that fall-through, and `isCaptureResultValidForCreation` is what
 * makes it unreachable from the prompt.
 */
export const captureRouteFor = (endeavor: Endeavor): CaptureRoute => {
  if (endeavor.kind === EndeavorKind.calendarEvent && endeavor.start !== null) {
    const day = new Date(endeavor.start)
    day.setHours(0, 0, 0, 0)
    return {
      kind: 'plan',
      day,
      scrollTarget: endeavor.start,
      endeavorId: endeavor.id,
      highlight: true,
      listMode: true,
    }
  }
  return { kind: 'inbox', endeavorId: endeavor.id }
}

/** The delay canon waits before performing `route`. */
export const captureRouteDelayMs = (route: CaptureRoute): number =>
  route.kind === 'plan' ? CAPTURE_PLAN_ROUTE_DELAY_MS : CAPTURE_INBOX_DELAY_MS

/** The intent a capture produces: the route, the instant, and the wait. */
export const captureIntentFor = (
  endeavor: Endeavor,
  now: Date,
): CaptureNavigationIntent => {
  const route = captureRouteFor(endeavor)
  return { route, decidedAt: now, deliverAfterMs: captureRouteDelayMs(route) }
}

/** The intent an Add-for-Today confirmation produces — Plan, now, unhighlighted. */
export const schedulingIntentFor = (params: {
  readonly endeavorId: string
  readonly scheduledAt: Date
  readonly now: Date
}): CaptureNavigationIntent => {
  const day = new Date(params.scheduledAt)
  day.setHours(0, 0, 0, 0)
  return {
    route: {
      kind: 'plan',
      day,
      scrollTarget: params.scheduledAt,
      endeavorId: params.endeavorId,
      highlight: false,
      listMode: false,
    },
    decidedAt: params.now,
    deliverAfterMs: ADD_FOR_TODAY_ROUTE_DELAY_MS,
  }
}

/** Whether the shell's wait is over — the injected-time form of `sleep`. */
export const isCaptureIntentDue = (
  intent: CaptureNavigationIntent,
  now: Date,
): boolean =>
  now.getTime() - intent.decidedAt.getTime() >= intent.deliverAfterMs

// ---------------------------------------------------------------------------
// Inbox sections
// ---------------------------------------------------------------------------

/**
 * `pendingTriageSelector` — every **unscheduled non-event** endeavor, with no
 * age bound at either end, newest first.
 *
 * Three terms, all canon's:
 * - `awaitsTriage` — the shared, kind-specific gate: only tasks and reminders
 *   (habits, calendar events, behaviors, blueprints and background work never
 *   queue), never completed or delegated work, never one already carrying
 *   every rating plus a disposition;
 * - "unscheduled" is `start == null && due == null`;
 * - the Just Created row is excluded, because it has its own slot.
 *
 * There is deliberately **no** `createdAt != null` gate: *"some legacy /
 * import paths create tasks without a timestamp, and the user must still be
 * able to find and triage them"*. Those sort last, via canon's `.distantPast`.
 */
export const pendingTriageEndeavors = (
  endeavors: readonly Endeavor[],
  justCreatedEndeavorId: string | null,
  alsoJustCreatedIds: readonly string[] = [],
  context: ReconciliationContext = makeReconciliationContext(),
): readonly Endeavor[] =>
  endeavors
    .filter(
      (endeavor) =>
        // The resolved kind, as Triage's own gate reads it — a row a
        // classifying provider resolves to an event must not be listed here
        // and then refused when its Triage opens.
        awaitsTriage(endeavor, resolvedKind(endeavor, context)) &&
        endeavor.start === null &&
        endeavor.due === null &&
        endeavor.id !== justCreatedEndeavorId &&
        !alsoJustCreatedIds.includes(endeavor.id),
    )
    .sort(
      (left, right) =>
        (right.createdAt?.getTime() ?? Number.NEGATIVE_INFINITY) -
        (left.createdAt?.getTime() ?? Number.NEGATIVE_INFINITY),
    )

/**
 * Whether a row's Triage button may be offered: its resolved kind is one
 * Triage applies to and it is not completed — the same gate `openTriageThunk`
 * enforces, so a row never offers a Triage that would then refuse to open.
 * (Pending Triage rows pass by construction; Just Created rows need asking —
 * a multi-added habit lands there.)
 */
export const isCaptureRowTriageable = (
  endeavor: Endeavor,
  context: ReconciliationContext = makeReconciliationContext(),
): boolean => canBeTriaged(endeavor, resolvedKind(endeavor, context))

/**
 * `justCreatedCardSelector` — the single row at the top of the sheet.
 *
 * Guarded on kind as well as on presence: canon returns `nil` for a calendar
 * event *"intentionally"*, so even a mis-routed event cannot surface here.
 */
export const justCreatedEndeavor = (
  endeavors: readonly Endeavor[],
  justCreatedEndeavorId: string | null,
): Endeavor | null => {
  if (justCreatedEndeavorId === null) return null
  const found = endeavors.find(
    (endeavor) => endeavor.id === justCreatedEndeavorId,
  )
  if (found === undefined) return null
  return found.kind === EndeavorKind.calendarEvent ? null : found
}

// ---------------------------------------------------------------------------
// Add for Today
// ---------------------------------------------------------------------------

/**
 * What a scheduling must remember to be undoable.
 *
 * `previousDeferCount` is here because the scheduling **appends** a `Defer`
 * audit entry, and an undo that restored `due` while leaving the entry behind
 * would claim the endeavor had been deferred to a slot it was never on.
 */
export interface CaptureSchedulingSnapshot {
  readonly endeavorId: string
  readonly title: string
  readonly scheduledAt: Date
  readonly previousStart: Date | null
  readonly previousDue: Date | null
  readonly previousDeferCount: number
}

/** `reason: "addForToday"` — canon's audit string on the appended `Defer`. */
export const ADD_FOR_TODAY_DEFER_REASON = 'addForToday'

/**
 * `withDeferred(to: scheduledAt, reason: "addForToday")`, written out rather
 * than called.
 *
 * `EndeavorMutations.withDeferred` guards on `EndeavorRelation.defers`, which
 * tracks `due`, which is **not editable for a habit** — so calling it here
 * would make "Add for Today" a silent no-op on the habit rows the Inbox is
 * full of. Canon's Swift `withDeferred(to:)` carries no such guard and
 * schedules any kind, so the port is the explicit rebuild below. (The guard on
 * the shared helper is #7's and correct for editing surfaces; the divergence is
 * noted in the delivery PR.)
 */
export const scheduledForToday = (
  endeavor: Endeavor,
  params: { readonly scheduledAt: Date; readonly now: Date },
): Endeavor => ({
  ...endeavor,
  due: params.scheduledAt,
  defers: [
    ...endeavor.defers,
    makeDefer({
      made: params.now,
      reason: ADD_FOR_TODAY_DEFER_REASON,
      target: params.scheduledAt,
    }),
  ],
})

/** The snapshot a scheduling takes of the row it is about to move. */
export const schedulingSnapshotOf = (
  endeavor: Endeavor,
  scheduledAt: Date,
): CaptureSchedulingSnapshot => ({
  endeavorId: endeavor.id,
  title: endeavor.title,
  scheduledAt,
  previousStart: endeavor.start,
  previousDue: endeavor.due,
  previousDeferCount: endeavor.defers.length,
})

/**
 * The exact prior state — `start`, `due` **and** the defer history as they
 * were.
 *
 * **Divergence from canon, deliberately.** Canon restores only when a previous
 * `due` existed (`if let previous = snapshot.previousDue`), which means an undo
 * of an inbox row leaves it scheduled: Pending Triage holds *unscheduled*
 * endeavors, so `previousDue` is always `nil` there and canon's undo is a no-op
 * in the only flow that can reach it. KC-IS-#23 binds the behaviour the doc
 * promises — *"the endeavor's previous due time is restored"* — so `null` is
 * restored as `null` here.
 */
export const unscheduledFromSnapshot = (
  endeavor: Endeavor,
  snapshot: CaptureSchedulingSnapshot,
): Endeavor => ({
  ...endeavor,
  start: snapshot.previousStart,
  due: snapshot.previousDue,
  defers: endeavor.defers.slice(0, snapshot.previousDeferCount),
})

/** The `Defer` rows a scheduling appended, i.e. the ones an undo removes. */
export const defersAddedBySnapshot = (
  endeavor: Endeavor,
  snapshot: CaptureSchedulingSnapshot,
): readonly Defer[] => endeavor.defers.slice(snapshot.previousDeferCount)

// ---------------------------------------------------------------------------
// Inbox row buttons
// ---------------------------------------------------------------------------

/**
 * The two explicit in-row buttons — canon's `InboxRowWrapper` actions, which
 * are **not** capability-driven.
 *
 * The Inbox vista's `capabilities` drive the row's swipe gestures only; Triage
 * is *"the Inbox's primary action and is surfaced as an explicit in-row button,
 * not a gesture"*, and Add for Today is the same shape. Their icons and labels
 * are canon's, so #24 renders what iOS renders.
 */
export const InboxRowButton = {
  triage: 'triage',
  addForToday: 'addForToday',
} as const

export type InboxRowButton =
  (typeof InboxRowButton)[keyof typeof InboxRowButton]

export interface InboxRowButtonSpec {
  readonly button: InboxRowButton
  readonly icon: string
  readonly label: string
}

/** In canon's render order: Triage first, then Add for Today. */
export const inboxRowButtons: readonly InboxRowButtonSpec[] = [
  {
    button: InboxRowButton.triage,
    icon: 'rectangle.split.2x2.fill',
    label: 'Triage',
  },
  {
    button: InboxRowButton.addForToday,
    icon: 'calendar.badge.plus',
    label: 'Add for Today',
  },
]
