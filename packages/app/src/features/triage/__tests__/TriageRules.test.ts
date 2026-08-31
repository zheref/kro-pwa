import { EisenhowerQuadrant, eisenhowerQuadrants } from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  IMPORTANT_VALUE_THRESHOLD,
  MAXIMUM_TRIAGE_RATING,
  MAXIMUM_TRIAGE_REWARD_POINTS,
  MINIMUM_TRIAGE_RATING,
  MINIMUM_TRIAGE_REWARD_POINTS,
  TRIAGE_DEFAULT_RATING,
  TRIAGE_DEFAULT_REWARD_POINTS,
  TRIAGE_REWARD_STEP_THRESHOLD,
  TriageBlocker,
  TriageSecondaryAction,
  canConfirmTriage,
  clampTriageRewardPoints,
  quadrantPromotedByValue,
  rewardScaledForEffortChange,
  triageBlockedReason,
  triageBlocker,
  triageBlockerReason,
  triageDecisionFrom,
  triageDurationChipLabel,
  triageDurationSeconds,
  triageDurationSelection,
  triageEffortLabel,
  triageEffortLabels,
  triagePrimaryActionLabel,
  triageRatingSelection,
  triageRewardDecremented,
  triageRewardIncremented,
  triageRewardStep,
  triageSecondaryAction,
  triageSecondaryActionMatches,
  triageShareText,
  triageValueLabel,
  triageValueLabels,
  valueBumpedByQuadrant,
} from '../TriageRules'

// ---------------------------------------------------------------------------
// Reward stepper — ±5 below 50, ±10 at 50+, bounds 1…999
// ---------------------------------------------------------------------------

describe('triageRewardStep', () => {
  it('offers the fine grain just below the threshold — a 49-point task', () => {
    expect(triageRewardStep(49)).toBe(5)
  })

  it('widens exactly AT the threshold, not past it — a 50-point task', () => {
    expect(triageRewardStep(50)).toBe(10)
  })

  it('keeps the wide grain above the threshold — a 120-point task', () => {
    expect(triageRewardStep(120)).toBe(10)
  })

  it('uses the fine grain at the floor — a 1-point task', () => {
    expect(triageRewardStep(MINIMUM_TRIAGE_REWARD_POINTS)).toBe(5)
  })
})

describe('triageRewardIncremented', () => {
  it('adds 5 from the default seed — the user nudges 10 up to 15', () => {
    expect(triageRewardIncremented(TRIAGE_DEFAULT_REWARD_POINTS)).toBe(15)
  })

  it('adds 10 once the count reaches the threshold — 50 becomes 60', () => {
    expect(triageRewardIncremented(50)).toBe(60)
  })

  it('crosses the threshold with the OLD grain — 45 becomes 50, not 55', () => {
    expect(triageRewardIncremented(45)).toBe(50)
  })

  it('clamps at the ceiling rather than overflowing — 995 stays 999', () => {
    expect(triageRewardIncremented(995)).toBe(MAXIMUM_TRIAGE_REWARD_POINTS)
  })
})

describe('triageRewardDecremented', () => {
  it('subtracts 5 below the threshold — 15 becomes 10', () => {
    expect(triageRewardDecremented(15)).toBe(10)
  })

  it('reads the grain from the CURRENT value — 50 drops by 10, to 40', () => {
    expect(triageRewardDecremented(50)).toBe(40)
  })

  it('clamps at the floor rather than going to zero — 3 stays 1', () => {
    expect(triageRewardDecremented(3)).toBe(MINIMUM_TRIAGE_REWARD_POINTS)
  })

  it('is a no-op at the floor — 1 stays 1 however often it is pressed', () => {
    expect(triageRewardDecremented(MINIMUM_TRIAGE_REWARD_POINTS)).toBe(1)
  })
})

describe('clampTriageRewardPoints', () => {
  it('leaves a value inside the range alone — a 42-point task', () => {
    expect(clampTriageRewardPoints(42)).toBe(42)
  })

  it('raises anything below the floor — a pasted 0 becomes 1', () => {
    expect(clampTriageRewardPoints(0)).toBe(1)
  })

  it('lowers anything above the ceiling — a pasted 5000 becomes 999', () => {
    expect(clampTriageRewardPoints(5000)).toBe(999)
  })

  it('truncates a fractional value rather than rounding it — 12.9 becomes 12', () => {
    expect(clampTriageRewardPoints(12.9)).toBe(12)
  })
})

// ---------------------------------------------------------------------------
// The two ratings
// ---------------------------------------------------------------------------

describe('triageValueLabel / triageEffortLabel', () => {
  it('names the default rating on both rows — Trivial and Autopilot', () => {
    expect(triageValueLabel(TRIAGE_DEFAULT_RATING)).toBe('Trivial')
    expect(triageEffortLabel(TRIAGE_DEFAULT_RATING)).toBe('Autopilot')
  })

  it('names the top rating on both rows — Life-changing and Grueling', () => {
    expect(triageValueLabel(5)).toBe('Life-changing')
    expect(triageEffortLabel(5)).toBe('Grueling')
  })

  it('has nothing to say for a cleared rating — the row shows no descriptor', () => {
    expect(triageValueLabel(null)).toBeNull()
    expect(triageEffortLabel(null)).toBeNull()
  })

  it('has nothing to say for a rating outside 1…5 — a corrupt stored value', () => {
    expect(triageValueLabel(9)).toBeNull()
    expect(triageEffortLabel(0)).toBeNull()
  })
})

describe('triageRatingSelection', () => {
  it('selects a different step — the user raises Value from 1 to 4', () => {
    expect(triageRatingSelection(1, 4)).toBe(4)
  })

  it('clears when the current rating is tapped again — canon tap-to-clear', () => {
    expect(triageRatingSelection(3, 3)).toBeNull()
  })

  it('selects from cleared — the user re-rates after clearing', () => {
    expect(triageRatingSelection(null, 2)).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Value → importance, exhaustively
// ---------------------------------------------------------------------------

describe('quadrantPromotedByValue', () => {
  const quadrantsAndNull = [null, ...eisenhowerQuadrants] as const

  it.each([
    // [current, value, expected, scenario]
    [
      null,
      3,
      EisenhowerQuadrant.decide,
      'no quadrant yet defaults to Schedule',
    ],
    [
      null,
      5,
      EisenhowerQuadrant.decide,
      'a top rating with no quadrant is still Schedule',
    ],
    [
      EisenhowerQuadrant.delegate,
      3,
      EisenhowerQuadrant.prioritize,
      'Delegate promotes to Prioritize, preserving urgency',
    ],
    [
      EisenhowerQuadrant.delete,
      3,
      EisenhowerQuadrant.decide,
      'Archive promotes to Schedule, preserving non-urgency',
    ],
    [
      EisenhowerQuadrant.prioritize,
      4,
      EisenhowerQuadrant.prioritize,
      'an already-Important quadrant is left alone',
    ],
    [
      EisenhowerQuadrant.decide,
      5,
      EisenhowerQuadrant.decide,
      'Schedule is already in the Important row',
    ],
  ] as const)(
    'quadrant %s with value %s → %s (%s)',
    (current, value, expected, _scenario) => {
      expect(quadrantPromotedByValue(current, value)).toBe(expected)
    },
  )

  it.each(quadrantsAndNull)(
    'a value below the threshold never changes the quadrant — %s with 2 rockets',
    (current) => {
      expect(quadrantPromotedByValue(current, 2)).toBe(current)
      expect(quadrantPromotedByValue(current, 1)).toBe(current)
    },
  )

  it.each(quadrantsAndNull)(
    'a CLEARED value never changes the quadrant — %s after tapping the lit rocket',
    (current) => {
      expect(quadrantPromotedByValue(current, null)).toBe(current)
    },
  )

  it('never enforces the reverse direction — lowering value keeps Prioritize', () => {
    const lowered = quadrantPromotedByValue(EisenhowerQuadrant.prioritize, 1)
    expect(lowered).toBe(EisenhowerQuadrant.prioritize)
  })
})

// ---------------------------------------------------------------------------
// Importance → value, exhaustively
// ---------------------------------------------------------------------------

describe('valueBumpedByQuadrant', () => {
  it.each([
    [EisenhowerQuadrant.prioritize, null, 3],
    [EisenhowerQuadrant.prioritize, 1, 3],
    [EisenhowerQuadrant.prioritize, 2, 3],
    [EisenhowerQuadrant.prioritize, 3, 3],
    [EisenhowerQuadrant.prioritize, 5, 5],
    [EisenhowerQuadrant.decide, null, 3],
    [EisenhowerQuadrant.decide, 1, 3],
    [EisenhowerQuadrant.decide, 4, 4],
  ] as const)(
    'an Important quadrant (%s) raises a value of %s to %s',
    (quadrant, value, expected) => {
      expect(valueBumpedByQuadrant(quadrant, value)).toBe(expected)
    },
  )

  it.each([
    [EisenhowerQuadrant.delegate, 1],
    [EisenhowerQuadrant.delegate, 5],
    [EisenhowerQuadrant.delete, 2],
  ] as const)(
    'a Not-Important quadrant (%s) leaves a value of %s exactly as it was',
    (quadrant, value) => {
      expect(valueBumpedByQuadrant(quadrant, value)).toBe(value)
    },
  )

  it('a Not-Important quadrant leaves a CLEARED value cleared', () => {
    expect(valueBumpedByQuadrant(EisenhowerQuadrant.delegate, null)).toBeNull()
    expect(valueBumpedByQuadrant(EisenhowerQuadrant.delete, null)).toBeNull()
  })

  it('treats a cleared value as 0, so an Important quadrant bumps it to 3', () => {
    expect(valueBumpedByQuadrant(EisenhowerQuadrant.decide, null)).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// Effort × reward — the full transition matrix, both directions
// ---------------------------------------------------------------------------

describe('rewardScaledForEffortChange', () => {
  it('doubles on the doc’s worked example — 2 fires → 4 fires doubles reward', () => {
    expect(
      rewardScaledForEffortChange({
        rewardPoints: 10,
        previousEffort: 2,
        nextEffort: 4,
      }),
    ).toBe(20)
  })

  it('applies 1.5× on the doc’s second worked example — 2 fires → 3 fires', () => {
    expect(
      rewardScaledForEffortChange({
        rewardPoints: 10,
        previousEffort: 2,
        nextEffort: 3,
      }),
    ).toBe(15)
  })

  it('rounds a fractional product half up — 15 at 2 → 3 becomes 23', () => {
    expect(
      rewardScaledForEffortChange({
        rewardPoints: 15,
        previousEffort: 2,
        nextEffort: 3,
      }),
    ).toBe(23)
  })

  /**
   * The exhaustive increase matrix: every ordered pair 1…5 where next > previous,
   * against a reward of 10, so a change to the ratio or the rounding shows up
   * as a table diff rather than as one failing example.
   */
  const increases: readonly (readonly [number, number, number])[] = [
    [1, 2, 20],
    [1, 3, 30],
    [1, 4, 40],
    [1, 5, 50],
    [2, 3, 15],
    [2, 4, 20],
    [2, 5, 25],
    [3, 4, 13],
    [3, 5, 17],
    [4, 5, 13],
  ]

  it.each(increases)(
    'effort %s → %s multiplies a 10-point reward to %s',
    (previousEffort, nextEffort, expected) => {
      expect(
        rewardScaledForEffortChange({
          rewardPoints: 10,
          previousEffort,
          nextEffort,
        }),
      ).toBe(expected)
    },
  )

  /** Every ordered pair where next <= previous. Reward must not move. */
  const nonIncreases: readonly (readonly [number, number])[] = [
    [1, 1],
    [2, 1],
    [2, 2],
    [3, 1],
    [3, 2],
    [3, 3],
    [4, 1],
    [4, 3],
    [4, 4],
    [5, 1],
    [5, 4],
    [5, 5],
  ]

  it.each(nonIncreases)(
    'effort %s → %s leaves the reward untouched — lowering never costs points',
    (previousEffort, nextEffort) => {
      expect(
        rewardScaledForEffortChange({
          rewardPoints: 37,
          previousEffort,
          nextEffort,
        }),
      ).toBe(37)
    },
  )

  it.each([1, 2, 3, 4, 5])(
    'a cleared PREVIOUS rating gives no ratio to take — setting %s leaves reward alone',
    (nextEffort) => {
      expect(
        rewardScaledForEffortChange({
          rewardPoints: 40,
          previousEffort: null,
          nextEffort,
        }),
      ).toBe(40)
    },
  )

  it.each([1, 2, 3, 4, 5])(
    'clearing the rating from %s leaves the reward alone',
    (previousEffort) => {
      expect(
        rewardScaledForEffortChange({
          rewardPoints: 40,
          previousEffort,
          nextEffort: null,
        }),
      ).toBe(40)
    },
  )

  it('clamps at the ceiling — a 500-point task taken from 1 fire to 5', () => {
    expect(
      rewardScaledForEffortChange({
        rewardPoints: 500,
        previousEffort: 1,
        nextEffort: 5,
      }),
    ).toBe(MAXIMUM_TRIAGE_REWARD_POINTS)
  })

  it('never falls below the floor — a 1-point task stays at least 1', () => {
    expect(
      rewardScaledForEffortChange({
        rewardPoints: 1,
        previousEffort: 4,
        nextEffort: 5,
      }),
    ).toBeGreaterThanOrEqual(MINIMUM_TRIAGE_REWARD_POINTS)
  })
})

// ---------------------------------------------------------------------------
// Duration chips
// ---------------------------------------------------------------------------

describe('triageDurationChipLabel', () => {
  it.each([
    [1, 'A minute'],
    [5, '5 min'],
    [15, '15 min'],
    [25, '25 min'],
    [45, '45 min'],
    [60, '60 min'],
    [90, '90 min'],
    [120, '2 hours'],
    [180, '3 hours'],
  ] as const)('labels the %s-minute chip "%s"', (minutes, expected) => {
    expect(triageDurationChipLabel(minutes)).toBe(expected)
  })
})

describe('triageDurationSelection — irreversible once picked', () => {
  it('accepts the first pick — an undefined duration becomes 25 minutes', () => {
    expect(triageDurationSelection(null, 25)).toBe(25)
  })

  it('accepts a change of mind — 25 minutes becomes 90', () => {
    expect(triageDurationSelection(25, 90)).toBe(90)
  })

  it('REFUSES a revert to undefined — the rule with no Skip affordance', () => {
    expect(triageDurationSelection(25, null)).toBe(25)
  })

  it('is a no-op before any pick — a stray null leaves it undefined', () => {
    expect(triageDurationSelection(null, null)).toBeNull()
  })

  it('refuses a non-positive duration, which would match every gap', () => {
    expect(triageDurationSelection(25, 0)).toBe(25)
    expect(triageDurationSelection(25, -5)).toBe(25)
  })
})

describe('triageDurationSeconds', () => {
  it('converts the 25-minute chip to canon’s TimeInterval — 1500 seconds', () => {
    expect(triageDurationSeconds(25)).toBe(1500)
  })

  it('converts the 3-hour chip — 10800 seconds', () => {
    expect(triageDurationSeconds(180)).toBe(10800)
  })

  it('keeps "no estimate" as null rather than as zero', () => {
    expect(triageDurationSeconds(null)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// The bottom action row
// ---------------------------------------------------------------------------

describe('triageSecondaryAction', () => {
  it('offers Start Now on Prioritize', () => {
    expect(triageSecondaryAction(EisenhowerQuadrant.prioritize)).toBe(
      TriageSecondaryAction.startNow,
    )
  })

  it('offers Share on Delegate', () => {
    expect(triageSecondaryAction(EisenhowerQuadrant.delegate)).toBe(
      TriageSecondaryAction.share,
    )
  })

  it('offers Archive on Archive', () => {
    expect(triageSecondaryAction(EisenhowerQuadrant.delete)).toBe(
      TriageSecondaryAction.archive,
    )
  })

  it('offers nothing on Schedule — Complete Only stands alone', () => {
    expect(triageSecondaryAction(EisenhowerQuadrant.decide)).toBeNull()
  })

  it('offers nothing before a quadrant is picked', () => {
    expect(triageSecondaryAction(null)).toBeNull()
  })
})

describe('triageSecondaryActionMatches', () => {
  it('accepts Share on a Delegate triage', () => {
    expect(
      triageSecondaryActionMatches('share', EisenhowerQuadrant.delegate),
    ).toBe(true)
  })

  it('refuses Share on a Prioritize triage — a mis-routed button', () => {
    expect(
      triageSecondaryActionMatches('share', EisenhowerQuadrant.prioritize),
    ).toBe(false)
  })

  it('refuses any secondary before a quadrant is picked', () => {
    expect(triageSecondaryActionMatches('archive', null)).toBe(false)
  })
})

describe('triagePrimaryActionLabel', () => {
  it('reads full width before a quadrant is picked', () => {
    expect(triagePrimaryActionLabel(null)).toBe('Complete Triage')
  })

  it('shortens once a sibling button has to fit — Prioritize', () => {
    expect(triagePrimaryActionLabel(EisenhowerQuadrant.prioritize)).toBe(
      'Complete Only',
    )
  })

  it('shortens on Schedule too, even though it has no sibling', () => {
    expect(triagePrimaryActionLabel(EisenhowerQuadrant.decide)).toBe(
      'Complete Only',
    )
  })
})

describe('triageShareText', () => {
  it('carries the canon blurb around the endeavor title', () => {
    expect(triageShareText('Draft Q3 product plan')).toBe(
      'I\'d like you to help with "Draft Q3 product plan". (Shared from Kro.)',
    )
  })

  it('survives a title with quotes in it — an awkward but legal title', () => {
    expect(triageShareText('Read "Dune"')).toContain('Read "Dune"')
  })

  it('survives an empty title without losing the Kro attribution', () => {
    expect(triageShareText('')).toBe(
      'I\'d like you to help with "". (Shared from Kro.)',
    )
  })
})

// ---------------------------------------------------------------------------
// The confirm gate
// ---------------------------------------------------------------------------

describe('triageBlocker / canConfirmTriage', () => {
  const someDay = new Date(2026, 2, 24, 10, 0, 0)

  it('names the missing quadrant first — the pristine screen', () => {
    expect(triageBlocker({ quadrant: null, dueDate: null })).toBe(
      TriageBlocker.missingQuadrant,
    )
    expect(canConfirmTriage({ quadrant: null, dueDate: null })).toBe(false)
  })

  it('names the quadrant even when a date already exists — order matters', () => {
    expect(triageBlocker({ quadrant: null, dueDate: someDay })).toBe(
      TriageBlocker.missingQuadrant,
    )
  })

  it.each([
    EisenhowerQuadrant.prioritize,
    EisenhowerQuadrant.decide,
    EisenhowerQuadrant.delegate,
  ])('names the missing date for %s — a quadrant is not enough', (quadrant) => {
    expect(triageBlocker({ quadrant, dueDate: null })).toBe(
      TriageBlocker.missingScheduledDate,
    )
    expect(canConfirmTriage({ quadrant, dueDate: null })).toBe(false)
  })

  it('exempts Archive from the date requirement — the one quadrant that may', () => {
    expect(
      triageBlocker({ quadrant: EisenhowerQuadrant.delete, dueDate: null }),
    ).toBeNull()
    expect(
      canConfirmTriage({ quadrant: EisenhowerQuadrant.delete, dueDate: null }),
    ).toBe(true)
  })

  it.each(eisenhowerQuadrants)(
    'opens the gate for %s once both a quadrant and a date exist',
    (quadrant) => {
      expect(canConfirmTriage({ quadrant, dueDate: someDay })).toBe(true)
    },
  )
})

describe('the rule constants', () => {
  it('sets the promotion threshold at 3 rockets', () => {
    expect(IMPORTANT_VALUE_THRESHOLD).toBe(3)
  })

  it('widens the reward stepper’s grain at 50', () => {
    expect(TRIAGE_REWARD_STEP_THRESHOLD).toBe(50)
    expect(triageRewardStep(TRIAGE_REWARD_STEP_THRESHOLD - 1)).toBe(5)
    expect(triageRewardStep(TRIAGE_REWARD_STEP_THRESHOLD)).toBe(10)
  })

  it('bounds both ratings at 1…5, one descriptor each', () => {
    expect(MINIMUM_TRIAGE_RATING).toBe(1)
    expect(MAXIMUM_TRIAGE_RATING).toBe(5)
    expect(triageValueLabels).toHaveLength(MAXIMUM_TRIAGE_RATING)
    expect(triageEffortLabels).toHaveLength(MAXIMUM_TRIAGE_RATING)
  })

  it('names the rating scales in canon order', () => {
    expect(triageValueLabels).toEqual([
      'Trivial',
      'Minor',
      'Meaningful',
      'Major',
      'Life-changing',
    ])
    expect(triageEffortLabels).toEqual([
      'Autopilot',
      'Easy',
      'Cumbersome',
      'Hard',
      'Grueling',
    ])
  })
})

describe('triageBlockerReason', () => {
  it('names the missing quadrant', () => {
    expect(triageBlockerReason(TriageBlocker.missingQuadrant)).toBe(
      'Pick a quadrant to complete this triage.',
    )
  })

  it('names the missing scheduled date', () => {
    expect(triageBlockerReason(TriageBlocker.missingScheduledDate)).toBe(
      'Add a scheduled date to complete this triage.',
    )
  })

  it('gives every blocker copy a user can act on', () => {
    for (const blocker of Object.values(TriageBlocker)) {
      expect(triageBlockerReason(blocker).length).toBeGreaterThan(0)
    }
  })
})

describe('triageBlockedReason', () => {
  it('tells the user to pick a quadrant on the pristine screen', () => {
    expect(triageBlockedReason({ quadrant: null, dueDate: null })).toBe(
      'Pick a quadrant to complete this triage.',
    )
  })

  it('tells the user to add a date once a quadrant exists', () => {
    expect(
      triageBlockedReason({
        quadrant: EisenhowerQuadrant.decide,
        dueDate: null,
      }),
    ).toBe('Add a scheduled date to complete this triage.')
  })

  it('says nothing when nothing blocks — Archive with no date', () => {
    expect(
      triageBlockedReason({
        quadrant: EisenhowerQuadrant.delete,
        dueDate: null,
      }),
    ).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// The decision
// ---------------------------------------------------------------------------

describe('triageDecisionFrom', () => {
  const base = {
    endeavorId: 'endeavor-1',
    durationMinutes: 25,
    rewardPoints: 30,
    value: 3,
    effort: 2,
    expiry: new Date(2026, 2, 24, 11, 0, 0),
  }
  const dueDate = new Date(2026, 2, 24, 10, 0, 0)

  it('builds the full bundle for a complete Schedule triage', () => {
    const decision = triageDecisionFrom({
      ...base,
      quadrant: EisenhowerQuadrant.decide,
      dueDate,
    })

    expect(decision).toEqual({
      endeavorId: 'endeavor-1',
      quadrant: EisenhowerQuadrant.decide,
      durationSeconds: 1500,
      dueDate,
      rewardPoints: 30,
      value: 3,
      effort: 2,
      expiryDate: base.expiry,
    })
  })

  it('builds a decision for Archive without a date — the exempt quadrant', () => {
    const decision = triageDecisionFrom({
      ...base,
      quadrant: EisenhowerQuadrant.delete,
      dueDate: null,
    })

    expect(decision?.quadrant).toBe(EisenhowerQuadrant.delete)
    expect(decision?.dueDate).toBeNull()
  })

  it('refuses to build while the gate is closed — no quadrant picked yet', () => {
    expect(triageDecisionFrom({ ...base, quadrant: null, dueDate })).toBeNull()
  })

  it('carries a cleared rating through as null, not as a default', () => {
    const decision = triageDecisionFrom({
      ...base,
      value: null,
      effort: null,
      quadrant: EisenhowerQuadrant.decide,
      dueDate,
    })

    expect(decision?.value).toBeNull()
    expect(decision?.effort).toBeNull()
  })
})
