/**
 * The mark-complete-mode wiggle — canon's `.task(id: isInMarkCompleteMode)`
 * loop driving `shakeAngle`, ported as a cancellable interval.
 *
 * WHY A LOOP AND NOT A CSS ANIMATION.
 * Canon writes the reason in the code, at the top of the `.task` block: a
 * `repeatForever` implicit animation "would keep oscillating after the value
 * settles, leaving the card visibly tilted". The web has the identical failure
 * — an `animation` removed mid-cycle snaps the element to wherever the keyframe
 * left it — and the identical fix: drive one angle, and on exit ANIMATE IT BACK
 * TO ZERO rather than dropping it. `angle` is therefore always a number the
 * caller can hand straight to `rotate()`, and it is `0` whenever the loop is
 * off.
 *
 * Reduced motion stills it completely (`prefers-reduced-motion: reduce`), and
 * `settled` stays `true` throughout so a caller never renders a half-tilted
 * card to a user who asked for no animation.
 *
 * Timings are canon's: ±0.35° with a 0.32 s half-period, and a 0.18 s ease-out
 * on the way back to rest.
 */

import { useEffect, useState } from 'react'
import { prefersReducedMotion } from '../system/motion/motion'

/** Canon's `shakeAngle` amplitude, in degrees. */
export const WIGGLE_ANGLE_DEGREES = 0.35

/** Canon's `halfPeriod: UInt64 = 320_000_000`. */
export const WIGGLE_HALF_PERIOD_MS = 320

/** Canon's `.easeOut(duration: 0.18)` return-to-rest. */
export const WIGGLE_SETTLE_MS = 180

export interface Wiggle {
  /** Degrees to rotate by. Exactly `0` while the loop is off. */
  readonly angle: number
  /** Whether the loop is running — drives the transition duration. */
  readonly isAnimating: boolean
}

/**
 * A wiggle that runs only while `active`, and never under reduced motion.
 *
 * `reducedMotion` is injectable so a story and a test can exercise the stilled
 * branch without owning the OS setting; it defaults to the live media query,
 * which is what every real call site wants.
 */
export function useWiggle(
  active: boolean,
  reducedMotion: () => boolean = prefersReducedMotion,
): Wiggle {
  const [angle, setAngle] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (!active || reducedMotion()) {
      // The exit path canon spells out: settle to rest rather than abandoning
      // the card at whatever angle the last tick left it.
      setIsAnimating(false)
      setAngle(0)
      return
    }

    setIsAnimating(true)
    let sign = 1
    setAngle(WIGGLE_ANGLE_DEGREES)
    const timer = setInterval(() => {
      sign = -sign
      setAngle(sign * WIGGLE_ANGLE_DEGREES)
    }, WIGGLE_HALF_PERIOD_MS)

    return () => {
      clearInterval(timer)
      setIsAnimating(false)
      setAngle(0)
    }
    // `reducedMotion` is a stable function in every real call site; listing it
    // keeps an inline arrow from silently pinning the first render's answer.
  }, [active, reducedMotion])

  return { angle, isAnimating }
}

/**
 * The inline style a wiggling element carries.
 *
 * Kept here rather than at the two call sites (the vertical card and the
 * horizontal one) because canon shares one `shakeAngle` across both layouts and
 * says so — "no duplication" is written in the `horizontalBody` doc-comment.
 */
export function wiggleStyle({ angle, isAnimating }: Wiggle) {
  return {
    transform: `rotate(${angle}deg)`,
    transition: `transform ${isAnimating ? WIGGLE_HALF_PERIOD_MS : WIGGLE_SETTLE_MS}ms ${
      isAnimating ? 'ease-in-out' : 'ease-out'
    }`,
  } as const
}
