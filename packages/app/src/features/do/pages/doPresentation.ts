/**
 * The Do surface's presentation vocabulary — every string, every section
 * descriptor and every projection the render tier needs, as pure functions.
 *
 * Canon spreads these across `DoView.swift` (the section titles, glyphs and
 * badge copy), `DoScreen.swift` (the header composition and the bell's
 * accessibility value) and `DoFeature.swift` (the two date formats). They are
 * gathered here for the reason `RC-8` gives about exception copy: a string
 * decided by a `kind` must have one owner, or two surfaces drift. The Do
 * surface renders the same lanes in a carousel, in an expanded list and in the
 * notifications panel; if each assembled "3 tasks" itself they would eventually
 * disagree.
 *
 * **The clock is a parameter, never read here.** `@kro/core` and the design kit
 * both made that call, and `DoFeature`'s own module note explains why: a
 * midnight-boundary case has to be a plain unit test rather than a mocked
 * global. `locale` travels the same way, so a story can pin `en-US` and a test
 * can assert an exact string.
 */
import type { Endeavor, EndeavorComputedState } from '@kro/core'
import { assertNever } from '@kro/core'
import {
  type EndeavorCardModel,
  endeavorCardModelFrom,
} from '../../../design/endeavor'
import { DoLane, type DoVisibility } from '../DoRules'

/* ------------------------------------------------------------------------ */
/* Card projection                                                           */
/* ------------------------------------------------------------------------ */

/**
 * A lane of endeavors as the card kit's view models.
 *
 * `endeavorCardModelFrom` is canon's own `EndeavorCardModel.init(from:)` seam
 * and the ONE place the domain type is read by the render tier, so every lane
 * goes through it rather than through a second, lane-local projection.
 */
export const doCardModels = (
  endeavors: readonly Endeavor[],
  now: Date,
): readonly EndeavorCardModel[] =>
  endeavors.map((endeavor) => endeavorCardModelFrom(endeavor, now))

/* ------------------------------------------------------------------------ */
/* Sections                                                                  */
/* ------------------------------------------------------------------------ */

/**
 * The section tags canon mints card keys with (`"sectionTag:endeavorID"`).
 *
 * `DoLane` already carries the six task lanes plus `featured`; the three below
 * exist only in the view layer, because reminders and events are not partitioned
 * into `DoLanes` at all — they are installed channels the surface groups itself.
 */
export const DoViewSection = {
  ...DoLane,
  reminders: 'reminders',
  eventsAllDay: 'events-allday',
  eventsTimed: 'events-timed',
} as const

export type DoViewSection =
  (typeof DoViewSection)[keyof typeof DoViewSection]

/** The glyphs canon names, as the keys this surface's icon table resolves. */
export type DoSectionGlyph =
  | 'overdue'
  | 'dueSoon'
  | 'expired'
  | 'next'
  | 'anytime'
  | 'completed'
  | 'reminders'
  | 'calendar'
  | 'suggestions'

/** One scrolling task lane's header, exactly as `DoView.taskSection` builds it. */
export interface DoSectionDescriptor {
  readonly lane: DoLane
  readonly tag: string
  readonly title: string
  /** `null` where canon passes no icon — the Next lane is the only one. */
  readonly glyph: DoSectionGlyph | null
  /** Canon's per-lane noun: "tasks" for the four urgent lanes, "items" otherwise. */
  readonly noun: 'tasks' | 'items'
}

/**
 * The six scrolling task lanes, in canon's render order.
 *
 * Featured Now is deliberately absent: it is the adaptive stack, not a
 * scrolling lane, and canon builds it from `EndeavorLane.Configuration.now`
 * rather than through `taskSection`.
 *
 * The order is the acceptance criterion, so it is a value rather than a
 * sequence of JSX blocks a later edit could reshuffle unnoticed.
 */
export const DO_TASK_SECTIONS: readonly DoSectionDescriptor[] = [
  {
    lane: DoLane.overdue,
    tag: DoLane.overdue,
    title: 'Overdue',
    glyph: 'overdue',
    noun: 'tasks',
  },
  {
    lane: DoLane.now,
    tag: DoLane.now,
    title: 'Due Soon',
    glyph: 'dueSoon',
    noun: 'tasks',
  },
  {
    lane: DoLane.expired,
    tag: DoLane.expired,
    title: 'Expired',
    glyph: 'expired',
    noun: 'tasks',
  },
  {
    lane: DoLane.next,
    tag: DoLane.next,
    title: 'Next',
    // Canon passes no icon for Next and falls through to the default badge.
    glyph: null,
    noun: 'tasks',
  },
  {
    lane: DoLane.anytime,
    tag: DoLane.anytime,
    title: 'Anytime',
    glyph: 'anytime',
    noun: 'items',
  },
  {
    lane: DoLane.completed,
    tag: DoLane.completed,
    title: 'Completed Today',
    glyph: 'completed',
    noun: 'items',
  },
]

/** Canon's `"\(count) tasks"` / `"\(count) items"` — no singular branch. */
export const doSectionBadgeText = (
  section: DoSectionDescriptor,
  count: number,
): string => `${count} ${section.noun}`

/**
 * The Reminders badge — the one lane canon does inflect
 * (`"1 reminder"` / `"N reminders"`).
 */
export const doRemindersBadgeText = (count: number): string =>
  count === 1 ? '1 reminder' : `${count} reminders`

/** The Calendar badge — all-day plus every timed card, as one count. */
export const doEventsBadgeText = (count: number): string => `${count} events`

/* ------------------------------------------------------------------------ */
/* The header                                                                */
/* ------------------------------------------------------------------------ */

/**
 * Canon's `shortDateString` — `DateFormatter` with `"MMM d"`.
 *
 * `Intl` rather than a hand-rolled month table: canon's formatter is created by
 * the OS per locale, and the browser equivalent of that is asking `Intl` for
 * the same two fields. A hardcoded English month name would be a regression
 * against canon, not a match for it.
 */
export const doShortDateString = (now: Date, locale?: string): string =>
  new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(now)

/**
 * The weekday alone — canon's `currentDateString.split(",").first`.
 *
 * Canon formats `"EEEE, MMMM d"` and then throws away everything after the
 * comma, which is a Swift-shaped way of asking for the weekday. Asking `Intl`
 * for `weekday: 'long'` gets the same answer without depending on a comma
 * surviving in every locale — in `ja-JP` canon's own split returns the entire
 * string, because there is no comma in it.
 */
export const doWeekdayString = (now: Date, locale?: string): string =>
  new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(now)

/** Canon's bulk-mode instruction, verbatim. */
export const DO_MARK_COMPLETE_TITLE = 'Check Complete'
export const DO_MARK_COMPLETE_SUBTITLE =
  'Tap any card to mark the task completed'

export interface DoHeaderContentInput {
  readonly now: Date
  readonly locale?: string
  /** `DoSurfaceLayout.usesExpandedDayTitle` — follows the WIDTH, not the idiom. */
  readonly usesExpandedDayTitle: boolean
  readonly isInMarkCompleteMode: boolean
  /** `selectDoRemainingTodayCount`. */
  readonly remainingCount: number
}

/** Every string `LargeScreenTitle` is handed, resolved in one pass. */
export interface DoHeaderContent {
  readonly title: string
  /** The short date beside the title, in the Calendar-red `headerDate` role. */
  readonly titleDetail: string | null
  /** The weekday after the detail. */
  readonly titleSpecifier: string | null
  readonly subtitle: string | null
  /** Whether the ☀︎ `sun.max.fill` glyph leads the title. */
  readonly showsSunGlyph: boolean
}

/**
 * `DoScreen`'s four header computed properties, as one function.
 *
 * Canon's rules, in canon's order:
 *   · bulk mode retitles to "Check Complete" and suppresses the glyph, the
 *     detail and the specifier — the instruction is the whole header;
 *   · a wide surface shows `☀︎ My Day · <short date> · <weekday>`;
 *   · a narrow one shows the bare short date and nothing else;
 *   · the subtitle is the instruction in bulk mode, "N left today" when
 *     something is left, and absent when nothing is.
 */
export const doHeaderContent = (
  input: DoHeaderContentInput,
): DoHeaderContent => {
  const { now, locale, usesExpandedDayTitle, isInMarkCompleteMode } = input
  const shortDate = doShortDateString(now, locale)

  if (isInMarkCompleteMode) {
    return {
      title: DO_MARK_COMPLETE_TITLE,
      titleDetail: null,
      titleSpecifier: null,
      subtitle: DO_MARK_COMPLETE_SUBTITLE,
      showsSunGlyph: false,
    }
  }

  const subtitle =
    input.remainingCount > 0 ? `${input.remainingCount} left today` : null

  if (!usesExpandedDayTitle) {
    return {
      title: shortDate,
      titleDetail: null,
      titleSpecifier: null,
      subtitle,
      showsSunGlyph: false,
    }
  }

  return {
    title: 'My Day',
    titleDetail: shortDate,
    titleSpecifier: doWeekdayString(now, locale),
    subtitle,
    showsSunGlyph: true,
  }
}

/* ------------------------------------------------------------------------ */
/* The attention bell                                                        */
/* ------------------------------------------------------------------------ */

/**
 * `DoNotificationsView.notificationSummary` — the panel's own subtitle.
 *
 * `null` when nothing needs attention, because canon renders the
 * "You're All Caught Up" state instead of a zero.
 */
export const doNotificationsSummary = (count: number): string | null => {
  if (count <= 0) return null
  return count === 1 ? '1 needs attention' : `${count} need attention`
}

/**
 * `DoScreen.notificationsAccessibilityValue` — worded per surface, because the
 * two surfaces do different things.
 *
 * The inline panel lists overdue **and** expired, so it can honestly say "N
 * need attention" (the same sentence the panel's own subtitle uses, singular
 * form included). The narrow surface only scrolls to Overdue, so promising the
 * expired count would be a promise it does not keep — canon's own comment.
 */
export const doNotificationsAccessibilityValue = (input: {
  readonly presentsInline: boolean
  readonly overdueCount: number
  readonly expiredCount: number
}): string => {
  const total = input.overdueCount + input.expiredCount
  if (total <= 0) return ''
  if (input.presentsInline) return doNotificationsSummary(total) ?? ''
  if (input.overdueCount <= 0) return ''
  return `${input.overdueCount} overdue`
}

/* ------------------------------------------------------------------------ */
/* Visibility                                                                */
/* ------------------------------------------------------------------------ */

/**
 * The three computed states the Do lens exposes, as the user reads them.
 *
 * They exist here rather than in `@kro/core` for the same reason
 * `endeavorCardModel` lives in the design tier: "Expired" is the word this
 * surface prints on a lane header, not a business rule the domain owes anyone.
 * Keeping the two in step is the point — the filter that hides the Expired lane
 * must be labelled with the lane's own name.
 */
export const doComputedStateLabel = (
  state: EndeavorComputedState,
): string => {
  switch (state) {
    case 'overdue':
      return 'Overdue'
    case 'expired':
      return 'Expired'
    case 'completedToday':
      return 'Completed Today'
    default:
      return assertNever(state)
  }
}

/**
 * `DoScreen`'s `allVisible` — whether the eye is open or struck through.
 *
 * Canon ANDs four emptiness checks (kinds, states, hosts, calendars); the
 * fourth is the calendar list, which arrives with the Google Calendar child.
 * Reading `hiddenCalendarIds` here keeps the term even though nothing on this
 * surface can currently populate it, so the glyph stays honest the moment it can.
 */
export const doAllFiltersVisible = (visibility: DoVisibility): boolean =>
  visibility.hiddenKinds.length === 0 &&
  visibility.hiddenHosts.length === 0 &&
  visibility.hiddenComputedStates.length === 0 &&
  visibility.hiddenCalendarIds.length === 0

/**
 * One toggle applied — the pure half of the Visibility surface.
 *
 * The slice deliberately owns no toggle semantics (`Do owns no toggle
 * semantics — it installs the selection and regroups`), so the *rule* that a
 * second tap re-shows a hidden kind lives here, next to the labels, and is a
 * table test rather than a rendered assertion.
 */
export const doVisibilityToggled = <Value extends string>(
  hidden: readonly Value[],
  value: Value,
): readonly Value[] =>
  hidden.includes(value)
    ? hidden.filter((entry) => entry !== value)
    : [...hidden, value]
