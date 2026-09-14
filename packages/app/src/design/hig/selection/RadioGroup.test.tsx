import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Radio, RadioGroup } from './RadioGroup'

afterEach(cleanup)

function SessionEnd({
  value,
  defaultValue,
  onValueChange,
  density,
}: {
  readonly value?: string
  readonly defaultValue?: string
  readonly onValueChange?: (value: string) => void
  readonly density?: 'compact' | 'comfortable'
}) {
  return (
    <RadioGroup
      name="session-end"
      legend="When the session ends"
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      density={density}
    >
      <Radio value="complete" label="Complete the endeavor" />
      <Radio value="pause" label="Pause and keep the clock" />
      <Radio value="abandon" label="Abandon this session" disabled />
    </RadioGroup>
  )
}

describe('RadioGroup', () => {
  it('selects one option in a stacked list and names the group', async () => {
    const onValueChange = vi.fn()
    render(<SessionEnd defaultValue="complete" onValueChange={onValueChange} />)

    expect(
      screen.getByRole<HTMLInputElement>('radio', {
        name: 'Complete the endeavor',
      }).checked,
    ).toBe(true)
    expect(
      screen.getByRole('group', { name: 'When the session ends' }),
    ).toBeTruthy()

    await userEvent.click(
      screen.getByRole('radio', { name: 'Pause and keep the clock' }),
    )

    expect(
      screen.getByRole<HTMLInputElement>('radio', {
        name: 'Pause and keep the clock',
      }).checked,
    ).toBe(true)
    expect(
      screen.getByRole<HTMLInputElement>('radio', {
        name: 'Complete the endeavor',
      }).checked,
    ).toBe(false)
    expect(onValueChange).toHaveBeenCalledWith('pause')
  })

  it('does not select a disabled option, and the fade lives on that radio once', async () => {
    const onValueChange = vi.fn()
    render(<SessionEnd defaultValue="complete" onValueChange={onValueChange} />)

    const abandoned = screen.getByRole<HTMLInputElement>('radio', {
      name: 'Abandon this session',
    })
    await userEvent.click(abandoned)

    expect(abandoned.checked).toBe(false)
    expect(abandoned.disabled).toBe(true)
    expect(onValueChange).not.toHaveBeenCalled()
    expect(abandoned.className).toContain('kro-hig-radio')
  })

  it('stays controlled when a caller passes `value`', async () => {
    const onValueChange = vi.fn()
    render(<SessionEnd value="complete" onValueChange={onValueChange} />)

    await userEvent.click(
      screen.getByRole('radio', { name: 'Pause and keep the clock' }),
    )

    expect(onValueChange).toHaveBeenCalledWith('pause')
    expect(
      screen.getByRole<HTMLInputElement>('radio', {
        name: 'Complete the endeavor',
      }).checked,
    ).toBe(true)
  })

  it('defaults to compact and grows for comfortable', () => {
    const { rerender } = render(<SessionEnd defaultValue="complete" />)
    expect(screen.getByRole('group').getAttribute('data-density')).toBe(
      'compact',
    )
    const compactRadio = screen.getByRole('radio', {
      name: 'Complete the endeavor',
    })
    expect(compactRadio.getAttribute('data-density')).toBe('compact')
    expect(compactRadio.parentElement?.className).toContain('min-h-6')

    rerender(<SessionEnd defaultValue="complete" density="comfortable" />)
    expect(screen.getByRole('group').getAttribute('data-density')).toBe(
      'comfortable',
    )
    expect(
      screen.getByRole('radio', { name: 'Complete the endeavor' }).parentElement
        ?.className,
    ).toContain('min-h-9')
  })

  it('shares one name so the platform treats the radios as one group', () => {
    render(<SessionEnd defaultValue="complete" />)

    const radios = screen.getAllByRole('radio')
    expect(
      radios.every((radio) => radio.getAttribute('name') === 'session-end'),
    ).toBe(true)
  })
})
