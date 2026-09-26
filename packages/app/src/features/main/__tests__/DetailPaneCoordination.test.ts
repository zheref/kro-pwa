/**
 * The pane following Endeavor Detail and the session — reducer-tier
 * coordination (canon #517, `MacDetailPane.md`). The shell's slice answers
 * Detail's action creators and the session's raise, never their state
 * (`RC-20`). Shifters pure (`RC-56`), arms against the slice reducer
 * (`RC-12`), every state from `MainMocks` (`RC-31`).
 */
import { err, ok } from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  onDetailRequested,
  onEditRequested,
  userDidTapDismiss,
} from '../../endeavorDetail/EndeavorDetailFeature'
import { EndeavorDetailExceptions } from '../../endeavorDetail/EndeavorDetailException'
import { detailEndeavorMocks } from '../../endeavorDetail/EndeavorDetailMocks'
import { openDetailByIdThunk } from '../../endeavorDetail/EndeavorDetailProducer'
import { mainSlice, onSessionConclusionRaised } from '../MainFeature'
import { MainMocks } from '../MainMocks'
import {
  isDetailPaneHost,
  withDetailPaneFollowingDetail,
  withDetailPaneReleasedByDetail,
  withDetailPaneSessionRaised,
} from '../MainShifters'

const reduce = mainSlice.reducer
const task = detailEndeavorMocks.task
const event = detailEndeavorMocks.event
const taskRef = { id: task.id, title: task.title }
const review = { id: 'e-1', title: 'Write the quarterly review' }

describe('isDetailPaneHost', () => {
  it('is a host on the desktop sidebar with the flag on', () => {
    expect(isDetailPaneHost(MainMocks.desktopDetailPaneReady)).toBe(true)
  })

  it('is not a host with the flag off, even on the desktop', () => {
    expect(isDetailPaneHost(MainMocks.desktopLoaded)).toBe(false)
  })

  it('is not a host on the tab-bar shell, flag or no flag', () => {
    expect(isDetailPaneHost(MainMocks.handheldDetailPaneOpen)).toBe(false)
  })
})

describe('withDetailPaneFollowingDetail', () => {
  it('points a hidden pane’s Plan at the endeavor Detail opened on', () => {
    const next = withDetailPaneFollowingDetail(
      MainMocks.desktopDetailPaneReady,
      taskRef,
    )
    expect(next.detailPane).toEqual({ segment: 'plan', endeavor: taskRef })
  })

  it('switches Day Progress over to the endeavor’s Plan', () => {
    const next = withDetailPaneFollowingDetail(
      MainMocks.desktopDetailPaneDayProgress,
      taskRef,
    )
    expect(next.detailPane.segment).toBe('plan')
  })

  it('leaves the pane alone on the tab-bar shell, where Detail is a sheet', () => {
    const before = MainMocks.handheldDetailPaneOpen
    expect(withDetailPaneFollowingDetail(before, taskRef)).toBe(before)
  })
})

describe('withDetailPaneReleasedByDetail', () => {
  it('hides a pane that was showing Detail on Plan', () => {
    const next = withDetailPaneReleasedByDetail(MainMocks.desktopDetailPanePlan)
    expect(next.detailPane).toEqual({ segment: null, endeavor: review })
  })

  it('leaves a pane on another segment showing', () => {
    const before = MainMocks.desktopDetailPaneDayProgress
    expect(withDetailPaneReleasedByDetail(before)).toBe(before)
  })

  it('leaves the tab-bar shell’s pane state alone — the sheet closed there', () => {
    const before = MainMocks.handheldDetailPaneOpen
    expect(withDetailPaneReleasedByDetail(before)).toBe(before)
  })
})

describe('withDetailPaneSessionRaised', () => {
  it('raises Session on the concluded session’s endeavor', () => {
    const next = withDetailPaneSessionRaised(
      MainMocks.desktopDetailPanePlan,
      taskRef,
    )
    expect(next.detailPane).toEqual({
      segment: 'sessionSetup',
      endeavor: taskRef,
    })
  })

  it('raises the endeavor-free Session for an anonymous session', () => {
    const next = withDetailPaneSessionRaised(
      MainMocks.desktopDetailPaneReady,
      null,
    )
    expect(next.detailPane).toEqual({ segment: 'sessionSetup', endeavor: null })
  })

  it('does nothing off a pane host — the session raises its own sheet', () => {
    const before = MainMocks.desktopLoaded
    expect(withDetailPaneSessionRaised(before, taskRef)).toBe(before)
  })
})

describe('onDetailRequested (Detail’s event, followed by the shell)', () => {
  it('opens Plan on the endeavor a card was double-clicked on', () => {
    const next = reduce(
      MainMocks.desktopDetailPaneReady,
      onDetailRequested({ endeavor: task }),
    )
    expect(next.detailPane).toEqual({ segment: 'plan', endeavor: taskRef })
  })

  it('re-points an open Plan at another endeavor', () => {
    const next = reduce(
      MainMocks.desktopDetailPanePlan,
      onDetailRequested({ endeavor: event }),
    )
    expect(next.detailPane.endeavor).toEqual({
      id: event.id,
      title: event.title,
    })
  })

  it('does not open a pane on the tab-bar shell', () => {
    const before = MainMocks.handheldDetailPaneOpen
    expect(reduce(before, onDetailRequested({ endeavor: task }))).toEqual(
      before,
    )
  })
})

describe('onEditRequested (Detail’s event, followed by the shell)', () => {
  it('opens Plan on the endeavor the editor opened over', () => {
    const next = reduce(
      MainMocks.desktopDetailPaneReady,
      onEditRequested({ endeavor: task }),
    )
    expect(next.detailPane).toEqual({ segment: 'plan', endeavor: taskRef })
  })

  it('keeps the pane as it is when the editor opens over the Detail shown', () => {
    const before = MainMocks.desktopDetailPanePlan
    expect(reduce(before, onEditRequested({}))).toEqual(before)
  })

  it('does not open a pane with the flag off', () => {
    const before = MainMocks.desktopLoaded
    expect(reduce(before, onEditRequested({ endeavor: task }))).toEqual(before)
  })
})

describe('openDetailByIdThunk.fulfilled (Detail reopened for the pane)', () => {
  const fulfilled = (
    result: Parameters<typeof openDetailByIdThunk.fulfilled>[0],
  ) => openDetailByIdThunk.fulfilled(result, 'req', { endeavorId: task.id })

  it('keeps Plan on the endeavor it reopened', () => {
    const next = reduce(MainMocks.desktopDetailPaneReady, fulfilled(ok(task)))
    expect(next.detailPane).toEqual({ segment: 'plan', endeavor: taskRef })
  })

  it('leaves the pane alone when the endeavor was deleted since', () => {
    const before = MainMocks.desktopDetailPanePlan
    const miss = err(EndeavorDetailExceptions.endeavorNotFound(task.id))
    expect(reduce(before, fulfilled(miss))).toEqual(before)
  })

  it('does nothing off a pane host', () => {
    const before = MainMocks.handheldDetailPaneOpen
    expect(reduce(before, fulfilled(ok(task)))).toEqual(before)
  })
})

describe('userDidTapDismiss (Detail closed from inside)', () => {
  it('hides the pane that was showing it on Plan', () => {
    const next = reduce(MainMocks.desktopDetailPanePlan, userDidTapDismiss())
    expect(next.detailPane.segment).toBeNull()
  })

  it('leaves Day Progress up — Detail was not the pane’s content', () => {
    const before = MainMocks.desktopDetailPaneDayProgress
    expect(reduce(before, userDidTapDismiss())).toEqual(before)
  })

  it('does nothing when the dialog closes on a shell without the pane', () => {
    const before = MainMocks.desktopLoaded
    expect(reduce(before, userDidTapDismiss())).toEqual(before)
  })
})

describe('onSessionConclusionRaised', () => {
  it('takes the pane from Plan to the concluded session', () => {
    const next = reduce(
      MainMocks.desktopDetailPanePlan,
      onSessionConclusionRaised({ endeavor: taskRef }),
    )
    expect(next.detailPane).toEqual({
      segment: 'sessionSetup',
      endeavor: taskRef,
    })
  })

  it('opens a hidden pane on Session for an anonymous session', () => {
    const next = reduce(
      MainMocks.desktopDetailPaneReady,
      onSessionConclusionRaised({ endeavor: null }),
    )
    expect(next.detailPane.segment).toBe('sessionSetup')
  })

  it('does nothing on the tab-bar shell', () => {
    const before = MainMocks.handheldDetailPaneOpen
    expect(
      reduce(before, onSessionConclusionRaised({ endeavor: taskRef })),
    ).toEqual(before)
  })
})
