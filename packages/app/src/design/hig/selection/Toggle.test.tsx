import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Toggle } from './Toggle'

afterEach(cleanup)

describe('Toggle', () => {
  it('starts off and announces itself as a switch', () => {
    render(<Toggle aria-label="Reminders" />)

    const control = screen.getByRole('switch', { name: 'Reminders' })
    expect(control.getAttribute('aria-checked')).toBe('false')
    expect(control.getAttribute('data-checked')).toBe('false')
  })

  it('slides on when pressed and reports the new value', async () => {
    const onCheckedChange = vi.fn()
    render(<Toggle aria-label="Reminders" onCheckedChange={onCheckedChange} />)

    await userEvent.click(screen.getByRole('switch'))

    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true')
    expect(onCheckedChange).toHaveBeenCalledOnce()
    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })

  it('does not fire when disabled, and the fade lives on the control once', async () => {
    const onCheckedChange = vi.fn()
    render(
      <Toggle
        aria-label="Reminders"
        disabled
        onCheckedChange={onCheckedChange}
      />,
    )

    await userEvent.click(screen.getByRole('switch'))

    expect(onCheckedChange).not.toHaveBeenCalled()
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe(
      'false',
    )
    expect(screen.getByRole('switch').className).toContain('kro-hig-toggle')
    expect(screen.getByRole('switch').className).toContain('kro-glass')
  })

  it('defaults to compact and grows for comfortable', () => {
    const { rerender } = render(<Toggle aria-label="Reminders" />)
    expect(screen.getByRole('switch').getAttribute('data-density')).toBe(
      'compact',
    )

    rerender(<Toggle aria-label="Reminders" density="comfortable" />)
    expect(screen.getByRole('switch').getAttribute('data-density')).toBe(
      'comfortable',
    )
  })

  it('honours a visible label without losing the accessible name', async () => {
    render(<Toggle label="Complete with session" />)

    expect(
      screen.getByRole('switch', { name: 'Complete with session' }),
    ).toBeTruthy()
    await userEvent.click(screen.getByText('Complete with session'))
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true')
  })

  it('stays controlled when a caller passes `checked`', async () => {
    const onCheckedChange = vi.fn()
    render(
      <Toggle
        aria-label="Reminders"
        checked={false}
        onCheckedChange={onCheckedChange}
      />,
    )

    await userEvent.click(screen.getByRole('switch'))

    expect(onCheckedChange).toHaveBeenCalledWith(true)
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe(
      'false',
    )
  })
})
