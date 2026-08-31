import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { POINTER_QUERY, readInputCapability, useInputCapability } from './useInputCapability'

type Listener = () => void

/**
 * A `matchMedia` whose answer can be flipped, so the "the user just plugged in a
 * mouse" case is testable at all. jsdom ships no implementation, which is also
 * why `readInputCapability` has to survive its absence.
 */
function installMatchMedia(initiallyPointer: boolean) {
  const listeners = new Set<Listener>()
  let matches = initiallyPointer

  const stub = vi.fn((query: string) => ({
    media: query,
    get matches() {
      return matches
    },
    addEventListener: (_: string, listener: Listener) => {
      listeners.add(listener)
    },
    removeEventListener: (_: string, listener: Listener) => {
      listeners.delete(listener)
    },
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
})
