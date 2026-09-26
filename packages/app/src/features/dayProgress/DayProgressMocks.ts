/**
 * Canned Day Progress states (`RC-31`) and the endeavor fixtures behind them
 * (`RC-13`'s spread: happy, empty, long, non-ASCII, missing-optional, stale,
 * fresh). Stories and tests consume these — never an inline `State`.
 *
 * Fixtures are built relative to a `today` argument so the Page stories and
 * tests (whose mount effect stamps the real clock) can seed the same day.
 */
import {
  type Endeavor,
  EndeavorKind,
  EndeavorStatus,
  PerformResolution,
  makeEndeavor,
  makePerform,
  makePerformFragment,
} from '@kro/core'
import { DayProgressExceptions } from './DayProgressException'
import {
  type DayProgressState,
  initialDayProgressState,
} from './DayProgressFeature'
import {
  DAY_PROGRESS_WINDOW_DAYS,
  addDays,
  startOfDay,
  withinDayProgressWindow,
} from './DayProgressRules'

/** The reference day of the static mocks — a Thursday. */
export const DAY_PROGRESS_MOCK_TODAY = new Date(2026, 8, 24)

const at = (day: Date, hour: number, minute: number): Date =>
  new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute)

/** A realistic day: habits and tasks, timed and untimed, complete and not. */
export const makeDayProgressEndeavors = (today: Date): readonly Endeavor[] => {
  const day = startOfDay(today)
  const yesterday = addDays(day, -1)
  return [
    makeEndeavor({
      id: 'dp-blog',
      title: '✍️ Write weekly blog',
      kind: EndeavorKind.task,
      status: EndeavorStatus.closed,
      due: at(day, 18, 0),
      completed: at(day, 9, 45),
      performances: [
        makePerform({
          date: at(day, 9, 0),
          duration: 2700,
          resolution: PerformResolution.complete,
          sessionFragments: [
            makePerformFragment({
              startedAt: at(day, 9, 0),
              endedAt: at(day, 9, 45),
            }),
          ],
          rewardPoints: 25,
          completedAt: at(day, 9, 45),
          wasCompletedInSession: true,
        }),
      ],
    }),
    makeEndeavor({
      id: 'dp-mortgage',
      title: 'Pay mortgage',
      kind: EndeavorKind.task,
      due: at(day, 17, 0),
    }),
    makeEndeavor({
      id: 'dp-deep-work',
      title: 'Deep work block',
      kind: EndeavorKind.task,
      due: at(day, 20, 0),
      performances: [
        makePerform({
          date: at(yesterday, 14, 0),
          duration: 1200,
          resolution: PerformResolution.aborted,
          sessionFragments: [
            makePerformFragment({
              startedAt: at(yesterday, 14, 0),
              endedAt: at(yesterday, 14, 20),
            }),
          ],
        }),
        makePerform({
          date: at(day, 11, 0),
          duration: 5700,
          resolution: PerformResolution.finished,
          sessionFragments: [
            makePerformFragment({
              startedAt: at(day, 11, 0),
              endedAt: at(day, 12, 35),
            }),
          ],
          rewardPoints: 40,
        }),
      ],
    }),
    makeEndeavor({
      id: 'dp-stretch',
      title: 'Morning stretch',
      kind: EndeavorKind.habit,
      status: EndeavorStatus.closed,
      completed: at(day, 7, 30),
      performances: [
        makePerform({
          date: at(day, 7, 30),
          duration: 0,
          resolution: PerformResolution.complete,
          rewardPoints: 10,
          completedAt: at(day, 7, 30),
        }),
      ],
    }),
    makeEndeavor({ id: 'dp-read', title: 'Read', kind: EndeavorKind.habit }),
    makeEndeavor({
      id: 'dp-groceries',
      title: 'Buy groceries',
      kind: EndeavorKind.task,
      status: EndeavorStatus.closed,
      due: at(yesterday, 19, 0),
      completed: at(yesterday, 16, 0),
      performances: [
        makePerform({
          date: at(yesterday, 16, 0),
          duration: 0,
          resolution: PerformResolution.complete,
          rewardPoints: 5,
          completedAt: at(yesterday, 16, 0),
        }),
      ],
    }),
    // Stale: outside the 45-day window, so it is trimmed on load.
    makeEndeavor({
      id: 'dp-ancient',
      title: 'Old taxes',
      kind: EndeavorKind.task,
      performances: [
        makePerform({
          date: addDays(day, -(DAY_PROGRESS_WINDOW_DAYS + 15)),
          duration: 600,
          resolution: PerformResolution.complete,
          completedAt: addDays(day, -(DAY_PROGRESS_WINDOW_DAYS + 15)),
        }),
      ],
    }),
  ]
}

const endOf = (day: Date): Date => at(day, 23, 59)

const retitled = (
  endeavors: readonly Endeavor[],
  titles: Readonly<Record<string, string>>,
): readonly Endeavor[] =>
  endeavors.map((endeavor) => ({
    ...endeavor,
    title: titles[endeavor.id] ?? endeavor.title,
  }))

const busy = withinDayProgressWindow(
  makeDayProgressEndeavors(DAY_PROGRESS_MOCK_TODAY),
  endOf(DAY_PROGRESS_MOCK_TODAY),
)

const opened = (
  endeavors: readonly Endeavor[],
  overrides: Partial<DayProgressState> = {},
): DayProgressState => ({
  ...initialDayProgressState,
  today: DAY_PROGRESS_MOCK_TODAY,
  selectedDay: DAY_PROGRESS_MOCK_TODAY,
  weekOffset: 0,
  load: { kind: 'loaded', endeavors },
  ...overrides,
})

export const dayProgressStateMocks = {
  idle: initialDayProgressState,
  loading: opened([], { load: { kind: 'loading' } }),
  failed: opened([], {
    load: {
      kind: 'failed',
      exception: DayProgressExceptions.loadFailed('IndexedDB is unavailable'),
    },
  }),
  /** Convenient: a busy day with habits, tasks, timed and untimed work. */
  busyDay: opened(busy),
  /** Neutral: nothing stored at all. */
  emptyDay: opened([]),
  /** Only tasks — the gold ring is absent, not empty. */
  onlyTasks: opened(busy.filter((e) => e.kind === EndeavorKind.task)),
  /** One habit, one task, both complete. */
  habitsAndTasks: opened(
    busy.filter((e) => e.id === 'dp-stretch' || e.id === 'dp-blog'),
  ),
  /** Inconvenient: titles that must truncate. */
  longTitles: opened(
    retitled(busy, {
      'dp-blog':
        'Write the extremely long quarterly retrospective blog post for the whole team and every stakeholder',
      'dp-deep-work':
        'Deep work block on the migration of the legacy synchronisation engine to the new cloud',
    }),
  ),
  /** Inconvenient: non-ASCII titles and emoji symbols. */
  nonAscii: opened(
    retitled(busy, {
      'dp-blog': '📝 週報を書く',
      'dp-deep-work': 'Concentración profunda — ñandú',
      'dp-stretch': '🧘 Estiramiento matutino',
    }),
  ),
  /** Yesterday selected. */
  yesterday: opened(busy, {
    selectedDay: addDays(DAY_PROGRESS_MOCK_TODAY, -1),
  }),
  /** Inconvenient: an earlier week, a day with no activity selected. */
  earlierWeek: opened(busy, {
    weekOffset: -1,
    selectedDay: addDays(DAY_PROGRESS_MOCK_TODAY, -7),
  }),
} satisfies Record<string, DayProgressState>
