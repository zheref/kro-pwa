import { describe, expect, it } from 'vitest'
import {
  kindFromStoryTitle,
  kindFromStorybookId,
  storyKindBadgeForItem,
  storyKindMeta,
  STORY_KINDS,
} from './storyKind'

describe('storyKind', () => {
  it('classifies Kro titles by how they are used', () => {
    expect(kindFromStoryTitle('Overview')).toBe('catalog')
    expect(kindFromStoryTitle('Actions/Button')).toBe('primitive')
    expect(kindFromStoryTitle('Actions/Link')).toBe('component')
    expect(kindFromStoryTitle('Forms/Toggle')).toBe('component')
    expect(kindFromStoryTitle('Materials/KroGlass')).toBe('material')
    expect(kindFromStoryTitle('Materials/OnGradient')).toBe('modifier')
    expect(kindFromStoryTitle('Tokens')).toBe('token')
    expect(kindFromStoryTitle('Chrome/LiquidGlassFAB')).toBe('chrome')
    expect(kindFromStoryTitle('Endeavor/EndeavorCard')).toBe('domain')
  })

  it('round-trips Storybook ids for the titles the sidebar actually shows', () => {
    expect(kindFromStorybookId('overview--gallery')).toBe('catalog')
    expect(kindFromStorybookId('actions-button--gallery')).toBe('primitive')
    expect(kindFromStorybookId('actions-link--gallery')).toBe('component')
    expect(kindFromStorybookId('forms-toggle--gallery')).toBe('component')
    expect(kindFromStorybookId('materials-kroglass--gallery')).toBe('material')
    expect(kindFromStorybookId('materials-ongradient--gallery')).toBe(
      'modifier',
    )
    expect(kindFromStorybookId('chrome-liquidglassfab--gallery')).toBe('chrome')
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
        id: 'actions-button',
      }),
    ).toEqual({ kind: 'primitive', badge: 'Primitive' })
    expect(
      storyKindBadgeForItem({
        type: 'story',
        id: 'actions-link--gallery',
      }),
    ).toEqual({ kind: 'component', badge: 'Component' })
    expect(storyKindBadgeForItem({ type: 'group', id: 'actions' })).toBeNull()
  })
})
