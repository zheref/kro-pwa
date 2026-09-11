import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { InfoLabel } from './InfoLabel'

afterEach(cleanup)

describe('InfoLabel', () => {
  it('starts closed with a named info button and a hidden glyph', () => {
    render(
      <InfoLabel
        label="Host"
        info="This endeavor came from Google Calendar."
        htmlFor="host"
      />,
    )

    const root = document.querySelector('[data-slot="info-label"]')
    expect(root).toBeTruthy()
    expect(screen.getByText('Host').getAttribute('for')).toBe('host')
    const button = screen.getByRole('button', { name: 'More info' })
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(button.querySelector('svg')?.getAttribute('aria-hidden')).toBe(
      'true',
    )
  })

  it('opens a glass panel with the extra copy, then closes it', async () => {
    render(
      <InfoLabel
        label="Host"
        info="This endeavor came from Google Calendar."
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'More info' }))

    const dialog = screen.getByRole('dialog', { name: 'Host' })
    expect(dialog.textContent).toBe('This endeavor came from Google Calendar.')
    expect(dialog.className).toContain('kro-glass')
    expect(
      screen
        .getByRole('button', { name: 'More info' })
        .getAttribute('aria-expanded'),
    ).toBe('true')

    await userEvent.click(screen.getByRole('button', { name: 'More info' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('maps Fluent sizes onto Kro density', () => {
    const { rerender } = render(
      <InfoLabel label="Host" info="Calendar." size="small" />,
    )
    expect(
      document
        .querySelector('[data-slot="info-label"]')
        ?.getAttribute('data-density'),
    ).toBe('compact')

    rerender(<InfoLabel label="Host" info="Calendar." size="medium" />)
    expect(
      document
        .querySelector('[data-slot="info-label"]')
        ?.getAttribute('data-density'),
    ).toBe('comfortable')
  })
})
