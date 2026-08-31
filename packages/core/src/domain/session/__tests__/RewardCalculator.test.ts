import { describe, expect, it } from 'vitest'
import { type Endeavor, makeEndeavor } from '../../endeavor/Endeavor'
import { EndeavorKind } from '../../endeavor/EndeavorKind'
import { PerformResolution } from '../../endeavor/Perform'
import { minutesInSeconds } from '../../shared/TimeInterval'
import { PointsFormula } from '../PointsFormula'
import {
  DEFAULT_BASE_REWARD_POINTS,
  awardRewardPoints,
  baseRewardFor,
  calculateLegacyPoints,
  calculateSlidingScalePoints,
  legacyPriorityMultiplier,
} from '../RewardCalculator'

/** The 25-minute Pomodoro the canon doc's worked examples use. */
const TARGET = minutesInSeconds(25)
const BASE = DEFAULT_BASE_REWARD_POINTS

const sliding = (params: {
  resolution: PerformResolution
  elapsedDuration: number
  targetDuration?: number
  basePoints?: number
}) =>
  calculateSlidingScalePoints({
    basePoints: params.basePoints ?? BASE,
    resolution: params.resolution,
    targetDuration: params.targetDuration ?? TARGET,
    elapsedDuration: params.elapsedDuration,
  })

const NOW = new Date(2026, 0, 15, 9, 0, 0)

const endeavorWith = (params: {
  duration?: number | null
  due?: Date | null
}): Endeavor =>
  makeEndeavor({
    id: 'endeavor-reward',
    title: 'Write the brief',
    kind: EndeavorKind.task,
    duration: params.duration ?? null,
    due: params.due ?? null,
  })

// ---------------------------------------------------------------------------
// Base points
// ---------------------------------------------------------------------------

describe('the base reward', () => {
  it('is canon’s flat 30 for an endeavor with no session points', () => {
    expect(baseRewardFor(endeavorWith({}))).toBe(30)
  })

  it('stays 30 even when the endeavor carries sessionPoints — canon’s branch is still commented out', () => {
    const scored = makeEndeavor({
      id: 'endeavor-scored',
      title: 'Scored',
      kind: EndeavorKind.task,
      sessionPoints: 250,
    })
    expect(baseRewardFor(scored)).toBe(30)
  })

  it('is the same for every endeavor, which is what makes the fixtures below stable', () => {
    expect(baseRewardFor(endeavorWith({ duration: 3600 }))).toBe(
      baseRewardFor(endeavorWith({ duration: 60 })),
    )
  })
})

// ---------------------------------------------------------------------------
// Sliding scale — one block per row of the canon table
// ---------------------------------------------------------------------------

describe('sliding scale · timer finished, task NOT completed → `complete` → 30 %', () => {
  it('awards 30 % when the 25-minute timer ran out and the task stayed open', () => {
    expect(
      sliding({
        resolution: PerformResolution.complete,
        elapsedDuration: TARGET,
      }),
    ).toBe(9)
  })

  it('awards the same 30 % when the user overran the target', () => {
    expect(
      sliding({
        resolution: PerformResolution.complete,
        elapsedDuration: minutesInSeconds(40),
      }),
    ).toBe(9)
  })

  it('awards 30 % at exactly the target, the boundary of “went the distance”', () => {
    expect(
      sliding({
        resolution: PerformResolution.complete,
        elapsedDuration: TARGET,
      }),
    ).toBe(9)
    expect(
      sliding({
        resolution: PerformResolution.complete,
        elapsedDuration: TARGET - 1,
      }),
    ).toBe(0)
  })
})

describe('sliding scale · timer finished, task completed → `finished` → 100 %', () => {
  it('awards the full base when the timer ran out and the task was marked done', () => {
    expect(
      sliding({
        resolution: PerformResolution.finished,
        elapsedDuration: TARGET,
      }),
    ).toBe(30)
  })

  it('caps at 100 % when the user ran well over the target', () => {
    expect(
      sliding({
        resolution: PerformResolution.finished,
        elapsedDuration: minutesInSeconds(90),
      }),
    ).toBe(30)
  })

  it('never pays more than the base, however long the session ran', () => {
    expect(
      sliding({
        resolution: PerformResolution.finished,
        elapsedDuration: 86_400,
      }),
    ).toBeLessThanOrEqual(BASE)
  })
})

describe('sliding scale · finished early, task completed → proportional', () => {
  it('reproduces the doc’s worked example: 15 of 25 minutes → 60 % of base', () => {
    expect(
      sliding({
        resolution: PerformResolution.finished,
        elapsedDuration: minutesInSeconds(15),
      }),
    ).toBe(18)
  })

  it('awards half the base at half the target', () => {
    expect(
      sliding({
        resolution: PerformResolution.finished,
        elapsedDuration: minutesInSeconds(12.5),
      }),
    ).toBe(15)
  })

  it('truncates rather than rounds, the way canon’s `Int(Double)` does', () => {
    // 1300 of 2000 s is exactly 65 %; 65 % of 30 is exactly 19.5. Rounding
    // would pay 20, and canon's `Int(Double)` — which truncates toward zero —
    // pays 19. The legacy formula, which really does round, pays the other way
    // on its own inputs; the block below pins that contrast.
    expect(
      sliding({
        resolution: PerformResolution.finished,
        elapsedDuration: 1300,
        targetDuration: 2000,
      }),
    ).toBe(19)
  })

  it('truncates a three-quarter session the same way (22.5 → 22, not 23)', () => {
    expect(
      sliding({
        resolution: PerformResolution.finished,
        elapsedDuration: 1500,
        targetDuration: 2000,
      }),
    ).toBe(22)
  })

  it('awards zero for a session so short the proportion truncates away', () => {
    expect(
      sliding({ resolution: PerformResolution.finished, elapsedDuration: 30 }),
    ).toBe(0)
  })
})

describe('sliding scale · finished early, task NOT completed → 0 %', () => {
  it('awards nothing for stopping early with the task still open', () => {
    expect(
      sliding({
        resolution: PerformResolution.complete,
        elapsedDuration: minutesInSeconds(15),
      }),
    ).toBe(0)
  })

  it('awards nothing even just short of the target', () => {
    expect(
      sliding({
        resolution: PerformResolution.complete,
        elapsedDuration: TARGET - 0.5,
      }),
    ).toBe(0)
  })

  it('awards nothing at zero elapsed', () => {
    expect(
      sliding({ resolution: PerformResolution.complete, elapsedDuration: 0 }),
    ).toBe(0)
  })
})

describe('sliding scale · quick complete, no session → 100 %', () => {
  it('awards the full base for marking a task done with no session at all', () => {
    expect(
      sliding({
        resolution: PerformResolution.finished,
        elapsedDuration: 0,
        targetDuration: 0,
      }),
    ).toBe(30)
  })

  it('awards the full base regardless of elapsed, since there is no target to divide by', () => {
    expect(
      sliding({
        resolution: PerformResolution.finished,
        elapsedDuration: 900,
        targetDuration: 0,
      }),
    ).toBe(30)
  })

  it('is the branch a zero target takes — never a division by zero', () => {
    expect(
      Number.isFinite(
        sliding({
          resolution: PerformResolution.finished,
          elapsedDuration: 0,
          targetDuration: 0,
        }),
      ),
    ).toBe(true)
  })
})

describe('sliding scale · aborted → 0', () => {
  it('awards nothing for an abandoned session', () => {
    expect(
      sliding({
        resolution: PerformResolution.aborted,
        elapsedDuration: minutesInSeconds(20),
      }),
    ).toBe(0)
  })

  it('awards nothing for a below-threshold finish-early, which resolves aborted', () => {
    expect(
      sliding({
        resolution: PerformResolution.aborted,
        elapsedDuration: minutesInSeconds(4),
      }),
    ).toBe(0)
  })

  it('awards nothing even for an abort after the full target ran', () => {
    expect(
      sliding({
        resolution: PerformResolution.aborted,
        elapsedDuration: minutesInSeconds(30),
      }),
    ).toBe(0)
  })
})

describe('sliding scale · the two guards that run before any branch', () => {
  it('awards nothing when the endeavor is worth nothing', () => {
    expect(
      sliding({
        resolution: PerformResolution.finished,
        elapsedDuration: TARGET,
        basePoints: 0,
      }),
    ).toBe(0)
  })

  it('awards nothing for negative base points', () => {
    expect(
      sliding({
        resolution: PerformResolution.finished,
        elapsedDuration: TARGET,
        basePoints: -50,
      }),
    ).toBe(0)
  })

  it('awards nothing for a negative elapsed, the clock-adjustment shape', () => {
    expect(
      sliding({
        resolution: PerformResolution.finished,
        elapsedDuration: -60,
      }),
    ).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Legacy — priority multiplier and the formula
// ---------------------------------------------------------------------------

describe('legacy · the priority multiplier', () => {
  it('is 1.5× for an overdue endeavor', () => {
    expect(
      legacyPriorityMultiplier(
        endeavorWith({ due: new Date(2026, 0, 15, 8, 0, 0) }),
        NOW,
      ),
    ).toBe(1.5)
  })

  it('is 1.25× for one due within the next two hours', () => {
    expect(
      legacyPriorityMultiplier(
        endeavorWith({ due: new Date(2026, 0, 15, 10, 0, 0) }),
        NOW,
      ),
    ).toBe(1.25)
  })

  it('is 1.25× at exactly two hours out — canon’s comparison is `<=`', () => {
    expect(
      legacyPriorityMultiplier(
        endeavorWith({ due: new Date(2026, 0, 15, 11, 0, 0) }),
        NOW,
      ),
    ).toBe(1.25)
  })

  it('is 1× a second past the two-hour window', () => {
    expect(
      legacyPriorityMultiplier(
        endeavorWith({ due: new Date(2026, 0, 15, 11, 0, 1) }),
        NOW,
      ),
    ).toBe(1)
  })

  it('is 1× for an endeavor with no due date at all', () => {
    expect(legacyPriorityMultiplier(endeavorWith({}), NOW)).toBe(1)
  })

  it('is 1.25×, not 1.5×, for one due at this exact instant', () => {
    expect(legacyPriorityMultiplier(endeavorWith({ due: NOW }), NOW)).toBe(1.25)
  })
})

describe('legacy · `finished` → the full estimate × urgency', () => {
  it('awards 25 for a 25-minute estimate at neutral priority', () => {
    expect(
      calculateLegacyPoints({
        endeavor: endeavorWith({ duration: TARGET }),
        resolution: PerformResolution.finished,
        now: NOW,
      }),
    ).toBe(25)
  })

  it('awards 38 for the same estimate when overdue (25 × 1.5, rounded)', () => {
    expect(
      calculateLegacyPoints({
        endeavor: endeavorWith({
          duration: TARGET,
          due: new Date(2026, 0, 15, 8, 0, 0),
        }),
        resolution: PerformResolution.finished,
        now: NOW,
      }),
    ).toBe(38)
  })

  it('awards 31 when due soon (25 × 1.25, rounded)', () => {
    expect(
      calculateLegacyPoints({
        endeavor: endeavorWith({
          duration: TARGET,
          due: new Date(2026, 0, 15, 10, 0, 0),
        }),
        resolution: PerformResolution.finished,
        now: NOW,
      }),
    ).toBe(31)
  })
})

describe('legacy · `complete` → 30 % of the same figure', () => {
  it('awards 8 for a 25-minute estimate at neutral priority (7.5, rounded up)', () => {
    expect(
      calculateLegacyPoints({
        endeavor: endeavorWith({ duration: TARGET }),
        resolution: PerformResolution.complete,
        now: NOW,
      }),
    ).toBe(8)
  })

  it('awards 11 for the same estimate when overdue (37.5 × 0.3 = 11.25)', () => {
    expect(
      calculateLegacyPoints({
        endeavor: endeavorWith({
          duration: TARGET,
          due: new Date(2026, 0, 15, 8, 0, 0),
        }),
        resolution: PerformResolution.complete,
        now: NOW,
      }),
    ).toBe(11)
  })

  it('rounds rather than truncating, unlike the sliding scale', () => {
    // 25 × 0.3 = 7.5 → 8. Truncation would pay 7.
    expect(
      calculateLegacyPoints({
        endeavor: endeavorWith({ duration: TARGET }),
        resolution: PerformResolution.complete,
        now: NOW,
      }),
    ).toBe(8)
  })
})

describe('legacy · `aborted` → 0, and the no-estimate guard', () => {
  it('awards nothing for an aborted attempt however urgent the endeavor', () => {
    expect(
      calculateLegacyPoints({
        endeavor: endeavorWith({
          duration: TARGET,
          due: new Date(2026, 0, 15, 8, 0, 0),
        }),
        resolution: PerformResolution.aborted,
        now: NOW,
      }),
    ).toBe(0)
  })

  it('awards nothing when the endeavor carries no estimate to score from', () => {
    expect(
      calculateLegacyPoints({
        endeavor: endeavorWith({}),
        resolution: PerformResolution.finished,
        now: NOW,
      }),
    ).toBe(0)
  })

  it('awards nothing for a zero estimate', () => {
    expect(
      calculateLegacyPoints({
        endeavor: endeavorWith({ duration: 0 }),
        resolution: PerformResolution.finished,
        now: NOW,
      }),
    ).toBe(0)
  })

  it('awards 1 for a sub-minute estimate, rounding 0.5 away from zero', () => {
    expect(
      calculateLegacyPoints({
        endeavor: endeavorWith({ duration: 30 }),
        resolution: PerformResolution.finished,
        now: NOW,
      }),
    ).toBe(1)
  })
})

describe('legacy · it does not vary with how long the session ran', () => {
  it('pays the same for a 5-minute and a 5-hour session on the same endeavor', () => {
    const endeavor = endeavorWith({ duration: TARGET })
    const short = calculateLegacyPoints({
      endeavor,
      resolution: PerformResolution.finished,
      now: NOW,
    })
    // There is no elapsed parameter at all — that *is* the property.
    expect(short).toBe(25)
    expect(
      awardRewardPoints({
        formula: PointsFormula.legacy,
        endeavor,
        resolution: PerformResolution.finished,
        targetDuration: TARGET,
        elapsedDuration: minutesInSeconds(300),
        now: NOW,
      }),
    ).toBe(25)
    expect(
      awardRewardPoints({
        formula: PointsFormula.legacy,
        endeavor,
        resolution: PerformResolution.finished,
        targetDuration: TARGET,
        elapsedDuration: minutesInSeconds(5),
        now: NOW,
      }),
    ).toBe(25)
  })
})

// ---------------------------------------------------------------------------
// The award entry point
// ---------------------------------------------------------------------------

describe('awarding through the user’s chosen formula', () => {
  it('routes the default preference to the sliding scale', () => {
    expect(
      awardRewardPoints({
        formula: PointsFormula.slidingScale,
        endeavor: endeavorWith({ duration: TARGET }),
        resolution: PerformResolution.finished,
        targetDuration: TARGET,
        elapsedDuration: minutesInSeconds(15),
        now: NOW,
      }),
    ).toBe(18)
  })

  it('routes an explicit legacy preference to the legacy formula', () => {
    expect(
      awardRewardPoints({
        formula: PointsFormula.legacy,
        endeavor: endeavorWith({ duration: TARGET }),
        resolution: PerformResolution.finished,
        targetDuration: TARGET,
        elapsedDuration: minutesInSeconds(15),
        now: NOW,
      }),
    ).toBe(25)
  })

  it('gives the two formulas genuinely different answers for one completion', () => {
    const shared = {
      endeavor: endeavorWith({
        duration: TARGET,
        due: new Date(2026, 0, 15, 8, 0, 0),
      }),
      resolution: PerformResolution.complete,
      targetDuration: TARGET,
      elapsedDuration: minutesInSeconds(15),
      now: NOW,
    }
    expect(
      awardRewardPoints({ ...shared, formula: PointsFormula.slidingScale }),
    ).toBe(0)
    expect(
      awardRewardPoints({ ...shared, formula: PointsFormula.legacy }),
    ).toBe(11)
  })

  it('pays zero for an aborted attempt under either formula', () => {
    const shared = {
      endeavor: endeavorWith({ duration: TARGET }),
      resolution: PerformResolution.aborted,
      targetDuration: TARGET,
      elapsedDuration: minutesInSeconds(20),
      now: NOW,
    }
    expect(
      awardRewardPoints({ ...shared, formula: PointsFormula.slidingScale }),
    ).toBe(0)
    expect(
      awardRewardPoints({ ...shared, formula: PointsFormula.legacy }),
    ).toBe(0)
  })
})
