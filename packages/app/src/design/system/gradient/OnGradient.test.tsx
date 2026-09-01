import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { FieldSectionLabel, OnGradient, PageFieldEmpty } from './OnGradient'

afterEach(cleanup)

describe('OnGradient', () => {
  it('paints with the on-gradient ink, not the page foreground', () => {
    render(<OnGradient>My Day</OnGradient>)

    expect(screen.getByText('My Day').className).toContain('kro-on-gradient')
    expect(screen.getByText('My Day').className).not.toContain('text-kro-fore')
  })

  it('renders the element the caller asked for', () => {
    render(
      <OnGradient as="h2" data-testid="ink">
        Monday
      </OnGradient>,
    )

    expect(screen.getByTestId('ink').tagName).toBe('H2')
  })

  it('lets a caller add classes without losing the ink', () => {
    render(<OnGradient className="text-xl">Today</OnGradient>)

    const className = screen.getByText('Today').className
    expect(className).toContain('kro-on-gradient')
    expect(className).toContain('text-xl')
  })
})

describe('FieldSectionLabel', () => {
  it('is a heading, so a grouped card below it has a name', () => {
    render(<FieldSectionLabel>Preferences</FieldSectionLabel>)

    expect(screen.getByRole('heading', { level: 3 }).textContent).toBe(
      'Preferences',
    )
  })

  it('keeps the on-gradient ink the field requires', () => {
    render(<FieldSectionLabel>Account</FieldSectionLabel>)

    expect(screen.getByText('Account').className).toContain('kro-on-gradient')
  })

  it('is uppercase tracking, matching the grouped-list idiom', () => {
    render(<FieldSectionLabel>Keep Earning</FieldSectionLabel>)

    const className = screen.getByText('Keep Earning').className
    expect(className).toContain('uppercase')
    expect(className).toContain('tracking-wide')
  })
})

describe('PageFieldEmpty', () => {
  it('centres a title on the field', () => {
    render(<PageFieldEmpty title="Inbox" />)

    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Inbox')
    expect(screen.getByRole('heading', { level: 2 }).className).toContain(
      'kro-on-gradient',
    )
  })

  it('explains itself when given copy', () => {
    render(
      <PageFieldEmpty
        title="List"
        description="List is not built yet."
        data-testid="empty"
      />,
    )

    expect(screen.getByTestId('empty').textContent).toContain(
      'List is not built yet.',
    )
  })

  it('renders as the element the caller asked for', () => {
    render(
      <PageFieldEmpty
        as="section"
        title="My Day"
        data-testid="empty"
        aria-label="My Day"
      />,
    )

    expect(screen.getByTestId('empty').tagName).toBe('SECTION')
  })
})
