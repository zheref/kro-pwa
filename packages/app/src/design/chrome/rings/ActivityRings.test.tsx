import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  type ActivityRing,
  ActivityRings,
  DEFAULT_RING_DIAMETER,
  DEFAULT_RING_LINE_WIDTH,
  DEFAULT_RING_SPACING,
  clampProgress,
  dayProgressRings,
  ringPathDiameter,
} from './ActivityRings'

afterEach(cleanup)

const arcs = () => Array.from(document.querySelectorAll('[data-kro-ring-arc]'))
const groups = () => Array.from(document.querySelectorAll('[data-kro-ring]'))

/**
 * THE TRUTH TABLE.
 *
 * `DayProgressRings.md` § States, transcribed. The one that matters most is
 * row 3: a habit-less day shows ONE emerald ring at full size, not an empty
 * gold track — because an empty gold track says "you've done none of your
 * habits" when there were none to do.
 */
describe('the no-denominator rule', () => {
  it('draws nothing when the day expects nothing of you', () => {
    const rings = dayProgressRings({
      habits: { completed: 0, expected: 0 },
      tasks: { completed: 0, expected: 0 },
    })

    expect(rings).toHaveLength(0)
  })

  it('draws one emerald ring on a day with tasks but no habits', () => {
    const rings = dayProgressRings({
      habits: { completed: 0, expected: 0 },
      tasks: { completed: 2, expected: 5 },
    })

    expect(rings).toHaveLength(1)
    expect(rings[0]?.id).toBe('tasks')
    expect(rings[0]?.role).toBe('ringEmerald')
  })

  it('draws that lone emerald ring at FULL size, not at the inner diameter', () => {
    const rings = dayProgressRings({
      habits: { completed: 0, expected: 0 },
      tasks: { completed: 2, expected: 5 },
    })
    render(<ActivityRings rings={rings} />)

    const arc = arcs()[0] as SVGCircleElement
    const outer = ringPathDiameter({
      index: 0,
      diameter: DEFAULT_RING_DIAMETER,
      lineWidth: DEFAULT_RING_LINE_WIDTH,
      spacing: DEFAULT_RING_SPACING,
    })
    expect(arc.getAttribute('r')).toBe(String(outer / 2))
  })

  it('draws one gold ring on a day with habits but no tasks', () => {
    const rings = dayProgressRings({
      habits: { completed: 1, expected: 3 },
      tasks: { completed: 0, expected: 0 },
    })

    expect(rings).toHaveLength(1)
    expect(rings[0]?.role).toBe('ringGold')
  })

  it('draws both, gold outside and emerald inside, on an ordinary day', () => {
    const rings = dayProgressRings({
      habits: { completed: 3, expected: 5 },
      tasks: { completed: 1, expected: 4 },
    })

    expect(rings.map((ring) => ring.id)).toEqual(['habits', 'tasks'])
    render(<ActivityRings rings={rings} />)
    expect(groups()).toHaveLength(2)
  })

  it('omits a category the caller did not mention at all', () => {
    expect(dayProgressRings({ tasks: { completed: 1, expected: 2 } })).toHaveLength(1)
    expect(dayProgressRings({})).toHaveLength(0)
  })

  it('names each ring for a screen reader with its own count', () => {
    const rings = dayProgressRings({
      habits: { completed: 3, expected: 5 },
      tasks: { completed: 1, expected: 4 },
    })

    expect(rings[0]?.accessibilityLabel).toBe('Habits, 3 of 5 complete')
    expect(rings[1]?.accessibilityLabel).toBe('Tasks, 1 of 4 complete')
  })
})

describe('progress is sanitised before it is drawn', () => {
  it('leaves an ordinary ratio alone', () => {
    expect(clampProgress(0.4)).toBe(0.4)
  })

  it('turns a 0/0 NaN into zero rather than drawing nothing at all', () => {
    // An unsanitised NaN trims the arc to nothing — silently, with no track to
    // show that something went wrong.
    expect(clampProgress(Number.NaN)).toBe(0)
    expect(clampProgress(Number.POSITIVE_INFINITY)).toBe(0)
  })

  it('clamps an over-completed day to a closed ring', () => {
    expect(clampProgress(1.4)).toBe(1)
  })

  it('clamps a negative ratio to an open one', () => {
    expect(clampProgress(-0.2)).toBe(0)
  })
})

describe('the geometry matches canon`s derivation', () => {
  it('lands the rendered outer edge on the requested diameter, stroke included', () => {
    // The correction canon's own comment records: a stroke centres on its path,
    // so without insetting a full lineWidth the stack overflows by one stroke.
    const outer = ringPathDiameter({
      index: 0,
      diameter: 44,
      lineWidth: 6,
      spacing: 3,
    })

    expect(outer + 6).toBe(44)
  })

  it('steps inward by a stroke plus the spacing for each ring', () => {
    const first = ringPathDiameter({ index: 0, diameter: 44, lineWidth: 6, spacing: 3 })
    const second = ringPathDiameter({ index: 1, diameter: 44, lineWidth: 6, spacing: 3 })

    expect(first - second).toBe((6 + 3) * 2)
  })

  it('never collapses to a non-positive diameter, however many rings are asked for', () => {
    expect(
      ringPathDiameter({ index: 9, diameter: 44, lineWidth: 6, spacing: 3 }),
    ).toBeGreaterThan(0)
  })
})

describe('what is drawn', () => {
  const both: ActivityRing[] = dayProgressRings({
    habits: { completed: 3, expected: 5 },
    tasks: { completed: 1, expected: 4 },
  })

  it('lays a faint track behind each arc, so a ring at zero still reads as a ring', () => {
    render(<ActivityRings rings={dayProgressRings({ tasks: { completed: 0, expected: 4 } })} />)

    const track = document.querySelector('[data-kro-ring-track]') as SVGCircleElement
    expect(track.getAttribute('stroke-opacity')).toBe('0.22')
    expect(track.getAttribute('stroke')).toBe('var(--kro-color-ring-emerald)')
  })

  it('starts the sweep at 12 o`clock, not at 3', () => {
    render(<ActivityRings rings={both} />)

    expect(groups()[0]?.getAttribute('transform')).toBe('rotate(-90 22 22)')
  })

  it('closes the arc completely when everything is done', () => {
    render(
      <ActivityRings
        rings={dayProgressRings({ tasks: { completed: 4, expected: 4 } })}
      />,
    )

    expect(arcs()[0]?.getAttribute('stroke-dashoffset')).toBe('0')
  })

  it('paints token roles, so the ring colours flip with the theme', () => {
    render(<ActivityRings rings={both} />)

    expect(arcs()[0]?.getAttribute('stroke')).toBe('var(--kro-color-ring-gold)')
    expect(arcs()[1]?.getAttribute('stroke')).toBe('var(--kro-color-ring-emerald)')
  })

  it('announces both rings as one image, not as two unlabelled shapes', () => {
    render(<ActivityRings rings={both} />)

    expect(
      screen.getByRole('img', { name: 'Habits, 3 of 5 complete, Tasks, 1 of 4 complete' }),
    ).toBeDefined()
  })

  it('is hidden outright when there is nothing to announce', () => {
    render(<ActivityRings rings={[]} />)

    const svg = document.querySelector('svg') as SVGElement
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('sweeps to a new value rather than snapping, when motion is not reduced', () => {
    render(<ActivityRings rings={both} />)

    // jsdom reports no `prefers-reduced-motion`, so the transition is present.
    expect((arcs()[0] as SVGElement).style.transitionProperty).toBe('stroke-dashoffset')
  })

  it('takes the new value straight away under reduced motion', () => {
    // The user has Reduce Motion on: completing a task must move the arc, but
    // it must not sweep there.
    const stub = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
    vi.stubGlobal('matchMedia', stub)

    render(<ActivityRings rings={both} />)

    expect((arcs()[0] as SVGElement).style.transitionProperty).toBe('')
    // The arc is still drawn at its real value — reduced motion drops the
    // animation, never the information.
    expect(arcs()[0]?.getAttribute('data-kro-ring-progress')).toBe('0.6')

    vi.unstubAllGlobals()
  })
})
