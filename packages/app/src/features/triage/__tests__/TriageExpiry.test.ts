import { describe, expect, it } from 'vitest'
import {
  TRIAGE_DEFAULT_FIRST_WEEKDAY,
  TriageExpiryPreset,
  defaultTriageExpiry,
  isTriageExpiryCustom,
  orderedTriageExpiryTokens,
  selectedTriageExpiryToken,
  triageExpiryAfterSelection,
  triageExpiryInvariantHolds,
  triageExpiryPresetDate,
  triageExpiryPresetLabel,
  triageExpiryPresets,
  triageExpiryTokens,
} from '../TriageExpiry'
import { triageMockAt } from '../TriageMocks'

/** Tuesday 17 March 2026, 14:30 — mid-week and mid-afternoon on purpose. */
const scheduled = triageMockAt(17, 14, 30)

describe('triageExpiryPresetLabel', () => {
  it('spells the hour preset out — "An hour later", never "1h later"', () => {
    expect(triageExpiryPresetLabel(TriageExpiryPreset.oneHour)).toBe(
      'An hour later',
    )
  })

  it('abbreviates the two calendar presets — EoD and EoW', () => {
    expect(triageExpiryPresetLabel(TriageExpiryPreset.endOfDay)).toBe('EoD')
    expect(triageExpiryPresetLabel(TriageExpiryPreset.endOfWeek)).toBe('EoW')
  })

  it('labels the zero-offset preset "At the moment"', () => {
    expect(triageExpiryPresetLabel(TriageExpiryPreset.atTheMoment)).toBe(
      'At the moment',
    )
  })

  it('offers exactly six presets, in canon declaration order', () => {
    expect(triageExpiryPresets).toEqual([
      TriageExpiryPreset.atTheMoment,
      TriageExpiryPreset.oneHour,
      TriageExpiryPreset.twoHours,
      TriageExpiryPreset.fourHours,
      TriageExpiryPreset.endOfDay,
      TriageExpiryPreset.endOfWeek,
    ])
  })
})

describe('triageExpiryPresetDate — offsets from the scheduled date', () => {
  it.each([
    [TriageExpiryPreset.atTheMoment, triageMockAt(17, 14, 30)],
    [TriageExpiryPreset.oneHour, triageMockAt(17, 15, 30)],
    [TriageExpiryPreset.twoHours, triageMockAt(17, 16, 30)],
    [TriageExpiryPreset.fourHours, triageMockAt(17, 18, 30)],
    [TriageExpiryPreset.endOfDay, triageMockAt(17, 23, 59)],
    [TriageExpiryPreset.endOfWeek, triageMockAt(21, 23, 59)],
  ] as const)('%s on Tuesday 14:30 resolves to %s', (preset, expected) => {
    expect(triageExpiryPresetDate(preset, scheduled)).toEqual(expected)
  })

  it('computes from the SCHEDULED date, never from "now"', () => {
    const nextMonth = new Date(2026, 3, 8, 9, 0, 0)
    expect(
      triageExpiryPresetDate(TriageExpiryPreset.oneHour, nextMonth),
    ).toEqual(new Date(2026, 3, 8, 10, 0, 0))
  })

  it('rolls an hour offset over midnight rather than clamping to the day', () => {
    const lateNight = triageMockAt(17, 23, 30)
    expect(
      triageExpiryPresetDate(TriageExpiryPreset.twoHours, lateNight),
    ).toEqual(triageMockAt(18, 1, 30))
  })

  it('drops seconds on EoD — 23:59:00, not 23:59:59', () => {
    const withSeconds = triageMockAt(17, 14, 30, 47)
    const eod = triageExpiryPresetDate(TriageExpiryPreset.endOfDay, withSeconds)
    expect(eod.getSeconds()).toBe(0)
    expect(eod.getMilliseconds()).toBe(0)
  })
})

describe('EoW across a week boundary', () => {
  // The calendar week containing 17 March 2026 (a Tuesday) runs Sunday the
  // 15th through Saturday the 21st.
  it('lands on Saturday for a Tuesday — the same week', () => {
    expect(
      triageExpiryPresetDate(TriageExpiryPreset.endOfWeek, triageMockAt(17, 9)),
    ).toEqual(triageMockAt(21, 23, 59))
  })

  it('lands on the SAME Saturday when the scheduled date already is Saturday', () => {
    expect(
      triageExpiryPresetDate(TriageExpiryPreset.endOfWeek, triageMockAt(21, 8)),
    ).toEqual(triageMockAt(21, 23, 59))
  })

  it('crosses into the NEXT week for the Sunday that starts it', () => {
    expect(
      triageExpiryPresetDate(TriageExpiryPreset.endOfWeek, triageMockAt(22, 8)),
    ).toEqual(triageMockAt(28, 23, 59))
  })

  it('lands on the same Saturday for the Sunday that opens this week', () => {
    expect(
      triageExpiryPresetDate(TriageExpiryPreset.endOfWeek, triageMockAt(15, 8)),
    ).toEqual(triageMockAt(21, 23, 59))
  })

  it('defaults the week boundary to Sunday, matching Calendar.current', () => {
    expect(TRIAGE_DEFAULT_FIRST_WEEKDAY).toBe(0)
    expect(
      triageExpiryPresetDate(
        TriageExpiryPreset.endOfWeek,
        triageMockAt(17, 9),
        {
          firstWeekday: TRIAGE_DEFAULT_FIRST_WEEKDAY,
        },
      ),
    ).toEqual(
      triageExpiryPresetDate(TriageExpiryPreset.endOfWeek, triageMockAt(17, 9)),
    )
  })

  it('moves the boundary with an explicit Monday-start week', () => {
    // With a Monday-start week, Sunday the 22nd closes the 16th–22nd week
    // rather than opening the next one.
    expect(
      triageExpiryPresetDate(
        TriageExpiryPreset.endOfWeek,
        triageMockAt(22, 8),
        { firstWeekday: 1 },
      ),
    ).toEqual(triageMockAt(22, 23, 59))
  })
})

describe('defaultTriageExpiry', () => {
  it('is one hour after the scheduled date — the seed every path uses', () => {
    expect(defaultTriageExpiry(scheduled)).toEqual(triageMockAt(17, 15, 30))
  })

  it('is exactly the "An hour later" preset, so that pill lights up', () => {
    expect(defaultTriageExpiry(scheduled)).toEqual(
      triageExpiryPresetDate(TriageExpiryPreset.oneHour, scheduled),
    )
  })

  it('has nothing to anchor on without a scheduled date', () => {
    expect(defaultTriageExpiry(null)).toBeNull()
  })
})

describe('triageExpiryAfterSelection — the invariant', () => {
  it('snaps a cleared expiry back to due + 1h while a date is in place', () => {
    expect(triageExpiryAfterSelection({ picked: null, scheduled })).toEqual(
      triageMockAt(17, 15, 30),
    )
  })

  it('lets expiry be cleared when there is no scheduled date to imply one', () => {
    expect(
      triageExpiryAfterSelection({ picked: null, scheduled: null }),
    ).toBeNull()
  })

  it('passes an explicit pick straight through — the user dials a custom moment', () => {
    const custom = triageMockAt(19, 8, 45)
    expect(triageExpiryAfterSelection({ picked: custom, scheduled })).toBe(
      custom,
    )
  })

  it('allows an expiry with no scheduled date — the permitted one-sided case', () => {
    const custom = triageMockAt(19, 8, 45)
    expect(
      triageExpiryAfterSelection({ picked: custom, scheduled: null }),
    ).toBe(custom)
  })
})

describe('triageExpiryInvariantHolds', () => {
  it('holds when a scheduled date carries an expiry', () => {
    expect(
      triageExpiryInvariantHolds({ scheduled, expiry: triageMockAt(17, 16) }),
    ).toBe(true)
  })

  it('is violated by a scheduled date with no expiry', () => {
    expect(triageExpiryInvariantHolds({ scheduled, expiry: null })).toBe(false)
  })

  it('holds for an expiry with no scheduled date — explicitly permitted', () => {
    expect(
      triageExpiryInvariantHolds({
        scheduled: null,
        expiry: triageMockAt(17, 16),
      }),
    ).toBe(true)
  })

  it('holds for a form with neither', () => {
    expect(triageExpiryInvariantHolds({ scheduled: null, expiry: null })).toBe(
      true,
    )
  })
})

describe('selectedTriageExpiryToken', () => {
  it('lights the matching preset — an expiry exactly two hours out', () => {
    expect(
      selectedTriageExpiryToken({
        scheduled,
        expiry: triageMockAt(17, 16, 30),
      }),
    ).toEqual({ kind: 'preset', preset: TriageExpiryPreset.twoHours })
  })

  it('lights Custom for a bespoke moment no preset produces', () => {
    expect(
      selectedTriageExpiryToken({
        scheduled,
        expiry: triageMockAt(17, 16, 31),
      }),
    ).toEqual({ kind: 'custom' })
  })

  it('lights nothing when there is no expiry to attribute', () => {
    expect(selectedTriageExpiryToken({ scheduled, expiry: null })).toBeNull()
  })

  it('lights nothing with no scheduled date — there is no anchor to match on', () => {
    expect(
      selectedTriageExpiryToken({
        scheduled: null,
        expiry: triageMockAt(17, 16, 30),
      }),
    ).toBeNull()
  })

  it('prefers the FIRST matching preset when two coincide', () => {
    // At 23:59 on a Saturday, EoD and EoW compute the same instant; canon's
    // `first(where:)` picks the earlier declaration, EoD.
    const saturdayLate = triageMockAt(21, 23, 59)
    expect(
      selectedTriageExpiryToken({
        scheduled: saturdayLate,
        expiry: saturdayLate,
      }),
    ).toEqual({ kind: 'preset', preset: TriageExpiryPreset.atTheMoment })
  })
})

describe('isTriageExpiryCustom', () => {
  it('is lit for a bespoke moment', () => {
    expect(
      isTriageExpiryCustom({ scheduled, expiry: triageMockAt(17, 16, 31) }),
    ).toBe(true)
  })

  it('is dark when a preset matches', () => {
    expect(
      isTriageExpiryCustom({ scheduled, expiry: triageMockAt(17, 15, 30) }),
    ).toBe(false)
  })

  it('is dark with no expiry at all', () => {
    expect(isTriageExpiryCustom({ scheduled, expiry: null })).toBe(false)
  })
})

describe('orderedTriageExpiryTokens — selected-first ordering', () => {
  it('reads as declared when nothing is selected', () => {
    expect(orderedTriageExpiryTokens({ scheduled, expiry: null })).toEqual(
      triageExpiryTokens,
    )
  })

  it('jumps the matching pill to the front — EoD selected', () => {
    const ordered = orderedTriageExpiryTokens({
      scheduled,
      expiry: triageMockAt(17, 23, 59),
    })

    expect(ordered[0]).toEqual({
      kind: 'preset',
      preset: TriageExpiryPreset.endOfDay,
    })
  })

  it('keeps every other pill in its declared order behind the selection', () => {
    const ordered = orderedTriageExpiryTokens({
      scheduled,
      expiry: triageMockAt(17, 18, 30),
    })

    expect(ordered).toEqual([
      { kind: 'preset', preset: TriageExpiryPreset.fourHours },
      { kind: 'preset', preset: TriageExpiryPreset.atTheMoment },
      { kind: 'preset', preset: TriageExpiryPreset.oneHour },
      { kind: 'preset', preset: TriageExpiryPreset.twoHours },
      { kind: 'preset', preset: TriageExpiryPreset.endOfDay },
      { kind: 'preset', preset: TriageExpiryPreset.endOfWeek },
      { kind: 'custom' },
    ])
  })

  it('jumps the Custom pill to the front when the picker lands off-preset', () => {
    const ordered = orderedTriageExpiryTokens({
      scheduled,
      expiry: triageMockAt(17, 16, 31),
    })

    expect(ordered[0]).toEqual({ kind: 'custom' })
    expect(ordered).toHaveLength(triageExpiryTokens.length)
  })

  it('never drops or duplicates a pill while reordering', () => {
    const ordered = orderedTriageExpiryTokens({
      scheduled,
      expiry: triageMockAt(17, 14, 30),
    })

    expect(ordered).toHaveLength(triageExpiryTokens.length)
    expect(new Set(ordered.map((token) => JSON.stringify(token))).size).toBe(
      triageExpiryTokens.length,
    )
  })
})
