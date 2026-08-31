import { describe, expect, it } from 'vitest'
import { makeEndeavor } from '../../endeavor/Endeavor'
import { EndeavorHost } from '../../endeavor/EndeavorHost'
import { EndeavorKind } from '../../endeavor/EndeavorKind'
import {
  DEFAULT_ORPHAN_QUARANTINE_SECONDS,
  makeReconciliationContext,
} from '../ReconciliationContext'
import {
  EndeavorCitizenship,
  OrphanDisposition,
  PromotionTrigger,
  canCarryKroOverlay,
  citizenshipOf,
  hasKroOverlayValues,
  hasRecordedPerformance,
  isKroCitizen,
  isKroEnhanced,
  isKroTourist,
  kroOverlayFields,
  kroOwnsField,
  orphanDispositionFor,
  promotionTriggers,
  shouldPromoteToEnhanced,
  triggerExpressesPromotionIntent,
  withKroOverlayRemoved,
  withOrphanedShadowsCleaned,
  withPromotedToEnhanced,
  wouldOverwriteHostNativeField,
} from '../KroEnhanced'
import {
  RECONCILIATION_MOCK_NOW,
  appleShadow,
  reconciliationMocks,
  utcAt,
} from '../__mocks__/Reconciliation.mocks'

const rowHostedBy = (hosts: readonly EndeavorHost[]) =>
  makeEndeavor({
    id: 'row',
    title: 'Row',
    kind: EndeavorKind.task,
    hostedBy: hosts,
  })

describe('the citizenship truth table over hostedBy', () => {
  const truthTable: readonly {
    readonly scenario: string
    readonly hosts: readonly EndeavorHost[]
    readonly expected: EndeavorCitizenship
  }[] = [
    {
      scenario: 'local only',
      hosts: [EndeavorHost.local],
      expected: EndeavorCitizenship.citizen,
    },
    {
      scenario: 'supabase only',
      hosts: [EndeavorHost.supabase],
      expected: EndeavorCitizenship.citizen,
    },
    {
      scenario: 'both Kro stores',
      hosts: [EndeavorHost.local, EndeavorHost.supabase],
      expected: EndeavorCitizenship.citizen,
    },
    {
      scenario: 'Apple Reminders only',
      hosts: [EndeavorHost.appleReminders],
      expected: EndeavorCitizenship.tourist,
    },
    {
      scenario: 'Google Calendar only',
      hosts: [EndeavorHost.googleCalendar],
      expected: EndeavorCitizenship.tourist,
    },
    {
      scenario: 'two external hosts and no Kro store',
      hosts: [EndeavorHost.googleCalendar, EndeavorHost.outlookCalendar],
      expected: EndeavorCitizenship.tourist,
    },
    {
      scenario: 'local plus Apple Reminders',
      hosts: [EndeavorHost.local, EndeavorHost.appleReminders],
      expected: EndeavorCitizenship.enhanced,
    },
    {
      scenario: 'supabase plus Google Calendar',
      hosts: [EndeavorHost.supabase, EndeavorHost.googleCalendar],
      expected: EndeavorCitizenship.enhanced,
    },
    {
      scenario: 'both Kro stores plus an external host',
      hosts: [
        EndeavorHost.local,
        EndeavorHost.supabase,
        EndeavorHost.appleCalendar,
      ],
      expected: EndeavorCitizenship.enhanced,
    },
    {
      scenario: 'no host at all',
      hosts: [],
      expected: EndeavorCitizenship.unhosted,
    },
  ]

  it.each(truthTable)('classifies: $scenario', ({ hosts, expected }) => {
    expect(citizenshipOf(rowHostedBy(hosts))).toBe(expected)
  })

  it('agrees with the three convenience predicates', () => {
    expect(isKroCitizen(rowHostedBy([EndeavorHost.local]))).toBe(true)
    expect(isKroTourist(rowHostedBy([EndeavorHost.googleCalendar]))).toBe(true)
    expect(
      isKroEnhanced(
        rowHostedBy([EndeavorHost.local, EndeavorHost.appleReminders]),
      ),
    ).toBe(true)
  })

  it('reads only hostedBy, never which fields are set', () => {
    // A tourist with a value set is still a tourist: the value has nowhere to
    // live until promotion.
    const touristWithValue = makeEndeavor({
      ...reconciliationMocks.googleTouristEvent,
      value: 5,
    })
    expect(citizenshipOf(touristWithValue)).toBe(EndeavorCitizenship.tourist)
  })

  it('reads only hostedBy, never the shadows', () => {
    const shadowedCitizen = makeEndeavor({
      ...reconciliationMocks.kroCitizenTask,
      shadows: [appleShadow({ sourceIdentifier: 'apple-x' })],
    })
    expect(citizenshipOf(shadowedCitizen)).toBe(EndeavorCitizenship.citizen)
  })
})

describe('where a Kro overlay can live', () => {
  it('allows an overlay on a citizen and an enhanced row', () => {
    expect(canCarryKroOverlay(reconciliationMocks.kroCitizenTask)).toBe(true)
    expect(canCarryKroOverlay(reconciliationMocks.enhancedAppleTask)).toBe(true)
  })

  it('refuses an overlay on a tourist', () => {
    expect(canCarryKroOverlay(reconciliationMocks.googleTouristEvent)).toBe(
      false,
    )
  })

  it('refuses an overlay on an unhosted draft', () => {
    expect(canCarryKroOverlay(rowHostedBy([]))).toBe(false)
  })

  it('detects any single overlay field being set', () => {
    for (const field of kroOverlayFields) {
      const row = makeEndeavor({
        ...reconciliationMocks.googleTouristEvent,
        [field]: field === 'associatedColor' || field === 'projectId' ? 'x' : 3,
      })
      expect(hasKroOverlayValues(row)).toBe(true)
    }
  })

  it('reports no overlay values on a bare row', () => {
    expect(hasKroOverlayValues(reconciliationMocks.googleTouristEvent)).toBe(
      false,
    )
  })
})

describe('promotion requires explicit intent — integrity rule 5', () => {
  it('promotes on the first Kro-specific field being set', () => {
    expect(
      shouldPromoteToEnhanced(
        reconciliationMocks.googleTouristEvent,
        PromotionTrigger.kroFieldSet,
      ),
    ).toBe(true)
  })

  it('promotes when a focus performance is recorded', () => {
    expect(
      shouldPromoteToEnhanced(
        reconciliationMocks.googleTouristEvent,
        PromotionTrigger.focusPerformanceRecorded,
      ),
    ).toBe(true)
  })

  it('promotes on confirming triage', () => {
    expect(
      shouldPromoteToEnhanced(
        reconciliationMocks.googleTouristEvent,
        PromotionTrigger.triageConfirmed,
      ),
    ).toBe(true)
  })

  it('does NOT promote on merely entering triage', () => {
    // "Tapping into a triage flow on a Kro-tourist is fine; *confirming* it is
    // what promotes … Cancelling out leaves it as a tourist."
    expect(
      shouldPromoteToEnhanced(
        reconciliationMocks.googleTouristEvent,
        PromotionTrigger.triageEntered,
      ),
    ).toBe(false)
  })

  it('promotes exactly at confirm and not one step earlier', () => {
    const tourist = reconciliationMocks.googleTouristEvent
    const entered = withPromotedToEnhanced(tourist, {
      kroHost: EndeavorHost.local,
      trigger: PromotionTrigger.triageEntered,
    })
    // Same object reference back: nothing happened at all.
    expect(entered).toBe(tourist)
    expect(citizenshipOf(entered)).toBe(EndeavorCitizenship.tourist)

    const confirmed = withPromotedToEnhanced(entered, {
      kroHost: EndeavorHost.local,
      trigger: PromotionTrigger.triageConfirmed,
    })
    expect(citizenshipOf(confirmed)).toBe(EndeavorCitizenship.enhanced)
  })

  it('classifies every trigger’s intent exhaustively', () => {
    const withIntent = promotionTriggers.filter(triggerExpressesPromotionIntent)
    expect(withIntent).toEqual([
      PromotionTrigger.kroFieldSet,
      PromotionTrigger.focusPerformanceRecorded,
      PromotionTrigger.triageConfirmed,
    ])
  })

  it('never promotes a citizen or an already-enhanced row', () => {
    expect(
      shouldPromoteToEnhanced(
        reconciliationMocks.kroCitizenTask,
        PromotionTrigger.triageConfirmed,
      ),
    ).toBe(false)
    expect(
      shouldPromoteToEnhanced(
        reconciliationMocks.enhancedAppleTask,
        PromotionTrigger.triageConfirmed,
      ),
    ).toBe(false)
  })

  it('detects a recorded performance', () => {
    const performed = makeEndeavor({
      ...reconciliationMocks.googleTouristEvent,
      performances: [reconciliationMocks.focusPerformance],
    })
    expect(hasRecordedPerformance(performed)).toBe(true)
    expect(hasRecordedPerformance(reconciliationMocks.googleTouristEvent)).toBe(
      false,
    )
  })
})

describe('promotion never duplicates the original — integrity rule 1', () => {
  it('adds a Kro host and nothing else', () => {
    const tourist = reconciliationMocks.googleTouristEvent
    const promoted = withPromotedToEnhanced(tourist, {
      kroHost: EndeavorHost.local,
      trigger: PromotionTrigger.kroFieldSet,
    })
    expect(promoted.hostedBy).toEqual([
      EndeavorHost.googleCalendar,
      EndeavorHost.local,
    ])
  })

  it('creates no shadow, so nothing calls back to the host', () => {
    const promoted = withPromotedToEnhanced(
      reconciliationMocks.googleTouristEvent,
      { kroHost: EndeavorHost.local, trigger: PromotionTrigger.kroFieldSet },
    )
    expect(promoted.shadows).toBe(
      reconciliationMocks.googleTouristEvent.shadows,
    )
  })

  it('adds no second external host', () => {
    const promoted = withPromotedToEnhanced(
      reconciliationMocks.googleTouristEvent,
      { kroHost: EndeavorHost.supabase, trigger: PromotionTrigger.kroFieldSet },
    )
    const externals = promoted.hostedBy.filter(
      (host) => host !== EndeavorHost.local && host !== EndeavorHost.supabase,
    )
    expect(externals).toEqual([EndeavorHost.googleCalendar])
  })

  it('refuses to promote into a non-Kro host', () => {
    const tourist = reconciliationMocks.googleTouristEvent
    expect(
      withPromotedToEnhanced(tourist, {
        kroHost: EndeavorHost.outlookCalendar,
        trigger: PromotionTrigger.kroFieldSet,
      }),
    ).toBe(tourist)
  })

  it('leaves the identifier and every other field untouched', () => {
    const promoted = withPromotedToEnhanced(
      reconciliationMocks.googleTouristEvent,
      { kroHost: EndeavorHost.local, trigger: PromotionTrigger.kroFieldSet },
    )
    expect(promoted.id).toBe('google-tourist')
    expect(promoted.title).toBe('Dentist')
    expect(promoted.start).toEqual(utcAt(28, 10))
  })
})

describe('removing the overlay never deletes the original — integrity rule 2', () => {
  it('drops the Kro hosts and keeps the external one', () => {
    const stripped = withKroOverlayRemoved(
      reconciliationMocks.enhancedAppleTask,
    )
    expect(stripped.hostedBy).toEqual([EndeavorHost.appleReminders])
    expect(citizenshipOf(stripped)).toBe(EndeavorCitizenship.tourist)
  })

  it('clears every Kro-only field', () => {
    const stripped = withKroOverlayRemoved(
      reconciliationMocks.enhancedAppleTask,
    )
    expect(hasKroOverlayValues(stripped)).toBe(false)
  })

  it('keeps the source route back to the original', () => {
    const stripped = withKroOverlayRemoved(
      reconciliationMocks.enhancedAppleTask,
    )
    expect(stripped.shadows).toHaveLength(1)
    expect(stripped.shadows?.[0]?.sourceIdentifier).toBe('apple-passport')
  })

  it('keeps the host-native fields untouched', () => {
    const stripped = withKroOverlayRemoved(
      reconciliationMocks.enhancedAppleTask,
    )
    expect(stripped.title).toBe('Renew passport')
    expect(stripped.due).toEqual(utcAt(29, 9))
  })

  it('refuses on a citizen, where Kro is the only store', () => {
    // Removing the overlay there would be deleting the endeavor itself.
    const citizen = reconciliationMocks.kroCitizenTask
    expect(withKroOverlayRemoved(citizen)).toBe(citizen)
    expect(citizen.value).toBe(4)
  })

  it('refuses on a tourist, which has no overlay to remove', () => {
    const tourist = reconciliationMocks.googleTouristEvent
    expect(withKroOverlayRemoved(tourist)).toBe(tourist)
  })
})

describe('field-scoped conflict resolution — integrity rule 3', () => {
  it('gives Kro every field on a citizen', () => {
    expect(kroOwnsField(reconciliationMocks.kroCitizenTask, 'title')).toBe(true)
    expect(kroOwnsField(reconciliationMocks.kroCitizenTask, 'value')).toBe(true)
  })

  it('gives the host the native fields on an enhanced row', () => {
    expect(kroOwnsField(reconciliationMocks.enhancedAppleTask, 'title')).toBe(
      false,
    )
    expect(kroOwnsField(reconciliationMocks.enhancedAppleTask, 'due')).toBe(
      false,
    )
  })

  it('gives Kro the overlay fields on an enhanced row', () => {
    expect(kroOwnsField(reconciliationMocks.enhancedAppleTask, 'value')).toBe(
      true,
    )
    expect(kroOwnsField(reconciliationMocks.enhancedAppleTask, 'effort')).toBe(
      true,
    )
  })

  it('is scoped per field, never per record', () => {
    // The same row answers differently for two fields — that is the rule.
    const row = reconciliationMocks.enhancedAppleTask
    expect(kroOwnsField(row, 'value')).not.toBe(kroOwnsField(row, 'title'))
  })

  it('flags a write that would overwrite a host-native field', () => {
    expect(
      wouldOverwriteHostNativeField(
        reconciliationMocks.enhancedAppleTask,
        'title',
      ),
    ).toBe(true)
    expect(
      wouldOverwriteHostNativeField(
        reconciliationMocks.enhancedAppleTask,
        'value',
      ),
    ).toBe(false)
  })

  it('never flags a write on a citizen', () => {
    expect(
      wouldOverwriteHostNativeField(
        reconciliationMocks.kroCitizenTask,
        'title',
      ),
    ).toBe(false)
  })
})

describe('orphan cleanup waits for the quarantine window — integrity rule 4', () => {
  const quarantineSeconds = DEFAULT_ORPHAN_QUARANTINE_SECONDS
  const now = RECONCILIATION_MOCK_NOW

  it('retains a shadow whose original is still present', () => {
    expect(
      orphanDispositionFor({ missingSince: null, now, quarantineSeconds }),
    ).toBe(OrphanDisposition.retain)
  })

  it('retains a shadow missing for less than the window', () => {
    const missingSince = new Date(now.getTime() - 60 * 1000)
    expect(orphanDispositionFor({ missingSince, now, quarantineSeconds })).toBe(
      OrphanDisposition.retain,
    )
  })

  it('retains a shadow exactly at the window’s edge', () => {
    // A boundary must fall on one side; retaining is the conservative one for
    // a rule whose purpose is not purging user data early.
    const missingSince = new Date(now.getTime() - quarantineSeconds * 1000)
    expect(orphanDispositionFor({ missingSince, now, quarantineSeconds })).toBe(
      OrphanDisposition.retain,
    )
  })

  it('cleans up a shadow missing for longer than the window', () => {
    const missingSince = new Date(
      now.getTime() - (quarantineSeconds + 1) * 1000,
    )
    expect(orphanDispositionFor({ missingSince, now, quarantineSeconds })).toBe(
      OrphanDisposition.cleanUp,
    )
  })

  it('drops only the orphaned provider’s shadows', () => {
    const missingSince = new Date(
      now.getTime() - (quarantineSeconds + 1) * 1000,
    )
    const cleaned = withOrphanedShadowsCleaned(
      reconciliationMocks.multiShadowChainRow,
      {
        missingSinceByProvider: new Map([
          [EndeavorHost.appleReminders, missingSince],
        ]),
        now,
      },
    )
    const sources = (cleaned.shadows ?? []).map((shadow) => shadow.source)
    expect(sources).not.toContain(EndeavorHost.appleReminders)
    expect(sources).toContain(EndeavorHost.googleCalendar)
  })

  it('returns the same reference when nothing is dropped', () => {
    const row = reconciliationMocks.multiShadowChainRow
    expect(
      withOrphanedShadowsCleaned(row, {
        missingSinceByProvider: new Map(),
        now,
      }),
    ).toBe(row)
  })

  it('normalizes an emptied shadow list back to null', () => {
    const missingSince = new Date(
      now.getTime() - (quarantineSeconds + 1) * 1000,
    )
    const cleaned = withOrphanedShadowsCleaned(
      reconciliationMocks.enhancedAppleTask,
      {
        missingSinceByProvider: new Map([
          [EndeavorHost.appleReminders, missingSince],
        ]),
        now,
      },
    )
    expect(cleaned.shadows).toBeNull()
  })

  it('never removes a host or deletes the endeavor', () => {
    const missingSince = new Date(
      now.getTime() - (quarantineSeconds + 1) * 1000,
    )
    const cleaned = withOrphanedShadowsCleaned(
      reconciliationMocks.enhancedAppleTask,
      {
        missingSinceByProvider: new Map([
          [EndeavorHost.appleReminders, missingSince],
        ]),
        now,
      },
    )
    expect(cleaned.hostedBy).toEqual(
      reconciliationMocks.enhancedAppleTask.hostedBy,
    )
    expect(cleaned.value).toBe(5)
  })

  it('honours a quarantine window overridden on the context', () => {
    const shortWindow = makeReconciliationContext({
      orphanQuarantineSeconds: 60,
    })
    const missingSince = new Date(now.getTime() - 120 * 1000)
    const cleaned = withOrphanedShadowsCleaned(
      reconciliationMocks.enhancedAppleTask,
      {
        missingSinceByProvider: new Map([
          [EndeavorHost.appleReminders, missingSince],
        ]),
        now,
        context: shortWindow,
      },
    )
    expect(cleaned.shadows).toBeNull()
  })

  it('leaves a shadowless row alone', () => {
    const row = reconciliationMocks.kroCitizenTask
    expect(
      withOrphanedShadowsCleaned(row, {
        missingSinceByProvider: new Map([
          [EndeavorHost.appleReminders, new Date(0)],
        ]),
        now,
      }),
    ).toBe(row)
  })
})
