import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ScrollView } from './ScrollView'

afterEach(cleanup)

describe('ScrollView', () => {
  it('is a focusable region so a keyboard user can scroll it', () => {
    render(
      <ScrollView aria-label="Today's endeavors">
        <p>Inbox triage</p>
      </ScrollView>,
    )

    const region = screen.getByRole('region', { name: "Today's endeavors" })
    expect(region.getAttribute('tabindex')).toBe('0')
    expect(region.className).toContain('min-h-0')
    expect(region.getAttribute('data-axis')).toBe('vertical')
  })

  it('clips on the vertical axis by default', () => {
    render(
      <ScrollView aria-label="Sessions">
        <p>Deep work</p>
      </ScrollView>,
    )

    const region = screen.getByRole('region')
    expect(region.className).toContain('overflow-y-auto')
    expect(region.className).toContain('overflow-x-hidden')
  })

  it('can scroll horizontally or on both axes', () => {
    const { rerender } = render(
      <ScrollView axis="horizontal" aria-label="Lanes">
        <p>Plan</p>
      </ScrollView>,
    )

    expect(screen.getByRole('region').className).toContain('overflow-x-auto')
    expect(screen.getByRole('region').className).toContain('overflow-y-hidden')

    rerender(
      <ScrollView axis="both" aria-label="Lanes">
        <p>Do</p>
      </ScrollView>,
    )
    expect(screen.getByRole('region').className).toContain('overflow-auto')
  })

  it('defaults to compact type and grows for comfortable', () => {
    const { rerender } = render(
      <ScrollView aria-label="Sessions">
        <p>Deep work</p>
      </ScrollView>,
    )

    const region = screen.getByRole('region')
    expect(region.getAttribute('data-density')).toBe('compact')
    expect(region.className).toContain('text-xs')

    rerender(
      <ScrollView aria-label="Sessions" density="comfortable">
        <p>Deep work</p>
      </ScrollView>,
    )
    expect(screen.getByRole('region').getAttribute('data-density')).toBe(
      'comfortable',
    )
    expect(screen.getByRole('region').className).toContain('text-sm')
  })
})
