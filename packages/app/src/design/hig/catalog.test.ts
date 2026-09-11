import { describe, expect, it } from 'vitest'
import {
  HIG_CATALOG,
  HIG_CATEGORIES,
  HIG_COMPONENTS_INDEX,
  higEntriesByCategory,
  higEntryNamed,
  higUrl,
} from './catalog'

describe('HIG catalog', () => {
  it('lists every HIG category Apple publishes for components', () => {
    expect(HIG_CATEGORIES).toEqual([
      'Actions',
      'Content',
      'Layout and organization',
      'Navigation and search',
      'Presentation',
      'Selection and input',
      'Status',
    ])
  })

  it('gives every title a unique slug and an Apple path', () => {
    const slugs = HIG_CATALOG.map((entry) => entry.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const entry of HIG_CATALOG) {
      expect(entry.applePath.length).toBeGreaterThan(0)
      expect(entry.purpose.length).toBeGreaterThan(10)
    }
  })

  it('points implemented and existing titles at a Kro export, and out-of-scope titles at a reason', () => {
    for (const entry of HIG_CATALOG) {
      if (entry.availability === 'out-of-scope') {
        expect(entry.outOfScopeReason, entry.title).toBeTruthy()
        expect(entry.kroName).toBeUndefined()
      } else {
        expect(entry.kroName, entry.title).toBeTruthy()
        expect(entry.outOfScopeReason).toBeUndefined()
      }
    }
  })

  it('looks up an entry by title and builds the canonical Apple URL', () => {
    const buttons = higEntryNamed('Buttons')
    expect(buttons?.kroName).toBe('Button')
    expect(buttons).toBeDefined()
    if (buttons === undefined) return
    expect(higUrl(buttons)).toBe(
      'https://developer.apple.com/design/human-interface-guidelines/buttons',
    )
    expect(HIG_COMPONENTS_INDEX).toContain('/components')
    expect(higEntriesByCategory('Status').map((e) => e.title)).toContain(
      'Activity rings',
    )
  })
})
