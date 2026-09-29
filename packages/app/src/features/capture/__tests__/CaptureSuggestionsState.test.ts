/**
 * The suggestions pane's state tier: Shifters, reducer arms, Selectors and the
 * multi-add Producer — always through `makeStore` with stubbed services.
 */
import { type LocalStore, makeEndeavor, EndeavorKind } from '@kro/core'
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
  userDidPickSuggestion,
  userDidToggleSuggestion,
} from '../CaptureFeature'
import {
  CAPTURE_MOCK_NOW,
  captureStateMocks,
  captureSuggestionMocks,
  captureSuggestionStateMocks,
} from '../CaptureMocks'
import { addSuggestionsToInboxThunk } from '../CaptureProducer'
import { CaptureDestination, CaptureKind } from '../CaptureRules'
import {
  selectCaptureStatusReason,
  selectCaptureSuggestions,
  selectSuggestionsForInbox,
} from '../CaptureSelectors'
import {
  withSuggestionApplied,
  withSuggestionSelectionToggled,
  withSuggestionsAddedToInbox,
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
    expect(next.prompt?.startEdit).toBeNull()
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
    expect(next.prompt?.suggestionNotice).toEqual({ added: 1, failed: 1 })
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

const root = (capture: RootState['capture']): RootState =>
  ({ ...makeStore(stubbedThunkExtra).getState(), capture }) as RootState

describe('the suggestion Selectors', () => {
  it('offers the catalogue only with the flag on and a prompt open', () => {
    expect(selectCaptureSuggestions(root(open)).length).toBe(44)
    expect(
      selectCaptureSuggestions(root(captureStateMocks.promptOpenOnTask)),
    ).toEqual([])
    expect(selectCaptureSuggestions(root(closed))).toEqual([])
  })

  it('pairs each ticked, Inbox-able card with a host its kind supports', () => {
    const items = selectSuggestionsForInbox(
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
      'Added 0 to Inbox. 1 couldn’t be saved — still selected.',
    )
    expect(selectCaptureStatusReason(root(open))).toBe(
      'Enter a title to add this task.',
    )
  })
})

describe('addSuggestionsToInboxThunk', () => {
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
      addSuggestionsToInboxThunk({ items, now: CAPTURE_MOCK_NOW }),
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
      addSuggestionsToInboxThunk({
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
      false,
    ])
    expect(store.getState().capture.endeavors.map((row) => row.id)).toEqual([
      'new-reminder',
    ])
  })

  it('resolves an empty batch to no outcomes', async () => {
    const store = storeWith(makeInMemoryLocalStore({ endeavors: [] }))
    const action = await store.dispatch(
      addSuggestionsToInboxThunk({ items: [], now: CAPTURE_MOCK_NOW }),
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
