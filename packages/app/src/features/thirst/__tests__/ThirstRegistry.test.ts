import { describe, expect, it } from 'vitest'
import { isThirstVotable, thirstFeatureBlurb, thirstFeatureTitle } from '../ThirstRegistry'

describe('isThirstVotable', () => {
  it.each(['matrix', 'board', 'blueprints', 'habits'])(
    '%s is votable — one of #35\'s four routes',
    (key) => {
      expect(isThirstVotable(key)).toBe(true)
    },
  )

  it('is false for the generic Unknown fallback — no vote for a non-existent feature', () => {
    expect(isThirstVotable('unknown')).toBe(false)
  })

  it('is false for an arbitrary unmapped key', () => {
    expect(isThirstVotable('some-future-destination')).toBe(false)
  })

  it.each(['toString', 'constructor', 'hasOwnProperty', 'valueOf'])(
    'is false for %s — an inherited Object.prototype member, not a registry key (found in review)',
    (key) => {
      expect(isThirstVotable(key)).toBe(false)
    },
  )
})

describe('thirstFeatureTitle', () => {
  it('returns the registry title for a votable key', () => {
    expect(thirstFeatureTitle('matrix')).toBe('Priority Matrix')
  })

  it('returns null for an unmapped key, so the caller supplies its own copy', () => {
    expect(thirstFeatureTitle('unknown')).toBeNull()
  })
})

describe('thirstFeatureBlurb', () => {
  it('returns the registry blurb for a votable key', () => {
    expect(thirstFeatureBlurb('habits')).toBe(
      'Build routines and keep your streaks alive.',
    )
  })

  it('returns null for an unmapped key', () => {
    expect(thirstFeatureBlurb('unknown')).toBeNull()
  })
})
