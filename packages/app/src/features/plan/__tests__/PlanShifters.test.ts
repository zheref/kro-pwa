import type { Endeavor } from '@kro/core'
import {
  DayViewRange,
  EndeavorHost,
  EndeavorKind,
  EndeavorStatus,
  makeEndeavor,
} from '@kro/core'
import { describe, expect, it } from 'vitest'
import { addingPlanDays, planDayKey, startOfPlanDay } from '../PlanCalendar'
import { emptyPlanDayCache } from '../PlanDayCache'
import {
  PLAN_REFERENCE_DAY,
  PLAN_REFERENCE_NOW,
  planAt,
  planDayFixtures,
  planStateMocks,
} from '../PlanMocks'
import {
  authoritativeDayKeyOf,
  withEditCommitApplied,
  withEditSession,
  withMatrixResolvedEndeavor,
  withPlanClockAdvanced,
  withPlanDayLoadFailed,
  withPlanDayLoadStarted,
  withPlanDayLoaded,
  withPlanMatrixLoad,
  withPlanPreloadCleared,
  withPlanPreloadInstalled,
  withPlanPreloadSettled,
  withPlanPreloadStarted,
  withPlanViewLoaded,
  withPlanVisibility,
  withPlanVisibilityToggled,
  withQuickCreateDraft,
  withSelectedDay,
} from '../PlanShifters'
import { PlanExceptions } from '../PlanException'
import { PlanLoadReason } from '../PlanState'

const today = startOfPlanDay(PLAN_REFERENCE_DAY)
const todayKey = planDayKey(today)
const tomorrow = addingPlanDays(today, 1)

describe('withPlanViewLoaded', () => {
  it('stamps the clock, the day and the flag in one shift', () => {
    const next = withPlanViewLoaded(planStateMocks.idle, {
      now: PLAN_REFERENCE_NOW,
      selectedDate: today,
      isQuickEventCreationEnabled: true,
      enabledCapabilityFlags: [],
    })
    expect(next.now).toBe(PLAN_REFERENCE_NOW)
    expect(next.selectedDate).toBe(today)
    expect(next.isQuickEventCreationEnabled).toBe(true)
  })

  it('seeds the picker batch from today, not from the selection', () => {
    const next = withPlanViewLoaded(planStateMocks.idle, {
      now: PLAN_REFERENCE_NOW,
      selectedDate: addingPlanDays(today, 1),
      isQuickEventCreationEnabled: false,
      enabledCapabilityFlags: [],
    })
    expect(planDayKey(next.dayPickerCenter as Date)).toBe(todayKey)
  })

  it('leaves the flag off when the build does not carry it', () => {
    const next = withPlanViewLoaded(planStateMocks.idle, {
      now: PLAN_REFERENCE_NOW,
      selectedDate: today,
      isQuickEventCreationEnabled: false,
      enabledCapabilityFlags: [],
    })
    expect(next.isQuickEventCreationEnabled).toBe(false)
  })
})

describe('withPlanClockAdvanced', () => {
  it('advances the clock without touching anything else mid-day', () => {
    const next = withPlanClockAdvanced(planStateMocks.loaded, {
      now: planAt(10),
    })
    expect(next.now).toEqual(planAt(10))
    expect(next.preloadedDays).toBe(planStateMocks.loaded.preloadedDays)
  })

  it('files the day that just ended into the buffer at midnight', () => {
    const atMidnight = withPlanClockAdvanced(
      { ...planStateMocks.loaded, now: planAt(23, 59) },
      { now: new Date(tomorrow.getTime() + 60_000) },
    )
    expect(atMidnight.preloadedDays[todayKey]?.map((e) => e.id)).toEqual([
      'nested-long',
      'nested-short-a',
      'nested-short-b',
    ])
  })

  it('preserves nothing when the authoritative array is about another day', () => {
    const otherDay = {
      ...planStateMocks.loaded,
      now: planAt(23, 59),
      dayLoad: {
        kind: 'loaded' as const,
        dayKey: planDayKey(tomorrow),
        events: planDayFixtures.longSoloBlock,
      },
    }
    const next = withPlanClockAdvanced(otherDay, {
      now: new Date(tomorrow.getTime() + 60_000),
    })
    expect(next.preloadedDays[todayKey]).toEqual([])
  })
})

describe('withPlanVisibility / withPlanVisibilityToggled', () => {
  it('replaces the whole visibility set on a restore', () => {
    const next = withPlanVisibility(planStateMocks.loaded, {
      ...planStateMocks.loaded.visibility,
      hiddenCalendarIds: ['work'],
    })
    expect(next.visibility.hiddenCalendarIds).toEqual(['work'])
  })

  it('hides a kind that was visible', () => {
    const next = withPlanVisibilityToggled(planStateMocks.loaded, {
      axis: 'kind',
      value: EndeavorKind.habit,
    })
    expect(next.visibility.hiddenKinds).toContain(EndeavorKind.habit)
  })

  it('reveals a kind that was hidden — the toggle is a membership flip', () => {
    const hidden = withPlanVisibilityToggled(planStateMocks.loaded, {
      axis: 'kind',
      value: EndeavorKind.habit,
    })
    const revealed = withPlanVisibilityToggled(hidden, {
      axis: 'kind',
      value: EndeavorKind.habit,
    })
    expect(revealed.visibility.hiddenKinds).not.toContain(EndeavorKind.habit)
  })

  it('flips each axis independently', () => {
    let next = withPlanVisibilityToggled(planStateMocks.loaded, {
      axis: 'host',
      value: EndeavorHost.googleCalendar,
    })
    next = withPlanVisibilityToggled(next, {
      axis: 'status',
      value: EndeavorStatus.closed,
    })
    next = withPlanVisibilityToggled(next, {
      axis: 'calendar',
      value: 'personal',
    })
    expect(next.visibility.hiddenHosts).toEqual([EndeavorHost.googleCalendar])
    expect(next.visibility.hiddenStatuses).toEqual([EndeavorStatus.closed])
    expect(next.visibility.hiddenCalendarIds).toEqual(['personal'])
  })
})

describe('withSelectedDay', () => {
  it('moves to the day’s midnight, not the moment tapped', () => {
    const next = withSelectedDay(planStateMocks.loaded, {
      date: new Date(tomorrow.getTime() + 17 * 3_600_000),
    })
    expect(next.selectedDate.getTime()).toBe(tomorrow.getTime())
  })

  it('drops an armed edit session — the card is no longer on screen', () => {
    const next = withSelectedDay(planStateMocks.editing, { date: tomorrow })
    expect(next.editSession).toBeNull()
  })

  it('drops an uncommitted quick-create ghost for the same reason', () => {
    const next = withSelectedDay(planStateMocks.quickCreating, {
      date: tomorrow,
    })
    expect(next.quickCreate).toBeNull()
  })

  it('shifts the picker batch only once the selection leaves it', () => {
    const inside = withSelectedDay(planStateMocks.loaded, { date: tomorrow })
    expect(planDayKey(inside.dayPickerCenter as Date)).toBe(todayKey)
    const outside = withSelectedDay(planStateMocks.loaded, {
      date: addingPlanDays(today, 3),
    })
    expect(planDayKey(outside.dayPickerCenter as Date)).toBe(
      planDayKey(addingPlanDays(today, 1)),
    )
  })
})

describe('the day lifecycle and its activity markers', () => {
  it('raises the refresh marker for a manual read', () => {
    const next = withPlanDayLoadStarted(planStateMocks.loaded, {
      dayKey: todayKey,
      reason: PlanLoadReason.manual,
    })
    expect(next.dayLoad.kind).toBe('loading')
    expect(next.activity.isRefreshing).toBe(true)
    expect(next.activity.isAppLoading).toBe(false)
  })

  it('raises the app-wide marker for a shell-driven read', () => {
    const next = withPlanDayLoadStarted(planStateMocks.loaded, {
      dayKey: todayKey,
      reason: PlanLoadReason.appWide,
    })
    expect(next.activity.isAppLoading).toBe(true)
    expect(next.activity.isRefreshing).toBe(false)
  })

  it('settles the marker it raised when the day arrives', () => {
    const loading = withPlanDayLoadStarted(planStateMocks.loaded, {
      dayKey: todayKey,
      reason: PlanLoadReason.manual,
    })
    const loaded = withPlanDayLoaded(loading, {
      dayKey: todayKey,
      events: planDayFixtures.longSoloBlock,
      reason: PlanLoadReason.manual,
    })
    expect(loaded.activity.isRefreshing).toBe(false)
    expect(loaded.dayLoad).toEqual({
      kind: 'loaded',
      dayKey: todayKey,
      events: planDayFixtures.longSoloBlock,
    })
  })

  it('settles the marker on failure too, so the control never spins forever', () => {
    const loading = withPlanDayLoadStarted(planStateMocks.loaded, {
      dayKey: todayKey,
      reason: PlanLoadReason.appWide,
    })
    const failed = withPlanDayLoadFailed(loading, {
      dayKey: todayKey,
      exception: PlanExceptions.dayLoadFailed('offline'),
      reason: PlanLoadReason.appWide,
    })
    expect(failed.activity.isAppLoading).toBe(false)
    expect(failed.dayLoad.kind).toBe('failed')
  })

  it('leaves the other reason’s marker alone when one settles', () => {
    const both = {
      ...planStateMocks.loaded,
      activity: {
        isRefreshing: true,
        isAppLoading: true,
        preloadCenterDayKey: null,
      },
    }
    const settled = withPlanDayLoaded(both, {
      dayKey: todayKey,
      events: [],
      reason: PlanLoadReason.manual,
    })
    expect(settled.activity.isRefreshing).toBe(false)
    expect(settled.activity.isAppLoading).toBe(true)
  })

  it('records an empty day as loaded, not as still loading', () => {
    const loaded = withPlanDayLoaded(planStateMocks.loading, {
      dayKey: todayKey,
      events: [],
      reason: PlanLoadReason.appWide,
    })
    expect(loaded.dayLoad.kind).toBe('loaded')
    expect(loaded.activity.isAppLoading).toBe(false)
  })
})

describe('the preload markers', () => {
  it('marks the window it is fetching', () => {
    const next = withPlanPreloadStarted(planStateMocks.loaded, {
      centerDayKey: todayKey,
    })
    expect(next.activity.preloadCenterDayKey).toBe(todayKey)
  })

  it('settles the marker for the window that is actually in flight', () => {
    const started = withPlanPreloadStarted(planStateMocks.loaded, {
      centerDayKey: todayKey,
    })
    const settled = withPlanPreloadSettled(started, { centerDayKey: todayKey })
    expect(settled.activity.preloadCenterDayKey).toBeNull()
  })

  it('leaves a superseding window’s marker alone — the newer request owns it', () => {
    const started = withPlanPreloadStarted(planStateMocks.loaded, {
      centerDayKey: planDayKey(tomorrow),
    })
    const settled = withPlanPreloadSettled(started, { centerDayKey: todayKey })
    expect(settled).toBe(started)
    expect(settled.activity.preloadCenterDayKey).toBe(planDayKey(tomorrow))
  })

  it('is a no-op when nothing is in flight', () => {
    expect(
      withPlanPreloadSettled(planStateMocks.loaded, { centerDayKey: todayKey }),
    ).toBe(planStateMocks.loaded)
  })
})

describe('withPlanPreloadInstalled — the buffer never clobbers the day', () => {
  const preloadEvents: readonly Endeavor[] = [
    ...planDayFixtures.longBlockWithShortOverlaps,
    makeEndeavor({
      id: 'tomorrow-demo',
      title: 'Demo',
      kind: EndeavorKind.calendarEvent,
      start: new Date(tomorrow.getTime() + 15 * 3_600_000),
      duration: 3600,
    }),
  ]

  it('leaves the authoritative array exactly as it was', () => {
    const next = withPlanPreloadInstalled(planStateMocks.loaded, {
      centerDayKey: todayKey,
      events: preloadEvents,
    })
    expect(next.dayLoad).toBe(planStateMocks.loaded.dayLoad)
  })

  it('files no cache entry for the authoritative day at all', () => {
    const next = withPlanPreloadInstalled(planStateMocks.loaded, {
      centerDayKey: todayKey,
      events: preloadEvents,
    })
    expect(next.preloadedDays[todayKey]).toBeUndefined()
  })

  it('keeps the neighbouring days it did fetch', () => {
    const next = withPlanPreloadInstalled(planStateMocks.loaded, {
      centerDayKey: todayKey,
      events: preloadEvents,
    })
    expect(next.preloadedDays[planDayKey(tomorrow)]?.map((e) => e.id)).toEqual([
      'tomorrow-demo',
    ])
    expect(next.preloadedCenterDayKey).toBe(todayKey)
  })

  it('replaces the previous buffer wholesale rather than merging into it', () => {
    const seeded = withPlanPreloadInstalled(planStateMocks.loadedWithPreload, {
      centerDayKey: todayKey,
      events: [],
    })
    expect(seeded.preloadedDays).toEqual({})
  })
})

describe('withPlanPreloadCleared', () => {
  it('empties the buffer and forgets its centre', () => {
    const next = withPlanPreloadCleared(planStateMocks.loadedWithPreload)
    expect(next.preloadedDays).toBe(emptyPlanDayCache)
    expect(next.preloadedCenterDayKey).toBeNull()
  })

  it('leaves the authoritative day untouched', () => {
    expect(
      withPlanPreloadCleared(planStateMocks.loadedWithPreload).dayLoad,
    ).toBe(planStateMocks.loadedWithPreload.dayLoad)
  })

  it('is safe to run when the buffer is already empty', () => {
    expect(withPlanPreloadCleared(planStateMocks.loaded).preloadedDays).toEqual(
      {},
    )
  })
})

describe('withPlanMatrixLoad', () => {
  it('moves to loading', () => {
    expect(
      withPlanMatrixLoad(planStateMocks.loaded, { kind: 'loading' }).matrixLoad
        .kind,
    ).toBe('loading')
  })

  it('carries the rows on success', () => {
    const next = withPlanMatrixLoad(planStateMocks.loaded, {
      kind: 'loaded',
      endeavors: [],
    })
    expect(next.matrixLoad).toEqual({ kind: 'loaded', endeavors: [] })
  })

  it('carries a typed exception on failure', () => {
    const next = withPlanMatrixLoad(planStateMocks.loaded, {
      kind: 'failed',
      exception: PlanExceptions.dayLoadFailed('offline'),
    })
    expect(next.matrixLoad.kind).toBe('failed')
  })
})

describe('withQuickCreateDraft', () => {
  it('seeds the ghost', () => {
    const next = withQuickCreateDraft(planStateMocks.loaded, {
      start: planAt(14),
      durationSeconds: 3600,
    })
    expect(next.quickCreate?.start).toEqual(planAt(14))
  })

  it('clears it when the prompt closes, however it closed', () => {
    expect(
      withQuickCreateDraft(planStateMocks.quickCreating, null).quickCreate,
    ).toBeNull()
  })

  it('touches nothing else', () => {
    expect(withQuickCreateDraft(planStateMocks.loaded, null).dayLoad).toBe(
      planStateMocks.loaded.dayLoad,
    )
  })
})

describe('withEditSession', () => {
  it('arms a card', () => {
    const next = withEditSession(planStateMocks.loaded, {
      endeavorId: 'nested-long',
      originalStart: planAt(9),
      originalEnd: planAt(13),
      draftStart: null,
      draftEnd: null,
      drag: null,
    })
    expect(next.editSession?.endeavorId).toBe('nested-long')
  })

  it('clears a quick-create ghost while a card is armed — the two never coexist', () => {
    const next = withEditSession(planStateMocks.quickCreating, {
      endeavorId: 'solo-standup',
      originalStart: planAt(9),
      originalEnd: planAt(12),
      draftStart: null,
      draftEnd: null,
      drag: null,
    })
    expect(next.quickCreate).toBeNull()
  })

  it('disarms without disturbing a ghost that was never cleared', () => {
    const next = withEditSession(planStateMocks.quickCreating, null)
    expect(next.editSession).toBeNull()
    expect(next.quickCreate).toEqual(planStateMocks.quickCreating.quickCreate)
  })
})

describe('withEditCommitApplied', () => {
  it('writes the new times into the authoritative array', () => {
    const next = withEditCommitApplied(planStateMocks.editing, {
      commit: {
        endeavorId: 'nested-long',
        start: planAt(10),
        end: planAt(14),
      },
    })
    const edited =
      next.dayLoad.kind === 'loaded'
        ? next.dayLoad.events.find((event) => event.id === 'nested-long')
        : undefined
    expect(edited?.start).toEqual(planAt(10))
    expect(edited?.duration).toBe(4 * 3600)
    expect(next.editSession).toBeNull()
  })

  it('moves a card dragged onto another day out of the authoritative array', () => {
    const next = withEditCommitApplied(planStateMocks.editing, {
      commit: {
        endeavorId: 'nested-long',
        start: new Date(tomorrow.getTime() + 9 * 3_600_000),
        end: new Date(tomorrow.getTime() + 13 * 3_600_000),
      },
    })
    const ids =
      next.dayLoad.kind === 'loaded' ? next.dayLoad.events.map((e) => e.id) : []
    expect(ids).not.toContain('nested-long')
    expect(next.preloadedDays[planDayKey(tomorrow)]?.map((e) => e.id)).toEqual([
      'nested-long',
    ])
  })

  it('simply disarms when the committed event cannot be found', () => {
    const next = withEditCommitApplied(planStateMocks.editing, {
      commit: { endeavorId: 'ghost', start: planAt(10), end: planAt(11) },
    })
    expect(next.editSession).toBeNull()
    expect(next.dayLoad).toBe(planStateMocks.editing.dayLoad)
  })
})

describe('withMatrixResolvedEndeavor', () => {
  const resolved = makeEndeavor({
    id: 'nested-long',
    title: 'Offsite',
    kind: EndeavorKind.calendarEvent,
    start: planAt(9),
    duration: 4 * 3600,
    value: 5,
  })

  it('replaces the row in the authoritative array', () => {
    const next = withMatrixResolvedEndeavor(planStateMocks.loaded, resolved)
    const found =
      next.dayLoad.kind === 'loaded'
        ? next.dayLoad.events.find((event) => event.id === 'nested-long')
        : undefined
    expect(found?.value).toBe(5)
  })

  it('replaces it in the buffer too, so the caches cannot disagree', () => {
    const seeded = {
      ...planStateMocks.loadedWithPreload,
      preloadedDays: {
        [planDayKey(tomorrow)]: [
          makeEndeavor({
            id: 'nested-long',
            title: 'Offsite',
            kind: EndeavorKind.calendarEvent,
            start: new Date(tomorrow.getTime() + 9 * 3_600_000),
            duration: 3600,
          }),
        ],
      },
    }
    const next = withMatrixResolvedEndeavor(seeded, resolved)
    expect(next.preloadedDays[planDayKey(tomorrow)]?.[0]?.value).toBe(5)
  })

  it('replaces it in the matrix rows as well', () => {
    const next = withMatrixResolvedEndeavor(planStateMocks.matrix, {
      ...(planStateMocks.matrix.matrixLoad.kind === 'loaded'
        ? (planStateMocks.matrix.matrixLoad.endeavors[0] as Endeavor)
        : resolved),
      value: 1,
    })
    const rows =
      next.matrixLoad.kind === 'loaded' ? next.matrixLoad.endeavors : []
    expect(rows[0]?.value).toBe(1)
  })
})

describe('authoritativeDayKeyOf', () => {
  it('names the day the loaded array holds', () => {
    expect(authoritativeDayKeyOf(planStateMocks.loaded)).toBe(todayKey)
  })

  it('is null while the day is still loading', () => {
    expect(authoritativeDayKeyOf(planStateMocks.loading)).toBeNull()
  })

  it('is null when the day failed', () => {
    expect(authoritativeDayKeyOf(planStateMocks.failed)).toBeNull()
  })
})
