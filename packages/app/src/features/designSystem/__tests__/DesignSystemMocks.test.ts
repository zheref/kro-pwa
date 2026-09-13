/**
 * The canned gallery states, checked for the property everything else
 * relies on: they are built from the catalog, never from a hand-typed id
 * that could drift when a story is renamed.
 */
import { describe, expect, it } from 'vitest'
import { designSystemMocks, selectedStoryFrom } from '../DesignSystemMocks'
import { STORY_CATALOG, storyById } from '../storyCatalog'

describe('designSystemMocks', () => {
  it('covers eight named gallery states', () => {
    expect(Object.keys(designSystemMocks)).toEqual([
      'default',
      'buttonVariants',
      'dialogDefault',
      'endeavorCard',
      'darkScheme',
      'chromeFab',
      'unknown',
      'lastChrome',
    ])
  })

  it('points default, button, dialog, card and fab at real stories', () => {
    expect(designSystemMocks.default.selectedStoryId).toBe(
      STORY_CATALOG.defaultStoryId,
    )
    expect(
      storyById(
        STORY_CATALOG,
        designSystemMocks.buttonVariants.selectedStoryId,
      ),
    ).toBeTruthy()
    expect(
      storyById(STORY_CATALOG, designSystemMocks.dialogDefault.selectedStoryId),
    ).toBeTruthy()
    expect(
      storyById(STORY_CATALOG, designSystemMocks.endeavorCard.selectedStoryId),
    ).toBeTruthy()
    expect(
      storyById(STORY_CATALOG, designSystemMocks.chromeFab.selectedStoryId),
    ).toBeTruthy()
  })

  it('uses an id the catalog does not have for the unknown state', () => {
    expect(
      storyById(STORY_CATALOG, designSystemMocks.unknown.selectedStoryId),
    ).toBeUndefined()
    expect(selectedStoryFrom(designSystemMocks.unknown).id).toBe(
      STORY_CATALOG.defaultStoryId,
    )
  })
})
