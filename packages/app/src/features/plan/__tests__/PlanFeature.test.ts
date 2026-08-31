/**
 * Reducer arms are called directly against `planSlice.reducer` — no store, no
 * middleware. The thunk lifecycle arms are driven through the **real** thunks
 * against a stubbed `LocalStore` injected via `ThunkExtra`, never a mocked
 * `fetch` (`RC-54`, `RC-35`).
 */
import type { Endeavor, EndeavorRecord } from '@kro/core'
import {
  EisenhowerQuadrant,
  EndeavorHost,
  EndeavorKind,
  EndeavorStatus,
  endeavorRecordFromEndeavor,
  makeEndeavor,
} from '@kro/core'
import { describe, expect, it } from 'vitest'
import { makeInMemoryLocalStore } from '../../../services/localStore/InMemoryLocalStore'
import { makeStore } from '../../../library/store'
import { stubbedGreetingService } from '../../../services/greeting/GreetingService'
import { addingPlanDays, planDayKey, startOfPlanDay } from '../PlanCalendar'
import {
  childCreationPromptDelegatedClose,
  onClockTicked,
  onLensSnapshotRestored,
  onPlanPreferencesLoaded,
  onViewLoaded,
  planSlice,
  userDidAssignToQuadrant,
  userDidDismissEditMode,
  userDidDragEditHandle,
  userDidGrabEditHandle,
  userDidHoldEventBlock,
  userDidPressTimelineSlot,
  userDidReleaseEditHandle,
  userDidRequestQuickCreateAt,
  userDidSelectDate,
  userDidSelectViewMode,
  userDidStepDay,
  userDidTapOutsideEditingBlock,
  userDidToggleVisibility,
} from '../PlanFeature'
import { PlanViewMode } from '../PlanNavigation'
import {
  loadPlanDayThunk,
  loadPlanMatrixThunk,
  preloadPlanDaysThunk,
} from '../PlanProducer'
import {
  PLAN_REFERENCE_DAY,
  PLAN_REFERENCE_NOW,
  planAt,
  planDayFixtures,
  planMatrixFixtures,
  planStateMocks,
} from '../PlanMocks'
import { PlanExceptions } from '../PlanException'
import { PlanLoadReason, initialPlanState } from '../PlanState'
import { DayViewRange } from '@kro/core'

const reducer = planSlice.reducer
const today = startOfPlanDay(PLAN_REFERENCE_DAY)
const todayKey = planDayKey(today)
const tomorrow = addingPlanDays(today, 1)

const recordOf = (endeavor: Endeavor): EndeavorRecord =>
  endeavorRecordFromEndeavor(endeavor, { now: PLAN_REFERENCE_DAY })

/** A store wired to a seeded on-device store and stubbed everything else. */
const storeWith = (records: readonly EndeavorRecord[] = []) =>
  makeStore({
    greetingService: stubbedGreetingService,
    localStore: makeInMemoryLocalStore({ endeavors: records }),
  })

// -------------------------------------------------------------- lifecycle

describe('onViewLoaded', () => {
  it('stamps the clock and the day the surface opened on (first mount)', () => {
    const next = reducer(
      initialPlanState,
      onViewLoaded({
        now: PLAN_REFERENCE_NOW,
        selectedDate: today,
        isQuickEventCreationEnabled: true,
      }),
    )
    expect(next.now).toEqual(PLAN_REFERENCE_NOW)
    expect(next.selectedDate).toEqual(today)
  })

  it('caches the quick-create flag so no Selector reaches for a flag service', () => {
    const next = reducer(
      initialPlanState,
      onViewLoaded({
        now: PLAN_REFERENCE_NOW,
        selectedDate: today,
        isQuickEventCreationEnabled: false,
      }),
    )
    expect(next.isQuickEventCreationEnabled).toBe(false)
  })

  it('leaves the day idle — mounting asks for data, it does not carry it', () => {
    const next = reducer(
      initialPlanState,
      onViewLoaded({
        now: PLAN_REFERENCE_NOW,
        selectedDate: today,
        isQuickEventCreationEnabled: true,
      }),
    )
    expect(next.dayLoad.kind).toBe('idle')
  })
})

describe('onClockTicked', () => {
  it('advances the "now" indicator', () => {
    const next = reducer(planStateMocks.loaded, onClockTicked({ now: planAt(11) }))
    expect(next.now).toEqual(planAt(11))
  })

  it('preserves the day that just ended when the clock crosses midnight', () => {
    const late = { ...planStateMocks.loaded, now: planAt(23, 59) }
    const next = reducer(
      late,
      onClockTicked({ now: new Date(tomorrow.getTime() + 60_000) }),
    )
    expect(next.preloadedDays[todayKey]).toHaveLength(3)
  })

  it('does not disturb the buffer on an ordinary minute tick', () => {
    const next = reducer(
      planStateMocks.loadedWithPreload,
      onClockTicked({ now: planAt(11) }),
    )
    expect(next.preloadedDays).toEqual(planStateMocks.loadedWithPreload.preloadedDays)
  })
})

describe('onPlanPreferencesLoaded', () => {
  it('narrows the band to Business hours when the preference says so', () => {
    const next = reducer(
      planStateMocks.loaded,
      onPlanPreferencesLoaded({
        dayViewRange: DayViewRange.business,
        showCompletedInTimeline: true,
      }),
    )
    expect(next.dayViewRange).toBe(DayViewRange.business)
  })

  it('hides completed items from the timeline when asked', () => {
    const next = reducer(
      planStateMocks.loaded,
      onPlanPreferencesLoaded({
        dayViewRange: DayViewRange.full,
        showCompletedInTimeline: false,
      }),
    )
    expect(next.showCompletedInTimeline).toBe(false)
  })

  it('leaves the loaded day untouched', () => {
    const next = reducer(
      planStateMocks.loaded,
      onPlanPreferencesLoaded({
        dayViewRange: DayViewRange.waking,
        showCompletedInTimeline: true,
      }),
    )
    expect(next.dayLoad).toEqual(planStateMocks.loaded.dayLoad)
  })
})

describe('onLensSnapshotRestored', () => {
  it('applies a restored snapshot', () => {
    const next = reducer(
      planStateMocks.loaded,
      onLensSnapshotRestored({
        visibility: {
          ...planStateMocks.loaded.visibility,
          hiddenCalendarIds: ['work'],
        },
      }),
    )
    expect(next.visibility.hiddenCalendarIds).toEqual(['work'])
  })

  it('leaves the vista defaults standing when there was no snapshot', () => {
    const next = reducer(
      planStateMocks.loaded,
      onLensSnapshotRestored({ visibility: null }),
    )
    expect(next.visibility).toEqual(planStateMocks.loaded.visibility)
  })

  it('never restores a value the snapshot does not carry', () => {
    const next = reducer(
      planStateMocks.loaded,
      onLensSnapshotRestored({
        visibility: { ...planStateMocks.loaded.visibility, searchQuery: 'demo' },
      }),
    )
    expect(next.visibility.searchQuery).toBe('demo')
    expect(next.dayViewRange).toBe(planStateMocks.loaded.dayViewRange)
  })
})

// ------------------------------------------------------------- navigation

describe('userDidSelectDate', () => {
  it('moves the timeline to the picked day', () => {
    const next = reducer(planStateMocks.loaded, userDidSelectDate({ date: tomorrow }))
    expect(next.selectedDate.getTime()).toBe(tomorrow.getTime())
  })

  it('normalises to that day’s midnight, whatever moment was tapped', () => {
    const next = reducer(
      planStateMocks.loaded,
      userDidSelectDate({ date: new Date(tomorrow.getTime() + 51_000_000) }),
    )
    expect(next.selectedDate.getTime()).toBe(tomorrow.getTime())
  })

  it('disarms an edit session left over from the day being left', () => {
    const next = reducer(planStateMocks.editing, userDidSelectDate({ date: tomorrow }))
    expect(next.editSession).toBeNull()
  })
})

describe('userDidStepDay', () => {
  it('steps forward a day', () => {
    const next = reducer(planStateMocks.loaded, userDidStepDay({ days: 1 }))
    expect(next.selectedDate.getTime()).toBe(tomorrow.getTime())
  })

  it('steps back a day', () => {
    const next = reducer(planStateMocks.loaded, userDidStepDay({ days: -1 }))
    expect(next.selectedDate.getTime()).toBe(addingPlanDays(today, -1).getTime())
  })

  it('stands still for a step of zero', () => {
    const next = reducer(planStateMocks.loaded, userDidStepDay({ days: 0 }))
    expect(next.selectedDate.getTime()).toBe(today.getTime())
  })
})

describe('userDidSelectViewMode', () => {
  it('switches to the list', () => {
    expect(
      reducer(
        planStateMocks.loaded,
        userDidSelectViewMode({ mode: PlanViewMode.list }),
      ).viewMode,
    ).toBe(PlanViewMode.list)
  })

  it('switches to the priority matrix', () => {
    expect(
      reducer(
        planStateMocks.loaded,
        userDidSelectViewMode({ mode: PlanViewMode.priorityMatrix }),
      ).viewMode,
    ).toBe(PlanViewMode.priorityMatrix)
  })

  it('re-selecting the current mode changes nothing else', () => {
    const next = reducer(
      planStateMocks.loaded,
      userDidSelectViewMode({ mode: PlanViewMode.timeline }),
    )
    expect(next.dayLoad).toEqual(planStateMocks.loaded.dayLoad)
  })
})

// ----------------------------------------------------------- quick create

describe('userDidPressTimelineSlot', () => {
  it('seeds an hour-long ghost at the pressed quarter hour', () => {
    const next = reducer(
      planStateMocks.loaded,
      userDidPressTimelineSlot({ index: 4, startHour: 8 }),
    )
    expect(next.quickCreate?.start).toEqual(planAt(9))
    expect(next.quickCreate?.durationSeconds).toBe(3600)
  })

  it('does nothing when the timelineQuickEventCreation flag is off', () => {
    const gated = { ...planStateMocks.loaded, isQuickEventCreationEnabled: false }
    expect(
      reducer(gated, userDidPressTimelineSlot({ index: 4, startHour: 8 }))
        .quickCreate,
    ).toBeNull()
  })

  it('does nothing while a card is armed — the slot layer is inert then', () => {
    expect(
      reducer(planStateMocks.editing, userDidPressTimelineSlot({ index: 4, startHour: 8 }))
        .quickCreate,
    ).toBeNull()
  })
})

describe('userDidRequestQuickCreateAt', () => {
  it('rounds an arbitrary moment to the nearest quarter hour', () => {
    const next = reducer(
      planStateMocks.loaded,
      userDidRequestQuickCreateAt({ moment: planAt(12, 23) }),
    )
    expect(next.quickCreate?.start.getMinutes()).toBe(30)
  })

  it('respects the same flag gate as a press', () => {
    const gated = { ...planStateMocks.loaded, isQuickEventCreationEnabled: false }
    expect(
      reducer(gated, userDidRequestQuickCreateAt({ moment: planAt(12) })).quickCreate,
    ).toBeNull()
  })

  it('is refused while a card is armed', () => {
    expect(
      reducer(planStateMocks.editing, userDidRequestQuickCreateAt({ moment: planAt(12) }))
        .quickCreate,
    ).toBeNull()
  })
})

describe('childCreationPromptDelegatedClose', () => {
  it('clears the ghost when the prompt was confirmed', () => {
    expect(
      reducer(planStateMocks.quickCreating, childCreationPromptDelegatedClose())
        .quickCreate,
    ).toBeNull()
  })

  it('clears it when the prompt was dismissed instead', () => {
    const dismissed = reducer(
      planStateMocks.quickCreating,
      childCreationPromptDelegatedClose(),
    )
    expect(dismissed.quickCreate).toBeNull()
  })

  it('is harmless when no ghost was showing', () => {
    expect(
      reducer(planStateMocks.loaded, childCreationPromptDelegatedClose()).quickCreate,
    ).toBeNull()
  })
})

// -------------------------------------------------------------- edit mode

describe('userDidHoldEventBlock', () => {
  it('arms the card the user held', () => {
    const next = reducer(
      planStateMocks.loaded,
      userDidHoldEventBlock({ endeavorId: 'nested-long' }),
    )
    expect(next.editSession?.endeavorId).toBe('nested-long')
    expect(next.editSession?.originalStart).toEqual(planAt(9))
  })

  it('refuses a past event, so history cannot be dragged', () => {
    const past = {
      ...planStateMocks.loaded,
      dayLoad: {
        kind: 'loaded' as const,
        dayKey: todayKey,
        events: planDayFixtures.pastEvent,
      },
    }
    expect(
      reducer(past, userDidHoldEventBlock({ endeavorId: 'past-breakfast' }))
        .editSession,
    ).toBeNull()
  })

  it('ignores a hold on a card that is not on the day', () => {
    expect(
      reducer(planStateMocks.loaded, userDidHoldEventBlock({ endeavorId: 'ghost' }))
        .editSession,
    ).toBeNull()
  })
})

describe('the drag arms', () => {
  const armed = reducer(
    planStateMocks.loaded,
    userDidHoldEventBlock({ endeavorId: 'nested-long' }),
  )

  it('captures a stable base when the finger lands on the body', () => {
    const next = reducer(armed, userDidGrabEditHandle({ handle: 'body' }))
    expect(next.editSession?.drag).toEqual({
      handle: 'body',
      baseStart: planAt(9),
      baseDurationSeconds: 4 * 3600,
    })
  })

  it('snaps a drag to the quarter hour and previews it', () => {
    const grabbed = reducer(armed, userDidGrabEditHandle({ handle: 'body' }))
    const dragged = reducer(
      grabbed,
      userDidDragEditHandle({ translationPx: 67 }),
    )
    expect(dragged.editSession?.draftStart).toEqual(planAt(10))
  })

  it('does not drift when frame after frame arrives from the same base', () => {
    let next = reducer(armed, userDidGrabEditHandle({ handle: 'body' }))
    for (const translationPx of [11, 29, 44, 58, 60]) {
      next = reducer(next, userDidDragEditHandle({ translationPx }))
    }
    expect(next.editSession?.draftStart).toEqual(planAt(10))
  })

  it('releases the base on lift, keeping the draft', () => {
    const grabbed = reducer(armed, userDidGrabEditHandle({ handle: 'body' }))
    const dragged = reducer(grabbed, userDidDragEditHandle({ translationPx: 60 }))
    const released = reducer(dragged, userDidReleaseEditHandle())
    expect(released.editSession?.drag).toBeNull()
    expect(released.editSession?.draftStart).toEqual(planAt(10))
  })

  it('ignores every drag arm when no card is armed', () => {
    expect(
      reducer(planStateMocks.loaded, userDidGrabEditHandle({ handle: 'start' }))
        .editSession,
    ).toBeNull()
    expect(
      reducer(planStateMocks.loaded, userDidDragEditHandle({ translationPx: 90 }))
        .editSession,
    ).toBeNull()
    expect(
      reducer(planStateMocks.loaded, userDidReleaseEditHandle()).editSession,
    ).toBeNull()
  })

  it('enforces the 15-minute minimum when a handle crosses its neighbour', () => {
    const grabbed = reducer(armed, userDidGrabEditHandle({ handle: 'start' }))
    const dragged = reducer(
      grabbed,
      userDidDragEditHandle({ translationPx: 600 }),
    )
    expect(dragged.editSession?.draftStart).toEqual(planAt(12, 45))
  })
})

describe('userDidTapOutsideEditingBlock', () => {
  it('writes the dragged times back into the day', () => {
    let next = reducer(
      planStateMocks.loaded,
      userDidHoldEventBlock({ endeavorId: 'nested-long' }),
    )
    next = reducer(next, userDidGrabEditHandle({ handle: 'body' }))
    next = reducer(next, userDidDragEditHandle({ translationPx: 60 }))
    next = reducer(next, userDidTapOutsideEditingBlock())

    const edited =
      next.dayLoad.kind === 'loaded'
        ? next.dayLoad.events.find((event) => event.id === 'nested-long')
        : undefined
    expect(edited?.start).toEqual(planAt(10))
    expect(next.editSession).toBeNull()
  })

  it('writes nothing when the card was held but never moved', () => {
    const armed = reducer(
      planStateMocks.loaded,
      userDidHoldEventBlock({ endeavorId: 'nested-long' }),
    )
    const next = reducer(armed, userDidTapOutsideEditingBlock())
    expect(next.dayLoad).toEqual(planStateMocks.loaded.dayLoad)
    expect(next.editSession).toBeNull()
  })

  it('is harmless when nothing is armed', () => {
    expect(
      reducer(planStateMocks.loaded, userDidTapOutsideEditingBlock()),
    ).toEqual(planStateMocks.loaded)
  })
})

describe('userDidDismissEditMode', () => {
  it('disarms without writing the draft', () => {
    let next = reducer(
      planStateMocks.loaded,
      userDidHoldEventBlock({ endeavorId: 'nested-long' }),
    )
    next = reducer(next, userDidGrabEditHandle({ handle: 'body' }))
    next = reducer(next, userDidDragEditHandle({ translationPx: 120 }))
    next = reducer(next, userDidDismissEditMode())
    expect(next.editSession).toBeNull()
    expect(next.dayLoad).toEqual(planStateMocks.loaded.dayLoad)
  })

  it('is harmless when nothing is armed', () => {
    expect(reducer(planStateMocks.loaded, userDidDismissEditMode()).editSession)
      .toBeNull()
  })

  it('leaves the selected day alone', () => {
    const next = reducer(planStateMocks.editing, userDidDismissEditMode())
    expect(next.selectedDate).toEqual(planStateMocks.editing.selectedDate)
  })
})

// ----------------------------------------------------------------- matrix

describe('userDidAssignToQuadrant', () => {
  it('raises an unrated row to 4 and keeps a due date that already falls today', () => {
    const next = reducer(
      planStateMocks.matrix,
      userDidAssignToQuadrant({
        endeavorId: 'matrix-no-value',
        quadrant: EisenhowerQuadrant.prioritize,
      }),
    )
    const row =
      next.matrixLoad.kind === 'loaded'
        ? next.matrixLoad.endeavors.find((e) => e.id === 'matrix-no-value')
        : undefined
    expect(row?.value).toBe(4)
    expect(row?.due).toEqual(planAt(16))
  })

  it('parks an urgent destination at 23:59:59 today when there is no due date', () => {
    const next = reducer(
      planStateMocks.matrix,
      userDidAssignToQuadrant({
        endeavorId: 'matrix-no-due',
        quadrant: EisenhowerQuadrant.prioritize,
      }),
    )
    const row =
      next.matrixLoad.kind === 'loaded'
        ? next.matrixLoad.endeavors.find((e) => e.id === 'matrix-no-due')
        : undefined
    expect(row?.due?.getHours()).toBe(23)
    expect(row?.due?.getMinutes()).toBe(59)
    expect(row?.due?.getSeconds()).toBe(59)
    expect(row?.value).toBe(5)
  })

  it('parks a non-urgent destination on the next Saturday morning', () => {
    const next = reducer(
      planStateMocks.matrix,
      userDidAssignToQuadrant({
        endeavorId: 'matrix-prioritize',
        quadrant: EisenhowerQuadrant.delete,
      }),
    )
    const row =
      next.matrixLoad.kind === 'loaded'
        ? next.matrixLoad.endeavors.find((e) => e.id === 'matrix-prioritize')
        : undefined
    expect(row?.due?.getDay()).toBe(6)
    expect(row?.due?.getHours()).toBe(9)
    expect(row?.value).toBe(2)
  })

  it('ignores an id no fetched cache holds', () => {
    const next = reducer(
      planStateMocks.matrix,
      userDidAssignToQuadrant({
        endeavorId: 'nobody',
        quadrant: EisenhowerQuadrant.decide,
      }),
    )
    expect(next.matrixLoad).toEqual(planStateMocks.matrix.matrixLoad)
  })
})

describe('userDidToggleVisibility', () => {
  it('hides a host', () => {
    const next = reducer(
      planStateMocks.loaded,
      userDidToggleVisibility({ axis: 'host', value: EndeavorHost.googleCalendar }),
    )
    expect(next.visibility.hiddenHosts).toEqual([EndeavorHost.googleCalendar])
  })

  it('reveals it again on a second toggle', () => {
    const hidden = reducer(
      planStateMocks.loaded,
      userDidToggleVisibility({ axis: 'host', value: EndeavorHost.googleCalendar }),
    )
    const shown = reducer(
      hidden,
      userDidToggleVisibility({ axis: 'host', value: EndeavorHost.googleCalendar }),
    )
    expect(shown.visibility.hiddenHosts).toEqual([])
  })

  it('hides one calendar without disturbing the kind filters', () => {
    const next = reducer(
      planStateMocks.loaded,
      userDidToggleVisibility({ axis: 'calendar', value: 'work' }),
    )
    expect(next.visibility.hiddenCalendarIds).toEqual(['work'])
    expect(next.visibility.hiddenKinds).toEqual(
      planStateMocks.loaded.visibility.hiddenKinds,
    )
  })
})

// ------------------------------------------------- thunk lifecycle arms

describe('loadPlanDayThunk lifecycle', () => {
  const event = makeEndeavor({
    id: 'today-standup',
    title: 'Standup',
    kind: EndeavorKind.calendarEvent,
    status: EndeavorStatus.planned,
    start: planAt(9),
    duration: 900,
    hostedBy: [EndeavorHost.local],
  })

  it('loads the day and settles the manual-refresh marker (user pulls to refresh)', async () => {
    const store = storeWith([recordOf(event)])
    await store.dispatch(
      loadPlanDayThunk({ day: today, reason: PlanLoadReason.manual }),
    )
    const { dayLoad, activity } = store.getState().plan
    expect(dayLoad.kind).toBe('loaded')
    if (dayLoad.kind === 'loaded') {
      expect(dayLoad.events.map((e) => e.id)).toEqual(['today-standup'])
      expect(dayLoad.dayKey).toBe(todayKey)
    }
    expect(activity.isRefreshing).toBe(false)
  })

  it('records an empty day as loaded and still settles the marker', async () => {
    const store = storeWith()
    await store.dispatch(
      loadPlanDayThunk({ day: today, reason: PlanLoadReason.appWide }),
    )
    const { dayLoad, activity } = store.getState().plan
    expect(dayLoad.kind).toBe('loaded')
    expect(activity.isAppLoading).toBe(false)
  })

  it('raises the matching marker while the read is still in flight', () => {
    const store = storeWith()
    const inFlight = store.dispatch(
      loadPlanDayThunk({ day: today, reason: PlanLoadReason.manual }),
    )
    expect(store.getState().plan.activity.isRefreshing).toBe(true)
    expect(store.getState().plan.dayLoad.kind).toBe('loading')
    return inFlight
  })

  it('surfaces a typed exception when the store cannot be read (device full)', async () => {
    const broken = makeInMemoryLocalStore()
    const store = makeStore({
      greetingService: stubbedGreetingService,
      localStore: {
        ...broken,
        endeavors: {
          ...broken.endeavors,
          all: async () => {
            throw new Error('QuotaExceededError')
          },
        },
      },
    })
    await store.dispatch(
      loadPlanDayThunk({ day: today, reason: PlanLoadReason.manual }),
    )
    const { dayLoad, activity } = store.getState().plan
    expect(dayLoad.kind).toBe('loaded')
    // Per-host best effort: one failing host contributes nothing but never
    // fails the fan-out, so the day loads empty rather than erroring.
    expect(activity.isRefreshing).toBe(false)
  })
})

describe('preloadPlanDaysThunk lifecycle', () => {
  const neighbour = makeEndeavor({
    id: 'tomorrow-demo',
    title: 'Demo',
    kind: EndeavorKind.calendarEvent,
    start: new Date(tomorrow.getTime() + 15 * 3_600_000),
    duration: 3600,
    hostedBy: [EndeavorHost.local],
  })

  const todayEvent = makeEndeavor({
    id: 'today-standup',
    title: 'Standup',
    kind: EndeavorKind.calendarEvent,
    start: planAt(9),
    duration: 900,
    hostedBy: [EndeavorHost.local],
  })

  it('installs the neighbouring days without touching the authoritative one', async () => {
    const store = storeWith([recordOf(todayEvent), recordOf(neighbour)])
    store.dispatch(
      onViewLoaded({
        now: PLAN_REFERENCE_NOW,
        selectedDate: today,
        isQuickEventCreationEnabled: true,
      }),
    )
    await store.dispatch(
      loadPlanDayThunk({ day: today, reason: PlanLoadReason.appWide }),
    )
    const authoritativeBefore = store.getState().plan.dayLoad

    await store.dispatch(preloadPlanDaysThunk({ center: today }))
    const { dayLoad, preloadedDays, activity } = store.getState().plan

    expect(dayLoad).toEqual(authoritativeBefore)
    expect(preloadedDays[todayKey]).toBeUndefined()
    expect(preloadedDays[planDayKey(tomorrow)]?.map((e) => e.id)).toEqual([
      'tomorrow-demo',
    ])
    expect(activity.preloadCenterDayKey).toBeNull()
  })

  it('settles its marker on an empty window rather than latching on', async () => {
    const store = storeWith()
    await store.dispatch(preloadPlanDaysThunk({ center: today }))
    expect(store.getState().plan.activity.preloadCenterDayKey).toBeNull()
  })

  it('does not install a window the user has already navigated away from', async () => {
    const store = storeWith([recordOf(neighbour)])
    store.dispatch(
      onViewLoaded({
        now: PLAN_REFERENCE_NOW,
        selectedDate: today,
        isQuickEventCreationEnabled: true,
      }),
    )
    const inFlight = store.dispatch(preloadPlanDaysThunk({ center: today }))
    store.dispatch(userDidSelectDate({ date: addingPlanDays(today, 10) }))
    await inFlight
    expect(store.getState().plan.preloadedDays).toEqual({})
    expect(store.getState().plan.preloadedCenterDayKey).toBeNull()
  })
})

/**
 * The `.rejected` arms are defensive only — every Producer here catches its own
 * failures and resolves `err(...)`, so these should be structurally
 * unreachable. Each gets exactly one scenario proving it degrades to a generic
 * exception rather than crashing, and one proving cancellation stays silent
 * (`RC-26`, `UZF-14`).
 */
describe('the defensive .rejected arms', () => {
  const dayArg = { day: today, reason: PlanLoadReason.manual }

  it('degrades a genuinely unexpected day-read throw to a generic exception', () => {
    const next = reducer(
      planStateMocks.loading,
      loadPlanDayThunk.rejected(new Error('serialisation blew up'), 'req-1', dayArg),
    )
    expect(next.dayLoad.kind).toBe('failed')
    if (next.dayLoad.kind === 'failed') {
      expect(next.dayLoad.exception.kind).toBe('unknown')
    }
    expect(next.activity.isRefreshing).toBe(false)
  })

  it('paints no exception when a day read is cancelled — the one silent exit', async () => {
    const store = storeWith()
    const inFlight = store.dispatch(loadPlanDayThunk(dayArg))
    inFlight.abort()
    await inFlight
    expect(store.getState().plan.dayLoad.kind).toBe('loading')
  })

  it('settles the preload marker on an unexpected throw', () => {
    const started = reducer(
      planStateMocks.everythingLoading,
      preloadPlanDaysThunk.rejected(new Error('boom'), 'req-2', { center: today }),
    )
    expect(started.activity.preloadCenterDayKey).toBeNull()
  })

  it('leaves the preload marker alone when the window was cancelled', async () => {
    const store = storeWith()
    store.dispatch(
      onViewLoaded({
        now: PLAN_REFERENCE_NOW,
        selectedDate: today,
        isQuickEventCreationEnabled: true,
      }),
    )
    const inFlight = store.dispatch(preloadPlanDaysThunk({ center: today }))
    inFlight.abort()
    await inFlight
    expect(store.getState().plan.activity.preloadCenterDayKey).toBe(todayKey)
  })

  it('routes a resolved day failure into the same exception shape', () => {
    // `.fulfilled` carrying `err(...)` is the primary failure path (`RC-26`);
    // today every host is best-effort so it is unreachable end to end, but the
    // arm still has to settle the marker it raised.
    const next = reducer(
      planStateMocks.loading,
      loadPlanDayThunk.fulfilled(
        { ok: false, error: PlanExceptions.dayLoadFailed('offline') },
        'req-4',
        dayArg,
      ),
    )
    expect(next.dayLoad.kind).toBe('failed')
    expect(next.activity.isRefreshing).toBe(false)
  })

  it('settles a resolved preload failure from the window the exception names', () => {
    const next = reducer(
      planStateMocks.everythingLoading,
      preloadPlanDaysThunk.fulfilled(
        { ok: false, error: PlanExceptions.preloadFailed(todayKey, 'offline') },
        'req-5',
        { center: today },
      ),
    )
    expect(next.activity.preloadCenterDayKey).toBeNull()
    // Last-good-value: the buffer itself is untouched.
    expect(next.preloadedDays).toEqual(
      planStateMocks.everythingLoading.preloadedDays,
    )
  })

  it('degrades an unexpected matrix throw to a generic exception', () => {
    const next = reducer(
      planStateMocks.loaded,
      loadPlanMatrixThunk.rejected(new Error('boom'), 'req-3'),
    )
    expect(next.matrixLoad.kind).toBe('failed')
    if (next.matrixLoad.kind === 'failed') {
      expect(next.matrixLoad.exception.kind).toBe('unknown')
    }
  })

  it('leaves the matrix untouched when its read was cancelled', async () => {
    const store = storeWith()
    const inFlight = store.dispatch(loadPlanMatrixThunk())
    inFlight.abort()
    await inFlight
    expect(store.getState().plan.matrixLoad.kind).toBe('loading')
  })
})

describe('loadPlanMatrixThunk lifecycle', () => {
  it('loads the task-shaped rows the matrix reads', async () => {
    const store = storeWith([recordOf(planMatrixFixtures.urgentImportant)])
    await store.dispatch(loadPlanMatrixThunk())
    const { matrixLoad } = store.getState().plan
    expect(matrixLoad.kind).toBe('loaded')
    if (matrixLoad.kind === 'loaded') {
      expect(matrixLoad.endeavors.map((e) => e.id)).toEqual(['matrix-prioritize'])
    }
  })

  it('is loading while the read is in flight', () => {
    const store = storeWith()
    const inFlight = store.dispatch(loadPlanMatrixThunk())
    expect(store.getState().plan.matrixLoad.kind).toBe('loading')
    return inFlight
  })

  it('surfaces a typed exception rather than throwing out of the reducer', async () => {
    const broken = makeInMemoryLocalStore()
    const store = makeStore({
      greetingService: stubbedGreetingService,
      localStore: {
        ...broken,
        endeavors: {
          ...broken.endeavors,
          all: async () => {
            throw new Error('store closed')
          },
        },
      },
    })
    await store.dispatch(loadPlanMatrixThunk())
    const { matrixLoad } = store.getState().plan
    expect(matrixLoad.kind).toBe('failed')
    if (matrixLoad.kind === 'failed') {
      expect(matrixLoad.exception.kind).toBe('dayLoadFailed')
    }
  })
})
