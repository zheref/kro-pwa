/**
 * The Producer dispatched for real against stubbed services (`RC-54`,
 * `RC-35`); assertions on the resolved `Result`.
 */
import { describe, expect, it } from 'vitest'
import { PLAN_REFERENCE_DAY, planDayFixtures } from '../../plan/PlanMocks'
import { addingPlanDays } from '../../plan/PlanCalendar'
import { loadDayTimelineThunk } from '../DayTimelineProducer'
import {
  makeDayTimelineStore,
  makeFailingDayTimelineStore,
} from './dayTimelineStores'

const resultOf = (action: { type: string; payload?: unknown }) => {
  if (!loadDayTimelineThunk.fulfilled.match(action)) {
    throw new Error('the Producer must never reject')
  }
  return action.payload
}

describe('loadDayTimelineThunk', () => {
  it("resolves today's events from the on-device host, keyed by day", async () => {
    const store = makeDayTimelineStore(
      planDayFixtures.longBlockWithShortOverlaps,
    )
    const action = await store.dispatch(
      loadDayTimelineThunk({ day: PLAN_REFERENCE_DAY }),
    )
    const result = resultOf(action)
    if (!result.ok) throw new Error('expected ok')
    expect(result.value.dayKey).toBe('2026-06-18')
    expect(result.value.events.map((event) => event.id).sort()).toEqual([
      'nested-long',
      'nested-short-a',
      'nested-short-b',
    ])
  })

  it('reads only the requested day — tomorrow is empty', async () => {
    const store = makeDayTimelineStore(planDayFixtures.longSoloBlock)
    const action = await store.dispatch(
      loadDayTimelineThunk({ day: addingPlanDays(PLAN_REFERENCE_DAY, 1) }),
    )
    const result = resultOf(action)
    if (!result.ok) throw new Error('expected ok')
    expect(result.value.events).toEqual([])
  })

  it('resolves err(loadFailed) when the host fan-out throws, never rejecting', async () => {
    const store = makeFailingDayTimelineStore('flags unavailable')
    const action = await store.dispatch(
      loadDayTimelineThunk({ day: PLAN_REFERENCE_DAY }),
    )
    expect(action.type).toBe('dayTimeline/onDayTimelineLoadCompleted/fulfilled')
    const result = resultOf(action)
    if (result.ok) throw new Error('expected err')
    expect(result.error.kind).toBe('loadFailed')
    expect(result.error.message).toContain('flags unavailable')
  })

  it('an aborted read is silent — no failure lands in state', async () => {
    const store = makeDayTimelineStore(planDayFixtures.longSoloBlock)
    const effect = store.dispatch(
      loadDayTimelineThunk({ day: PLAN_REFERENCE_DAY }),
    )
    effect.abort()
    await effect
    expect(store.getState().dayTimeline.load.kind).not.toBe('failed')
  })
})
