/**
 * Which pointing device the user actually has — the web half of the epic's
 * iPhone↔web-mobile / macOS↔web-desktop contract, applied to row actions.
 *
 * WHY A MEDIA QUERY AND NEVER A USER-AGENT STRING.
 * `EndeavorCapabilities` declares gestures as INTENT (`swipeLeading`,
 * `contextMenu`, `tap`) and leaves the realization to the render tier — its own
 * doc-comment carries the mapping table this hook implements. The question it
 * asks is "can this device hover with a precise pointer", which is exactly what
 * `(hover: hover) and (pointer: fine)` answers. A UA string answers a different
 * question ("what did the vendor call itself"), gets iPads and touch-screen
 * laptops wrong in opposite directions, and cannot change when the user plugs a
 * mouse in. This can, and does — the listener below re-renders when it flips.
 *
 * Deliberately NOT a boolean. `'touch' | 'pointer'` reads at the call site as
 * the thing being decided; `isDesktop` invites a second, drifting definition of
 * desktop somewhere else in the tree.
 */

import { useEffect, useState } from 'react'

export type InputCapability = 'touch' | 'pointer'

/**
 * The query. Both halves are required: `hover: hover` alone is true for a
 * stylus-and-hover tablet whose targets still need the 44px touch floor, and
 * `pointer: fine` alone is true for that same stylus.
 */
export const POINTER_QUERY = '(hover: hover) and (pointer: fine)'

/**
 * Read the capability once, without subscribing.
 *
 * Exported for the components that need it inside an event handler rather than
 * in render, and for tests. Falls back to `'touch'` when `matchMedia` is absent
 * — during SSR and in a bare jsdom — because the touch layout is the one that
 * is still usable with a mouse, whereas hover-only actions are unreachable
 * without one.
 */
export function readInputCapability(): InputCapability {
  if (typeof matchMedia !== 'function') return 'touch'
  return matchMedia(POINTER_QUERY).matches ? 'pointer' : 'touch'
}

/**
 * The current input capability, updated when the device gains or loses a
 * pointer (a keyboard folio attached, an external mouse unplugged).
 *
 * The initial state is `'touch'` on purpose, not `readInputCapability()`: the
 * server renders without `matchMedia`, so seeding from the live value would
 * make the first client paint disagree with the server's HTML. The effect below
 * corrects it on mount, which is a hydration-safe frame later.
 */
export function useInputCapability(): InputCapability {
  const [capability, setCapability] = useState<InputCapability>('touch')

  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const query = matchMedia(POINTER_QUERY)
    const sync = () => setCapability(query.matches ? 'pointer' : 'touch')
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  return capability
}
