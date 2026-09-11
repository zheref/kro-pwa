import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { StoryGallery } from './storyGallery'

afterEach(cleanup)

describe('StoryGallery', () => {
  it('marks the stack so a snapshot can name the page, not a section', () => {
    const { container } = render(
      <StoryGallery>
        <span>variants</span>
      </StoryGallery>,
    )

    const gallery = container.querySelector('[data-slot="story-gallery"]')
    expect(gallery).not.toBeNull()
    expect(gallery?.textContent).toBe('variants')
  })

  it('stacks sections in one column so densities sit under variants', () => {
    const { container } = render(
      <StoryGallery>
        <span>a</span>
        <span>b</span>
      </StoryGallery>,
    )

    const gallery = container.querySelector(
      '[data-slot="story-gallery"]',
    ) as HTMLElement
    expect(gallery.style.flexDirection).toBe('column')
    expect(gallery.children).toHaveLength(2)
  })

  it('keeps the token gap, so two HigStages do not collide', () => {
    const { container } = render(
      <StoryGallery>
        <span>a</span>
      </StoryGallery>,
    )

    const gallery = container.querySelector(
      '[data-slot="story-gallery"]',
    ) as HTMLElement
    expect(gallery.style.gap).toBe('var(--kro-space-large)')
  })
})
