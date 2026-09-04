/**
 * The catalog against the three snapshot suites: every design-system
 * story module is present, each component still ships ≥3 stories, and an
 * unknown id falls back to the default rather than rendering blank.
 */
import { describe, expect, it } from 'vitest'
import {
  STORY_CATALOG,
  STORY_CATALOG_GROUPS,
  storyById,
  storyOrDefault,
} from '../storyCatalog'

describe('the design-system catalog', () => {
  it('groups Tokens, Materials, Primitives, Endeavor and Chrome', () => {
    expect(STORY_CATALOG.groups.map((group) => group.title)).toEqual([
      'Tokens',
      'Materials',
      'Primitives',
      'Endeavor',
      'Chrome',
    ])
  })

  it('ships at least three stories per component, matching the snapshot floor', () => {
    for (const group of STORY_CATALOG_GROUPS) {
      for (const component of group.components) {
        expect(
          component.stories.length,
          `${component.title} has ${component.stories.length} stories`,
        ).toBeGreaterThanOrEqual(3)
      }
    }
  })

  it('lands on a real default story rather than an empty canvas', () => {
    expect(STORY_CATALOG.defaultStoryId).toBe('Tokens/Palette')
    expect(
      storyById(STORY_CATALOG, STORY_CATALOG.defaultStoryId)?.render,
    ).toBeTypeOf('function')
  })
})

describe('storyOrDefault', () => {
  it('returns the named story when it exists', () => {
    expect(storyOrDefault(STORY_CATALOG, 'Button/Variants').id).toBe(
      'Button/Variants',
    )
  })

  it('falls back to the default when the id is unknown', () => {
    expect(storyOrDefault(STORY_CATALOG, 'NotAComponent/Missing').id).toBe(
      STORY_CATALOG.defaultStoryId,
    )
  })

  it('keeps every story id unique', () => {
    const ids = STORY_CATALOG.stories.map((story) => story.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
