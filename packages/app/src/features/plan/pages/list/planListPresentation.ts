/**
 * What one Plan LIST row prints — the display decisions canon keeps inside
 * `TimelineDayView.listRow(for:)`, lifted out so they are unit-testable without
 * a canvas (the same split `findPresentation.ts` made for Find).
 *
 * ## Canon's row, mapped onto the endeavor kit's row
 *
 * Canon draws a 38pt tinted badge carrying the title's trailing emoji (or the
 * kind glyph), a two-line title + metadata block, an "ongoing" indicator and a
 * host cluster. The kit's `EndeavorRow` already draws the badge, the title, the
 * time caption and the badge strip, so the port supplies its inputs rather than
 * re-implementing the layout: the `default` preset is the one whose geometry
 * matches (56 icon, headline title, badges under the title, time info shown).
 *
 * The one canon signal the preset has no slot for is the *ongoing* accent, so
 * the Fragment draws it as a trailing pulse and this module only answers
 * whether a row is ongoing — a question already settled by `planListModel`'s
 * bucket, never re-derived here.
 *
 * ## The all-day row hides its time, in both presentations
 *
 * `listSection(.allDay, …)` passes `hideTime: true`, and `groupedListSection`
 * passes `hideTime: isAllDay(endeavor)` — canon fixed the second one in review
 * precisely so the two presentations agree. `planListRowTimeInfo` returns
 * `undefined` for an all-day row for the same reason: *"All-day events have no
 * meaningful clock time."*
 */
import type { Endeavor } from '@kro/core'
import type {
  EndeavorRowBadge,
  EndeavorRowTimeInfo,
} from '../../../../design/endeavor/EndeavorRow'
import { isPlanListAllDay } from './planListModel'

/**
 * The leading emoji of a title, with the emoji stripped from the text.
 *
 * Same rule as the Find row (`findRowSymbol`) so one endeavor looks the same in
 * both lists; the fallback glyph differs because a Plan day is events-first.
 */
const EMOJI_LEAD = /^(\p{Extended_Pictographic}(?:️)?(?:‍\p{Extended_Pictographic}(?:️)?)*)\s*/u

export interface PlanListRowSymbol {
  readonly symbol: string
  readonly isGeneric: boolean
  readonly title: string
}

/** Canon's `lastEmoji(in:)` fallback chain, in the leading-emoji form this app uses. */
export const planListRowSymbol = (title: string): PlanListRowSymbol => {
  const match = EMOJI_LEAD.exec(title)
  const lead = match?.[1]
  if (match === null || lead === undefined) {
    return { symbol: 'calendar', isGeneric: true, title: title.trim() }
  }
  return { symbol: lead, isGeneric: false, title: title.slice(match[0].length).trim() }
}

/**
 * What the row prints about time — a range for a timed item, a due caption for
 * an untimed one, a bare duration when there is no moment at all, and nothing
 * for an all-day event.
 */
export const planListRowTimeInfo = (
  endeavor: Endeavor,
): EndeavorRowTimeInfo | undefined => {
  if (isPlanListAllDay(endeavor)) return undefined
  if (endeavor.start !== null && endeavor.duration !== null) {
    return {
      kind: 'timeRange',
      start: endeavor.start,
      end: new Date(endeavor.start.getTime() + endeavor.duration * 1000),
    }
  }
  if (endeavor.due !== null) {
    return { kind: 'dueTime', date: endeavor.due, duration: endeavor.duration }
  }
  if (endeavor.duration !== null) {
    return { kind: 'duration', seconds: endeavor.duration }
  }
  return undefined
}

/**
 * The badges under a Plan list row's title.
 *
 * The kind only. Canon's list row prints a kind glyph and no status pill — the
 * day is a mix of events, tasks, habits and reminders and *which* is the fact
 * worth reading, whereas Find (which is browsing the whole store) also prints
 * the status. Adding one here would put a second colour on a row that already
 * carries a tinted badge.
 */
export const planListRowBadges = (
  endeavor: Endeavor,
): readonly EndeavorRowBadge[] => [{ kind: 'endeavorKind', value: endeavor.kind }]

/** The label the row's Open control announces, for a title that may be empty. */
export const planListRowOpenLabel = (title: string): string =>
  `Open ${title.length === 0 ? 'Untitled' : title}`
