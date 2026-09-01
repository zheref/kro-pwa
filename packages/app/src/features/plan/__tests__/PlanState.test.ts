import { EndeavorsVistas } from '@kro/core'
import { describe, expect, it } from 'vitest'
import { PlanViewMode } from '../PlanNavigation'
import {
  PLAN_EPOCH,
  PlanLoadReason,
  initialPlanState,
  initialPlanVisibility,
} from '../PlanState'

describe('initialPlanState', () => {
  it('opens on the timeline, the destination canon defaults to', () => {
    expect(initialPlanState.viewMode).toBe(PlanViewMode.timeline)
  })

  it('starts idle — mounting asks for data rather than pretending to have it', () => {
    expect(initialPlanState.dayLoad).toEqual({ kind: 'idle' })
    expect(initialPlanState.matrixLoad).toEqual({ kind: 'idle' })
  })

  it('seeds the clock from the epoch, not the wall clock', () => {
    // A module-level `new Date()` would make every suite's baseline depend on
    // when it ran; `onViewLoaded` stamps the real instant instead.
    expect(initialPlanState.now).toEqual(PLAN_EPOCH)
    expect(initialPlanState.selectedDate).toEqual(PLAN_EPOCH)
  })

  it('carries no activity, no buffer, no edit session and no ghost', () => {
    expect(initialPlanState.activity).toEqual({
      isRefreshing: false,
      isAppLoading: false,
      preloadCenterDayKey: null,
    })
    expect(initialPlanState.preloadedDays).toEqual({})
    expect(initialPlanState.preloadedCenterDayKey).toBeNull()
    expect(initialPlanState.editSession).toBeNull()
    expect(initialPlanState.quickCreate).toBeNull()
  })

  it('leaves both gates off until a resolved flag says otherwise', () => {
    // The band and the completed filter are NOT here: they are preferences,
    // read from the settings snapshot through `selectPlanDayViewRange` and
    // `selectPlanShowsCompleted` (KC-IS-#71 item 19). Mirroring them onto the
    // slice needed a sync path that never existed, which is why the mirror
    // silently ignored whatever the user chose in Settings.
    expect(initialPlanState.isQuickEventCreationEnabled).toBe(false)
    expect(initialPlanState.enabledCapabilityFlags).toEqual([])
  })
})

describe('initialPlanVisibility', () => {
  it('is read from the .planDay vista rather than restated', () => {
    const lens = EndeavorsVistas.planDay.lens
    expect(initialPlanVisibility.showArchived).toBe(lens.showArchived)
    expect(initialPlanVisibility.grouping).toBe(lens.grouping)
  })

  it('hides nothing by default, on every axis', () => {
    expect(initialPlanVisibility.hiddenKinds).toEqual([])
    expect(initialPlanVisibility.hiddenHosts).toEqual([])
    expect(initialPlanVisibility.hiddenStatuses).toEqual([])
    expect(initialPlanVisibility.hiddenComputedStates).toEqual([])
    expect(initialPlanVisibility.hiddenCalendarIds).toEqual([])
  })

  it('stores plain arrays, so the state stays serialisable', () => {
    for (const value of [
      initialPlanVisibility.hiddenKinds,
      initialPlanVisibility.hiddenHosts,
      initialPlanVisibility.hiddenStatuses,
      initialPlanVisibility.hiddenComputedStates,
      initialPlanVisibility.hiddenCalendarIds,
    ]) {
      expect(Array.isArray(value)).toBe(true)
    }
  })
})

describe('PlanLoadReason', () => {
  it('names exactly the two reasons a day read can start for', () => {
    expect(Object.values(PlanLoadReason).sort()).toEqual(['appWide', 'manual'])
  })

  it('uses its own raw values, which persist nowhere but in an action', () => {
    expect(PlanLoadReason.manual).toBe('manual')
    expect(PlanLoadReason.appWide).toBe('appWide')
  })

  it('keeps the two distinct, so one settling never settles the other', () => {
    expect(PlanLoadReason.manual).not.toBe(PlanLoadReason.appWide)
  })
})
