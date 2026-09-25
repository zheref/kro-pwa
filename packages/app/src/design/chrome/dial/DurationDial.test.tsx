import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_DIAMETER,
  DEFAULT_DURATION_PRESETS,
  DEFAULT_MAX_SECONDS,
  DurationDial,
  TICK_RING_WIDTH,
  angleFromCentre,
  coveredWedgePath,
  durationForAngle,
  formatDigital,
} from './DurationDial'

afterEach(cleanup)

const dial = () => screen.getByRole('slider', { name: 'Session duration' })

describe('the readout — canon`s formatDigital', () => {
  it('shows a 25-minute pomodoro as 25:00', () => {
    expect(formatDigital(25 * 60)).toBe('25:00')
  })

  it('pads both halves, so 5 minutes 6 seconds is 05:06', () => {
    expect(formatDigital(5 * 60 + 6)).toBe('05:06')
  })

  it('never shows a negative time', () => {
    expect(formatDigital(-90)).toBe('00:00')
  })

  it('keeps counting past the hour rather than wrapping — a 90-minute session is 90:00', () => {
    expect(formatDigital(90 * 60)).toBe('90:00')
  })
})

describe('the drag maths, without a pointer', () => {
  it('reads 12 o`clock as zero', () => {
    expect(angleFromCentre(0, -50)).toBe(0)
  })

  it('reads 3 o`clock as a quarter turn', () => {
    expect(angleFromCentre(50, 0)).toBe(90)
  })

  it('reads 9 o`clock as three quarters, not as minus a quarter', () => {
    expect(angleFromCentre(-50, 0)).toBe(270)
  })

  it('quantises a drag to whole minutes — canon`s stepSize', () => {
    const seconds = durationForAngle({
      degrees: 91,
      maxSeconds: DEFAULT_MAX_SECONDS,
      stepSeconds: 60,
    })

    expect(seconds % 60).toBe(0)
    expect(seconds).toBe(15 * 60)
  })

  it('wraps a full turn back to the start rather than running past the maximum', () => {
    expect(
      durationForAngle({
        degrees: 360,
        maxSeconds: DEFAULT_MAX_SECONDS,
        stepSeconds: 60,
      }),
    ).toBe(0)
  })
})

describe('keyboard operability', () => {
  it('is focusable and announces itself as a slider with its value in minutes', async () => {
    render(<DurationDial seconds={25 * 60} />)

    await userEvent.tab()

    const slider = dial()
    expect(document.activeElement).toBe(slider)
    expect(slider.getAttribute('aria-valuenow')).toBe(String(25 * 60))
    expect(slider.getAttribute('aria-valuetext')).toBe('25 minutes')
    expect(slider.getAttribute('aria-valuemax')).toBe(
      String(DEFAULT_MAX_SECONDS),
    )
  })

  it('steps up a minute on ArrowUp and ArrowRight', async () => {
    const onChange = vi.fn()
    render(<DurationDial seconds={25 * 60} onChange={onChange} />)

    dial().focus()
    await userEvent.keyboard('{ArrowUp}')
    expect(onChange).toHaveBeenLastCalledWith(26 * 60)

    await userEvent.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenLastCalledWith(26 * 60)
  })

  it('steps down a minute on ArrowDown and ArrowLeft', async () => {
    const onChange = vi.fn()
    render(<DurationDial seconds={25 * 60} onChange={onChange} />)

    dial().focus()
    await userEvent.keyboard('{ArrowDown}')

    expect(onChange).toHaveBeenLastCalledWith(24 * 60)
  })

  it('moves five minutes at a time on Page Up and Page Down', async () => {
    const onChange = vi.fn()
    render(<DurationDial seconds={25 * 60} onChange={onChange} />)

    dial().focus()
    await userEvent.keyboard('{PageUp}')

    expect(onChange).toHaveBeenLastCalledWith(30 * 60)
  })

  it('jumps to the ends on Home and End', async () => {
    const onChange = vi.fn()
    render(<DurationDial seconds={25 * 60} onChange={onChange} />)

    dial().focus()
    await userEvent.keyboard('{Home}')
    expect(onChange).toHaveBeenLastCalledWith(0)

    await userEvent.keyboard('{End}')
    expect(onChange).toHaveBeenLastCalledWith(DEFAULT_MAX_SECONDS)
  })

  it('does not step below zero or past the dial`s own range', async () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <DurationDial seconds={0} onChange={onChange} />,
    )

    dial().focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(onChange).toHaveBeenLastCalledWith(0)

    rerender(<DurationDial seconds={DEFAULT_MAX_SECONDS} onChange={onChange} />)
    dial().focus()
    await userEvent.keyboard('{ArrowUp}')
    expect(onChange).toHaveBeenLastCalledWith(DEFAULT_MAX_SECONDS)
  })
})

describe('the preset pills', () => {
  it('offers canon`s six presets', () => {
    render(<DurationDial seconds={25 * 60} />)

    expect(DEFAULT_DURATION_PRESETS).toEqual([15, 20, 25, 45, 60, 90])
    for (const preset of DEFAULT_DURATION_PRESETS) {
      expect(screen.getByRole('button', { name: `${preset}m` })).toBeDefined()
    }
  })

  it('is focusable and choosable from the keyboard alone', async () => {
    const onChange = vi.fn()
    render(<DurationDial seconds={25 * 60} onChange={onChange} />)

    const pill = screen.getByRole('button', { name: '45m' })
    pill.focus()
    await userEvent.keyboard('{Enter}')

    expect(onChange).toHaveBeenCalledWith(45 * 60)
  })

  it('marks the pill that matches the current duration as pressed', () => {
    render(<DurationDial seconds={25 * 60} />)

    expect(
      screen.getByRole('button', { name: '25m' }).getAttribute('aria-pressed'),
    ).toBe('true')
    expect(
      screen.getByRole('button', { name: '45m' }).getAttribute('aria-pressed'),
    ).toBe('false')
  })

  it('marks none when the duration sits between two presets', () => {
    render(<DurationDial seconds={33 * 60} />)

    for (const preset of DEFAULT_DURATION_PRESETS) {
      expect(
        screen
          .getByRole('button', { name: `${preset}m` })
          .getAttribute('aria-pressed'),
      ).toBe('false')
    }
  })

  it('meets the 44px touch floor on every pill', () => {
    render(<DurationDial seconds={25 * 60} />)

    for (const preset of DEFAULT_DURATION_PRESETS) {
      expect(
        screen.getByRole('button', { name: `${preset}m` }).style.minHeight,
      ).toBe('var(--kro-size-min-touch-target)')
    }
  })
})

describe('the 90-minute preset does not fit the 60-minute dial — canon`s own tension', () => {
  it('reads the arc as full while the readout keeps telling the truth', () => {
    render(<DurationDial seconds={90 * 60} />)

    // The value is honest…
    expect(dial().getAttribute('aria-valuenow')).toBe(String(90 * 60))
    expect(screen.getByText('90:00')).toBeDefined()
    // …and the ring is closed rather than wrapped round a second time.
    const wedge = document.querySelector(
      '[data-kro-dial-ticks] clipPath path',
    ) as SVGPathElement
    // A full ratio clips to the whole box, not a wedge that wraps twice.
    expect(wedge.getAttribute('d')).toBe(
      `M 0 0 H ${DEFAULT_DIAMETER} V ${DEFAULT_DIAMETER} H 0 Z`,
    )
  })

  it('lets a caller widen the sweep when it wants the arc to track a long session', () => {
    render(<DurationDial seconds={45 * 60} maxSeconds={90 * 60} />)

    expect(dial().getAttribute('aria-valuemax')).toBe(String(90 * 60))
  })
})

describe('read-only, canon`s init(staticDuration:)', () => {
  it('is out of the tab order and refuses a keyboard change', async () => {
    const onChange = vi.fn()
    render(<DurationDial seconds={15 * 60} onChange={onChange} readOnly />)

    const slider = dial()
    expect(slider.getAttribute('tabindex')).toBe('-1')
    expect(slider.getAttribute('aria-readonly')).toBe('true')

    slider.focus()
    await userEvent.keyboard('{ArrowUp}')

    expect(onChange).not.toHaveBeenCalled()
  })

  it('still shows the duration it was given', () => {
    render(<DurationDial seconds={15 * 60} readOnly />)

    expect(screen.getByText('15:00')).toBeDefined()
  })
})

describe('the tick ring and the readout', () => {
  it('draws the ticks as antialiased SVG strokes, 60 round the dial', () => {
    render(<DurationDial seconds={25 * 60} />)
    const svg = document.querySelector('[data-kro-dial-ticks]') as SVGElement
    expect(svg.tagName.toLowerCase()).toBe('svg')
    expect(svg.getAttribute('shape-rendering')).toBe('geometricPrecision')
    const [base] = Array.from(svg.querySelectorAll('circle'))
    const [dash, gap] = (base?.getAttribute('stroke-dasharray') ?? '')
      .split(' ')
      .map(Number)
    const radius = (DEFAULT_DIAMETER - TICK_RING_WIDTH) / 2
    expect((dash ?? 0) + (gap ?? 0)).toBeCloseTo((2 * Math.PI * radius) / 60)
  })

  it('clips the covered ticks to the covered wedge, and draws none at zero', () => {
    const { rerender } = render(<DurationDial seconds={15 * 60} />)
    expect(
      document.querySelectorAll('[data-kro-dial-ticks] circle'),
    ).toHaveLength(2)
    expect(coveredWedgePath(90, 180, 0.25)).toContain(
      'A 180 180 0 0 1 270.000 90.000',
    )
    rerender(<DurationDial seconds={0} />)
    expect(
      document.querySelectorAll('[data-kro-dial-ticks] circle'),
    ).toHaveLength(1)
  })

  it('sets a monospaced readout at a scale, as the session dial does', () => {
    render(
      <DurationDial
        seconds={25 * 60}
        readoutDesign="monospaced"
        readoutScale={0.88}
        diameter={164}
      />,
    )
    const readout = document.querySelector(
      '[data-kro-dial-readout]',
    ) as HTMLElement
    expect(readout.style.fontFamily).toContain('monospace')
    expect(readout.style.fontSize).toBe('30px')
    expect(dial().style.width).toBe('164px')
  })
})

describe('the covered ticks meet the covered disc', () => {
  it('clips a group, not the rotated circle, so the wedge starts at twelve', () => {
    render(<DurationDial seconds={15 * 60} />)
    const covered = document.querySelector(
      '[data-kro-dial-covered]',
    ) as SVGGElement
    expect(covered.tagName.toLowerCase()).toBe('g')
    expect(covered.getAttribute('clip-path')).toMatch(/^url\(#/)
    const circle = covered.querySelector('circle') as SVGCircleElement
    // The rotation stays on the circle; the clip is outside it.
    expect(circle.getAttribute('clip-path')).toBeNull()
    expect(circle.getAttribute('transform')).toContain('rotate(-90')
  })

  it('sweeps the disc and the ticks through the same angle', () => {
    render(<DurationDial seconds={15 * 60} />)
    const fill = document.querySelector('[data-kro-dial-fill]') as HTMLElement
    // A quarter of the hour: the disc's covered stop is 90deg…
    expect(fill.style.background).toContain('90deg')
    // …and the ticks' wedge ends at three o'clock (a quarter turn from twelve).
    const wedge = document.querySelector('[data-kro-dial-ticks] clipPath path')
    expect(wedge?.getAttribute('d')).toContain(
      `${90 + DEFAULT_DIAMETER}.000 90.000`,
    )
  })

  it('draws no covered ticks at zero', () => {
    render(<DurationDial seconds={0} />)
    expect(document.querySelector('[data-kro-dial-covered]')).toBeNull()
  })
})
