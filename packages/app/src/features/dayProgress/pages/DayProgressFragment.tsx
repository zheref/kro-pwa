'use client'

/**
 * The Day Progress screen body — the port of canon's
 * `KroUI/DayProgress/DayProgressView.swift` (`docs/Features/DayProgress.md`).
 *
 * A pure Fragment (`RC-15`): no store, no dispatch — every value and every
 * intent is a prop. The title and the close control belong to the pane that
 * hosts it; this renders the subtitle, the weekday lane, the hero rings and
 * the activity list.
 *
 * SF Symbol -> lucide for this surface: `bolt.fill` -> `Zap`,
 * `rosette` -> `Award`, `checkmark.circle.fill` -> `CircleCheckBig`,
 * `xmark.circle.fill` -> `CircleX`, `flag.checkered` -> `Flag`,
 * `chevron.left/right` -> `ChevronLeft/Right`, the empty state's
 * `waveform.path.ecg` -> `Activity`. Imported directly, as
 * `SessionSheetFragment` does, because adding rows to the kit's table is the
 * design system's lane.
 */
import {
  Activity,
  Award,
  ChevronLeft,
  ChevronRight,
  CircleCheckBig,
  CircleX,
  Flag,
  type LucideIcon,
  Zap,
} from 'lucide-react'
import { type ActivityRing, ActivityRings } from '../../../design/chrome'
import { computedSymbol, displayTitle } from '../../../design/endeavor'
import { type ColorRole, colorVar } from '../../../design/system/tokens/roles'
import type { DoRing } from '../../../library/rings/DoRings'
import {
  type DayProgressException,
  dayProgressExceptionCopy,
} from '../DayProgressException'
import type { DayProgressActivity } from '../DayProgressRules'
import type {
  DayProgressRings,
  DayProgressWeekCell,
  DayRelation,
} from '../DayProgressSelectors'
import {
  DEFAULT_DAY_PROGRESS_LOCALE,
  dayProgressSubtitle,
  durationPill,
  outcomeLabel,
  timeRange,
  weekdayAccessibleName,
  weekdayLetter,
} from './dayProgressFormat'

export interface DayProgressFragmentProps {
  readonly locale?: string
  readonly selectedDay: Date | null
  readonly relation: DayRelation
  readonly weekCells: readonly DayProgressWeekCell[]
  readonly canPageToPreviousWeek: boolean
  readonly canPageToNextWeek: boolean
  readonly rings: DayProgressRings
  readonly activity: readonly DayProgressActivity[]
  readonly isLoading: boolean
  readonly exception: DayProgressException | null
  readonly onSelectDay: (day: Date) => void
  readonly onPreviousWeek: () => void
  readonly onNextWeek: () => void
}

const foreMix = (percent: number): string =>
  `color-mix(in srgb, ${colorVar('fore')} ${percent}%, transparent)`

const CARD_BACKGROUND = foreMix(6)

/** Canon draws the tasks ring even on an empty day; an absent ring is 0. */
const heroRings = (rings: DayProgressRings): ActivityRing[] => {
  const result: ActivityRing[] = []
  if (rings.habits !== null) {
    result.push({
      id: 'habits',
      progress: rings.habits.progress,
      role: 'ringGold',
      accessibilityLabel: `Habits, ${rings.habits.completed} of ${rings.habits.expected} complete`,
    })
  }
  result.push({
    id: 'tasks',
    progress: rings.tasks?.progress ?? 0,
    role: 'ringEmerald',
    accessibilityLabel: rings.tasks
      ? `Tasks, ${rings.tasks.completed} of ${rings.tasks.expected} complete`
      : 'Tasks, nothing planned',
  })
  return result
}

/** A lane cell's small rings: only the rings the day actually has. */
const cellRings = (rings: DayProgressRings): ActivityRing[] => {
  const result: ActivityRing[] = []
  if (rings.habits !== null) {
    result.push({
      id: 'habits',
      progress: rings.habits.progress,
      role: 'ringGold',
      accessibilityLabel: `Habits ${rings.habits.completed} of ${rings.habits.expected}`,
    })
  }
  result.push({
    id: 'tasks',
    progress: rings.tasks?.progress ?? 0,
    role: 'ringEmerald',
    accessibilityLabel: rings.tasks
      ? `Tasks ${rings.tasks.completed} of ${rings.tasks.expected}`
      : 'No tasks',
  })
  return result
}

function WeekLane({
  cells,
  locale,
  canPageToPreviousWeek,
  canPageToNextWeek,
  onSelectDay,
  onPreviousWeek,
  onNextWeek,
}: {
  readonly cells: readonly DayProgressWeekCell[]
  readonly locale: string
  readonly canPageToPreviousWeek: boolean
  readonly canPageToNextWeek: boolean
  readonly onSelectDay: (day: Date) => void
  readonly onPreviousWeek: () => void
  readonly onNextWeek: () => void
}) {
  const pager =
    'flex size-7 shrink-0 items-center justify-center rounded-full outline-none focus-visible:shadow-[var(--kro-ring)] disabled:opacity-[var(--kro-opacity-disabled)]'
  return (
    <div className="flex items-center gap-1" data-kro-day-progress="week-lane">
      <button
        type="button"
        aria-label="Previous week"
        className={pager}
        style={{ color: foreMix(70) }}
        disabled={!canPageToPreviousWeek}
        onClick={onPreviousWeek}
      >
        <ChevronLeft size={16} aria-hidden />
      </button>
      <ol className="grid flex-1 grid-cols-7 gap-0.5">
        {cells.map((cell) => {
          const tone: ColorRole = cell.isToday ? 'kroRed' : 'fore'
          return (
            <li key={cell.day.getTime()}>
              <button
                type="button"
                aria-label={weekdayAccessibleName(cell.day, locale)}
                aria-pressed={cell.isSelected}
                aria-current={cell.isToday ? 'date' : undefined}
                onClick={() => onSelectDay(cell.day)}
                className="flex w-full flex-col items-center gap-0.5 rounded-full py-1 outline-none focus-visible:shadow-[var(--kro-ring)]"
                style={{
                  background: cell.isSelected
                    ? `color-mix(in srgb, ${colorVar('accent')} 22%, transparent)`
                    : 'transparent',
                }}
              >
                <span
                  className="font-semibold text-[10px]"
                  style={{
                    color: cell.isToday ? colorVar(tone) : foreMix(55),
                  }}
                >
                  {weekdayLetter(cell.day, locale)}
                </span>
                <ActivityRings
                  rings={cellRings(cell.rings)}
                  diameter={30}
                  lineWidth={4}
                  spacing={1.5}
                />
                <span
                  className="font-semibold text-[11px] tabular-nums"
                  style={{ color: colorVar(tone) }}
                >
                  {cell.day.getDate()}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
      <button
        type="button"
        aria-label="Next week"
        className={pager}
        style={{ color: foreMix(70) }}
        disabled={!canPageToNextWeek}
        onClick={onNextWeek}
      >
        <ChevronRight size={16} aria-hidden />
      </button>
    </div>
  )
}

function Tally({
  title,
  ring,
  tone,
}: {
  readonly title: string
  readonly ring: DoRing
  readonly tone: ColorRole
}) {
  return (
    <div className="flex flex-col" data-kro-day-progress-tally={title}>
      <span className="text-xs" style={{ color: foreMix(70) }}>
        {title}
      </span>
      <span
        className="font-bold text-lg tabular-nums leading-tight"
        style={{ color: colorVar(tone) }}
      >
        {ring.completed}/{ring.expected}
      </span>
      <span
        className="font-semibold text-[10px] tracking-wide"
        style={{ color: foreMix(50) }}
      >
        DONE
      </span>
    </div>
  )
}

function Hero({
  rings,
  isLoading,
}: {
  readonly rings: DayProgressRings
  readonly isLoading: boolean
}) {
  return (
    <section
      className="flex items-center gap-4 rounded-kro-card px-3 py-3"
      style={{ background: CARD_BACKGROUND }}
      aria-label="Day rings"
    >
      <ActivityRings rings={heroRings(rings)} diameter={84} lineWidth={10} />
      {isLoading ? (
        <p className="text-sm" style={{ color: foreMix(60) }}>
          Loading your day…
        </p>
      ) : (
        <div className="flex flex-1 flex-wrap items-center gap-4">
          {rings.habits !== null ? (
            <Tally title="Habits" ring={rings.habits} tone="ringGold" />
          ) : null}
          {rings.tasks !== null ? (
            <Tally title="Tasks" ring={rings.tasks} tone="ringEmerald" />
          ) : (
            <p className="text-sm" style={{ color: foreMix(60) }}>
              Nothing planned for this day.
            </p>
          )}
        </div>
      )}
    </section>
  )
}

const OUTCOME_GLYPH: Record<DayProgressActivity['resolution'], LucideIcon> = {
  complete: CircleCheckBig,
  aborted: CircleX,
  finished: Flag,
}

const OUTCOME_ROLE: Record<DayProgressActivity['resolution'], ColorRole> = {
  complete: 'ringEmerald',
  aborted: 'kroRed',
  finished: 'accent',
}

function ActivityCard({
  row,
  locale,
}: {
  readonly row: DayProgressActivity
  readonly locale: string
}) {
  const Glyph = OUTCOME_GLYPH[row.resolution]
  return (
    <li
      className="flex items-center gap-3 rounded-kro-card px-3 py-2"
      style={{ background: CARD_BACKGROUND }}
      data-kro-day-progress-row={row.id}
    >
      <span
        aria-hidden
        className="flex size-11 shrink-0 items-center justify-center rounded-kro-small text-xl"
        style={{ background: foreMix(8) }}
      >
        {computedSymbol(row.endeavorTitle)}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className="truncate font-semibold text-sm"
          style={{ color: colorVar('fore') }}
        >
          {displayTitle(row.endeavorTitle)}
        </span>
        <div className="flex items-center gap-2 text-xs">
          <span className="tabular-nums" style={{ color: foreMix(60) }}>
            {timeRange(row.startedAt, row.endedAt, locale)}
          </span>
          <span
            className="rounded-full px-1.5 py-px text-[10px]"
            style={{ background: foreMix(10), color: foreMix(75) }}
          >
            {durationPill(row.timedSeconds)}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5 text-xs">
        <span
          className="flex items-center gap-1 font-semibold"
          style={{ color: colorVar(OUTCOME_ROLE[row.resolution]) }}
        >
          <Glyph size={12} aria-hidden />
          {outcomeLabel(row.resolution)}
        </span>
        <span
          className="flex items-center gap-1 tabular-nums"
          style={{ color: foreMix(60) }}
        >
          <Award size={12} aria-hidden />
          {row.rewardPoints}
          <span className="sr-only"> points</span>
        </span>
      </div>
    </li>
  )
}

function ActivitySection({
  activity,
  isLoading,
  exception,
  locale,
}: {
  readonly activity: readonly DayProgressActivity[]
  readonly isLoading: boolean
  readonly exception: DayProgressException | null
  readonly locale: string
}) {
  return (
    <section className="flex flex-col gap-2" aria-labelledby="kro-day-activity">
      <h3
        id="kro-day-activity"
        className="flex items-center gap-1.5 font-semibold text-sm"
        style={{ color: colorVar('fore') }}
      >
        <Zap size={14} aria-hidden />
        Activity
        {!isLoading && exception === null ? (
          <span
            className="ml-auto text-xs tabular-nums"
            style={{ color: foreMix(55) }}
          >
            {activity.length}
          </span>
        ) : null}
      </h3>
      {exception !== null ? (
        <p
          role="alert"
          className="text-sm"
          style={{ color: colorVar('kroRed') }}
        >
          {dayProgressExceptionCopy(exception)}
        </p>
      ) : isLoading ? (
        <p className="text-sm" style={{ color: foreMix(60) }}>
          Loading activity…
        </p>
      ) : activity.length === 0 ? (
        <div
          className="flex flex-col items-center gap-1 rounded-kro-card px-3 py-6 text-center"
          style={{ background: CARD_BACKGROUND }}
        >
          <Activity size={22} aria-hidden style={{ color: foreMix(45) }} />
          <span
            className="font-semibold text-sm"
            style={{ color: colorVar('fore') }}
          >
            No activity yet
          </span>
          <span className="text-xs" style={{ color: foreMix(60) }}>
            Complete a task or run a session and it will show up here.
          </span>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {activity.map((row) => (
            <ActivityCard key={row.id} row={row} locale={locale} />
          ))}
        </ul>
      )}
    </section>
  )
}

export function DayProgressFragment({
  locale = DEFAULT_DAY_PROGRESS_LOCALE,
  selectedDay,
  relation,
  weekCells,
  canPageToPreviousWeek,
  canPageToNextWeek,
  rings,
  activity,
  isLoading,
  exception,
  onSelectDay,
  onPreviousWeek,
  onNextWeek,
}: DayProgressFragmentProps) {
  return (
    <div className="flex flex-col gap-3 px-3 pb-4" data-kro-day-progress>
      {selectedDay !== null ? (
        <p className="text-xs" style={{ color: foreMix(60) }}>
          {dayProgressSubtitle(relation, selectedDay, locale)}
        </p>
      ) : null}
      <WeekLane
        cells={weekCells}
        locale={locale}
        canPageToPreviousWeek={canPageToPreviousWeek}
        canPageToNextWeek={canPageToNextWeek}
        onSelectDay={onSelectDay}
        onPreviousWeek={onPreviousWeek}
        onNextWeek={onNextWeek}
      />
      <Hero rings={rings} isLoading={isLoading && exception === null} />
      <ActivitySection
        activity={activity}
        isLoading={isLoading}
        exception={exception}
        locale={locale}
      />
    </div>
  )
}
