/**
 * Reducer arms: the sync ones called directly against the slice's reducer
 * (`RC-12`), the thunk lifecycles driven through the real thunks against a
 * stubbed `LocalStore` (`RC-54`).
 *
 * The save/dismiss dirty-tracking cases are the ones the issue names: a save
 * resets the baseline, a dismiss discards the working copy without touching the
 * presented endeavor, and a failed save leaves the edit dirty for a retry.
 */
import type { Endeavor, EndeavorRecord } from '@kro/core'
import {
  EndeavorField,
  EndeavorHost,
  EndeavorRelation,
  EndeavorStatus,
  PerformResolution,
  endeavorRecordFromEndeavor,
  makePerform,
} from '@kro/core'
import { describe, expect, it } from 'vitest'
import { makeStore } from '../../../library/store'
import { stubbedGreetingService } from '../../../services/greeting/GreetingService'
import { makeInMemoryLocalStore } from '../../../services/localStore/InMemoryLocalStore'
import {
  endeavorDetailSlice,
  initialEndeavorDetailState,
  onDetailRequested,
  onEditRequested,
  userDidAdjustDurationBound,
  userDidChangeField,
  userDidChangeRelationDraft,
  userDidDismissDestination,
  userDidTapDismiss,
  userDidTapField,
  userDidTapManageRelation,
  userDidToggleDurationBound,
} from '../EndeavorDetailFeature'
import {
  DETAIL_REFERENCE_NOW,
  allDetailEndeavorMocks,
  detailEndeavorMocks,
  detailStateMocks,
} from '../EndeavorDetailMocks'
import {
  addPerformanceThunk,
  attachHostThunk,
  saveEndeavorThunk,
} from '../EndeavorDetailProducer'
import { DurationBound } from '../EndeavorDuration'
import { selectIsEditDirty, selectIsSaveEnabled } from '../EndeavorDetailSelectors'

const reducer = endeavorDetailSlice.reducer

const recordsOf = (
  endeavors: readonly Endeavor[] = allDetailEndeavorMocks,
): readonly EndeavorRecord[] =>
  endeavors.map((endeavor) =>
    endeavorRecordFromEndeavor(endeavor, { now: DETAIL_REFERENCE_NOW }),
  )

const storeWith = (records: readonly EndeavorRecord[] = recordsOf()) =>
  makeStore({
    greetingService: stubbedGreetingService,
    localStore: makeInMemoryLocalStore({ endeavors: records }),
  })

describe('onDetailRequested — another surface hands an endeavor over', () => {
  it('presents it, with no editor open', () => {
    const next = reducer(
      initialEndeavorDetailState,
      onDetailRequested({ endeavor: detailEndeavorMocks.task }),
    )
    expect(next.endeavor).toBe(detailEndeavorMocks.task)
    expect(next.destination).toBeNull()
  })

  it('replaces a previous endeavor rather than layering on it', () => {
    const next = reducer(
      detailStateMocks.editingDirty,
      onDetailRequested({ endeavor: detailEndeavorMocks.event }),
    )
    expect(next.endeavor).toBe(detailEndeavorMocks.event)
    expect(next.edit).toBeNull()
  })

  it('opens the editor directly when that is what was asked for', () => {
    const next = reducer(
      initialEndeavorDetailState,
      onEditRequested({ endeavor: detailEndeavorMocks.task }),
    )
    expect(next.destination).toEqual({ kind: 'edit', focusedField: null })
  })
})

describe('userDidTapField routes by field, and refuses what the matrix does', () => {
  it('opens Edit focused on the tapped row', () => {
    const next = reducer(
      detailStateMocks.presentedTask,
      userDidTapField({ field: EndeavorField.status }),
    )
    expect(next.destination).toEqual({ kind: 'edit', focusedField: 'status' })
  })

  it('routes `duration` to the Duration profile', () => {
    const next = reducer(
      detailStateMocks.presentedTask,
      userDidTapField({ field: EndeavorField.duration }),
    )
    expect(next.destination).toEqual({ kind: 'duration' })
  })

  it('opens nothing for a field the kind cannot have', () => {
    const next = reducer(
      detailStateMocks.presentedEvent,
      userDidTapField({ field: EndeavorField.due }),
    )
    expect(next.destination).toBeNull()
  })
})

describe('userDidTapManageRelation obeys the same matrix', () => {
  it('opens a relation a task can manage', () => {
    const next = reducer(
      detailStateMocks.presentedTask,
      userDidTapManageRelation({ relation: EndeavorRelation.defers }),
    )
    expect(next.destination).toEqual({
      kind: 'relation',
      relation: EndeavorRelation.defers,
    })
  })

  it('refuses one a calendar event cannot', () => {
    const next = reducer(
      detailStateMocks.presentedEvent,
      userDidTapManageRelation({ relation: EndeavorRelation.performances }),
    )
    expect(next.destination).toBeNull()
  })

  it('refuses hosts on a habit', () => {
    const next = reducer(
      detailStateMocks.presentedHabit,
      userDidTapManageRelation({ relation: EndeavorRelation.hosts }),
    )
    expect(next.destination).toBeNull()
  })
})

describe('dirty tracking, save and dismiss', () => {
  const rootOf = (state: ReturnType<typeof reducer>) =>
    ({
      ...storeWith().getState(),
      endeavorDetail: state,
    }) as ReturnType<ReturnType<typeof storeWith>['getState']>

  it('reads clean the moment the editor opens', () => {
    expect(selectIsEditDirty(rootOf(detailStateMocks.editingTask))).toBe(false)
    expect(selectIsSaveEnabled(rootOf(detailStateMocks.editingTask))).toBe(false)
  })

  it('reads dirty after a real edit, and enables Save', () => {
    const edited = reducer(
      detailStateMocks.editingTask,
      userDidChangeField({
        change: { field: 'title', value: 'Prepare the deck' },
      }),
    )
    expect(selectIsEditDirty(rootOf(edited))).toBe(true)
    expect(selectIsSaveEnabled(rootOf(edited))).toBe(true)
  })

  it('stays CLEAN after an edit the matrix refused — nothing changed', () => {
    const editingEvent = reducer(
      detailStateMocks.presentedEvent,
      onEditRequested({}),
    )
    const attempted = reducer(
      editingEvent,
      userDidChangeField({ change: { field: 'due', value: new Date() } }),
    )
    expect(selectIsEditDirty(rootOf(attempted))).toBe(false)
    expect(selectIsSaveEnabled(rootOf(attempted))).toBe(false)
  })

  it('refuses Save on a blank title, however dirty the form is', () => {
    expect(selectIsSaveEnabled(rootOf(detailStateMocks.editingInvalid))).toBe(
      false,
    )
  })

  it('resets the baseline once the save lands, so Save goes quiet again', async () => {
    const store = storeWith()
    store.dispatch(onEditRequested({ endeavor: detailEndeavorMocks.task }))
    store.dispatch(
      userDidChangeField({
        change: { field: 'title', value: 'Prepare the deck' },
      }),
    )
    expect(selectIsEditDirty(store.getState())).toBe(true)

    const working = store.getState().endeavorDetail.edit?.working
    if (working === undefined) throw new Error('expected an open editor')
    await store.dispatch(
      saveEndeavorThunk({ endeavor: working, now: DETAIL_REFERENCE_NOW }),
    )

    expect(selectIsEditDirty(store.getState())).toBe(false)
    expect(store.getState().endeavorDetail.endeavor?.title).toBe(
      'Prepare the deck',
    )
  })

  it('leaves the edit dirty when the save failed — nothing was persisted', async () => {
    const base = makeInMemoryLocalStore({ endeavors: recordsOf() })
    const store = makeStore({
      greetingService: stubbedGreetingService,
      localStore: {
        ...base,
        endeavors: {
          ...base.endeavors,
          put: async () => {
            throw new Error('disk full')
          },
        },
      },
    })
    store.dispatch(onEditRequested({ endeavor: detailEndeavorMocks.task }))
    store.dispatch(
      userDidChangeField({ change: { field: 'title', value: 'Renamed' } }),
    )
    const working = store.getState().endeavorDetail.edit?.working
    if (working === undefined) throw new Error('expected an open editor')
    await store.dispatch(
      saveEndeavorThunk({ endeavor: working, now: DETAIL_REFERENCE_NOW }),
    )

    expect(selectIsEditDirty(store.getState())).toBe(true)
    expect(store.getState().endeavorDetail.save.kind).toBe('failed')
  })

  it('discards the working copy on dismiss, leaving the presented row alone', () => {
    const edited = reducer(
      detailStateMocks.editingTask,
      userDidChangeField({ change: { field: 'title', value: 'Discarded' } }),
    )
    const dismissed = reducer(edited, userDidDismissDestination())
    expect(dismissed.edit).toBeNull()
    expect(dismissed.endeavor?.title).toBe(detailEndeavorMocks.task.title)
  })

  it('closes the whole surface on the Done affordance', () => {
    expect(reducer(detailStateMocks.editingDirty, userDidTapDismiss())).toEqual(
      initialEndeavorDetailState,
    )
  })
})

describe('the duration bounds edit through the same working copy', () => {
  it('writes an enabled bound onto the working copy', () => {
    const next = reducer(
      detailStateMocks.durationOpen,
      userDidToggleDurationBound({
        bound: DurationBound.preferred,
        isEnabled: true,
      }),
    )
    expect(next.edit?.working.duration).toBe(next.duration?.preferredSeconds)
  })

  it('carries a dialled number through', () => {
    const enabled = reducer(
      detailStateMocks.durationOpen,
      userDidToggleDurationBound({
        bound: DurationBound.maximum,
        isEnabled: true,
      }),
    )
    const dialled = reducer(
      enabled,
      userDidAdjustDurationBound({
        bound: DurationBound.maximum,
        seconds: 3600,
      }),
    )
    expect(dialled.edit?.working.maximumDuration).toBe(3600)
  })

  it('is a no-op when the Duration profile is not open', () => {
    const next = reducer(
      detailStateMocks.editingTask,
      userDidAdjustDurationBound({
        bound: DurationBound.preferred,
        seconds: 900,
      }),
    )
    expect(next.edit?.working.duration).toBe(detailEndeavorMocks.task.duration)
  })
})

describe('the relation add form is gated by the same matrix', () => {
  it('opens a form for a relation this kind can manage', () => {
    const next = reducer(
      detailStateMocks.performancesOpen,
      userDidChangeRelationDraft({
        draft: {
          relation: 'performances',
          draft: {
            date: DETAIL_REFERENCE_NOW,
            durationSeconds: 1500,
            resolution: PerformResolution.finished,
            notes: '',
            rewardPoints: 0,
            wasCompletedInSession: true,
            editingIndex: null,
          },
        },
      }),
    )
    expect(next.relationDraft?.relation).toBe('performances')
  })

  it('refuses to open one the kind cannot manage', () => {
    const next = reducer(
      detailStateMocks.performancesReadOnly,
      userDidChangeRelationDraft({
        draft: {
          relation: 'performances',
          draft: {
            date: DETAIL_REFERENCE_NOW,
            durationSeconds: 1500,
            resolution: PerformResolution.finished,
            notes: '',
            rewardPoints: 0,
            wasCompletedInSession: true,
            editingIndex: null,
          },
        },
      }),
    )
    expect(next.relationDraft).toBeNull()
  })

  it('always allows cancelling, whatever the kind', () => {
    const next = reducer(
      detailStateMocks.performancesReadOnly,
      userDidChangeRelationDraft({ draft: null }),
    )
    expect(next.relationDraft).toBeNull()
  })
})

describe('the relation write lifecycle', () => {
  it('refreshes Detail’s own copy on success', async () => {
    const store = storeWith()
    store.dispatch(onDetailRequested({ endeavor: detailEndeavorMocks.task }))
    await store.dispatch(
      addPerformanceThunk({
        endeavorId: detailEndeavorMocks.task.id,
        performance: makePerform({
          date: DETAIL_REFERENCE_NOW,
          duration: 1500,
          resolution: PerformResolution.finished,
          wasCompletedInSession: true,
        }),
        now: DETAIL_REFERENCE_NOW,
      }),
    )
    expect(store.getState().endeavorDetail.endeavor?.performances).toHaveLength(
      1,
    )
    expect(store.getState().endeavorDetail.save).toEqual({ kind: 'idle' })
  })

  it('surfaces the host refusal as a typed failure the user can read', async () => {
    const store = storeWith()
    store.dispatch(onDetailRequested({ endeavor: detailEndeavorMocks.task }))
    await store.dispatch(
      attachHostThunk({
        endeavorId: detailEndeavorMocks.task.id,
        host: EndeavorHost.googleCalendar,
      }),
    )
    const { save } = store.getState().endeavorDetail
    expect(save.kind).toBe('failed')
    if (save.kind === 'failed') {
      expect(save.exception.kind).toBe('hostAdapterUnavailable')
    }
  })

  it('raises the saving lifecycle while a relation write is in flight', () => {
    const pending = addPerformanceThunk.pending('req', {
      endeavorId: detailEndeavorMocks.task.id,
      performance: makePerform({
        date: DETAIL_REFERENCE_NOW,
        duration: 1500,
        resolution: PerformResolution.finished,
      }),
      now: DETAIL_REFERENCE_NOW,
    })
    expect(reducer(detailStateMocks.performancesOpen, pending).save).toEqual({
      kind: 'saving',
    })
  })

  it('stays quiet when a write is aborted — the one silent exit', () => {
    const rejected = {
      ...addPerformanceThunk.rejected(new Error('aborted'), 'req', {
        endeavorId: detailEndeavorMocks.task.id,
        performance: makePerform({
          date: DETAIL_REFERENCE_NOW,
          duration: 1500,
          resolution: PerformResolution.finished,
        }),
        now: DETAIL_REFERENCE_NOW,
      }),
      meta: {
        arg: {
          endeavorId: detailEndeavorMocks.task.id,
          performance: makePerform({
            date: DETAIL_REFERENCE_NOW,
            duration: 1500,
            resolution: PerformResolution.finished,
          }),
          now: DETAIL_REFERENCE_NOW,
        },
        requestId: 'req',
        requestStatus: 'rejected' as const,
        aborted: true,
        condition: false,
        rejectedWithValue: false,
      },
    }
    expect(reducer(detailStateMocks.saving, rejected).save).toEqual({
      kind: 'saving',
    })
  })
})

describe('the save lifecycle’s own arms', () => {
  it('raises saving on .pending', () => {
    const pending = saveEndeavorThunk.pending('req', {
      endeavor: detailEndeavorMocks.task,
      now: DETAIL_REFERENCE_NOW,
    })
    expect(reducer(detailStateMocks.editingDirty, pending).save).toEqual({
      kind: 'saving',
    })
  })

  it('records the exception on a defensive .rejected', () => {
    const rejected = {
      ...saveEndeavorThunk.rejected(new Error('boom'), 'req', {
        endeavor: detailEndeavorMocks.task,
        now: DETAIL_REFERENCE_NOW,
      }),
      meta: {
        arg: {
          endeavor: detailEndeavorMocks.task,
          now: DETAIL_REFERENCE_NOW,
        },
        requestId: 'req',
        requestStatus: 'rejected' as const,
        aborted: false,
        condition: false,
        rejectedWithValue: false,
      },
    }
    const next = reducer(detailStateMocks.editingDirty, rejected)
    expect(next.save.kind).toBe('failed')
    if (next.save.kind === 'failed') {
      expect(next.save.exception.kind).toBe('unknown')
    }
  })

  it('leaves a status edit on the presented row once it lands', async () => {
    const store = storeWith()
    store.dispatch(onEditRequested({ endeavor: detailEndeavorMocks.task }))
    store.dispatch(
      userDidChangeField({
        change: { field: 'status', value: EndeavorStatus.blocked },
      }),
    )
    const working = store.getState().endeavorDetail.edit?.working
    if (working === undefined) throw new Error('expected an open editor')
    await store.dispatch(
      saveEndeavorThunk({ endeavor: working, now: DETAIL_REFERENCE_NOW }),
    )
    expect(store.getState().endeavorDetail.endeavor?.status).toBe(
      EndeavorStatus.blocked,
    )
  })
})
