/**
 * Detail released by the shell's trailing pane — reducer-tier coordination
 * (canon #517). Detail's slice answers the shell's action creators, never its
 * state (`RC-20`). Arms against the slice reducer (`RC-12`), every state from
 * `detailStateMocks` (`RC-31`).
 */
import { ok } from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  onSessionConclusionRaised,
  userDidDismissDetailPane,
  userDidDrillIntoDetailPane,
  userDidRequestDayProgress,
  userDidRequestSessionSetup,
  userDidSelectDetailPaneSegment,
  userDidTapDetailPaneBack,
} from '../../main/MainFeature'
import { openSessionSurfaceThunk } from '../../main/MainProducer'
import { endeavorDetailSlice } from '../EndeavorDetailFeature'
import { detailStateMocks } from '../EndeavorDetailMocks'

const reduce = endeavorDetailSlice.reducer

describe('the pane leaving Plan releases Detail', () => {
  it('closes Detail when the user picks another segment', () => {
    const next = reduce(
      detailStateMocks.presentedTask,
      userDidSelectDetailPaneSegment({ segment: 'performance' }),
    )
    expect(next).toEqual(detailStateMocks.closed)
  })

  it('closes Detail, draft and all, when the pane is dismissed', () => {
    expect(
      reduce(detailStateMocks.editingDirty, userDidDismissDetailPane()),
    ).toEqual(detailStateMocks.closed)
  })

  it('closes Detail when the rings open Day Progress over it', () => {
    expect(
      reduce(detailStateMocks.presentedEvent, userDidRequestDayProgress()),
    ).toEqual(detailStateMocks.closed)
  })

  it('closes Detail when the pill or a conclusion raises Session', () => {
    expect(
      reduce(
        detailStateMocks.presentedTask,
        userDidRequestSessionSetup({ endeavor: null }),
      ),
    ).toEqual(detailStateMocks.closed)
    expect(
      reduce(
        detailStateMocks.presentedTask,
        onSessionConclusionRaised({ endeavor: null }),
      ),
    ).toEqual(detailStateMocks.closed)
  })

  it('closes Detail on a drill-in or a Back — the pane moved', () => {
    expect(
      reduce(
        detailStateMocks.presentedHabit,
        userDidDrillIntoDetailPane({
          location: { segment: 'performance', endeavor: null },
        }),
      ),
    ).toEqual(detailStateMocks.closed)
    expect(
      reduce(detailStateMocks.presentedHabit, userDidTapDetailPaneBack()),
    ).toEqual(detailStateMocks.closed)
  })

  it('is the identity for a Detail that was already closed', () => {
    expect(
      reduce(
        detailStateMocks.closed,
        userDidSelectDetailPaneSegment({ segment: 'plan' }),
      ),
    ).toEqual(detailStateMocks.closed)
  })
})

describe('openSessionSurfaceThunk.fulfilled', () => {
  const fulfilled = (
    result: Parameters<typeof openSessionSurfaceThunk.fulfilled>[0],
  ) => openSessionSurfaceThunk.fulfilled(result, 'req', {} as never)

  it('releases Detail when the session opened in the pane', () => {
    expect(
      reduce(
        detailStateMocks.presentedTask,
        fulfilled(ok({ kind: 'pane', endeavor: null })),
      ),
    ).toEqual(detailStateMocks.closed)
  })

  it('keeps Detail when the session opened as its own route', () => {
    const before = detailStateMocks.presentedTask
    expect(
      reduce(before, fulfilled(ok({ kind: 'route', path: '/execute' }))),
    ).toEqual(before)
  })

  it('keeps Detail when opening the session failed', () => {
    const before = detailStateMocks.editingTask
    const failed = {
      ok: false,
      error: { kind: 'unknown', message: 'x', recoverable: true },
    } as unknown as Parameters<typeof fulfilled>[0]
    expect(reduce(before, fulfilled(failed))).toEqual(before)
  })
})
