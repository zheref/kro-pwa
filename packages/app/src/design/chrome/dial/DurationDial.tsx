import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useId,
  useRef,
} from 'react'
import { cn } from '../../system/utils/cn'

/**
 * The duration dial — drag round the rim to set a session length, or pick a
 * preset.
 *
 * TWO ANCESTORS, ONE COMPONENT. The drag mechanics are seeded by this repo's
 * own `apps/web/src/components/DurationDial/index.tsx` (the Chakra-era control
 * still rendering `/session`, which `#22` retires); the geometry, the range and
 * the readout come from `KroUI/Components/DurationDial.swift`; the preset pills
 * come from `KroUI/Session/SessionSetupView.swift`'s `presetPillsArea`, backed
 * by `SessionSetupFeature.availablePresets`. The seed is left where it is — the
 * legacy page still imports it.
 *
 * ==========================================================================
 * A REAL TENSION IN CANON: 90 MINUTES DOES NOT FIT ON A 60-MINUTE DIAL
 * ==========================================================================
 *
 * `DurationDial.maxDuration` is 3600 seconds. `availablePresets` is
 * `[15, 20, 25, 45, 60, 90]`. The last pill is 30 minutes past the end of the
 * dial's sweep, and canon copes by clamping in `DurationField`'s accessibility
 * action rather than by widening the dial.
 *
 * This port keeps canon's 3600s sweep as the DEFAULT and clamps the ARC, not
 * the value: past the end the ring reads full while the readout keeps telling
 * the truth. A caller that wants the arc to track a 90-minute session raises
 * `maxSeconds`. Silently rescaling the dial to the largest preset was the other
 * option and was rejected — it would change canon's geometry to hide a canon
 * question, and the question is worth seeing.
 *
 * ==========================================================================
 * KEYBOARD
 * ==========================================================================
 *
 * SwiftUI gives a `DragGesture` control its accessibility adjustment actions
 * from the platform. The web gives nothing, so the dial is a real
 * `role="slider"`: arrows step by `stepSeconds`, Page/Shift-arrow by five
 * steps, Home/End jump to the ends. The presets are ordinary buttons in a
 * labelled group, so they are in the tab order without any of this.
 */

export interface DurationDialProps {
  /** Current duration in seconds. */
  readonly seconds: number
  readonly onChange?: (seconds: number) => void
  /** Preset pills, in minutes. Canon's `availablePresets`. */
  readonly presets?: readonly number[]
  /** Canon's `DurationDial.maxDuration`. */
  readonly maxSeconds?: number
  /** Canon's `stepSize` — one minute. */
  readonly stepSeconds?: number
  /** Canon's `scale` — the tick ring's outer diameter. */
  readonly diameter?: number
  /** Read-only, like canon's `init(staticDuration:)`. */
  readonly readOnly?: boolean
  readonly label?: string
  readonly className?: string
  readonly style?: CSSProperties
}

/** `SessionSetupFeature.availablePresets`, verbatim. */
export const DEFAULT_DURATION_PRESETS: readonly number[] = [
  15, 20, 25, 45, 60, 90,
]

/** `DurationDial.maxDuration`. */
export const DEFAULT_MAX_SECONDS = 3600
/** `DurationDial.stepSize`. */
export const DEFAULT_STEP_SECONDS = 60
/** `DurationDial.scale`. */
export const DEFAULT_DIAMETER = 180
/** `DurationDial.indicatorLength` — the tick ring's stroke width. */
export const TICK_RING_WIDTH = 18
/** 60 ticks round the dial — the seed component's `TICK_COUNT`, and one per minute. */
export const TICK_COUNT = 60

const TICK_DEGREES = 360 / TICK_COUNT

/**
 * The two mask layers that turn a full conic disc into a dashed ring.
 *
 * Declared once, at module scope, because it depends on nothing that changes
 * per render — and because a mask string assembled inline is the kind of thing
 * that quietly loses its `closest-side` in a refactor.
 */
const TICK_MASK = [
  `radial-gradient(circle closest-side at 50% 50%, transparent 0 calc(100% - ${TICK_RING_WIDTH}px), #000 calc(100% - ${TICK_RING_WIDTH}px))`,
  `repeating-conic-gradient(from 0deg, #000 0 ${TICK_DEGREES / 2}deg, transparent ${TICK_DEGREES / 2}deg ${TICK_DEGREES}deg)`,
].join(', ')

/** Canon's `formatDigital` — `MM:SS`, never negative. */
export function formatDigital(seconds: number): string {
  const total = Math.max(Math.trunc(seconds), 0)
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

/**
 * The duration a point on the dial means.
 *
 * Canon's `angle(between:ending:)` measured from 12 o'clock clockwise, then
 * quantised to whole steps. Extracted so the maths is testable without a
 * pointer, a layout or a browser.
 */
export function durationForAngle({
  degrees,
  maxSeconds,
  stepSeconds,
}: {
  degrees: number
  maxSeconds: number
  stepSeconds: number
}): number {
  const steps = maxSeconds / stepSeconds
  const normalised = ((degrees % 360) + 360) % 360
  return Math.round((normalised / 360) * steps) * stepSeconds
}

/** Degrees clockwise from 12 o'clock for a point relative to the dial's centre. */
export function angleFromCentre(dx: number, dy: number): number {
  const degrees = 90 + (Math.atan2(dy, dx) * 180) / Math.PI
  return ((degrees % 360) + 360) % 360
}

export function DurationDial({
  seconds,
  onChange,
  presets = DEFAULT_DURATION_PRESETS,
  maxSeconds = DEFAULT_MAX_SECONDS,
  stepSeconds = DEFAULT_STEP_SECONDS,
  diameter = DEFAULT_DIAMETER,
  readOnly = false,
  label = 'Session duration',
  className,
  style,
}: DurationDialProps) {
  const dialRef = useRef<HTMLDivElement | null>(null)
  const presetsId = useId()

  // Clamped for the ARC only — see the 90-minute note above.
  const ratio = Math.min(1, Math.max(0, seconds / maxSeconds))
  const minutes = Math.round(seconds / 60)

  const commit = useCallback(
    (next: number) => {
      if (readOnly) return
      onChange?.(Math.max(0, next))
    },
    [onChange, readOnly],
  )

  const applyPointer = useCallback(
    (clientX: number, clientY: number) => {
      const element = dialRef.current
      if (!element) return
      const box = element.getBoundingClientRect()
      const degrees = angleFromCentre(
        clientX - (box.left + box.width / 2),
        clientY - (box.top + box.height / 2),
      )
      commit(durationForAngle({ degrees, maxSeconds, stepSeconds }))
    },
    [commit, maxSeconds, stepSeconds],
  )

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (readOnly) return
      // Capture on the element so a drag that leaves the dial keeps steering it
      // — the seed component dropped the drag on `mouseleave`, which made the
      // rim feel like it had a wall round it.
      event.currentTarget.setPointerCapture?.(event.pointerId)
      applyPointer(event.clientX, event.clientY)
    },
    [applyPointer, readOnly],
  )

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (readOnly) return
      if (!event.currentTarget.hasPointerCapture?.(event.pointerId)) return
      applyPointer(event.clientX, event.clientY)
    },
    [applyPointer, readOnly],
  )

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (readOnly) return
      const big = stepSeconds * 5
      const moves: Record<string, number | undefined> = {
        ArrowUp: stepSeconds,
        ArrowRight: stepSeconds,
        ArrowDown: -stepSeconds,
        ArrowLeft: -stepSeconds,
        PageUp: big,
        PageDown: -big,
      }
      if (event.key === 'Home') {
        event.preventDefault()
        commit(0)
        return
      }
      if (event.key === 'End') {
        event.preventDefault()
        commit(maxSeconds)
        return
      }
      const delta = moves[event.key]
      if (delta === undefined) return
      event.preventDefault()
      commit(Math.min(maxSeconds, Math.max(0, seconds + delta)))
    },
    [commit, maxSeconds, seconds, stepSeconds, readOnly],
  )

  const innerDiameter = diameter - TICK_RING_WIDTH * 2

  return (
    <div
      className={cn(
        'inline-flex flex-col items-center gap-kro-medium',
        className,
      )}
      style={style}
      data-kro-duration-dial=""
    >
      <div
        ref={dialRef}
        role="slider"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={maxSeconds}
        aria-valuenow={seconds}
        aria-valuetext={`${minutes} minutes`}
        aria-readonly={readOnly || undefined}
        aria-disabled={readOnly || undefined}
        tabIndex={readOnly ? -1 : 0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onKeyDown={onKeyDown}
        className="kro-motion-quick outline-none focus-visible:shadow-[var(--kro-ring)]"
        style={{
          position: 'relative',
          width: diameter,
          height: diameter,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          touchAction: 'none',
          userSelect: 'none',
          cursor: readOnly ? 'default' : 'pointer',
        }}
      >
        {/*
          The tick ring. Canon strokes a dashed circle at `indicatorLength`
          width and overlays a trimmed copy in the covered colour; here one
          conic gradient carries both halves and two mask layers cut it into
          the ring's shape:

            1. an ANNULUS — `closest-side` so 100% is the box's radius, which
               is the whole reason for that keyword: without it a `circle`
               gradient measures to the farthest CORNER and the hole lands at
               ~71% of where it should.
            2. the DASHES — a repeating conic gradient at 6deg per tick, 60
               round the dial, matching the tick count the seed component drew
               with 60 rotated elements. `intersect` keeps only what is inside
               both, which is a dashed annulus.

          One node rather than 60, whatever the step count.
        */}
        <div
          aria-hidden="true"
          data-kro-dial-ticks=""
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: `conic-gradient(var(--kro-color-accent) 0deg ${ratio * 360}deg, var(--kro-color-hairline) ${ratio * 360}deg 360deg)`,
            WebkitMaskImage: TICK_MASK,
            WebkitMaskComposite: 'source-in',
            maskImage: TICK_MASK,
            maskComposite: 'intersect',
          }}
        />
        {/*
          The disc, in canon's two layers — a base fill with the covered wedge
          TINTED OVER it, not a single conic that swaps one colour for another.

          Canon stacks `Circle().fill(circleColor)` and `RadialCircle(angle:,
          fillColor: coveredCircleColor)`, and `coveredCircleColor` is
          `.accentColor.opacity(0.30)` — a wash, which only means anything if
          there is an opaque fill underneath it. Collapsing the two into one
          gradient composites that 30% against the PAGE instead, so the covered
          wedge reads as a hole rather than as a tint. Two nodes, correct.

          `back-inner` rather than canon's `.absolute`: `.absolute` is pure
          white in light mode, which canon can afford because this control only
          ever appears on a forced-dark session sheet. A recessed field colour
          is the same intent on a surface that has to work in both schemes.
        */}
        <div
          aria-hidden="true"
          data-kro-dial-base=""
          style={{
            position: 'absolute',
            width: innerDiameter,
            height: innerDiameter,
            borderRadius: '50%',
            background: 'var(--kro-color-back-inner)',
          }}
        />
        <div
          aria-hidden="true"
          data-kro-dial-fill=""
          style={{
            position: 'absolute',
            width: innerDiameter,
            height: innerDiameter,
            borderRadius: '50%',
            background: `conic-gradient(color-mix(in srgb, var(--kro-color-accent) 30%, transparent) 0deg ${ratio * 360}deg, transparent ${ratio * 360}deg 360deg)`,
          }}
        />
        <span
          data-kro-dial-readout=""
          style={{
            position: 'relative',
            fontSize: 34,
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--kro-color-fore)',
            pointerEvents: 'none',
          }}
        >
          {formatDigital(seconds)}
        </span>
      </div>

      {presets.length > 0 ? (
        <div
          id={presetsId}
          role="group"
          aria-label="Duration presets"
          data-kro-dial-presets=""
          className="flex flex-wrap items-center justify-center gap-kro-small"
        >
          {presets.map((preset) => {
            const selected = preset === minutes
            return (
              <button
                key={preset}
                type="button"
                aria-pressed={selected}
                disabled={readOnly}
                onClick={() => commit(preset * 60)}
                data-kro-dial-preset={selected ? 'selected' : 'available'}
                className={cn(
                  'kro-motion-quick rounded-kro-pill',
                  'outline-none focus-visible:shadow-[var(--kro-ring)]',
                  'disabled:pointer-events-none disabled:opacity-[var(--kro-opacity-disabled)]',
                )}
                style={{
                  // Canon: `.padding(.horizontal, 16).padding(.vertical, 8)`,
                  // capsule, bold when selected, a rim only when selected.
                  minHeight: 'var(--kro-size-min-touch-target)',
                  padding: '8px 16px',
                  fontSize: 14,
                  fontWeight: selected ? 700 : 500,
                  cursor: 'pointer',
                  color: selected
                    ? 'var(--kro-color-on-accent)'
                    : 'var(--kro-color-fore)',
                  background: selected
                    ? 'var(--kro-color-accent)'
                    : 'var(--kro-color-back-inner)',
                  border: selected
                    ? '1px solid var(--kro-color-accent)'
                    : '1px solid var(--kro-color-hairline)',
                }}
              >
                {`${preset}m`}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
