/**
 * Canned Day Timeline states (`RC-31`). Built from Plan's own day fixtures,
 * so the pane is judged against the same overlap shapes as the Plan canvas.
 * Stories and tests consume these — never an inline `State`. No new domain
 * model is introduced, so `RC-13`'s model mocks are Plan's.
 */
import { planDayKey } from '../plan/PlanCalendar'
import { PLAN_REFERENCE_NOW, planDayFixtures } from '../plan/PlanMocks'
import { DayTimelineExceptions } from './DayTimelineException'
import {
  type DayTimelineState,
  initialDayTimelineState,
} from './DayTimelineFeature'

/** The reference clock of the static mocks — 09:40 on Plan's reference day. */
export const DAY_TIMELINE_MOCK_NOW = PLAN_REFERENCE_NOW

const TODAY_KEY = planDayKey(DAY_TIMELINE_MOCK_NOW)

const opened = (
  load: DayTimelineState['load'],
  now: Date = DAY_TIMELINE_MOCK_NOW,
): DayTimelineState => ({ ...initialDayTimelineState, now, load })

export const dayTimelineStateMocks = {
  idle: initialDayTimelineState,
  loading: opened({ kind: 'loading' }),
  /** Convenient: nested overlaps — three live columns. */
  busyDay: opened({
    kind: 'loaded',
    dayKey: TODAY_KEY,
    events: planDayFixtures.longBlockWithShortOverlaps,
  }),
  /** Convenient: morning, afternoon and a 10-minute sliver. */
  spreadDay: opened({
    kind: 'loaded',
    dayKey: TODAY_KEY,
    events: planDayFixtures.fullDayLongAndShort,
  }),
  /** Neutral: nothing scheduled — the grid alone. */
  emptyDay: opened({ kind: 'loaded', dayKey: TODAY_KEY, events: [] }),
  /** Inconvenient: loaded yesterday, the clock has since crossed midnight. */
  staleDay: opened({
    kind: 'loaded',
    dayKey: planDayKey(new Date(2026, 5, 17)),
    events: planDayFixtures.longSoloBlock,
  }),
  /** Inconvenient: the read failed. */
  failed: opened({
    kind: 'failed',
    exception: DayTimelineExceptions.loadFailed('IndexedDB is unavailable'),
  }),
} satisfies Record<string, DayTimelineState>
