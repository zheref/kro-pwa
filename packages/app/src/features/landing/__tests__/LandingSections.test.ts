import { describe, expect, it } from 'vitest'
import {
  LANDING_OBSERVED_IDS,
  LANDING_SECTION_IDS,
  headingIdFor,
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
