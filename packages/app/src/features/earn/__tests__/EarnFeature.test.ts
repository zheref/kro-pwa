import { rewardMocks } from '@kro/core/mocks'
import { describe, expect, it } from 'vitest'
import {
  type EarnState,
  earnSlice,
  initialEarnState,
  userDidCancelAddReward,
  userDidCancelClaim,
  userDidChangeDraftGlyph,
  userDidChangeDraftNotes,
  userDidChangeDraftPoints,
  userDidChangeDraftTitle,
  userDidTapAddReward,
  userDidTapClaim,
} from '../EarnFeature'
import { earnStateMocks } from '../EarnMocks'
import {
  addRewardThunk,
  addSuggestionThunk,
  claimRewardThunk,
  deleteRewardThunk,
  loadEarnCatalogThunk,
  loadEarnPreferencesThunk,
} from '../EarnProducer'

const reduce = (state: EarnState, action: Parameters<typeof earnSlice.reducer>[1]) =>
  earnSlice.reducer(state, action)

const loaded = earnStateMocks.loadedTypical

const abortError = () => {
  const error = new Error('Aborted')
  error.name = 'AbortError'
  return error
}

// ---------------------------------------------------------------------------
// The Add-Reward sheet
// ---------------------------------------------------------------------------

describe('userDidTapAddReward', () => {
  it('opens the sheet', () => {
    expect(reduce(loaded, userDidTapAddReward()).isAddingReward).toBe(true)
  })

  it('prefills the cost from the loaded preference', () => {
    const withPrefs = {
      ...loaded,
      preferences: { ...loaded.preferences, defaultRewardThreshold: 250 },
    }
    expect(
      reduce(withPrefs, userDidTapAddReward()).addRewardDraft.pointsRequired,
    ).toBe(250)
  })

  it('falls back to 100 when the preference has not loaded yet', () => {
    expect(
      reduce(initialEarnState, userDidTapAddReward()).addRewardDraft.pointsRequired,
    ).toBe(100)
  })
})

describe('draft field edits', () => {
  it('userDidChangeDraftTitle sets the title', () => {
    expect(
      reduce(loaded, userDidChangeDraftTitle({ title: 'Boba Tea' })).addRewardDraft.title,
    ).toBe('Boba Tea')
  })

  it('userDidChangeDraftGlyph truncates to two code points', () => {
    expect(
      reduce(loaded, userDidChangeDraftGlyph({ glyph: 'xyz' })).addRewardDraft.glyph,
    ).toBe('xy')
  })

  it('userDidChangeDraftPoints clamps to zero', () => {
    expect(
      reduce(loaded, userDidChangeDraftPoints({ pointsRequired: -10 })).addRewardDraft
        .pointsRequired,
    ).toBe(0)
  })

  it('userDidChangeDraftNotes maps empty to null', () => {
    expect(
      reduce(loaded, userDidChangeDraftNotes({ notes: '' })).addRewardDraft.notes,
    ).toBeNull()
  })
})

describe('userDidCancelAddReward', () => {
  it('closes the sheet', () => {
    const open = reduce(loaded, userDidTapAddReward())
    expect(reduce(open, userDidCancelAddReward()).isAddingReward).toBe(false)
  })

  it('resets the draft', () => {
    const dirty = reduce(loaded, userDidChangeDraftTitle({ title: 'x' }))
    expect(reduce(dirty, userDidCancelAddReward()).addRewardDraft.title).toBe('')
  })

  it('is safe to call when the sheet was never open', () => {
    expect(reduce(loaded, userDidCancelAddReward()).isAddingReward).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// The claim flow
// ---------------------------------------------------------------------------

describe('userDidTapClaim / userDidCancelClaim', () => {
  it('opens the confirm sheet on the tapped reward', () => {
    expect(
      reduce(loaded, userDidTapClaim({ rewardId: rewardMocks.bobaTea.id }))
        .claimingRewardId,
    ).toBe(rewardMocks.bobaTea.id)
  })

  it('cancel clears the confirm sheet', () => {
    const opened = reduce(loaded, userDidTapClaim({ rewardId: rewardMocks.bobaTea.id }))
    expect(reduce(opened, userDidCancelClaim()).claimingRewardId).toBeNull()
  })

  it('re-tapping a different reward replaces the pointer', () => {
    const first = reduce(loaded, userDidTapClaim({ rewardId: rewardMocks.bobaTea.id }))
    const second = reduce(first, userDidTapClaim({ rewardId: rewardMocks.plain.id }))
    expect(second.claimingRewardId).toBe(rewardMocks.plain.id)
  })
})

// ---------------------------------------------------------------------------
// Thunk lifecycle arms
// ---------------------------------------------------------------------------

describe('loadEarnPreferencesThunk lifecycle', () => {
  it('applies the loaded preferences on success', () => {
    const next = reduce(
      initialEarnState,
      loadEarnPreferencesThunk.fulfilled(
        { ok: true, value: { defaultRewardThreshold: 300, pointsFormula: 'legacy' } },
        'req',
        undefined,
      ),
    )
    expect(next.preferences.defaultRewardThreshold).toBe(300)
    expect(next.preferences.pointsFormula).toBe('legacy')
  })

  it('reports the typed failure on a domain error, leaving preferences untouched', () => {
    const next = reduce(
      initialEarnState,
      loadEarnPreferencesThunk.fulfilled(
        { ok: false, error: { kind: 'preferencesLoadFailed', message: 'x', recoverable: true } },
        'req',
        undefined,
      ),
    )
    expect(next.load.kind).toBe('failed')
    expect(next.preferences).toBe(initialEarnState.preferences)
  })

  it('degrades an unexpected rejection to the generic exception', () => {
    const next = reduce(
      initialEarnState,
      loadEarnPreferencesThunk.rejected(new Error('kaboom'), 'req', undefined),
    )
    expect(next.load.kind).toBe('failed')
  })

  it('stays silent on an aborted read', () => {
    const next = reduce(
      loaded,
      loadEarnPreferencesThunk.rejected(abortError(), 'req', undefined),
    )
    expect(next.load).toEqual(loaded.load)
  })
})

describe('loadEarnCatalogThunk lifecycle', () => {
  it('shows the spinner on pending, clearing any prior exception', () => {
    const failed = { ...loaded, load: earnStateMocks.failedRefreshKeepingCatalog.load }
    expect(reduce(failed, loadEarnCatalogThunk.pending('req', undefined)).load).toEqual({
      kind: 'loading',
    })
  })

  it('installs the whole snapshot on success', () => {
    const snapshot = { rewards: [rewardMocks.movieNight], claimedRewardIds: [], performances: [] }
    const next = reduce(
      initialEarnState,
      loadEarnCatalogThunk.fulfilled({ ok: true, value: snapshot }, 'req', undefined),
    )
    expect(next.load).toEqual({ kind: 'loaded' })
    expect(next.rewards).toEqual([rewardMocks.movieNight])
  })

  it('reports the typed failure, keeping the retained catalog (canon: never blank the surface)', () => {
    const next = reduce(
      loaded,
      loadEarnCatalogThunk.fulfilled(
        { ok: false, error: { kind: 'catalogLoadFailed', message: 'x', recoverable: true } },
        'req',
        undefined,
      ),
    )
    expect(next.load.kind).toBe('failed')
    expect(next.rewards).toBe(loaded.rewards)
  })

  it('stays silent on an aborted read', () => {
    const next = reduce(loaded, loadEarnCatalogThunk.rejected(abortError(), 'req', undefined))
    expect(next.load).toEqual(loaded.load)
  })
})

describe('addRewardThunk lifecycle', () => {
  const arg = {
    draft: { title: 'Boba Tea', glyph: '🧋', pointsRequired: 80, notes: null },
    id: 'new-1',
    now: new Date(2026, 2, 17),
  }

  it('prepends the new reward on success', () => {
    const next = reduce(
      loaded,
      addRewardThunk.fulfilled({ ok: true, value: { reward: rewardMocks.movieNight } }, 'req', arg),
    )
    expect(next.rewards[0]?.id).toBe(rewardMocks.movieNight.id)
  })

  it('reports the typed failure and leaves the sheet open for a retry', () => {
    const open = { ...loaded, isAddingReward: true }
    const next = reduce(
      open,
      addRewardThunk.fulfilled(
        { ok: false, error: { kind: 'addRewardFailed', message: 'x', recoverable: true } },
        'req',
        arg,
      ),
    )
    expect(next.load.kind).toBe('failed')
    expect(next.isAddingReward).toBe(true)
    expect(next.rewards).toBe(loaded.rewards)
  })

  it('degrades an unexpected rejection to the generic exception', () => {
    const next = reduce(loaded, addRewardThunk.rejected(new Error('kaboom'), 'req', arg))
    expect(next.load.kind).toBe('failed')
  })
})

describe('addSuggestionThunk lifecycle', () => {
  const arg = { suggestion: rewardMocks.bobaTea, id: 'new-2', now: new Date(2026, 2, 17) }

  it('prepends the inserted suggestion on success', () => {
    const next = reduce(
      loaded,
      addSuggestionThunk.fulfilled(
        { ok: true, value: { reward: { ...rewardMocks.bobaTea, id: 'new-2' } } },
        'req',
        arg,
      ),
    )
    expect(next.rewards[0]?.id).toBe('new-2')
  })

  it('reports the typed failure, leaving the catalog untouched', () => {
    const next = reduce(
      loaded,
      addSuggestionThunk.fulfilled(
        { ok: false, error: { kind: 'addRewardFailed', message: 'x', recoverable: true } },
        'req',
        arg,
      ),
    )
    expect(next.rewards).toBe(loaded.rewards)
  })

  it('degrades an unexpected rejection to the generic exception', () => {
    const next = reduce(loaded, addSuggestionThunk.rejected(new Error('kaboom'), 'req', arg))
    expect(next.load.kind).toBe('failed')
  })
})

describe('deleteRewardThunk lifecycle', () => {
  const arg = { id: rewardMocks.bobaTea.id }

  it('removes the reward on success', () => {
    const next = reduce(
      loaded,
      deleteRewardThunk.fulfilled({ ok: true, value: { id: rewardMocks.bobaTea.id } }, 'req', arg),
    )
    expect(next.rewards.some((r) => r.id === rewardMocks.bobaTea.id)).toBe(false)
  })

  it('reports the typed failure, leaving the catalog untouched', () => {
    const next = reduce(
      loaded,
      deleteRewardThunk.fulfilled(
        { ok: false, error: { kind: 'deleteRewardFailed', message: 'x', recoverable: true } },
        'req',
        arg,
      ),
    )
    expect(next.rewards).toBe(loaded.rewards)
  })

  it('degrades an unexpected rejection to the generic exception', () => {
    const next = reduce(loaded, deleteRewardThunk.rejected(new Error('kaboom'), 'req', arg))
    expect(next.load.kind).toBe('failed')
  })
})

describe('claimRewardThunk lifecycle — the atomic one', () => {
  const arg = { id: rewardMocks.bobaTea.id }

  it('adds the id to the claimed set and clears the confirm sheet on success', () => {
    const claiming = { ...loaded, claimingRewardId: rewardMocks.bobaTea.id }
    const next = reduce(
      claiming,
      claimRewardThunk.fulfilled({ ok: true, value: { id: rewardMocks.bobaTea.id } }, 'req', arg),
    )
    expect(next.claimedRewardIds).toContain(rewardMocks.bobaTea.id)
    expect(next.claimingRewardId).toBeNull()
  })

  it('leaves the claimed set and the confirm sheet untouched on a typed failure — atomicity', () => {
    const claiming = { ...loaded, claimingRewardId: rewardMocks.bobaTea.id }
    const next = reduce(
      claiming,
      claimRewardThunk.fulfilled(
        { ok: false, error: { kind: 'claimRewardFailed', message: 'x', recoverable: true } },
        'req',
        arg,
      ),
    )
    expect(next.claimedRewardIds).toEqual(claiming.claimedRewardIds)
    expect(next.claimingRewardId).toBe(rewardMocks.bobaTea.id)
    expect(next.load.kind).toBe('failed')
  })

  it('stays silent on an aborted claim', () => {
    const next = reduce(loaded, claimRewardThunk.rejected(abortError(), 'req', arg))
    expect(next.load).toEqual(loaded.load)
  })
})
