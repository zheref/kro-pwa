import { EndeavorOperation, EndeavorsVistas } from '@kro/core'
import { describe, expect, it } from 'vitest'
import type { RootState } from '../../../library/store'
import { initialAuthState } from '../../auth/AuthState'
import { initialDoState } from '../../do/DoFeature'
import { initialEarnState } from '../../earn/EarnFeature'
import { initialEndeavorDetailState } from '../../endeavorDetail/EndeavorDetailState'
import { initialFindState } from '../../find/FindState'
import { greetingStateMocks } from '../../greeting/GreetingMocks'
import { initialPlanState } from '../../plan/PlanState'
import { initialTriageState } from '../../triage/TriageFeature'
import { CaptureExceptions } from '../CaptureException'
import type { CaptureState } from '../CaptureFeature'
import {
  CAPTURE_MOCK_NOW,
  captureMockAt,
  captureStateMocks,
} from '../CaptureMocks'
import { CaptureDestination } from '../CaptureRules'
import {
  selectAddForToday,
  selectAddForTodayPrefill,
  selectAvailableCaptureDestinations,
  selectCanSubmitCapture,
  selectCaptureBlockedReason,
  selectCaptureDraft,
  selectCaptureException,
  selectCaptureNavigationIntent,
  selectCaptureTriageRequest,
  selectInboxSwipeOperations,
  selectInboxTotalCount,
  selectInboxVista,
  selectIsCaptureLoading,
  selectIsCapturePromptOpen,
  selectIsInboxEmpty,
  selectIsInboxOpen,
  selectIsUndoArmed,
  selectJustCreatedEndeavor,
  selectPendingTriageEndeavors,
  selectSchedulingUndo,
  selectSelectedCaptureDestination,
  selectUndoSnapshot,
} from '../CaptureSelectors'
import {
  withDestinationSelected,
  withException,
  withTriageRequested,
} from '../CaptureShifters'
import { initialMainState } from '../../main/MainFeature'

/** Selectors run against a hand-built root state, never a live store. */
const rootWith = (slice: CaptureState): RootState => ({
  greeting: greetingStateMocks.idle,
  // Present only because `RootState` names every registered slice (#16, #18,
  // #25, #29); this suite asserts nothing about Do, Plan, Triage, Find or
  // Detail.
  do: initialDoState,
  plan: initialPlanState,
  capture: slice,
  triage: initialTriageState,
  find: initialFindState,
  endeavorDetail: initialEndeavorDetailState,
  earn: initialEarnState,
  auth: initialAuthState,
  main: initialMainState,
})

const loaded = rootWith(captureStateMocks.loadedPool)

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

describe('selectIsCaptureLoading', () => {
  it('is true while the first read is in flight', () => {
    expect(selectIsCaptureLoading(rootWith(captureStateMocks.loading))).toBe(true)
  })

  it('is false once the pool has landed', () => {
    expect(selectIsCaptureLoading(loaded)).toBe(false)
  })

  it('is false on a failure, so the spinner cannot get stuck', () => {
    expect(
      selectIsCaptureLoading(
        rootWith(captureStateMocks.failedLoadKeepingThePool),
      ),
    ).toBe(false)
  })
})

describe('selectCaptureException', () => {
  it('is null before anything has gone wrong', () => {
    expect(selectCaptureException(loaded)).toBeNull()
  })

  it('reports the failure the user should see', () => {
    expect(
      selectCaptureException(
        rootWith(captureStateMocks.failedLoadKeepingThePool),
      )?.kind,
    ).toBe('contextLoadFailed')
  })

  it('reports a capture failure with the copy the surface will show', () => {
    const failed = withException(
      captureStateMocks.loadedPool,
      CaptureExceptions.captureFailed('the disk is full'),
    )
    expect(selectCaptureException(rootWith(failed))?.message).toBe(
      "Couldn't save that: the disk is full",
    )
  })
})

// ---------------------------------------------------------------------------
// The prompt
// ---------------------------------------------------------------------------

describe('selectIsCapturePromptOpen', () => {
  it('is false on the surface at rest', () => {
    expect(selectIsCapturePromptOpen(loaded)).toBe(false)
  })

  it('is true while the user is capturing', () => {
    expect(
      selectIsCapturePromptOpen(rootWith(captureStateMocks.promptOpenOnTask)),
    ).toBe(true)
  })

  it('is false again after a capture commits', () => {
    expect(
      selectIsCapturePromptOpen(
        rootWith(captureStateMocks.taskCapturedAwaitingInbox),
      ),
    ).toBe(false)
  })
})

describe('selectCaptureDraft', () => {
  it('is null while no prompt is open', () => {
    expect(selectCaptureDraft(loaded)).toBeNull()
  })

  it('exposes the live draft the prompt renders', () => {
    expect(
      selectCaptureDraft(rootWith(captureStateMocks.promptReadyToSubmit))?.title,
    ).toBe('Book the flights')
  })

  it('exposes an event draft with its own kind', () => {
    expect(
      selectCaptureDraft(rootWith(captureStateMocks.promptOpenOnEvent))?.kind,
    ).toBe('event')
  })
})

describe('selectCanSubmitCapture', () => {
  it('is false with no prompt open, so a stray shortcut submits nothing', () => {
    expect(selectCanSubmitCapture(loaded)).toBe(false)
  })

  it('is false on an untitled draft', () => {
    expect(
      selectCanSubmitCapture(rootWith(captureStateMocks.promptOpenOnTask)),
    ).toBe(false)
  })

  it('is true once a task has a title', () => {
    expect(
      selectCanSubmitCapture(rootWith(captureStateMocks.promptReadyToSubmit)),
    ).toBe(true)
  })

  it('is false on a titled event that has no times', () => {
    expect(
      selectCanSubmitCapture(rootWith(captureStateMocks.promptOpenOnEvent)),
    ).toBe(false)
  })
})

describe('selectCaptureBlockedReason', () => {
  it('is null with no prompt open', () => {
    expect(selectCaptureBlockedReason(loaded)).toBeNull()
  })

  it('names the missing title on a fresh prompt', () => {
    expect(
      selectCaptureBlockedReason(rootWith(captureStateMocks.promptOpenOnTask)),
    ).toBe('Enter a title to add this task.')
  })

  it('names both missing boundaries on a titled event', () => {
    expect(
      selectCaptureBlockedReason(rootWith(captureStateMocks.promptOpenOnEvent)),
    ).toBe('Pick a start time and an end time to add this event.')
  })

  it('is null once nothing blocks submission', () => {
    expect(
      selectCaptureBlockedReason(
        rootWith(captureStateMocks.promptReadyToSubmit),
      ),
    ).toBeNull()
  })
})

describe('selectAvailableCaptureDestinations', () => {
  it('offers On Device on a plain browser', () => {
    expect(selectAvailableCaptureDestinations(loaded)).toEqual([
      CaptureDestination.local,
    ])
  })

  it('offers what the context load resolved', () => {
    const withCloud = rootWith({
      ...captureStateMocks.loadedPool,
      availableDestinations: [
        CaptureDestination.local,
        CaptureDestination.kroCloud,
      ],
    })
    expect(selectAvailableCaptureDestinations(withCloud)).toHaveLength(2)
  })

  it('is never empty, so the picker always has something to show', () => {
    expect(
      selectAvailableCaptureDestinations(rootWith(captureStateMocks.idle)),
    ).toHaveLength(1)
  })
})

describe('selectSelectedCaptureDestination', () => {
  it('falls back to the remembered host while no prompt is open', () => {
    expect(selectSelectedCaptureDestination(loaded)).toBe(
      CaptureDestination.local,
    )
  })

  it('follows the open draft', () => {
    const drafting = rootWith(
      withDestinationSelected(
        captureStateMocks.promptOpenOnTask,
        CaptureDestination.kroCloud,
      ),
    )
    expect(selectSelectedCaptureDestination(drafting)).toBe(
      CaptureDestination.kroCloud,
    )
  })

  it('shows what the next prompt will seed with after a capture', () => {
    expect(
      selectSelectedCaptureDestination(
        rootWith(captureStateMocks.taskCapturedAwaitingInbox),
      ),
    ).toBe(CaptureDestination.local)
  })
})

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------

describe('selectCaptureNavigationIntent', () => {
  it('is null when the shell has nothing to perform', () => {
    expect(selectCaptureNavigationIntent(loaded)).toBeNull()
  })

  it('carries the Inbox route a task capture decided', () => {
    expect(
      selectCaptureNavigationIntent(
        rootWith(captureStateMocks.taskCapturedAwaitingInbox),
      )?.route,
    ).toEqual({ kind: 'inbox', endeavorId: 'captured-task' })
  })

  it('carries the Plan payload an event capture decided', () => {
    expect(
      selectCaptureNavigationIntent(
        rootWith(captureStateMocks.eventCapturedAwaitingPlan),
      )?.route,
    ).toMatchObject({
      kind: 'plan',
      endeavorId: 'captured-event',
      highlight: true,
      listMode: true,
    })
  })
})

// ---------------------------------------------------------------------------
// The Inbox
// ---------------------------------------------------------------------------

describe('selectIsInboxOpen', () => {
  it('is false on the surface at rest', () => {
    expect(selectIsInboxOpen(loaded)).toBe(false)
  })

  it('is true once the capture route has been delivered', () => {
    expect(
      selectIsInboxOpen(rootWith(captureStateMocks.inboxOpenWithJustCreated)),
    ).toBe(true)
  })

  it('is false again after a scheduling dismisses it', () => {
    expect(selectIsInboxOpen(rootWith(captureStateMocks.undoArmed))).toBe(false)
  })
})

describe('selectJustCreatedEndeavor', () => {
  it('is null when the Inbox was opened by hand', () => {
    expect(selectJustCreatedEndeavor(loaded)).toBeNull()
  })

  it('is the endeavor the capture named', () => {
    expect(
      selectJustCreatedEndeavor(
        rootWith(captureStateMocks.inboxOpenWithJustCreated),
      )?.id,
    ).toBe('captured-task')
  })

  it('is null while the route is still pending', () => {
    expect(
      selectJustCreatedEndeavor(
        rootWith(captureStateMocks.taskCapturedAwaitingInbox),
      ),
    ).toBeNull()
  })
})

describe('selectPendingTriageEndeavors', () => {
  it('lists every unscheduled non-event endeavor, newest first', () => {
    expect(selectPendingTriageEndeavors(loaded).map((row) => row.id)).toEqual([
      'fresh-task',
      'unscheduled-reminder',
      'unscheduled-habit',
      'neglected-task',
      'undated-legacy-task',
    ])
  })

  it('drops the Just Created row into its own slot', () => {
    const ids = selectPendingTriageEndeavors(
      rootWith(captureStateMocks.inboxOpenWithJustCreated),
    ).map((row) => row.id)
    expect(ids).not.toContain('captured-task')
  })

  it('is empty on an empty pool', () => {
    expect(
      selectPendingTriageEndeavors(rootWith(captureStateMocks.loadedEmptyPool)),
    ).toEqual([])
  })

  it('matches the Inbox vista’s status filter — nothing closed appears', () => {
    const vistaStatuses = EndeavorsVistas.inbox.query.statuses
    for (const row of selectPendingTriageEndeavors(loaded)) {
      expect(vistaStatuses?.has(row.status)).toBe(true)
    }
  })
})

describe('selectIsInboxEmpty', () => {
  it('is false while there is anything to triage', () => {
    expect(selectIsInboxEmpty(loaded)).toBe(false)
  })

  it('is true when both sections are empty', () => {
    expect(
      selectIsInboxEmpty(rootWith(captureStateMocks.loadedEmptyPool)),
    ).toBe(true)
  })

  it('is false when only the Just Created row is present', () => {
    const onlyJustCreated = rootWith({
      ...captureStateMocks.inboxOpenWithJustCreated,
      endeavors: captureStateMocks.inboxOpenWithJustCreated.endeavors.filter(
        (row) => row.id === 'captured-task',
      ),
    })
    expect(selectIsInboxEmpty(onlyJustCreated)).toBe(false)
  })
})

describe('selectInboxTotalCount', () => {
  it('counts the pending rows on a manual open', () => {
    expect(selectInboxTotalCount(loaded)).toBe(5)
  })

  it('counts the Just Created row on top of them', () => {
    expect(
      selectInboxTotalCount(
        rootWith(captureStateMocks.inboxOpenWithJustCreated),
      ),
    ).toBe(6)
  })

  it('counts nothing on an empty pool', () => {
    expect(
      selectInboxTotalCount(rootWith(captureStateMocks.loadedEmptyPool)),
    ).toBe(0)
  })
})

describe('selectInboxVista and its row capabilities', () => {
  it('is the registry’s Inbox vista and nothing else', () => {
    expect(selectInboxVista(loaded)).toBe(EndeavorsVistas.inbox)
  })

  it('exposes no leading swipe and the declared trailing pair', () => {
    const operations = selectInboxSwipeOperations(loaded)
    expect(operations.leading).toEqual([])
    expect(operations.trailing.map((binding) => binding.operation)).toEqual([
      EndeavorOperation.markComplete,
      EndeavorOperation.delete,
    ])
  })

  it('preserves declaration order, which is the swipe-button order', () => {
    expect(selectInboxSwipeOperations(loaded).trailing[0]?.label).toBe(
      'Complete',
    )
  })
})

describe('selectCaptureTriageRequest', () => {
  it('is null until a row asks for Triage', () => {
    expect(selectCaptureTriageRequest(loaded)).toBeNull()
  })

  it('names the row and the gap Triage should seed with', () => {
    const requested = withTriageRequested(
      captureStateMocks.loadedPool,
      'fresh-task',
      CAPTURE_MOCK_NOW,
    )
    expect(selectCaptureTriageRequest(rootWith(requested))).toEqual({
      endeavorId: 'fresh-task',
      nextFreeSlotToday: captureMockAt(17, 10, 15),
    })
  })

  it('is null again on a state that never requested one', () => {
    expect(
      selectCaptureTriageRequest(rootWith(captureStateMocks.undoArmed)),
    ).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Add for Today + Undo
// ---------------------------------------------------------------------------

describe('selectAddForToday', () => {
  it('is null while no popover is open', () => {
    expect(selectAddForToday(loaded)).toBeNull()
  })

  it('names the row the popover is anchored to', () => {
    expect(
      selectAddForToday(rootWith(captureStateMocks.addForTodayOpen))?.endeavorId,
    ).toBe('fresh-task')
  })

  it('is null again once the scheduling has been applied', () => {
    expect(selectAddForToday(rootWith(captureStateMocks.undoArmed))).toBeNull()
  })
})

describe('selectAddForTodayPrefill', () => {
  it('is null while no popover is open', () => {
    expect(selectAddForTodayPrefill(loaded)).toBeNull()
  })

  it('offers the next quarter-hour slot', () => {
    expect(
      selectAddForTodayPrefill(rootWith(captureStateMocks.addForTodayOpen)),
    ).toEqual(captureMockAt(17, 10, 15))
  })

  it('follows the user’s own adjustment', () => {
    const adjusted = rootWith({
      ...captureStateMocks.addForTodayOpen,
      addForToday: {
        endeavorId: 'fresh-task',
        pickedTime: captureMockAt(17, 18, 30),
      },
    })
    expect(selectAddForTodayPrefill(adjusted)).toEqual(captureMockAt(17, 18, 30))
  })
})

describe('selectSchedulingUndo', () => {
  it('is null when nothing has been scheduled', () => {
    expect(selectSchedulingUndo(loaded)).toBeNull()
  })

  it('carries what the toast needs while the window is open', () => {
    expect(selectSchedulingUndo(rootWith(captureStateMocks.undoArmed))).toEqual({
      endeavorId: 'fresh-task',
      title: 'Draft the announcement',
      scheduledAt: captureMockAt(17, 10, 15),
      expiresAt: new Date(CAPTURE_MOCK_NOW.getTime() + 8_000),
    })
  })

  it('is null the moment the window expires', () => {
    expect(
      selectSchedulingUndo(rootWith(captureStateMocks.undoExpired)),
    ).toBeNull()
  })
})

describe('selectIsUndoArmed', () => {
  it('is false at rest', () => {
    expect(selectIsUndoArmed(loaded)).toBe(false)
  })

  it('is true while the toast should be on screen', () => {
    expect(selectIsUndoArmed(rootWith(captureStateMocks.undoArmed))).toBe(true)
  })

  it('is false once the window has expired', () => {
    expect(selectIsUndoArmed(rootWith(captureStateMocks.undoExpired))).toBe(
      false,
    )
  })
})

describe('selectUndoSnapshot', () => {
  it('is null when there is nothing to undo', () => {
    expect(selectUndoSnapshot(loaded)).toBeNull()
  })

  it('carries the prior scheduling while the window is open', () => {
    expect(selectUndoSnapshot(rootWith(captureStateMocks.undoArmed))).toEqual({
      endeavorId: 'fresh-task',
      title: 'Draft the announcement',
      scheduledAt: captureMockAt(17, 10, 15),
      previousStart: null,
      previousDue: null,
      previousDeferCount: 0,
    })
  })

  it('is null once expired, so a late tap has nothing to dispatch', () => {
    expect(selectUndoSnapshot(rootWith(captureStateMocks.undoExpired))).toBeNull()
  })
})
