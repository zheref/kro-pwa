import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { POINTER_QUERY, readInputCapability, useInputCapability } from './useInputCapability'

type Listener = () => void

/**
 * A `matchMedia` whose answer can be flipped, so the "the user just plugged in a
 * mouse" case is testable at all. jsdom ships no implementation, which is also
 * why `readInputCapability` has to survive its absence.
 *
 * `api` selects which listener surface the fake exposes. `'modern'` is
 * `addEventListener`/`removeEventListener`; `'legacy'` is the
 * `addListener`/`removeListener` pair Safari before 14 shipped INSTEAD — not
 * alongside. A stub that offers both cannot tell the two code paths apart,
 * which is exactly how the missing fallback went unnoticed.
 */
function installMatchMedia(initiallyPointer: boolean, api: 'modern' | 'legacy' = 'modern') {
  const listeners = new Set<Listener>()
  let matches = initiallyPointer

  const modern = {
    addEventListener: (_: string, listener: Listener) => {
      listeners.add(listener)
    },
    removeEventListener: (_: string, listener: Listener) => {
      listeners.delete(listener)
    },
  }
  const legacy = {
    addListener: (listener: Listener) => {
      listeners.add(listener)
    },
    removeListener: (listener: Listener) => {
      listeners.delete(listener)
    },
  }

  const stub = vi.fn((query: string) => ({
    media: query,
    get matches() {
      return matches
    },
    ...(api === 'modern' ? modern : legacy),
  }))

  Object.defineProperty(globalThis, 'matchMedia', {
    value: stub,
    configurable: true,
    writable: true,
  })

  return {
    stub,
    flip(toPointer: boolean) {
      matches = toPointer
      for (const listener of listeners) listener()
    },
    listenerCount: () => listeners.size,
  }
}

afterEach(() => {
  cleanup()
  Reflect.deleteProperty(globalThis as object, 'matchMedia')
})

describe('readInputCapability', () => {
  it('asks for hover AND a fine pointer — a hover-capable stylus is still touch', () => {
    const media = installMatchMedia(true)

    expect(readInputCapability()).toBe('pointer')
    expect(media.stub).toHaveBeenCalledWith(POINTER_QUERY)
  })

  it('reports touch when the query does not match — a phone', () => {
    installMatchMedia(false)
    expect(readInputCapability()).toBe('touch')
  })

  it('falls back to TOUCH where matchMedia is absent — SSR and bare jsdom', () => {
    // Touch is the safe default: its layout is still usable with a mouse,
    // whereas hover-only actions are unreachable without one.
    expect(readInputCapability()).toBe('touch')
  })
})

describe('useInputCapability', () => {
  it('starts at touch and corrects on mount, so hydration cannot mismatch', () => {
    installMatchMedia(true)
    const { result } = renderHook(() => useInputCapability())

    expect(result.current).toBe('pointer')
  })

  it('follows the device when a mouse is plugged in mid-session', () => {
    const media = installMatchMedia(false)
    const { result } = renderHook(() => useInputCapability())
    expect(result.current).toBe('touch')

    act(() => {
      media.flip(true)
    })

    expect(result.current).toBe('pointer')
  })

  it('unsubscribes on unmount rather than leaking a listener per row', () => {
    const media = installMatchMedia(true)
    const { unmount } = renderHook(() => useInputCapability())
    expect(media.listenerCount()).toBe(1)

    unmount()

    expect(media.listenerCount()).toBe(0)
  })

  it('stays on touch where matchMedia is absent instead of throwing', () => {
    const { result } = renderHook(() => useInputCapability())
    expect(result.current).toBe('touch')
  })

  it('follows the device on Safari < 14, which has only addListener', () => {
    // The regression: `addEventListener` alone is a no-op on those browsers,
    // so the capability froze at the first read and the mouse was never seen.
    const media = installMatchMedia(false, 'legacy')
    const { result } = renderHook(() => useInputCapability())
    expect(result.current).toBe('touch')

    act(() => {
      media.flip(true)
    })

    expect(result.current).toBe('pointer')
  })

  it('unsubscribes through the legacy pair too, rather than leaking a listener', () => {
    const media = installMatchMedia(true, 'legacy')
    const { unmount } = renderHook(() => useInputCapability())
    expect(media.listenerCount()).toBe(1)

    unmount()

    expect(media.listenerCount()).toBe(0)
  })
})
