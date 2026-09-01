/**
 * The carousel's gesture geometry and the two `datetime-local` conversions.
 *
 * These are the only numbers the Triage render tier owns, so they get the same
 * treatment a Shifter gets: pure inputs, pure outputs, and the ~18% threshold
 * asserted from **both sides** rather than at one convenient value.
 */
import { describe, expect, it } from 'vitest'
import {
  TRIAGE_DISMISS_THRESHOLD_FRACTION,
  TRIAGE_DRAG_MINIMUM_DISTANCE,
  TRIAGE_EDGE_STRIP_WIDTH,
  TRIAGE_RATING_STEPS,
  dateTimeInputValue,
  formatTriageMoment,
  isTriageEdgeStripStart,
  isTriageRatingStepLit,
  parseDateTimeInput,
  triageCarouselCompletes,
  triageCarouselOffset,
} from '../triagePresentation'

describe('the ported constants still say what canon says', () => {
  it('accepts the back-swipe from a 72pt leading strip', () => {
    expect(TRIAGE_EDGE_STRIP_WIDTH).toBe(72)
  })

  it('completes the dismissal past ~18% of the carousel', () => {
    expect(TRIAGE_DISMISS_THRESHOLD_FRACTION).toBeCloseTo(0.18)
  })

  it('ignores a gesture that never travelled 10pt, so a tap stays a tap', () => {
    expect(TRIAGE_DRAG_MINIMUM_DISTANCE).toBe(10)
  })
})

describe('the leading edge strip', () => {
  it('accepts a drag that starts on the very edge (a thumb at x = 0)', () => {
    expect(isTriageEdgeStripStart(0)).toBe(true)
  })

  it("accepts a drag starting at the strip's last pixel", () => {
    expect(isTriageEdgeStripStart(72)).toBe(true)
  })

  it('refuses a drag that starts deeper into the form (a chip row swipe)', () => {
    expect(isTriageEdgeStripStart(73)).toBe(false)
    expect(isTriageEdgeStripStart(200)).toBe(false)
  })
})

describe('the live drag offset', () => {
  it('follows the finger while the drag is inside the carousel', () => {
    expect(triageCarouselOffset(120, 390)).toBe(120)
  })

  it('reads zero for a leftward drag — a back-swipe only goes one way', () => {
    expect(triageCarouselOffset(-80, 390)).toBe(0)
  })

  it("stops at the carousel's trailing edge however far the finger goes", () => {
    expect(triageCarouselOffset(900, 390)).toBe(390)
  })

  it('reads zero when the element has not been measured (jsdom, first paint)', () => {
    expect(triageCarouselOffset(120, 0)).toBe(0)
    expect(triageCarouselOffset(120, Number.NaN)).toBe(0)
  })
})

describe('the ~18% release threshold — both sides of it', () => {
  // 390 is the iPhone-width carousel every screenshot in this PR is taken at.
  const width = 390
  const threshold = width * TRIAGE_DISMISS_THRESHOLD_FRACTION // 70.2px

  it('springs back on a release one pixel short of the threshold', () => {
    expect(triageCarouselCompletes(threshold - 1, width)).toBe(false)
  })

  it('springs back on a release exactly at the threshold — canon compares strictly', () => {
    expect(triageCarouselCompletes(threshold, width)).toBe(false)
  })

  it('dismisses on a release one pixel past the threshold', () => {
    expect(triageCarouselCompletes(threshold + 1, width)).toBe(true)
  })

  it('dismisses a full-width swipe, and refuses a leftward one', () => {
    expect(triageCarouselCompletes(width, width)).toBe(true)
    expect(triageCarouselCompletes(-width, width)).toBe(false)
  })

  it('never dismisses on an unmeasured carousel — a zero width decides nothing', () => {
    expect(triageCarouselCompletes(400, 0)).toBe(false)
  })

  it('scales with the surface: the desktop popover needs fewer pixels', () => {
    // The Inbox popover is 560 wide; 0.18 of it is 100.8px.
    expect(triageCarouselCompletes(101, 560)).toBe(true)
    expect(triageCarouselCompletes(100, 560)).toBe(false)
  })
})

describe('the rating rows', () => {
  it("draws five steps, as canon's ForEach(1...5) does", () => {
    expect(TRIAGE_RATING_STEPS).toEqual([1, 2, 3, 4, 5])
  })

  it('lights every step up to the current rating (3 rockets lights three)', () => {
    expect(
      TRIAGE_RATING_STEPS.filter((s) => isTriageRatingStepLit(3, s)),
    ).toEqual([1, 2, 3])
  })

  it('lights nothing when the user has cleared the rating', () => {
    expect(
      TRIAGE_RATING_STEPS.some((s) => isTriageRatingStepLit(null, s)),
    ).toBe(false)
  })

  it('lights all five at the top of the scale', () => {
    expect(TRIAGE_RATING_STEPS.every((s) => isTriageRatingStepLit(5, s))).toBe(
      true,
    )
  })
})

describe("the datetime-local control's wire format", () => {
  it('writes local components, never a UTC instant', () => {
    // A `toISOString()` port would shift this by the runner's offset, which is
    // exactly the bug this function exists to not have.
    expect(dateTimeInputValue(new Date(2026, 2, 17, 9, 5))).toBe(
      '2026-03-17T09:05',
    )
  })

  it('pads a single-digit month, day, hour and minute', () => {
    expect(dateTimeInputValue(new Date(2026, 0, 2, 3, 4))).toBe(
      '2026-01-02T03:04',
    )
  })

  it('round-trips a value the control emitted', () => {
    const value = '2026-03-19T17:30'
    const parsed = parseDateTimeInput(value)
    expect(parsed).not.toBeNull()
    expect(dateTimeInputValue(parsed as Date)).toBe(value)
  })

  it('reads a mid-edit empty field as "nothing picked", never an Invalid Date', () => {
    expect(parseDateTimeInput('')).toBeNull()
    expect(parseDateTimeInput('2026-03-19')).toBeNull()
    expect(parseDateTimeInput('not a date')).toBeNull()
  })

  it('zeroes seconds so a preset comparison stays exact', () => {
    const parsed = parseDateTimeInput('2026-03-19T17:30')
    expect(parsed?.getSeconds()).toBe(0)
    expect(parsed?.getMilliseconds()).toBe(0)
  })
})

describe('the moment caption under a picked date', () => {
  it('names the weekday and the time a user would read back', () => {
    const caption = formatTriageMoment(new Date(2026, 2, 19, 9, 0), 'en-US')
    expect(caption).toContain('Mar')
    expect(caption).toContain('19')
  })

  it('answers for a midnight boundary without dropping the day', () => {
    const caption = formatTriageMoment(new Date(2026, 2, 20, 0, 0), 'en-US')
    expect(caption).toContain('20')
  })

  it('follows the locale it is given', () => {
    const caption = formatTriageMoment(new Date(2026, 2, 19, 9, 0), 'es-ES')
    expect(caption.length).toBeGreaterThan(0)
  })
})
