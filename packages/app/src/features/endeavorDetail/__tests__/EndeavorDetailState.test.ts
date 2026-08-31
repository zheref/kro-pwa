/**
 * The initial state and the shape of the one lifecycle field.
 *
 * The invariant worth pinning is the one canon gets for free from `@Presents`:
 * a child's draft exists exactly while its destination is presented, and the
 * closed state has neither.
 */
import { describe, expect, it } from 'vitest'
import { initialEndeavorDetailState } from '../EndeavorDetailState'
import { detailStateMocks } from '../EndeavorDetailMocks'

describe('the closed state holds nothing at all', () => {
  it('presents no endeavor and no destination', () => {
    expect(initialEndeavorDetailState.endeavor).toBeNull()
    expect(initialEndeavorDetailState.destination).toBeNull()
  })

  it('carries no draft of any kind', () => {
    expect(initialEndeavorDetailState.edit).toBeNull()
    expect(initialEndeavorDetailState.duration).toBeNull()
    expect(initialEndeavorDetailState.relationDraft).toBeNull()
  })

  it('starts the save lifecycle idle, as one field rather than two', () => {
    expect(initialEndeavorDetailState.save).toEqual({ kind: 'idle' })
  })
})

describe('a presented destination always carries the draft it needs', () => {
  it('gives the editor a working copy and a baseline', () => {
    expect(detailStateMocks.editingTask.edit?.working).not.toBeUndefined()
    expect(detailStateMocks.editingTask.edit?.original).not.toBeUndefined()
  })

  it('gives the Duration profile BOTH drafts, because it edits through Edit', () => {
    expect(detailStateMocks.durationOpen.edit).not.toBeNull()
    expect(detailStateMocks.durationOpen.duration).not.toBeNull()
  })

  it('gives a relation screen neither editor draft', () => {
    expect(detailStateMocks.performancesOpen.edit).toBeNull()
    expect(detailStateMocks.performancesOpen.duration).toBeNull()
  })
})
