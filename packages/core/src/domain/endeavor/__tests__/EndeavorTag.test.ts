import { describe, expect, it } from 'vitest'
import {
  AttentionLevel,
  EndeavorTag,
  attentionLevels,
  endeavorTagAllowsForBackground,
  endeavorTagAttentionLevel,
  endeavorTagFromRawValue,
  endeavorTags,
  endeavorTagsFromRawValues,
} from '../EndeavorTag'

describe('EndeavorTag canon parity', () => {
  it('uses canon’s single-letter raw values, in declaration order', () => {
    expect(endeavorTags).toEqual(['O', 'D', 'S', 'R', 'P', 'E'])
  })

  it('maps each case name to its canon letter', () => {
    expect(EndeavorTag.onDesk).toBe('O')
    expect(EndeavorTag.duringPerformanceActivity).toBe('D')
    expect(EndeavorTag.session).toBe('S')
    expect(EndeavorTag.replica).toBe('R')
    expect(EndeavorTag.passive).toBe('P')
    expect(EndeavorTag.engaging).toBe('E')
  })

  it('lists every declared member exactly once', () => {
    expect(new Set(endeavorTags).size).toBe(endeavorTags.length)
    expect(endeavorTags.length).toBe(Object.keys(EndeavorTag).length)
  })
})

describe('AttentionLevel canon parity', () => {
  it('has canon’s four levels in declaration order', () => {
    expect(attentionLevels).toEqual(['auto', 'medium', 'demanding', 'unknown'])
  })

  it('declares `medium` even though no tag maps to it', () => {
    expect(attentionLevels).toContain(AttentionLevel.medium)
    expect(endeavorTags.map(endeavorTagAttentionLevel)).not.toContain(
      AttentionLevel.medium,
    )
  })
})

describe('endeavorTagFromRawValue / endeavorTagsFromRawValues', () => {
  it('narrows a known letter', () => {
    expect(endeavorTagFromRawValue('S')).toBe(EndeavorTag.session)
  })

  it('returns null for an unknown letter, and is case-sensitive', () => {
    expect(endeavorTagFromRawValue('Z')).toBeNull()
    expect(endeavorTagFromRawValue('o')).toBeNull()
  })

  it('drops unrecognised letters rather than failing, as canon’s compactMap does', () => {
    expect(endeavorTagsFromRawValues(['O', 'zzz', 'E'])).toEqual([
      EndeavorTag.onDesk,
      EndeavorTag.engaging,
    ])
  })

  it('round-trips the whole set', () => {
    expect(endeavorTagsFromRawValues([...endeavorTags])).toEqual(endeavorTags)
  })
})

describe('endeavorTagAttentionLevel', () => {
  it('reads onDesk, duringPerformanceActivity, session and passive as auto', () => {
    expect(endeavorTagAttentionLevel(EndeavorTag.onDesk)).toBe(AttentionLevel.auto)
    expect(endeavorTagAttentionLevel(EndeavorTag.duringPerformanceActivity)).toBe(
      AttentionLevel.auto,
    )
    expect(endeavorTagAttentionLevel(EndeavorTag.session)).toBe(AttentionLevel.auto)
    expect(endeavorTagAttentionLevel(EndeavorTag.passive)).toBe(AttentionLevel.auto)
  })

  it('reads engaging as demanding', () => {
    expect(endeavorTagAttentionLevel(EndeavorTag.engaging)).toBe(
      AttentionLevel.demanding,
    )
  })

  it('reads replica as unknown — not as a permissive default', () => {
    expect(endeavorTagAttentionLevel(EndeavorTag.replica)).toBe(
      AttentionLevel.unknown,
    )
  })
})

describe('endeavorTagAllowsForBackground', () => {
  it('allows the four auto tags', () => {
    expect(endeavorTags.filter(endeavorTagAllowsForBackground)).toEqual([
      EndeavorTag.onDesk,
      EndeavorTag.duringPerformanceActivity,
      EndeavorTag.session,
      EndeavorTag.passive,
    ])
  })

  it('refuses engaging, which demands attention', () => {
    expect(endeavorTagAllowsForBackground(EndeavorTag.engaging)).toBe(false)
  })

  it('refuses replica, because unknown attention is not auto or medium', () => {
    expect(endeavorTagAllowsForBackground(EndeavorTag.replica)).toBe(false)
  })

  it('agrees with the attention level for every tag', () => {
    for (const tag of endeavorTags) {
      const level = endeavorTagAttentionLevel(tag)
      expect(endeavorTagAllowsForBackground(tag)).toBe(
        level === AttentionLevel.auto || level === AttentionLevel.medium,
      )
    }
  })
})
