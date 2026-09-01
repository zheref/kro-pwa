/**
 * The Capture & Inbox surfaces' pure presentation rules.
 *
 * Everything here is a function of its arguments — no clock, no store, no DOM.
 * The clock arrives as `now` exactly as it does one tier down in
 * `CaptureRules`, which is what makes "Today" vs "Tomorrow" and the undo
 * toast's copy plain unit tests rather than snapshots of the day the suite ran.
 *
 * ## Why the presentation split is asked of the ported table, not re-derived
 *
 * `MainPresentation.presentationFor` already answers "sheet or popover" from
 * `DoSurfaceLayout.presentsNotificationsInline` — canon's own "is there room
 * beside the content the user is already reading" cell — and it already carries
 * the Inbox's canon frame (560 x 620). The Inbox therefore asks it directly.
 *
 * The **prompt** has no row in that table: canon presents it with
 * `bottomAnchoredSheet` on the phone and a plain `.sheet` on the Mac, so there
 * is no canon popover frame to port. KC-IS-#24 fixes the web idiom as
 * "bottom sheet with a custom detent / desktop glass popover", so the prompt's
 * kind is derived from the **same cell** (`presentsNotificationsInline`) rather
 * than from a second rule that could drift, and its desktop width is named once
 * here — see `CAPTURE_PROMPT_POPOVER_WIDTH`.
 */
import { type Month, type WeekDay, monthFromDate, weekDays } from '@kro/core'
import { displayTitle } from '../../../design/endeavor/endeavorCardModel'
import type { DoSurfaceLayout } from '../../main/DoSurfaceLayout'
import {
  type CaptureRecurrence,
  NO_RECURRENCE,
  captureRecurrenceLabel,
} from '../CaptureRules'

// ---------------------------------------------------------------------------
// Presentation
// ---------------------------------------------------------------------------

/** How one of this feature's overlay surfaces is presented. */
export type CapturePresentationKind = 'sheet' | 'popover'

/**
 * The prompt's presentation.
 *
 * The same cell `presentationFor` reads, so the prompt and the Inbox can never
 * disagree about whether this surface has room beside the content.
 */
export const capturePromptPresentation = (
  layout: DoSurfaceLayout,
): CapturePresentationKind =>
  layout.presentsNotificationsInline ? 'popover' : 'sheet'

/**
 * The prompt panel's desktop width, in CSS pixels.
 *
 * **Not a canon frame** — canon's macOS prompt is an unsized `.sheet`, so there
 * is nothing to port. 420 sits between the two neighbouring canon popovers the
 * design system already fixed (Do notifications 380, Visibility 460): the form
 * is one column of chips over a single-line title field, so it wants less than
 * the Visibility filter list and more than the notification stack. Named here
 * rather than inlined so a re-tune is one edit.
 */
export const CAPTURE_PROMPT_POPOVER_WIDTH = 420

/**
 * Which `EndeavorRow` preset the Inbox draws with — canon's `InboxView.Layout`.
 *
 * Canon picks `.compactDesktop` for the Mac popover and `.comfortable` for the
 * phone sheet. The web reads the same distinction off the ported table's
 * `isTouchPrimary`, because canon's own note on the compact preset is that it
 * exists "for pointer-first use" — which is precisely that cell, not the
 * window's width. A tablet in landscape therefore keeps the comfortable row and
 * its 44px targets, which is the whole reason the table kept the `tablet`
 * idiom.
 */
export type InboxRowLayout = 'comfortable' | 'compactDesktop'

export const inboxRowLayoutFor = (layout: DoSurfaceLayout): InboxRowLayout =>
  layout.isTouchPrimary ? 'comfortable' : 'compactDesktop'

/** The `EndeavorRow` config name each Inbox layout draws with. */
export const inboxRowConfigFor = (
  rowLayout: InboxRowLayout,
): 'inbox' | 'compactDesktopInbox' =>
  rowLayout === 'compactDesktop' ? 'compactDesktopInbox' : 'inbox'

// ---------------------------------------------------------------------------
// Native input <-> Date
// ---------------------------------------------------------------------------

const pad = (value: number): string => String(value).padStart(2, '0')

/**
 * A `Date` as the `YYYY-MM-DD` string `<input type="date">` expects, in the
 * runtime's own zone.
 *
 * Never `toISOString().slice(0, 10)`: that converts to UTC first, so a user in
 * UTC+2 capturing at 00:30 would see yesterday. Same reasoning — and the same
 * bug class — as the design kit's `localInputValue`.
 */
export const dateInputValue = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

/** A `Date` as the `HH:mm` string `<input type="time">` expects. */
export const timeInputValue = (date: Date): string =>
  `${pad(date.getHours())}:${pad(date.getMinutes())}`

const DATE_INPUT = /^\d{4}-\d{2}-\d{2}$/
const TIME_INPUT = /^\d{2}:\d{2}(:\d{2})?$/

/**
 * The inverse of `dateInputValue`, at local midnight. `null` for the empty or
 * half-typed value the input allows while the user is still typing.
 *
 * The shape check is load-bearing: `new Date('2026-04-')` resolves to a real
 * instant in V8, so a `Number.isNaN` guard alone would let a half-typed value
 * through as a confident, wrong day.
 */
export const parseDateInput = (value: string): Date | null => {
  if (!DATE_INPUT.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  if (year === undefined || month === undefined || day === undefined)
    return null
  const parsed = new Date(year, month - 1, day, 0, 0, 0, 0)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/**
 * The inverse of `timeInputValue`, projected onto `day`'s calendar date so the
 * draft's committed instant stays on the day the user picked.
 */
export const parseTimeInput = (value: string, day: Date): Date | null => {
  if (!TIME_INPUT.test(value)) return null
  const [hours, minutes] = value.split(':').map(Number)
  if (hours === undefined || minutes === undefined) return null
  if (hours > 23 || minutes > 59) return null
  const parsed = new Date(day)
  parsed.setHours(hours, minutes, 0, 0)
  return parsed
}

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

const isSameDay = (left: Date, right: Date): boolean =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate()

/**
 * Canon's `formattedDate`: "Today", "Tomorrow", else a medium date.
 *
 * `now` is a parameter for the same reason it is one everywhere else in this
 * feature — a chip that reads "Today" only when the suite happens to run on the
 * fixture's day is not a test.
 */
export const formatCaptureDate = (
  date: Date,
  now: Date,
  locale?: string,
): string => {
  if (isSameDay(date, now)) return 'Today'
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (isSameDay(date, tomorrow)) return 'Tomorrow'
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/** Canon's `formattedTime` / `toastTimeFormatter` — a short local time. */
export const formatCaptureTime = (date: Date, locale?: string): string =>
  date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })

/**
 * The scheduling toast's message — canon's
 * `"\(title)" scheduled for \(toastTimeFormatter.string(from: scheduledAt))`,
 * quotes included.
 *
 * The title goes through `displayTitle` because canon reads
 * `state.endeavors[index].displayTitle`, which strips a leading emoji: the
 * toast already carries its own glyph, so a second one reads as a typo.
 */
export const schedulingToastMessage = (
  title: string,
  scheduledAt: Date,
  locale?: string,
): string =>
  `"${displayTitle(title)}" scheduled for ${formatCaptureTime(scheduledAt, locale)}`

/**
 * The Inbox header's subtitle — canon's `"\(totalCount) endeavors"`, with the
 * singular fixed.
 *
 * **A deliberate divergence.** Canon's format string has no plural rule, so an
 * Inbox holding one row reads *"1 endeavors"* on iOS. That is an English bug in
 * canon's copy rather than a product decision — the string is user-facing and,
 * here, also the dialog's accessible description, so it is not reproduced.
 * Upstream candidate for KroApple; noted in the delivery PR.
 */
export const inboxCountCaption = (totalCount: number): string | undefined => {
  if (totalCount <= 0) return undefined
  return totalCount === 1 ? '1 endeavor' : `${totalCount} endeavors`
}

// ---------------------------------------------------------------------------
// Recurrence presets
// ---------------------------------------------------------------------------

/**
 * `WeekDay` for a `Date`.
 *
 * `getDay()` is Sunday-indexed (0) and `weekDays` is canon's Monday-first
 * `allCases`, so the shift is `(day + 6) % 7`. Lives here rather than in
 * `@kro/core` because it is the only caller; folding it into `WeekDay.ts`
 * beside `monthFromDate` is a one-line follow-up in that lane.
 */
export const weekDayFromDate = (date: Date): WeekDay => {
  const index = (date.getDay() + 6) % 7
  // `weekDays` has exactly seven entries and `index` is 0…6, so the fallback is
  // unreachable — it exists because `noUncheckedIndexedAccess` is on.
  return weekDays[index] ?? 'monday'
}

/** One row of the repeat chip's inline picker. */
export interface CaptureRecurrencePreset {
  readonly id: string
  readonly label: string
  readonly recurrence: CaptureRecurrence
}

/**
 * The repeat presets offered for a draft dated `date`.
 *
 * Canon's repeat chip pushes a second page (`EndeavorCalendarPrompt`) with a
 * full weekday/month editor; that surface is its own canon screen and is out of
 * this issue's scope (KC-IS-#24 names the row's chips, not the calendar page).
 * What ships instead is the five shapes `EndeavorRecurrence` declares, each
 * anchored to the day the draft is already on — "weekly" means the drafted
 * weekday, "monthly" the drafted day-of-month, "yearly" that month and day.
 * That is what every calendar app defaults to, and it exercises the whole
 * `CaptureRecurrence -> RepeatConfig` map rather than a subset of it.
 */
export const captureRecurrencePresets = (
  date: Date,
): readonly CaptureRecurrencePreset[] => {
  const month: Month = monthFromDate(date)
  const day = date.getDate()
  const presets: readonly CaptureRecurrence[] = [
    NO_RECURRENCE,
    { kind: 'daily', interval: 1 },
    { kind: 'weekly', interval: 1, weekdays: [weekDayFromDate(date)] },
    { kind: 'monthly', interval: 1, day },
    { kind: 'yearly', interval: 1, month, day },
  ]
  return presets.map((recurrence) => ({
    id: recurrence.kind,
    label: captureRecurrenceLabel(recurrence),
    recurrence,
  }))
}

/** The repeat chip's own label — canon's `"No Repeat"` when nothing repeats. */
export const captureRepeatChipLabel = (
  recurrence: CaptureRecurrence,
): string =>
  recurrence.kind === 'never' ? 'No Repeat' : captureRecurrenceLabel(recurrence)
