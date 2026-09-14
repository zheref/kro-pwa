import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Card, CardFooter, CardHeader, CardPreview } from './Card'

afterEach(cleanup)

describe('Card', () => {
  it('fills with absolute colour, card radius and the surface shadow', () => {
    render(
      <Card>
        <CardHeader header="Inbox triage" description="Plan · Task" />
      </Card>,
    )

    const card = document.querySelector('[data-slot="card"]')
    expect(card?.getAttribute('data-slot')).toBe('card')
    expect(card?.className).toContain('rounded-kro-card')
    expect(card?.className).toContain('bg-kro-absolute')
    expect(card?.className).toContain('shadow-kro-surface')
    expect(screen.getByText('Inbox triage')).toBeTruthy()
    expect(screen.getByText('Plan · Task')).toBeTruthy()
  })

  it('paints outline and subtle without relying on colour alone', () => {
    const { rerender } = render(
      <Card appearance="outline">
        <CardHeader header="Outline" />
      </Card>,
    )

    const card = () => document.querySelector('[data-slot="card"]')
    expect(card()?.className).toContain('border-kro-hairline')
    expect(card()?.className).toContain('bg-transparent')
    expect(card()?.getAttribute('data-appearance')).toBe('outline')

    rerender(
      <Card appearance="filled-alternative">
        <CardHeader header="Inner" />
      </Card>,
    )
    expect(card()?.className).toContain('bg-kro-back-inner')

    rerender(
      <Card appearance="subtle">
        <CardHeader header="Quiet" />
      </Card>,
    )
    expect(card()?.className).toContain('bg-transparent')
    expect(card()?.className).not.toContain('shadow-kro-surface')
  })

  it('lays out preview, header, footer and a horizontal orientation', () => {
    const { rerender } = render(
      <Card>
        <CardPreview>
          <span>Cover</span>
        </CardPreview>
        <CardHeader
          header="Weekly review"
          action={<button type="button">Open</button>}
        />
        <CardFooter>Due this afternoon</CardFooter>
      </Card>,
    )

    expect(
      document.querySelector('[data-slot="card-preview"]')?.textContent,
    ).toBe('Cover')
    expect(screen.getByRole('button', { name: 'Open' })).toBeTruthy()
    expect(
      document.querySelector('[data-slot="card-footer"]')?.textContent,
    ).toBe('Due this afternoon')
    expect(document.querySelector('[data-slot="card"]')?.className).toContain(
      'flex-col',
    )

    rerender(
      <Card orientation="horizontal">
        <CardPreview>
          <span>Cover</span>
        </CardPreview>
        <CardHeader header="Weekly review" />
      </Card>,
    )
    expect(
      document
        .querySelector('[data-slot="card"]')
        ?.getAttribute('data-orientation'),
    ).toBe('horizontal')
    expect(document.querySelector('[data-slot="card"]')?.className).toContain(
      'flex-row',
    )
  })

  it('maps Fluent size names onto padding and density', () => {
    const { rerender } = render(<Card>Body</Card>)

    const card = () => document.querySelector('[data-slot="card"]')
    expect(card()?.getAttribute('data-size')).toBe('medium')
    expect(card()?.getAttribute('data-density')).toBe('compact')
    expect(card()?.className).toContain('p-kro-medium')

    rerender(<Card size="small">Body</Card>)
    expect(card()?.getAttribute('data-density')).toBe('compact')
    expect(card()?.className).toContain('p-kro-small')

    rerender(<Card size="large">Body</Card>)
    expect(card()?.className).toContain('p-kro-large')
  })
})
