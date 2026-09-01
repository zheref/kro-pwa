/**
 * The share hand-off's domain vocabulary.
 *
 * Two things are worth asserting and neither is about a browser: the copy a
 * surface shows is derived from the outcome rather than assembled in a view
 * (`RC-8`), and the blurb is the one sentence both Triage and Find hand off.
 */
import { describe, expect, it } from 'vitest'
import {
  ShareOutcome,
  endeavorShareText,
  shareOutcomeNotice,
  shareOutcomes,
} from '../ShareOutcome'

describe('shareOutcomeNotice', () => {
  it('says nothing when the sheet appeared and the user decided', () => {
    // Completion and cancel are deliberately not distinguished — canon pops
    // its child on either — so neither needs narrating.
    expect(shareOutcomeNotice(ShareOutcome.shared)).toBeNull()
    expect(shareOutcomeNotice(ShareOutcome.dismissed)).toBeNull()
  })

  it('explains a clipboard fallback, because that is not what the control promised', () => {
    expect(shareOutcomeNotice(ShareOutcome.copied)).toContain('clipboard')
  })

  it('says so when nothing left the app at all', () => {
    expect(shareOutcomeNotice(ShareOutcome.unavailable)).toContain(
      'could not be copied',
    )
  })

  it('answers for every declared outcome — a new case cannot be forgotten', () => {
    for (const outcome of shareOutcomes) {
      expect(() => shareOutcomeNotice(outcome)).not.toThrow()
    }
    expect(shareOutcomes).toHaveLength(4)
  })
})

describe('endeavorShareText', () => {
  it('is canon’s blurb, verbatim', () => {
    expect(endeavorShareText('Draft Q3 product plan')).toBe(
      'I\'d like you to help with "Draft Q3 product plan". (Shared from Kro.)',
    )
  })

  it('keeps a title that already carries quotes readable', () => {
    expect(endeavorShareText('Read "Dune"')).toContain('Read "Dune"')
  })

  it('still produces a sentence for an untitled row', () => {
    expect(endeavorShareText('')).toBe(
      'I\'d like you to help with "". (Shared from Kro.)',
    )
  })
})
