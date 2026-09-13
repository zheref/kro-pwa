import { describe, expect, it } from 'vitest'
import {
  KRO_CATALOG,
  KRO_CATEGORIES,
  formatAlsoKnownAs,
  kroEntriesByCategory,
  kroEntryNamed,
} from './catalog'

describe('Kro catalog', () => {
  it('lists every category the gallery groups by', () => {
    expect(KRO_CATEGORIES).toEqual([
      'Actions',
      'Content',
      'Forms',
      'Layout',
      'Navigation',
      'Surfaces',
      'Status',
    ])
  })

  it('gives every export a unique slug, a purpose and aliases', () => {
    const slugs = KRO_CATALOG.map((entry) => entry.slug)
    const names = KRO_CATALOG.map((entry) => entry.kroName)
    expect(new Set(slugs).size).toBe(slugs.length)
    expect(new Set(names).size).toBe(names.length)
    for (const entry of KRO_CATALOG) {
      expect(entry.purpose.length, entry.kroName).toBeGreaterThan(10)
      expect(entry.alsoKnownAs.length, entry.kroName).toBeGreaterThan(0)
    }
  })

  it('keeps HIG names for the same job and flags the Fluent name', () => {
    expect(kroEntryNamed('PullDownButton')?.alsoKnownAs).toEqual(
      expect.arrayContaining([{ name: 'Menu button', source: 'Fluent 2' }]),
    )
    expect(kroEntryNamed('PathControl')?.alsoKnownAs).toEqual(
      expect.arrayContaining([{ name: 'Breadcrumb', source: 'Fluent 2' }]),
    )
    expect(kroEntryNamed('Toggle')?.alsoKnownAs).toEqual(
      expect.arrayContaining([{ name: 'Switch', source: 'Fluent 2' }]),
    )
    expect(kroEntryNamed('Sidebar')?.alsoKnownAs).toEqual(
      expect.arrayContaining([{ name: 'Nav', source: 'Fluent 2' }]),
    )
    expect(kroEntryNamed('InlineBanner')?.alsoKnownAs).toEqual(
      expect.arrayContaining([{ name: 'Message bar', source: 'Fluent 2' }]),
    )
    expect(kroEntryNamed('ProgressIndicator')?.alsoKnownAs).toEqual(
      expect.arrayContaining([
        { name: 'Spinner', source: 'Fluent 2' },
        { name: 'Progress bar', source: 'Fluent 2' },
      ]),
    )
  })

  it('keeps both concepts when the jobs differ', () => {
    expect(kroEntryNamed('Toggle')).toBeDefined()
    expect(kroEntryNamed('ToggleButton')).toBeDefined()
    expect(kroEntryNamed('Stepper')).toBeDefined()
    expect(kroEntryNamed('SpinButton')).toBeDefined()
    expect(kroEntryNamed('Disclosure')).toBeDefined()
    expect(kroEntryNamed('Accordion')).toBeDefined()
    expect(kroEntryNamed('Lockup')).toBeDefined()
    expect(kroEntryNamed('Persona')).toBeDefined()
    expect(kroEntryNamed('Picker')).toBeDefined()
    expect(kroEntryNamed('Select')).toBeDefined()
    expect(kroEntryNamed('GroupedBox')).toBeDefined()
    expect(kroEntryNamed('Card')).toBeDefined()
    expect(kroEntryNamed('Badge')).toBeDefined()
    expect(kroEntriesByCategory('Status').map((e) => e.kroName)).toContain(
      'Tag',
    )
  })

  it('formats aliases as a trailing also-known-as line', () => {
    const toggle = kroEntryNamed('Toggle')
    expect(toggle).toBeDefined()
    if (toggle === undefined) return
    expect(formatAlsoKnownAs(toggle.alsoKnownAs)).toContain('Switch (Fluent 2)')
    expect(formatAlsoKnownAs(toggle.alsoKnownAs)).toContain('Toggles (HIG)')
  })
})
