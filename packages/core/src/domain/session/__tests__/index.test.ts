/**
 * The barrel contract this port's three renames exist to hold — the test for
 * `domain/session/index.ts` and, through it, for `packages/core/src/index.ts`.
 *
 * `packages/core/src/index.ts` re-exports both `domain/session` (new) and
 * `model/Session/*` (the legacy `/session` timer, which `apps/web` still
 * imports). Two exports of one name would be `TS2308` — a typecheck failure —
 * and a rename that silently *shadowed* the legacy export instead would break
 * `apps/web` at runtime while typechecking clean.
 *
 * `tsc` already catches the first case. This suite catches the second, and
 * pins the coexistence so a future "tidy-up" that drops a `Focus` prefix fails
 * here with a reason rather than in an app nobody ran.
 */
import { describe, expect, it } from 'vitest'
import * as kroCore from '../../../index'

describe('the @kro/core barrel', () => {
  it('exports the ported session domain under its renamed identifiers', () => {
    expect(kroCore.FocusTimerMode).toEqual({
      countdown: 'countdown',
      stopwatch: 'stopwatch',
    })
    expect(typeof kroCore.makeFocusSessionConfig).toBe('function')
    expect(typeof kroCore.makeFocusSessionFragment).toBe('function')
    expect(kroCore.defaultSessionPresets).toHaveLength(6)
  })

  it('exports the rest of the session domain under canon’s own spelling', () => {
    expect(typeof kroCore.makePersistedRunningSession).toBe('function')
    expect(typeof kroCore.makeSessionSummary).toBe('function')
    expect(typeof kroCore.sessionLaunchRecommendation).toBe('function')
    expect(typeof kroCore.awardRewardPoints).toBe('function')
    expect(kroCore.PointsFormula.slidingScale).toBe('slidingScale')
    expect(kroCore.PersistedSessionPhase.concluded).toBe('concluded')
  })

  it('still exports the legacy /session timer’s types, unshadowed', () => {
    // `apps/web/src/app/session/page.tsx` constructs this class today; the
    // renames above are what keep it reachable.
    expect(typeof kroCore.SessionConfig).toBe('function')
    expect(kroCore.SessionTimerMode.Countdown).toBe('countdown')
    expect(typeof kroCore.standardRestDurationFrom).toBe('function')
    expect(typeof kroCore.durationOfFragment).toBe('function')
  })

  it('keeps the legacy SessionConfig class distinct from the ported value type', () => {
    // The legacy one is a class taking milliseconds positionally; the ported
    // one is a plain immutable value in seconds. Both are exported, and they
    // are not the same thing.
    const legacy = new kroCore.SessionConfig(1_500_000, 0, 'Legacy')
    const ported = kroCore.makeFocusSessionConfig({
      title: 'Ported',
      duration: 1500,
    })
    expect(legacy.duration).toBe(1_500_000)
    expect(ported.duration).toBe(1500)
    expect(ported).not.toBeInstanceOf(kroCore.SessionConfig)
  })

  it('keeps `PerformFragment` and `FocusSessionFragment` as separate shapes', () => {
    const running = kroCore.makeFocusSessionFragment({ start: new Date(0) })
    const recorded = kroCore.makePerformFragment({ startedAt: new Date(0) })
    expect(Object.keys(running).sort()).toEqual(['end', 'start'])
    expect(Object.keys(recorded).sort()).toEqual(['endedAt', 'startedAt'])
  })
})
