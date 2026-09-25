/** SegmentedControl — render tests mirroring its gallery's three scenes. */
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SegmentedControl } from './SegmentedControl'

afterEach(cleanup)

const MODES = [
  { value: 'countdown', label: 'Pomodoro' },
  { value: 'stopwatch', label: 'Stopwatch' },
] as const

describe('SegmentedControl', () => {
  it('presses exactly the selected segment inside a labelled group', () => {
    render(
      <SegmentedControl
        label="Session mode"
        options={MODES}
        value="stopwatch"
        onChange={() => {}}
      />,
    )
    expect(screen.getByRole('group', { name: 'Session mode' })).toBeTruthy()
    expect(
      screen
        .getByRole('button', { name: 'Stopwatch' })
        .getAttribute('aria-pressed'),
    ).toBe('true')
    expect(
      screen
        .getByRole('button', { name: 'Pomodoro' })
        .getAttribute('aria-pressed'),
    ).toBe('false')
  })

  it('reports a new selection, and nothing for the one already selected', async () => {
    const onChange = vi.fn()
    render(
      <SegmentedControl
        label="Session mode"
        options={MODES}
        value="countdown"
        onChange={onChange}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Pomodoro' }))
    await userEvent.click(screen.getByRole('button', { name: 'Stopwatch' }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('stopwatch')
  })

  it('sizes compact by default and comfortable for touch', () => {
    const { container, rerender } = render(
      <SegmentedControl
        label="Mode"
        options={MODES}
        value="countdown"
        onChange={() => {}}
      />,
    )
    const button = () => screen.getByRole('button', { name: 'Pomodoro' })
    expect(container.firstElementChild?.getAttribute('data-kro-density')).toBe(
      'compact',
    )
    expect(button().style.padding).toBe('4px 10px')
    rerender(
      <SegmentedControl
        label="Mode"
        options={MODES}
        value="countdown"
        onChange={() => {}}
        density="comfortable"
      />,
    )
    expect(button().style.padding).toBe('8px 16px')
  })

  it('fills the selection with the foreground colour, or tinted glass when a tint is given', () => {
    const { rerender } = render(
      <SegmentedControl
        label="Mode"
        options={MODES}
        value="countdown"
        onChange={() => {}}
      />,
    )
    const selected = () => screen.getByRole('button', { name: 'Pomodoro' })
    expect(selected().style.background).toBe('var(--kro-color-fore)')
    expect(selected().style.color).toBe('var(--kro-color-back)')
    expect(selected().className).not.toContain('kro-glass')
    expect(
      screen.getByRole('button', { name: 'Stopwatch' }).style.background,
    ).toBe('')
    rerender(
      <SegmentedControl
        label="Mode"
        options={MODES}
        value="countdown"
        onChange={() => {}}
        selectionTint="green"
      />,
    )
    expect(selected().className).toContain('kro-glass--tinted')
    expect(selected().style.getPropertyValue('--kro-glass-tint')).toBe('green')
  })

  it('takes the compact radius on desktop and a capsule on touch', () => {
    const { rerender } = render(
      <SegmentedControl
        label="Mode"
        options={MODES}
        value="countdown"
        onChange={() => {}}
      />,
    )
    expect(
      screen.getByRole('button', { name: 'Pomodoro' }).style.borderRadius,
    ).toBe('var(--kro-radius-small)')
    rerender(
      <SegmentedControl
        label="Mode"
        options={MODES}
        value="countdown"
        onChange={() => {}}
        density="comfortable"
      />,
    )
    expect(
      screen.getByRole('button', { name: 'Pomodoro' }).style.borderRadius,
    ).toBe('var(--kro-radius-pill)')
  })

  it('dims and disables every segment while disabled', () => {
    render(
      <SegmentedControl
        label="Mode"
        options={MODES}
        value="countdown"
        onChange={() => {}}
        disabled
      />,
    )
    expect(screen.getByRole('group', { name: 'Mode' }).style.opacity).toBe(
      '0.5',
    )
    for (const button of screen.getAllByRole('button')) {
      expect((button as HTMLButtonElement).disabled).toBe(true)
    }
  })
})
