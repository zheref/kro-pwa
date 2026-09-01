import {
  EndeavorOperation,
  EndeavorStatus,
  type LocalStore,
  type Result,
} from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  type AppStore,
  makeStore,
  stubbedThunkExtra,
} from '../../../library/store'
import { makeInMemoryLocalStore } from '../../../services/localStore/InMemoryLocalStore'
import type { CaptureException } from '../CaptureException'
import {
  captureSlice,
  initialCaptureState,
  onCaptureRouteDelivered,
  onTriageRequestConsumed,
  onUndoWindowTicked,
  userDidAdjustAddForTodayTime,
  userDidBeginTimeEdit,
  userDidCancelAddForToday,
  userDidClearDate,
  userDidDiscardCapture,
  userDidDismissInbox,
  userDidEditTitle,
  userDidEndTimeEdit,
  userDidPickDate,
  userDidPickRecurrence,
  userDidPickRewards,
  userDidPickTime,
  userDidRequestAddForToday,
  userDidRequestCapture,
  userDidSelectDestination,
  userDidSelectKind,
  userDidTapOpenInbox,
  userDidTapTriage,
} from '../CaptureFeature'
import {
  CAPTURE_MOCK_NOW,
  captureDraftFixtures,
  captureEndeavorFixtures,
  captureFixtureRecords,
  captureMockAt,
  captureStateMocks,
} from '../CaptureMocks'
import {
  applyInboxOperationThunk,
  loadCaptureContextThunk,
  scheduleForTodayThunk,
  submitCaptureThunk,
  undoScheduleForTodayThunk,
} from '../CaptureProducer'
import {
  ADD_FOR_TODAY_UNDO_WINDOW_MS,
  CaptureDestination,
  CaptureKind,
  type CaptureSchedulingSnapshot,
} from '../CaptureRules'

const reduce = captureSlice.reducer
const loaded = captureStateMocks.loadedPool
const openPrompt = captureStateMocks.promptOpenOnTask

/** A store wired to a stubbed `LocalStore` — never a second `configureStore`. */
const storeWith = (localStore: LocalStore): AppStore =>
  makeStore({ ...stubbedThunkExtra, localStore })

const seeded = () =>
  makeInMemoryLocalStore({ endeavors: captureFixtureRecords() })

/** Loads the pool the way the surface does, so an arm sees real rows. */
const loadedStore = async (localStore: LocalStore = seeded()) => {
  const store = storeWith(localStore)
  await store.dispatch(loadCaptureContextThunk({ now: CAPTURE_MOCK_NOW }))
  return store
}

const undoSnapshotOf = (store: AppStore): CaptureSchedulingSnapshot => {
  const undo = store.getState().capture.undo
  if (undo.kind !== 'armed') throw new Error('expected an armed undo window')
  return undo.snapshot
}

// ---------------------------------------------------------------------------
// Prompt arms
// ---------------------------------------------------------------------------

describe('userDidRequestCapture', () => {
  it('opens the prompt on the kind the FAB offered', () => {
    const next = reduce(
      loaded,
      userDidRequestCapture({ kind: CaptureKind.task, now: CAPTURE_MOCK_NOW }),
    )
    expect(next.prompt?.draft.kind).toBe(CaptureKind.task)
  })

  it('opens a timeline press-to-create already scheduled', () => {
    const next = reduce(
      loaded,
      userDidRequestCapture({
        kind: CaptureKind.event,
        now: CAPTURE_MOCK_NOW,
        initialStart: captureMockAt(17, 16, 0),
      }),
    )
    expect(next.prompt?.draft.hasTime).toBe(true)
    expect(next.prompt?.draft.time).toEqual(captureMockAt(17, 16, 0))
  })

  it('starts a second capture from scratch rather than reusing the last draft', () => {
    const typed = reduce(openPrompt, userDidEditTitle({ title: 'Half typed' }))
    const reopened = reduce(
      typed,
      userDidRequestCapture({ kind: CaptureKind.task, now: CAPTURE_MOCK_NOW }),
    )
    expect(reopened.prompt?.draft.title).toBe('')
  })
})

describe('userDidDiscardCapture', () => {
  it('closes the prompt when the user backs out', () => {
    expect(reduce(openPrompt, userDidDiscardCapture()).prompt).toBeNull()
  })

  it('captures nothing', () => {
    const next = reduce(
      captureStateMocks.promptReadyToSubmit,
      userDidDiscardCapture(),
    )
    expect(next.endeavors).toHaveLength(loaded.endeavors.length)
  })

  it('is harmless when no prompt is open', () => {
    expect(reduce(loaded, userDidDiscardCapture())).toEqual(loaded)
  })
})

describe('userDidEditTitle', () => {
  it('records what the user types', () => {
    expect(
      reduce(openPrompt, userDidEditTitle({ title: 'Book the flights' })).prompt
        ?.draft.title,
    ).toBe('Book the flights')
  })

  it('accepts a cleared field', () => {
    const typed = reduce(openPrompt, userDidEditTitle({ title: 'Book' }))
    expect(
      reduce(typed, userDidEditTitle({ title: '' })).prompt?.draft.title,
    ).toBe('')
  })

  it('ignores a keystroke that lands after the prompt closed', () => {
    expect(reduce(loaded, userDidEditTitle({ title: 'orphan' }))).toEqual(
      loaded,
    )
  })
})

describe('userDidSelectKind', () => {
  it('switches to the tapped chip', () => {
    expect(
      reduce(openPrompt, userDidSelectKind({ kind: CaptureKind.event })).prompt
        ?.draft.kind,
    ).toBe(CaptureKind.event)
  })

  it('keeps the typed title across the switch', () => {
    const typed = reduce(openPrompt, userDidEditTitle({ title: 'Team sync' }))
    expect(
      reduce(typed, userDidSelectKind({ kind: CaptureKind.event })).prompt
        ?.draft.title,
    ).toBe('Team sync')
  })

  it('ignores the chip when no prompt is open', () => {
    expect(
      reduce(loaded, userDidSelectKind({ kind: CaptureKind.habit })),
    ).toEqual(loaded)
  })
})

describe('userDidPickDate', () => {
  it('moves the capture to another day', () => {
    expect(
      reduce(openPrompt, userDidPickDate({ date: captureMockAt(18, 0, 0) }))
        .prompt?.draft.date,
    ).toEqual(captureMockAt(18, 0, 0))
  })

  it('leaves the time uncommitted', () => {
    expect(
      reduce(openPrompt, userDidPickDate({ date: captureMockAt(18, 0, 0) }))
        .prompt?.draft.hasTime,
    ).toBe(false)
  })

  it('is harmless when no prompt is open', () => {
    expect(
      reduce(loaded, userDidPickDate({ date: captureMockAt(18, 0, 0) })),
    ).toEqual(loaded)
  })
})

describe('userDidClearDate', () => {
  it('unsets the date on a Task — the KC-IS-#75 dateless-capture affordance', () => {
    expect(reduce(openPrompt, userDidClearDate()).prompt?.draft.hasDate).toBe(
      false,
    )
  })

  it('leaves an Event dated — it has no way to represent one missing', () => {
    const event = reduce(
      openPrompt,
      userDidSelectKind({ kind: CaptureKind.event }),
    )
    expect(reduce(event, userDidClearDate()).prompt?.draft.hasDate).toBe(true)
  })

  it('is harmless when no prompt is open', () => {
    expect(reduce(loaded, userDidClearDate())).toEqual(loaded)
  })
})

describe('the time picker arms', () => {
  it('commits the time as soon as the picker opens', () => {
    const next = reduce(openPrompt, userDidBeginTimeEdit({ field: 'start' }))
    expect(next.prompt?.draft.hasTime).toBe(true)
  })

  it('follows the wheel while it turns', () => {
    const editing = reduce(openPrompt, userDidBeginTimeEdit({ field: 'start' }))
    const picked = reduce(
      editing,
      userDidPickTime({ field: 'start', time: captureMockAt(17, 11, 30) }),
    )
    expect(picked.prompt?.draft.time).toEqual(captureMockAt(17, 11, 30))
  })

  it('reverts to unscheduled when the user discards the edit', () => {
    const editing = reduce(openPrompt, userDidBeginTimeEdit({ field: 'start' }))
    const picked = reduce(
      editing,
      userDidPickTime({ field: 'start', time: captureMockAt(17, 11, 30) }),
    )
    const discarded = reduce(
      picked,
      userDidEndTimeEdit({ field: 'start', outcome: 'discard' }),
    )
    expect(discarded.prompt?.draft.hasTime).toBe(false)
  })

  it('keeps the time when the user taps Done', () => {
    const editing = reduce(openPrompt, userDidBeginTimeEdit({ field: 'start' }))
    const done = reduce(
      editing,
      userDidEndTimeEdit({ field: 'start', outcome: 'done' }),
    )
    expect(done.prompt?.draft.hasTime).toBe(true)
    expect(done.prompt?.startEdit).toBeNull()
  })
})

describe('userDidPickRewards', () => {
  it('records the chosen points', () => {
    expect(
      reduce(openPrompt, userDidPickRewards({ points: 30 })).prompt?.draft
        .rewards,
    ).toBe(30)
  })

  it('clamps a stepper that ran past its bounds', () => {
    expect(
      reduce(openPrompt, userDidPickRewards({ points: 10_000 })).prompt?.draft
        .rewards,
    ).toBe(999)
  })

  it('is harmless when no prompt is open', () => {
    expect(reduce(loaded, userDidPickRewards({ points: 30 }))).toEqual(loaded)
  })
})

describe('userDidPickRecurrence', () => {
  it('records a repeating capture', () => {
    expect(
      reduce(
        openPrompt,
        userDidPickRecurrence({ recurrence: { kind: 'daily', interval: 1 } }),
      ).prompt?.draft.recurrence,
    ).toEqual({ kind: 'daily', interval: 1 })
  })

  it('records a return to a one-off', () => {
    const repeating = reduce(
      openPrompt,
      userDidPickRecurrence({ recurrence: { kind: 'daily', interval: 1 } }),
    )
    expect(
      reduce(
        repeating,
        userDidPickRecurrence({ recurrence: { kind: 'never' } }),
      ).prompt?.draft.recurrence,
    ).toEqual({ kind: 'never' })
  })

  it('is harmless when no prompt is open', () => {
    expect(
      reduce(loaded, userDidPickRecurrence({ recurrence: { kind: 'never' } })),
    ).toEqual(loaded)
  })
})

describe('userDidSelectDestination', () => {
  it('points the draft at the chosen host', () => {
    expect(
      reduce(
        openPrompt,
        userDidSelectDestination({ destination: CaptureDestination.kroCloud }),
      ).prompt?.draft.destination,
    ).toBe(CaptureDestination.kroCloud)
  })

  it('does not remember it until something is captured', () => {
    expect(
      reduce(
        openPrompt,
        userDidSelectDestination({ destination: CaptureDestination.kroCloud }),
      ).lastUsedDestination,
    ).toBe(CaptureDestination.local)
  })

  it('is harmless when no prompt is open', () => {
    expect(
      reduce(
        loaded,
        userDidSelectDestination({ destination: CaptureDestination.kroCloud }),
      ),
    ).toEqual(loaded)
  })
})

// ---------------------------------------------------------------------------
// Inbox arms
// ---------------------------------------------------------------------------

describe('userDidTapOpenInbox', () => {
  it('opens the sheet from the Plan tab', () => {
    expect(reduce(loaded, userDidTapOpenInbox()).inbox.isOpen).toBe(true)
  })

  it('shows no Just Created row on a manual open', () => {
    expect(
      reduce(loaded, userDidTapOpenInbox()).inbox.justCreatedEndeavorId,
    ).toBeNull()
  })

  it('drops a previous Just Created row on the next open', () => {
    const afterCapture = captureStateMocks.inboxOpenWithJustCreated
    const dismissed = reduce(afterCapture, userDidDismissInbox())
    expect(
      reduce(dismissed, userDidTapOpenInbox()).inbox.justCreatedEndeavorId,
    ).toBeNull()
  })
})

describe('userDidDismissInbox', () => {
  it('closes the sheet', () => {
    expect(
      reduce(captureStateMocks.inboxOpenWithJustCreated, userDidDismissInbox())
        .inbox.isOpen,
    ).toBe(false)
  })

  it('closes an open scheduling popover with it', () => {
    expect(
      reduce(captureStateMocks.addForTodayOpen, userDidDismissInbox())
        .addForToday,
    ).toBeNull()
  })

  it('is harmless when the sheet is already closed', () => {
    expect(reduce(loaded, userDidDismissInbox()).inbox.isOpen).toBe(false)
  })
})

describe('userDidTapTriage', () => {
  it('raises the request for the tapped row', () => {
    const next = reduce(
      loaded,
      userDidTapTriage({ endeavorId: 'fresh-task', now: CAPTURE_MOCK_NOW }),
    )
    expect(next.triageRequest?.endeavorId).toBe('fresh-task')
  })

  it('seeds it with today’s first free gap', () => {
    const next = reduce(
      loaded,
      userDidTapTriage({ endeavorId: 'fresh-task', now: CAPTURE_MOCK_NOW }),
    )
    expect(next.triageRequest?.nextFreeSlotToday).toEqual(
      captureMockAt(17, 10, 15),
    )
  })

  it('ignores a stale row id', () => {
    expect(
      reduce(
        loaded,
        userDidTapTriage({ endeavorId: 'gone', now: CAPTURE_MOCK_NOW }),
      ).triageRequest,
    ).toBeNull()
  })
})

describe('onTriageRequestConsumed', () => {
  it('spends the one-shot', () => {
    const requested = reduce(
      loaded,
      userDidTapTriage({ endeavorId: 'fresh-task', now: CAPTURE_MOCK_NOW }),
    )
    expect(
      reduce(requested, onTriageRequestConsumed()).triageRequest,
    ).toBeNull()
  })

  it('is harmless when nothing was requested', () => {
    expect(reduce(loaded, onTriageRequestConsumed())).toEqual(loaded)
  })

  it('leaves the pool alone', () => {
    const requested = reduce(
      loaded,
      userDidTapTriage({ endeavorId: 'fresh-task', now: CAPTURE_MOCK_NOW }),
    )
    expect(reduce(requested, onTriageRequestConsumed()).endeavors).toEqual(
      loaded.endeavors,
    )
  })
})

// ---------------------------------------------------------------------------
// Routing arm
// ---------------------------------------------------------------------------

describe('onCaptureRouteDelivered', () => {
  const pending = captureStateMocks.taskCapturedAwaitingInbox

  it('opens the Inbox once the prompt has had time to dismiss', () => {
    const delivered = reduce(
      pending,
      onCaptureRouteDelivered({
        now: new Date(CAPTURE_MOCK_NOW.getTime() + 500),
      }),
    )
    expect(delivered.inbox).toEqual({
      isOpen: true,
      justCreatedEndeavorId: 'captured-task',
    })
  })

  it('refuses to open it early', () => {
    const early = reduce(
      pending,
      onCaptureRouteDelivered({
        now: new Date(CAPTURE_MOCK_NOW.getTime() + 100),
      }),
    )
    expect(early.inbox.isOpen).toBe(false)
    expect(early.navigation).not.toBeNull()
  })

  it('never opens the Inbox for an event capture', () => {
    const delivered = reduce(
      captureStateMocks.eventCapturedAwaitingPlan,
      onCaptureRouteDelivered({
        now: new Date(CAPTURE_MOCK_NOW.getTime() + 500),
      }),
    )
    expect(delivered.inbox.isOpen).toBe(false)
    expect(delivered.navigation).toBeNull()
  })

  it('is harmless when there is nothing pending', () => {
    expect(
      reduce(loaded, onCaptureRouteDelivered({ now: CAPTURE_MOCK_NOW })),
    ).toEqual(loaded)
  })
})

// ---------------------------------------------------------------------------
// Add-for-Today arms
// ---------------------------------------------------------------------------

describe('userDidRequestAddForToday', () => {
  it('opens the popover pre-filled with the next quarter hour', () => {
    const next = reduce(
      loaded,
      userDidRequestAddForToday({
        endeavorId: 'fresh-task',
        now: CAPTURE_MOCK_NOW,
      }),
    )
    expect(next.addForToday).toEqual({
      endeavorId: 'fresh-task',
      pickedTime: captureMockAt(17, 10, 15),
    })
  })

  it('re-aims the popover at another row', () => {
    const first = reduce(
      loaded,
      userDidRequestAddForToday({
        endeavorId: 'fresh-task',
        now: CAPTURE_MOCK_NOW,
      }),
    )
    const second = reduce(
      first,
      userDidRequestAddForToday({
        endeavorId: 'neglected-task',
        now: CAPTURE_MOCK_NOW,
      }),
    )
    expect(second.addForToday?.endeavorId).toBe('neglected-task')
  })

  it('ignores a stale row id', () => {
    expect(
      reduce(
        loaded,
        userDidRequestAddForToday({
          endeavorId: 'gone',
          now: CAPTURE_MOCK_NOW,
        }),
      ).addForToday,
    ).toBeNull()
  })
})

describe('userDidAdjustAddForTodayTime', () => {
  it('follows the popover’s picker', () => {
    expect(
      reduce(
        captureStateMocks.addForTodayOpen,
        userDidAdjustAddForTodayTime({ time: captureMockAt(17, 17, 0) }),
      ).addForToday?.pickedTime,
    ).toEqual(captureMockAt(17, 17, 0))
  })

  it('keeps the popover on the same row', () => {
    expect(
      reduce(
        captureStateMocks.addForTodayOpen,
        userDidAdjustAddForTodayTime({ time: captureMockAt(17, 17, 0) }),
      ).addForToday?.endeavorId,
    ).toBe('fresh-task')
  })

  it('is harmless when no popover is open', () => {
    expect(
      reduce(
        loaded,
        userDidAdjustAddForTodayTime({ time: captureMockAt(17, 17, 0) }),
      ),
    ).toEqual(loaded)
  })
})

describe('userDidCancelAddForToday', () => {
  it('closes the popover', () => {
    expect(
      reduce(captureStateMocks.addForTodayOpen, userDidCancelAddForToday())
        .addForToday,
    ).toBeNull()
  })

  it('schedules nothing', () => {
    const cancelled = reduce(
      captureStateMocks.addForTodayOpen,
      userDidCancelAddForToday(),
    )
    expect(
      cancelled.endeavors.find((value) => value.id === 'fresh-task')?.due,
    ).toBeNull()
  })

  it('is harmless when no popover is open', () => {
    expect(reduce(loaded, userDidCancelAddForToday())).toEqual(loaded)
  })
})

describe('onUndoWindowTicked', () => {
  const armed = captureStateMocks.undoArmed

  it('keeps the toast up a millisecond before the deadline', () => {
    expect(
      reduce(
        armed,
        onUndoWindowTicked({
          now: new Date(
            CAPTURE_MOCK_NOW.getTime() + ADD_FOR_TODAY_UNDO_WINDOW_MS - 1,
          ),
        }),
      ).undo.kind,
    ).toBe('armed')
  })

  it('expires the window on the deadline', () => {
    expect(
      reduce(
        armed,
        onUndoWindowTicked({
          now: new Date(
            CAPTURE_MOCK_NOW.getTime() + ADD_FOR_TODAY_UNDO_WINDOW_MS,
          ),
        }),
      ).undo,
    ).toEqual({ kind: 'expired' })
  })

  it('is harmless when nothing is armed', () => {
    expect(
      reduce(loaded, onUndoWindowTicked({ now: CAPTURE_MOCK_NOW })),
    ).toEqual(loaded)
  })
})

// ---------------------------------------------------------------------------
// Thunk lifecycle arms — driven through the real thunks (RC-54)
// ---------------------------------------------------------------------------

describe('loading the capture context', () => {
  it('installs the stored pool the user will triage', async () => {
    const store = await loadedStore()
    const slice = store.getState().capture

    expect(slice.load).toEqual({ kind: 'loaded' })
    expect(slice.endeavors.map((value) => value.id)).toContain('fresh-task')
  })

  it('restores the destination the user last captured to', async () => {
    const localStore = seeded()
    localStore.preferences.set('lastEndeavorHostingDestination', 'kroCloud')

    const store = await loadedStore(localStore)
    expect(store.getState().capture.lastUsedDestination).toBe(
      CaptureDestination.kroCloud,
    )
  })

  it('surfaces an exception rather than throwing when the store is unreadable', async () => {
    const localStore = seeded()
    const broken: LocalStore = {
      ...localStore,
      endeavors: {
        ...localStore.endeavors,
        all: () => Promise.reject(new Error('database closed')),
      },
    }

    const store = await loadedStore(broken)
    const { load } = store.getState().capture
    expect(load.kind).toBe('failed')
    if (load.kind === 'failed') {
      expect(load.exception.kind).toBe('contextLoadFailed')
    }
  })
})

describe('submitting a capture', () => {
  it('adds a task to the pool and closes the prompt', async () => {
    const store = await loadedStore()
    await store.dispatch(
      submitCaptureThunk({
        draft: captureDraftFixtures.titledTask,
        id: 'new-task',
        now: CAPTURE_MOCK_NOW,
      }),
    )

    const slice = store.getState().capture
    expect(slice.endeavors.map((value) => value.id)).toContain('new-task')
    expect(slice.prompt).toBeNull()
  })

  it('the KC-IS-#75 regression, through the real thunk: a dateless Task submits with no due date', async () => {
    const store = await loadedStore()
    await store.dispatch(
      submitCaptureThunk({
        draft: captureDraftFixtures.titledTaskNoDate,
        id: 'dateless-task',
        now: CAPTURE_MOCK_NOW,
      }),
    )

    const endeavor = store
      .getState()
      .capture.endeavors.find((value) => value.id === 'dateless-task')
    expect(endeavor?.due).toBeNull()
    expect(endeavor?.start).toBeNull()
  })

  it('sends a task to the Inbox and an event to Plan', async () => {
    const store = await loadedStore()

    await store.dispatch(
      submitCaptureThunk({
        draft: captureDraftFixtures.titledTask,
        id: 'new-task',
        now: CAPTURE_MOCK_NOW,
      }),
    )
    expect(store.getState().capture.navigation?.route.kind).toBe('inbox')

    await store.dispatch(
      submitCaptureThunk({
        draft: {
          ...captureDraftFixtures.completeEvent,
          time: captureMockAt(17, 14, 0),
          endTime: captureMockAt(17, 15, 0),
        },
        id: 'new-event',
        now: CAPTURE_MOCK_NOW,
      }),
    )
    expect(store.getState().capture.navigation?.route).toMatchObject({
      kind: 'plan',
      endeavorId: 'new-event',
      highlight: true,
      listMode: true,
    })
  })

  it('reports what blocked an invalid submission instead of capturing it', async () => {
    const store = await loadedStore()
    await store.dispatch(
      submitCaptureThunk({
        draft: captureDraftFixtures.eventMissingEnd,
        id: 'never-captured',
        now: CAPTURE_MOCK_NOW,
      }),
    )

    const { load, endeavors } = store.getState().capture
    expect(endeavors.map((value) => value.id)).not.toContain('never-captured')
    expect(load.kind).toBe('failed')
    if (load.kind === 'failed') {
      expect(load.exception.message).toBe('Pick an end time to add this event.')
    }
  })

  it('keeps the pool intact when the write fails', async () => {
    const localStore = seeded()
    const broken: LocalStore = {
      ...localStore,
      endeavors: {
        ...localStore.endeavors,
        put: () => Promise.reject(new Error('quota exceeded')),
      },
    }
    const store = await loadedStore(broken)
    const before = store.getState().capture.endeavors.length

    await store.dispatch(
      submitCaptureThunk({
        draft: captureDraftFixtures.titledTask,
        id: 'new-task',
        now: CAPTURE_MOCK_NOW,
      }),
    )

    const { load, endeavors } = store.getState().capture
    expect(endeavors).toHaveLength(before)
    expect(load.kind).toBe('failed')
    if (load.kind === 'failed')
      expect(load.exception.kind).toBe('captureFailed')
  })
})

describe('Add for Today', () => {
  it('schedules the row, dismisses the Inbox and arms the undo window', async () => {
    const store = await loadedStore()
    store.dispatch(userDidTapOpenInbox())
    await store.dispatch(
      scheduleForTodayThunk({
        endeavorId: 'fresh-task',
        scheduledAt: captureMockAt(17, 10, 15),
        now: CAPTURE_MOCK_NOW,
      }),
    )

    const slice = store.getState().capture
    expect(
      slice.endeavors.find((value) => value.id === 'fresh-task')?.due,
    ).toEqual(captureMockAt(17, 10, 15))
    expect(slice.inbox.isOpen).toBe(false)
    expect(slice.undo.kind).toBe('armed')
    expect(slice.navigation?.route.kind).toBe('plan')
  })

  it('reports a row that vanished between the tap and the confirmation', async () => {
    const store = await loadedStore()
    await store.dispatch(
      scheduleForTodayThunk({
        endeavorId: 'gone',
        scheduledAt: captureMockAt(17, 10, 15),
        now: CAPTURE_MOCK_NOW,
      }),
    )

    const { load } = store.getState().capture
    expect(load.kind).toBe('failed')
    if (load.kind === 'failed') {
      expect(load.exception.kind).toBe('endeavorNotFound')
    }
  })

  it('leaves the row unscheduled when the write fails', async () => {
    const localStore = seeded()
    const broken: LocalStore = {
      ...localStore,
      endeavors: {
        ...localStore.endeavors,
        put: () => Promise.reject(new Error('quota exceeded')),
      },
    }
    const store = await loadedStore(broken)

    await store.dispatch(
      scheduleForTodayThunk({
        endeavorId: 'fresh-task',
        scheduledAt: captureMockAt(17, 10, 15),
        now: CAPTURE_MOCK_NOW,
      }),
    )

    const slice = store.getState().capture
    expect(
      slice.endeavors.find((value) => value.id === 'fresh-task')?.due,
    ).toBeNull()
    expect(slice.undo.kind).toBe('idle')
  })
})

describe('undoing an Add for Today', () => {
  const scheduleOn = async (store: AppStore) =>
    store.dispatch(
      scheduleForTodayThunk({
        endeavorId: 'fresh-task',
        scheduledAt: captureMockAt(17, 10, 15),
        now: CAPTURE_MOCK_NOW,
      }),
    )

  it('puts an unscheduled row back to unscheduled', async () => {
    const store = await loadedStore()
    await scheduleOn(store)
    const snapshot = undoSnapshotOf(store)

    await store.dispatch(
      undoScheduleForTodayThunk({
        snapshot,
        now: new Date(CAPTURE_MOCK_NOW.getTime() + 2_000),
      }),
    )

    const slice = store.getState().capture
    expect(
      slice.endeavors.find((value) => value.id === 'fresh-task')?.due,
    ).toBeNull()
    expect(slice.undo).toEqual({ kind: 'undone' })
  })

  it('does nothing the second time it is tapped', async () => {
    const store = await loadedStore()
    await scheduleOn(store)
    const snapshot = undoSnapshotOf(store)

    await store.dispatch(
      undoScheduleForTodayThunk({ snapshot, now: CAPTURE_MOCK_NOW }),
    )
    const afterFirst = store.getState().capture

    await store.dispatch(
      undoScheduleForTodayThunk({ snapshot, now: CAPTURE_MOCK_NOW }),
    )
    expect(store.getState().capture.endeavors).toEqual(afterFirst.endeavors)
    expect(store.getState().capture.undo).toEqual({ kind: 'undone' })
  })

  it('refuses once the window has expired', async () => {
    const store = await loadedStore()
    await scheduleOn(store)
    const snapshot = undoSnapshotOf(store)

    store.dispatch(
      onUndoWindowTicked({
        now: new Date(
          CAPTURE_MOCK_NOW.getTime() + ADD_FOR_TODAY_UNDO_WINDOW_MS,
        ),
      }),
    )
    await store.dispatch(
      undoScheduleForTodayThunk({
        snapshot,
        now: new Date(CAPTURE_MOCK_NOW.getTime() + 9_000),
      }),
    )

    const slice = store.getState().capture
    expect(slice.undo).toEqual({ kind: 'expired' })
    expect(
      slice.endeavors.find((value) => value.id === 'fresh-task')?.due,
    ).toEqual(captureMockAt(17, 10, 15))
  })
})

describe('a row operation', () => {
  it('closes a row the user swiped complete', async () => {
    const store = await loadedStore()
    await store.dispatch(
      applyInboxOperationThunk({
        operation: EndeavorOperation.markComplete,
        endeavorId: 'fresh-task',
        now: CAPTURE_MOCK_NOW,
      }),
    )

    expect(
      store
        .getState()
        .capture.endeavors.find((value) => value.id === 'fresh-task')?.status,
    ).toBe(EndeavorStatus.closed)
  })

  it('removes a row the user swiped delete', async () => {
    const store = await loadedStore()
    await store.dispatch(
      applyInboxOperationThunk({
        operation: EndeavorOperation.delete,
        endeavorId: 'fresh-task',
        now: CAPTURE_MOCK_NOW,
      }),
    )

    expect(
      store.getState().capture.endeavors.map((value) => value.id),
    ).not.toContain('fresh-task')
  })

  it('refuses an operation this surface does not own', async () => {
    const store = await loadedStore()
    await store.dispatch(
      applyInboxOperationThunk({
        operation: EndeavorOperation.startSession,
        endeavorId: 'fresh-task',
        now: CAPTURE_MOCK_NOW,
      }),
    )

    const { load } = store.getState().capture
    expect(load.kind).toBe('failed')
    if (load.kind === 'failed') {
      expect(load.exception.kind).toBe('unsupportedOperation')
    }
  })
})

describe('the defensive rejected arms', () => {
  it('degrade to a generic exception rather than crashing', () => {
    const rejected = {
      type: loadCaptureContextThunk.rejected.type,
      error: { message: 'boom' },
      meta: { aborted: false, arg: { now: CAPTURE_MOCK_NOW }, requestId: '1' },
      payload: undefined,
    }
    const next = reduce(initialCaptureState, rejected as never)

    expect(next.load.kind).toBe('failed')
    if (next.load.kind === 'failed') {
      expect(next.load.exception.kind).toBe('unknown')
    }
  })

  it('stay silent on a cancelled request — cancellation is the one silent exit', () => {
    const aborted = {
      type: loadCaptureContextThunk.rejected.type,
      error: { message: 'Aborted' },
      meta: { aborted: true, arg: { now: CAPTURE_MOCK_NOW }, requestId: '1' },
      payload: undefined,
    }
    expect(reduce(loaded, aborted as never)).toEqual(loaded)
  })

  it('never paint an exception over an Inbox that is still good', () => {
    const aborted = {
      type: submitCaptureThunk.rejected.type,
      error: { message: 'Aborted' },
      meta: { aborted: true, arg: {}, requestId: '1' },
      payload: undefined,
    }
    expect(
      reduce(captureStateMocks.inboxOpenWithJustCreated, aborted as never),
    ).toEqual(captureStateMocks.inboxOpenWithJustCreated)
  })
})

describe('the Just Created slot', () => {
  it('fires exactly once per capture and then drains', async () => {
    const store = await loadedStore()
    await store.dispatch(
      submitCaptureThunk({
        draft: captureDraftFixtures.titledTask,
        id: 'new-task',
        now: CAPTURE_MOCK_NOW,
      }),
    )
    store.dispatch(
      onCaptureRouteDelivered({
        now: new Date(CAPTURE_MOCK_NOW.getTime() + 500),
      }),
    )

    expect(store.getState().capture.inbox.justCreatedEndeavorId).toBe(
      'new-task',
    )

    store.dispatch(userDidDismissInbox())
    store.dispatch(userDidTapOpenInbox())

    expect(store.getState().capture.inbox.justCreatedEndeavorId).toBeNull()
  })

  it('never holds a captured event', async () => {
    const store = await loadedStore()
    await store.dispatch(
      submitCaptureThunk({
        draft: {
          ...captureDraftFixtures.completeEvent,
          time: captureMockAt(17, 14, 0),
          endTime: captureMockAt(17, 15, 0),
        },
        id: 'new-event',
        now: CAPTURE_MOCK_NOW,
      }),
    )
    store.dispatch(
      onCaptureRouteDelivered({
        now: new Date(CAPTURE_MOCK_NOW.getTime() + 500),
      }),
    )

    const slice = store.getState().capture
    expect(slice.inbox.isOpen).toBe(false)
    expect(slice.inbox.justCreatedEndeavorId).toBeNull()
  })

  it('is empty for a capture the user never routed to', async () => {
    const store = await loadedStore()
    await store.dispatch(
      submitCaptureThunk({
        draft: captureDraftFixtures.titledTask,
        id: 'new-task',
        now: CAPTURE_MOCK_NOW,
      }),
    )
    expect(store.getState().capture.inbox.justCreatedEndeavorId).toBeNull()
  })
})

/** Kept honest: the fixtures this suite leans on describe what they claim to. */
describe('the fixtures this suite leans on', () => {
  it('starts the scheduling target unscheduled, so undo has something to prove', () => {
    expect(captureEndeavorFixtures.freshTask.due).toBeNull()
    expect(captureEndeavorFixtures.freshTask.start).toBeNull()
  })

  it('resolves a capture Result type rather than throwing', async () => {
    const store = await loadedStore()
    const action = await store.dispatch(
      submitCaptureThunk({
        draft: captureDraftFixtures.titledTask,
        id: 'new-task',
        now: CAPTURE_MOCK_NOW,
      }),
    )
    const payload = action.payload as Result<unknown, CaptureException>
    expect(payload.ok).toBe(true)
  })
})
