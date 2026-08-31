import { describe, expect, it } from 'vitest'
import { type Endeavor, makeEndeavor } from '../../endeavor/Endeavor'
import { EndeavorKind } from '../../endeavor/EndeavorKind'
import { PerformResolution, makePerform } from '../../endeavor/Perform'
import { endeavorMocks } from '../../endeavor/__mocks__/Endeavor.mocks'
import { minutesInSeconds } from '../../shared/TimeInterval'
import { FocusTimerMode } from '../FocusTimerMode'
import {
  EMPIRICAL_SAMPLE_MINIMUM,
  empiricalDuration,
  empiricalDurationPerformances,
  sessionLaunchRecommendation,
} from '../SessionLaunchRecommendation'

const FALLBACK = minutesInSeconds(25)

/** A qualifying performance: ran in a session, non-zero, ended complete. */
const qualifying = (durationSeconds: number) =>
  makePerform({
    date: new Date(2026, 0, 10, 9, 0, 0),
    duration: durationSeconds,
    resolution: PerformResolution.complete,
    wasCompletedInSession: true,
  })

const withPerformances = (
  performances: readonly ReturnType<typeof qualifying>[],
  extra: Partial<{
    duration: number | null
    minimumDuration: number | null
    maximumDuration: number | null
  }> = {},
): Endeavor =>
  makeEndeavor({
    id: 'endeavor-under-test',
    title: 'Write the brief',
    kind: EndeavorKind.task,
    duration: extra.duration ?? null,
    minimumDuration: extra.minimumDuration ?? null,
    maximumDuration: extra.maximumDuration ?? null,
    performances,
  })

const launch = (
  endeavor: Endeavor,
  overrides: Partial<{
    isStopwatchAvailable: boolean
    isDurationLearningEnabled: boolean
    fallbackDuration: number
  }> = {},
) =>
  sessionLaunchRecommendation(endeavor, {
    isStopwatchAvailable: overrides.isStopwatchAvailable ?? true,
    isDurationLearningEnabled: overrides.isDurationLearningEnabled,
    fallbackDuration: overrides.fallbackDuration ?? FALLBACK,
  })

// ---------------------------------------------------------------------------
// Which performances get to teach
// ---------------------------------------------------------------------------

describe('which performances qualify for duration learning', () => {
  it('accepts a whole session that ended complete', () => {
    const endeavor = withPerformances([qualifying(1500)])
    expect(empiricalDurationPerformances(endeavor)).toHaveLength(1)
  })

  it('accepts one that ended finished — the task was marked done', () => {
    const endeavor = withPerformances([
      makePerform({
        date: new Date(2026, 0, 10, 9, 0, 0),
        duration: 1500,
        resolution: PerformResolution.finished,
        wasCompletedInSession: true,
      }),
    ])
    expect(empiricalDurationPerformances(endeavor)).toHaveLength(1)
  })

  it('rejects an aborted attempt, which is how a below-threshold quit stays out', () => {
    const endeavor = withPerformances([
      makePerform({
        date: new Date(2026, 0, 10, 9, 0, 0),
        duration: 240,
        resolution: PerformResolution.aborted,
        wasCompletedInSession: true,
      }),
    ])
    expect(empiricalDurationPerformances(endeavor)).toHaveLength(0)
  })

  it('rejects a quick complete, which never ran a session', () => {
    const endeavor = withPerformances([
      makePerform({
        date: new Date(2026, 0, 10, 9, 0, 0),
        duration: 1500,
        resolution: PerformResolution.finished,
        wasCompletedInSession: false,
      }),
    ])
    expect(empiricalDurationPerformances(endeavor)).toHaveLength(0)
  })

  it('rejects a zero-duration record', () => {
    const endeavor = withPerformances([qualifying(0)])
    expect(empiricalDurationPerformances(endeavor)).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// The learned duration
// ---------------------------------------------------------------------------

describe('the learned duration', () => {
  it('needs three qualifying samples, and two is not enough', () => {
    expect(EMPIRICAL_SAMPLE_MINIMUM).toBe(3)
    expect(
      empiricalDuration(withPerformances([qualifying(1500), qualifying(1800)])),
    ).toBeNull()
  })

  it('appears on the third sample', () => {
    expect(
      empiricalDuration(
        withPerformances([
          qualifying(1500),
          qualifying(1500),
          qualifying(1500),
        ]),
      ),
    ).toBe(1500)
  })

  it('is the arithmetic mean, rounded to the nearest whole minute', () => {
    // (1500 + 1800 + 2100) / 3 = 1800 exactly.
    expect(
      empiricalDuration(
        withPerformances([
          qualifying(1500),
          qualifying(1800),
          qualifying(2100),
        ]),
      ),
    ).toBe(1800)
  })

  it('rounds a ragged mean to the nearest minute rather than truncating it', () => {
    // (1000 + 1100 + 1200) / 3 = 1100 → 18.33 min → 18 min → 1080 s.
    expect(
      empiricalDuration(
        withPerformances([
          qualifying(1000),
          qualifying(1100),
          qualifying(1200),
        ]),
      ),
    ).toBe(1080)
  })

  it('rounds a half-minute mean up, matching Swift’s half-away-from-zero', () => {
    // Mean 1530 s = 25.5 min → 26 min → 1560 s.
    expect(
      empiricalDuration(
        withPerformances([
          qualifying(1530),
          qualifying(1530),
          qualifying(1530),
        ]),
      ),
    ).toBe(1560)
  })

  it('floors at one minute, so three ten-second sessions never teach “zero”', () => {
    expect(
      empiricalDuration(
        withPerformances([qualifying(10), qualifying(10), qualifying(10)]),
      ),
    ).toBe(60)
  })

  it('is raised to the endeavor’s minimum bound', () => {
    expect(
      empiricalDuration(
        withPerformances([qualifying(600), qualifying(600), qualifying(600)], {
          minimumDuration: minutesInSeconds(20),
        }),
      ),
    ).toBe(minutesInSeconds(20))
  })

  it('is capped at the endeavor’s maximum bound', () => {
    expect(
      empiricalDuration(
        withPerformances(
          [qualifying(3600), qualifying(3600), qualifying(3600)],
          { maximumDuration: minutesInSeconds(30) },
        ),
      ),
    ).toBe(minutesInSeconds(30))
  })

  it('lets the maximum win when the two bounds contradict — canon applies max last', () => {
    expect(
      empiricalDuration(
        withPerformances(
          [qualifying(1800), qualifying(1800), qualifying(1800)],
          {
            minimumDuration: minutesInSeconds(50),
            maximumDuration: minutesInSeconds(10),
          },
        ),
      ),
    ).toBe(minutesInSeconds(10))
  })

  it('is null for the shared fixture that has only two qualifying performances', () => {
    // `completedWithPerformances` carries three records, one of them aborted.
    const endeavor = endeavorMocks.completedWithPerformances
    expect(endeavor.performances).toHaveLength(3)
    expect(empiricalDurationPerformances(endeavor)).toHaveLength(2)
    expect(empiricalDuration(endeavor)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// The four sources — ≥3 each
// ---------------------------------------------------------------------------

describe('source: preferred — the user authored a duration', () => {
  it('opens a countdown at the authored duration', () => {
    const recommendation = launch(
      withPerformances([], { duration: minutesInSeconds(45) }),
    )
    expect(recommendation.mode).toBe(FocusTimerMode.countdown)
    expect(recommendation.targetDuration).toBe(minutesInSeconds(45))
    expect(recommendation.source).toEqual({ kind: 'preferred' })
  })

  it('beats a rich empirical history — an explicit preference always wins', () => {
    const recommendation = launch(
      withPerformances([qualifying(3600), qualifying(3600), qualifying(3600)], {
        duration: minutesInSeconds(45),
      }),
    )
    expect(recommendation.targetDuration).toBe(minutesInSeconds(45))
    expect(recommendation.source.kind).toBe('preferred')
  })

  it('beats an available stopwatch', () => {
    expect(
      launch(withPerformances([], { duration: minutesInSeconds(45) }), {
        isStopwatchAvailable: true,
      }).mode,
    ).toBe(FocusTimerMode.countdown)
  })

  it('ignores a zero authored duration, which is not a preference', () => {
    expect(launch(withPerformances([], { duration: 0 })).source.kind).toBe(
      'stopwatch',
    )
  })

  it('is unaffected by duration learning being switched off', () => {
    expect(
      launch(withPerformances([], { duration: minutesInSeconds(45) }), {
        isDurationLearningEnabled: false,
      }).source.kind,
    ).toBe('preferred')
  })
})

describe('source: empirical — learned from history', () => {
  it('opens a countdown at the learned mean once three sessions exist', () => {
    const recommendation = launch(
      withPerformances([qualifying(1500), qualifying(1800), qualifying(2100)]),
    )
    expect(recommendation.mode).toBe(FocusTimerMode.countdown)
    expect(recommendation.targetDuration).toBe(1800)
    expect(recommendation.source).toEqual({ kind: 'empirical', sampleCount: 3 })
  })

  it('reports how many performances taught it, counting only the qualifying ones', () => {
    const recommendation = launch(
      withPerformances([
        qualifying(1500),
        qualifying(1500),
        qualifying(1500),
        qualifying(1500),
        makePerform({
          date: new Date(2026, 0, 11, 9, 0, 0),
          duration: 200,
          resolution: PerformResolution.aborted,
          wasCompletedInSession: true,
        }),
      ]),
    )
    expect(recommendation.source).toEqual({ kind: 'empirical', sampleCount: 4 })
  })

  it('yields to stopwatch when duration learning is switched off', () => {
    const recommendation = launch(
      withPerformances([qualifying(1500), qualifying(1500), qualifying(1500)]),
      { isDurationLearningEnabled: false },
    )
    expect(recommendation.mode).toBe(FocusTimerMode.stopwatch)
    expect(recommendation.source.kind).toBe('stopwatch')
  })

  it('stays learned rather than becoming preferred — the endeavor is never written', () => {
    const endeavor = withPerformances([
      qualifying(1500),
      qualifying(1500),
      qualifying(1500),
    ])
    const first = launch(endeavor)
    expect(first.source.kind).toBe('empirical')
    // Launching again reads history afresh; nothing was promoted in between.
    expect(endeavor.duration).toBeNull()
    expect(launch(endeavor).source.kind).toBe('empirical')
  })

  it('keeps adapting as new sessions land, unlike a promoted preference', () => {
    const three = withPerformances([
      qualifying(1200),
      qualifying(1200),
      qualifying(1200),
    ])
    expect(launch(three).targetDuration).toBe(1200)

    const four = withPerformances([
      qualifying(1200),
      qualifying(1200),
      qualifying(1200),
      qualifying(2400),
    ])
    expect(launch(four).targetDuration).toBe(1500)
  })
})

describe('source: stopwatch — nothing to go on', () => {
  it('opens open-ended for an endeavor with no preference and no history', () => {
    const recommendation = launch(withPerformances([]))
    expect(recommendation.mode).toBe(FocusTimerMode.stopwatch)
    expect(recommendation.source).toEqual({ kind: 'stopwatch' })
  })

  it('opens open-ended when history exists but falls short of three samples', () => {
    expect(
      launch(withPerformances([qualifying(1500), qualifying(1500)])).source
        .kind,
    ).toBe('stopwatch')
  })

  it('still carries the fallback as targetDuration, so the sheet can toggle back', () => {
    const recommendation = launch(withPerformances([]), {
      fallbackDuration: minutesInSeconds(50),
    })
    expect(recommendation.mode).toBe(FocusTimerMode.stopwatch)
    expect(recommendation.targetDuration).toBe(minutesInSeconds(50))
  })
})

describe('source: fallback — stopwatch is unavailable', () => {
  it('opens a countdown at the configured default', () => {
    const recommendation = launch(withPerformances([]), {
      isStopwatchAvailable: false,
    })
    expect(recommendation.mode).toBe(FocusTimerMode.countdown)
    expect(recommendation.targetDuration).toBe(FALLBACK)
    expect(recommendation.source).toEqual({ kind: 'fallback' })
  })

  it('is reached when learning is off and stopwatch is off together', () => {
    expect(
      launch(
        withPerformances([
          qualifying(1500),
          qualifying(1500),
          qualifying(1500),
        ]),
        {
          isStopwatchAvailable: false,
          isDurationLearningEnabled: false,
        },
      ).source.kind,
    ).toBe('fallback')
  })

  it('honours whatever default it is handed', () => {
    expect(
      launch(withPerformances([]), {
        isStopwatchAvailable: false,
        fallbackDuration: minutesInSeconds(75),
      }).targetDuration,
    ).toBe(minutesInSeconds(75))
  })
})

describe('the priority as a whole', () => {
  it('walks preferred → empirical → stopwatch → fallback in that order', () => {
    const history = [qualifying(1500), qualifying(1500), qualifying(1500)]

    expect(
      launch(withPerformances(history, { duration: minutesInSeconds(45) }))
        .source.kind,
    ).toBe('preferred')
    expect(launch(withPerformances(history)).source.kind).toBe('empirical')
    expect(launch(withPerformances([])).source.kind).toBe('stopwatch')
    expect(
      launch(withPerformances([]), { isStopwatchAvailable: false }).source.kind,
    ).toBe('fallback')
  })

  it('defaults duration learning to on, the way canon’s parameter does', () => {
    const endeavor = withPerformances([
      qualifying(1500),
      qualifying(1500),
      qualifying(1500),
    ])
    expect(
      sessionLaunchRecommendation(endeavor, {
        isStopwatchAvailable: true,
        fallbackDuration: FALLBACK,
      }).source.kind,
    ).toBe('empirical')
  })
})
