import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { BothSchemes, STAGE_BACKDROP, Stage } from './Stage'

afterEach(cleanup)

/**
 * Story scaffolding, so the bar is low — but not zero. The one thing that would
 * silently ruin a whole gallery is the theme attribute failing to reach the
 * subtree, because every story would then render the document's scheme twice
 * and the side-by-side comparison would show nothing.
 */
describe('Stage', () => {
  it('scopes the theme, so a dark stage really renders dark tokens', () => {
    render(
      <Stage theme="dark">
        <span>content</span>
      </Stage>,
    )

    expect(document.querySelector('[data-theme="dark"]')).not.toBeNull()
  })

  it('puts something busy behind the glass — a flat fill proves nothing', () => {
    render(
      <Stage>
        <span>content</span>
      </Stage>,
    )

    const stage = document.querySelector('[data-theme]') as HTMLElement
    expect(stage.style.background).toContain('linear-gradient')
    expect(STAGE_BACKDROP).toContain('linear-gradient')
  })

  it('renders the subject it was given', () => {
    render(
      <Stage>
        <button type="button">Quick add</button>
      </Stage>,
    )

    expect(screen.getByRole('button', { name: 'Quick add' })).toBeDefined()
  })
})

describe('BothSchemes', () => {
  it('renders the subject twice, once per scheme, side by side', () => {
    render(
      <BothSchemes>{(theme) => <span>{`subject-${theme}`}</span>}</BothSchemes>,
    )

    expect(screen.getByText('subject-light')).toBeDefined()
    expect(screen.getByText('subject-dark')).toBeDefined()
    expect(document.querySelectorAll('[data-theme]')).toHaveLength(2)
  })

  it('labels each half, so a screenshot says which scheme it is', () => {
    render(<BothSchemes>{() => <span>subject</span>}</BothSchemes>)

    expect(screen.getByText('Light')).toBeDefined()
    expect(screen.getByText('Dark')).toBeDefined()
  })

  it('never leaves both halves on the same scheme', () => {
    render(<BothSchemes>{() => <span>subject</span>}</BothSchemes>)

    const themes = Array.from(document.querySelectorAll('[data-theme]')).map(
      (node) => node.getAttribute('data-theme'),
    )
    expect(new Set(themes).size).toBe(2)
  })
})
