import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Separator } from './Separator'

afterEach(cleanup)

describe('Separator', () => {
  it('renders a hairline rule with no label', () => {
    const { container } = render(<Separator />)

    const rule = container.querySelector('hr')
    expect(rule).toBeTruthy()
    expect(rule?.className).toContain('h-px')
    expect(rule?.className).toContain('bg-kro-hairline')
    expect(rule?.className).toContain('border-0')
  })

  it('becomes a labelled divider when a name is supplied', () => {
    render(<Separator label="Today's sessions" />)

    const divider = screen.getByRole('separator', {
      name: "Today's sessions",
    })
    expect(divider.getAttribute('aria-label')).toBe("Today's sessions")
    expect(screen.getByText("Today's sessions").className).toContain(
      'text-kro-fore-secondary',
    )
    expect(screen.getAllByRole('separator')).toHaveLength(1)
  })

  it('keeps the words visible so the line is not the only signal', () => {
    render(<Separator label="Earn" />)

    expect(screen.getByText('Earn').textContent).toBe('Earn')
  })

  it('defaults to compact type and grows for comfortable', () => {
    const { rerender } = render(<Separator label="Earn" />)

    const divider = screen.getByRole('separator', { name: 'Earn' })
    expect(divider.getAttribute('data-density')).toBe('compact')
    expect(screen.getByText('Earn').className).toContain('text-xs')

    rerender(<Separator label="Earn" density="comfortable" />)
    expect(
      screen
        .getByRole('separator', { name: 'Earn' })
        .getAttribute('data-density'),
    ).toBe('comfortable')
    expect(screen.getByText('Earn').className).toContain('text-sm')
  })
})
