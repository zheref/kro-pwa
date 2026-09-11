import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ComboBox } from './ComboBox'

afterEach(cleanup)

const ENDEAVORS = [
  'Write the launch note',
  'Morning focus session',
  'Plan the week',
  'Earn a break',
] as const

describe('ComboBox', () => {
  it('filters endeavor titles as the person types', async () => {
    render(
      <ComboBox
        label="Find an endeavor"
        options={ENDEAVORS}
        placeholder="Start typing a title"
      />,
    )

    const field = screen.getByRole('combobox', { name: 'Find an endeavor' })
    await userEvent.click(field)
    expect(screen.getByRole('listbox')).toBeTruthy()
    expect(screen.getAllByRole('option')).toHaveLength(4)

    await userEvent.type(field, 'plan')

    expect(screen.getAllByRole('option')).toHaveLength(1)
    expect(screen.getByRole('option', { name: 'Plan the week' })).toBeTruthy()
  })

  it('picks a suggestion with the keyboard and closes the list', async () => {
    const onValueChange = vi.fn()
    render(
      <ComboBox
        label="Find an endeavor"
        options={ENDEAVORS}
        onValueChange={onValueChange}
      />,
    )

    const field = screen.getByRole<HTMLInputElement>('combobox', {
      name: 'Find an endeavor',
    })
    await userEvent.click(field)
    await userEvent.keyboard('{ArrowDown}{Enter}')

    expect(onValueChange).toHaveBeenCalledWith('Morning focus session')
    expect(field.value).toBe('Morning focus session')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('closes on Escape without changing the typed title', async () => {
    const onValueChange = vi.fn()
    render(
      <ComboBox
        label="Find an endeavor"
        options={ENDEAVORS}
        onValueChange={onValueChange}
      />,
    )

    const field = screen.getByRole<HTMLInputElement>('combobox', {
      name: 'Find an endeavor',
    })
    await userEvent.click(field)
    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('listbox')).toBeNull()
    expect(field.value).toBe('')
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('picks a suggestion on click and keeps a value that is not on the list', async () => {
    const onValueChange = vi.fn()
    render(
      <ComboBox
        label="Find an endeavor"
        options={ENDEAVORS}
        onValueChange={onValueChange}
      />,
    )

    const field = screen.getByRole<HTMLInputElement>('combobox', {
      name: 'Find an endeavor',
    })
    await userEvent.click(field)
    await userEvent.click(screen.getByRole('option', { name: 'Earn a break' }))

    expect(onValueChange).toHaveBeenCalledWith('Earn a break')
    expect(field.value).toBe('Earn a break')

    await userEvent.clear(field)
    await userEvent.type(field, 'Inbox triage')

    expect(field.value).toBe('Inbox triage')
    expect(onValueChange).toHaveBeenLastCalledWith('Inbox triage')
  })

  it('defaults to compact and grows suggestion rows for comfortable', async () => {
    const { rerender } = render(
      <ComboBox label="Find an endeavor" options={ENDEAVORS} />,
    )
    const field = screen.getByRole('combobox', { name: 'Find an endeavor' })
    expect(field.getAttribute('data-density')).toBe('compact')
    await userEvent.click(field)
    expect(screen.getAllByRole('option')[0]?.className).toContain('min-h-6')

    rerender(
      <ComboBox
        label="Find an endeavor"
        options={ENDEAVORS}
        density="comfortable"
      />,
    )
    const comfortable = screen.getByRole('combobox', {
      name: 'Find an endeavor',
    })
    expect(comfortable.getAttribute('data-density')).toBe('comfortable')
    await userEvent.click(comfortable)
    expect(screen.getAllByRole('option')[0]?.className).toContain('min-h-9')
  })

  it('does not open when disabled', async () => {
    render(<ComboBox label="Find an endeavor" options={ENDEAVORS} disabled />)

    await userEvent.click(
      screen.getByRole('combobox', { name: 'Find an endeavor' }),
    )

    expect(screen.queryByRole('listbox')).toBeNull()
  })
})
