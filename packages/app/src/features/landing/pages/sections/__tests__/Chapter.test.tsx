import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Chapter } from '../Chapter'

afterEach(cleanup)

const base = {
  id: 'plan',
  eyebrow: '3 · Plan',
  title: 'See the day you are choosing.',
  body: 'Three honest views.',
  points: ['Timeline', 'List', 'Priority Matrix'],
}

describe('Chapter', () => {
  it('renders an article with an h3 title, the body and one chip per point', () => {
    render(
      <Chapter {...base}>
        <div data-testid="media" />
      </Chapter>,
    )
    expect(screen.getByRole('article')).toBeTruthy()
    expect(
      screen
        .getByRole('heading', { level: 3, name: base.title })
        .getAttribute('id'),
    ).toBe('chapter-plan-title')
    expect(screen.getByText('Three honest views.')).toBeTruthy()
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(
      base.points,
    )
  })

  it('renders the media slot', () => {
    render(
      <Chapter {...base}>
        <div data-testid="media" />
      </Chapter>,
    )
    expect(screen.getByTestId('media')).toBeTruthy()
  })

  it('flip puts the copy second from md; unflipped leaves the order alone', () => {
    const { container, rerender } = render(
      <Chapter {...base}>
        <div />
      </Chapter>,
    )
    expect(container.querySelector('.md\\:order-2')).toBeNull()
    rerender(
      <Chapter {...base} flip>
        <div />
      </Chapter>,
    )
    expect(container.querySelector('.md\\:order-2')).not.toBeNull()
    expect(container.querySelector('.md\\:order-1')).not.toBeNull()
  })
})
