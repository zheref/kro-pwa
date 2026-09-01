/**
 * The candidate pools the add-existing picker is judged on (`RC-31`, `UZF-18`).
 *
 * `PlanMocks.planMatrixFixtureList` already carries the admission set — tasks,
 * a ticket, the two untriaged shapes and the kinds the matrix refuses — and it
 * is reused unchanged so "what the picker offers" and "what the board admits"
 * are read from ONE list. What it does not carry is a pool big enough to reach
 * the seven-selection cap, which is the picker's own acceptance criterion, so
 * the ninth-row pool below is added here rather than in `PlanMocks.ts`
 * (KC-IS-#18's file lane).
 */
import type { Endeavor } from '@kro/core'
import {
  EndeavorHost,
  EndeavorKind,
  EndeavorStatus,
  makeEndeavor,
} from '@kro/core'
import {
  PLAN_REFERENCE_NOW,
  planAt,
  planMatrixFixtureList,
} from '../../PlanMocks'

/** The day "Today" is measured against in every picker fixture. */
export const PLAN_PICKER_NOW = PLAN_REFERENCE_NOW

const pickable = (params: {
  readonly id: string
  readonly title: string
  readonly due?: Date | null
  readonly value?: number | null
  readonly projectId?: string | null
}): Endeavor =>
  makeEndeavor({
    id: params.id,
    title: params.title,
    kind: EndeavorKind.task,
    status: EndeavorStatus.pending,
    due: params.due ?? null,
    value: params.value ?? null,
    projectId: params.projectId ?? null,
    hostedBy: [EndeavorHost.local],
  })

/**
 * The mixed pool — canon's three priority bands, all represented.
 *
 * `todayA`/`todayB` are due today; the three `triaged…` rows carry triage data
 * for another day; the three `untriaged…` rows carry neither a due date nor a
 * value, which is canon's definition of the third band.
 */
export const planPickerPool: readonly Endeavor[] = [
  pickable({ id: 'pick-today-a', title: '🧾 File the expenses', due: planAt(16), value: 4 }),
  pickable({ id: 'pick-today-b', title: 'Book the courier', due: planAt(18), value: 2 }),
  pickable({
    id: 'pick-triaged-a',
    title: 'Draft the roadmap',
    due: new Date(planAt(9).getTime() + 3 * 86_400_000),
    value: 4,
    projectId: 'atlas',
  }),
  pickable({
    id: 'pick-triaged-b',
    title: 'Réserver le vol',
    due: new Date(planAt(9).getTime() + 5 * 86_400_000),
    value: 3,
    projectId: 'atlas',
  }),
  pickable({
    id: 'pick-triaged-c',
    title: 'Tidy the bookmarks',
    due: new Date(planAt(9).getTime() + 7 * 86_400_000),
    value: 1,
  }),
  pickable({ id: 'pick-untriaged-a', title: 'Clean the garage' }),
  pickable({ id: 'pick-untriaged-b', title: 'Someday, maybe' }),
  pickable({ id: 'pick-untriaged-c', title: 'Water the plants' }),
  pickable({ id: 'pick-untriaged-d', title: 'Zip the archive' }),
]

/**
 * The admission set the board itself uses — reused so the picker's task-only
 * filter is asserted against the same rows the matrix suite asserts against.
 */
export const planPickerAdmissionPool: readonly Endeavor[] = planMatrixFixtureList
