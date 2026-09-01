import { EndeavorKind, EndeavorStatus, makeEndeavor } from '@kro/core'
import { describe, expect, it } from 'vitest'
import { CaptureExceptions } from '../CaptureException'
import { initialCaptureState } from '../CaptureFeature'
import {
  CAPTURE_MOCK_NOW,
  captureEndeavorFixtures,
  captureFixturePool,
  captureMockAt,
  captureStateMocks,
} from '../CaptureMocks'
import {
  ADD_FOR_TODAY_UNDO_WINDOW_MS,
  CaptureDestination,
  CaptureKind,
  schedulingSnapshotOf,
} from '../CaptureRules'
import {
  withAddForTodayCancelled,
  withAddForTodayRequested,
  withAddForTodayTimeAdjusted,
  withCaptureCommitted,
  withContextLoaded,
  withDateCleared,
  withDatePicked,
  withDestinationSelected,
  withException,
  withFetchStarted,
  withInboxDismissed,
  withInboxOpened,
  withKindSelected,
  withOperationApplied,
  withPromptClosed,
  withPromptOpened,
  withRecurrencePicked,
  withRewardsPicked,
  withRouteDelivered,
  withSchedulingApplied,
  withSchedulingUndone,
  withTimeEditBegun,
  withTimeEditEnded,
  withTimePicked,
  withTitleEdited,
  withTriageRequestCleared,
  withTriageRequested,
  withUndoWindowChecked,
} from '../CaptureShifters'

const openPrompt = captureStateMocks.promptOpenOnTask
const loaded = captureStateMocks.loadedPool

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

describe('withFetchStarted', () => {
  it('shows the spinner on a first open', () => {
    expect(withFetchStarted(initialCaptureState).load).toEqual({
      kind: 'loading',
    })
  })

  it('clears a previous failure when the user retries', () => {
    expect(
      withFetchStarted(captureStateMocks.failedLoadKeepingThePool).load,
    ).toEqual({ kind: 'loading' })
  })

  it('leaves the pool on screen while the refresh runs', () => {
    expect(withFetchStarted(loaded).endeavors).toEqual(loaded.endeavors)
  })
})

describe('withException', () => {
  it('records the failure the user should see', () => {
    const failed = withException(
      loaded,
      CaptureExceptions.captureFailed('the disk is full'),
    )
    expect(failed.load).toEqual({
      kind: 'failed',
      exception: CaptureExceptions.captureFailed('the disk is full'),
    })
  })

  it('keeps the Inbox the user is reading exactly as it was', () => {
    const failed = withException(
      captureStateMocks.inboxOpenWithJustCreated,
      CaptureExceptions.operationFailed('write failed'),
    )
    expect(failed.inbox).toEqual(
      captureStateMocks.inboxOpenWithJustCreated.inbox,
    )
    expect(failed.endeavors).toEqual(
      captureStateMocks.inboxOpenWithJustCreated.endeavors,
    )
  })

  it('keeps a half-typed draft so the capture can be retried', () => {
    const failed = withException(
      captureStateMocks.promptReadyToSubmit,
      CaptureExceptions.captureFailed('offline'),
    )
    expect(failed.prompt?.draft.title).toBe('Book the flights')
  })
})

describe('withContextLoaded', () => {
  it('installs the pool, the picker and the remembered destination together', () => {
    expect(loaded.load).toEqual({ kind: 'loaded' })
    expect(loaded.endeavors).toHaveLength(captureFixturePool.length)
    expect(loaded.lastUsedDestination).toBe(CaptureDestination.local)
    expect(loaded.availableDestinations).toEqual([CaptureDestination.local])
  })

  it('parks the instant it classified against, so no Selector needs a clock', () => {
    expect(loaded.clockAnchor).toEqual(CAPTURE_MOCK_NOW)
  })

  it('installs an empty pool as an empty pool, not as a failure', () => {
    expect(captureStateMocks.loadedEmptyPool.endeavors).toEqual([])
    expect(captureStateMocks.loadedEmptyPool.load).toEqual({ kind: 'loaded' })
  })
})

// ---------------------------------------------------------------------------
// The prompt
// ---------------------------------------------------------------------------

describe('withPromptOpened', () => {
  it('opens on the kind the user tapped, with an empty title', () => {
    expect(openPrompt.prompt?.draft.kind).toBe(CaptureKind.task)
    expect(openPrompt.prompt?.draft.title).toBe('')
  })

  it('seeds the destination the user last captured to', () => {
    const remembered = withPromptOpened(
      {
        ...loaded,
        availableDestinations: [
          CaptureDestination.local,
          CaptureDestination.kroCloud,
        ],
        lastUsedDestination: CaptureDestination.kroCloud,
      },
      { kind: CaptureKind.task, now: CAPTURE_MOCK_NOW, initialStart: null },
    )
    expect(remembered.prompt?.draft.destination).toBe(
      CaptureDestination.kroCloud,
    )
  })

  it('falls back to the first available host when the remembered one is gone', () => {
    const revoked = withPromptOpened(
      {
        ...loaded,
        availableDestinations: [CaptureDestination.local],
        lastUsedDestination: CaptureDestination.appleReminders,
      },
      { kind: CaptureKind.task, now: CAPTURE_MOCK_NOW, initialStart: null },
    )
    expect(revoked.prompt?.draft.destination).toBe(CaptureDestination.local)
  })

  it('opens already scheduled when the timeline pressed a slot', () => {
    const seeded = captureStateMocks.promptSeededFromTimeline
    expect(seeded.prompt?.draft.hasTime).toBe(true)
    expect(seeded.prompt?.draft.hasEndTime).toBe(true)
  })
})

describe('withPromptClosed', () => {
  it('drops the whole draft on Discard', () => {
    expect(
      withPromptClosed(captureStateMocks.promptReadyToSubmit).prompt,
    ).toBeNull()
  })

  it('leaves the pool alone — discarding captures nothing', () => {
    expect(withPromptClosed(openPrompt).endeavors).toEqual(openPrompt.endeavors)
  })

  it('is a no-op when no prompt is open', () => {
    expect(withPromptClosed(loaded)).toBe(loaded)
  })
})

describe('withTitleEdited', () => {
  it('records each keystroke as the user types', () => {
    expect(withTitleEdited(openPrompt, 'Book').prompt?.draft.title).toBe('Book')
  })

  it('stores the title raw, leaving the trim to validation', () => {
    expect(withTitleEdited(openPrompt, '  Book  ').prompt?.draft.title).toBe(
      '  Book  ',
    )
  })

  it('is a no-op after the prompt has been dismissed', () => {
    expect(withTitleEdited(loaded, 'orphan keystroke')).toBe(loaded)
  })
})

describe('withKindSelected', () => {
  it('switches the chip the user tapped', () => {
    expect(
      withKindSelected(openPrompt, CaptureKind.event).prompt?.draft.kind,
    ).toBe(CaptureKind.event)
  })

  it('closes a half-open time edit rather than carrying it into the new kind', () => {
    const editing = withTimeEditBegun(openPrompt, 'start')
    const switched = withKindSelected(editing, CaptureKind.event)
    expect(switched.prompt?.startEdit).toBeNull()
  })

  it('keeps what the user already typed', () => {
    const typed = withTitleEdited(openPrompt, 'Team sync')
    expect(withKindSelected(typed, CaptureKind.event).prompt?.draft.title).toBe(
      'Team sync',
    )
  })

  it('is a no-op after the prompt has been dismissed', () => {
    expect(withKindSelected(loaded, CaptureKind.event)).toBe(loaded)
  })

  it('forces the date back on when the new kind is an Event (KC-IS-#75)', () => {
    const dateless = withDateCleared(openPrompt)
    expect(dateless.prompt?.draft.hasDate).toBe(false)

    const switched = withKindSelected(dateless, CaptureKind.event)
    expect(switched.prompt?.draft.hasDate).toBe(true)
  })

  it('leaves a Task’s cleared date cleared when switching to Reminder', () => {
    const dateless = withDateCleared(openPrompt)
    const switched = withKindSelected(dateless, CaptureKind.reminder)
    expect(switched.prompt?.draft.hasDate).toBe(false)
  })
})

describe('withDatePicked', () => {
  it('moves the capture to the day the user chose', () => {
    const tomorrow = captureMockAt(18, 0, 0)
    expect(withDatePicked(openPrompt, tomorrow).prompt?.draft.date).toEqual(
      tomorrow,
    )
  })

  it('does not commit a time just because a day was picked', () => {
    expect(
      withDatePicked(openPrompt, captureMockAt(18, 0, 0)).prompt?.draft.hasTime,
    ).toBe(false)
  })

  it('re-commits the date, undoing a prior Clear', () => {
    const dateless = withDateCleared(openPrompt)
    expect(dateless.prompt?.draft.hasDate).toBe(false)

    const picked = withDatePicked(dateless, captureMockAt(18, 0, 0))
    expect(picked.prompt?.draft.hasDate).toBe(true)
  })

  it('is a no-op after the prompt has been dismissed', () => {
    expect(withDatePicked(loaded, captureMockAt(18, 0, 0))).toBe(loaded)
  })
})

describe('withDateCleared', () => {
  it('unsets the date on a Task, the KC-IS-#75 affordance', () => {
    const cleared = withDateCleared(openPrompt)
    expect(cleared.prompt?.draft.hasDate).toBe(false)
    // The candidate day itself is untouched — only the commit flag flips, so
    // re-opening the picker still has something sensible to show.
    expect(cleared.prompt?.draft.date).toEqual(openPrompt.prompt?.draft.date)
  })

  it('refuses to clear an Event’s date — it has no way to represent one missing', () => {
    const event = withKindSelected(openPrompt, CaptureKind.event)
    expect(withDateCleared(event)).toBe(event)
  })

  it('is a no-op on an already-dateless draft', () => {
    const cleared = withDateCleared(openPrompt)
    expect(withDateCleared(cleared)).toBe(cleared)
  })

  it('is a no-op after the prompt has been dismissed', () => {
    expect(withDateCleared(loaded)).toBe(loaded)
  })
})

describe('withTimeEditBegun', () => {
  it('marks the time as set the moment the picker opens', () => {
    const editing = withTimeEditBegun(openPrompt, 'start')
    expect(editing.prompt?.draft.hasTime).toBe(true)
    expect(editing.prompt?.startEdit).toEqual({
      time: openPrompt.prompt?.draft.time,
      wasSet: false,
    })
  })

  it('snapshots the end time separately for an event', () => {
    const editing = withTimeEditBegun(
      captureStateMocks.promptOpenOnEvent,
      'end',
    )
    expect(editing.prompt?.draft.hasEndTime).toBe(true)
    expect(editing.prompt?.endEdit?.wasSet).toBe(false)
  })

  it('keeps the original snapshot when the picker is re-opened', () => {
    const first = withTimeEditBegun(openPrompt, 'start')
    const moved = withTimePicked(first, 'start', captureMockAt(17, 11, 30))
    expect(withTimeEditBegun(moved, 'start')).toBe(moved)
  })

  it('is a no-op after the prompt has been dismissed', () => {
    expect(withTimeEditBegun(loaded, 'start')).toBe(loaded)
  })
})

describe('withTimePicked', () => {
  it('follows the wheel as it turns', () => {
    const picked = withTimePicked(
      openPrompt,
      'start',
      captureMockAt(17, 11, 30),
    )
    expect(picked.prompt?.draft.time).toEqual(captureMockAt(17, 11, 30))
    expect(picked.prompt?.draft.hasTime).toBe(true)
  })

  it('sets the end time without disturbing the start', () => {
    const picked = withTimePicked(
      captureStateMocks.promptOpenOnEvent,
      'end',
      captureMockAt(17, 12, 0),
    )
    expect(picked.prompt?.draft.endTime).toEqual(captureMockAt(17, 12, 0))
    expect(picked.prompt?.draft.hasTime).toBe(false)
  })

  it('is a no-op after the prompt has been dismissed', () => {
    expect(withTimePicked(loaded, 'start', captureMockAt(17, 12, 0))).toBe(
      loaded,
    )
  })
})

describe('withTimeEditEnded', () => {
  it('keeps the chosen time on Done', () => {
    const edited = withTimePicked(
      withTimeEditBegun(openPrompt, 'start'),
      'start',
      captureMockAt(17, 11, 30),
    )
    const done = withTimeEditEnded(edited, 'start', 'done')
    expect(done.prompt?.draft.time).toEqual(captureMockAt(17, 11, 30))
    expect(done.prompt?.draft.hasTime).toBe(true)
    expect(done.prompt?.startEdit).toBeNull()
  })

  it('puts an unscheduled task back to unscheduled on Discard', () => {
    const edited = withTimePicked(
      withTimeEditBegun(openPrompt, 'start'),
      'start',
      captureMockAt(17, 11, 30),
    )
    const discarded = withTimeEditEnded(edited, 'start', 'discard')
    expect(discarded.prompt?.draft.hasTime).toBe(false)
    expect(discarded.prompt?.draft.time).toEqual(openPrompt.prompt?.draft.time)
  })

  it('removes the value outright on Clear', () => {
    const edited = withTimeEditBegun(openPrompt, 'start')
    const cleared = withTimeEditEnded(edited, 'start', 'clear')
    expect(cleared.prompt?.draft.hasTime).toBe(false)
    expect(cleared.prompt?.startEdit).toBeNull()
  })

  it('clears an event’s end time without touching its start', () => {
    const event = withTimePicked(
      withTimePicked(
        captureStateMocks.promptOpenOnEvent,
        'start',
        captureMockAt(17, 14, 0),
      ),
      'end',
      captureMockAt(17, 15, 0),
    )
    const cleared = withTimeEditEnded(event, 'end', 'clear')
    expect(cleared.prompt?.draft.hasEndTime).toBe(false)
    expect(cleared.prompt?.draft.hasTime).toBe(true)
  })

  it('is a no-op when no edit was ever begun', () => {
    expect(withTimeEditEnded(openPrompt, 'start', 'discard')).toBe(openPrompt)
  })
})

describe('withRewardsPicked', () => {
  it('follows the stepper', () => {
    expect(withRewardsPicked(openPrompt, 25).prompt?.draft.rewards).toBe(25)
  })

  it('refuses to go below one point', () => {
    expect(withRewardsPicked(openPrompt, 0).prompt?.draft.rewards).toBe(1)
  })

  it('caps the value at 999', () => {
    expect(withRewardsPicked(openPrompt, 5_000).prompt?.draft.rewards).toBe(999)
  })
})

describe('withRecurrencePicked', () => {
  it('records a daily rule', () => {
    expect(
      withRecurrencePicked(openPrompt, { kind: 'daily', interval: 1 }).prompt
        ?.draft.recurrence,
    ).toEqual({ kind: 'daily', interval: 1 })
  })

  it('records a return to no repeat', () => {
    const repeating = withRecurrencePicked(openPrompt, {
      kind: 'daily',
      interval: 2,
    })
    expect(
      withRecurrencePicked(repeating, { kind: 'never' }).prompt?.draft
        .recurrence,
    ).toEqual({ kind: 'never' })
  })

  it('is a no-op after the prompt has been dismissed', () => {
    expect(withRecurrencePicked(loaded, { kind: 'never' })).toBe(loaded)
  })
})

describe('withDestinationSelected', () => {
  it('points the capture at the chosen host', () => {
    expect(
      withDestinationSelected(openPrompt, CaptureDestination.kroCloud).prompt
        ?.draft.destination,
    ).toBe(CaptureDestination.kroCloud)
  })

  it('does not remember the choice until the capture is confirmed', () => {
    expect(
      withDestinationSelected(openPrompt, CaptureDestination.kroCloud)
        .lastUsedDestination,
    ).toBe(CaptureDestination.local)
  })

  it('is a no-op after the prompt has been dismissed', () => {
    expect(withDestinationSelected(loaded, CaptureDestination.kroCloud)).toBe(
      loaded,
    )
  })
})

// ---------------------------------------------------------------------------
// Capture → routing
// ---------------------------------------------------------------------------

describe('withCaptureCommitted', () => {
  const committed = captureStateMocks.taskCapturedAwaitingInbox

  it('adds the new endeavor to the pool and closes the prompt', () => {
    expect(committed.endeavors.map((value) => value.id)).toContain(
      'captured-task',
    )
    expect(committed.prompt).toBeNull()
  })

  it('remembers the destination the user actually captured to', () => {
    const toCloud = withCaptureCommitted(loaded, {
      endeavor: captureEndeavorFixtures.freshTask,
      destination: CaptureDestination.kroCloud,
      now: CAPTURE_MOCK_NOW,
    })
    expect(toCloud.lastUsedDestination).toBe(CaptureDestination.kroCloud)
  })

  it('decides the Inbox route for a task, and does not open it yet', () => {
    expect(committed.navigation?.route).toEqual({
      kind: 'inbox',
      endeavorId: 'captured-task',
    })
    expect(committed.inbox.isOpen).toBe(false)
  })

  it('decides the Plan route for an event and never the Inbox', () => {
    const event = captureStateMocks.eventCapturedAwaitingPlan
    expect(event.navigation?.route.kind).toBe('plan')
    expect(event.inbox.isOpen).toBe(false)
    expect(event.inbox.justCreatedEndeavorId).toBeNull()
  })
})

describe('withRouteDelivered', () => {
  const pending = captureStateMocks.taskCapturedAwaitingInbox

  it('refuses to open the Inbox before the prompt has finished dismissing', () => {
    expect(
      withRouteDelivered(pending, new Date(CAPTURE_MOCK_NOW.getTime() + 499)),
    ).toBe(pending)
  })

  it('opens the Inbox with the Just Created row once the delay elapses', () => {
    const delivered = withRouteDelivered(
      pending,
      new Date(CAPTURE_MOCK_NOW.getTime() + 500),
    )
    expect(delivered.inbox).toEqual({
      isOpen: true,
      justCreatedEndeavorId: 'captured-task',
    })
    expect(delivered.navigation).toBeNull()
  })

  it('clears a Plan route without opening the Inbox', () => {
    const delivered = withRouteDelivered(
      captureStateMocks.eventCapturedAwaitingPlan,
      new Date(CAPTURE_MOCK_NOW.getTime() + 500),
    )
    expect(delivered.navigation).toBeNull()
    expect(delivered.inbox.isOpen).toBe(false)
  })

  it('is a no-op when nothing is pending', () => {
    expect(withRouteDelivered(loaded, CAPTURE_MOCK_NOW)).toBe(loaded)
  })
})

// ---------------------------------------------------------------------------
// The Inbox
// ---------------------------------------------------------------------------

describe('withInboxOpened', () => {
  it('opens the sheet from the Plan tab affordance', () => {
    expect(withInboxOpened(loaded).inbox.isOpen).toBe(true)
  })

  it('drains the Just Created slot, so it fires once per capture', () => {
    expect(
      withInboxOpened(captureStateMocks.inboxOpenWithJustCreated).inbox
        .justCreatedEndeavorId,
    ).toBeNull()
  })

  it('leaves the pool untouched', () => {
    expect(withInboxOpened(loaded).endeavors).toEqual(loaded.endeavors)
  })
})

describe('withInboxDismissed', () => {
  it('closes the sheet on Done', () => {
    expect(
      withInboxDismissed(captureStateMocks.inboxOpenWithJustCreated).inbox
        .isOpen,
    ).toBe(false)
  })

  it('drains the Just Created slot with it', () => {
    expect(
      withInboxDismissed(captureStateMocks.inboxOpenWithJustCreated).inbox
        .justCreatedEndeavorId,
    ).toBeNull()
  })

  it('closes an open scheduling popover rather than leaving it orphaned', () => {
    expect(
      withInboxDismissed(captureStateMocks.addForTodayOpen).addForToday,
    ).toBeNull()
  })
})

describe('withTriageRequested', () => {
  it('raises the request with the row the user tapped', () => {
    const requested = withTriageRequested(
      loaded,
      'fresh-task',
      CAPTURE_MOCK_NOW,
    )
    expect(requested.triageRequest?.endeavorId).toBe('fresh-task')
  })

  it('seeds it with the first free gap in today’s calendar', () => {
    const requested = withTriageRequested(
      loaded,
      'fresh-task',
      CAPTURE_MOCK_NOW,
    )
    expect(requested.triageRequest?.nextFreeSlotToday).toEqual(
      captureMockAt(17, 10, 15),
    )
  })

  it('is a no-op for a row the pool no longer holds', () => {
    expect(withTriageRequested(loaded, 'deleted-row', CAPTURE_MOCK_NOW)).toBe(
      loaded,
    )
  })
})

describe('withTriageRequestCleared', () => {
  it('spends the one-shot once Triage is on screen', () => {
    const requested = withTriageRequested(
      loaded,
      'fresh-task',
      CAPTURE_MOCK_NOW,
    )
    expect(withTriageRequestCleared(requested).triageRequest).toBeNull()
  })

  it('is a no-op when nothing was requested', () => {
    expect(withTriageRequestCleared(loaded)).toBe(loaded)
  })

  it('leaves the Inbox open underneath', () => {
    const requested = withTriageRequested(
      captureStateMocks.inboxOpenWithJustCreated,
      'fresh-task',
      CAPTURE_MOCK_NOW,
    )
    expect(withTriageRequestCleared(requested).inbox.isOpen).toBe(true)
  })
})

describe('withOperationApplied', () => {
  const completed = makeEndeavor({
    ...captureEndeavorFixtures.freshTask,
    status: EndeavorStatus.closed,
    completed: CAPTURE_MOCK_NOW,
  })

  it('replaces a completed row in place', () => {
    const applied = withOperationApplied(loaded, {
      endeavorId: 'fresh-task',
      endeavor: completed,
    })
    expect(
      applied.endeavors.find((value) => value.id === 'fresh-task')?.status,
    ).toBe(EndeavorStatus.closed)
    expect(applied.endeavors).toHaveLength(loaded.endeavors.length)
  })

  it('removes a deleted row from the pool', () => {
    const applied = withOperationApplied(loaded, {
      endeavorId: 'fresh-task',
      endeavor: null,
    })
    expect(applied.endeavors.map((value) => value.id)).not.toContain(
      'fresh-task',
    )
  })

  it('settles the lifecycle so a prior failure stops showing', () => {
    const applied = withOperationApplied(
      captureStateMocks.failedLoadKeepingThePool,
      { endeavorId: 'fresh-task', endeavor: completed },
    )
    expect(applied.load).toEqual({ kind: 'loaded' })
  })
})

// ---------------------------------------------------------------------------
// Add for Today
// ---------------------------------------------------------------------------

describe('withAddForTodayRequested', () => {
  it('opens the popover on the row the user tapped', () => {
    expect(captureStateMocks.addForTodayOpen.addForToday?.endeavorId).toBe(
      'fresh-task',
    )
  })

  it('pre-fills the next quarter-hour slot so one tap confirms', () => {
    expect(captureStateMocks.addForTodayOpen.addForToday?.pickedTime).toEqual(
      captureMockAt(17, 10, 15),
    )
  })

  it('is a no-op for a row the pool no longer holds', () => {
    expect(
      withAddForTodayRequested(loaded, 'deleted-row', CAPTURE_MOCK_NOW),
    ).toBe(loaded)
  })
})

describe('withAddForTodayTimeAdjusted', () => {
  it('follows the popover’s time picker', () => {
    const adjusted = withAddForTodayTimeAdjusted(
      captureStateMocks.addForTodayOpen,
      captureMockAt(17, 16, 30),
    )
    expect(adjusted.addForToday?.pickedTime).toEqual(captureMockAt(17, 16, 30))
  })

  it('keeps the popover aimed at the same row', () => {
    const adjusted = withAddForTodayTimeAdjusted(
      captureStateMocks.addForTodayOpen,
      captureMockAt(17, 16, 30),
    )
    expect(adjusted.addForToday?.endeavorId).toBe('fresh-task')
  })

  it('is a no-op when no popover is open', () => {
    expect(withAddForTodayTimeAdjusted(loaded, captureMockAt(17, 16, 30))).toBe(
      loaded,
    )
  })
})

describe('withAddForTodayCancelled', () => {
  it('closes the popover on Cancel', () => {
    expect(
      withAddForTodayCancelled(captureStateMocks.addForTodayOpen).addForToday,
    ).toBeNull()
  })

  it('schedules nothing — the row is untouched', () => {
    const cancelled = withAddForTodayCancelled(
      captureStateMocks.addForTodayOpen,
    )
    expect(
      cancelled.endeavors.find((value) => value.id === 'fresh-task')?.due,
    ).toBeNull()
  })

  it('is a no-op when no popover is open', () => {
    expect(withAddForTodayCancelled(loaded)).toBe(loaded)
  })
})

describe('withSchedulingApplied', () => {
  const armed = captureStateMocks.undoArmed

  it('gives the row its new due date', () => {
    expect(
      armed.endeavors.find((value) => value.id === 'fresh-task')?.due,
    ).toEqual(captureMockAt(17, 10, 15))
  })

  it('dismisses the Inbox and closes the popover', () => {
    expect(armed.inbox.isOpen).toBe(false)
    expect(armed.addForToday).toBeNull()
  })

  it('routes the user to Plan at the scheduled slot', () => {
    expect(armed.navigation?.route).toEqual({
      kind: 'plan',
      day: captureMockAt(17, 0, 0),
      scrollTarget: captureMockAt(17, 10, 15),
      endeavorId: 'fresh-task',
      highlight: false,
      listMode: false,
    })
  })

  it('arms the undo window for about eight seconds', () => {
    expect(armed.undo.kind).toBe('armed')
    if (armed.undo.kind !== 'armed') return
    expect(armed.undo.expiresAt.getTime() - armed.undo.armedAt.getTime()).toBe(
      ADD_FOR_TODAY_UNDO_WINDOW_MS,
    )
  })
})

describe('withUndoWindowChecked', () => {
  const armed = captureStateMocks.undoArmed

  it('leaves the window open a millisecond before the deadline', () => {
    const still = withUndoWindowChecked(
      armed,
      new Date(CAPTURE_MOCK_NOW.getTime() + ADD_FOR_TODAY_UNDO_WINDOW_MS - 1),
    )
    expect(still.undo.kind).toBe('armed')
  })

  it('disarms the window on the deadline itself', () => {
    expect(captureStateMocks.undoExpired.undo).toEqual({ kind: 'expired' })
  })

  it('is a no-op when no window is open', () => {
    expect(withUndoWindowChecked(loaded, CAPTURE_MOCK_NOW)).toBe(loaded)
  })

  it('does not re-expire an already expired window', () => {
    const expired = captureStateMocks.undoExpired
    expect(
      withUndoWindowChecked(
        expired,
        new Date(CAPTURE_MOCK_NOW.getTime() + 60_000),
      ),
    ).toBe(expired)
  })
})

describe('withSchedulingUndone', () => {
  const armed = captureStateMocks.undoArmed
  const restored = {
    ...captureEndeavorFixtures.freshTask,
    kind: EndeavorKind.task,
  }

  it('puts the row back where it was', () => {
    const undone = withSchedulingUndone(armed, restored)
    expect(
      undone.endeavors.find((value) => value.id === 'fresh-task')?.due,
    ).toBeNull()
    expect(undone.undo).toEqual({ kind: 'undone' })
  })

  it('does nothing a second time', () => {
    const once = withSchedulingUndone(armed, restored)
    expect(withSchedulingUndone(once, restored)).toBe(once)
  })

  it('does nothing once the window has expired', () => {
    const expired = captureStateMocks.undoExpired
    expect(withSchedulingUndone(expired, restored)).toBe(expired)
  })

  it('refuses on a state that never scheduled anything', () => {
    expect(withSchedulingUndone(loaded, restored)).toBe(loaded)
  })
})

describe('the snapshot a scheduling takes', () => {
  it('remembers the row was unscheduled, which is what undo restores', () => {
    const snapshot = schedulingSnapshotOf(
      captureEndeavorFixtures.freshTask,
      captureMockAt(17, 10, 15),
    )
    expect(snapshot.previousDue).toBeNull()
    expect(snapshot.previousStart).toBeNull()
    expect(snapshot.previousDeferCount).toBe(0)
  })

  it('carries the title the toast will name', () => {
    const snapshot = schedulingSnapshotOf(
      captureEndeavorFixtures.freshTask,
      captureMockAt(17, 10, 15),
    )
    expect(snapshot.title).toBe('Draft the announcement')
  })

  it('carries a prior schedule when there was one', () => {
    const snapshot = schedulingSnapshotOf(
      captureEndeavorFixtures.scheduledTask,
      captureMockAt(17, 10, 15),
    )
    expect(snapshot.previousDue).toEqual(captureMockAt(17, 15, 0))
  })
})
