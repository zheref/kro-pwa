import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { StatRow } from '../StatRow'

afterEach(cleanup)

const ITEMS = [
  { value: '4.9', label: 'Average rating' },
  { value: '12k', label: 'Days planned' },
]

describe('StatRow', () => {
  it('pairs every figure with its caption in a description list', () => {
    const { container } = render(<StatRow items={ITEMS} />)
    expect(container.querySelector('dl')).not.toBeNull()
    expect(screen.getByText('Average rating').tagName).toBe('DT')
    expect(screen.getByText('4.9').tagName).toBe('DD')
  })

  it('paints the figures with the gradient text class', () => {
    render(<StatRow items={ITEMS} />)
    expect(screen.getByText('12k').className).toContain('kro-gradient-text')
  })

  it('renders nothing but the list when there are no items', () => {
    const { container } = render(<StatRow items={[]} />)
    expect(container.querySelectorAll('dd')).toHaveLength(0)
  })

  it('passes a className through', () => {
    const { container } = render(<StatRow items={ITEMS} className="extra" />)
    expect(container.querySelector('dl')?.className).toContain('extra')
  })
})
