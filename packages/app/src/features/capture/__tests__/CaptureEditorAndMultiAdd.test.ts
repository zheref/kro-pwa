/**
 * The prompt's one exclusive editor (`UZF-9`), the multi-add's in-flight state
 * (`RC-24`) and the suggestion Shifters, arms and Selectors that carry them —
 * each with three or more named scenarios (`UZF-18`).
 *
 * Every state comes from `CaptureMocks`, never assembled inline (`RC-31`), and
 * every Selector runs against a hand-built root (`RC-55`).
 */
import {
  EndeavorKind,
  err,
  makeEndeavor,
  makeReconciliationContext,
  ok,
  resolvedKind,
} from '@kro/core'
import { appleRow, recurrenceMocks } from '@kro/core/mocks'
import { describe, expect, it } from 'vitest'
import {
  type AppStore,
  type RootState,
  makeStore,
  stubbedThunkExtra,
} from '../../../library/store'
import { makeInMemoryLocalStore } from '../../../services/localStore/InMemoryLocalStore'
import { CaptureExceptions } from '../CaptureException'
import {
  captureSlice,
  userDidPickSuggestion,
  userDidRequestCapture,
  userDidSetPanel,
  userDidToggleSuggestion,
} from '../CaptureFeature'
import {
  CAPTURE_MOCK_NOW,
  captureStateMocks,
  captureSuggestionMocks,
  captureSuggestionStateMocks,
  multiAddedEndeavors,
} from '../CaptureMocks'
import {
  addSuggestionsThunk,
  setSuggestionsShownThunk,
} from '../CaptureProducer'
import {
  CaptureDestination,
  CaptureKind,
  isCaptureRowTriageable,
  pendingTriageEndeavors,
} from '../CaptureRules'
import {
  selectAlsoJustCreatedEndeavors,
  selectCaptureKindCapabilities,
  selectCaptureOpenPanel,
  selectCaptureStatusReason,
  selectIsAddingCaptureSuggestions,
  selectIsCaptureSuggestionsShown,
  selectIsEditingCaptureEndTime,
  selectIsEditingCaptureStartTime,
  selectSelectedSuggestionIds,
  selectSuggestionsToAdd,
  selectUntriageableInboxRowIds,
} from '../CaptureSelectors'
import {
  withPanelSet,
  withSuggestionBatchSettled,
  withSuggestionPicked,
  withSuggestionSelectionToggled,
  withSuggestionsAddFailed,
  withSuggestionsAddStarted,
  withSuggestionsShown,
  withTimeEditBegun,
  withTimePicked,
} from '../CaptureShifters'

const reduce = captureSlice.reducer
const root = (capture: RootState['capture']): RootState =>
  ({ capture }) as unknown as RootState

const open = captureSuggestionStateMocks.promptWithSuggestions
const twoSelected = captureSuggestionStateMocks.promptWithTwoSelected
const inFlight = captureSuggestionStateMocks.multiAddInFlight
const partlyFailed = captureSuggestionStateMocks.multiAddPartlyFailed
const delivered = captureSuggestionStateMocks.multiAddDelivered
const closed = captureStateMocks.loadedPool
const onTask = captureStateMocks.promptOpenOnTask
const onHabit = captureStateMocks.promptOpenOnHabit
const onEvent = captureStateMocks.promptOpenOnEvent

// ---------------------------------------------------------------------------
// The one exclusive editor
// ---------------------------------------------------------------------------

describe('withPanelSet — one editor open at a time', () => {
  it('opens a panel on a prompt with nothing open (user taps the Value chip)', () => {
    expect(withPanelSet(onTask, 'value').prompt?.editor).toEqual({
      kind: 'panel',
      panel: 'value',
    })
  })

  it('closes an open time picker the way its Done would, keeping the turned value', () => {
    const turned = withTimePicked(
      withTimeEditBegun(onTask, 'start'),
      'start',
      new Date(2026, 2, 17, 15, 30),
    )
    const next = withPanelSet(turned, 'rewards')
    expect(next.prompt?.editor).toEqual({ kind: 'panel', panel: 'rewards' })
    expect(next.prompt?.draft.time.getHours()).toBe(15)
    expect(next.prompt?.draft.hasTime).toBe(true)
  })

  it('closing a panel leaves a time picker alone (Escape peels only the panel)', () => {
    const picking = withTimeEditBegun(onTask, 'start')
    expect(withPanelSet(picking, null)).toBe(picking)
  })

  it('is a no-op re-opening the open panel, and with no prompt at all', () => {
    const valued = withPanelSet(onTask, 'value')
    expect(withPanelSet(valued, 'value')).toBe(valued)
    expect(withPanelSet(closed, 'value')).toBe(closed)
  })
})

describe('withTimeEditBegun — the time half of the same editor', () => {
  it('closes an open panel when a picker opens (user taps Time with Value open)', () => {
    const next = withTimeEditBegun(withPanelSet(onTask, 'value'), 'start')
    expect(next.prompt?.editor?.kind).toBe('time')
  })

  it('switching from the start picker to the end picker keeps one editor', () => {
    const next = withTimeEditBegun(withTimeEditBegun(onEvent, 'start'), 'end')
    expect(next.prompt?.editor).toMatchObject({ kind: 'time', field: 'end' })
  })

  it('re-opening the same picker keeps its original snapshot', () => {
    const first = withTimeEditBegun(onTask, 'start')
    expect(withTimeEditBegun(first, 'start')).toBe(first)
  })
})

describe('userDidSetPanel', () => {
  it('opens the date panel from the slice (the Page dispatches it)', () => {
    expect(
      reduce(onTask, userDidSetPanel({ panel: 'date' })).prompt?.editor,
    ).toEqual({ kind: 'panel', panel: 'date' })
  })

  it('closes it again with null', () => {
    const dated = reduce(onTask, userDidSetPanel({ panel: 'date' }))
    expect(
      reduce(dated, userDidSetPanel({ panel: null })).prompt?.editor,
    ).toBeNull()
  })

  it('is a no-op with no prompt open', () => {
    expect(reduce(closed, userDidSetPanel({ panel: 'date' }))).toEqual(closed)
  })
})

describe('the editor Selectors', () => {
  it('reads an open panel as the panel, and neither time picker as editing', () => {
    const state = root(withPanelSet(onTask, 'repeat'))
    expect(selectCaptureOpenPanel(state)).toBe('repeat')
    expect(selectIsEditingCaptureStartTime(state)).toBe(false)
    expect(selectIsEditingCaptureEndTime(state)).toBe(false)
  })

  it('reads an open end picker as editing the end only', () => {
    const state = root(withTimeEditBegun(onEvent, 'end'))
    expect(selectCaptureOpenPanel(state)).toBeNull()
    expect(selectIsEditingCaptureStartTime(state)).toBe(false)
    expect(selectIsEditingCaptureEndTime(state)).toBe(true)
  })

  it('reads nothing open on a closed prompt', () => {
    const state = root(closed)
    expect(selectCaptureOpenPanel(state)).toBeNull()
    expect(selectIsEditingCaptureStartTime(state)).toBe(false)
    expect(selectIsEditingCaptureEndTime(state)).toBe(false)
  })
})

describe('selectCaptureKindCapabilities', () => {
  it('lets a Task carry rewards, a value, a duration and a clearable time', () => {
    expect(selectCaptureKindCapabilities(root(onTask))).toEqual({
      earnsRewards: true,
      supportsValue: true,
      supportsDuration: true,
      isTimeClearable: true,
    })
  })

  it('pins a Habit’s time (not clearable) and an Event earns nothing', () => {
    expect(selectCaptureKindCapabilities(root(onHabit))?.isTimeClearable).toBe(
      false,
    )
    expect(selectCaptureKindCapabilities(root(onEvent))).toEqual({
      earnsRewards: false,
      supportsValue: false,
      supportsDuration: false,
      isTimeClearable: true,
    })
  })

  it('is null with no prompt open, and stable while only the title changes', () => {
    expect(selectCaptureKindCapabilities(root(closed))).toBeNull()
    const typed = reduce(
      onTask,
      captureSlice.actions.userDidEditTitle({ title: 'Call the bank' }),
    )
    expect(selectCaptureKindCapabilities(root(typed))).toBe(
      selectCaptureKindCapabilities(root(onTask)),
    )
  })
})

// ---------------------------------------------------------------------------
// Suggestion picks and ticks
// ---------------------------------------------------------------------------

describe('withSuggestionPicked', () => {
  it('fills the draft from a known card (user clicks “Take vitamins”)', () => {
    const next = withSuggestionPicked(open, {
      suggestionId: captureSuggestionMocks.reminder.id,
      now: CAPTURE_MOCK_NOW,
    })
    expect(next.prompt?.draft.kind).toBe(CaptureKind.reminder)
  })

  it('ignores an id the catalogue does not know', () => {
    expect(
      withSuggestionPicked(open, {
        suggestionId: 'gone',
        now: CAPTURE_MOCK_NOW,
      }),
    ).toBe(open)
  })

  it('is a no-op with no prompt open', () => {
    expect(
      withSuggestionPicked(closed, {
        suggestionId: captureSuggestionMocks.task.id,
        now: CAPTURE_MOCK_NOW,
      }),
    ).toBe(closed)
  })
})

describe('userDidPickSuggestion', () => {
  it('closes an open editor, since the suggestion replaces what it was editing', () => {
    const next = reduce(
      withPanelSet(open, 'value'),
      userDidPickSuggestion({
        suggestionId: captureSuggestionMocks.task.id,
        now: CAPTURE_MOCK_NOW,
      }),
    )
    expect(next.prompt?.editor).toBeNull()
  })

  it('is a no-op after the prompt closed (a late click on a leaving card)', () => {
    expect(
      reduce(
        closed,
        userDidPickSuggestion({
          suggestionId: captureSuggestionMocks.task.id,
          now: CAPTURE_MOCK_NOW,
        }),
      ),
    ).toEqual(closed)
  })

  it('re-stamps the clock anchor with the pick’s own instant', () => {
    const later = new Date(CAPTURE_MOCK_NOW.getTime() + 60_000)
    expect(
      reduce(
        open,
        userDidPickSuggestion({
          suggestionId: captureSuggestionMocks.task.id,
          now: later,
        }),
      ).clockAnchor,
    ).toEqual(later)
  })
})

describe('userDidToggleSuggestion', () => {
  it('keeps tick order across three ticks', () => {
    const ids = [
      captureSuggestionMocks.reminder.id,
      captureSuggestionMocks.task.id,
      captureSuggestionMocks.habit.id,
    ]
    const ticked = ids.reduce(
      (state, suggestionId) =>
        reduce(state, userDidToggleSuggestion({ suggestionId })),
      open,
    )
    expect(ticked.prompt?.selectedSuggestionIds).toEqual(ids)
  })

  it('unticking the middle card keeps the others in order', () => {
    const next = reduce(
      twoSelected,
      userDidToggleSuggestion({ suggestionId: captureSuggestionMocks.task.id }),
    )
    expect(next.prompt?.selectedSuggestionIds).toEqual([
      captureSuggestionMocks.reminder.id,
    ])
  })

  it('is a no-op with the prompt closed', () => {
    expect(
      reduce(
        closed,
        userDidToggleSuggestion({
          suggestionId: captureSuggestionMocks.task.id,
        }),
      ),
    ).toEqual(closed)
  })

  it('retires the last multi-add’s tally from the status line', () => {
    const next = reduce(
      partlyFailed,
      userDidToggleSuggestion({ suggestionId: captureSuggestionMocks.task.id }),
    )
    expect(next.prompt?.suggestionNotice).toBeNull()
  })
})

describe('selectSelectedSuggestionIds', () => {
  it('reads the ticked ids in tick order', () => {
    expect(selectSelectedSuggestionIds(root(twoSelected))).toEqual([
      captureSuggestionMocks.task.id,
      captureSuggestionMocks.reminder.id,
    ])
  })

  it('is empty with nothing ticked', () => {
    expect(selectSelectedSuggestionIds(root(open))).toEqual([])
  })

  it('is the same empty list with no prompt, so the pane does not re-render', () => {
    expect(selectSelectedSuggestionIds(root(closed))).toBe(
      selectSelectedSuggestionIds(root(captureStateMocks.idle)),
    )
  })
})

describe('selectSuggestionsToAdd', () => {
  it('pairs each ticked card with a host its kind supports', () => {
    expect(
      selectSuggestionsToAdd(root(twoSelected)).map((item) => [
        item.suggestion.id,
        item.destination,
      ]),
    ).toEqual([
      [captureSuggestionMocks.task.id, CaptureDestination.local],
      [captureSuggestionMocks.reminder.id, CaptureDestination.local],
    ])
  })

  it('skips an id the catalogue no longer knows', () => {
    const withStale = withSuggestionSelectionToggled(twoSelected, 'retired-id')
    expect(selectSuggestionsToAdd(root(withStale)).length).toBe(2)
  })

  it('is empty with nothing ticked or no prompt', () => {
    expect(selectSuggestionsToAdd(root(open))).toEqual([])
    expect(selectSuggestionsToAdd(root(closed))).toEqual([])
  })
})

describe('selectIsCaptureSuggestionsShown', () => {
  it('reads the pane as shown when the user left it shown', () => {
    expect(selectIsCaptureSuggestionsShown(root(open))).toBe(true)
  })

  it('reads it as hidden once hidden', () => {
    expect(
      selectIsCaptureSuggestionsShown(root(withSuggestionsShown(open, false))),
    ).toBe(false)
  })

  it('is hidden by default before anything was remembered', () => {
    expect(selectIsCaptureSuggestionsShown(root(onTask))).toBe(false)
  })
})

describe('withSuggestionsShown', () => {
  it('shows the pane', () => {
    expect(withSuggestionsShown(onTask, true).isSuggestionsShown).toBe(true)
  })

  it('hides it again', () => {
    expect(withSuggestionsShown(open, false).isSuggestionsShown).toBe(false)
  })

  it('is a no-op when the choice is unchanged', () => {
    expect(withSuggestionsShown(open, true)).toBe(open)
  })
})

describe('selectCaptureStatusReason', () => {
  it('reads a partial failure as what landed plus what did not', () => {
    expect(selectCaptureStatusReason(root(partlyFailed))).toBe(
      'Added 1 to Inbox. 1 couldn’t be saved — still selected.',
    )
  })

  it('falls back to what blocks Add with no tally standing', () => {
    expect(selectCaptureStatusReason(root(open))).toBe(
      'Enter a title to add this task.',
    )
  })

  it('says nothing with no prompt open', () => {
    expect(selectCaptureStatusReason(root(closed))).toBeNull()
  })
})

describe('selectAlsoJustCreatedEndeavors', () => {
  it('lists the rest of a delivered multi-add after the first row', () => {
    expect(
      selectAlsoJustCreatedEndeavors(root(delivered)).map((row) => row.id),
    ).toEqual([multiAddedEndeavors.reminder.id])
  })

  it('is empty after an ordinary single capture', () => {
    expect(
      selectAlsoJustCreatedEndeavors(root(captureStateMocks.loadedPool)),
    ).toEqual([])
  })

  it('is empty while the multi-add is still being written', () => {
    expect(selectAlsoJustCreatedEndeavors(root(inFlight))).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// The multi-add's in-flight state
// ---------------------------------------------------------------------------

describe('withSuggestionsAddStarted', () => {
  it('spends Add the moment the write starts', () => {
    expect(inFlight.prompt?.isAddingSuggestions).toBe(true)
  })

  it('is a no-op when a write is already in flight', () => {
    expect(withSuggestionsAddStarted(inFlight)).toBe(inFlight)
  })

  it('is a no-op with no prompt open', () => {
    expect(withSuggestionsAddStarted(closed)).toBe(closed)
  })
})

describe('withSuggestionsAddFailed', () => {
  const failure = CaptureExceptions.unknown('disk full')

  it('reports the exception and makes Add live again for a retry', () => {
    const next = withSuggestionsAddFailed(inFlight, failure)
    expect(next.load).toEqual({ kind: 'failed', exception: failure })
    expect(next.prompt?.isAddingSuggestions).toBe(false)
    expect(next.prompt?.selectedSuggestionIds).toEqual(
      twoSelected.prompt?.selectedSuggestionIds,
    )
  })

  it('reports it on a prompt that was not writing, touching nothing else', () => {
    const next = withSuggestionsAddFailed(twoSelected, failure)
    expect(next.load.kind).toBe('failed')
    expect(next.prompt).toBe(twoSelected.prompt)
  })

  it('still reports it after the prompt closed', () => {
    expect(withSuggestionsAddFailed(closed, failure).load.kind).toBe('failed')
  })
})

describe('withSuggestionBatchSettled', () => {
  it('closes the prompt and routes to the Inbox when everything landed', () => {
    const settled = withSuggestionBatchSettled(inFlight, {
      items: [
        {
          suggestionId: captureSuggestionMocks.task.id,
          result: ok(multiAddedEndeavors.task),
        },
      ],
      now: CAPTURE_MOCK_NOW,
    })
    expect(settled.prompt).toBeNull()
    expect(settled.navigation?.route.kind).toBe('inbox')
  })

  it('keeps the failed card ticked, tallies, and frees Add on a partial failure', () => {
    expect(partlyFailed.prompt?.selectedSuggestionIds).toEqual([
      captureSuggestionMocks.reminder.id,
    ])
    expect(partlyFailed.prompt?.suggestionNotice).toEqual({
      toInbox: 1,
      toPlan: 0,
      failed: 1,
    })
    expect(partlyFailed.prompt?.isAddingSuggestions).toBe(false)
  })

  it('an empty batch changes nothing but freeing Add', () => {
    const settled = withSuggestionBatchSettled(inFlight, {
      items: [],
      now: CAPTURE_MOCK_NOW,
    })
    expect(settled.prompt?.isAddingSuggestions).toBe(false)
    expect(settled.endeavors).toBe(inFlight.endeavors)
  })
})

describe('selectIsAddingCaptureSuggestions', () => {
  it('is true while a multi-add is being written', () => {
    expect(selectIsAddingCaptureSuggestions(root(inFlight))).toBe(true)
  })

  it('is false once it settled', () => {
    expect(selectIsAddingCaptureSuggestions(root(partlyFailed))).toBe(false)
  })

  it('is false with no prompt open', () => {
    expect(selectIsAddingCaptureSuggestions(root(closed))).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// The thunk lifecycle arms
// ---------------------------------------------------------------------------

const args = {
  items: [
    {
      suggestion: captureSuggestionMocks.task,
      id: 'new-task',
      destination: CaptureDestination.local,
    },
  ],
  now: CAPTURE_MOCK_NOW,
}

describe('addSuggestionsThunk lifecycle', () => {
  const openStore = (): AppStore => {
    const store = makeStore({
      ...stubbedThunkExtra,
      localStore: makeInMemoryLocalStore({ endeavors: [] }),
    })
    store.dispatch(
      userDidRequestCapture({ kind: CaptureKind.task, now: CAPTURE_MOCK_NOW }),
    )
    return store
  }

  it('.pending spends Add the moment the user presses it', () => {
    const store = openStore()
    const running = store.dispatch(addSuggestionsThunk(args))
    expect(store.getState().capture.prompt?.isAddingSuggestions).toBe(true)
    return running
  })

  it('a second press while writing refuses itself, silently, before any write', async () => {
    const store = openStore()
    const first = store.dispatch(addSuggestionsThunk(args))
    const second = await store.dispatch(addSuggestionsThunk(args))
    await first
    expect(second.meta.requestStatus).toBe('rejected')
    expect(store.getState().capture.endeavors.map((row) => row.id)).toEqual([
      'new-task',
    ])
    expect(store.getState().capture.load.kind).toBe('loaded')
  })

  it('.fulfilled with a failed Result reports it and frees Add', () => {
    const next = reduce(
      inFlight,
      addSuggestionsThunk.fulfilled(
        err(CaptureExceptions.unknown('no storage')),
        'request',
        args,
      ),
    )
    expect(next.load.kind).toBe('failed')
    expect(next.prompt?.isAddingSuggestions).toBe(false)
  })

  it('.rejected (a genuine throw) degrades to an unknown exception', () => {
    const next = reduce(
      inFlight,
      addSuggestionsThunk.rejected(new Error('boom'), 'request', args),
    )
    expect(next.load).toMatchObject({
      kind: 'failed',
      exception: { kind: 'unknown', message: 'boom' },
    })
    expect(next.prompt?.isAddingSuggestions).toBe(false)
  })

  it('.rejected by cancellation is the one silent exit', () => {
    const aborted = Object.assign(new Error('aborted'), { name: 'AbortError' })
    expect(
      reduce(inFlight, addSuggestionsThunk.rejected(aborted, 'request', args)),
    ).toEqual(inFlight)
  })
})

describe('setSuggestionsShownThunk lifecycle', () => {
  it('.pending answers the toggle instantly, before storage settles', () => {
    expect(
      reduce(
        onTask,
        setSuggestionsShownThunk.pending('request', { shown: true }),
      ).isSuggestionsShown,
    ).toBe(true)
  })

  it('hides the pane and remembers it hidden', async () => {
    const localStore = makeInMemoryLocalStore({ endeavors: [] })
    const store = makeStore({ ...stubbedThunkExtra, localStore })
    await store.dispatch(setSuggestionsShownThunk({ shown: true }))
    await store.dispatch(setSuggestionsShownThunk({ shown: false }))
    expect(store.getState().capture.isSuggestionsShown).toBe(false)
  })

  it('.fulfilled with a failed Result leaves the pending answer standing', () => {
    const shown = reduce(
      onTask,
      setSuggestionsShownThunk.pending('request', { shown: true }),
    )
    expect(
      reduce(
        shown,
        setSuggestionsShownThunk.fulfilled(
          err(CaptureExceptions.unknown('x')),
          'request',
          { shown: true },
        ),
      ),
    ).toBe(shown)
  })

  it('.fulfilled confirms the settled choice', () => {
    expect(
      reduce(
        onTask,
        setSuggestionsShownThunk.fulfilled(ok(true), 'request', {
          shown: true,
        }),
      ).isSuggestionsShown,
    ).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Triage is offered only where it would open
// ---------------------------------------------------------------------------

describe('selectUntriageableInboxRowIds', () => {
  it('lists a multi-added habit in Just Created, which Triage never applies to', () => {
    expect(
      selectUntriageableInboxRowIds(
        root(captureSuggestionStateMocks.multiAddDeliveredWithHabit),
      ),
    ).toEqual([multiAddedEndeavors.habit.id])
  })

  it('is empty when every Just Created row is a task or reminder', () => {
    expect(selectUntriageableInboxRowIds(root(delivered))).toEqual([])
  })

  it('is empty with nothing Just Created', () => {
    expect(selectUntriageableInboxRowIds(root(closed))).toEqual([])
  })
})

describe('Pending Triage gates on the resolved kind, as Triage itself does', () => {
  // Stored as a task, but a daily Apple row resolves to a habit — so Triage
  // would refuse it. It must not be listed as owing a triage decision.
  const storedTaskResolvedHabit = appleRow({
    id: 'apple-daily',
    kind: EndeavorKind.task,
    recurrence: recurrenceMocks.daily,
    priority: 0,
    scheduled: false,
  })

  it('leaves out a row whose resolved kind is never triaged', () => {
    expect(resolvedKind(storedTaskResolvedHabit)).toBe(EndeavorKind.habit)
    expect(
      pendingTriageEndeavors(
        [storedTaskResolvedHabit],
        null,
        [],
        makeReconciliationContext({ now: CAPTURE_MOCK_NOW }),
      ),
    ).toEqual([])
  })

  it('still lists an unscheduled task whose resolved kind is a task', () => {
    const task = makeEndeavor({
      id: 'plain-task',
      title: 'Call the bank',
      kind: EndeavorKind.task,
      createdAt: CAPTURE_MOCK_NOW,
    })
    expect(
      pendingTriageEndeavors([task], null, [], makeReconciliationContext()).map(
        (row) => row.id,
      ),
    ).toEqual(['plain-task'])
  })

  it('offers no Triage on that row either, when it is Just Created', () => {
    expect(isCaptureRowTriageable(storedTaskResolvedHabit)).toBe(false)
  })
})
