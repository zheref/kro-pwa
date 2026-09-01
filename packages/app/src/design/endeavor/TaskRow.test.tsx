import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  MINUTES_PER_SESSION_POINT,
  TaskRow,
  completionLabel,
  sessionPointsCaption,
} from './TaskRow'
import type { TaskRowModel } from './TaskRow'

afterEach(cleanup)

const model: TaskRowModel = {
  id: 'clean',
  title: 'Clean the house',
  subline: 'Created on Apr 12, 2026',
  isCompleted: false,
  isOverdue: false,
  hostGlyphs: ['network'],
  duration: 45 * 60,
  sessionPoints: null,
  isBusy: false,
}

describe('sessionPointsCaption', () => {
  it('turns points into the minutes canon’s numeral glyphs encode', () => {
    expect(sessionPointsCaption(1)).toBe(`${MINUTES_PER_SESSION_POINT}m`)
    expect(sessionPointsCaption(2)).toBe('60m')
    expect(sessionPointsCaption(3)).toBe('90m')
  })

  it('switches to a multiplier past three, where canon’s glyph ladder runs out', () => {
    expect(sessionPointsCaption(6)).toBe('6 × 30m')
  })
})

describe('TaskRow', () => {
  it('raises completion from the checkbox, with the new value', async () => {
    const onToggle = vi.fn()
    render(<TaskRow model={model} onToggleComplete={onToggle} />)

    await userEvent.click(screen.getByRole('checkbox'))

    expect(onToggle).toHaveBeenCalledWith('clean', true)
  })

  it('reverses the label once the task is done', () => {
    const { rerender } = render(<TaskRow model={model} />)
    expect(screen.getByText('Mark Complete')).not.toBeNull()

    rerender(<TaskRow model={{ ...model, isCompleted: true }} />)
    expect(screen.getByText('Mark Incomplete')).not.toBeNull()
  })

  it('NAMES the checkbox without waiting for a hover — the keyboard never hovers', () => {
    // The visible "Mark Complete" text is `hidden` until `group-hover`, so
    // before this the input was an unnamed checkbox to assistive tech and to
    // anyone arriving by keyboard, with the title in a separate, unassociated
    // button.
    render(<TaskRow model={model} />)

    expect(
      screen.getByRole('checkbox', { name: 'Mark Clean the house complete' }),
    ).toBe(screen.getByRole('checkbox'))
  })

  it('flips that name with the state, so it always says what the click will do', () => {
    render(<TaskRow model={{ ...model, isCompleted: true }} />)

    expect(
      screen.getByRole('checkbox', { name: 'Mark Clean the house incomplete' }),
    ).not.toBeNull()
  })

  it('names the endeavor, because a row is one of many', () => {
    expect(
      completionLabel({ title: 'Clean the house', isCompleted: false }),
    ).toBe('Mark Clean the house complete')
    expect(
      completionLabel({ title: 'Clean the house', isCompleted: true }),
    ).toBe('Mark Clean the house incomplete')
    // Same shape as the Start button's name, so one row reads as one convention.
    expect(
      completionLabel({ title: '山田 太郎 🌸', isCompleted: false }),
    ).toContain('山田 太郎 🌸')
  })

  it('raises the start intent without also selecting the row', async () => {
    const onStart = vi.fn()
    const onSelect = vi.fn()
    render(<TaskRow model={model} onStart={onStart} onSelect={onSelect} />)

    await userEvent.click(
      screen.getByRole('button', { name: 'Start Clean the house' }),
    )

    expect(onStart).toHaveBeenCalledWith('clean')
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('gives selection a KEYBOARD route — the title is a real button', async () => {
    const onSelect = vi.fn()
    render(<TaskRow model={model} onSelect={onSelect} />)

    await userEvent.tab()
    await userEvent.tab()
    await userEvent.keyboard('{Enter}')

    expect(onSelect).toHaveBeenCalledWith('clean')
  })

  it('strikes a completed title through, so completion is not colour alone', () => {
    render(<TaskRow model={{ ...model, isCompleted: true }} />)

    expect(
      screen.getByRole('button', { name: 'Clean the house' }).className,
    ).toContain('line-through')
  })

  it('re-themes its subtree when selected, rather than inverting each child', () => {
    const { container } = render(<TaskRow model={model} isSelected />)

    const row = container.querySelector('[data-slot="task-row"]') as HTMLElement
    expect(row.dataset.theme).toBe('dark')
    // `absolute` resolves to black INSIDE the dark scope the row just declared,
    // which is canon's `Color.black` in either page scheme. `total` would
    // resolve to white there — the bug this assertion exists to catch.
    expect(row.style.backgroundColor).toBe('var(--kro-color-absolute)')
  })

  it('prints the duration when there is one and the points caption when there is not', () => {
    const { rerender } = render(<TaskRow model={model} />)
    expect(screen.getByText('45m')).not.toBeNull()

    rerender(<TaskRow model={{ ...model, duration: null, sessionPoints: 2 }} />)
    expect(screen.getByText('60m')).not.toBeNull()
  })

  it('announces in-flight work rather than only spinning at the user', () => {
    render(<TaskRow model={{ ...model, isBusy: true }} />)
    expect(screen.getByRole('progressbar', { name: 'Working' })).not.toBeNull()
  })

  it('sizes its controls to the 28px POINTER target — this row is desktop-only', () => {
    render(<TaskRow model={model} onStart={() => undefined} />)

    expect(
      screen.getByRole('button', { name: 'Start Clean the house' }).style
        .minWidth,
    ).toBe('var(--kro-size-min-pointer-target)')
  })
})
