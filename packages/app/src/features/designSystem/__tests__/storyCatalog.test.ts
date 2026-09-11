/**
 * The catalog against the three snapshot suites: every design-system
 * story module is present, each component ships one gallery page, and an
 * unknown id falls back to the default rather than rendering blank.
 */
import { describe, expect, it } from 'vitest'
import {
  STORY_CATALOG,
  STORY_CATALOG_GROUPS,
  componentOfStory,
  placementOfStory,
  storyById,
  storyOrDefault,
} from '../storyCatalog'

describe('the design-system catalog', () => {
  it('groups Tokens, Materials, Primitives, Endeavor, Chrome and the HIG catalog', () => {
    expect(STORY_CATALOG.groups.map((group) => group.title)).toEqual([
      'Tokens',
      'Materials',
      'Primitives',
      'Endeavor',
      'Chrome',
      'HIG',
      'HIG · Actions',
      'HIG · Content',
      'HIG · Layout',
      'HIG · Navigation',
      'HIG · Presentation',
      'HIG · Selection',
      'HIG · Status',
    ])
  })

  it('ships one gallery per component, matching the snapshot suites', () => {
    for (const group of STORY_CATALOG_GROUPS) {
      for (const component of group.components) {
        expect(
          component.stories.map((story) => story.exportName),
          `${component.title} has ${component.stories.length} stories`,
        ).toEqual(['Gallery'])
      }
    }
  })

  it('lands on a real default story rather than an empty canvas', () => {
    expect(STORY_CATALOG.defaultStoryId).toBe('Tokens/Gallery')
    expect(
      storyById(STORY_CATALOG, STORY_CATALOG.defaultStoryId)?.render,
    ).toBeTypeOf('function')
  })
})

describe('storyOrDefault', () => {
  it('returns the named story when it exists', () => {
    expect(storyOrDefault(STORY_CATALOG, 'Button/Gallery').id).toBe(
      'Button/Gallery',
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

describe('placementOfStory', () => {
  it('puts a primitive under Primitives / Button', () => {
    expect(placementOfStory(STORY_CATALOG, 'Button/Gallery')).toEqual({
      groupId: 'Primitives',
      componentId: 'Button',
    })
  })

  it('puts the catalog default under Tokens', () => {
    expect(
      placementOfStory(STORY_CATALOG, STORY_CATALOG.defaultStoryId),
    ).toEqual({
      groupId: 'Tokens',
      componentId: 'Tokens',
    })
  })

  it('follows the fallback story when the id is unknown', () => {
    expect(placementOfStory(STORY_CATALOG, 'NotAComponent/Missing')).toEqual(
      placementOfStory(STORY_CATALOG, STORY_CATALOG.defaultStoryId),
    )
  })
})

describe('componentOfStory', () => {
  it('names the leaf and its kind so the sidebar can badge it', () => {
    expect(componentOfStory(STORY_CATALOG, 'Button/Gallery')?.kind).toBe(
      'primitive',
    )
    expect(componentOfStory(STORY_CATALOG, 'OnGradient/Gallery')?.kind).toBe(
      'modifier',
    )
    expect(componentOfStory(STORY_CATALOG, 'HIG Buttons/Gallery')?.kind).toBe(
      'pattern',
    )
  })
})
