import { describe, expect, it } from 'vitest'
import { makeStore, stubbedThunkExtra } from '../../../library/store'
import { makeInMemoryLocalStore } from '../../../services/localStore/InMemoryLocalStore'
import { dayProgressSeed } from '../pages/__tests__/dayProgressFixtures'
import {
  dayProgressSlice,
  onDayProgressClockTicked,
  onDayProgressRequested,
  userDidSelectDay,
  userDidTapNextWeek,
  userDidTapPreviousWeek,
} from '../DayProgressFeature'
import {
  DAY_PROGRESS_MOCK_TODAY as today,
  dayProgressStateMocks as mocks,
  makeDayProgressEndeavors,
} from '../DayProgressMocks'
import { loadDayProgressThunk } from '../DayProgressProducer'
import { addDays } from '../DayProgressRules'

const reduce = dayProgressSlice.reducer

describe('onDayProgressRequested', () => {
  it('first open stamps today and starts loading', () => {
    const next = reduce(mocks.idle, onDayProgressRequested({ today }))
    expect(next.today).toEqual(today)
    expect(next.load.kind).toBe('loading')
  })

  it('reopening from an earlier week returns to today', () => {
    const next = reduce(mocks.earlierWeek, onDayProgressRequested({ today }))
    expect(next.weekOffset).toBe(0)
    expect(next.selectedDay).toEqual(today)
  })

  it('reopening the next morning moves today forward', () => {
    const tomorrow = addDays(today, 1)
    const next = reduce(
      mocks.busyDay,
      onDayProgressRequested({ today: tomorrow }),
    )
    expect(next.today).toEqual(tomorrow)
  })
})

describe('userDidSelectDay', () => {
  it('tapping yesterday selects it', () => {
    const day = addDays(today, -1)
    expect(
      reduce(mocks.busyDay, userDidSelectDay({ day })).selectedDay,
    ).toEqual(day)
  })

  it('tapping the already-selected day changes nothing visible', () => {
    const next = reduce(mocks.busyDay, userDidSelectDay({ day: today }))
    expect(next.selectedDay).toEqual(today)
    expect(next.weekOffset).toBe(0)
  })

  it('a future day is refused', () => {
    const next = reduce(
      mocks.busyDay,
      userDidSelectDay({ day: addDays(today, 2) }),
    )
    expect(next.selectedDay).toEqual(today)
  })
})

describe('userDidTapPreviousWeek / userDidTapNextWeek', () => {
  it('previous week pages back one week', () => {
    expect(reduce(mocks.busyDay, userDidTapPreviousWeek()).weekOffset).toBe(-1)
  })

  it('next week from an earlier week returns to today', () => {
    const next = reduce(mocks.earlierWeek, userDidTapNextWeek())
    expect(next.weekOffset).toBe(0)
    expect(next.selectedDay).toEqual(today)
  })

  it('next week on the current week is clamped', () => {
    expect(reduce(mocks.busyDay, userDidTapNextWeek()).weekOffset).toBe(0)
  })
})

describe('the load lifecycle, through the real thunk', () => {
  const now = new Date()
  const storeWith = (
    seed = dayProgressSeed(makeDayProgressEndeavors(now), now),
  ) =>
    makeStore({
      ...stubbedThunkExtra,
      localStore: makeInMemoryLocalStore(seed),
    })

  it('a stored day loads every endeavor with its performances', async () => {
    const store = storeWith()
    store.dispatch(onDayProgressRequested({ today: now }))
    await store.dispatch(
      loadDayProgressThunk({ now: new Date(now.getTime() + 86_400_000) }),
    )
    const { load } = store.getState().dayProgress
    expect(load.kind).toBe('loaded')
    if (load.kind === 'loaded') {
      expect(
        load.endeavors.find((e) => e.id === 'dp-blog')?.performances,
      ).toHaveLength(1)
    }
  })

  it('an unreadable store lands in failed with a typed exception', async () => {
    const broken = makeInMemoryLocalStore()
    const store = makeStore({
      ...stubbedThunkExtra,
      localStore: {
        ...broken,
        performances: {
          ...broken.performances,
          all: () => Promise.reject(new Error('disk gone')),
        },
      },
    })
    await store.dispatch(loadDayProgressThunk({ now }))
    const { load } = store.getState().dayProgress
    expect(load.kind).toBe('failed')
    if (load.kind === 'failed') expect(load.exception.kind).toBe('loadFailed')
  })

  it('an empty store is loaded, not failed', async () => {
    const store = storeWith({})
    await store.dispatch(loadDayProgressThunk({ now }))
    expect(store.getState().dayProgress.load).toEqual({
      kind: 'loaded',
      endeavors: [],
    })
  })

  it('a cancelled load leaves the lifecycle untouched (the one silent exit)', async () => {
    const store = storeWith()
    const effect = store.dispatch(loadDayProgressThunk({ now }))
    effect.abort()
    await effect
    expect(store.getState().dayProgress.load.kind).not.toBe('failed')
  })

  it('the defensive rejected arm degrades to an unknown exception', () => {
    const next = reduce(
      mocks.loading,
      loadDayProgressThunk.rejected(new Error('bug'), 'req', { now }),
    )
    expect(next.load.kind).toBe('failed')
    if (next.load.kind === 'failed')
      expect(next.load.exception.kind).toBe('unknown')
  })
})

describe('onDayProgressClockTicked', () => {
  it('an ordinary tick leaves the open pane untouched', () => {
    const next = reduce(
      mocks.busyDay,
      onDayProgressClockTicked({ now: new Date(today.getTime() + 60_000) }),
    )
    expect(next).toBe(mocks.busyDay)
  })

  it('the tick after midnight moves today and the selection forward', () => {
    const tomorrow = addDays(today, 1)
    const next = reduce(
      mocks.yesterday,
      onDayProgressClockTicked({ now: tomorrow }),
    )
    expect(next.today).toEqual(tomorrow)
    expect(next.selectedDay).toEqual(tomorrow)
  })

  it('a tick on a closed pane stamps nothing', () => {
    const next = reduce(mocks.idle, onDayProgressClockTicked({ now: today }))
    expect(next.today).toBeNull()
  })
})
