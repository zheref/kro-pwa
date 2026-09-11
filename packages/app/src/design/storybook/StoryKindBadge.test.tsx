import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { StoryKindBadge } from './StoryKindBadge'
import { STORY_KIND_BADGE_CSS } from './storyKind'

afterEach(cleanup)

describe('StoryKindBadge', () => {
  it('prints the kind word, not the title', () => {
    const { container } = render(<StoryKindBadge kind="component" />)
    const badge = container.querySelector(
      '[data-slot="story-kind-badge"]',
    ) as HTMLElement
    expect(badge.textContent).toBe('Component')
    expect(badge.dataset.kind).toBe('component')
  })

  it('paints from KroTokens so the canvas and the in-app catalog match', () => {
    const { container } = render(<StoryKindBadge kind="material" />)
    const badge = container.querySelector(
      '[data-slot="story-kind-badge"]',
    ) as HTMLElement
    expect(badge.style.background).toBe(
      STORY_KIND_BADGE_CSS.material.background,
    )
    expect(badge.style.color).toBe(STORY_KIND_BADGE_CSS.material.color)
  })

  it('stays out of the accessible name so the row can say the title', () => {
    const { container } = render(<StoryKindBadge kind="modifier" />)
    const badge = container.querySelector(
      '[data-slot="story-kind-badge"]',
    ) as HTMLElement
    expect(badge.getAttribute('aria-hidden')).toBe('true')
    expect(badge.textContent).toBe('Modifier')
  })
})
