/**
 * The one place the browser is measured.
 *
 * jsdom has no `matchMedia`, so the suite installs one — which is exactly what
 * the hook's own contract asks for: it must degrade to the server default when
 * `matchMedia` is absent, and follow it when it is present.
 */
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SSR_DEFAULT_SURFACE } from '../DoSurfaceLayout'
import { resetSurfaceCache, useSurfaceLayout } from '../useSurfaceLayout'

type Listener = () => void

interface FakeMedia {
  matches: boolean
  readonly listeners: Set<Listener>
}

const media = new Map<string, FakeMedia>()
let originalMatchMedia: typeof window.matchMedia | undefined

const setViewport = (width: number): void => {
  Object.defineProperty(window, 'innerWidth', {
    value: width,
    configurable: true,
  })
}

const installMatchMedia = (): void => {
  originalMatchMedia = window.matchMedia
  window.matchMedia = ((query: string) => {
    const entry = media.get(query) ?? { matches: false, listeners: new Set() }
    media.set(query, entry)
    return {
      get matches() {
        return entry.matches
      },
      media: query,
      addEventListener: (_: string, listener: Listener) =>
        entry.listeners.add(listener),
      removeEventListener: (_: string, listener: Listener) =>
        entry.listeners.delete(listener),
      addListener: (listener: Listener) => entry.listeners.add(listener),
      removeListener: (listener: Listener) => entry.listeners.delete(listener),
      dispatchEvent: () => true,
      onchange: null,
    } as unknown as MediaQueryList
  }) as typeof window.matchMedia
}

const change = (query: string, matches: boolean): void => {
  const entry = media.get(query)
  if (entry === undefined) return
  entry.matches = matches
  for (const listener of entry.listeners) listener()
}

function Probe() {
  const surface = useSurfaceLayout()
  return <span data-testid="surface">{`${surface.idiom}/${surface.width}`}</span>
}

beforeEach(() => {
  media.clear()
  resetSurfaceCache()
  installMatchMedia()
})

afterEach(() => {
  cleanup()
  if (originalMatchMedia !== undefined) window.matchMedia = originalMatchMedia
})

describe('useSurfaceLayout', () => {
  it('reports a phone-shaped window as handheld', () => {
    setViewport(390)
    media.set('(pointer: coarse)', { matches: true, listeners: new Set() })

    render(<Probe />)

    expect(screen.getByTestId('surface').textContent).toBe('handheld/compact')
  })

  it('reports a wide pointer-driven window as desktop', () => {
    setViewport(1440)
    media.set('(pointer: coarse)', { matches: false, listeners: new Set() })

    render(<Probe />)

    expect(screen.getByTestId('surface').textContent).toBe('desktop/regular')
  })

  it('reports a wide touch window as a tablet, keeping the touch minimums', () => {
    setViewport(1024)
    media.set('(pointer: coarse)', { matches: true, listeners: new Set() })

    render(<Probe />)

    expect(screen.getByTestId('surface').textContent).toBe('tablet/regular')
  })

  it('follows a resize across the breakpoint', () => {
    setViewport(1440)
    media.set('(pointer: coarse)', { matches: false, listeners: new Set() })
    media.set('(min-width: 768px)', { matches: true, listeners: new Set() })

    render(<Probe />)
    expect(screen.getByTestId('surface').textContent).toBe('desktop/regular')

    act(() => {
      setViewport(420)
      change('(min-width: 768px)', false)
    })

    expect(screen.getByTestId('surface').textContent).toBe('handheld/compact')
  })

  it('follows it back out again', () => {
    setViewport(420)
    media.set('(pointer: coarse)', { matches: false, listeners: new Set() })
    media.set('(min-width: 768px)', { matches: false, listeners: new Set() })

    render(<Probe />)
    expect(screen.getByTestId('surface').textContent).toBe('handheld/compact')

    act(() => {
      setViewport(1280)
      change('(min-width: 768px)', true)
    })

    expect(screen.getByTestId('surface').textContent).toBe('desktop/regular')
  })

  it('falls back to the server default when the browser cannot be measured', () => {
    // @ts-expect-error deliberately removing the API to prove the fallback.
    window.matchMedia = undefined

    render(<Probe />)

    expect(screen.getByTestId('surface').textContent).toBe(
      `${SSR_DEFAULT_SURFACE.idiom}/${SSR_DEFAULT_SURFACE.width}`,
    )
  })
})
