import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Collection, CollectionItem } from './Collection'

afterEach(cleanup)

describe('Collection', () => {
  it('lays out a two-column grid by default', () => {
    render(
      <Collection>
        <CollectionItem>Task</CollectionItem>
        <CollectionItem>Event</CollectionItem>
      </Collection>,
    )

    const grid = document.querySelector('[data-slot="collection"]')
    expect(grid?.getAttribute('data-columns')).toBe('2')
    expect(grid?.className).toContain('gap-kro-small')
    expect((grid as HTMLElement).style.gridTemplateColumns).toContain('2')
  })

  it('honours a caller-supplied column count', () => {
    render(
      <Collection columns={4}>
        <CollectionItem>Task</CollectionItem>
      </Collection>,
    )

    expect(
      document
        .querySelector('[data-slot="collection"]')
        ?.getAttribute('data-columns'),
    ).toBe('4')
  })

  it('paints each cell on the recessed field surface', () => {
    render(
      <Collection>
        <CollectionItem>Habit</CollectionItem>
      </Collection>,
    )

    const cell = screen.getByText('Habit')
    expect(cell.className).toContain('rounded-kro-field')
    expect(cell.className).toContain('bg-kro-back-next')
    expect(cell.className).toContain('min-h-6')
  })

  it('defaults to compact and grows for comfortable', () => {
    const { rerender } = render(
      <Collection>
        <CollectionItem>Habit</CollectionItem>
      </Collection>,
    )

    expect(
      document
        .querySelector('[data-slot="collection"]')
        ?.getAttribute('data-density'),
    ).toBe('compact')
    expect(screen.getByText('Habit').className).toContain('min-h-6')

    rerender(
      <Collection density="comfortable">
        <CollectionItem density="comfortable">Habit</CollectionItem>
      </Collection>,
    )
    expect(
      document
        .querySelector('[data-slot="collection"]')
        ?.getAttribute('data-density'),
    ).toBe('comfortable')
    expect(screen.getByText('Habit').className).toContain('min-h-9')
  })
})
