import { describe, expect, it } from 'vitest'
import {
  PlanExceptions,
  planExceptionCopy,
  planExceptionFrom,
} from '../PlanException'

describe('PlanExceptions', () => {
  it('marks a failed day read recoverable, so the surface offers a retry', () => {
    expect(PlanExceptions.dayLoadFailed('store closed').recoverable).toBe(true)
  })

  it('marks an undecodable row unrecoverable — retrying cannot repair it', () => {
    expect(PlanExceptions.malformedRow('bad kind').recoverable).toBe(false)
  })

  it('carries the window a failed preload was centred on', () => {
    const failure = PlanExceptions.preloadFailed('2026-06-18', 'timed out')
    expect(failure.kind).toBe('preloadFailed')
    expect(failure.kind === 'preloadFailed' ? failure.centerDayKey : null).toBe(
      '2026-06-18',
    )
  })

  it('keeps the developer detail on `message`, never on `kind`', () => {
    expect(PlanExceptions.unknown('boom').message).toBe('boom')
  })
})

describe('planExceptionFrom', () => {
  it('lifts an Error’s message', () => {
    expect(planExceptionFrom(new Error('quota exceeded')).message).toBe(
      'quota exceeded',
    )
  })

  it('lifts a thrown string', () => {
    expect(planExceptionFrom('nope').message).toBe('nope')
  })

  it('stringifies anything else rather than losing it', () => {
    expect(planExceptionFrom(404).message).toBe('404')
  })

  it('always lands on the unknown kind — it never guesses a specific one', () => {
    expect(planExceptionFrom(new TypeError('x')).kind).toBe('unknown')
  })
})

describe('planExceptionCopy', () => {
  it('offers a retry route for a failed day', () => {
    expect(planExceptionCopy(PlanExceptions.dayLoadFailed('x'))).toContain(
      'refresh',
    )
  })

  it('says the surrounding days failed, not the day itself', () => {
    expect(
      planExceptionCopy(PlanExceptions.preloadFailed('2026-06-18', 'x')),
    ).toContain('days around')
  })

  it('gives every kind a sentence, and never echoes the developer message', () => {
    const cases = [
      PlanExceptions.dayLoadFailed('internal detail'),
      PlanExceptions.preloadFailed('2026-06-18', 'internal detail'),
      PlanExceptions.malformedRow('internal detail'),
      PlanExceptions.unknown('internal detail'),
    ]
    for (const value of cases) {
      const copy = planExceptionCopy(value)
      expect(copy.length).toBeGreaterThan(0)
      expect(copy).not.toContain('internal detail')
    }
  })
})
