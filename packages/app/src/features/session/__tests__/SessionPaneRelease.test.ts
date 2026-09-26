/**
 * The pane leaving Session drops an auto-presented conclusion — reducer-tier
 * coordination (canon #517, `Session.md` flow 7: the pill keeps it). The
 * session's slice answers the shell's and Detail's action creators, never
 * their state (`RC-20`). Arms against the slice reducer (`RC-12`), every state
 * from `sessionStateMocks` (`RC-31`).
 */
import { ok } from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  onDetailRequested,
  onEditRequested,
} from '../../endeavorDetail/EndeavorDetailFeature'
import { EndeavorDetailExceptions } from '../../endeavorDetail/EndeavorDetailException'
import { detailEndeavorMocks } from '../../endeavorDetail/EndeavorDetailMocks'
import { openDetailByIdThunk } from '../../endeavorDetail/EndeavorDetailProducer'
import {
  userDidDismissDetailPane,
  userDidDrillIntoDetailPane,
  userDidRequestDayProgress,
  userDidSelectDetailPaneSegment,
  userDidTapDetailPaneBack,
} from '../../main/MainFeature'
import { sessionSlice } from '../SessionFeature'
import { sessionStateMocks } from '../SessionMocks'

const reduce = sessionSlice.reducer
const concluded = sessionStateMocks.concluded
const task = detailEndeavorMocks.task

describe('the pane leaving Session', () => {
  it('drops the pending conclusion when the user picks another segment', () => {
    const next = reduce(
      concluded,
      userDidSelectDetailPaneSegment({ segment: 'plan' }),
    )
    expect(next.isPresentingConclusion).toBe(false)
  })

  it('keeps the conclusion itself — only the auto-open is answered', () => {
    const next = reduce(concluded, userDidDismissDetailPane())
    expect(next).toEqual({ ...concluded, isPresentingConclusion: false })
  })

  it('drops it for the rings, a Back, and Detail opening over the pane', () => {
    for (const action of [
      userDidRequestDayProgress(),
      userDidTapDetailPaneBack(),
      onDetailRequested({ endeavor: task }),
      onEditRequested({ endeavor: task }),
    ]) {
      expect(reduce(concluded, action).isPresentingConclusion).toBe(false)
    }
  })

  it('is the identity for a running session with nothing to present', () => {
    const before = sessionStateMocks.running
    expect(reduce(before, userDidDismissDetailPane())).toEqual(before)
  })
})

describe('userDidDrillIntoDetailPane', () => {
  it('drops the conclusion when Show sessions drills into Performance', () => {
    const next = reduce(
      concluded,
      userDidDrillIntoDetailPane({
        location: { segment: 'performance', endeavor: null },
      }),
    )
    expect(next.isPresentingConclusion).toBe(false)
  })

  it('keeps it on a drill INTO Session — the pane still shows it', () => {
    const next = reduce(
      concluded,
      userDidDrillIntoDetailPane({
        location: { segment: 'sessionSetup', endeavor: null },
      }),
    )
    expect(next).toBe(concluded)
  })

  it('leaves an already-dismissed conclusion as it was', () => {
    const before = sessionStateMocks.concludedDismissed
    expect(
      reduce(
        before,
        userDidDrillIntoDetailPane({
          location: { segment: 'plan', endeavor: null },
        }),
      ),
    ).toEqual(before)
  })
})

describe('openDetailByIdThunk.fulfilled', () => {
  const fulfilled = (
    result: Parameters<typeof openDetailByIdThunk.fulfilled>[0],
  ) => openDetailByIdThunk.fulfilled(result, 'req', { endeavorId: task.id })

  it('drops the conclusion when Detail reopens in the pane', () => {
    expect(reduce(concluded, fulfilled(ok(task))).isPresentingConclusion).toBe(
      false,
    )
  })

  it('keeps it when the endeavor was deleted and nothing opened', () => {
    const miss = fulfilled({
      ok: false,
      error: EndeavorDetailExceptions.endeavorNotFound(task.id),
    })
    expect(reduce(concluded, miss)).toBe(concluded)
  })

  it('is the identity for a session with no conclusion', () => {
    const before = sessionStateMocks.ready
    expect(reduce(before, fulfilled(ok(task)))).toEqual(before)
  })
})
