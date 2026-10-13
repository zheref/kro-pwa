import { describe, expect, it } from 'vitest'
import {
  faqEntries,
  federationCards,
  finalCtaCopy,
  footerCopy,
  heroCopy,
  loopChapters,
  platformCards,
  platformsCopy,
  privacyCards,
} from '../LandingCopy'

/** Every string the page says, flattened. */
const allCopy = (): string[] => {
  const out: string[] = []
  const walk = (value: unknown) => {
    if (typeof value === 'string') out.push(value)
    else if (Array.isArray(value)) for (const v of value) walk(v)
    else if (value !== null && typeof value === 'object')
      for (const v of Object.values(value)) walk(v)
  }
  for (const group of [
    heroCopy,
    loopChapters,
    platformCards,
    platformsCopy,
    federationCards,
    privacyCards,
    faqEntries,
    finalCtaCopy,
    footerCopy,
  ])
    walk(group)
  return out
}

describe('landing copy', () => {
  it('says the canon lines verbatim', () => {
    const text = allCopy().join('\n')
    for (const line of [
      'Plan, Do and Earn, in one personal execution system',
      'Available soon — vote to get it sooner',
      'We never send what you write',
      "Counts, timings, the page you are on and your browser's size and language — never the words you write.",
      'the one place where a thought becomes an endeavor',
      'A closed ring means you’ve finished everything the day asked of you.',
      'Manage your time, like the gods',
    ]) {
      expect(text).toContain(line)
    }
  })

  it('invents no number, count, rating or testimonial — the only figures allowed are the year and chapter numerals', () => {
    const text = allCopy()
      .join('\n')
      .replace(/© 2026/g, '')
      .replace(/^[1-5] · /gm, '')
    expect(text).not.toMatch(/\d/)
    expect(text).not.toMatch(/★|stars? rating|users|customers|testimonial/i)
  })

  it('has the five loop chapters in order and six FAQ entries', () => {
    expect(loopChapters.map((c) => c.id)).toEqual([
      'capture',
      'triage',
      'plan',
      'do',
      'earn',
    ])
    expect(faqEntries).toHaveLength(6)
    expect(new Set(faqEntries.map((f) => f.id)).size).toBe(6)
  })

  it('gives each platform an honest status and exactly one live platform', () => {
    expect(
      platformCards.filter((p) => p.status === 'live').map((p) => p.platform),
    ).toEqual(['web'])
    expect(platformCards.find((p) => p.platform === 'android')?.status).toBe(
      'in-progress',
    )
    expect(platformCards.find((p) => p.platform === 'windows')?.status).toBe(
      'coming',
    )
  })

  it('lists four available integrations and four coming next, text only', () => {
    expect(
      federationCards.filter((c) => c.status === 'available'),
    ).toHaveLength(4)
    expect(
      federationCards.filter((c) => c.status === 'next').map((c) => c.title),
    ).toEqual(['Google Tasks', 'Microsoft To Do', 'GitHub', 'Jira'])
  })
})
