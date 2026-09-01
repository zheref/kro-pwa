/**
 * The kit's public surface, asserted.
 *
 * The barrel is a re-export list, so the repo's guard would ordinarily exempt
 * it from needing a test — its doc-block happens to contain the word
 * "function", which the guard's keyword check reads as logic. Rather than edit
 * the prose to slip past a check, the barrel gets the test, and the test earns
 * its place: an export dropped from this list is a silent break for every
 * feature child that consumes the kit, and nothing else in the suite would
 * notice.
 */

import { describe, expect, it } from 'vitest'
import * as kit from '../index'

/** Every component a surface is expected to reach for by name. */
const COMPONENTS = [
  'CardBadge',
  'ChipFlow',
  'CompactPresentationHeader',
  'DeferPopover',
  'DeleteConfirmationPopover',
  'EmptyDayStateView',
  'EmptyStateCard',
  'EndeavorActionSurface',
  'EndeavorCard',
  'EndeavorRow',
  'InboxTrayEmptyState',
  'InlineBanner',
  'KroChip',
  'MarkCompletePopover',
  'PropertyRow',
  'RewardBadge',
  'SectionCard',
  'SuggestionCard',
  'SurfaceCard',
  'TaskRow',
  'UrgencyBadge',
] as const

describe('the endeavor kit barrel', () => {
  it('exports every component the issue names', () => {
    const missing = COMPONENTS.filter((name) => !(name in kit))
    expect(missing).toEqual([])
  })

  it('exports each of them as a component, not as a stray value', () => {
    for (const name of COMPONENTS) {
      expect(typeof (kit as Record<string, unknown>)[name], name).toBe(
        'function',
      )
    }
  })

  it('exports the model, projection and formatting helpers a caller needs', () => {
    for (const name of [
      'endeavorCardModelFrom',
      'computedUrgency',
      'computedReward',
      'computedSymbol',
      'formatDuration',
      'formatDueCaption',
      'kindShortLabel',
      'statusShortLabel',
      'resolveRowActions',
      'useInputCapability',
      'useWiggle',
    ]) {
      expect(typeof (kit as Record<string, unknown>)[name], name).toBe(
        'function',
      )
    }
  })

  it('does NOT re-export the mocks — a production bundle must not carry them', () => {
    // `endeavorMocks` is story and test data. It is imported by path where it is
    // needed, never through the barrel, so a feature that imports the kit does
    // not drag nine fixture endeavors into its chunk.
    expect('endeavorCardMocks' in kit).toBe(false)
    expect('NOW' in kit).toBe(false)
  })
})
