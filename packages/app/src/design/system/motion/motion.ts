/**
 * The motion tokens, in TypeScript.
 *
 * A component that animates in JS (a measured height, a FLIP transition) needs
 * the same numbers the stylesheet uses. These are those numbers — and
 * `motion.test.ts` asserts they still equal what `motion.css` declares, and
 * that the spring curves still describe KroApple's springs.
 */

/** Milliseconds. KroTokens.Motion, verbatim. */
export const MOTION_MS = {
  quick: 180,
  standard: 240,
  /** How long the quick spring takes to settle — see the note in motion.css. */
  quickSpring: 198,
  standardSpring: 270,
} as const

export type MotionDuration = keyof typeof MOTION_MS

export const MOTION_VARS = {
  quick: '--kro-duration-quick',
  standard: '--kro-duration-standard',
  quickSpring: '--kro-duration-quick-spring',
  standardSpring: '--kro-duration-standard-spring',
} as const

export const EASING_VARS = {
  standard: '--kro-ease-standard',
  out: '--kro-ease-out',
  quickSpring: '--kro-ease-quick-spring',
  standardSpring: '--kro-ease-standard-spring',
} as const

export type Easing = keyof typeof EASING_VARS

/**
 * The SwiftUI spring parameters each `linear()` curve was sampled from.
 * `bounce` is Apple's parameter; the damping ratio is `1 - bounce`.
 */
export const SPRINGS = {
  quickSpring: { duration: 0.18, bounce: 0.1 },
  standardSpring: { duration: 0.24, bounce: 0.12 },
} as const

/** `var(--kro-duration-…)`. */
export function durationVar(token: MotionDuration): string {
  return `var(${MOTION_VARS[token]})`
}

/** `var(--kro-ease-…)`. */
export function easingVar(token: Easing): string {
  return `var(${EASING_VARS[token]})`
}

/**
 * Whether the user has asked for reduced motion.
 *
 * The CSS layer already stills transitions and animations; this is for the
 * cases CSS cannot reach — a `requestAnimationFrame` loop, a scroll-driven
 * counter, an autoplaying canvas.
 */
export function prefersReducedMotion(): boolean {
  if (typeof matchMedia !== 'function') return false
  return matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * The displacement of a SwiftUI spring at time `t` seconds, normalised so 0 is
 * the start and 1 the rest position.
 *
 * Exported because it is the definition the CSS curves are sampled from: the
 * test regenerates the `linear()` stops through this function and compares
 * them to the stylesheet, so the two can never drift.
 */
export function springDisplacement(
  t: number,
  { duration, bounce }: { duration: number; bounce: number },
): number {
  const omega = (2 * Math.PI) / duration
  const zeta = 1 - bounce
  const damped = omega * Math.sqrt(1 - zeta * zeta)
  return (
    1 -
    Math.exp(-zeta * omega * t) *
      (Math.cos(damped * t) + ((zeta * omega) / damped) * Math.sin(damped * t))
  )
}
