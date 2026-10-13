import { describe, expect, it } from 'vitest'
import {
  LANDING_OBSERVED_IDS,
  LANDING_SECTION_IDS,
  PRICING_SECTION_IDS,
  headingIdFor,
  landingSectionHref,
  marketingNavLinks,
  sectionHref,
} from '../LandingSections'

describe('LANDING_SECTION_IDS', () => {
  it('uses the ids the brief names', () => {
    expect(LANDING_SECTION_IDS).toMatchObject({
      top: 'top',
      loop: 'the-loop',
      focus: 'focus',
      platforms: 'platforms',
      federation: 'federation',
      privacy: 'privacy',
      earlyAccess: 'early-access',
      faq: 'faq',
    })
  })

  it('has no duplicate ids — two sections cannot share an anchor', () => {
    const ids = Object.values(LANDING_SECTION_IDS)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('observes every section, once, in document order', () => {
    expect([...LANDING_OBSERVED_IDS].sort()).toEqual(
      Object.values(LANDING_SECTION_IDS).sort(),
    )
    expect(LANDING_OBSERVED_IDS[0]).toBe('top')
    expect(LANDING_OBSERVED_IDS.indexOf('early-access')).toBeLessThan(
      LANDING_OBSERVED_IDS.indexOf('faq'),
    )
  })
})

describe('sectionHref / headingIdFor', () => {
  it('prefixes a hash', () => {
    expect(sectionHref('the-loop')).toBe('#the-loop')
  })

  it('derives a heading id from the section id', () => {
    expect(headingIdFor('faq')).toBe('faq-title')
  })

  it('never collides with a section id', () => {
    for (const id of Object.values(LANDING_SECTION_IDS)) {
      expect(Object.values(LANDING_SECTION_IDS)).not.toContain(headingIdFor(id))
    }
  })
})

describe('landingSectionHref', () => {
  it('is an in-page anchor on the landing itself', () => {
    expect(landingSectionHref('faq', 'landing')).toBe('#faq')
  })

  it('leads back to the landing from the pricing page', () => {
    expect(landingSectionHref('early-access', 'pricing')).toBe('/#early-access')
  })

  it('keeps the top anchor addressable from anywhere', () => {
    expect(landingSectionHref('top', 'pricing')).toBe('/#top')
  })
})

describe('marketingNavLinks', () => {
  it('lists the landing sections, then Pricing, on the landing', () => {
    expect(marketingNavLinks('landing').map((link) => link.label)).toEqual([
      'The loop',
      'Sessions',
      'Platforms',
      'Privacy',
      'FAQ',
      'Pricing',
    ])
  })

  it('points the section links back at the landing from the pricing page', () => {
    const links = marketingNavLinks('pricing')
    expect(links.find((link) => link.label === 'FAQ')?.href).toBe('/#faq')
    expect(links.find((link) => link.label === 'Pricing')?.href).toBe(
      '/pricing',
    )
  })

  it('gives every link a unique id, so only one can be current', () => {
    const ids = marketingNavLinks('landing').map((link) => link.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('PRICING_SECTION_IDS', () => {
  it('never reuses a landing id — the landing observer cannot mistake a pricing band', () => {
    for (const id of Object.values(PRICING_SECTION_IDS))
      expect(Object.values(LANDING_SECTION_IDS)).not.toContain(id)
  })

  it('has no duplicate ids', () => {
    const ids = Object.values(PRICING_SECTION_IDS)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('derives heading ids that collide with no anchor', () => {
    for (const id of Object.values(PRICING_SECTION_IDS))
      expect(Object.values(PRICING_SECTION_IDS)).not.toContain(headingIdFor(id))
  })
})
