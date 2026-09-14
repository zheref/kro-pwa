import { describe, expect, it } from 'vitest'
import {
  FLUENT_CATALOG,
  FLUENT_CATEGORIES,
  FLUENT_COMPONENTS_INDEX,
  fluentConflicts,
  fluentEntriesByCategory,
  fluentEntryNamed,
  fluentUrl,
} from './catalog'

describe('Fluent 2 catalog', () => {
  it('lists every Fluent 2 web category this gallery stages', () => {
    expect(FLUENT_CATEGORIES).toEqual([
      'Actions',
      'Content',
      'Forms',
      'Navigation',
      'Surfaces',
      'Status',
      'Utilities',
    ])
  })

  it('gives every title a unique slug, a purpose and a variant list', () => {
    const slugs = FLUENT_CATALOG.map((entry) => entry.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const entry of FLUENT_CATALOG) {
      expect(entry.fluentPath.length, entry.title).toBeGreaterThan(0)
      expect(entry.purpose.length, entry.title).toBeGreaterThan(10)
      expect(entry.variants.length, entry.title).toBeGreaterThan(0)
    }
  })

  it('points implemented, existing and conflict titles at a Kro export', () => {
    for (const entry of FLUENT_CATALOG) {
      if (entry.availability === 'out-of-scope') {
        expect(entry.outOfScopeReason, entry.title).toBeTruthy()
        expect(entry.kroName).toBeUndefined()
      } else {
        expect(entry.kroName, entry.title).toBeTruthy()
        expect(entry.outOfScopeReason).toBeUndefined()
      }
      if (entry.availability === 'conflict') {
        expect(entry.conflict?.kind, entry.title).toBe('exact')
      }
    }
  })

  it('looks up an entry by title and builds the canonical Fluent URL', () => {
    const button = fluentEntryNamed('Button')
    expect(button?.kroName).toBe('Button')
    expect(button?.availability).toBe('existing')
    expect(button).toBeDefined()
    if (button === undefined) return
    expect(fluentUrl(button)).toContain('/components/web/react/')
    expect(FLUENT_COMPONENTS_INDEX).toContain('/components/web/react')
    expect(fluentEntriesByCategory('Status').map((e) => e.title)).toContain(
      'Badge',
    )
  })

  it('records the Kro export every Fluent title folded into', () => {
    const conflicts = fluentConflicts()
    expect(conflicts.length).toBeGreaterThan(10)
    expect(conflicts.map((entry) => entry.title)).toEqual(
      expect.arrayContaining([
        'Button',
        'Checkbox',
        'Combobox',
        'Input',
        'Label',
        'List',
        'Popover',
        'Radio group',
        'Slider',
        'Toolbar',
        'Dialog',
        'Menu button',
        'Toggle button',
        'Accordion',
        'Breadcrumb',
        'Nav',
        'Card',
        'Badge',
        'Tag',
      ]),
    )
    expect(
      conflicts
        .filter((entry) => entry.availability === 'conflict')
        .every((entry) => entry.conflict?.kind === 'exact'),
    ).toBe(true)
    for (const entry of conflicts) {
      expect(entry.conflict?.kroName.length, entry.title).toBeGreaterThan(0)
      expect(entry.conflict?.note.length, entry.title).toBeGreaterThan(20)
    }
  })
})
