import { rewardMocks } from '@kro/core/mocks'
import { describe, expect, it } from 'vitest'
import { EarnExceptions } from '../EarnException'
import { initialEarnState } from '../EarnFeature'
import {
  withCatalogInstalled,
  withCatalogLoadStarted,
  withClaimApplied,
  withClaimCancelled,
  withClaimRequested,
  withDraftGlyphChanged,
  withDraftNotesChanged,
  withDraftPointsChanged,
  withDraftTitleChanged,
  withException,
  withPreferencesApplied,
  withRewardAdded,
  withRewardDraftClosed,
  withRewardDraftOpened,
  withRewardRemoved,
} from '../EarnShifters'

const snapshot = {
  rewards: [rewardMocks.bobaTea],
  claimedRewardIds: [],
  performances: [],
}

describe('withCatalogLoadStarted', () => {
  it('moves load to loading', () => {
    expect(withCatalogLoadStarted(initialEarnState).load).toEqual({
      kind: 'loading',
    })
  })

  it('leaves the retained catalog untouched (typical)', () => {
    const loaded = withCatalogInstalled(initialEarnState, snapshot)
    expect(withCatalogLoadStarted(loaded).rewards).toBe(loaded.rewards)
  })

  it('is a no-op on an already-idle state beyond the load field (boundary)', () => {
    const next = withCatalogLoadStarted(initialEarnState)
    expect(next.rewards).toEqual([])
  })
})

describe('withCatalogInstalled', () => {
  it('installs rewards, claimed ids and performances together', () => {
    const next = withCatalogInstalled(initialEarnState, snapshot)
    expect(next.load).toEqual({ kind: 'loaded' })
    expect(next.rewards).toBe(snapshot.rewards)
  })

  it('installs an empty catalog as loaded, not idle (boundary)', () => {
    const next = withCatalogInstalled(initialEarnState, {
      rewards: [],
      claimedRewardIds: [],
      performances: [],
    })
    expect(next.load.kind).toBe('loaded')
    expect(next.rewards).toEqual([])
  })

  it('replaces a previously failed load (typical retry)', () => {
    const failed = withException(
      initialEarnState,
      EarnExceptions.catalogLoadFailed('x'),
    )
    const next = withCatalogInstalled(failed, snapshot)
    expect(next.load).toEqual({ kind: 'loaded' })
  })
})

describe('withPreferencesApplied', () => {
  it('replaces the preferences object', () => {
    const next = withPreferencesApplied(initialEarnState, {
      defaultRewardThreshold: 250,
      pointsFormula: 'legacy',
    })
    expect(next.preferences.defaultRewardThreshold).toBe(250)
  })

  it('leaves the catalog untouched', () => {
    const loaded = withCatalogInstalled(initialEarnState, snapshot)
    const next = withPreferencesApplied(loaded, {
      defaultRewardThreshold: 1,
      pointsFormula: 'slidingScale',
    })
    expect(next.rewards).toBe(loaded.rewards)
  })

  it('does not touch load (boundary: independent from the catalog read)', () => {
    const next = withPreferencesApplied(initialEarnState, {
      defaultRewardThreshold: 100,
      pointsFormula: 'slidingScale',
    })
    expect(next.load).toEqual({ kind: 'idle' })
  })
})

describe('withException', () => {
  it('moves load to failed with the given exception', () => {
    const exception = EarnExceptions.catalogLoadFailed('offline')
    expect(withException(initialEarnState, exception).load).toEqual({
      kind: 'failed',
      exception,
    })
  })

  it('leaves the catalog untouched on a loaded state (atomicity)', () => {
    const loaded = withCatalogInstalled(initialEarnState, snapshot)
    const next = withException(loaded, EarnExceptions.claimRewardFailed('x'))
    expect(next.rewards).toBe(loaded.rewards)
    expect(next.claimedRewardIds).toBe(loaded.claimedRewardIds)
  })

  it('leaves claimingRewardId untouched, so a failed claim can be retried', () => {
    const claiming = withClaimRequested(
      withCatalogInstalled(initialEarnState, snapshot),
      rewardMocks.bobaTea.id,
    )
    const next = withException(claiming, EarnExceptions.claimRewardFailed('x'))
    expect(next.claimingRewardId).toBe(rewardMocks.bobaTea.id)
  })
})

describe('withRewardDraftOpened', () => {
  it('opens the sheet', () => {
    expect(withRewardDraftOpened(initialEarnState).isAddingReward).toBe(true)
  })

  it('prefills the cost from the loaded default-threshold preference', () => {
    const withPrefs = withPreferencesApplied(initialEarnState, {
      defaultRewardThreshold: 250,
      pointsFormula: 'slidingScale',
    })
    expect(withRewardDraftOpened(withPrefs).addRewardDraft.pointsRequired).toBe(
      250,
    )
  })

  it('resets a stale draft rather than reusing it (boundary)', () => {
    const dirty = withDraftTitleChanged(initialEarnState, 'stale title')
    expect(withRewardDraftOpened(dirty).addRewardDraft.title).toBe('')
  })
})

describe('withRewardDraftClosed', () => {
  it('closes the sheet', () => {
    const open = withRewardDraftOpened(initialEarnState)
    expect(withRewardDraftClosed(open).isAddingReward).toBe(false)
  })

  it('resets the draft to blank', () => {
    const dirty = withDraftTitleChanged(
      withRewardDraftOpened(initialEarnState),
      'x',
    )
    expect(withRewardDraftClosed(dirty).addRewardDraft.title).toBe('')
  })

  it('is a no-op shape on an already-closed state (boundary)', () => {
    expect(withRewardDraftClosed(initialEarnState).isAddingReward).toBe(false)
  })
})

describe('withDraftTitleChanged', () => {
  it('sets the title', () => {
    expect(
      withDraftTitleChanged(initialEarnState, 'Movie Night').addRewardDraft
        .title,
    ).toBe('Movie Night')
  })

  it('accepts an empty string (validated later, at confirm)', () => {
    expect(
      withDraftTitleChanged(initialEarnState, '').addRewardDraft.title,
    ).toBe('')
  })

  it('leaves other draft fields untouched', () => {
    const withPoints = withDraftPointsChanged(initialEarnState, 300)
    expect(
      withDraftTitleChanged(withPoints, 'x').addRewardDraft.pointsRequired,
    ).toBe(300)
  })
})

describe('withDraftGlyphChanged', () => {
  it('sets a short glyph as-is', () => {
    expect(
      withDraftGlyphChanged(initialEarnState, '🎮').addRewardDraft.glyph,
    ).toBe('🎮')
  })

  it('truncates to two code points (canon: `String(glyph.prefix(2))`)', () => {
    expect(
      withDraftGlyphChanged(initialEarnState, 'abc').addRewardDraft.glyph,
    ).toBe('ab')
  })

  it('accepts an empty glyph — the producer substitutes the default at confirm (boundary)', () => {
    expect(
      withDraftGlyphChanged(initialEarnState, '').addRewardDraft.glyph,
    ).toBe('')
  })
})

describe('withDraftPointsChanged', () => {
  it('sets a positive value', () => {
    expect(
      withDraftPointsChanged(initialEarnState, 500).addRewardDraft
        .pointsRequired,
    ).toBe(500)
  })

  it('clamps a negative value to zero (canon: `max(0, points)`)', () => {
    expect(
      withDraftPointsChanged(initialEarnState, -50).addRewardDraft
        .pointsRequired,
    ).toBe(0)
  })

  it('accepts exactly zero (boundary)', () => {
    expect(
      withDraftPointsChanged(initialEarnState, 0).addRewardDraft.pointsRequired,
    ).toBe(0)
  })
})

describe('withDraftNotesChanged', () => {
  it('sets non-empty notes', () => {
    expect(
      withDraftNotesChanged(initialEarnState, 'save up').addRewardDraft.notes,
    ).toBe('save up')
  })

  it('maps an empty string to null (canon: `notes.isEmpty ? nil : notes`)', () => {
    expect(
      withDraftNotesChanged(initialEarnState, '').addRewardDraft.notes,
    ).toBeNull()
  })

  it('clears previously set notes back to null', () => {
    const withNotes = withDraftNotesChanged(initialEarnState, 'x')
    expect(withDraftNotesChanged(withNotes, '').addRewardDraft.notes).toBeNull()
  })
})

describe('withRewardAdded', () => {
  it('prepends the reward — canon: `insert(_, at: 0)`', () => {
    const withOne = withCatalogInstalled(initialEarnState, snapshot)
    const next = withRewardAdded(withOne, rewardMocks.movieNight)
    expect(next.rewards[0]?.id).toBe(rewardMocks.movieNight.id)
    expect(next.rewards).toHaveLength(2)
  })

  it('closes the Add-Reward sheet and resets the draft', () => {
    const open = withRewardDraftOpened(initialEarnState)
    const next = withRewardAdded(open, rewardMocks.bobaTea)
    expect(next.isAddingReward).toBe(false)
    expect(next.addRewardDraft.title).toBe('')
  })

  it('is harmless when the sheet was never open — the suggestion path (boundary)', () => {
    const next = withRewardAdded(initialEarnState, rewardMocks.bobaTea)
    expect(next.isAddingReward).toBe(false)
    expect(next.rewards).toEqual([rewardMocks.bobaTea])
  })
})

describe('withRewardRemoved', () => {
  it('removes the matching reward', () => {
    const withOne = withCatalogInstalled(initialEarnState, snapshot)
    expect(withRewardRemoved(withOne, rewardMocks.bobaTea.id).rewards).toEqual(
      [],
    )
  })

  it('is a no-op for an id not in the catalog', () => {
    const withOne = withCatalogInstalled(initialEarnState, snapshot)
    expect(withRewardRemoved(withOne, 'ghost').rewards).toEqual(
      snapshot.rewards,
    )
  })

  it('empties the last reward without error (boundary)', () => {
    const withOne = withCatalogInstalled(initialEarnState, {
      ...snapshot,
      rewards: [rewardMocks.bobaTea],
    })
    expect(
      withRewardRemoved(withOne, rewardMocks.bobaTea.id).rewards,
    ).toHaveLength(0)
  })
})

describe('withClaimRequested / withClaimCancelled', () => {
  it('opens the confirm sheet on the given id', () => {
    expect(
      withClaimRequested(initialEarnState, rewardMocks.bobaTea.id)
        .claimingRewardId,
    ).toBe(rewardMocks.bobaTea.id)
  })

  it('cancel clears the confirm sheet', () => {
    const requested = withClaimRequested(
      initialEarnState,
      rewardMocks.bobaTea.id,
    )
    expect(withClaimCancelled(requested).claimingRewardId).toBeNull()
  })

  it('re-requesting a different id replaces the pointer (boundary)', () => {
    const first = withClaimRequested(initialEarnState, rewardMocks.bobaTea.id)
    const second = withClaimRequested(first, rewardMocks.movieNight.id)
    expect(second.claimingRewardId).toBe(rewardMocks.movieNight.id)
  })
})

describe('withClaimApplied', () => {
  it('adds the id to the claimed set', () => {
    const next = withClaimApplied(initialEarnState, rewardMocks.bobaTea.id)
    expect(next.claimedRewardIds).toEqual([rewardMocks.bobaTea.id])
  })

  it('clears the confirm sheet', () => {
    const requested = withClaimRequested(
      initialEarnState,
      rewardMocks.bobaTea.id,
    )
    expect(
      withClaimApplied(requested, rewardMocks.bobaTea.id).claimingRewardId,
    ).toBeNull()
  })

  it('is idempotent on an already-claimed id — canon: guard not already present', () => {
    const once = withClaimApplied(initialEarnState, rewardMocks.bobaTea.id)
    const twice = withClaimApplied(once, rewardMocks.bobaTea.id)
    expect(twice.claimedRewardIds).toEqual([rewardMocks.bobaTea.id])
  })
})
