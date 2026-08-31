import { describe, expect, it } from 'vitest'
import { makeEndeavor } from '../../endeavor/Endeavor'
import { EndeavorHost } from '../../endeavor/EndeavorHost'
import { EndeavorKind } from '../../endeavor/EndeavorKind'
import { makeShadow } from '../../endeavor/Shadow'
import { appleRemindersRuleset } from '../AppleRemindersRuleset'
import {
  externalHostsOf,
  isKroPersistedMirror,
  isLinkedToProvider,
  isProviderNativeRow,
  kroHostsOf,
  providerPriorityEvidence,
  rulesetFor,
  shadowsForProvider,
  sourceEvidenceFor,
  sourceEvidenceRank,
} from '../ProviderEvidence'
import {
  appleRow,
  localMirrorRow,
  recurrenceMocks,
  reconciliationMocks,
} from '../__mocks__/Reconciliation.mocks'

const apple = EndeavorHost.appleReminders

describe('provider linkage', () => {
  it('links a row the provider hosts', () => {
    expect(isLinkedToProvider(appleRow({ priority: 0 }), apple)).toBe(true)
  })

  it('links a row that only carries the provider’s shadow', () => {
    expect(isLinkedToProvider(localMirrorRow({}), apple)).toBe(true)
  })

  it('does not link through a shadow with an empty identifier', () => {
    expect(
      isLinkedToProvider(reconciliationMocks.emptyIdentifierShadowRow, apple),
    ).toBe(false)
  })

  it('does not link a row belonging to another provider', () => {
    expect(
      isLinkedToProvider(reconciliationMocks.googleTouristEvent, apple),
    ).toBe(false)
  })

  it('returns only that provider’s shadows', () => {
    const shadows = shadowsForProvider(
      reconciliationMocks.multiShadowChainRow,
      apple,
    )
    expect(shadows).toHaveLength(1)
    expect(shadows[0]?.sourceIdentifier).toBe('apple-chain')
  })
})

describe('priority evidence', () => {
  it('reads the provider’s priority from its shadow', () => {
    expect(
      providerPriorityEvidence(localMirrorRow({ priority: 4 }), apple),
    ).toBe(4)
  })

  it('distinguishes an explicit zero from absent evidence', () => {
    expect(
      providerPriorityEvidence(localMirrorRow({ priority: 0 }), apple),
    ).toBe(0)
    expect(
      providerPriorityEvidence(localMirrorRow({ priority: null }), apple),
    ).toBeNull()
  })

  it('skips a shadow with no evidence in favour of one that has it', () => {
    const row = makeEndeavor({
      id: 'row',
      title: 'Row',
      kind: EndeavorKind.task,
      hostedBy: [EndeavorHost.local],
      shadows: [
        makeShadow({
          originalTitle: 'Row',
          sourceIdentifier: 'a',
          kind: EndeavorKind.task,
          source: apple,
          group: null,
          appleReminderPriority: null,
        }),
        makeShadow({
          originalTitle: 'Row',
          sourceIdentifier: 'b',
          kind: EndeavorKind.task,
          source: apple,
          group: null,
          appleReminderPriority: 7,
        }),
      ],
    })
    expect(providerPriorityEvidence(row, apple)).toBe(7)
  })
})

describe('normalized source evidence', () => {
  it('treats a due date with no clock time as scheduled', () => {
    const evidence = sourceEvidenceFor(appleRow({ priority: 0 }), apple)
    expect(evidence.hasScheduledDate).toBe(true)
  })

  it('reports no scheduling when neither start nor due exists', () => {
    const evidence = sourceEvidenceFor(
      appleRow({ scheduled: false, priority: 0 }),
      apple,
    )
    expect(evidence.hasScheduledDate).toBe(false)
  })

  it('reports the current recurrence base', () => {
    const evidence = sourceEvidenceFor(
      appleRow({ recurrence: recurrenceMocks.weekly, priority: 0 }),
      apple,
    )
    expect(evidence.recurrenceBase).toBe('weekly')
  })
})

describe('the evidence rank ladder', () => {
  it('ranks a provider-native row highest', () => {
    expect(
      sourceEvidenceRank(appleRow({ priority: null }), appleRemindersRuleset),
    ).toBe(3)
  })

  it('ranks a mirror carrying priority evidence next', () => {
    expect(
      sourceEvidenceRank(
        localMirrorRow({ priority: 0 }),
        appleRemindersRuleset,
      ),
    ).toBe(2)
  })

  it('ranks a mirror carrying only a series recurrence below that', () => {
    expect(
      sourceEvidenceRank(
        localMirrorRow({ priority: null, recurrence: recurrenceMocks.daily }),
        appleRemindersRuleset,
      ),
    ).toBe(1)
  })

  it('ranks an uninformative linked mirror at zero', () => {
    expect(
      sourceEvidenceRank(
        localMirrorRow({ priority: null }),
        appleRemindersRuleset,
      ),
    ).toBe(0)
  })

  it('ranks an unlinked row at zero', () => {
    expect(
      sourceEvidenceRank(
        reconciliationMocks.kroCitizenTask,
        appleRemindersRuleset,
      ),
    ).toBe(0)
  })

  it('does not call a supabase-backed mirror provider-native', () => {
    // The documented divergence: canon's rank-3 test names only `.local`,
    // while its own `isSourceNativeAppleOccurrence` checks both Kro hosts.
    // A cloud-persisted mirror is no more "source native" than a local one.
    const cloudMirror = makeEndeavor({
      ...appleRow({ priority: null }),
      hostedBy: [EndeavorHost.appleReminders, EndeavorHost.supabase],
    })
    expect(isProviderNativeRow(cloudMirror, apple)).toBe(false)
    expect(sourceEvidenceRank(cloudMirror, appleRemindersRuleset)).toBeLessThan(
      3,
    )
  })
})

describe('row shapes', () => {
  it('recognizes a provider-native row', () => {
    expect(isProviderNativeRow(appleRow({ priority: 0 }), apple)).toBe(true)
  })

  it('recognizes a Kro-persisted mirror', () => {
    expect(isKroPersistedMirror(localMirrorRow({}), apple)).toBe(true)
  })

  it('does not call a provider-native row a Kro mirror', () => {
    expect(isKroPersistedMirror(appleRow({ priority: 0 }), apple)).toBe(false)
  })

  it('splits Kro hosts from external ones', () => {
    const row = reconciliationMocks.enhancedAppleTask
    expect(kroHostsOf(row)).toEqual([EndeavorHost.local])
    expect(externalHostsOf(row)).toEqual([EndeavorHost.appleReminders])
  })
})

describe('ruleset lookup', () => {
  it('finds the Apple ruleset for an Apple-linked row', () => {
    expect(
      rulesetFor(localMirrorRow({}), [appleRemindersRuleset])?.provider,
    ).toBe(apple)
  })

  it('finds nothing for a row no registered provider claims', () => {
    expect(
      rulesetFor(reconciliationMocks.googleTouristEvent, [
        appleRemindersRuleset,
      ]),
    ).toBeNull()
  })

  it('finds nothing when no rulesets are registered', () => {
    expect(rulesetFor(localMirrorRow({}), [])).toBeNull()
  })
})
