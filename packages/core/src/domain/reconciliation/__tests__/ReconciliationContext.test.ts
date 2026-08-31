import { describe, expect, it } from 'vitest'
import { appleRemindersRuleset } from '../AppleRemindersRuleset'
import { systemCalendar, utcCalendar } from '../ReconciliationCalendar'
import {
  DEFAULT_ORPHAN_QUARANTINE_SECONDS,
  defaultReconciliationContext,
  makeReconciliationContext,
} from '../ReconciliationContext'
import { RECONCILIATION_MOCK_NOW } from '../__mocks__/Reconciliation.mocks'

describe('building a reconciliation context', () => {
  it('defaults now to null rather than reaching for a clock', () => {
    // A domain tier that read `new Date()` would make every clock-omitting
    // test non-deterministic; canon's `now` is optional for the same reason.
    expect(makeReconciliationContext().now).toBeNull()
  })

  it('defaults the calendar to the host’s local zone', () => {
    expect(makeReconciliationContext().calendar).toBe(systemCalendar)
  })

  it('defaults to the Apple ruleset alone', () => {
    expect(makeReconciliationContext().rulesets).toEqual([
      appleRemindersRuleset,
    ])
  })

  it('defaults the quarantine window to the named constant', () => {
    expect(makeReconciliationContext().orphanQuarantineSeconds).toBe(
      DEFAULT_ORPHAN_QUARANTINE_SECONDS,
    )
  })

  it('overrides each field independently', () => {
    const context = makeReconciliationContext({
      now: RECONCILIATION_MOCK_NOW,
      calendar: utcCalendar,
      orphanQuarantineSeconds: 60,
    })
    expect(context.now).toBe(RECONCILIATION_MOCK_NOW)
    expect(context.calendar).toBe(utcCalendar)
    expect(context.orphanQuarantineSeconds).toBe(60)
    // Untouched fields keep their defaults.
    expect(context.rulesets).toEqual([appleRemindersRuleset])
  })

  it('accepts an explicitly empty ruleset list', () => {
    // `?? ` must not treat `[]` as "unset" — a caller disabling every table is
    // a legitimate request, not a missing argument.
    expect(makeReconciliationContext({ rulesets: [] }).rulesets).toEqual([])
  })

  it('accepts an explicit null now', () => {
    expect(makeReconciliationContext({ now: null }).now).toBeNull()
  })

  it('accepts a zero quarantine window', () => {
    expect(
      makeReconciliationContext({ orphanQuarantineSeconds: 0 })
        .orphanQuarantineSeconds,
    ).toBe(0)
  })
})

describe('the default context', () => {
  it('matches an argument-free build', () => {
    expect(defaultReconciliationContext()).toEqual(makeReconciliationContext())
  })

  it('returns a fresh value each call, never a shared singleton', () => {
    expect(defaultReconciliationContext()).not.toBe(
      defaultReconciliationContext(),
    )
  })

  it('sets the quarantine window to seven days', () => {
    expect(DEFAULT_ORPHAN_QUARANTINE_SECONDS).toBe(7 * 24 * 60 * 60)
  })
})
