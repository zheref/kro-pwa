'use client'

import { type CSSProperties, type ReactNode, useEffect, useRef } from 'react'

/**
 * Drill-in navigation's motion, shared by every drill-in surface: the pane's
 * own readings, and a reading's sub-screens (Endeavor Detail's editors).
 *
 * The rule is the depth: going deeper slides the new screen in from the
 * trailing edge (`push`), going shallower from the leading edge (`pop`), and a
 * move at the same depth — or the first render — does not animate. Under
 * Reduce Motion the design system collapses the keyframes to an instant swap.
 */
export type DrillDirection = 'push' | 'pop'

/**
 * The direction of the last depth change — `null` until the depth first moves.
 *
 * STICKY on purpose: the direction is remembered until the depth changes
 * again, not recomputed per render. A drill-in re-renders its surface several
 * times while the slide is playing (a slot filling, a Selector settling), and a
 * direction that fell back to `null` on the next render removed the animation
 * from the element mid-flight — which is why no slide was ever seen.
 */
export function useDrillDirection(depth: number): DrillDirection | null {
  const state = useRef<{
    readonly depth: number
    readonly direction: DrillDirection | null
  }>({ depth, direction: null })
  if (depth !== state.current.depth) {
    state.current = {
      depth,
      direction: depth > state.current.depth ? 'push' : 'pop',
    }
  }
  return state.current.direction
}

/**
 * The push's timing: the iOS navigation curve (a fast start that settles),
 * long enough to read as travel across the panel.
 */
export const DRILL_MOTION = '380ms cubic-bezier(0.32, 0.72, 0, 1)'

/** The animation a drill in `direction` plays; nothing for `null`. */
export function drillAnimation(
  direction: DrillDirection | null,
): CSSProperties | undefined {
  return direction === null
    ? undefined
    : {
        animation: `kro-drill-${direction} ${DRILL_MOTION} both`,
      }
}

export interface DrillTransitionProps {
  /** 0 at the top screen; one more per drill-in. */
  readonly depth: number
  /** Identifies the screen shown; a new key remounts and replays the slide. */
  readonly screenKey: string
  readonly children: ReactNode
  readonly className?: string
  readonly testId?: string
}

/** Wraps a screen so drilling into it (or back out of it) slides. */
export function DrillTransition({
  depth,
  screenKey,
  children,
  className,
  testId,
}: DrillTransitionProps) {
  const direction = useDrillDirection(depth)
  return (
    <div
      key={screenKey}
      data-testid={testId}
      data-kro-drill={direction ?? 'none'}
      className={className}
      style={drillAnimation(direction)}
    >
      {children}
    </div>
  )
}
