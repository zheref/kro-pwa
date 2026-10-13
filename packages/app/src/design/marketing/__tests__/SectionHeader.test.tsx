import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { SectionHeader } from '../SectionHeader'

afterEach(cleanup)

describe('SectionHeader', () => {
  it('renders the eyebrow, an h2 title and the lede', () => {
    render(
      <SectionHeader eyebrow="Plan" title="One timeline" lede="All of it." />,
    )
    expect(
      screen.getByRole('heading', { level: 2, name: 'One timeline' }),
    ).toBeTruthy()
    expect(screen.getByText('Plan').className).toContain('kro-eyebrow')
    expect(screen.getByText('All of it.').className).toContain('kro-lede')
  })

  it('omits the eyebrow and lede when not given', () => {
    const { container } = render(<SectionHeader title="Only a title" />)
    expect(container.querySelector('.kro-eyebrow')).toBeNull()
    expect(container.querySelector('.kro-lede')).toBeNull()
  })

  it('uses an h3 at level 3 and records the alignment', () => {
    const { container } = render(
      <SectionHeader title="Sub" level={3} align="center" />,
    )
    expect(screen.getByRole('heading', { level: 3, name: 'Sub' })).toBeTruthy()
    expect(container.querySelector('header')?.getAttribute('data-align')).toBe(
      'center',
    )
  })

  it('lets a section point aria-labelledby at the heading', () => {
    render(<SectionHeader title="Named" headingId="named-title" />)
    expect(screen.getByRole('heading').id).toBe('named-title')
  })
})
