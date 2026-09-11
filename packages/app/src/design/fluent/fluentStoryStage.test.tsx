import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import {
  FLUENT_STAGE_BACKDROP,
  FluentBothSchemes,
  FluentDensities,
  FluentRow,
  FluentStage,
} from './fluentStoryStage'

afterEach(cleanup)

describe('FluentStage', () => {
  it('scopes its scheme with `data-theme`', () => {
    const { container } = render(
      <FluentStage theme="dark">
        <span>content</span>
      </FluentStage>,
    )

    const stage = container.querySelector(
      '[data-slot="hig-story-stage"]',
    ) as HTMLElement
    expect(stage.dataset.theme).toBe('dark')
  })

  it('draws the page surface by default and the gradient when asked', () => {
    const { container, rerender } = render(
      <FluentStage>
        <span>content</span>
      </FluentStage>,
    )
    const stage = () =>
      container.querySelector('[data-slot="hig-story-stage"]') as HTMLElement

    expect(stage().style.background).toContain('--kro-color-back')

    rerender(
      <FluentStage gradient>
        <span>content</span>
      </FluentStage>,
    )
    expect(stage().style.background).toBe(FLUENT_STAGE_BACKDROP)
  })

  it('renders both schemes side by side', () => {
    const { container } = render(
      <FluentBothSchemes>
        <span>content</span>
      </FluentBothSchemes>,
    )

    const stages = container.querySelectorAll('[data-slot="hig-story-stage"]')
    expect(stages).toHaveLength(2)
    expect((stages[0] as HTMLElement).dataset.theme).toBe('light')
    expect((stages[1] as HTMLElement).dataset.theme).toBe('dark')
  })

  it('labels a variants row', () => {
    render(
      <FluentRow label="Appearances">
        <span>primary</span>
      </FluentRow>,
    )

    expect(screen.getByText('Appearances')).not.toBeNull()
  })

  it('shows compact and comfortable side by side', () => {
    render(<FluentDensities render={(density) => <span>{density}</span>} />)

    expect(screen.getByText('Compact · default')).not.toBeNull()
    expect(screen.getByText('Comfortable · mobile')).not.toBeNull()
    expect(screen.getByText('compact')).not.toBeNull()
    expect(screen.getByText('comfortable')).not.toBeNull()
  })
})
