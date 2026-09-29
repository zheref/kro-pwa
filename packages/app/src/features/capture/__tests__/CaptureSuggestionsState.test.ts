/**
 * The suggestions pane's state tier: Shifters, reducer arms, Selectors and the
 * multi-add Producer — always through `makeStore` with stubbed services.
 */
import { EndeavorKind, type LocalStore, makeEndeavor } from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  type AppStore,
  type RootState,
  makeStore,
  stubbedThunkExtra,
} from '../../../library/store'
import { makeInMemoryLocalStore } from '../../../services/localStore/InMemoryLocalStore'
import {
  captureSlice,
  userDidRequestCapture,
  userDidPickSuggestion,
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
  loadCaptureContextThunk,
  setSuggestionsShownThunk,
} from '../CaptureProducer'
import {
  SUGGESTIONS_SHOWN_KEY,
  suggestionsShownFromStored,
} from '../CaptureSuggestions'
import {
  CaptureDestination,
  CaptureKind,
  multiAddIntentFor,
} from '../CaptureRules'
import {
  selectAlsoJustCreatedEndeavors,
  selectCanShowCaptureSuggestions,
  selectJustCreatedEndeavor,
  selectPendingTriageEndeavors,
  selectCaptureStatusReason,
  selectIsCaptureSuggestionsShown,
  selectCaptureSuggestions,
  selectSuggestionsToAdd,
} from '../CaptureSelectors'
import {
  withSuggestionApplied,
  withSuggestionSelectionToggled,
  withRouteDelivered,
  withSuggestionsAddedToInbox,
  withSuggestionsShown,
} from '../CaptureShifters'

const reduce = captureSlice.reducer
const open = captureSuggestionStateMocks.promptWithSuggestions
const twoSelected = captureSuggestionStateMocks.promptWithTwoSelected
const closed = captureStateMocks.loadedPool

describe('withSuggestionApplied', () => {
  it('fills the draft from the picked card', () => {
    const next = withSuggestionApplied(open, {
      suggestion: captureSuggestionMocks.task,
      now: CAPTURE_MOCK_NOW,
    })
    expect(next.prompt?.draft.title).toBe('Prepare presentation slides')
    expect(next.prompt?.draft.rewards).toBe(30)
  })

  it('drops open time edits and keeps the host on one the kind supports', () => {
    const next = withSuggestionApplied(open, {
      suggestion: captureSuggestionMocks.eventSoon,
      now: CAPTURE_MOCK_NOW,
    })
    expect(next.prompt?.editor).toBeNull()
    expect(next.prompt?.draft.destination).toBe(CaptureDestination.local)
    expect(next.prompt?.draft.kind).toBe(CaptureKind.event)
  })

  it('is a no-op with no prompt open', () => {
    expect(
      withSuggestionApplied(closed, {
        suggestion: captureSuggestionMocks.task,
        now: CAPTURE_MOCK_NOW,
      }),
    ).toBe(closed)
  })
})

describe('withSuggestionSelectionToggled', () => {
  it('ticks a card in tick order', () => {
    expect(twoSelected.prompt?.selectedSuggestionIds).toEqual([
      captureSuggestionMocks.task.id,
      captureSuggestionMocks.reminder.id,
    ])
  })

  it('unticks a ticked card', () => {
    expect(
      withSuggestionSelectionToggled(
        twoSelected,
        captureSuggestionMocks.task.id,
      ).prompt?.selectedSuggestionIds,
    ).toEqual([captureSuggestionMocks.reminder.id])
  })

  it('is a no-op with no prompt open', () => {
    expect(withSuggestionSelectionToggled(closed, 'x')).toBe(closed)
  })
})

describe('withSuggestionsAddedToInbox', () => {
  const stored = makeEndeavor({
    id: 'new-1',
    title: '📊 Prepare presentation slides',
    kind: EndeavorKind.task,
    createdAt: CAPTURE_MOCK_NOW,
  })

  it('joins the pool, clears what landed and tallies it, keeping the prompt open', () => {
    const next = withSuggestionsAddedToInbox(twoSelected, {
      added: [
        { suggestionId: captureSuggestionMocks.task.id, endeavor: stored },
      ],
      failedSuggestionIds: [captureSuggestionMocks.reminder.id],
      now: CAPTURE_MOCK_NOW,
    })
    expect(next.endeavors).toContain(stored)
    expect(next.prompt?.selectedSuggestionIds).toEqual([
      captureSuggestionMocks.reminder.id,
    ])
    expect(next.prompt?.suggestionNotice).toEqual({
      toInbox: 1,
      toPlan: 0,
      failed: 1,
    })
    expect(next.prompt?.draft).toBe(twoSelected.prompt?.draft)
  })

  it('changes nothing for an empty batch', () => {
    expect(
      withSuggestionsAddedToInbox(twoSelected, {
        added: [],
        failedSuggestionIds: [],
        now: CAPTURE_MOCK_NOW,
      }),
    ).toBe(twoSelected)
  })

  it('still records the rows when the prompt has already closed', () => {
    const next = withSuggestionsAddedToInbox(closed, {
      added: [{ suggestionId: 'x', endeavor: stored }],
      failedSuggestionIds: [],
      now: CAPTURE_MOCK_NOW,
    })
    expect(next.prompt).toBeNull()
    expect(next.endeavors).toContain(stored)
  })
})

describe('userDidPickSuggestion / userDidToggleSuggestion', () => {
  it('applies a known suggestion', () => {
    expect(
      reduce(
        open,
        userDidPickSuggestion({
          suggestionId: captureSuggestionMocks.habit.id,
          now: CAPTURE_MOCK_NOW,
        }),
      ).prompt?.draft.kind,
    ).toBe(CaptureKind.habit)
  })

  it('ignores an unknown id', () => {
    expect(
      reduce(
        open,
        userDidPickSuggestion({ suggestionId: 'nope', now: CAPTURE_MOCK_NOW }),
      ),
    ).toEqual(open)
  })

  it('toggles the selection', () => {
    const once = reduce(
      open,
      userDidToggleSuggestion({ suggestionId: captureSuggestionMocks.task.id }),
    )
    expect(once.prompt?.selectedSuggestionIds).toEqual([
      captureSuggestionMocks.task.id,
    ])
    expect(
      reduce(
        once,
        userDidToggleSuggestion({
          suggestionId: captureSuggestionMocks.task.id,
        }),
      ).prompt?.selectedSuggestionIds,
    ).toEqual([])
  })
})

/**
 * A hand-built root (`RC-55`): the Selectors read `capture` alone, so the
 * root is that slice and nothing else — never a real store's state.
 */
const root = (capture: RootState['capture']): RootState =>
  ({ capture }) as unknown as RootState

describe('the suggestion Selectors', () => {
  it('offers the catalogue only with the flag on and a prompt open', () => {
    expect(selectCaptureSuggestions(root(open)).length).toBe(44)
    expect(
      selectCaptureSuggestions(root(captureStateMocks.promptOpenOnTask)),
    ).toEqual([])
    expect(selectCaptureSuggestions(root(closed))).toEqual([])
  })

  it('pairs every ticked card, events included, with a host its kind supports', () => {
    const items = selectSuggestionsToAdd(
      root(
        withSuggestionSelectionToggled(
          twoSelected,
          captureSuggestionMocks.eventSoon.id,
        ),
      ),
    )
    expect(items.map((item) => item.suggestion.id)).toEqual([
      captureSuggestionMocks.task.id,
      captureSuggestionMocks.reminder.id,
      captureSuggestionMocks.eventSoon.id,
    ])
    expect(items.every((item) => item.destination === 'local')).toBe(true)
  })

  it('reads the multi-add tally in the status line, else the blocker', () => {
    const tallied = withSuggestionsAddedToInbox(twoSelected, {
      added: [],
      failedSuggestionIds: [captureSuggestionMocks.task.id],
      now: CAPTURE_MOCK_NOW,
    })
    expect(selectCaptureStatusReason(root(tallied))).toBe(
      '1 couldn’t be saved — still selected.',
    )
    expect(selectCaptureStatusReason(root(open))).toBe(
      'Enter a title to add this task.',
    )
  })
})

describe('addSuggestionsThunk', () => {
  const storeWith = (localStore: LocalStore): AppStore => {
    const store = makeStore({ ...stubbedThunkExtra, localStore })
    return store
  }
  const items = [
    {
      suggestion: captureSuggestionMocks.task,
      id: 'new-task',
      destination: CaptureDestination.local,
    },
    {
      suggestion: captureSuggestionMocks.reminder,
      id: 'new-reminder',
      destination: CaptureDestination.local,
    },
  ]

  it('writes every item to storage and adds them all', async () => {
    const localStore = makeInMemoryLocalStore({ endeavors: [] })
    const store = storeWith(localStore)
    const action = await store.dispatch(
      addSuggestionsThunk({ items, now: CAPTURE_MOCK_NOW }),
    )
    const payload = action.payload as {
      ok: boolean
      value: { items: { result: { ok: boolean } }[] }
    }
    expect(payload.ok).toBe(true)
    expect(payload.value.items.map((item) => item.result.ok)).toEqual([
      true,
      true,
    ])
    expect((await localStore.endeavors.all()).length).toBe(2)
    expect(store.getState().capture.endeavors.map((row) => row.id)).toEqual([
      'new-task',
      'new-reminder',
    ])
  })

  it('reports a partial failure per item without throwing or stopping', async () => {
    const localStore = makeInMemoryLocalStore({ endeavors: [] })
    let calls = 0
    const flaky: LocalStore = {
      ...localStore,
      endeavors: {
        ...localStore.endeavors,
        put: (record) => {
          calls += 1
          return calls === 1
            ? Promise.reject(new Error('quota exceeded'))
            : localStore.endeavors.put(record)
        },
      },
    }
    const store = storeWith(flaky)
    const action = await store.dispatch(
      addSuggestionsThunk({
        items: [
          ...items,
          {
            suggestion: captureSuggestionMocks.eventSoon,
            id: 'new-event',
            destination: CaptureDestination.local,
          },
        ],
        now: CAPTURE_MOCK_NOW,
      }),
    )
    const payload = action.payload as {
      ok: boolean
      value: { items: { suggestionId: string; result: { ok: boolean } }[] }
    }
    expect(payload.ok).toBe(true)
    expect(payload.value.items.map((item) => item.result.ok)).toEqual([
      false,
      true,
      true,
    ])
    expect(store.getState().capture.endeavors.map((row) => row.id)).toEqual([
      'new-reminder',
      'new-event',
    ])
  })

  it('resolves an empty batch to no outcomes', async () => {
    const store = storeWith(makeInMemoryLocalStore({ endeavors: [] }))
    const action = await store.dispatch(
      addSuggestionsThunk({ items: [], now: CAPTURE_MOCK_NOW }),
    )
    const payload = action.payload as {
      ok: boolean
      value: { items: unknown[] }
    }
    expect(payload.ok).toBe(true)
    expect(payload.value.items).toEqual([])
    expect(store.getState().capture.endeavors).toEqual([])
  })
})

describe('a mixed-kind multi-add', () => {
  it('stores every kind, closes the prompt and routes to the Inbox', async () => {
    const localStore = makeInMemoryLocalStore({ endeavors: [] })
    const store = makeStore({ ...stubbedThunkExtra, localStore })
    store.dispatch(
      userDidRequestCapture({ kind: CaptureKind.task, now: CAPTURE_MOCK_NOW }),
    )
    await store.dispatch(
      addSuggestionsThunk({
        items: [
          {
            suggestion: captureSuggestionMocks.task,
            id: 't',
            destination: CaptureDestination.local,
          },
          {
            suggestion: captureSuggestionMocks.habit,
            id: 'h',
            destination: CaptureDestination.local,
          },
          {
            suggestion: captureSuggestionMocks.eventSoon,
            id: 'e',
            destination: CaptureDestination.local,
          },
        ],
        now: CAPTURE_MOCK_NOW,
      }),
    )
    const rows = store.getState().capture.endeavors
    expect(rows.map((row) => row.id)).toEqual(['t', 'h', 'e'])
    expect(rows.find((row) => row.id === 'e')?.start).not.toBeNull()
    // Everything landed: the prompt closes and the Inbox is the next stop,
    // with both Inbox-bound rows Just Created (the event is in the Plan).
    expect(store.getState().capture.prompt).toBeNull()
    expect(store.getState().capture.navigation?.route).toEqual({
      kind: 'inbox',
      endeavorId: 't',
      additionalEndeavorIds: ['h'],
    })
  })
})

describe('the suggestions pane’s on/off choice', () => {
  it('withSuggestionsShown shows, hides, and is a no-op when unchanged', () => {
    const hidden = captureStateMocks.promptOpenOnTask
    expect(hidden.isSuggestionsShown).toBe(false)
    const shown = withSuggestionsShown(hidden, true)
    expect(shown.isSuggestionsShown).toBe(true)
    expect(withSuggestionsShown(shown, false).isSuggestionsShown).toBe(false)
    expect(withSuggestionsShown(shown, true)).toBe(shown)
  })

  it('persists the choice and applies it, even if storage fails', async () => {
    const localStore = makeInMemoryLocalStore({ endeavors: [] })
    const store = makeStore({ ...stubbedThunkExtra, localStore })
    await store.dispatch(setSuggestionsShownThunk({ shown: true }))
    expect(store.getState().capture.isSuggestionsShown).toBe(true)
    expect(localStore.preferences.get(SUGGESTIONS_SHOWN_KEY)).toBe(true)

    const broken: LocalStore = {
      ...localStore,
      preferences: {
        ...localStore.preferences,
        set: () => {
          throw new Error('quota exceeded')
        },
      },
    }
    const brokenStore = makeStore({ ...stubbedThunkExtra, localStore: broken })
    const action = await brokenStore.dispatch(
      setSuggestionsShownThunk({ shown: true }),
    )
    expect((action.payload as { ok: boolean }).ok).toBe(true)
    expect(brokenStore.getState().capture.isSuggestionsShown).toBe(true)
  })

  it('loads the remembered choice with the capture context, hidden by default', async () => {
    const fresh = makeStore({
      ...stubbedThunkExtra,
      localStore: makeInMemoryLocalStore({ endeavors: [] }),
    })
    await fresh.dispatch(loadCaptureContextThunk({ now: CAPTURE_MOCK_NOW }))
    expect(fresh.getState().capture.isSuggestionsShown).toBe(false)

    const remembered = makeInMemoryLocalStore({ endeavors: [] })
    remembered.preferences.set(SUGGESTIONS_SHOWN_KEY, true)
    const store = makeStore({ ...stubbedThunkExtra, localStore: remembered })
    await store.dispatch(loadCaptureContextThunk({ now: CAPTURE_MOCK_NOW }))
    expect(store.getState().capture.isSuggestionsShown).toBe(true)
  })

  it('reads the stored value defensively', () => {
    expect(suggestionsShownFromStored(true)).toBe(true)
    expect(suggestionsShownFromStored('true')).toBe(true)
    expect(suggestionsShownFromStored(undefined)).toBe(false)
    expect(suggestionsShownFromStored('yes')).toBe(false)
  })

  it('offers the toggle whenever the flag is on, and cards only when shown', () => {
    const hiddenOn = withSuggestionsShown(
      captureSuggestionStateMocks.promptWithSuggestions,
      false,
    )
    expect(selectCanShowCaptureSuggestions(root(hiddenOn))).toBe(true)
    expect(selectCaptureSuggestions(root(hiddenOn))).toEqual([])
    expect(selectIsCaptureSuggestionsShown(root(open))).toBe(true)
    expect(
      selectCanShowCaptureSuggestions(root(captureStateMocks.promptOpenOnTask)),
    ).toBe(false)
  })
})

describe('where a multi-add takes the user', () => {
  const at = (id: string, kind: EndeavorKind, start: Date | null = null) =>
    makeEndeavor({
      id,
      title: id,
      kind,
      start,
      duration: start ? 1800 : null,
      createdAt: CAPTURE_MOCK_NOW,
    })

  it('goes to the Inbox with every Inbox-bound row Just Created', () => {
    const intent = multiAddIntentFor(
      [at('a', EndeavorKind.task), at('b', EndeavorKind.reminder)],
      CAPTURE_MOCK_NOW,
    )
    expect(intent?.route).toEqual({
      kind: 'inbox',
      endeavorId: 'a',
      additionalEndeavorIds: ['b'],
    })
  })

  it('still goes to the Inbox when some rows went to the Plan', () => {
    const intent = multiAddIntentFor(
      [
        at('e', EndeavorKind.calendarEvent, new Date(2026, 2, 17, 11)),
        at('t', EndeavorKind.task),
      ],
      CAPTURE_MOCK_NOW,
    )
    expect(intent?.route.kind).toBe('inbox')
    if (intent?.route.kind === 'inbox')
      expect(intent.route.endeavorId).toBe('t')
  })

  it('routes an all-events batch like a single event capture, and nothing for none', () => {
    const intent = multiAddIntentFor(
      [at('e', EndeavorKind.calendarEvent, new Date(2026, 2, 17, 11))],
      CAPTURE_MOCK_NOW,
    )
    expect(intent?.route.kind).toBe('plan')
    expect(multiAddIntentFor([], CAPTURE_MOCK_NOW)).toBeNull()
  })

  it('shows every added row as Just Created once delivered, and keeps them out of Pending Triage', () => {
    const state = root(captureSuggestionStateMocks.multiAddDelivered)
    expect(selectJustCreatedEndeavor(state)?.id).toBe(
      multiAddedEndeavors.task.id,
    )
    expect(selectAlsoJustCreatedEndeavors(state).map((row) => row.id)).toEqual([
      multiAddedEndeavors.reminder.id,
    ])
    expect(
      selectPendingTriageEndeavors(state).some(
        (row) =>
          row.id === multiAddedEndeavors.task.id ||
          row.id === multiAddedEndeavors.reminder.id,
      ),
    ).toBe(false)
  })
})
