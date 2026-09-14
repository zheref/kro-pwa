import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TagPicker } from './TagPicker'

afterEach(cleanup)

const LENSES = ['Work', 'Home', 'Health', 'Deep work'] as const

describe('TagPicker', () => {
  it('filters unused options as the person types', async () => {
    render(
      <TagPicker label="Lenses" options={LENSES} placeholder="Add a lens" />,
    )

    const field = screen.getByRole('combobox', { name: 'Lenses' })
    expect(document.querySelector('[data-slot="tag-picker"]')).toBeTruthy()
    await userEvent.click(field)
    expect(screen.getByRole('listbox')).toBeTruthy()
    expect(screen.getAllByRole('option')).toHaveLength(4)

    await userEvent.type(field, 'work')
    expect(screen.getAllByRole('option')).toHaveLength(2)
    expect(screen.getByRole('option', { name: 'Work' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Deep work' })).toBeTruthy()
  })

  it('picks a tag, hides it from the list, and removes it by name', async () => {
    const onValueChange = vi.fn()
    render(
      <TagPicker
        label="Lenses"
        options={LENSES}
        onValueChange={onValueChange}
      />,
    )

    const field = screen.getByRole<HTMLInputElement>('combobox', {
      name: 'Lenses',
    })
    await userEvent.click(field)
    await userEvent.click(screen.getByRole('option', { name: 'Home' }))

    expect(onValueChange).toHaveBeenCalledWith(['Home'])
    expect(field.value).toBe('')
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(screen.getByRole('button', { name: 'Remove Home' })).toBeTruthy()

    await userEvent.click(field)
    expect(screen.queryByRole('option', { name: 'Home' })).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Remove Home' }))
    expect(onValueChange).toHaveBeenLastCalledWith([])
    expect(screen.queryByRole('button', { name: 'Remove Home' })).toBeNull()
  })

  it('picks with the keyboard and closes on Escape without adding', async () => {
    const onValueChange = vi.fn()
    render(
      <TagPicker
        label="Lenses"
        options={LENSES}
        onValueChange={onValueChange}
      />,
    )

    const field = screen.getByRole('combobox', { name: 'Lenses' })
    await userEvent.click(field)
    await userEvent.keyboard('{ArrowDown}{Enter}')
    expect(onValueChange).toHaveBeenCalledWith(['Home'])

    await userEvent.click(field)
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('closes on blur and does not open when disabled', async () => {
    const onValueChange = vi.fn()
    const { rerender } = render(<TagPicker label="Lenses" options={LENSES} />)

    const field = screen.getByRole('combobox', { name: 'Lenses' })
    await userEvent.click(field)
    expect(screen.getByRole('listbox')).toBeTruthy()
    fireEvent.blur(field)
    expect(screen.queryByRole('listbox')).toBeNull()

    rerender(
      <TagPicker
        label="Lenses"
        options={LENSES}
        disabled
        value={['Work']}
        onValueChange={onValueChange}
      />,
    )
    await userEvent.click(screen.getByRole('combobox', { name: 'Lenses' }))
    expect(screen.queryByRole('listbox')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Remove Work' }))
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('maps Fluent sizes onto Kro density', async () => {
    const { rerender } = render(
      <TagPicker label="Lenses" options={LENSES} size="small" />,
    )
    const compact = screen.getByRole('combobox', { name: 'Lenses' })
    expect(compact.getAttribute('data-density')).toBe('compact')
    await userEvent.click(compact)
    expect(screen.getAllByRole('option')[0]?.className).toContain('min-h-6')

    rerender(<TagPicker label="Lenses" options={LENSES} size="large" />)
    const comfortable = screen.getByRole('combobox', { name: 'Lenses' })
    expect(comfortable.getAttribute('data-density')).toBe('comfortable')
    await userEvent.click(comfortable)
    expect(screen.getAllByRole('option')[0]?.className).toContain('min-h-9')
  })

  it('stays controlled when a caller passes `value`', async () => {
    const onValueChange = vi.fn()
    render(
      <TagPicker
        label="Lenses"
        options={LENSES}
        value={['Work']}
        onValueChange={onValueChange}
      />,
    )

    await userEvent.click(screen.getByRole('combobox', { name: 'Lenses' }))
    await userEvent.click(screen.getByRole('option', { name: 'Home' }))
    expect(onValueChange).toHaveBeenCalledWith(['Work', 'Home'])
    expect(screen.queryByRole('button', { name: 'Remove Home' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Remove Work' })).toBeTruthy()
  })

  it('moves the highlight with ArrowUp and works without a label', async () => {
    const onValueChange = vi.fn()
    render(<TagPicker options={LENSES} onValueChange={onValueChange} />)

    const field = screen.getByRole('combobox')
    await userEvent.click(field)
    await userEvent.keyboard('{Escape}{ArrowDown}{ArrowDown}{ArrowUp}{Enter}')
    expect(onValueChange).toHaveBeenCalledWith(['Work'])
  })
})
