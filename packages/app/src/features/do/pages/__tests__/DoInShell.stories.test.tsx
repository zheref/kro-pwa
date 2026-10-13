/**
 * The live-shell stories the landing page's web screenshots are captured from
 * (`apps/web/e2e-kit/landing-captures.spec.ts`), rendered from their own
 * `render`, over the surface each story pins in `parameters.surface` — the
 * test reads the window from the story rather than choosing its own, so the
 * two cannot diverge (`RC-11`).
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resetSurfaceCache } from '../../../main/useSurfaceLayout'
import * as stories from '../DoInShell.stories'

const installSurface = ({ width, coarse }: stories.LiveShellSurface): void => {
  Object.defineProperty(window, 'innerWidth', {
    value: width,
    configurable: true,
  })
  window.matchMedia = ((query: string) => ({
    matches:
      query === '(pointer: coarse)'
        ? coarse
        : query === '(min-width: 768px)'
          ? width >= 768
          : false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => true,
    onchange: null,
  })) as unknown as typeof window.matchMedia
}

beforeEach(() => resetSurfaceCache())
afterEach(cleanup)

describe('DoInShell live-shell stories', () => {
  it('MyDayInTheShell — a desktop-wide viewport shows the sidebar and the populated lanes', async () => {
    installSurface(stories.MyDayInTheShell.parameters.surface)
    render(stories.MyDayInTheShell.render())
    expect(await screen.findByRole('button', { name: 'Today' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Jot Down' })).toBeTruthy()
    await waitFor(() =>
      expect(screen.getAllByText('Finish the audit').length).toBeGreaterThan(0),
    )
    expect(screen.getByTestId('do-surface')).toBeTruthy()
  })

  it('MyDayInTheTabBarShell — a phone-wide, touch viewport drops the sidebar for the tab bar', async () => {
    installSurface(stories.MyDayInTheTabBarShell.parameters.surface)
    render(stories.MyDayInTheTabBarShell.render())
    await waitFor(() => expect(screen.getByTestId('do-surface')).toBeTruthy())
    expect(screen.queryByRole('button', { name: 'Jot Down' })).toBeNull()
  })

  it('AnEmptyDayInTheShell — the shell mounts with no destination in it', async () => {
    installSurface(stories.AnEmptyDayInTheShell.parameters.surface)
    render(stories.AnEmptyDayInTheShell.render())
    expect(await screen.findByRole('button', { name: 'Today' })).toBeTruthy()
    expect(screen.queryByTestId('do-surface')).toBeNull()
  })
})
