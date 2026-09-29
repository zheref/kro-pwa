/**
 * Where floating content may go — the shared collision rules every Radix
 * popover and menu in the design system applies, plus a pure placement helper
 * for the few panels positioned by hand.
 *
 * Radix already flips and shifts content to stay inside the viewport
 * (`avoidCollisions`, on by default); what it cannot know is that part of the
 * viewport is taken. On the desktop shell the glass sidebar is an obstacle: a
 * menu shifted "into view" can still land under it. The shell publishes that
 * obstacle once, through `CollisionInsetsProvider`, and every popover and menu
 * reads it as extra collision padding on the leading edge — so a menu opened
 * near the sidebar grows toward the content, never under the sidebar.
 */

import { type ReactNode, createContext, useContext } from 'react'

/** `--kro-space-small` — the breathing room kept from every viewport edge. */
export const COLLISION_PADDING_PX = 8

/** Parts of the viewport taken by page chrome, in px from each edge. */
export interface CollisionInsets {
  readonly top: number
  readonly right: number
  readonly bottom: number
  readonly left: number
}

export const NO_COLLISION_INSETS: CollisionInsets = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
}

const CollisionInsetsContext =
  createContext<CollisionInsets>(NO_COLLISION_INSETS)

/** Publishes the chrome floating content must avoid (the shell's sidebar). */
export function CollisionInsetsProvider({
  insets,
  children,
}: {
  readonly insets: CollisionInsets
  readonly children: ReactNode
}) {
  return (
    <CollisionInsetsContext.Provider value={insets}>
      {children}
    </CollisionInsetsContext.Provider>
  )
}

export const useCollisionInsets = (): CollisionInsets =>
  useContext(CollisionInsetsContext)

/** Radix's `collisionPadding`: the standard gap plus the chrome on each edge. */
export const collisionPaddingFor = (
  insets: CollisionInsets,
  gap: number = COLLISION_PADDING_PX,
): CollisionInsets => ({
  top: insets.top + gap,
  right: insets.right + gap,
  bottom: insets.bottom + gap,
  left: insets.left + gap,
})

/**
 * The default `collisionPadding` for a Radix content element: a caller's own
 * number or per-edge value still wins over the shared one.
 */
export const useDefaultCollisionPadding = (
  override?:
    | number
    | Partial<Record<'top' | 'right' | 'bottom' | 'left', number>>,
): number | Partial<Record<'top' | 'right' | 'bottom' | 'left', number>> => {
  const insets = useCollisionInsets()
  if (override === undefined) return collisionPaddingFor(insets)
  if (typeof override === 'number') {
    // A caller's gap, still clear of the chrome.
    return collisionPaddingFor(insets, override)
  }
  return { ...collisionPaddingFor(insets), ...override }
}

/**
 * Where a hand-positioned panel should sit horizontally, as an offset from
 * its preferred spot.
 *
 * The panel prefers `align` against its anchor (`start`: left edges flush,
 * `end`: right edges flush). If that overflows the room between the obstacle
 * and the viewport's right edge, it flips to the other alignment when that
 * fits, and otherwise shifts just enough to fit (or pins to the leading edge
 * when it is wider than the room). Returns the px to translate by.
 */
export const anchoredPanelOffset = (params: {
  readonly anchorLeft: number
  readonly anchorRight: number
  readonly panelWidth: number
  readonly viewportWidth: number
  readonly align: 'start' | 'end'
  readonly insets?: CollisionInsets
  readonly gap?: number
}): number => {
  const padding = collisionPaddingFor(
    params.insets ?? NO_COLLISION_INSETS,
    params.gap ?? COLLISION_PADDING_PX,
  )
  const minLeft = padding.left
  const maxLeft = params.viewportWidth - padding.right - params.panelWidth
  const startLeft = params.anchorLeft
  const endLeft = params.anchorRight - params.panelWidth
  const preferred = params.align === 'start' ? startLeft : endLeft
  const flipped = params.align === 'start' ? endLeft : startLeft
  const fits = (left: number) => left >= minLeft && left <= maxLeft

  if (fits(preferred)) return 0
  if (fits(flipped)) return flipped - preferred
  const clamped =
    maxLeft < minLeft
      ? minLeft
      : Math.min(Math.max(preferred, minLeft), maxLeft)
  return clamped - preferred
}
