/**
 * Canon's `EndeavorActivityView` row mapping (`RowMapping`) and the pure,
 * framework-free vocabulary the screen is built from: tabs, outcomes,
 * applicability and the date/duration copy.
 *
 * Nothing here reads a clock or the environment — the locale is an argument.
 */
import {
  type Endeavor,
  EndeavorKind,
  type Perform,
  PerformResolution,
  assertNever,
  performFragmentDuration,
} from '@kro/core'

/**
 * The resolution tabs. Canon also carries **Skipped** and **Missed**; the web
 * cannot record either resolution yet (`PerformResolution` has only complete,
 * aborted and finished), so a tab for them could only ever be empty. They join
 * this list when the domain gains the cases.
 */
export type ActivityTab = 'all' | 'complete' | 'finished' | 'aborted'

export const activityTabs: readonly ActivityTab[] = [
  'all',
  'complete',
  'finished',
  'aborted',
]

export const activityTabLabel = (tab: ActivityTab): string => {
  switch (tab) {
    case 'all':
      return 'All'
    case 'complete':
      return 'Complete'
    case 'finished':
      return 'Finished'
    case 'aborted':
      return 'Aborted'
    default:
      return assertNever(tab)
  }
}

/** One recorded activity, in domain terms. */
export interface ActivityRow {
  readonly id: string
  readonly startedAt: Date
  /** Seconds. `0` means no timer ran. */
  readonly duration: number
  readonly completedAt: Date
  readonly resolution: PerformResolution
  readonly rewardPoints: number
}

/** The endeavor the screen is about — only what the screen reads. */
export interface ActivityEndeavor {
  readonly id: string
  readonly title: string
  readonly kind: EndeavorKind
}

/** Whether an endeavor's kind records session history at all. */
export type ActivityApplicability = 'supported' | 'notApplicable' | 'behavior'

export const activityApplicability = (
  kind: EndeavorKind,
): ActivityApplicability => {
  switch (kind) {
    case EndeavorKind.task:
    case EndeavorKind.habit:
      return 'supported'
    case EndeavorKind.behavior:
      return 'behavior'
    case EndeavorKind.background:
    case EndeavorKind.blueprint:
    case EndeavorKind.calendarEvent:
    case EndeavorKind.reminder:
      return 'notApplicable'
    default:
      return assertNever(kind)
  }
}

const rowFromPerform = (perform: Perform, index: number): ActivityRow => {
  const fragments = perform.sessionFragments
  const first = fragments[0]
  const last = fragments[fragments.length - 1]
  const startedAt = first ? first.startedAt : perform.date
  const duration =
    fragments.length > 0
      ? fragments.reduce(
          (sum, fragment) => sum + (performFragmentDuration(fragment) ?? 0),
          0,
        )
      : perform.duration
  const completedAt =
    last?.endedAt ??
    perform.completedAt ??
    new Date(perform.date.getTime() + perform.duration * 1000)
  return {
    id: `${perform.date.getTime()}-${index}`,
    startedAt,
    duration,
    completedAt,
    resolution: perform.resolution,
    rewardPoints: perform.rewardPoints,
  }
}

/** Canon's `RowMapping`: rows for tasks and habits only, newest first. */
export const activityRowsFor = (endeavor: Endeavor): readonly ActivityRow[] => {
  if (activityApplicability(endeavor.kind) !== 'supported') return []
  return endeavor.performances
    .map(rowFromPerform)
    .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
}

export const rowsForTab = (
  rows: readonly ActivityRow[],
  tab: ActivityTab,
): readonly ActivityRow[] =>
  tab === 'all' ? rows : rows.filter((row) => row.resolution === tab)

export const outcomeLabel = (resolution: PerformResolution): string => {
  switch (resolution) {
    case PerformResolution.complete:
      return 'Complete'
    case PerformResolution.aborted:
      return 'Aborted'
    case PerformResolution.finished:
      return 'Session finished'
    default:
      return assertNever(resolution)
  }
}

/** `No timer` · `45s` · `25m` · `1h 5m`. */
export const formatActivityDuration = (seconds: number): string => {
  if (seconds <= 0) return 'No timer'
  if (seconds < 60) return `${Math.round(seconds)}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

/** `Jan 15 · 9:00–9:25`, or `Jan 15 · 9:00` when no time elapsed. */
export const formatActivityDate = (
  row: ActivityRow,
  locale = 'en-US',
): string => {
  const day = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
  }).format(row.startedAt)
  const time = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
  })
  const clock = (date: Date) =>
    time
      .formatToParts(date)
      .filter((part) => part.type !== 'dayPeriod')
      .map((part) => part.value)
      .join('')
      .trim()
  const start = clock(row.startedAt)
  if (row.duration <= 0) return `${day} · ${start}`
  const end = new Date(row.startedAt.getTime() + row.duration * 1000)
  return `${day} · ${start}–${clock(end)}`
}

export const recordCountLabel = (count: number): string =>
  count === 1 ? '1 record' : `${count} records`
