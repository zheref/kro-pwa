/**
 * The intent→endeavor join, against a hand-built root state slice (`RC-55`).
 *
 * The three cases that matter are the two REFUSALS: an intent that belongs to
 * another feature must stay in the queue, and an intent naming a row this
 * surface no longer holds must not present Detail on a ghost.
 */
import { describe, expect, it } from 'vitest'
import type { RootState } from '../../../../library/store'
import {
  FIND_REFERENCE_NOW,
  findEndeavorMocks,
  findStateMocks,
} from '../../../find/FindMocks'
import type { EndeavorIntent } from '../../../find/FindOperations'
import type { FindState } from '../../../find/FindState'
import { selectDetailIntentRequest } from '../DetailOverlaySelectors'

const rootWith = (find: FindState): RootState =>
  ({ find }) as unknown as RootState

const withIntent = (intent: EndeavorIntent): FindState => ({
  ...findStateMocks.loaded,
  intents: [intent],
  nextIntentId: intent.id + 1,
})

const viewDetail: EndeavorIntent = {
  id: 7,
  operation: 'viewDetail',
  endeavorId: findEndeavorMocks.morningTask.id,
  surface: 'find',
}

describe('selectDetailIntentRequest', () => {
  it('resolves a viewDetail intent to the endeavor the row was showing', () => {
    const request = selectDetailIntentRequest(rootWith(withIntent(viewDetail)))

    expect(request).not.toBeNull()
    expect(request?.intentId).toBe(7)
    expect(request?.endeavor.id).toBe(findEndeavorMocks.morningTask.id)
    // The anchor is the fixture's own, so this is a pure read.
    expect(findStateMocks.loaded.find.clockAnchor).toEqual(FIND_REFERENCE_NOW)
  })

  it('resolves an edit intent too — canon\'s second entry point into the editor', () => {
    const request = selectDetailIntentRequest(
      rootWith(withIntent({ ...viewDetail, operation: 'edit' })),
    )

    expect(request?.operation).toBe('edit')
  })

  it('leaves another feature\'s intent alone, so the session surface still gets it', () => {
    const request = selectDetailIntentRequest(
      rootWith(withIntent({ ...viewDetail, operation: 'startSession' })),
    )

    expect(request).toBeNull()
  })

  it('resolves nothing when the queue is empty', () => {
    expect(selectDetailIntentRequest(rootWith(findStateMocks.loaded))).toBeNull()
  })

  it('refuses an intent whose row is no longer on the surface — a stale tap', () => {
    const request = selectDetailIntentRequest(
      rootWith(withIntent({ ...viewDetail, endeavorId: 'deleted-row' })),
    )

    expect(request).toBeNull()
  })

  it('reads the All Tasks pool when the intent came from that surface', () => {
    const state: FindState = {
      ...findStateMocks.tasksMixed,
      intents: [
        {
          ...viewDetail,
          surface: 'tasks',
          endeavorId: findEndeavorMocks.morningTask.id,
        },
      ],
      nextIntentId: 8,
    }

    expect(selectDetailIntentRequest(rootWith(state))?.endeavor.id).toBe(
      findEndeavorMocks.morningTask.id,
    )
  })
})
