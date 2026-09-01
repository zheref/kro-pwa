import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { BothSchemes, Cell, STAGE_BACKDROP, Stage } from './storyStage'

afterEach(cleanup)

describe('Stage', () => {
  it('scopes its scheme with `data-theme`, which is what makes both-themes stories possible', () => {
    const { container } = render(
      <Stage theme="dark">
        <span>content</span>
      </Stage>,
    )

    const stage = container.querySelector(
      '[data-slot="story-stage"]',
    ) as HTMLElement
    expect(stage.dataset.theme).toBe('dark')
  })

  it('draws the page surface by default and the gradient when asked', () => {
    const { container, rerender } = render(
      <Stage>
        <span>content</span>
      </Stage>,
    )
    const stage = () =>
      container.querySelector('[data-slot="story-stage"]') as HTMLElement

    expect(stage().style.background).toContain('--kro-color-back')

    rerender(
      <Stage gradient>
        <span>content</span>
      </Stage>,
    )
    expect(stage().style.background).toBe(STAGE_BACKDROP)
  })

  it('renders both schemes side by side, so a reviewer never toggles an OS setting', () => {
    const { container } = render(
      <BothSchemes>
        <span>content</span>
      </BothSchemes>,
    )

    const stages = container.querySelectorAll('[data-slot="story-stage"]')
    expect(stages).toHaveLength(2)
    expect((stages[0] as HTMLElement).dataset.theme).toBe('light')
    expect((stages[1] as HTMLElement).dataset.theme).toBe('dark')
  })

  it('labels a matrix cell', () => {
    render(
      <Cell label="medium · ⚡50">
        <span>card</span>
      </Cell>,
    )

    expect(screen.getByText('medium · ⚡50')).not.toBeNull()
  })
})
