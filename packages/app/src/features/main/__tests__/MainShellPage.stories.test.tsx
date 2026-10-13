/**
 * The live-shell stories the landing page's web screenshots are captured from
 * (`apps/web/e2e-kit/landing-captures.spec.ts`), rendered from their own
 * `render`: the capture is only as honest as these compositions.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import * as stories from '../MainShellPage.stories'
import { resetSurfaceCache } from '../useSurfaceLayout'

const installViewport = (width: number, coarse: boolean): void => {
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

describe('MainShellPage live-shell stories', () => {
  it('MyDayInTheShell — a desktop-wide viewport shows the sidebar and the populated lanes', async () => {
    installViewport(1440, false)
    render(stories.MyDayInTheShell.render())
    expect(await screen.findByRole('button', { name: 'Today' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Jot Down' })).toBeTruthy()
    await waitFor(() =>
      expect(screen.getAllByText('Finish the audit').length).toBeGreaterThan(0),
    )
    expect(screen.getByTestId('do-surface')).toBeTruthy()
  })

  it('MyDayInTheTabBarShell — a phone-wide, touch viewport drops the sidebar for the tab bar', async () => {
    installViewport(390, true)
    render(stories.MyDayInTheTabBarShell.render())
    await waitFor(() => expect(screen.getByTestId('do-surface')).toBeTruthy())
    expect(screen.queryByRole('button', { name: 'Jot Down' })).toBeNull()
  })

  it('AnEmptyDayInTheShell — the shell mounts with no destination in it', async () => {
    installViewport(1440, false)
    render(stories.AnEmptyDayInTheShell.render())
    expect(await screen.findByRole('button', { name: 'Today' })).toBeTruthy()
    expect(screen.queryByTestId('do-surface')).toBeNull()
  })
})
