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
    expect(button().style.minHeight).toBe('var(--kro-size-min-pointer-target)')
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
    // Touch density clears the 44px touch target, not the pointer one.
    expect(button().style.minHeight).toBe('var(--kro-size-min-touch-target)')
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

  it('stays at full opacity while enabled', () => {
    render(
      <SegmentedControl
        label="Mode"
        options={MODES}
        value="countdown"
        onChange={() => {}}
      />,
    )
    expect(screen.getByRole('group', { name: 'Mode' }).className).not.toContain(
      'opacity-',
    )
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
    expect(screen.getByRole('group', { name: 'Mode' }).className).toContain(
      'opacity-[var(--kro-opacity-disabled)]',
    )
    // Dimmed once, on the group — never again per segment.
    for (const button of screen.getAllByRole('button')) {
      expect(button.style.opacity).toBe('')
    }
    for (const button of screen.getAllByRole('button')) {
      expect((button as HTMLButtonElement).disabled).toBe(true)
    }
  })

  it('draws a faint chord on each segment and names it for assistive tech', () => {
    render(
      <SegmentedControl
        label="Range"
        options={[
          {
            value: 'day',
            label: 'Day',
            shortcutHint: '⌥1',
            keyShortcuts: 'Alt+1',
          },
          {
            value: 'week',
            label: 'Week',
            shortcutHint: '⌥2',
            keyShortcuts: 'Alt+2',
          },
        ]}
        value="day"
        onChange={() => {}}
        revealShortcutHints={false}
      />,
    )
    const week = screen.getByRole('button', { name: /Week/ })
    expect(week.getAttribute('aria-keyshortcuts')).toBe('Alt+2')
    const hint = week.querySelector<HTMLElement>(
      '[data-slot="button-shortcut"]',
    )
    expect(hint?.textContent).toBe('⌥2')
    expect(hint?.getAttribute('data-revealed')).toBe('false')
  })
})

describe('SegmentedControl fill — a four-way control on a 320px phone (UX-7)', () => {
  const KINDS = [
    { value: 'task', label: 'Task', icon: <svg aria-hidden /> },
    { value: 'habit', label: 'Habit', icon: <svg aria-hidden /> },
    { value: 'event', label: 'Event', icon: <svg aria-hidden /> },
    { value: 'reminder', label: 'Reminder', icon: <svg aria-hidden /> },
  ] as const

  it('fills its width and shares it equally, each segment free to shrink', () => {
    render(
      <SegmentedControl
        label="Kind"
        options={KINDS}
        value="task"
        onChange={() => {}}
        density="comfortable"
        fill
      />,
    )
    const group = screen.getByRole('group', { name: 'Kind' })
    expect(group.className).toContain('w-full')
    expect(
      screen.getByRole('button', { name: 'Reminder' }).className,
    ).toContain('flex-1')
  })

  it('drops to icon-only below 24rem, the label kept for assistive tech', () => {
    render(
      <SegmentedControl
        label="Kind"
        options={KINDS}
        value="task"
        onChange={() => {}}
        fill
      />,
    )
    const label = screen
      .getByRole('button', { name: 'Reminder' })
      .querySelector('[data-slot="segment-label"]')
    expect(label?.className).toContain('@max-[24rem]:sr-only')
    expect(label?.className).toContain('truncate')
  })

  it('never hides the label of a segment with no icon, and leaves non-fill controls alone', () => {
    render(
      <SegmentedControl
        label="Session mode"
        options={MODES}
        value="stopwatch"
        onChange={() => {}}
        fill
      />,
    )
    expect(
      screen
        .getByRole('button', { name: 'Pomodoro' })
        .querySelector('[data-slot="segment-label"]')?.className,
    ).not.toContain('sr-only')
    cleanup()
    render(
      <SegmentedControl
        label="Session mode"
        options={MODES}
        value="stopwatch"
        onChange={() => {}}
      />,
    )
    expect(
      screen
        .getByRole('group', { name: 'Session mode' })
        .hasAttribute('data-kro-fill'),
    ).toBe(false)
  })
})
