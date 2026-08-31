import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { colorTint, semanticTint } from './KroChip'
import { PropertyRow, propertyRowAccessibilityText } from './PropertyRow'

afterEach(cleanup)

describe('PropertyRow', () => {
  it('reads as "label, value" — the pair a detail screen is made of', () => {
    render(<PropertyRow label="Duration" value={{ kind: 'emphasis', text: '45m' }} />)

    expect(screen.getByText('Duration')).not.toBeNull()
    expect(screen.getAllByText('45m').length).toBeGreaterThan(0)
  })

  it('restacks chip-shaped values, because a wrapped flow cannot trail-align', () => {
    const { container } = render(
      <PropertyRow label="Tags" value={{ kind: 'tags', tags: ['Engaging', 'On desk'] }} />,
    )

    const row = container.querySelector('[data-slot="property-row"]') as HTMLElement
    expect(row.dataset.stacked).toBe('true')
  })

  it('does NOT restack an empty tag list — there is nothing to wrap', () => {
    const { container } = render(<PropertyRow label="Tags" value={{ kind: 'tags', tags: [] }} />)

    const row = container.querySelector('[data-slot="property-row"]') as HTMLElement
    expect(row.dataset.stacked).toBe('false')
  })

  it('restacks below a rem-based width, which is the Dynamic-Type equivalent', () => {
    const { container } = render(
      <PropertyRow label="Due" value={{ kind: 'text', text: 'Apr 22' }} />,
    )

    // `rem` is the user's root font size, so a reader at 200% text gets the
    // stacked layout on a viewport twice as wide.
    const row = container.querySelector('[data-slot="property-row"]') as HTMLElement
    expect(row.className).toContain('max-[26rem]:flex-col')
  })

  it('draws the tint swatch with a ring, so a near-white colour is still visible', () => {
    const { container } = render(
      <PropertyRow
        label="Color"
        value={{ kind: 'tint', tint: colorTint('snow'), label: '#FFFFFF' }}
      />,
    )

    const swatch = container.querySelector(
      '[data-slot="property-row-swatch"]',
    ) as HTMLElement
    expect(swatch.style.boxShadow).toContain('inset')
  })
})

describe('propertyRowAccessibilityText — canon’s accessibilityValue, exported so it can be asserted', () => {
  it('speaks a rating as a count, never as a row of glyph names', () => {
    expect(
      propertyRowAccessibilityText({ kind: 'rating', value: 4, outOf: 5, symbol: 'star' }),
    ).toBe('4 out of 5')
  })

  it('speaks an empty collection as "None", not as an em dash', () => {
    expect(propertyRowAccessibilityText({ kind: 'tags', tags: [] })).toBe('None')
    expect(propertyRowAccessibilityText({ kind: 'chips', chips: [] })).toBe('None')
  })

  it('joins a collection with commas', () => {
    expect(
      propertyRowAccessibilityText({ kind: 'tags', tags: ['Engaging', 'On desk'] }),
    ).toBe('Engaging, On desk')
  })

  it('speaks the placeholder for an empty value', () => {
    expect(propertyRowAccessibilityText({ kind: 'empty', placeholder: 'No expiry' })).toBe(
      'No expiry',
    )
  })

  it('speaks a chip by its title, and the swatch by its label', () => {
    expect(
      propertyRowAccessibilityText({
        kind: 'chip',
        title: 'Pending',
        tint: semanticTint('statusPending'),
      }),
    ).toBe('Pending')
    expect(
      propertyRowAccessibilityText({
        kind: 'tint',
        tint: colorTint('celeste'),
        label: '#B8F2E6',
      }),
    ).toBe('#B8F2E6')
  })

  it('is what the ROW actually announces — the mapping is not duplicated in markup', () => {
    render(
      <PropertyRow
        label="Value"
        value={{ kind: 'rating', value: 2, outOf: 5, symbol: 'star' }}
      />,
    )

    expect(screen.getByText('2 out of 5')).not.toBeNull()
  })
})
