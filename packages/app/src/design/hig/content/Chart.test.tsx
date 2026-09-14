import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Chart, chartSpokenName } from './Chart'

afterEach(cleanup)

const WEEK = [
  { label: 'Focus', value: 4, tone: 'accent' as const },
  { label: 'Habits', value: 2, tone: 'kind-habit' as const },
  { label: 'Events', value: 1, tone: 'kind-event' as const },
]

describe('Chart', () => {
  it('speaks every figure so colour is not the only signal', () => {
    render(<Chart values={WEEK} unit="hours" />)

    expect(
      screen.getByRole('img', {
        name: 'Focus 4 hours, Habits 2 hours, Events 1 hours',
      }),
    ).toBeTruthy()
    expect(chartSpokenName(WEEK, 'hours')).toBe(
      'Focus 4 hours, Habits 2 hours, Events 1 hours',
    )
  })

  it('draws each amount as text beside the track', () => {
    render(<Chart values={WEEK} unit="h" />)

    expect(screen.getByText('Focus')).toBeTruthy()
    expect(screen.getByText('4 h')).toBeTruthy()
    expect(screen.getByText('2 h')).toBeTruthy()
    expect(screen.getByText('1 h')).toBeTruthy()
  })

  it('sizes the fill against the largest value, and stays empty when every value is zero', () => {
    const { container, rerender } = render(<Chart values={WEEK} />)

    const fills = container.querySelectorAll('[style]')
    const widths = [...fills].map((node) => (node as HTMLElement).style.width)
    expect(widths).toContain('100%')
    expect(widths).toContain('50%')
    expect(widths).toContain('25%')

    rerender(
      <Chart
        values={[
          { label: 'Focus', value: 0 },
          { label: 'Habits', value: 0 },
        ]}
      />,
    )

    const zeroFills = container.querySelectorAll('[style]')
    for (const node of zeroFills) {
      expect((node as HTMLElement).style.width).toBe('0%')
    }
  })

  it('paints kind tones from tokens, not raw colours', () => {
    const { container } = render(
      <Chart
        values={[
          { label: 'Write the port', value: 3, tone: 'kind-task' },
          { label: 'Morning walk', value: 1, tone: 'kind-habit' },
        ]}
      />,
    )

    expect(container.innerHTML).toContain('bg-kro-kind-task')
    expect(container.innerHTML).toContain('bg-kro-kind-habit')
    expect(container.innerHTML).toContain('bg-kro-back-inner')
    expect(container.innerHTML).toContain('rounded-kro-pill')
  })

  it('treats a non-finite value as empty so a NaN cannot blow the bar', () => {
    render(<Chart values={[{ label: 'Focus', value: Number.NaN }]} unit="h" />)

    expect(screen.getByRole('img', { name: 'Focus 0 h' })).toBeTruthy()
    expect(screen.getByText('0 h')).toBeTruthy()
  })

  it('defaults to compact type and grows for comfortable', () => {
    const { rerender } = render(<Chart values={WEEK} />)

    const chart = document.querySelector('[data-slot="chart"]')
    expect(chart?.getAttribute('data-density')).toBe('compact')
    expect(screen.getByText('Focus').className).toContain('text-xs')

    rerender(<Chart values={WEEK} density="comfortable" />)
    expect(
      document
        .querySelector('[data-slot="chart"]')
        ?.getAttribute('data-density'),
    ).toBe('comfortable')
    expect(screen.getByText('Focus').className).toContain('text-sm')
  })
})
