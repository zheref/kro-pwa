import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { Tooltip } from './Tooltip'

afterEach(cleanup)

describe('Tooltip', () => {
  it('starts hidden and shows the bubble on hover', async () => {
    render(
      <Tooltip content="Save the endeavor">
        <button type="button">Save</button>
      </Tooltip>,
    )

    expect(screen.queryByRole('tooltip')).toBeNull()
    expect(
      document
        .querySelector('[data-slot="tooltip"]')
        ?.getAttribute('aria-label'),
    ).toBe('Save the endeavor')

    await userEvent.hover(screen.getByRole('button', { name: 'Save' }))

    const bubble = screen.getByRole('tooltip')
    expect(bubble.textContent).toBe('Save the endeavor')
    expect(bubble.className).toContain('kro-fluent-tooltip')
    expect(bubble.className).toContain('kro-glass')
  })

  it('shows the bubble on focus', async () => {
    render(
      <Tooltip content="Save the endeavor">
        <button type="button">Save</button>
      </Tooltip>,
    )

    await userEvent.tab()

    expect(screen.getByRole('tooltip').textContent).toBe('Save the endeavor')
  })

  it('describes the trigger through aria-describedby', async () => {
    render(
      <Tooltip content="More about this control" relationship="description">
        <button type="button">Info</button>
      </Tooltip>,
    )

    const trigger = screen.getByRole('button', { name: 'Info' })
    const describedBy = trigger.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(
      document
        .querySelector('[data-slot="tooltip"]')
        ?.getAttribute('aria-label'),
    ).toBeNull()

    await userEvent.hover(trigger)
    expect(screen.getByRole('tooltip').id).toBe(describedBy)
  })
})
