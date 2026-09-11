import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Label } from './Label'

afterEach(cleanup)

describe('Label', () => {
  it('renders as a label when htmlFor is set', () => {
    render(<Label htmlFor="session-title">Session title</Label>)

    const node = screen.getByText('Session title')
    expect(node.tagName).toBe('LABEL')
    expect(node.getAttribute('for')).toBe('session-title')
    expect(node.className).toContain('text-kro-fore')
    expect(node.className).toContain('font-medium')
    expect(node.className).toContain('text-[13px]')
  })

  it('grows to 15px when comfortable and size is not passed', () => {
    const { rerender } = render(<Label>Session title</Label>)

    expect(screen.getByText('Session title').getAttribute('data-density')).toBe(
      'compact',
    )
    expect(screen.getByText('Session title').className).toContain('text-[13px]')

    rerender(<Label density="comfortable">Session title</Label>)
    expect(screen.getByText('Session title').getAttribute('data-density')).toBe(
      'comfortable',
    )
    expect(screen.getByText('Session title').className).toContain('text-[15px]')
  })

  it('renders as a paragraph when asked', () => {
    render(
      <Label as="p" tone="secondary" size="sm">
        Plan
      </Label>,
    )

    const node = screen.getByText('Plan')
    expect(node.tagName).toBe('P')
    expect(node.className).toContain('text-kro-fore-secondary')
    expect(node.className).toContain('text-[13px]')
  })

  it('names a destructive state in words, never colour alone', () => {
    render(<Label tone="destructive">Delete this endeavor</Label>)

    const node = screen.getByText('Delete this endeavor')
    expect(node.textContent).toBe('Delete this endeavor')
    expect(node.className).toContain('text-kro-banner-danger')
  })
})
