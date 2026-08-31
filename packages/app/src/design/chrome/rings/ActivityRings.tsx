import { type CSSProperties, useEffect, useState } from 'react'
import { type ColorRole, colorVar } from '../../system/tokens/roles'
import { CHROME_SPRINGS, settleMs, springEasing } from '../layout/chromeMotion'

/**
 * Concentric progress arcs — the Day Progress Rings.
 *
 * Port of `KroUI/Components/ActivityRings.swift` and
 * `docs/Features/DayProgressRings.md`. Domain-less by construction, exactly as
 * canon is: it takes ratios and token roles, never an endeavor, a habit or a
 * store. "What the rings mean" stays a decision for whoever renders them.
 *
 * ==========================================================================
 * THE RULE THAT IS EASIEST TO GET WRONG: NO DENOMINATOR, NO RING
 * ==========================================================================
 *
 * `DayProgressRings.md` § User flows 4: "A day with no habits. The gold ring is
 * not drawn at all. The emerald tasks ring takes its place as the only ring, at
 * full size. Nothing hints at an absent second ring, because an empty gold
 * track would read as 'you've done none of your habits' when in fact there were
 * none to do."
 *
 * Canon enforces this by making the CALLER omit the ring. That is right for a
 * component but leaves the actual rule — "expected of 0 means absent, not
 * empty" — living in whichever screen happens to render the rings, where it can
 * be reimplemented differently the second time. So the rule ships here too, as
 * `dayProgressRings(...)`: one pure function, a truth table in the suite, and a
 * single answer for every caller. `ActivityRings` itself still just draws what
 * it is handed, so a caller with its own rules is not forced through it.
 *
 * The "full size" half falls out of the geometry rather than being special-
 * cased: a ring's diameter is derived from its INDEX, so a single ring is
 * always index 0 and always the outer size — whichever ring it is.
 *
 * ==========================================================================
 * WHY SVG
 * ==========================================================================
 *
 * A conic gradient masked to an annulus can draw a ring, but not a ring with
 * round caps, and canon's arcs are `lineCap: .round`. `stroke-dasharray` on an
 * SVG circle gives both, plus a single animatable property
 * (`stroke-dashoffset`) for the sweep, which is what makes the reduced-motion
 * branch one conditional instead of a rewrite.
 */

export interface ActivityRing {
  /**
   * Stable identity, e.g. `"tasks"`.
   *
   * Canon's reason applies unchanged: pass one whenever the SET of rings can
   * change between renders, so the absent ring is removed rather than a
   * neighbour being morphed into it.
   */
  readonly id?: string
  /** Completion in 0…1. Clamped on render — a raw ratio is fine to hand over. */
  readonly progress: number
  /** The filled arc's colour, as a token role. The track is derived from it. */
  readonly role: ColorRole
  /** Spoken description, e.g. "Habits, 3 of 5 complete". */
  readonly accessibilityLabel: string
}

export interface ActivityRingsProps {
  /** Arcs from outermost inward. To hide a ring, omit it. */
  readonly rings: readonly ActivityRing[]
  /** Rendered outer diameter, stroke included. Canon's default is 44. */
  readonly diameter?: number
  /** Stroke thickness of each arc. Canon's default is 6. */
  readonly lineWidth?: number
  /** Gap between one arc's outer edge and the next inward. Canon's default is 3. */
  readonly spacing?: number
  readonly className?: string
  readonly style?: CSSProperties
}

export const DEFAULT_RING_DIAMETER = 44
export const DEFAULT_RING_LINE_WIDTH = 6
export const DEFAULT_RING_SPACING = 3
/** Canon: the unfilled track is the ring's own colour at 22%. */
export const TRACK_OPACITY = 0.22

/**
 * `progress`, sanitised.
 *
 * Canon's note, and it is not hypothetical: a `0/0` ratio arrives as `NaN`, and
 * an unsanitised `NaN` trims the arc to nothing — silently, with no track to
 * show that anything went wrong.
 */
export function clampProgress(progress: number): number {
  if (!Number.isFinite(progress)) return 0
  return Math.min(1, Math.max(0, progress))
}

/**
 * Path diameter for the ring at `index`.
 *
 * Canon's derivation, including the correction its comment records: a stroke
 * centres on its path, so the drawn edge sits `lineWidth / 2` outside it, and
 * insetting by a full `lineWidth` is what makes the RENDERED outer edge land on
 * `diameter` instead of overflowing by one stroke.
 */
export function ringPathDiameter({
  index,
  diameter,
  lineWidth,
  spacing,
}: {
  index: number
  diameter: number
  lineWidth: number
  spacing: number
}): number {
  return Math.max(1, diameter - lineWidth - index * (lineWidth + spacing) * 2)
}

/**
 * The two rings a day has, with the no-denominator rule applied.
 *
 * `expected` of 0 (or a non-finite count) means the category asked nothing of
 * you today, so its ring is ABSENT — not empty. Canon's colours: outer gold for
 * habits, inner emerald for tasks.
 */
export function dayProgressRings({
  habits,
  tasks,
}: {
  habits?: { completed: number; expected: number }
  tasks?: { completed: number; expected: number }
}): ActivityRing[] {
  const rings: ActivityRing[] = []
  if (habits && habits.expected > 0) {
    rings.push({
      id: 'habits',
      progress: habits.completed / habits.expected,
      role: 'ringGold',
      accessibilityLabel: `Habits, ${habits.completed} of ${habits.expected} complete`,
    })
  }
  if (tasks && tasks.expected > 0) {
    rings.push({
      id: 'tasks',
      progress: tasks.completed / tasks.expected,
      role: 'ringEmerald',
      accessibilityLabel: `Tasks, ${tasks.completed} of ${tasks.expected} complete`,
    })
  }
  return rings
}

const SWEEP_MS = settleMs(CHROME_SPRINGS.rings)
const SWEEP_EASING = springEasing(CHROME_SPRINGS.rings)

/**
 * Read once on mount rather than tracked live.
 *
 * The distinction from `RotatingGlow` is deliberate: an endless rotation must
 * stop the moment the setting changes, but this is a one-shot transition that
 * is only ever ~600ms long. Reading the query when the component mounts, and
 * again whenever it changes, is enough — and it is what keeps the arc's initial
 * paint un-animated, which is the behaviour canon has (the first render is the
 * value, not a sweep up to it).
 */
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const query = matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(query.matches)
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return reduced
}

export function ActivityRings({
  rings,
  diameter = DEFAULT_RING_DIAMETER,
  lineWidth = DEFAULT_RING_LINE_WIDTH,
  spacing = DEFAULT_RING_SPACING,
  className,
  style,
}: ActivityRingsProps) {
  const reduceMotion = useReducedMotion()
  const centre = diameter / 2
  const label = rings.map((ring) => ring.accessibilityLabel).join(', ')

  return (
    <svg
      className={className}
      width={diameter}
      height={diameter}
      viewBox={`0 0 ${diameter} ${diameter}`}
      data-kro-activity-rings={rings.length}
      // With no rings there is nothing to announce, and a focusable element
      // with an empty name is worse than no element at all — canon's
      // `.accessibilityHidden(rings.isEmpty)`.
      role={rings.length > 0 ? 'img' : 'presentation'}
      aria-hidden={rings.length === 0 || undefined}
      aria-label={rings.length > 0 ? label : undefined}
      style={style}
    >
      <title>{label}</title>
      {rings.map((ring, index) => {
        const size = ringPathDiameter({ index, diameter, lineWidth, spacing })
        const radius = size / 2
        const circumference = 2 * Math.PI * radius
        const progress = clampProgress(ring.progress)
        const colour = colorVar(ring.role)

        return (
          <g
            key={ring.id ?? `ring-index-${index}`}
            data-kro-ring={ring.id ?? `index-${index}`}
            // Start at 12 o'clock instead of 3 o'clock — canon's
            // `.rotationEffect(.degrees(-90))`.
            transform={`rotate(-90 ${centre} ${centre})`}
          >
            {/*
              The track. Canon: "so an arc at 0% still reads as a ring you
              haven't closed rather than as nothing at all."
            */}
            <circle
              cx={centre}
              cy={centre}
              r={radius}
              fill="none"
              stroke={colour}
              strokeOpacity={TRACK_OPACITY}
              strokeWidth={lineWidth}
              data-kro-ring-track=""
            />
            <circle
              cx={centre}
              cy={centre}
              r={radius}
              fill="none"
              stroke={colour}
              strokeWidth={lineWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              data-kro-ring-arc=""
              data-kro-ring-progress={progress}
              style={
                reduceMotion
                  ? undefined
                  : {
                      transitionProperty: 'stroke-dashoffset',
                      transitionDuration: `${SWEEP_MS}ms`,
                      transitionTimingFunction: SWEEP_EASING,
                    }
              }
            />
          </g>
        )
      })}
    </svg>
  )
}
