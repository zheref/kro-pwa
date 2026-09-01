import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react'
import { colorVar } from '../../system/tokens/roles'
import type { ColorRole } from '../../system/tokens/roles'

/**
 * A rotating gradient glow cast from BEHIND a rounded silhouette.
 *
 * Port of `KroUI/Components/RotatingGlow.swift`. Domain-less: it takes token
 * roles and a shape, never an endeavor, a session or a store (`RC-14`).
 *
 * ==========================================================================
 * WHY TWO HUES, AND WHY THAT IS NOT A STYLE PREFERENCE
 * ==========================================================================
 *
 * The FAB's glow is `.gradient([.ringEmerald, .glowLime])` in canon, and the
 * reason is stated in `RotatingGlowStyle` itself: a sweep of ONE colour
 * "would rotate invisibly". Rotation is only perceptible where the sweep has a
 * feature to carry round the shape. Canon's single-tint case manufactures one
 * by varying opacity — and its comment records the cost: deep troughs "read as
 * two bright arcs chasing each other round the shape", so the tint case keeps
 * an opacity floor and the motion rides over the top of it as a moving
 * brightness.
 *
 * A SECOND HUE gives the sweep a feature that does not dim anything: the
 * emerald-to-lime boundary travels round the edge at full strength. That is
 * the difference between reading as TRAVELLING and reading as PULSING — a
 * brightness that rises and falls in place is a pulse; a hue boundary that
 * moves round the rim is travel. Collapse the two stops into one and the
 * component still animates and still looks alive, which is exactly why this
 * note exists: the failure is invisible in code review and only shows on
 * screen.
 *
 * ==========================================================================
 * HOW THE BAND IS BUILT (the web equivalent of canon's even-odd fill)
 * ==========================================================================
 *
 * Canon draws the content's shape grown by `spread`, punches the content's own
 * silhouette back out of it with an even-odd fill, then blurs what is left.
 * The cut-out is load-bearing and canon says why: filling the whole grown
 * shape "leaves colour sitting directly behind the content, and a glass
 * surface samples it and takes on the tint". A tinted FAB is the bug.
 *
 * On the web the same cut-out is a two-layer mask with `mask-composite:
 * exclude` — the standard gradient-border construction — on an INNER ring
 * whose content box is the silhouette. The BLUR lives on an OUTER canvas
 * grown by `margin = spread + blurRadius * 2`. CSS `filter: blur()` clips its
 * plume to the element's border box, so putting the filter on the ring itself
 * (a box only `spread` larger than the disc) is exactly how the falloff
 * becomes a hard rim. The canvas's extra padding is canon's `.padding(-margin)`.
 *
 * The ring stays thin and is blurred far wider than it is thick, so the light
 * falls off from the edge instead of drawing a flat ring. Canon draws the
 * band three times to deepen it without thickening it; `LAYERS` below does
 * the same, for the same reason.
 *
 * ==========================================================================
 * WHY THE ROTATION IS JAVASCRIPT
 * ==========================================================================
 *
 * `conic-gradient(from <angle>)` cannot be animated without registering the
 * angle as a custom property, which needs an `@property` rule in a stylesheet
 * — and this kit ships no stylesheet of its own (see the PR notes: the file
 * lane for `#15` is `design/chrome/**`, and the design system's single CSS
 * entry point lives outside it). So the sweep is a plain conic gradient on an
 * oversized child, and the CHILD is rotated. The band's mask and radius sit on
 * the parent, so the shape stays put while the sweep turns underneath it —
 * which is the same decomposition SwiftUI gets for free from
 * `AngularGradient(angle:)`.
 *
 * The Web Animations API rather than a CSS keyframe, for the same
 * no-stylesheet reason. That costs one thing and buys another: `motion.css`'s
 * blanket reduced-motion rule reaches CSS animations but not WAAPI, so the
 * setting is read here explicitly — and because it is explicit it is also
 * ASSERTABLE, which a media query inside a stylesheet is not.
 */

/** The silhouettes the glow can trace. Closed, exactly as canon's enum is. */
export type RotatingGlowShape =
  | { readonly kind: 'circle' }
  | { readonly kind: 'capsule' }
  | { readonly kind: 'roundedRectangle'; readonly cornerRadius: number }

export const GLOW_SHAPES = {
  circle: { kind: 'circle' } as const,
  capsule: { kind: 'capsule' } as const,
  roundedRectangle: (cornerRadius: number): RotatingGlowShape => ({
    kind: 'roundedRectangle',
    cornerRadius,
  }),
}

export interface RotatingGlowProps {
  /**
   * The colour ramp, as token roles. Two or more.
   *
   * Defaults to canon's FAB pair — `ringEmerald` then `glowLime`. A single
   * role is accepted and rendered, but see the two-hue note above before
   * reaching for one.
   */
  readonly hues?: readonly ColorRole[]
  /** The silhouette to trace. Must match the shape of the child. */
  readonly shape?: RotatingGlowShape
  /** Seconds for one full revolution. Canon's default is 4. */
  readonly secondsPerRevolution?: number
  /** Thickness of the band hugging the silhouette — brightness, not reach. */
  readonly spread?: number
  /** How far the light carries outward. This is the reach control. */
  readonly blurRadius?: number
  /**
   * How far the child's drawn edge sits inside its own layout box.
   *
   * Non-zero only when the child pads itself for a wider hit area — canon's
   * `LiquidGlassFAB.hitAreaInset` is the case this exists for. The web FAB
   * does not pad (62px already clears every target floor), so it passes 0.
   */
  readonly inset?: number
  /** `false` removes the glow outright rather than freezing it. */
  readonly isActive?: boolean
  readonly className?: string
  readonly style?: CSSProperties
  readonly children: ReactNode
}

/**
 * Canon's `.gradient([.ringEmerald, .glowLime])`.
 *
 * A tuple, not a `ColorRole[]`: with `noUncheckedIndexedAccess` on, an array
 * type would make even the first element `| undefined`, and the fallback below
 * would need a non-null assertion to say something the literal already proves.
 */
export const DEFAULT_GLOW_HUES = [
  'ringEmerald',
  'glowLime',
] as const satisfies readonly ColorRole[]

/**
 * Canon's defaults. Spread is the *brightness at the edge* (keep it thin —
 * a thick band draws a flat ring). Blur is the *reach* of the falloff.
 */
export const DEFAULT_GLOW_SPREAD = 3
export const DEFAULT_GLOW_BLUR_RADIUS = 5

/**
 * Room the blur plume needs around the silhouette, matching canon's
 * `margin = spread + blurRadius * 2` then `.padding(-margin)`.
 */
export function glowPlumeMargin(spread: number, blurRadius: number): number {
  return spread + blurRadius * 2
}

/**
 * Canon draws the band three times: "a band that thin, blurred that far, is
 * faint on its own — repeating it deepens the light without thickening the
 * band, so the falloff survives. Widening the band to gain the same intensity
 * would flatten it back into a ring."
 */
const LAYERS = 3

function borderRadiusFor(shape: RotatingGlowShape, outerInset: number): string {
  switch (shape.kind) {
    case 'circle':
    case 'capsule':
      return '9999px'
    case 'roundedRectangle':
      // The band's box is grown by `outerInset` on every side, so its corner
      // has to grow with it or the ring pinches at the corners.
      return `${shape.cornerRadius + outerInset}px`
  }
}

/**
 * The sweep, closed on itself.
 *
 * An angular gradient wraps at 0deg, so an unclosed ramp shows a hard seam
 * travelling round with it. Canon repeats the first stop unless the caller
 * already closed the ramp; so does this.
 */
export function conicSweep(hues: readonly ColorRole[]): string {
  const roles = hues.length > 0 ? hues : DEFAULT_GLOW_HUES
  const first = roles[0] ?? DEFAULT_GLOW_HUES[0]
  // A single role still needs two stops to be a gradient at all — canon's
  // `guard colors.count > 1 else { return [first, first] }`.
  const ramp = roles.length > 1 ? [...roles] : [first, first]
  if (ramp[ramp.length - 1] !== ramp[0]) ramp.push(first)
  return `conic-gradient(from 0deg, ${ramp.map(colorVar).join(', ')})`
}

/**
 * Whether the glow should turn.
 *
 * Isolated from the component — as canon isolates `RotatingGlowMotion` — so
 * every branch is reachable from a test without mounting anything.
 */
export function shouldGlowAnimate({
  isActive,
  reduceMotion,
  secondsPerRevolution,
}: {
  isActive: boolean
  reduceMotion: boolean
  secondsPerRevolution: number
}): boolean {
  if (!isActive || reduceMotion) return false
  return secondsPerRevolution > 0
}

/**
 * Tracks `prefers-reduced-motion` live.
 *
 * Live rather than read-once because the user can change it while the app is
 * open, and a glow that keeps spinning until the next reload is the same bug
 * as one that never stopped. Falls back to "not reduced" where `matchMedia`
 * is absent (jsdom, SSR), which is the same guard `system/motion` uses.
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

export function RotatingGlow({
  hues = DEFAULT_GLOW_HUES,
  shape = GLOW_SHAPES.circle,
  secondsPerRevolution = 4,
  spread = DEFAULT_GLOW_SPREAD,
  blurRadius = DEFAULT_GLOW_BLUR_RADIUS,
  inset = 0,
  isActive = true,
  className,
  style,
  children,
}: RotatingGlowProps) {
  const sweepsRef = useRef<Array<HTMLDivElement | null>>([])
  const reduceMotion = useReducedMotion()
  const animate = shouldGlowAnimate({
    isActive,
    reduceMotion,
    secondsPerRevolution,
  })

  useEffect(() => {
    if (!animate) return
    const sweeps = sweepsRef.current.filter((node): node is HTMLDivElement =>
      Boolean(node),
    )
    // jsdom has no Web Animations API. Nothing to start there, and nothing to
    // stub either — the settled 0deg frame is what a non-animating host shows,
    // which is also what a snapshot should record.
    const first = sweeps[0]
    if (!first || typeof first.animate !== 'function') return

    const animations = sweeps.map((sweep) =>
      sweep.animate([{ rotate: '0deg' }, { rotate: '360deg' }], {
        duration: secondsPerRevolution * 1000,
        iterations: Number.POSITIVE_INFINITY,
        easing: 'linear',
      }),
    )
    // Created in one tick so every layer shares a start time; forced to the
    // same position anyway, because three sweeps a frame apart would smear the
    // hue boundary the two-hue ramp exists to make legible.
    for (const animation of animations) animation.currentTime = 0

    return () => {
      for (const animation of animations) animation.cancel()
    }
  }, [animate, secondsPerRevolution])

  const plume = glowPlumeMargin(spread, blurRadius)
  const radius = borderRadiusFor(shape, spread)
  const sweep = conicSweep(hues)
  const firstHue = hues[0] ?? DEFAULT_GLOW_HUES[0]
  const secondHue = hues[1] ?? firstHue
  // Extra room under the disc so the under-cast can bloom downward instead of
  // clipping into a hairline at the FAB's bottom edge.
  const underReach = blurRadius * 2

  const canvasStyle: CSSProperties = {
    position: 'absolute',
    inset: -plume,
    // The ring hugs the silhouette (grown by `spread`). Everything between
    // that outer edge and this canvas's border is empty padding — the room
    // CSS `filter: blur()` needs, because a filter's plume is clipped to the
    // element's own border box. Putting the blur ON the ring (a box only
    // `spread` larger than the disc) is how the falloff becomes a hard rim.
    padding: plume - spread + inset,
    overflow: 'visible',
    filter: `blur(${blurRadius}px)`,
    zIndex: -1,
    pointerEvents: 'none',
  }

  const ringStyle: CSSProperties = {
    position: 'relative',
    boxSizing: 'border-box',
    width: '100%',
    height: '100%',
    padding: spread,
    borderRadius: radius,
    WebkitMaskImage: 'linear-gradient(#000 0 0), linear-gradient(#000 0 0)',
    WebkitMaskClip: 'content-box, border-box',
    WebkitMaskComposite: 'xor',
    maskImage: 'linear-gradient(#000 0 0), linear-gradient(#000 0 0)',
    maskClip: 'content-box, border-box',
    maskComposite: 'exclude',
  }

  return (
    <div
      className={className}
      data-kro-glow={isActive ? 'active' : 'off'}
      data-kro-glow-animating={animate ? 'true' : 'false'}
      data-kro-glow-plume={String(plume)}
      style={{
        position: 'relative',
        // Without its own stacking context the `z-index: -1` band can fall
        // behind an ancestor's background and disappear.
        isolation: 'isolate',
        display: 'inline-flex',
        overflow: 'visible',
        ...style,
      }}
    >
      {isActive ? (
        <div
          aria-hidden="true"
          data-kro-glow-spill=""
          style={{
            position: 'absolute',
            inset: -plume,
            bottom: -(plume + underReach),
            zIndex: -1,
            pointerEvents: 'none',
            overflow: 'visible',
          }}
        >
          {/*
            Coloured light pooling under the disc. Canon's even-odd band is
            omnidirectional; without this extra cast the web engine's clipped
            blur reads as a neon outline and nothing reaches the floor. A
            filled oval, blurred on a tall canvas, is a drop-shadow — light
            coming from behind and spilling out the bottom — which is the
            silhouette RotatingGlow's header describes.
          */}
          <div
            data-kro-glow-cast=""
            style={{
              position: 'absolute',
              left: '8%',
              right: '8%',
              top: '42%',
              bottom: 0,
              borderRadius: '50%',
              background: `radial-gradient(ellipse at 50% 15%, color-mix(in srgb, ${colorVar(secondHue)} 90%, transparent), color-mix(in srgb, ${colorVar(firstHue)} 55%, transparent) 45%, transparent 74%)`,
              filter: `blur(${Math.max(blurRadius * 2, 10)}px)`,
            }}
          />
        </div>
      ) : null}
      {isActive
        ? Array.from({ length: LAYERS }, (_, layer) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: the layers are identical, purely positional and constant in number — the index IS the identity
              key={`glow-layer-${layer}`}
              aria-hidden="true"
              data-kro-glow-band=""
              style={canvasStyle}
            >
              <div data-kro-glow-ring="" style={ringStyle}>
                <div
                  ref={(node) => {
                    sweepsRef.current[layer] = node
                  }}
                  data-kro-glow-sweep=""
                  style={{
                    position: 'absolute',
                    // Twice the ring box and centred, so a rotation of any
                    // angle still covers the corners rather than sweeping a
                    // blank quadrant across the band.
                    left: '-50%',
                    top: '-50%',
                    width: '200%',
                    height: '200%',
                    background: sweep,
                  }}
                />
              </div>
            </div>
          ))
        : null}
      {children}
    </div>
  )
}
