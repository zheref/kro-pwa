import {
  EndeavorKind,
  EndeavorStatus,
  endeavorHosts,
  endeavorKinds,
  endeavorStatuses,
} from '@kro/core'
import { describe, expect, it } from 'vitest'
import { isMappedSymbol } from './endeavorIcons'
import {
  hostGlyph,
  hostTint,
  kindGlyph,
  kindShortLabel,
  kindTint,
  statusGlyph,
  statusShortLabel,
  statusTint,
} from './endeavorProjections'

describe('kind projections', () => {
  it('abbreviates calendarEvent to "Event" on a row — canon’s shortLabel, not displayName', () => {
    expect(kindShortLabel(EndeavorKind.calendarEvent)).toBe('Event')
  })

  it('gives every kind a glyph the icon map can draw', () => {
    for (const kind of endeavorKinds) {
      expect(isMappedSymbol(kindGlyph(kind)), `${kind} has no drawing`).toBe(true)
    }
  })

  it('gives every kind its own ROLE, even where two roles resolve to one colour', () => {
    // `kindBehavior` and `kindReminder` both alias the reminder orange in
    // `tokens.css` today. They stay two roles anyway: re-tinting one of them is
    // then a one-line edit in the stylesheet rather than a change here.
    const tints = endeavorKinds.map(kindTint)
    expect(new Set(tints).size).toBe(endeavorKinds.length)
  })
})

describe('status projections', () => {
  it('gives every status a glyph, so status never depends on colour alone', () => {
    for (const status of endeavorStatuses) {
      expect(isMappedSymbol(statusGlyph(status)), `${status} has no drawing`).toBe(true)
    }
  })

  it('gives every status a non-empty label', () => {
    for (const status of endeavorStatuses) {
      expect(statusShortLabel(status).length).toBeGreaterThan(0)
    }
  })

  it('collapses closed and skipped onto the neutral chip, as canon does', () => {
    expect(statusTint(EndeavorStatus.closed)).toBe('chipNeutral')
    expect(statusTint(EndeavorStatus.skipped)).toBe('chipNeutral')
  })

  it('keeps QA all-caps — the one label that is not title case', () => {
    expect(statusShortLabel(EndeavorStatus.qa)).toBe('QA')
  })

  it('resolves every status to a semantic role rather than a raw colour', () => {
    for (const status of endeavorStatuses) {
      expect(statusTint(status)).toMatch(/^(status|chip)/)
    }
  })
})

describe('host projections', () => {
  it('reads the glyph from the DOMAIN’s icon representation, never a second list', () => {
    // Adding a host means editing `@kro/core`, and nothing here. This test is
    // what proves that: it walks the domain's own case list.
    for (const host of endeavorHosts) {
      expect(isMappedSymbol(hostGlyph(host)), `${host} has no drawing`).toBe(true)
    }
  })

  it('gives every host its own tint, so a multi-host endeavor’s chips separate', () => {
    const tints = endeavorHosts.map(hostTint)
    expect(new Set(tints).size).toBe(endeavorHosts.length)
  })
})
