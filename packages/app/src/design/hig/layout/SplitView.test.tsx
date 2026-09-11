import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { SplitView } from './SplitView'

afterEach(cleanup)

describe('SplitView', () => {
  it('places the list and the detail in two panes', () => {
    render(
      <SplitView
        leading={<p>Inbox triage</p>}
        trailing={<p>Session notes</p>}
      />,
    )

    expect(screen.getByText('Inbox triage')).toBeTruthy()
    expect(screen.getByText('Session notes')).toBeTruthy()
    expect(
      document.querySelector('[data-slot="split-view-leading"]'),
    ).toBeTruthy()
    expect(
      document.querySelector('[data-slot="split-view-trailing"]'),
    ).toBeTruthy()
  })

  it('defaults the leading pane to 280px', () => {
    render(<SplitView leading={<p>Plan</p>} trailing={<p>Do</p>} />)

    const root = document.querySelector(
      '[data-slot="split-view"]',
    ) as HTMLElement
    expect(root.style.gridTemplateColumns).toBe('280px 1fr')
  })

  it('honours a caller-supplied leading width and keeps both panes scrollable', () => {
    render(
      <SplitView
        leadingWidth="200px"
        leading={<p>Earn</p>}
        trailing={<p>Reward</p>}
      />,
    )

    const root = document.querySelector(
      '[data-slot="split-view"]',
    ) as HTMLElement
    expect(root.style.gridTemplateColumns).toBe('200px 1fr')

    const leading = document.querySelector('[data-slot="split-view-leading"]')
    const trailing = document.querySelector('[data-slot="split-view-trailing"]')
    expect(leading?.className).toContain('min-h-0')
    expect(leading?.className).toContain('overflow-auto')
    expect(trailing?.className).toContain('min-w-0')
    expect(trailing?.className).toContain('overflow-auto')
  })

  it('defaults to compact type and grows for comfortable', () => {
    const { rerender } = render(
      <SplitView leading={<p>Plan</p>} trailing={<p>Do</p>} />,
    )

    const root = document.querySelector('[data-slot="split-view"]')
    expect(root?.getAttribute('data-density')).toBe('compact')
    expect(root?.className).toContain('text-xs')

    rerender(
      <SplitView
        leading={<p>Plan</p>}
        trailing={<p>Do</p>}
        density="comfortable"
      />,
    )
    const comfortable = document.querySelector('[data-slot="split-view"]')
    expect(comfortable?.getAttribute('data-density')).toBe('comfortable')
    expect(comfortable?.className).toContain('text-sm')
  })
})
