'use client'

/**
 * The one place the browser is measured.
 *
 * `resolveDoSurface` decides *what* the observation means; this hook is only
 * the observation. It exists as a hook rather than as a Service because it is
 * a synchronous read of the rendering environment — the same category as
 * `prefersReducedMotion` in the design system, which is a plain function for
 * the same reason. Nothing here decides anything; the answer goes into the
 * slice and every decision is a Selector over it.
 *
 * `useSyncExternalStore` rather than `useState` + a resize listener:
 *
 *  - it has a defined server snapshot, so a server render picks
 *    `SSR_DEFAULT_SURFACE` instead of touching `window`;
 *  - it re-reads during the commit React is already doing, so there is no
 *    "measured one frame late" flash of the wrong shell;
 *  - the snapshot is cached and compared by identity, so a drag-resize that
 *    stays inside one class produces **no** re-render at all — which is what
 *    keeps a resize from dispatching once per frame.
 */
import { useSyncExternalStore } from 'react'
import {
  type DoSurface,
  REGULAR_WIDTH_BREAKPOINT,
  SSR_DEFAULT_SURFACE,
  resolveDoSurface,
} from './DoSurfaceLayout'

const COARSE_POINTER_QUERY = '(pointer: coarse)'
const REGULAR_WIDTH_QUERY = `(min-width: ${REGULAR_WIDTH_BREAKPOINT}px)`

/**
 * The last surface handed out, kept so the snapshot is referentially stable.
 *
 * `useSyncExternalStore` calls `getSnapshot` on every render and warns (then
 * loops) if it returns a fresh object each time. Caching by value is the
 * documented fix.
 */
let cachedSurface: DoSurface = SSR_DEFAULT_SURFACE

const readSurface = (): DoSurface => {
  if (typeof window === 'undefined' || typeof matchMedia !== 'function') {
    return SSR_DEFAULT_SURFACE
  }

  const next = resolveDoSurface({
    pointer: matchMedia(COARSE_POINTER_QUERY).matches ? 'coarse' : 'fine',
    viewportWidth: window.innerWidth,
  })

  if (
    next.idiom !== cachedSurface.idiom ||
    next.width !== cachedSurface.width
  ) {
    cachedSurface = next
  }
  return cachedSurface
}

const subscribe = (onChange: () => void): (() => void) => {
  if (typeof window === 'undefined' || typeof matchMedia !== 'function') {
    return () => {}
  }

  const width = matchMedia(REGULAR_WIDTH_QUERY)
  const pointer = matchMedia(COARSE_POINTER_QUERY)

  // `addEventListener` on a MediaQueryList is the modern form; Safari < 14
  // only had `addListener`, and the design system's own reduced-motion read
  // makes the same allowance.
  const listen = (list: MediaQueryList): (() => void) => {
    if (typeof list.addEventListener === 'function') {
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    }
    // Safari < 14 shipped only the deprecated pair.
    list.addListener(onChange)
    return () => list.removeListener(onChange)
  }
  const unlistenWidth = listen(width)
  const unlistenPointer = listen(pointer)
  window.addEventListener('resize', onChange)

  return () => {
    unlistenWidth()
    unlistenPointer()
    window.removeEventListener('resize', onChange)
  }
}

const serverSnapshot = (): DoSurface => SSR_DEFAULT_SURFACE

/** The surface this browser is currently presenting. */
export function useSurfaceLayout(): DoSurface {
  return useSyncExternalStore(subscribe, readSurface, serverSnapshot)
}

/** Test seam: forget the cached snapshot between suites. */
export const resetSurfaceCache = (): void => {
  cachedSurface = SSR_DEFAULT_SURFACE
}
