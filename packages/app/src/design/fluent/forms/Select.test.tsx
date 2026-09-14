import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Select } from './Select'

afterEach(cleanup)

const QUADRANTS = [
  { value: 'prioritize', label: 'Prioritize' },
  { value: 'decide', label: 'Schedule' },
  { value: 'delegate', label: 'Delegate' },
] as const

const DISABLED_FADE = 'opacity-[var(--kro-opacity-disabled)]'

describe('Select', () => {
  it('renders a native select of the options', () => {
    render(<Select label="Quadrant" options={QUADRANTS} />)

    const field = screen.getByLabelText<HTMLSelectElement>('Quadrant')
    expect(field.tagName).toBe('SELECT')
    expect(field.getAttribute('data-slot')).toBe('select')
    expect(field.getAttribute('data-appearance')).toBe('outline')
    expect(field.className).toContain('kro-fluent-select')
    expect(field.className).toContain('bg-kro-back-inner')
    expect(field.className).toContain('border-kro-hairline')
    expect(field.options).toHaveLength(3)
  })

  it('reports the chosen value and stays controlled when asked', async () => {
    const onValueChange = vi.fn()
    const { rerender } = render(
      <Select
        label="Quadrant"
        options={QUADRANTS}
        defaultValue="prioritize"
        onValueChange={onValueChange}
      />,
    )

    await userEvent.selectOptions(screen.getByLabelText('Quadrant'), 'decide')
    expect(onValueChange).toHaveBeenCalledWith('decide')
    expect(screen.getByLabelText<HTMLSelectElement>('Quadrant').value).toBe(
      'decide',
    )

    rerender(
      <Select
        label="Quadrant"
        options={QUADRANTS}
        value="prioritize"
        onValueChange={onValueChange}
      />,
    )
    await userEvent.selectOptions(screen.getByLabelText('Quadrant'), 'delegate')
    expect(onValueChange).toHaveBeenLastCalledWith('delegate')
    expect(screen.getByLabelText<HTMLSelectElement>('Quadrant').value).toBe(
      'prioritize',
    )
  })

  it('applies the disabled fade once and does not change', async () => {
    const onValueChange = vi.fn()
    render(
      <Select
        label="Quadrant"
        options={QUADRANTS}
        defaultValue="prioritize"
        disabled
        onValueChange={onValueChange}
      />,
    )

    const field = screen.getByLabelText<HTMLSelectElement>('Quadrant')
    expect(field.disabled).toBe(true)
    await userEvent.selectOptions(field, 'decide')
    expect(onValueChange).not.toHaveBeenCalled()

    const wrapper = field.parentElement
    const wrapperFades = (wrapper?.className ?? '')
      .split(/\s+/)
      .filter((token) => token === DISABLED_FADE)
    expect(wrapperFades).toHaveLength(1)
    expect(field.className).not.toContain(DISABLED_FADE)
  })

  it('draws underline as a bottom edge and outline as a hairline box', () => {
    const { rerender } = render(
      <Select label="Quadrant" options={QUADRANTS} appearance="underline" />,
    )
    const underline = screen.getByLabelText('Quadrant')
    expect(underline.getAttribute('data-appearance')).toBe('underline')
    expect(underline.className).toContain('border-b')
    expect(underline.className).toContain('rounded-none')

    rerender(
      <Select label="Quadrant" options={QUADRANTS} appearance="outline" />,
    )
    const outline = screen.getByLabelText('Quadrant')
    expect(outline.className).toContain('rounded-kro-field')
    expect(outline.className).toContain('border-kro-hairline')
  })

  it('maps Fluent sizes onto Kro density', () => {
    const { rerender } = render(
      <Select label="Quadrant" options={QUADRANTS} size="small" />,
    )
    expect(screen.getByLabelText('Quadrant').getAttribute('data-density')).toBe(
      'compact',
    )
    expect(screen.getByLabelText('Quadrant').className).toContain('h-6')

    rerender(<Select label="Quadrant" options={QUADRANTS} size="large" />)
    expect(screen.getByLabelText('Quadrant').getAttribute('data-density')).toBe(
      'comfortable',
    )
    expect(screen.getByLabelText('Quadrant').className).toContain('h-9')
  })

  it('renders the native select without a wrapping label', () => {
    render(<Select options={QUADRANTS} />)

    const field = document.querySelector('[data-slot="select"]')
    expect(field?.tagName).toBe('SELECT')
    expect(field?.parentElement?.tagName).toBe('DIV')
  })
})
