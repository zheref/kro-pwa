import { describe, expect, it } from 'vitest'
import { makeEndeavor } from '../../endeavor/Endeavor'
import { EndeavorHost } from '../../endeavor/EndeavorHost'
import { EndeavorKind } from '../../endeavor/EndeavorKind'
import { makeShadow } from '../../endeavor/Shadow'
import { makeReconciliationContext } from '../ReconciliationContext'
import { hasResolvedKindOverride, resolvedKind } from '../ResolvedKind'
import {
  appleRow,
  localMirrorRow,
  recurrenceMocks,
  reconciliationMocks,
} from '../__mocks__/Reconciliation.mocks'

describe('resolvedKind on provider-linked rows', () => {
  it('resolves a daily Apple row to a habit whatever it was stored as', () => {
    expect(
      resolvedKind(
        appleRow({
          kind: EndeavorKind.task,
          recurrence: recurrenceMocks.daily,
          priority: 0,
        }),
      ),
    ).toBe(EndeavorKind.habit)
  })

  it('resolves a prioritized Apple row to a task', () => {
    expect(
      resolvedKind(appleRow({ kind: EndeavorKind.reminder, priority: 4 })),
    ).toBe(EndeavorKind.task)
  })

  it('resolves a scheduled, unprioritized Apple row to a reminder', () => {
    expect(
      resolvedKind(appleRow({ kind: EndeavorKind.task, priority: 0 })),
    ).toBe(EndeavorKind.reminder)
  })

  it('applies to a locally persisted mirror, not only a native row', () => {
    // The mirror is hostedBy [local] and linked only through its shadow.
    expect(
      resolvedKind(
        localMirrorRow({
          kind: EndeavorKind.task,
          recurrence: recurrenceMocks.daily,
        }),
      ),
    ).toBe(EndeavorKind.habit)
  })
})

describe('resolvedKind falls back to the stored kind', () => {
  it('keeps the stored kind for a Kro-only row', () => {
    // "local-only recurring tasks retain their explicitly stored kind and are
    // not reclassified merely because they recur at those frequencies."
    const localDaily = makeEndeavor({
      id: 'local-daily',
      title: 'Local habit-looking task',
      kind: EndeavorKind.task,
      repeatConfig: recurrenceMocks.daily,
      hostedBy: [EndeavorHost.local],
    })
    expect(resolvedKind(localDaily)).toBe(EndeavorKind.task)
  })

  it('keeps the stored kind for a legacy shadow with no priority evidence', () => {
    expect(resolvedKind(reconciliationMocks.legacyShadowRow)).toBe(
      EndeavorKind.reminder,
    )
  })

  it('keeps the stored kind for a provider with no registered ruleset', () => {
    // Google has no table until #33 lands; its rows must pass through.
    expect(resolvedKind(reconciliationMocks.googleTouristEvent)).toBe(
      EndeavorKind.calendarEvent,
    )
  })

  it('keeps the stored kind for an unhosted, shadowless draft', () => {
    const draft = makeEndeavor({
      id: 'draft',
      title: 'Draft',
      kind: EndeavorKind.blueprint,
    })
    expect(resolvedKind(draft)).toBe(EndeavorKind.blueprint)
  })

  it('ignores a shadow whose identifier is empty when deciding linkage', () => {
    // An empty identifier is not a link, so no provider table applies.
    const row = makeEndeavor({
      id: 'row',
      title: 'Row',
      kind: EndeavorKind.task,
      repeatConfig: recurrenceMocks.daily,
      hostedBy: [EndeavorHost.local],
      shadows: [
        makeShadow({
          originalTitle: 'Row',
          sourceIdentifier: '',
          kind: EndeavorKind.task,
          source: EndeavorHost.appleReminders,
          group: null,
        }),
      ],
    })
    expect(resolvedKind(row)).toBe(EndeavorKind.task)
  })
})

describe('resolvedKind respects the supplied context', () => {
  it('applies no table when the context registers no rulesets', () => {
    const bare = makeReconciliationContext({ rulesets: [] })
    expect(
      resolvedKind(
        appleRow({
          kind: EndeavorKind.task,
          recurrence: recurrenceMocks.daily,
          priority: 0,
        }),
        bare,
      ),
    ).toBe(EndeavorKind.task)
  })

  it('uses the default context when none is supplied', () => {
    expect(
      resolvedKind(
        appleRow({ recurrence: recurrenceMocks.daily, priority: 0 }),
      ),
    ).toBe(EndeavorKind.habit)
  })

  it('applies the first registered ruleset the row is linked to', () => {
    const row = appleRow({ recurrence: recurrenceMocks.daily, priority: 0 })
    const contextWithSynthetic = makeReconciliationContext({
      rulesets: [
        {
          provider: EndeavorHost.appleReminders,
          seriesRecurrenceBases: [],
          rules: [
            {
              when: { type: 'always' },
              outcome: { type: 'kind', kind: EndeavorKind.background },
            },
          ],
        },
      ],
    })
    expect(resolvedKind(row, contextWithSynthetic)).toBe(
      EndeavorKind.background,
    )
  })
})

describe('hasResolvedKindOverride', () => {
  it('is true when the resolved kind differs from the stored one', () => {
    expect(
      hasResolvedKindOverride(
        appleRow({
          kind: EndeavorKind.task,
          recurrence: recurrenceMocks.daily,
          priority: 0,
        }),
      ),
    ).toBe(true)
  })

  it('is false when they agree', () => {
    expect(
      hasResolvedKindOverride(
        appleRow({
          kind: EndeavorKind.habit,
          recurrence: recurrenceMocks.daily,
          priority: 0,
        }),
      ),
    ).toBe(false)
  })

  it('is false for a row no provider classifies', () => {
    expect(hasResolvedKindOverride(reconciliationMocks.kroCitizenTask)).toBe(
      false,
    )
  })
})
