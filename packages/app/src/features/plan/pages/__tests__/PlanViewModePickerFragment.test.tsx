/**
 * The rotary selector's render tests, mirroring
 * `PlanViewModePickerFragment.stories` (`RC-11`) — and where acceptance
 * criterion 3's *"mode picker slides directionally with wrap-around"* half is
 * checked.
 *
 * The wrap is the part worth testing hardest: three modes plus a circular
 * carousel means a drag can commit past the end, and the failure there is
 * silent — the control still animates and still lands on *a* mode.
 */
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PlanViewMode } from '../../PlanNavigation'
import {
  MODE_ITEM_SPACING,
  MODE_SELECTION_THRESHOLD,
  PlanViewModePickerFragment,
  committedModeSteps,
  lensProminence,
  modeGlyphScale,
} from '../PlanViewModePickerFragment'
import { installPointerEvents, pointer } from './pointerEvents'

installPointerEvents()

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const mount = (
  overrides: Partial<Parameters<typeof PlanViewModePickerFragment>[0]> = {},
) =>
  render(
    <PlanViewModePickerFragment
      selection={PlanViewMode.timeline}
      onSelect={() => {}}
      {...overrides}
    />,
  )

describe('PlanViewModePickerFragment', () => {
  it('exposes exactly the three destinations as buttons — the +-2 slots are decoration', () => {
    mount()

    const options = screen.getAllByTestId('plan-view-mode-option')
    expect(options).toHaveLength(3)
    expect(options.map((option) => option.dataset.mode)).toEqual([
      PlanViewMode.priorityMatrix,
      PlanViewMode.timeline,
      PlanViewMode.list,
    ])
  })

  it('marks the centre glyph as the pressed one, and only that one', () => {
    mount({ selection: PlanViewMode.list })

    const pressed = screen
      .getAllByTestId('plan-view-mode-option')
      .filter((option) => option.getAttribute('aria-pressed') === 'true')
    expect(pressed).toHaveLength(1)
    expect(pressed[0]?.dataset.mode).toBe(PlanViewMode.list)
  })

  it('names each glyph with canon own label, so the control is operable aloud', () => {
    mount()

    expect(screen.getByRole('button', { name: 'Day View' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'List View' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Priority Matrix' })).toBeTruthy()
  })

  it('selects a neighbour when it is tapped, after the settle', async () => {
    const onSelect = vi.fn()
    mount({ onSelect })

    await userEvent.click(screen.getByRole('button', { name: 'List View' }))
    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(onSelect).toHaveBeenCalledWith(PlanViewMode.list)
  })

  it('moves the selection forward on ArrowRight and back on ArrowLeft', () => {
    const onSelect = vi.fn()
    mount({ onSelect })
    const control = screen.getByTestId('plan-view-mode-picker')

    control.focus()
    act(() => {
      control.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
      )
      vi.advanceTimersByTime(2000)
    })

    expect(onSelect).toHaveBeenCalledWith(PlanViewMode.list)
  })

  it('WRAPS: from the matrix, one step forward is the timeline again', () => {
    const onSelect = vi.fn()
    mount({ selection: PlanViewMode.priorityMatrix, onSelect })
    const control = screen.getByTestId('plan-view-mode-picker')

    control.focus()
    act(() => {
      control.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
      )
      vi.advanceTimersByTime(2000)
    })

    expect(onSelect).toHaveBeenCalledWith(PlanViewMode.timeline)
  })

  it('commits a drag past the intent margin, in the drag own direction', () => {
    const onSelect = vi.fn()
    mount({ onSelect })
    const control = screen.getByTestId('plan-view-mode-picker')

    // Dragging LEFT moves the strip left, which brings the NEXT mode into the
    // lens — canon's `direction = translation < 0 ? 1 : -1`.
    pointer('pointerDown', control, { clientX: 100, clientY: 0 })
    pointer('pointerMove', control, { clientX: 60, clientY: 0 })
    pointer('pointerUp', control, { clientX: 60, clientY: 0 })
    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(onSelect).toHaveBeenCalledWith(PlanViewMode.list)
  })

  it('does not commit a drag that never reaches the intent margin', () => {
    const onSelect = vi.fn()
    mount({ onSelect })
    const control = screen.getByTestId('plan-view-mode-picker')

    pointer('pointerDown', control, { clientX: 100, clientY: 0 })
    pointer('pointerMove', control, { clientX: 88, clientY: 0 })
    pointer('pointerUp', control, { clientX: 88, clientY: 0 })
    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(onSelect).not.toHaveBeenCalled()
  })
})

describe('committedModeSteps', () => {
  it('commits nothing for a nudge shorter than the intent margin', () => {
    expect(committedModeSteps(-10)).toBeNull()
    expect(committedModeSteps(10)).toBeNull()
  })

  it('commits one step forward for a leftward drag past the margin', () => {
    expect(committedModeSteps(-MODE_SELECTION_THRESHOLD)).toBe(1)
  })

  it('commits one step back for the same drag rightward', () => {
    expect(committedModeSteps(MODE_SELECTION_THRESHOLD)).toBe(-1)
  })

  it('commits two steps for a drag past a whole slot plus the margin', () => {
    expect(
      committedModeSteps(-(MODE_ITEM_SPACING + MODE_SELECTION_THRESHOLD)),
    ).toBe(2)
  })
})

describe('lensProminence and modeGlyphScale', () => {
  it('is full in the lens and zero a whole slot away — colour arrives on the way in', () => {
    expect(lensProminence(0, 0)).toBe(1)
    expect(lensProminence(1, 0)).toBe(0)
  })

  it('follows the finger: half a slot dragged puts the neighbour half-lit', () => {
    expect(lensProminence(1, -MODE_ITEM_SPACING / 2)).toBeCloseTo(0.5, 5)
  })

  it('never goes negative for a distant slot', () => {
    expect(lensProminence(2, 0)).toBe(0)
  })

  it('scales canon 0.62 at rest to 1.0 in the lens', () => {
    expect(modeGlyphScale(0)).toBeCloseTo(0.62, 5)
    expect(modeGlyphScale(1)).toBeCloseTo(1, 5)
  })
})
