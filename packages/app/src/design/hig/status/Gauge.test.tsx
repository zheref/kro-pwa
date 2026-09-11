import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Gauge, gaugeAccessibleName } from './Gauge'

afterEach(cleanup)

describe('Gauge', () => {
  it('requires the caption and the percentage in the accessible name', () => {
    render(<Gauge value={0.72} label="72%" caption="Daily focus" />)

    expect(gaugeAccessibleName('72%', 'Daily focus')).toBe('Daily focus, 72%')
    expect(screen.getByRole('img', { name: 'Daily focus, 72%' })).toBeTruthy()
    expect(screen.getByText('72%')).toBeTruthy()
    expect(screen.getByText('Daily focus')).toBeTruthy()
  })

  it('strokes the track and fill from tokens, never raw colours', () => {
    const { container } = render(
      <Gauge value={0.4} label="40%" caption="Habits closed" />,
    )

    expect(container.innerHTML).toContain('var(--kro-color-hairline)')
    expect(container.innerHTML).toContain('var(--kro-color-accent)')
  })

  it('clamps a value outside 0–1 so the arc cannot overflow', () => {
    const { container, rerender } = render(
      <Gauge value={2} label="100%" caption="Daily focus" />,
    )

    const fills = [...container.querySelectorAll('circle')].map(
      (circle) => circle.getAttribute('stroke-dasharray') ?? '',
    )
    const overflowed = fills[1]
    rerender(<Gauge value={1} label="100%" caption="Daily focus" />)
    const atOne = [...container.querySelectorAll('circle')].map(
      (circle) => circle.getAttribute('stroke-dasharray') ?? '',
    )[1]

    expect(overflowed).toBe(atOne)

    rerender(<Gauge value={Number.NaN} label="0%" caption="Daily focus" />)
    expect(screen.getByRole('img', { name: 'Daily focus, 0%' })).toBeTruthy()
  })

  it('defaults to compact type and grows for comfortable', () => {
    const { rerender } = render(
      <Gauge value={0.72} label="72%" caption="Daily focus" />,
    )
    const root = document.querySelector('[data-slot="gauge"]')
    expect(root?.getAttribute('data-density')).toBe('compact')
    expect(screen.getByText('Daily focus').className).toContain('text-xs')

    rerender(
      <Gauge
        value={0.72}
        label="72%"
        caption="Daily focus"
        density="comfortable"
      />,
    )
    expect(
      document
        .querySelector('[data-slot="gauge"]')
        ?.getAttribute('data-density'),
    ).toBe('comfortable')
    expect(screen.getByText('Daily focus').className).toContain('text-sm')
  })

  it('speaks the percentage alone when there is no caption', () => {
    expect(gaugeAccessibleName('72%')).toBe('72%')
    render(<Gauge value={0.72} label="72%" />)

    expect(screen.getByRole('img', { name: '72%' })).toBeTruthy()
    expect(screen.queryByText('Daily focus')).toBeNull()
  })
})
