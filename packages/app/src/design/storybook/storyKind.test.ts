import { describe, expect, it } from 'vitest'
import {
  kindFromStoryTitle,
  kindFromStorybookId,
  storyKindBadgeForItem,
  storyKindMeta,
  STORY_KINDS,
} from './storyKind'

describe('storyKind', () => {
  it('classifies HIG titles as components, patterns or the catalog', () => {
    expect(kindFromStoryTitle('HIG/Selection and input/Toggles')).toBe(
      'component',
    )
    expect(kindFromStoryTitle('HIG/Actions/Buttons')).toBe('pattern')
    expect(kindFromStoryTitle('HIG/Overview')).toBe('catalog')
  })

  it('classifies Kro kit titles by how they are used', () => {
    expect(kindFromStoryTitle('Design system/Primitives/Button')).toBe(
      'primitive',
    )
    expect(kindFromStoryTitle('Design system/KroGlass')).toBe('material')
    expect(kindFromStoryTitle('Design system/OnGradient')).toBe('modifier')
    expect(kindFromStoryTitle('Design system/Tokens')).toBe('token')
    expect(kindFromStoryTitle('Design system/Chrome/LiquidGlassFAB')).toBe(
      'chrome',
    )
    expect(kindFromStoryTitle('Endeavor/EndeavorCard')).toBe('domain')
  })

  it('round-trips Storybook ids for the titles the sidebar actually shows', () => {
    expect(kindFromStorybookId('hig-actions-buttons--gallery')).toBe('pattern')
    expect(
      kindFromStorybookId('hig-selection-and-input-toggles--gallery'),
    ).toBe('component')
    expect(kindFromStorybookId('design-system-kroglass--gallery')).toBe(
      'material',
    )
    expect(
      kindFromStorybookId('design-system-primitives-button--gallery'),
    ).toBe('primitive')
    expect(kindFromStorybookId('design-system-ongradient--gallery')).toBe(
      'modifier',
    )
  })

  it('exposes a badge and a use-as line for every kind', () => {
    for (const kind of Object.keys(STORY_KINDS) as Array<
      keyof typeof STORY_KINDS
    >) {
      const meta = storyKindMeta(kind)
      expect(meta.tags).toEqual([`kro-${kind}`])
      expect(meta.parameters.kro.badge.length).toBeGreaterThan(0)
      expect(meta.parameters.kro.useAs.length).toBeGreaterThan(0)
    }
  })

  it('badges leaves and leaves folders unnamed', () => {
    expect(
      storyKindBadgeForItem({
        type: 'component',
        id: 'hig-actions-buttons',
      }),
    ).toEqual({ kind: 'pattern', badge: 'Pattern' })
    expect(
      storyKindBadgeForItem({
        type: 'story',
        id: 'design-system-primitives-button--gallery',
      }),
    ).toEqual({ kind: 'primitive', badge: 'Primitive' })
    expect(
      storyKindBadgeForItem({ type: 'group', id: 'hig-actions' }),
    ).toBeNull()
  })
})
