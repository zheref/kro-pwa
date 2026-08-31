import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import LegacyLayout from './layout'

/**
 * The pre-parity surfaces' provider tree, moved out of the root layout so it
 * wraps only the routes that still need it.
 *
 * What is worth asserting is exactly that: the old chrome still renders around
 * an old route, and it is scoped here rather than around the whole app.
 */
beforeEach(() => {
  window.matchMedia = ((query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => true,
      onchange: null,
    }) as unknown as MediaQueryList) as typeof window.matchMedia
})

describe('the legacy layout', () => {
  it('renders a pre-parity route inside the old chrome', () => {
    render(
      <LegacyLayout>
        <p>legacy content</p>
      </LegacyLayout>,
    )

    expect(screen.getByText('legacy content')).toBeTruthy()
  })

  it('keeps the old navigation chrome with it', () => {
    render(
      <LegacyLayout>
        <p>legacy content</p>
      </LegacyLayout>,
    )

    // The title the previous root layout passed to `NavigationLayout`.
    expect(screen.getAllByText('Kro').length).toBeGreaterThan(0)
  })
})
