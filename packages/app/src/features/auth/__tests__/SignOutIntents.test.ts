import { describe, expect, it } from 'vitest'
import {
  OVERDUE_NOTIFICATION_ID_PREFIX,
  isWithdrawnAlertIdentifier,
  signOutIntents,
} from '../SignOutIntents'

describe('the withdrawal intent sign-out raises', () => {
  it("uses canon's overdue notification id prefix verbatim, because both ends mint ids with it", () => {
    expect(OVERDUE_NOTIFICATION_ID_PREFIX).toBe('overdue-')
  })

  it('raises exactly one intent today — the pending-alert withdrawal', () => {
    expect(signOutIntents()).toEqual([
      { kind: 'withdrawPendingAlerts', withdrawnPrefix: 'overdue-' },
    ])
  })

  it('builds a fresh list per call, so no caller can mutate the next sign-out', () => {
    const first = signOutIntents()
    const second = signOutIntents()
    expect(first).not.toBe(second)
    expect(first).toEqual(second)
  })
})

describe('which pending alerts a withdrawal covers', () => {
  const intent = signOutIntents()[0]
  if (intent === undefined) throw new Error('sign-out raises no intent')

  it('covers an overdue alert scheduled for an endeavor — the one that embeds a task title', () => {
    expect(isWithdrawnAlertIdentifier('overdue-endeavor-42', intent)).toBe(true)
  })

  it('covers the bare prefix', () => {
    expect(isWithdrawnAlertIdentifier('overdue-', intent)).toBe(true)
  })

  it('leaves an unrelated notification alone — sign-out is not a notification purge', () => {
    expect(isWithdrawnAlertIdentifier('morning-plan-2026-08-31', intent)).toBe(
      false,
    )
    expect(isWithdrawnAlertIdentifier('', intent)).toBe(false)
  })

  it('does not match a prefix appearing mid-identifier', () => {
    expect(isWithdrawnAlertIdentifier('reminder-overdue-1', intent)).toBe(false)
  })
})
