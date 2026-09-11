import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Persona } from './Persona'

afterEach(cleanup)

describe('Persona', () => {
  it('pairs the avatar with the person’s name', () => {
    render(<Persona name="Ada Lovelace" />)

    const root = document.querySelector('[data-slot="persona"]')
    expect(root).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Ada Lovelace' })).toBeTruthy()
    expect(screen.getByText('AL')).toBeTruthy()
    expect(root?.className).toContain('flex-row')
  })

  it('keeps secondary and tertiary as words, not colour alone', () => {
    render(
      <Persona
        name="Ada Lovelace"
        secondaryText="Available · Mathematician"
        tertiaryText="Analytical Engine"
        presence="available"
      />,
    )

    expect(screen.getByText('Available · Mathematician')).toBeTruthy()
    expect(screen.getByText('Analytical Engine')).toBeTruthy()
    expect(
      document
        .querySelector('[data-slot="presence-badge"]')
        ?.getAttribute('aria-label'),
    ).toBe('available')
  })

  it('maps extra-small onto a 20px avatar and huge onto 72px', () => {
    const { rerender } = render(
      <Persona name="Ada Lovelace" size="extra-small" />,
    )

    expect(
      document.querySelector('[data-slot="avatar"]')?.getAttribute('style'),
    ).toContain('20px')

    rerender(<Persona name="Ada Lovelace" size="huge" />)
    expect(
      document.querySelector('[data-slot="avatar"]')?.getAttribute('style'),
    ).toContain('72px')
  })

  it('stacks the copy under the avatar when alignment is center', () => {
    render(<Persona name="Ada Lovelace" textAlignment="center" />)

    const root = document.querySelector('[data-slot="persona"]')
    expect(root?.className).toContain('flex-col')
    expect(root?.className).toContain('text-center')
  })
})
