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
  pricingComparison,
  pricingCopy,
  pricingCtaCopy,
  pricingFaqCopy,
  pricingFaqEntries,
  pricingTiers,
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
    pricingCopy,
    pricingTiers,
    pricingComparison,
    pricingFaqCopy,
    pricingFaqEntries,
    pricingCtaCopy,
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
      .replace(/\$(0|4|5|48)\b/g, '')
    expect(text).not.toMatch(/\d/)
    expect(text).not.toMatch(/★|stars? rating|users|customers|testimonial/i)
  })

  it('names only the launch prices — $0, $5 a month, $48 a year, $4 a month — and labels them', () => {
    const prices = allCopy().join('\n').match(/\$\d+/g) ?? []
    expect([...new Set(prices)].sort()).toEqual(['$0', '$4', '$48', '$5'])
    expect(pricingCopy.note).toBe(
      'Launch pricing, subject to change. Plus is not on sale yet.',
    )
    const plus = pricingTiers.find((tier) => tier.id === 'plus')
    expect(plus?.price).toBe('$5')
    expect(plus?.alternate).toBe('or $48 a year, $4 a month')
  })

  it('marks every Plus-only row Planned, and what is not built on any plan Planned on both — never a check', () => {
    const rows = pricingComparison.flatMap((group) => group.rows)
    for (const row of rows) {
      if (row.free === 'excluded') expect(row.plus).toBe('planned')
      if (row.free === 'planned') expect(row.plus).toBe('planned')
      if (row.plus === 'included') expect(row.free).toBe('included')
    }
    // The status quo (`@kro/core` FeatureFlagAssignments) keeps habits and
    // session breaks off, matrix, board and blueprints carry no stage at all,
    // and the Apple apps are on TestFlight, not open.
    for (const feature of [
      'Plan: the Priority Matrix',
      'Habits',
      'Breaks between Sessions',
      'Board',
      'Blueprints',
      'The Apple apps, as they open',
    ]) {
      const row = rows.find((r) => r.feature === feature)
      expect(row, feature).toBeDefined()
      expect(row?.free, feature).toBe('planned')
      expect(row?.plus, feature).toBe('planned')
    }
    expect(
      rows.some((row) => row.free === 'excluded' && row.plus === 'planned'),
    ).toBe(true)
  })

  it('keeps what Free users have today on Free: the four palettes stay, Plus adds more', () => {
    const rows = pricingComparison.flatMap((group) => group.rows)
    expect(
      rows.find((r) => r.feature === 'Light, dark and four palettes'),
    ).toEqual({
      feature: 'Light, dark and four palettes',
      free: 'included',
      plus: 'included',
    })
    expect(
      rows.find((r) => r.feature === 'More palettes and themes')?.free,
    ).toBe('excluded')
    expect(rows.some((r) => /unlimited/i.test(r.feature))).toBe(false)
  })

  it('puts a check only beside tier features that are built; the rest read Planned', () => {
    const free = pricingTiers.find((t) => t.id === 'free')
    const plus = pricingTiers.find((t) => t.id === 'plus')
    const planned = (tier: typeof free) =>
      tier?.features.filter((f) => f.status === 'planned').map((f) => f.label)
    expect(planned(free)).toEqual([
      'Plan: the Priority Matrix',
      'Habits',
      'Breaks between Sessions',
      'Board',
      'Blueprints',
      'The Apple apps, as they open',
    ])
    expect(plus?.features[0]).toEqual({
      label: 'Everything in Free',
      status: 'included',
    })
    expect(planned(plus)).toHaveLength(9)
    expect(plus?.features.at(-1)?.status).toBe('included')
  })

  it('answers "Is Kro free?" with the core free, Plus not on sale, and a link to pricing', () => {
    const free = faqEntries.find((entry) => entry.id === 'free')
    expect(free?.answer).toContain('The core is free on every platform')
    expect(free?.answer).toContain('Plus is not on sale yet')
    expect(free?.link).toEqual({ label: 'See pricing', href: '/pricing' })
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
