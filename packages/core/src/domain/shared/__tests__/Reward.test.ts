import { describe, expect, it } from 'vitest'
import { rewardMocks } from '../__mocks__/Reward.mocks'
import { makeReward, rewardForInsertion, rewardSuggestions } from '../Reward'

const DATE = new Date(2026, 0, 15, 9, 0, 0)

describe('makeReward', () => {
  it('carries every supplied field through unchanged', () => {
    expect(
      makeReward({
        id: 'reward-1',
        title: 'Movie Night',
        glyph: '🍿',
        pointsRequired: 300,
        notes: 'Phone in the other room',
        dateAdded: DATE,
      }),
    ).toEqual({
      id: 'reward-1',
      title: 'Movie Night',
      glyph: '🍿',
      pointsRequired: 300,
      notes: 'Phone in the other room',
      dateAdded: DATE,
    })
  })

  it('defaults the only optional canon field to null', () => {
    expect(
      makeReward({
        id: 'reward-2',
        title: 'Boba Tea',
        glyph: '🧋',
        pointsRequired: 80,
        dateAdded: DATE,
      }).notes,
    ).toBeNull()
  })

  it('accepts a zero cost without substituting a floor', () => {
    expect(rewardMocks.free.pointsRequired).toBe(0)
  })
})

describe('rewardForInsertion', () => {
  it('replaces identity and timestamp while keeping the copy', () => {
    const firstSuggestion = rewardSuggestions[0]
    expect(firstSuggestion).toBeDefined()
    if (firstSuggestion === undefined) return
    const inserted = rewardForInsertion(firstSuggestion, {
      id: 'reward-fresh',
      dateAdded: DATE,
    })
    expect(inserted).toEqual({
      id: 'reward-fresh',
      title: 'Get a PS5 Pro',
      glyph: '🎮',
      pointsRequired: 5000,
      notes: null,
      dateAdded: DATE,
    })
  })

  it('leaves the source reward untouched', () => {
    const before = { ...rewardMocks.movieNight }
    rewardForInsertion(rewardMocks.movieNight, { id: 'x', dateAdded: DATE })
    expect(rewardMocks.movieNight).toEqual(before)
  })

  it('carries notes across', () => {
    expect(
      rewardForInsertion(rewardMocks.weekendTrip, { id: 'x', dateAdded: DATE })
        .notes,
    ).toBe('Somewhere with a train station')
  })
})

describe('rewardSuggestions', () => {
  it('holds canon’s fifteen suggestions in canon order', () => {
    expect(rewardSuggestions.map((reward) => reward.title)).toEqual([
      'Get a PS5 Pro',
      'Go to the Beach',
      'Intimate Time',
      'Watch TV',
      'Doom Scroll for 30 minutes',
      'Have a Cheat Meal',
      'New Pair of Sneakers',
      'Movie Night',
      'Spa Day',
      'Order Takeout',
      'Boba Tea',
      'Weekend Trip',
      'Long Nap',
      'Gaming Marathon',
      'New Book',
    ])
  })

  it('carries canon’s point costs', () => {
    expect(rewardSuggestions.map((reward) => reward.pointsRequired)).toEqual([
      5000, 800, 600, 100, 150, 400, 1500, 300, 1200, 350, 80, 3500, 200, 700,
      450,
    ])
  })

  it('gives every suggestion a distinct, stable id', () => {
    const ids = rewardSuggestions.map((reward) => reward.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('carries canon’s glyphs', () => {
    expect(rewardSuggestions.map((reward) => reward.glyph)).toEqual([
      '🎮', '🏖️', '💞', '📺', '📱', '🍔', '👟', '🍿', '💆', '🥡', '🧋', '🧳',
      '💤', '🕹️', '📚',
    ])
  })
})
