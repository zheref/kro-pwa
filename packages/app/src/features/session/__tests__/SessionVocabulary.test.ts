/**
 * The runtime phase and the pill's visual contract.
 *
 * The pair of conversions is the part worth pinning: the persisted enum has
 * four cases and the runtime five, and getting the mapping wrong would show a
 * user a `ready` pill for a paused session (or vice versa) after every reload.
 */
import { PersistedSessionPhase, persistedSessionPhases } from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  ANONYMOUS_SESSION_TITLE,
  BREAK_SESSION_TITLE,
  SessionPhase,
  SessionPillAffordance,
  SessionTint,
  isActiveSessionPhase,
  isSessionPillVisiblePhase,
  persistedPhaseFromSessionPhase,
  sessionPhaseFromPersisted,
  sessionPhases,
  sessionPillAffordanceForPhase,
  sessionStatusLabel,
  sessionTintForPhase,
} from '../SessionVocabulary'

describe('sessionPhaseFromPersisted', () => {
  it('recovers a running session as running', () => {
    expect(sessionPhaseFromPersisted(PersistedSessionPhase.running)).toBe(
      SessionPhase.running,
    )
  })

  it('recovers a paused session as paused, not as ready', () => {
    expect(sessionPhaseFromPersisted(PersistedSessionPhase.paused)).toBe(
      SessionPhase.paused,
    )
  })

  it('recovers a concluded session so the pill still offers Mark complete', () => {
    expect(sessionPhaseFromPersisted(PersistedSessionPhase.concluded)).toBe(
      SessionPhase.concluded,
    )
  })

  it('is total over every persisted case — no document decodes to nothing', () => {
    for (const phase of persistedSessionPhases) {
      expect(sessionPhases).toContain(sessionPhaseFromPersisted(phase))
    }
  })
})

describe('persistedPhaseFromSessionPhase', () => {
  it('round-trips every persisted case through the runtime and back', () => {
    for (const phase of persistedSessionPhases) {
      expect(
        persistedPhaseFromSessionPhase(sessionPhaseFromPersisted(phase)),
      ).toBe(phase)
    }
  })

  it('answers null for ready — a cleared anchor is not a document', () => {
    expect(persistedPhaseFromSessionPhase(SessionPhase.ready)).toBeNull()
  })

  it('answers a document phase for break, which the pill labels differently', () => {
    expect(persistedPhaseFromSessionPhase(SessionPhase.break)).toBe(
      PersistedSessionPhase.break,
    )
  })
})

describe('isActiveSessionPhase', () => {
  it('holds the screen awake while a focus session counts down', () => {
    expect(isActiveSessionPhase(SessionPhase.running)).toBe(true)
  })

  it('holds it during a break too — time is still advancing', () => {
    expect(isActiveSessionPhase(SessionPhase.break)).toBe(true)
  })

  it('releases it while paused or concluded — nothing is advancing', () => {
    expect(isActiveSessionPhase(SessionPhase.paused)).toBe(false)
    expect(isActiveSessionPhase(SessionPhase.concluded)).toBe(false)
    expect(isActiveSessionPhase(SessionPhase.ready)).toBe(false)
  })
})

describe('isSessionPillVisiblePhase', () => {
  it('hides the pill when no session exists', () => {
    expect(isSessionPillVisiblePhase(SessionPhase.ready)).toBe(false)
  })

  it('keeps the pill up while paused, so the user can resume from anywhere', () => {
    expect(isSessionPillVisiblePhase(SessionPhase.paused)).toBe(true)
  })

  it('keeps the pill up after conclusion, carrying Mark complete', () => {
    expect(isSessionPillVisiblePhase(SessionPhase.concluded)).toBe(true)
  })
})

describe('sessionStatusLabel', () => {
  it('reads FOCUSED while the countdown runs', () => {
    expect(sessionStatusLabel(SessionPhase.running)).toBe('FOCUSED')
  })

  it('reads COMPLETED at the conclusion screen', () => {
    expect(sessionStatusLabel(SessionPhase.concluded)).toBe('COMPLETED')
  })

  it('gives every phase a label — no blank status line is reachable', () => {
    for (const phase of sessionPhases) {
      expect(sessionStatusLabel(phase).length).toBeGreaterThan(0)
    }
  })
})

describe('sessionTintForPhase', () => {
  it('takes the focus hue while a session advances', () => {
    expect(sessionTintForPhase(SessionPhase.running)).toBe(SessionTint.focus)
  })

  it('takes the break hue during a break, matching the sheet', () => {
    expect(sessionTintForPhase(SessionPhase.break)).toBe(SessionTint.break)
  })

  it('drops its tint into the chrome while idle or concluded', () => {
    expect(sessionTintForPhase(SessionPhase.paused)).toBe(SessionTint.chrome)
    expect(sessionTintForPhase(SessionPhase.concluded)).toBe(SessionTint.chrome)
  })
})

describe('sessionPillAffordanceForPhase', () => {
  it('offers pause while running', () => {
    expect(sessionPillAffordanceForPhase(SessionPhase.running)).toBe(
      SessionPillAffordance.pause,
    )
  })

  it('offers resume while paused', () => {
    expect(sessionPillAffordanceForPhase(SessionPhase.paused)).toBe(
      SessionPillAffordance.resume,
    )
  })

  it('replaces pause with the blue checkmark once the session concludes', () => {
    expect(sessionPillAffordanceForPhase(SessionPhase.concluded)).toBe(
      SessionPillAffordance.markComplete,
    )
  })

  it('offers nothing when the pill is hidden', () => {
    expect(sessionPillAffordanceForPhase(SessionPhase.ready)).toBe(
      SessionPillAffordance.none,
    )
  })
})

describe('the two canon literals', () => {
  it('labels a break "Break" rather than the endeavor title', () => {
    expect(BREAK_SESSION_TITLE).toBe('Break')
  })

  it('opens a blank session as "Focus Session", the promotable default', () => {
    expect(ANONYMOUS_SESSION_TITLE).toBe('Focus Session')
  })

  it('keeps the two distinct — a break must never read as the blank session', () => {
    expect(BREAK_SESSION_TITLE).not.toBe(ANONYMOUS_SESSION_TITLE)
  })
})
