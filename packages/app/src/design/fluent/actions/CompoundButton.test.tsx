import { Plus } from 'lucide-react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CompoundButton } from './CompoundButton'

afterEach(cleanup)

const DISABLED_FADE = 'disabled:opacity-[var(--kro-opacity-disabled)]'

describe('CompoundButton', () => {
  it('shows the title and the supporting line', () => {
    render(
      <CompoundButton secondaryContent="Opens today's plan">
        Start session
      </CompoundButton>,
    )

    const control = screen.getByRole('button', { name: /Start session/ })
    expect(control.getAttribute('data-slot')).toBe('compound-button')
    expect(control.textContent).toContain('Start session')
    expect(control.textContent).toContain("Opens today's plan")
    expect(screen.getByText("Opens today's plan").className).toContain(
      'text-kro-fore-secondary',
    )
  })

  it('calls its handler, and a leading icon sits with the title', async () => {
    const onClick = vi.fn()
    render(
      <CompoundButton
        icon={<Plus data-testid="leading-icon" />}
        secondaryContent="Adds a task for today"
        onClick={onClick}
      >
        Add task
      </CompoundButton>,
    )

    expect(screen.getByTestId('leading-icon')).toBeTruthy()
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not fire when disabled, and the fade lives on the control once', async () => {
    const onClick = vi.fn()
    render(
      <CompoundButton
        disabled
        secondaryContent="Opens today's plan"
        onClick={onClick}
      >
        Start session
      </CompoundButton>,
    )

    const control = screen.getByRole('button')
    await userEvent.click(control)
    expect(onClick).not.toHaveBeenCalled()
    const fades = control.className
      .split(/\s+/)
      .filter((token) => token === DISABLED_FADE)
    expect(fades).toHaveLength(1)
  })

  it('defaults to compact and grows for comfortable', () => {
    const { rerender } = render(
      <CompoundButton secondaryContent="Opens today's plan">
        Start session
      </CompoundButton>,
    )
    const compact = screen.getByRole('button')
    expect(compact.getAttribute('data-density')).toBe('compact')
    expect(compact.className).toContain('text-xs')

    rerender(
      <CompoundButton size="large" secondaryContent="Opens today's plan">
        Start session
      </CompoundButton>,
    )
    const comfortable = screen.getByRole('button')
    expect(comfortable.getAttribute('data-density')).toBe('comfortable')
    expect(comfortable.className).toContain('text-sm')
  })

  it('keeps supporting copy readable on a primary face', () => {
    render(
      <CompoundButton
        appearance="primary"
        secondaryContent="Opens today's plan"
      >
        Start session
      </CompoundButton>,
    )

    const secondary = screen.getByText("Opens today's plan")
    expect(secondary.className).toContain('text-kro-on-accent/80')
    expect(secondary.className).not.toContain('text-kro-fore-secondary')
  })
})
