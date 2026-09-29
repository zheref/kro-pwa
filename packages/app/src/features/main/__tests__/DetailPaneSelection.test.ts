/**
 * The pane never shows endeavor-specific content without a selection: every
 * way the selection ends falls each segment back to its endeavor-free
 * reading, and the header follows. States come from `MainMocks` (`RC-31`).
 */
import { EndeavorOperation } from '@kro/core'
import { describe, expect, it } from 'vitest'
import { applyInboxOperationThunk } from '../../capture/CaptureProducer'
import { deleteEndeavorThunk } from '../../do/DoProducer'
import { FindExceptions } from '../../find/FindException'
import { deletePlanEndeavorThunk } from '../../plan/PlanProducer'
import {
  type RootState,
  makeStore,
  stubbedThunkExtra,
} from '../../../library/store'
import { userDidReleaseDetailPaneSelection } from '../MainFeature'
import { openDetailByIdThunk } from '../../endeavorDetail/EndeavorDetailProducer'
import { EndeavorDetailExceptions } from '../../endeavorDetail/EndeavorDetailException'
import { FindSurface } from '../../find/FindOperations'
import {
  performBulkOperationThunk,
  performEndeavorOperationThunk,
} from '../../find/FindProducer'
import type { DetailPaneSegment } from '../DetailPane'
import { type MainState, mainSlice } from '../MainFeature'
import { MainMocks } from '../MainMocks'
import {
  selectDetailPaneSubtitle,
  selectDetailPaneTitle,
} from '../MainSelectors'
import { withDetailPaneSelectionReleased } from '../MainShifters'

const reduce = mainSlice.reducer
const rootWith = (main: MainState): RootState =>
  ({ ...makeStore(stubbedThunkExtra).getState(), main }) as RootState

const review = { id: 'e-1', title: 'Write the quarterly review' }

/** The desktop pane on `segment`, reading `review`, one drill-in deep. */
const readingReview = (segment: DetailPaneSegment): MainState => ({
  ...MainMocks.desktopDetailPaneInbox,
  detailPane: { segment, endeavor: review },
  detailPaneBackStack: [{ segment: 'plan', endeavor: review }],
})

describe('withDetailPaneSelectionReleased', () => {
  it('drops the selection and its drill-in trail, keeping the segment', () => {
    const next = withDetailPaneSelectionReleased(readingReview('performance'))
    expect(next.detailPane).toEqual({ segment: 'performance', endeavor: null })
    expect(next.detailPaneBackStack).toEqual([])
  })

  it('ignores a release for another endeavor', () => {
    const before = readingReview('plan')
    expect(withDetailPaneSelectionReleased(before, 'someone-else')).toBe(before)
  })

  it('is a no-op when nothing is selected', () => {
    const before = MainMocks.desktopDetailPaneDayProgress
    expect(withDetailPaneSelectionReleased(before)).toBe(before)
  })
})

describe('deselecting falls every segment back to its endeavor-free reading', () => {
  const cases: readonly [DetailPaneSegment, string][] = [
    ['sessionSetup', 'New Session'],
    ['performance', 'Day Progress'],
    ['plan', 'Timeline'],
    ['inbox', 'Inbox'],
  ]

  for (const [segment, title] of cases) {
    it(`${segment}: the card deselected → "${title}", no subtitle`, () => {
      const before = readingReview(segment)
      expect(selectDetailPaneSubtitle(rootWith(before))).toBe(
        segment === 'inbox' ? null : review.title,
      )
      const next = reduce(before, userDidReleaseDetailPaneSelection())
      expect(next.detailPane).toEqual({ segment, endeavor: null })
      expect(selectDetailPaneTitle(rootWith(next))).toBe(title)
      expect(selectDetailPaneSubtitle(rootWith(next))).toBeNull()
    })
  }
})

describe('the selected endeavor deleted', () => {
  it('from a row: the pane falls back', () => {
    const next = reduce(
      readingReview('performance'),
      performEndeavorOperationThunk.fulfilled(
        {
          ok: true,
          value: {
            kind: 'removed',
            surface: FindSurface.find,
            endeavorId: review.id,
          },
        },
        'r',
        {
          surface: FindSurface.find,
          operation: 'delete',
          endeavorId: review.id,
          now: new Date(0),
        },
      ),
    )
    expect(next.detailPane.endeavor).toBeNull()
  })

  it('in bulk: the pane falls back only if the selection was among them', () => {
    const request = {
      surface: FindSurface.find,
      operation: 'delete' as const,
      endeavorIds: ['x', review.id],
      now: new Date(0),
    }
    const next = reduce(
      readingReview('plan'),
      performBulkOperationThunk.fulfilled(
        { ok: true, value: request },
        'r',
        request,
      ),
    )
    expect(next.detailPane).toEqual({ segment: 'plan', endeavor: null })

    const archived = { ...request, operation: 'archive' as const }
    const kept = reduce(
      readingReview('plan'),
      performBulkOperationThunk.fulfilled(
        { ok: true, value: archived },
        'r',
        archived,
      ),
    )
    expect(kept.detailPane.endeavor).toEqual(review)
  })

  it('found gone on reopen: the pane falls back instead of naming a ghost', () => {
    const next = reduce(
      readingReview('plan'),
      openDetailByIdThunk.fulfilled(
        {
          ok: false,
          error: EndeavorDetailExceptions.endeavorNotFound(review.id),
        },
        'r',
        { endeavorId: review.id },
      ),
    )
    expect(next.detailPane).toEqual({ segment: 'plan', endeavor: null })
  })
})

describe('every delete path releases the pane selection (Hanten C4)', () => {
  const now = new Date(0)

  it('Do: a card deleted', () => {
    const arg = { endeavorId: review.id, now }
    const next = reduce(
      readingReview('performance'),
      deleteEndeavorThunk.fulfilled({ ok: true, value: review.id }, 'r', arg),
    )
    expect(next.detailPane.endeavor).toBeNull()
  })

  it('Plan: a block deleted', () => {
    const arg = { endeavorId: review.id, now }
    const next = reduce(
      readingReview('plan'),
      deletePlanEndeavorThunk.fulfilled(
        { ok: true, value: { endeavorId: review.id } },
        'r',
        arg,
      ),
    )
    expect(next.detailPane).toEqual({ segment: 'plan', endeavor: null })
  })

  it('Inbox: a row deleted', () => {
    const arg = {
      operation: EndeavorOperation.delete,
      endeavorId: review.id,
      now,
    }
    const next = reduce(
      readingReview('sessionSetup'),
      applyInboxOperationThunk.fulfilled(
        { ok: true, value: { endeavorId: review.id, endeavor: null } },
        'r',
        arg,
      ),
    )
    expect(next.detailPane.endeavor).toBeNull()
  })

  it('keeps the selection when another endeavor is deleted', () => {
    const arg = { endeavorId: 'someone-else', now }
    const before = readingReview('performance')
    expect(
      reduce(
        before,
        deleteEndeavorThunk.fulfilled(
          { ok: true, value: 'someone-else' },
          'r',
          arg,
        ),
      ).detailPane,
    ).toEqual(before.detailPane)
  })

  it('keeps the selection when the delete failed', () => {
    const before = readingReview('performance')
    const next = reduce(
      before,
      performEndeavorOperationThunk.fulfilled(
        { ok: false, error: FindExceptions.operationFailed('disk') },
        'r',
        {
          surface: FindSurface.find,
          operation: 'delete',
          endeavorId: review.id,
          now,
        },
      ),
    )
    expect(next.detailPane.endeavor).toEqual(review)
  })

  it('keeps the selection when a Find operation merely rewrote the row', () => {
    const before = readingReview('plan')
    const next = reduce(
      before,
      performEndeavorOperationThunk.fulfilled(
        {
          ok: true,
          value: {
            kind: 'intent',
            surface: FindSurface.find,
            operation: 'edit',
            endeavorId: review.id,
          },
        },
        'r',
        {
          surface: FindSurface.find,
          operation: 'edit',
          endeavorId: review.id,
          now,
        },
      ),
    )
    expect(next.detailPane.endeavor).toEqual(review)
  })
})

describe('a failed reopen', () => {
  it('keeps the selection on an error other than "not found"', () => {
    const before = readingReview('plan')
    const next = reduce(
      before,
      openDetailByIdThunk.fulfilled(
        { ok: false, error: EndeavorDetailExceptions.unknown('disk') },
        'r',
        { endeavorId: review.id },
      ),
    )
    expect(next.detailPane.endeavor).toEqual(review)
  })

  it('keeps the selection when a different endeavor was not found', () => {
    const before = readingReview('plan')
    const next = reduce(
      before,
      openDetailByIdThunk.fulfilled(
        {
          ok: false,
          error: EndeavorDetailExceptions.endeavorNotFound('other'),
        },
        'r',
        { endeavorId: 'other' },
      ),
    )
    expect(next.detailPane.endeavor).toEqual(review)
  })
})
