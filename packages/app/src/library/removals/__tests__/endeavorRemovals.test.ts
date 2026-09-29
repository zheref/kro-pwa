import { EndeavorOperation } from '@kro/core'
import { describe, expect, it } from 'vitest'
import { applyInboxOperationThunk } from '../../../features/capture/CaptureProducer'
import { CaptureExceptions } from '../../../features/capture/CaptureException'
import { deleteEndeavorThunk } from '../../../features/do/DoProducer'
import { DoExceptions } from '../../../features/do/DoException'
import { FindSurface } from '../../../features/find/FindOperations'
import { FindExceptions } from '../../../features/find/FindException'
import {
  performBulkOperationThunk,
  performEndeavorOperationThunk,
} from '../../../features/find/FindProducer'
import { deletePlanEndeavorThunk } from '../../../features/plan/PlanProducer'
import { PlanExceptions } from '../../../features/plan/PlanException'
import { isEndeavorRemoval, removedEndeavorIds } from '../endeavorRemovals'

const now = new Date(0)
const findArg = {
  surface: FindSurface.find,
  operation: 'delete' as const,
  endeavorId: 'e-1',
  now,
}

describe('a Find row delete', () => {
  it('removes the row it reports', () => {
    const action = performEndeavorOperationThunk.fulfilled(
      {
        ok: true,
        value: {
          kind: 'removed',
          surface: FindSurface.find,
          endeavorId: 'e-1',
        },
      },
      'r',
      findArg,
    )
    expect(removedEndeavorIds(action)).toEqual(['e-1'])
    expect(isEndeavorRemoval(action)).toBe(true)
  })

  it('removes nothing for another outcome kind (an intent hand-off)', () => {
    const action = performEndeavorOperationThunk.fulfilled(
      {
        ok: true,
        value: {
          kind: 'intent',
          surface: FindSurface.find,
          operation: 'edit',
          endeavorId: 'e-1',
        },
      },
      'r',
      { ...findArg, operation: 'edit' },
    )
    expect(removedEndeavorIds(action)).toEqual([])
  })

  it('removes nothing when the delete failed', () => {
    const action = performEndeavorOperationThunk.fulfilled(
      { ok: false, error: FindExceptions.operationFailed('disk') },
      'r',
      findArg,
    )
    expect(isEndeavorRemoval(action)).toBe(false)
  })
})

describe('a Find bulk operation', () => {
  const request = {
    surface: FindSurface.find,
    operation: 'delete' as const,
    endeavorIds: ['a', 'b'],
    now,
  }

  it('removes every row a bulk delete names', () => {
    expect(
      removedEndeavorIds(
        performBulkOperationThunk.fulfilled(
          { ok: true, value: request },
          'r',
          request,
        ),
      ),
    ).toEqual(['a', 'b'])
  })

  it('removes nothing on a bulk archive', () => {
    const archive = { ...request, operation: 'archive' as const }
    expect(
      removedEndeavorIds(
        performBulkOperationThunk.fulfilled(
          { ok: true, value: archive },
          'r',
          archive,
        ),
      ),
    ).toEqual([])
  })

  it('removes nothing when the bulk delete failed', () => {
    expect(
      removedEndeavorIds(
        performBulkOperationThunk.fulfilled(
          { ok: false, error: FindExceptions.bulkOperationFailed('disk') },
          'r',
          request,
        ),
      ),
    ).toEqual([])
  })
})

describe('the other delete paths', () => {
  it('Do: a card deleted, and nothing when it failed', () => {
    const arg = { endeavorId: 'd-1', now }
    expect(
      removedEndeavorIds(
        deleteEndeavorThunk.fulfilled({ ok: true, value: 'd-1' }, 'r', arg),
      ),
    ).toEqual(['d-1'])
    expect(
      removedEndeavorIds(
        deleteEndeavorThunk.fulfilled(
          { ok: false, error: DoExceptions.endeavorNotFound('d-1') },
          'r',
          arg,
        ),
      ),
    ).toEqual([])
  })

  it('Plan: a block deleted, and nothing when it failed', () => {
    const arg = { endeavorId: 'p-1', now }
    expect(
      removedEndeavorIds(
        deletePlanEndeavorThunk.fulfilled(
          { ok: true, value: { endeavorId: 'p-1' } },
          'r',
          arg,
        ),
      ),
    ).toEqual(['p-1'])
    expect(
      removedEndeavorIds(
        deletePlanEndeavorThunk.fulfilled(
          { ok: false, error: PlanExceptions.unknown('x') },
          'r',
          arg,
        ),
      ),
    ).toEqual([])
  })

  it('Inbox: a row deleted — but not a row marked complete', () => {
    const del = { operation: EndeavorOperation.delete, endeavorId: 'i-1', now }
    expect(
      removedEndeavorIds(
        applyInboxOperationThunk.fulfilled(
          { ok: true, value: { endeavorId: 'i-1', endeavor: null } },
          'r',
          del,
        ),
      ),
    ).toEqual(['i-1'])
    const complete = { ...del, operation: EndeavorOperation.markComplete }
    expect(
      removedEndeavorIds(
        applyInboxOperationThunk.fulfilled(
          { ok: true, value: { endeavorId: 'i-1', endeavor: null } },
          'r',
          complete,
        ),
      ),
    ).toEqual([])
    expect(
      removedEndeavorIds(
        applyInboxOperationThunk.fulfilled(
          { ok: false, error: CaptureExceptions.operationFailed('x') },
          'r',
          del,
        ),
      ),
    ).toEqual([])
  })

  it('ignores an unrelated action', () => {
    expect(removedEndeavorIds({ type: 'something/else' })).toEqual([])
  })
})
