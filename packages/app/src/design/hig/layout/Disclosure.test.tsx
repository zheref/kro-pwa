import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { Disclosure } from './Disclosure'

afterEach(cleanup)

describe('Disclosure', () => {
  it('starts closed and names the summary', () => {
    render(
      <Disclosure title="Session details">
        <p>Complete with session</p>
      </Disclosure>,
    )

    const disclosure = document.querySelector('[data-slot="disclosure"]')
    expect(disclosure).toBeInstanceOf(HTMLDetailsElement)
    expect((disclosure as HTMLDetailsElement).open).toBe(false)
    expect(screen.getByText('Session details')).toBeTruthy()
  })

  it('opens when the summary is pressed', async () => {
    render(
      <Disclosure title="Session details">
        <p>Complete with session</p>
      </Disclosure>,
    )

    await userEvent.click(screen.getByText('Session details'))

    expect(
      (document.querySelector('[data-slot="disclosure"]') as HTMLDetailsElement)
        .open,
    ).toBe(true)
    expect(screen.getByText('Complete with session')).toBeTruthy()
  })

  it('honours defaultOpen without locking the control', async () => {
    render(
      <Disclosure title="Reminders" defaultOpen>
        <p>Focus sounds stay off until a session starts</p>
      </Disclosure>,
    )

    const disclosure = document.querySelector(
      '[data-slot="disclosure"]',
    ) as HTMLDetailsElement
    expect(disclosure.open).toBe(true)

    await userEvent.click(screen.getByText('Reminders'))
    expect(disclosure.open).toBe(false)
  })

  it('defaults to compact and grows for comfortable', () => {
    const { rerender } = render(
      <Disclosure title="Session details">
        <p>Complete with session</p>
      </Disclosure>,
    )

    const disclosure = document.querySelector('[data-slot="disclosure"]')
    expect(disclosure?.getAttribute('data-density')).toBe('compact')
    expect(disclosure?.querySelector('summary')?.className).toContain('min-h-6')

    rerender(
      <Disclosure title="Session details" density="comfortable">
        <p>Complete with session</p>
      </Disclosure>,
    )
    expect(
      document
        .querySelector('[data-slot="disclosure"]')
        ?.getAttribute('data-density'),
    ).toBe('comfortable')
    expect(
      document.querySelector('[data-slot="disclosure"] summary')?.className,
    ).toContain('min-h-9')
  })
})
