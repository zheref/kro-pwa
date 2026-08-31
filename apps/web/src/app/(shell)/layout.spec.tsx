import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ShellLayout from './layout'

/**
 * The shell layout is a passive Server Component (`RC-57`), so what is worth
 * asserting is that it mounts the composition root and the shell around its
 * children — and that it holds no logic of its own beyond reading the build
 * kind.
 *
 * `next/navigation` is stubbed because `providers.tsx` is the one file that
 * imports it; a render test has no router.
 */
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
}))

beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', {
    value: 1440,
    configurable: true,
  })
  window.matchMedia = ((query: string) =>
    ({
      matches: query.includes('min-width'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => true,
      onchange: null,
    }) as unknown as MediaQueryList) as typeof window.matchMedia
})

describe('the shell layout', () => {
  it('renders the destination inside the shell', () => {
    render(<ShellLayout>{<p>destination content</p>}</ShellLayout>)

    expect(screen.getByText('destination content')).toBeTruthy()
  })

  it('brings the sidebar shell with it at a wide viewport', () => {
    render(<ShellLayout>{<p>destination content</p>}</ShellLayout>)

    expect(screen.getByTestId('shell-sidebar')).toBeTruthy()
  })
})
