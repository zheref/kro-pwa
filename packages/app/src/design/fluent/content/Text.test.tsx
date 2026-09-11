import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Text } from './Text'

afterEach(cleanup)

describe('Text', () => {
  it('defaults to size 300, regular weight and primary tone', () => {
    render(<Text className="extra-class">Session notes</Text>)

    const node = screen.getByText('Session notes')
    expect(node.getAttribute('data-slot')).toBe('text')
    expect(node.tagName).toBe('SPAN')
    expect(node.className).toContain('text-[13px]')
    expect(node.className).toContain('font-normal')
    expect(node.className).toContain('text-kro-fore')
    expect(node.className).toContain('extra-class')
  })

  it('truncates when asked and stops wrapping when wrap is false', () => {
    const { rerender } = render(
      <Text truncate>A long line about the morning block</Text>,
    )

    expect(screen.getByText(/morning block/).className).toContain('truncate')

    rerender(<Text wrap={false}>One line only</Text>)
    expect(screen.getByText('One line only').className).toContain(
      'whitespace-nowrap',
    )
  })

  it('renders as a heading and names destructive in words', () => {
    const { rerender } = render(
      <Text as="h1" size={1000} weight="bold">
        Inbox
      </Text>,
    )

    const heading = screen.getByText('Inbox')
    expect(heading.tagName).toBe('H1')
    expect(heading.className).toContain('text-[32px]')
    expect(heading.className).toContain('font-bold')

    rerender(
      <Text as="p" tone="destructive" italic>
        Delete this endeavor
      </Text>,
    )
    const danger = screen.getByText('Delete this endeavor')
    expect(danger.tagName).toBe('P')
    expect(danger.className).toContain('text-kro-banner-danger')
    expect(danger.className).toContain('italic')
    expect(danger.textContent).toBe('Delete this endeavor')
  })

  it('maps the rest of the size ramp onto pixel type', () => {
    const { rerender } = render(<Text size={100}>Caption</Text>)
    expect(screen.getByText('Caption').className).toContain('text-[11px]')

    rerender(
      <Text size={500} weight="semibold" tone="secondary" as="label">
        Supporting
      </Text>,
    )
    const label = screen.getByText('Supporting')
    expect(label.tagName).toBe('LABEL')
    expect(label.className).toContain('text-[16px]')
    expect(label.className).toContain('font-semibold')
    expect(label.className).toContain('text-kro-fore-secondary')
  })
})
