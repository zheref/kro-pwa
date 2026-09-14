import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Picker } from './Picker'

afterEach(cleanup)

const QUADRANTS = [
  { value: 'prioritize', label: 'Prioritize' },
  { value: 'decide', label: 'Schedule' },
  { value: 'delegate', label: 'Delegate' },
  { value: 'delete', label: 'Archive' },
] as const

describe('Picker', () => {
  it('uses a native date field for a due date', () => {
    render(<Picker kind="date" label="Due date" defaultValue="2026-09-09" />)

    const field = screen.getByLabelText<HTMLInputElement>('Due date')
    expect(field.getAttribute('type')).toBe('date')
    expect(field.value).toBe('2026-09-09')
  })

  it('uses a native time field for a session start', () => {
    const onValueChange = vi.fn()
    render(
      <Picker
        kind="time"
        label="Session starts"
        defaultValue="09:30"
        onValueChange={onValueChange}
      />,
    )

    const field = screen.getByLabelText<HTMLInputElement>('Session starts')
    expect(field.getAttribute('type')).toBe('time')
    fireEvent.change(field, { target: { value: '14:00' } })

    expect(onValueChange).toHaveBeenCalledWith('14:00')
    expect(field.value).toBe('14:00')
  })

  it('picks one quadrant from the list and leaves the others off', async () => {
    const onValueChange = vi.fn()
    render(
      <Picker
        kind="list"
        label="Quadrant"
        options={QUADRANTS}
        onValueChange={onValueChange}
      />,
    )

    await userEvent.click(screen.getByRole('radio', { name: 'Schedule' }))

    expect(onValueChange).toHaveBeenCalledWith('decide')
    expect(
      screen.getByRole<HTMLInputElement>('radio', { name: 'Schedule' }).checked,
    ).toBe(true)
    expect(
      screen.getByRole<HTMLInputElement>('radio', { name: 'Prioritize' })
        .checked,
    ).toBe(false)
  })

  it('defaults to compact and grows for comfortable', () => {
    const { rerender } = render(
      <Picker kind="date" label="Due date" defaultValue="2026-09-09" />,
    )
    expect(screen.getByLabelText('Due date').getAttribute('data-density')).toBe(
      'compact',
    )

    rerender(
      <Picker
        kind="list"
        label="Quadrant"
        options={QUADRANTS}
        defaultValue="prioritize"
      />,
    )
    const list = document.querySelector('[data-slot="picker"]')
    expect(list?.getAttribute('data-density')).toBe('compact')
    expect(
      screen.getByRole('radio', { name: 'Prioritize' }).parentElement
        ?.className,
    ).toContain('min-h-6')

    rerender(
      <Picker
        kind="list"
        label="Quadrant"
        options={QUADRANTS}
        defaultValue="prioritize"
        density="comfortable"
      />,
    )
    expect(
      document
        .querySelector('[data-slot="picker"]')
        ?.getAttribute('data-density'),
    ).toBe('comfortable')
    expect(
      screen.getByRole('radio', { name: 'Prioritize' }).parentElement
        ?.className,
    ).toContain('min-h-9')
  })

  it('does not change a disabled quadrant list', async () => {
    const onValueChange = vi.fn()
    render(
      <Picker
        kind="list"
        label="Quadrant"
        options={QUADRANTS}
        defaultValue="prioritize"
        disabled
        onValueChange={onValueChange}
      />,
    )

    await userEvent.click(screen.getByRole('radio', { name: 'Archive' }))

    expect(onValueChange).not.toHaveBeenCalled()
    expect(
      screen.getByRole<HTMLInputElement>('radio', { name: 'Prioritize' })
        .checked,
    ).toBe(true)
  })
})
