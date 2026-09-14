import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ToggleButton } from './ToggleButton'

afterEach(cleanup)

const DISABLED_FADE = 'disabled:opacity-[var(--kro-opacity-disabled)]'

describe('ToggleButton', () => {
  it('starts off as a button and announces pressed state', () => {
    render(<ToggleButton>Bold</ToggleButton>)

    const control = screen.getByRole('button', { name: 'Bold' })
    expect(control.getAttribute('data-slot')).toBe('toggle-button')
    expect(control.getAttribute('aria-pressed')).toBe('false')
    expect(control.getAttribute('data-checked')).toBe('false')
    expect(control.className).not.toContain('kro-glass--pressed')
  })

  it('stays pressed and reports the new value', async () => {
    const onCheckedChange = vi.fn()
    render(<ToggleButton onCheckedChange={onCheckedChange}>Bold</ToggleButton>)

    await userEvent.click(screen.getByRole('button'))

    const control = screen.getByRole('button', { name: 'Bold' })
    expect(control.getAttribute('aria-pressed')).toBe('true')
    expect(control.className).toContain('kro-glass--pressed')
    expect(onCheckedChange).toHaveBeenCalledOnce()
    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })

  it('does not fire when disabled, and the fade lives on the control once', async () => {
    const onCheckedChange = vi.fn()
    render(
      <ToggleButton disabled onCheckedChange={onCheckedChange}>
        Bold
      </ToggleButton>,
    )

    await userEvent.click(screen.getByRole('button'))

    expect(onCheckedChange).not.toHaveBeenCalled()
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe(
      'false',
    )
    const fades = screen
      .getByRole('button')
      .className.split(/\s+/)
      .filter((token) => token === DISABLED_FADE)
    expect(fades).toHaveLength(1)
  })

  it('stays controlled when a caller passes `checked`', async () => {
    const onCheckedChange = vi.fn()
    render(
      <ToggleButton checked={false} onCheckedChange={onCheckedChange}>
        Bold
      </ToggleButton>,
    )

    await userEvent.click(screen.getByRole('button'))

    expect(onCheckedChange).toHaveBeenCalledWith(true)
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe(
      'false',
    )
    expect(screen.getByRole('button').className).not.toContain(
      'kro-glass--pressed',
    )
  })

  it('honours defaultChecked without becoming controlled', async () => {
    const onCheckedChange = vi.fn()
    render(
      <ToggleButton defaultChecked onCheckedChange={onCheckedChange}>
        Bold
      </ToggleButton>,
    )

    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('true')
    await userEvent.click(screen.getByRole('button'))
    expect(onCheckedChange).toHaveBeenCalledWith(false)
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe(
      'false',
    )
  })

  it('does not toggle when the click is cancelled', async () => {
    const onCheckedChange = vi.fn()
    render(
      <ToggleButton
        onCheckedChange={onCheckedChange}
        onClick={(event) => event.preventDefault()}
      >
        Bold
      </ToggleButton>,
    )

    await userEvent.click(screen.getByRole('button'))
    expect(onCheckedChange).not.toHaveBeenCalled()
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe(
      'false',
    )
  })

  it('defaults to compact and grows for comfortable', () => {
    const { rerender } = render(<ToggleButton>Bold</ToggleButton>)
    const compact = screen.getByRole('button')
    expect(compact.getAttribute('data-density')).toBe('compact')
    expect(compact.className).toContain('h-6')

    rerender(<ToggleButton size="large">Bold</ToggleButton>)
    const comfortable = screen.getByRole('button')
    expect(comfortable.getAttribute('data-density')).toBe('comfortable')
    expect(comfortable.className).toContain('h-9')
  })
})
