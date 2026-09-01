/**
 * The day shapes the Plan LIST destination is judged on (`RC-31`, `UZF-18`).
 *
 * `PlanMocks.ts` carries the day fixtures the TIMELINE was tuned against —
 * overlap clusters, nested blocks — and the matrix's task set. The list asks
 * two questions neither answers: what an **untimed** row due today does to the
 * temporal buckets, and what a **project** id does to the grouped
 * presentation. Those two are added here rather than in `PlanMocks.ts`, which
 * is KC-IS-#18's file lane; everything else is imported from it, so one endeavor
 * never exists in two shapes.
 *
 * Every moment is built from `PLAN_REFERENCE_DAY` and read against
 * `PLAN_REFERENCE_NOW` (09:40 on a fixed Thursday), so which bucket a fixture
 * lands in is a fact about the fixture rather than about when the suite ran.
 */
import type { Endeavor, EndeavorCapabilities } from '@kro/core'
import {
  EndeavorHost,
  EndeavorKind,
  EndeavorStatus,
  EndeavorsVistas,
  makeEndeavor,
  resolveEndeavorCapabilities,
} from '@kro/core'
import { PLAN_REFERENCE_NOW, planAt } from '../../PlanMocks'

/** The instant every list fixture is classified against. */
export const PLAN_LIST_NOW = PLAN_REFERENCE_NOW

const event = (params: {
  readonly id: string
  readonly title: string
  readonly start: Date | null
  readonly durationSeconds: number | null
  readonly projectId?: string | null
}): Endeavor =>
  makeEndeavor({
    id: params.id,
    title: params.title,
    kind: EndeavorKind.calendarEvent,
    status: EndeavorStatus.planned,
    start: params.start,
    duration: params.durationSeconds,
    projectId: params.projectId ?? null,
    hostedBy: [EndeavorHost.local],
  })

const task = (params: {
  readonly id: string
  readonly title: string
  readonly due: Date | null
  readonly value?: number | null
  readonly projectId?: string | null
}): Endeavor =>
  makeEndeavor({
    id: params.id,
    title: params.title,
    kind: EndeavorKind.task,
    status: EndeavorStatus.pending,
    due: params.due,
    value: params.value ?? null,
    projectId: params.projectId ?? null,
    hostedBy: [EndeavorHost.local],
  })

/** One row per temporal bucket, at 09:40 — the `.none` presentation's proof. */
export const planListBucketFixtures = {
  /** A calendar event with a start and NO duration: canon's all-day shape. */
  allDay: event({
    id: 'list-all-day',
    title: '🎉 Company offsite',
    start: planAt(0),
    durationSeconds: null,
  }),
  /** Finished at 08:30, an hour before `now`. */
  past: event({
    id: 'list-past',
    title: '☕️ Breakfast',
    start: planAt(7, 30),
    durationSeconds: 3600,
  }),
  /** 09:00–10:00 straddles 09:40. */
  ongoing: event({
    id: 'list-ongoing',
    title: '🧑‍💻 Deep work',
    start: planAt(9),
    durationSeconds: 3600,
  }),
  /** Starts at 14:00. */
  comingNext: event({
    id: 'list-coming-next',
    title: '📞 Vendor call',
    start: planAt(14),
    durationSeconds: 1800,
  }),
  /** No start, due at 16:00 — the untimed half canon's list adds. */
  untimedDueToday: task({
    id: 'list-untimed-today',
    title: '🧾 File the expenses',
    due: planAt(16),
    value: 4,
  }),
  /** No start, due at 08:00 — untimed and already past. */
  untimedOverdue: task({
    id: 'list-untimed-overdue',
    title: 'Renew the parking permit',
    due: planAt(8),
    value: 2,
  }),
  /** Neither a start nor a due date — canon files it under Coming Next. */
  unscheduled: task({
    id: 'list-unscheduled',
    title: 'Someday, maybe',
    due: null,
  }),
} as const

/** Every bucket fixture, in a deliberately unsorted order. */
export const planListMixedDay: readonly Endeavor[] = [
  planListBucketFixtures.comingNext,
  planListBucketFixtures.untimedDueToday,
  planListBucketFixtures.past,
  planListBucketFixtures.allDay,
  planListBucketFixtures.ongoing,
  planListBucketFixtures.untimedOverdue,
]

/** Two projects plus an unassigned row — the `.project` presentation's proof. */
export const planListProjectDay: readonly Endeavor[] = [
  event({
    id: 'project-atlas-kickoff',
    title: '🚀 Atlas kickoff',
    start: planAt(11),
    durationSeconds: 3600,
    projectId: 'atlas',
  }),
  task({
    id: 'project-atlas-brief',
    title: 'Write the Atlas brief',
    due: planAt(15),
    value: 5,
    projectId: 'atlas',
  }),
  event({
    id: 'project-borealis-review',
    title: '🧊 Borealis review',
    start: planAt(13),
    durationSeconds: 1800,
    projectId: 'borealis',
  }),
  task({
    id: 'project-none-inbox',
    title: 'Clear the inbox',
    due: planAt(18),
    value: 1,
  }),
]

/** One row in each time-of-day band — the `.timeOfDay` presentation's proof. */
export const planListTimeOfDayDay: readonly Endeavor[] = [
  event({
    id: 'band-morning',
    title: '🥐 Standup',
    start: planAt(9, 15),
    durationSeconds: 900,
  }),
  event({
    id: 'band-afternoon',
    title: '🧪 Lab time',
    start: planAt(13),
    durationSeconds: 3600,
  }),
  event({
    id: 'band-evening',
    title: '🍝 Dinner',
    start: planAt(19),
    durationSeconds: 5400,
  }),
]

/** Titles that stress the sorts: mixed case, an accent, and an exact tie. */
export const planListSortDay: readonly Endeavor[] = [
  task({ id: 'sort-c', title: 'café au lait', due: planAt(12), value: 3 }),
  task({ id: 'sort-a', title: 'Alpha', due: planAt(8), value: 5 }),
  task({ id: 'sort-b', title: 'beta', due: null, value: 1 }),
]

/**
 * The capability set a Plan list row is rendered against in stories and tests —
 * `.planDay`'s own bindings with the flag-gated Detail tap dropped, which is
 * exactly what `selectPlanRowCapabilities` produces at runtime. Sharing one
 * value is what keeps a story from showing gestures production does not offer.
 */
export const planListCapabilitiesFixture: EndeavorCapabilities =
  resolveEndeavorCapabilities(EndeavorsVistas.planDay.capabilities, () => false)
