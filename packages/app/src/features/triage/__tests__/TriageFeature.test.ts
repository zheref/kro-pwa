import { EisenhowerQuadrant, type LocalStore, type Result } from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  type AppStore,
  makeStore,
  stubbedThunkExtra,
} from '../../../library/store'
import { makeInMemoryLocalStore } from '../../../services/localStore/InMemoryLocalStore'
import { TriageExpiryPreset } from '../TriageExpiry'
import {
  initialTriageState,
  onShareSheetDismissed,
  onTriageOutcomeConsumed,
  triageSlice,
  userDidSelectDueDate,
  userDidSelectDuration,
  userDidSelectExpiry,
  userDidSelectQuadrant,
  userDidSelectRewardPoints,
  userDidStepRewardPoints,
  userDidTapArchive,
  userDidTapCancel,
  userDidTapConfirm,
  userDidTapEdit,
  userDidTapEffortRating,
  userDidTapExpiryPreset,
  userDidTapShare,
  userDidTapStartNow,
  userDidTapValueRating,
} from '../TriageFeature'
import {
  TRIAGE_MOCK_NOW,
  triageEndeavorFixtures,
  triageFixtureRecords,
  triageMockAt,
  triageStateMocks,
} from '../TriageMocks'
import { openTriageThunk, saveTriageDecisionThunk } from '../TriageProducer'
import { deleteEndeavorThunk } from '../../do/DoProducer'
import { FindSurface } from '../../find/FindOperations'
import {
  performBulkOperationThunk,
  performEndeavorOperationThunk,
} from '../../find/FindProducer'

const reduce = triageSlice.reducer
const opened = triageStateMocks.pristine
const formOf = (state: typeof opened) => state.session?.form ?? null

const storeWith = (localStore: LocalStore): AppStore =>
  makeStore({ ...stubbedThunkExtra, localStore })

const seeded = () =>
  makeInMemoryLocalStore({ endeavors: triageFixtureRecords() })

// ---------------------------------------------------------------------------
// The open's `.pending` arm records its host
// ---------------------------------------------------------------------------

describe('openTriageThunk.pending — the host', () => {
  it('records the pane when the pane’s Triage segment opens a session', async () => {
    const store = storeWith(seeded())
    const pending = store.dispatch(
      openTriageThunk({
        endeavorId: triageEndeavorFixtures.unscheduledTask.id,
        now: TRIAGE_MOCK_NOW,
        presentation: 'pane',
      }),
    )
    expect(store.getState().triage.presentation).toBe('pane')
    await pending
  })

  it('records the carousel for the Inbox’s own hand-off', async () => {
    const store = storeWith(seeded())
    await store.dispatch(
      openTriageThunk({
        endeavorId: triageEndeavorFixtures.unscheduledTask.id,
        now: TRIAGE_MOCK_NOW,
      }),
    )
    expect(store.getState().triage.presentation).toBe('carousel')
  })

  it('keeps the host on a failed open, so the pane can say why', async () => {
    const store = storeWith(seeded())
    await store.dispatch(
      openTriageThunk({
        endeavorId: triageEndeavorFixtures.habit.id,
        now: TRIAGE_MOCK_NOW,
        presentation: 'pane',
      }),
    )
    const { presentation, load } = store.getState().triage
    expect(presentation).toBe('pane')
    expect(load.kind === 'failed' && load.exception.kind).toBe('notTriageable')
  })
})

// ---------------------------------------------------------------------------
// Sync reducer arms
// ---------------------------------------------------------------------------

describe('the triaged endeavor deleted elsewhere', () => {
  const endeavorId = opened.session?.endeavorId ?? ''
  const removed = (id: string) =>
    performEndeavorOperationThunk.fulfilled(
      {
        ok: true,
        value: { kind: 'removed', surface: FindSurface.find, endeavorId: id },
      },
      'r',
      {
        surface: FindSurface.find,
        operation: 'delete',
        endeavorId: id,
        now: TRIAGE_MOCK_NOW,
      },
    )

  it('closes the session when a row deletes it — the pane returns to its Inbox', () => {
    expect(reduce(opened, removed(endeavorId)).session).toBeNull()
  })

  it('closes the session when the Do surface deletes it — any delete path', () => {
    expect(
      reduce(
        opened,
        deleteEndeavorThunk.fulfilled({ ok: true, value: endeavorId }, 'r', {
          endeavorId,
          now: TRIAGE_MOCK_NOW,
        }),
      ).session,
    ).toBeNull()
  })

  it('keeps the session when another row is deleted', () => {
    expect(reduce(opened, removed('someone-else')).session).not.toBeNull()
  })

  it('closes it on a bulk delete that includes it, but not a bulk archive', () => {
    const request = {
      surface: FindSurface.find,
      operation: 'delete' as const,
      endeavorIds: [endeavorId],
      now: TRIAGE_MOCK_NOW,
    }
    expect(
      reduce(
        opened,
        performBulkOperationThunk.fulfilled(
          { ok: true, value: request },
          'r',
          request,
        ),
      ).session,
    ).toBeNull()
    const archive = { ...request, operation: 'archive' as const }
    expect(
      reduce(
        opened,
        performBulkOperationThunk.fulfilled(
          { ok: true, value: archive },
          'r',
          archive,
        ),
      ).session,
    ).not.toBeNull()
  })
})

describe('userDidSelectQuadrant', () => {
  it('seeds a date and an expiry when Schedule is picked first', () => {
    const next = reduce(
      opened,
      userDidSelectQuadrant({
        quadrant: EisenhowerQuadrant.decide,
        now: TRIAGE_MOCK_NOW,
      }),
    )

    expect(formOf(next)?.quadrant).toBe(EisenhowerQuadrant.decide)
    expect(formOf(next)?.dueDate).toEqual(triageMockAt(24, 10, 7))
    expect(formOf(next)?.expiry).toEqual(triageMockAt(24, 11, 7))
  })

  it('bumps the value to 3 on an Important quadrant', () => {
    const next = reduce(
      opened,
      userDidSelectQuadrant({
        quadrant: EisenhowerQuadrant.prioritize,
        now: TRIAGE_MOCK_NOW,
      }),
    )

    expect(formOf(next)?.value).toBe(3)
  })

  it('is a no-op with no session mounted', () => {
    const next = reduce(
      initialTriageState,
      userDidSelectQuadrant({
        quadrant: EisenhowerQuadrant.decide,
        now: TRIAGE_MOCK_NOW,
      }),
    )

    expect(next).toEqual(initialTriageState)
  })
})

describe('userDidSelectDuration', () => {
  it('takes the first chip', () => {
    const next = reduce(opened, userDidSelectDuration({ minutes: 45 }))

    expect(formOf(next)?.durationMinutes).toBe(45)
  })

  it('takes a change of mind between chips', () => {
    const first = reduce(opened, userDidSelectDuration({ minutes: 45 }))
    const second = reduce(first, userDidSelectDuration({ minutes: 15 }))

    expect(formOf(second)?.durationMinutes).toBe(15)
  })

  it('refuses a revert to undefined — the irreversibility rule', () => {
    const picked = reduce(opened, userDidSelectDuration({ minutes: 45 }))
    const reverted = reduce(picked, userDidSelectDuration({ minutes: null }))

    expect(formOf(reverted)?.durationMinutes).toBe(45)
  })
})

describe('userDidSelectDueDate / userDidSelectExpiry / userDidTapExpiryPreset', () => {
  it('seeds an expiry an hour after a picked date', () => {
    const next = reduce(
      opened,
      userDidSelectDueDate({ date: triageMockAt(20, 8) }),
    )

    expect(formOf(next)?.expiry).toEqual(triageMockAt(20, 9))
  })

  it('snaps a cleared expiry back while a date is in place', () => {
    const scheduled = reduce(
      opened,
      userDidSelectDueDate({ date: triageMockAt(20, 8) }),
    )
    const cleared = reduce(scheduled, userDidSelectExpiry({ date: null }))

    expect(formOf(cleared)?.expiry).toEqual(triageMockAt(20, 9))
  })

  it('snaps expiry to a preset pill', () => {
    const scheduled = reduce(
      opened,
      userDidSelectDueDate({ date: triageMockAt(20, 8) }),
    )
    const eow = reduce(
      scheduled,
      userDidTapExpiryPreset({ preset: TriageExpiryPreset.endOfWeek }),
    )

    expect(formOf(eow)?.expiry).toEqual(triageMockAt(21, 23, 59))
  })
})

describe('the reward stepper arms', () => {
  it('increments by the current grain', () => {
    const next = reduce(
      opened,
      userDidStepRewardPoints({ direction: 'increment' }),
    )

    expect(formOf(next)?.rewardPoints).toBe(15)
  })

  it('decrements by the current grain', () => {
    const next = reduce(
      opened,
      userDidStepRewardPoints({ direction: 'decrement' }),
    )

    expect(formOf(next)?.rewardPoints).toBe(5)
  })

  it('clamps a directly-set value', () => {
    const next = reduce(opened, userDidSelectRewardPoints({ points: 5000 }))

    expect(formOf(next)?.rewardPoints).toBe(999)
  })
})

describe('the rating arms', () => {
  it('promotes the quadrant when value reaches 3', () => {
    const next = reduce(opened, userDidTapValueRating({ rating: 3 }))

    expect(formOf(next)?.quadrant).toBe(EisenhowerQuadrant.decide)
  })

  it('multiplies the reward when effort increases', () => {
    const next = reduce(opened, userDidTapEffortRating({ rating: 4 }))

    expect(formOf(next)?.rewardPoints).toBe(40)
  })

  it('clears a rating when its lit icon is tapped again', () => {
    const rated = reduce(opened, userDidTapValueRating({ rating: 4 }))
    const cleared = reduce(rated, userDidTapValueRating({ rating: 4 }))

    expect(formOf(cleared)?.value).toBeNull()
  })
})

describe('the terminal arms', () => {
  it('raises the completed outcome and pops the screen', () => {
    const next = reduce(triageStateMocks.scheduled, userDidTapConfirm())

    expect(next.outcome?.kind).toBe('completed')
    expect(next.session).toBeNull()
  })

  it('refuses to confirm while the gate is closed', () => {
    const next = reduce(opened, userDidTapConfirm())

    expect(next.outcome).toBeNull()
  })

  it('refuses Start Now on a Schedule triage', () => {
    const next = reduce(triageStateMocks.scheduled, userDidTapStartNow())

    expect(next.outcome).toBeNull()
  })

  it('raises Share on a Delegate triage and keeps the screen mounted', () => {
    const delegated = reduce(
      opened,
      userDidSelectQuadrant({
        quadrant: EisenhowerQuadrant.delegate,
        now: TRIAGE_MOCK_NOW,
      }),
    )
    const shared = reduce(delegated, userDidTapShare())

    expect(shared.outcome?.kind).toBe('shared')
    expect(shared.session).not.toBeNull()
  })

  it('pops the screen when the share sheet closes', () => {
    const delegated = reduce(
      opened,
      userDidSelectQuadrant({
        quadrant: EisenhowerQuadrant.delegate,
        now: TRIAGE_MOCK_NOW,
      }),
    )
    const shared = reduce(delegated, userDidTapShare())
    const dismissed = reduce(shared, onShareSheetDismissed())

    expect(dismissed.session).toBeNull()
  })

  it('raises Archive on an Archive triage without a date', () => {
    const next = reduce(triageStateMocks.archivePicked, userDidTapArchive())

    expect(next.outcome?.kind).toBe('archived')
  })

  it('dismisses on cancel, gate or no gate', () => {
    const next = reduce(opened, userDidTapCancel())

    expect(next.outcome).toEqual({ kind: 'dismissed' })
  })

  it('raises an Edit request without applying a decision', () => {
    const next = reduce(opened, userDidTapEdit())

    expect(next.outcome).toEqual({
      kind: 'editRequested',
      endeavorId: triageEndeavorFixtures.unscheduledTask.id,
    })
    expect(next.session).not.toBeNull()
  })

  it('spends the one-shot on acknowledgement', () => {
    const raised = reduce(opened, userDidTapCancel())
    const cleared = reduce(raised, onTriageOutcomeConsumed())

    expect(cleared.outcome).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Thunk lifecycle arms, driven through the real thunks
// ---------------------------------------------------------------------------

describe('openTriageThunk lifecycle arms', () => {
  it('opens a session on a stored endeavor — the happy path', async () => {
    const store = storeWith(seeded())

    await store.dispatch(
      openTriageThunk({
        endeavorId: triageEndeavorFixtures.unscheduledTask.id,
        now: TRIAGE_MOCK_NOW,
      }),
    )

    const { load, session } = store.getState().triage
    expect(load.kind).toBe('loaded')
    expect(session?.endeavorTitle).toBe('Draft Q3 product plan')
  })

  it('fails with a typed exception on a stale row id — the failure path', async () => {
    const store = storeWith(seeded())

    await store.dispatch(
      openTriageThunk({ endeavorId: 'gone', now: TRIAGE_MOCK_NOW }),
    )

    const { load } = store.getState().triage
    expect(load.kind).toBe('failed')
    if (load.kind === 'failed')
      expect(load.exception.kind).toBe('endeavorNotFound')
  })

  it('reports a store failure rather than throwing — the edge path', async () => {
    const broken = seeded()
    const store = storeWith({
      ...broken,
      endeavors: {
        ...broken.endeavors,
        all: async () => {
          throw new Error('IndexedDB is unavailable')
        },
      },
    })

    await store.dispatch(
      openTriageThunk({
        endeavorId: triageEndeavorFixtures.unscheduledTask.id,
        now: TRIAGE_MOCK_NOW,
      }),
    )

    const { load } = store.getState().triage
    expect(load.kind).toBe('failed')
    if (load.kind === 'failed')
      expect(load.exception.kind).toBe('sessionLoadFailed')
  })

  it('degrades a defensive rejection to the unknown exception', () => {
    const rejected = reduce(initialTriageState, {
      type: openTriageThunk.rejected.type,
      error: { message: 'a bug in the payload creator' },
      meta: { aborted: false, condition: false, arg: {}, requestId: 'x' },
      payload: undefined,
    } as never)

    expect(rejected.load.kind).toBe('failed')
  })

  it('exits silently on cancellation — the one silent exit', () => {
    const aborted = reduce(triageStateMocks.loading, {
      type: openTriageThunk.rejected.type,
      error: { message: 'Aborted' },
      meta: { aborted: true, condition: false, arg: {}, requestId: 'x' },
      payload: undefined,
    } as never)

    expect(aborted.load.kind).toBe('loading')
  })
})

describe('saveTriageDecisionThunk lifecycle arms', () => {
  it('lands a saved state carrying the push outcome — the happy path', async () => {
    const store = storeWith(seeded())

    const dispatched = await store.dispatch(
      saveTriageDecisionThunk({
        decision: {
          endeavorId: triageEndeavorFixtures.unscheduledTask.id,
          quadrant: EisenhowerQuadrant.decide,
          durationSeconds: null,
          dueDate: triageMockAt(24, 10),
          rewardPoints: 20,
          value: 3,
          effort: 1,
          expiryDate: triageMockAt(24, 11),
        },
        now: TRIAGE_MOCK_NOW,
      }),
    )

    const payload = dispatched.payload as Result<unknown, unknown>
    expect(payload.ok).toBe(true)

    const { save } = store.getState().triage
    expect(save.kind).toBe('saved')
    if (save.kind === 'saved') expect(save.push.kind).toBe('notApplicable')
  })

  it('names no push target for a stored row — `EndeavorRecord` keeps no hosts', async () => {
    // #10's record shape has no `hostedBy` column ("hosting is re-derived from
    // the shadows + the reconciliation pass, not stored"), so every row read
    // back from IndexedDB today is unhosted and has nothing to push. Asserting
    // the truth rather than the fixture's in-memory hosts keeps this suite
    // honest about what the round-trip actually carries; the deferred-push
    // branch is covered against the domain in the `TriageSave` suite.
    const store = storeWith(seeded())

    await store.dispatch(
      saveTriageDecisionThunk({
        decision: {
          endeavorId: triageEndeavorFixtures.cloudHostedTask.id,
          quadrant: EisenhowerQuadrant.delete,
          durationSeconds: null,
          dueDate: null,
          rewardPoints: 10,
          value: null,
          effort: null,
          expiryDate: null,
        },
        now: TRIAGE_MOCK_NOW,
      }),
    )

    const { save } = store.getState().triage
    expect(save.kind).toBe('saved')
    if (save.kind === 'saved') {
      expect(save.push).toEqual({ kind: 'notApplicable' })
    }
  })

  it('lands a failed state when the LOCAL write fails — the failure path', async () => {
    const broken = seeded()
    const store = storeWith({
      ...broken,
      endeavors: {
        ...broken.endeavors,
        put: async () => {
          throw new Error('QuotaExceededError')
        },
      },
    })

    await store.dispatch(
      saveTriageDecisionThunk({
        decision: {
          endeavorId: triageEndeavorFixtures.unscheduledTask.id,
          quadrant: EisenhowerQuadrant.delete,
          durationSeconds: null,
          dueDate: null,
          rewardPoints: 10,
          value: null,
          effort: null,
          expiryDate: null,
        },
        now: TRIAGE_MOCK_NOW,
      }),
    )

    const { save } = store.getState().triage
    expect(save.kind).toBe('failed')
    if (save.kind === 'failed')
      expect(save.exception.kind).toBe('localSaveFailed')
  })

  it('moves through `saving` before it settles — the status surface’s only cue', () => {
    const pending = reduce(triageStateMocks.scheduled, {
      type: saveTriageDecisionThunk.pending.type,
      meta: { arg: {}, requestId: 'x' },
      payload: undefined,
    } as never)

    expect(pending.save.kind).toBe('saving')
  })
})
