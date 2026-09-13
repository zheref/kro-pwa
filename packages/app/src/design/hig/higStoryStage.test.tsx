import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { GalleryAppearanceProvider } from '../storybook/galleryAppearance'
import {
  HIG_STAGE_BACKDROP,
  HigBothSchemes,
  HigDensities,
  HigRow,
  HigStage,
} from './higStoryStage'

afterEach(cleanup)

describe('HigStage', () => {
  it('scopes its scheme with `data-theme`, which is what makes both-themes stories possible', () => {
    const { container } = render(
      <HigStage theme="dark">
        <span>content</span>
      </HigStage>,
    )

    const stage = container.querySelector(
      '[data-slot="hig-story-stage"]',
    ) as HTMLElement
    expect(stage.dataset.theme).toBe('dark')
  })

  it('draws the page surface by default and the gradient when asked', () => {
    const { container, rerender } = render(
      <HigStage>
        <span>content</span>
      </HigStage>,
    )
    const stage = () =>
      container.querySelector('[data-slot="hig-story-stage"]') as HTMLElement

    expect(stage().style.background).toContain('--kro-color-back')

    rerender(
      <HigStage gradient>
        <span>content</span>
      </HigStage>,
    )
    expect(stage().style.background).toBe(HIG_STAGE_BACKDROP)
  })

  it('renders both schemes side by side, so a reviewer never toggles an OS setting', () => {
    const { container } = render(
      <HigBothSchemes>
        <span>content</span>
      </HigBothSchemes>,
    )

    const stages = container.querySelectorAll('[data-slot="hig-story-stage"]')
    expect(stages).toHaveLength(2)
    expect((stages[0] as HTMLElement).dataset.theme).toBe('light')
    expect((stages[1] as HTMLElement).dataset.theme).toBe('dark')
  })

  it('collapses to the gallery scheme when the gallery is pinning one', () => {
    const { container } = render(
      <GalleryAppearanceProvider
        appearance={{ scheme: 'dark', palette: 'green' }}
      >
        <HigBothSchemes>
          <span>content</span>
        </HigBothSchemes>
      </GalleryAppearanceProvider>,
    )

    const stages = container.querySelectorAll('[data-slot="hig-story-stage"]')
    expect(stages).toHaveLength(1)
    expect((stages[0] as HTMLElement).dataset.theme).toBe('dark')
    expect((stages[0] as HTMLElement).dataset.palette).toBe('green')
  })

  it('labels a variants row', () => {
    render(
      <HigRow label="Sizes">
        <span>compact</span>
      </HigRow>,
    )

    expect(screen.getByText('Sizes')).not.toBeNull()
  })

  it('shows compact and comfortable side by side', () => {
    render(<HigDensities render={(density) => <span>{density}</span>} />)

    expect(screen.getByText('Compact · default')).not.toBeNull()
    expect(screen.getByText('Comfortable · mobile')).not.toBeNull()
    expect(screen.getByText('compact')).not.toBeNull()
    expect(screen.getByText('comfortable')).not.toBeNull()
  })
})
