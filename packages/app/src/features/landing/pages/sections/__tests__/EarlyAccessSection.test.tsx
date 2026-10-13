import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { EarlyAccessSection } from '../EarlyAccessSection'
import * as stories from '../EarlyAccessSection.stories'

afterEach(cleanup)

describe('EarlyAccessSection (mirrors EarlyAccessSection.stories)', () => {
  it('Idle — an h2 names the section and the form is inside it', () => {
    const { container } = render(stories.Idle.render())
    const h2 = screen.getByRole('heading', {
      level: 2,
      name: 'Be first through the door.',
    })
    expect(
      container
        .querySelector('section#early-access')
        ?.getAttribute('aria-labelledby'),
    ).toBe(h2.id)
    expect(screen.getByRole('textbox', { name: /Email address/ })).toBeTruthy()
    expect(h2.closest('header')?.className).toContain(
      'kro-section-header--on-glow',
    )
  })

  it('TypingDark — shows the typed address from the mock', () => {
    render(stories.TypingDark.render())
    expect(
      (
        screen.getByRole('textbox', {
          name: /Email address/,
        }) as HTMLInputElement
      ).value,
    ).toBe('ada@example.com')
  })

  it('JoinedPhone — shows the success card for the platform in the receipt', () => {
    render(stories.JoinedPhone.render())
    expect(
      screen.getByRole('heading', { name: "You're on the list for iPhone" }),
    ).toBeTruthy()
  })
})

describe('EarlyAccessSection slot', () => {
  it('renders whatever form it is given and decorates with hidden glow blobs only', () => {
    const { container } = render(
      <EarlyAccessSection>
        <p>the form</p>
      </EarlyAccessSection>,
    )
    expect(screen.getByText('the form')).toBeTruthy()
    expect(container.querySelectorAll('.kro-glow-blob')).toHaveLength(2)
    expect(
      container.querySelector('[aria-hidden="true"] .kro-glow-blob'),
    ).not.toBeNull()
  })
})
