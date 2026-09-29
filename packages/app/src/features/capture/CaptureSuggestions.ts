/**
 * Suggested endeavors — canon `SuggestedEndeavor` and its `allSamples`
 * (`Kro/Components/EndeavorInputPrompt.swift`, "Suggested Endeavors"), ported
 * as pure data plus the pure rules the prompt's suggestions pane runs on.
 *
 * Two deliberate differences from canon:
 *
 * - **Stable ids, fixed order.** Canon mints a `UUID()` per sample and shows
 *   `allSamples.shuffled()`. Here each suggestion carries a stable id derived
 *   from its kind and title, and the pane shows canon's declaration order: a
 *   rule reads no randomness (`UZF-10`), and a stable order is what makes the
 *   pane testable and keyboard-predictable.
 * - **`applyCaptureSuggestion` also picks the emoji.** Canon's
 *   `applySuggestion` sets the title and lets the symbol be inferred; the card
 *   the user picked shows an emoji, so the web carries it into the badge (it
 *   is folded into the saved title the same way a picked emoji is).
 */
import {
  type CaptureDestination,
  type CaptureDraft,
  CaptureKind,
  type CaptureResult,
  NO_RECURRENCE,
  EVERY_DAY_RECURRENCE,
  applyCaptureKindDefaults,
  captureKindEarnsRewards,
  captureKindDefaultRewards,
  captureTitleForPersistence,
  captureKindRequiresRecurrence,
} from './CaptureRules'

/** `SuggestedEndeavor`. */
export interface CaptureSuggestion {
  readonly id: string
  readonly kind: CaptureKind
  readonly emoji: string
  readonly title: string
  /** `0` for the kinds that earn nothing. */
  readonly rewards: number
  /** Events: minutes after now the suggested start sits. */
  readonly startMinutesFromNow: number | null
  /** Events: the suggested length in minutes. */
  readonly durationMinutes: number | null
}

const suggestion = (
  id: string,
  kind: CaptureKind,
  emoji: string,
  title: string,
  rewards: number,
  startMinutesFromNow: number | null,
  durationMinutes: number | null,
): CaptureSuggestion => ({
  id,
  kind,
  emoji,
  title,
  rewards,
  startMinutesFromNow,
  durationMinutes,
})

/** `SuggestedEndeavor.allSamples`, in canon's order, with stable ids. */
export const CAPTURE_SUGGESTIONS: readonly CaptureSuggestion[] = [
  suggestion(
    'task-prepare-presentation-slides',
    CaptureKind.task,
    '📊',
    'Prepare presentation slides',
    30,
    null,
    null,
  ),
  suggestion(
    'task-review-pull-request-changes',
    CaptureKind.task,
    '💻',
    'Review pull request changes',
    20,
    null,
    null,
  ),
  suggestion(
    'task-buy-groceries',
    CaptureKind.task,
    '🛒',
    'Buy groceries',
    10,
    null,
    null,
  ),
  suggestion(
    'task-reply-to-pending-emails',
    CaptureKind.task,
    '✉️',
    'Reply to pending emails',
    15,
    null,
    null,
  ),
  suggestion(
    'task-file-expense-report',
    CaptureKind.task,
    '🧾',
    'File expense report',
    20,
    null,
    null,
  ),
  suggestion(
    'task-read-a-chapter-of-a-book',
    CaptureKind.task,
    '📚',
    'Read a chapter of a book',
    15,
    null,
    null,
  ),
  suggestion(
    'task-go-to-the-gym',
    CaptureKind.task,
    '🏋️',
    'Go to the gym',
    25,
    null,
    null,
  ),
  suggestion(
    'task-clean-and-tidy-the-apartment',
    CaptureKind.task,
    '🧹',
    'Clean and tidy the apartment',
    15,
    null,
    null,
  ),
  suggestion(
    'task-pay-monthly-bills',
    CaptureKind.task,
    '💰',
    'Pay monthly bills',
    10,
    null,
    null,
  ),
  suggestion(
    'task-call-a-friend-or-family-member',
    CaptureKind.task,
    '📞',
    'Call a friend or family member',
    10,
    null,
    null,
  ),
  suggestion(
    'task-write-in-the-journal',
    CaptureKind.task,
    '✍️',
    'Write in the journal',
    15,
    null,
    null,
  ),
  suggestion(
    'task-update-personal-website-or-portfolio',
    CaptureKind.task,
    '🌐',
    'Update personal website or portfolio',
    25,
    null,
    null,
  ),
  suggestion(
    'event-team-sync-meeting',
    CaptureKind.event,
    '🤝',
    'Team sync meeting',
    0,
    30,
    30,
  ),
  suggestion(
    'event-birthday-celebration-dinner',
    CaptureKind.event,
    '🎂',
    'Birthday celebration dinner',
    0,
    480,
    120,
  ),
  suggestion(
    'event-morning-run-with-friends',
    CaptureKind.event,
    '🏃',
    'Morning run with friends',
    0,
    60,
    45,
  ),
  suggestion(
    'event-movie-night',
    CaptureKind.event,
    '🎬',
    'Movie night',
    0,
    360,
    150,
  ),
  suggestion(
    'event-coffee-with-a-colleague',
    CaptureKind.event,
    '☕',
    'Coffee with a colleague',
    0,
    60,
    30,
  ),
  suggestion(
    'event-one-on-one-with-manager',
    CaptureKind.event,
    '📝',
    'One-on-one with manager',
    0,
    90,
    30,
  ),
  suggestion(
    'event-online-course-live-session',
    CaptureKind.event,
    '🎓',
    'Online course live session',
    0,
    120,
    60,
  ),
  suggestion(
    'event-team-lunch',
    CaptureKind.event,
    '🍕',
    'Team lunch',
    0,
    180,
    60,
  ),
  suggestion(
    'event-doctor-appointment',
    CaptureKind.event,
    '🏥',
    'Doctor appointment',
    0,
    240,
    45,
  ),
  suggestion(
    'event-band-practice-session',
    CaptureKind.event,
    '🎸',
    'Band practice session',
    0,
    300,
    90,
  ),
  suggestion(
    'event-flight-to-conference',
    CaptureKind.event,
    '✈️',
    'Flight to conference',
    0,
    600,
    180,
  ),
  suggestion(
    'reminder-take-morning-medication',
    CaptureKind.reminder,
    '💊',
    'Take morning medication',
    0,
    null,
    null,
  ),
  suggestion(
    'reminder-drink-water-stay-hydrated',
    CaptureKind.reminder,
    '💧',
    'Drink water — stay hydrated',
    0,
    null,
    null,
  ),
  suggestion(
    'reminder-charge-devices-overnight',
    CaptureKind.reminder,
    '🔋',
    'Charge devices overnight',
    0,
    null,
    null,
  ),
  suggestion(
    'reminder-take-out-the-trash',
    CaptureKind.reminder,
    '🗑️',
    'Take out the trash',
    0,
    null,
    null,
  ),
  suggestion(
    'reminder-ship-the-package',
    CaptureKind.reminder,
    '📦',
    'Ship the package',
    0,
    null,
    null,
  ),
  suggestion(
    'reminder-water-the-plants',
    CaptureKind.reminder,
    '🌱',
    'Water the plants',
    0,
    null,
    null,
  ),
  suggestion(
    'reminder-renew-passport-before-expiry',
    CaptureKind.reminder,
    '🛂',
    'Renew passport before expiry',
    0,
    null,
    null,
  ),
  suggestion(
    'reminder-check-bank-statement',
    CaptureKind.reminder,
    '🏦',
    'Check bank statement',
    0,
    null,
    null,
  ),
  suggestion(
    'reminder-submit-weekly-report',
    CaptureKind.reminder,
    '📋',
    'Submit weekly report',
    0,
    null,
    null,
  ),
  suggestion(
    'reminder-reorder-skincare-products',
    CaptureKind.reminder,
    '🧴',
    'Reorder skincare products',
    0,
    null,
    null,
  ),
  suggestion(
    'habit-meditate-for-10-minutes',
    CaptureKind.habit,
    '🧘',
    'Meditate for 10 minutes',
    20,
    null,
    null,
  ),
  suggestion(
    'habit-read-for-30-minutes-daily',
    CaptureKind.habit,
    '📖',
    'Read for 30 minutes daily',
    15,
    null,
    null,
  ),
  suggestion(
    'habit-walk-10-000-steps',
    CaptureKind.habit,
    '🏃',
    'Walk 10,000 steps',
    25,
    null,
    null,
  ),
  suggestion(
    'habit-morning-workout-routine',
    CaptureKind.habit,
    '💪',
    'Morning workout routine',
    30,
    null,
    null,
  ),
  suggestion(
    'habit-drink-8-glasses-of-water',
    CaptureKind.habit,
    '🥤',
    'Drink 8 glasses of water',
    10,
    null,
    null,
  ),
  suggestion(
    'habit-wake-up-before-7-am',
    CaptureKind.habit,
    '🌅',
    'Wake up before 7 AM',
    20,
    null,
    null,
  ),
  suggestion(
    'habit-journal-every-night',
    CaptureKind.habit,
    '✍️',
    'Journal every night',
    15,
    null,
    null,
  ),
  suggestion(
    'habit-practice-an-instrument-for-20-min',
    CaptureKind.habit,
    '🎸',
    'Practice an instrument for 20 min',
    20,
    null,
    null,
  ),
  suggestion(
    'habit-eat-a-healthy-meal',
    CaptureKind.habit,
    '🥗',
    'Eat a healthy meal',
    15,
    null,
    null,
  ),
  suggestion(
    'habit-no-phone-for-first-hour-of-day',
    CaptureKind.habit,
    '📵',
    'No phone for first hour of day',
    25,
    null,
    null,
  ),
  suggestion(
    'habit-take-vitamins-every-morning',
    CaptureKind.habit,
    '🌿',
    'Take vitamins every morning',
    10,
    null,
    null,
  ),
]

/** The suggestion with `id`, or `null`. */
export const captureSuggestionById = (
  id: string,
  suggestions: readonly CaptureSuggestion[] = CAPTURE_SUGGESTIONS,
): CaptureSuggestion | null =>
  suggestions.find((candidate) => candidate.id === id) ?? null

/** Canon's fallback event length when a seed pins none. */
export const DEFAULT_SUGGESTION_EVENT_MINUTES = 60

const MINUTE_MS = 60_000

/**
 * An event suggestion's start and end, canon's way: the seed's offset from
 * `now` (else the next quarter hour), seconds dropped, and the seed's length
 * (else an hour). `null` for every other kind.
 */
export const captureSuggestionEventWindow = (
  suggested: CaptureSuggestion,
  now: Date,
): { readonly start: Date; readonly end: Date } | null => {
  if (suggested.kind !== CaptureKind.event) return null
  const minute = now.getMinutes()
  const offset =
    suggested.startMinutesFromNow ?? (Math.floor(minute / 15) + 1) * 15 - minute
  const start = new Date(now.getTime() + offset * MINUTE_MS)
  start.setSeconds(0, 0)
  const end = new Date(
    start.getTime() +
      (suggested.durationMinutes ?? DEFAULT_SUGGESTION_EVENT_MINUTES) *
        MINUTE_MS,
  )
  return { start, end }
}

/**
 * `EndeavorPromptDraft.applySuggestion` — the draft replaced by a suggestion:
 * its title (and emoji), its kind's defaults, its rewards as the user's own
 * (so a later kind switch keeps them), and for an event a concrete start and
 * end so Add is not left blocked on times.
 */
export const applyCaptureSuggestion = (
  draft: CaptureDraft,
  suggested: CaptureSuggestion,
  now: Date,
): CaptureDraft => {
  const seeded = applyCaptureKindDefaults(
    { ...draft, title: suggested.title, pickedEmoji: suggested.emoji },
    suggested.kind,
  )
  const withRewards: CaptureDraft =
    suggested.rewards > 0
      ? { ...seeded, rewards: suggested.rewards, hasCustomRewards: true }
      : seeded
  const window = captureSuggestionEventWindow(suggested, now)
  if (window === null) return withRewards
  const date = new Date(window.start)
  date.setHours(0, 0, 0, 0)
  return {
    ...withRewards,
    date,
    hasDate: true,
    time: window.start,
    hasTime: true,
    endTime: window.end,
    hasEndTime: true,
  }
}

/**
 * Whether a suggestion can go straight to the Inbox. Events cannot: the Inbox
 * is for unscheduled non-event endeavors, and an event has no shape without a
 * start. Pick an event suggestion into the prompt instead.
 */
export const isCaptureSuggestionInboxable = (
  suggested: CaptureSuggestion,
): boolean => suggested.kind !== CaptureKind.event

/**
 * The result a multi-add writes for one suggestion: unscheduled (no date, no
 * time — Pending Triage), its rewards when the kind earns them, a habit's
 * every-day rule, and no value or duration: the Inbox is where those are
 * decided, exactly as canon's own Inbox path allows (only the prompt's Add
 * gate demands a value). `null` for an event.
 */
export const captureResultFromSuggestion = (
  suggested: CaptureSuggestion,
  destination: CaptureDestination,
): CaptureResult | null => {
  if (!isCaptureSuggestionInboxable(suggested)) return null
  return {
    title: captureTitleForPersistence(suggested.title, suggested.emoji),
    kind: suggested.kind,
    date: null,
    time: null,
    endTime: null,
    destination,
    recurrence: captureKindRequiresRecurrence(suggested.kind)
      ? EVERY_DAY_RECURRENCE
      : NO_RECURRENCE,
    rewards: captureKindEarnsRewards(suggested.kind)
      ? suggested.rewards > 0
        ? suggested.rewards
        : captureKindDefaultRewards(suggested.kind)
      : null,
    value: null,
    duration: null,
  }
}
