import { describe, expect, it } from 'vitest'
import { makeEndeavor } from '../../endeavor/Endeavor'
import { EndeavorHost } from '../../endeavor/EndeavorHost'
import { EndeavorKind } from '../../endeavor/EndeavorKind'
import { makeShadow } from '../../endeavor/Shadow'
import {
  identitiesOf,
  makeSourceIdentity,
  occurrenceScopedIdentifier,
  primaryIdentifierOf,
  representsSameEndeavor,
  sourceIdentitiesEqual,
  sourceIdentityKey,
} from '../SourceIdentity'
import {
  appleShadow,
  appleRow,
  localMirrorRow,
  reconciliationMocks,
  utcAt,
} from '../__mocks__/Reconciliation.mocks'

describe('a source identity is a (provider, identifier) pair', () => {
  it('compares equal only when both halves match', () => {
    const identity = makeSourceIdentity('appleReminders', 'abc')
    expect(
      sourceIdentitiesEqual(
        identity,
        makeSourceIdentity('appleReminders', 'abc'),
      ),
    ).toBe(true)
    expect(
      sourceIdentitiesEqual(
        identity,
        makeSourceIdentity('googleCalendar', 'abc'),
      ),
    ).toBe(false)
    expect(
      sourceIdentitiesEqual(
        identity,
        makeSourceIdentity('appleReminders', 'xyz'),
      ),
    ).toBe(false)
  })

  it('keys two pairs apart even when their halves are re-split', () => {
    // The separator must not let ("a b","c") alias ("a","b c").
    expect(sourceIdentityKey(makeSourceIdentity('a b', 'c'))).not.toBe(
      sourceIdentityKey(makeSourceIdentity('a', 'b c')),
    )
  })

  it('collapses a repeated claim to one entry', () => {
    // A row hosted by Apple whose shadow points at its own id claims the same
    // pair twice; the identity set must not double-count it.
    const row = appleRow({ id: 'apple-dup' })
    const appleClaims = identitiesOf(row).filter(
      (identity) => identity.source === EndeavorHost.appleReminders,
    )
    expect(appleClaims).toHaveLength(1)
  })
})

describe('logical identity — the spec’s three clauses', () => {
  it('matches two rows sharing a primary identifier', () => {
    // "their primary identifiers are equal"
    const local = makeEndeavor({
      id: 'shared',
      title: 'A',
      kind: EndeavorKind.task,
      hostedBy: [EndeavorHost.local],
    })
    const cloud = makeEndeavor({
      id: 'shared',
      title: 'B',
      kind: EndeavorKind.task,
      hostedBy: [EndeavorHost.supabase],
    })
    expect(representsSameEndeavor(local, cloud)).toBe(true)
  })

  it('matches a local mirror to the provider row its shadow points at', () => {
    // "they claim the same non-empty source identifier for the same provider"
    expect(
      representsSameEndeavor(
        localMirrorRow({ id: 'local', sourceIdentifier: 'apple-1' }),
        appleRow({ id: 'apple-1', priority: 0 }),
      ),
    ).toBe(true)
  })

  it('never collides two providers using the same identifier string', () => {
    // "Identifiers from different providers never collide."
    expect(
      representsSameEndeavor(
        reconciliationMocks.enrichedLocalMirror,
        reconciliationMocks.crossProviderTwinRow,
      ),
    ).toBe(false)
  })

  it('never matches two rows whose shadow identifiers are empty', () => {
    // "Empty identifiers never match."
    const first = reconciliationMocks.emptyIdentifierShadowRow
    const second = makeEndeavor({
      ...reconciliationMocks.emptyIdentifierShadowRow,
      id: 'orphan-b',
    })
    expect(representsSameEndeavor(first, second)).toBe(false)
  })

  it('omits an empty shadow identifier from the identity set entirely', () => {
    const identities = identitiesOf(
      reconciliationMocks.emptyIdentifierShadowRow,
    )
    expect(identities.every((identity) => identity.identifier !== '')).toBe(
      true,
    )
  })

  it('leaves two genuinely unrelated rows unmatched', () => {
    expect(
      representsSameEndeavor(
        reconciliationMocks.kroCitizenTask,
        reconciliationMocks.googleTouristEvent,
      ),
    ).toBe(false)
  })
})

describe('the identity set a row claims', () => {
  it('claims one pair per shadow, under that shadow’s own provider', () => {
    const identities = identitiesOf(reconciliationMocks.multiShadowChainRow)
    expect(identities).toContainEqual(
      makeSourceIdentity(EndeavorHost.appleReminders, 'apple-chain'),
    )
    expect(identities).toContainEqual(
      makeSourceIdentity(EndeavorHost.googleCalendar, 'google-chain'),
    )
  })

  it('claims its own id under every host that stores it', () => {
    const identities = identitiesOf(reconciliationMocks.multiShadowChainRow)
    expect(identities).toContainEqual(
      makeSourceIdentity(EndeavorHost.local, 'chain-root'),
    )
    expect(identities).toContainEqual(
      makeSourceIdentity(EndeavorHost.supabase, 'chain-root'),
    )
  })

  it('claims nothing for a host when the row has no id', () => {
    const idless = makeEndeavor({
      id: '',
      title: 'Unsaved',
      kind: EndeavorKind.task,
      hostedBy: [EndeavorHost.local],
    })
    expect(identitiesOf(idless)).toHaveLength(0)
    expect(primaryIdentifierOf(idless)).toBeNull()
  })

  it('claims nothing at all for an unhosted, shadowless draft', () => {
    const draft = makeEndeavor({
      id: 'draft-1',
      title: 'Just captured',
      kind: EndeavorKind.task,
    })
    expect(identitiesOf(draft)).toHaveLength(0)
  })
})

describe('occurrence scoping for calendar events', () => {
  it('scopes a calendar event’s identifier to its start instant', () => {
    const scoped = occurrenceScopedIdentifier(
      'meeting-series',
      reconciliationMocks.recurringEventMondayRow,
    )
    expect(scoped).toBe(`meeting-series@${utcAt(24, 15).getTime()}`)
  })

  it('keeps two occurrences of one meeting distinct', () => {
    // The multi-day fetch case: same calendar-item id, different days.
    expect(
      representsSameEndeavor(
        reconciliationMocks.recurringEventMondayRow,
        reconciliationMocks.recurringEventTuesdayRow,
      ),
    ).toBe(false)
  })

  it('still merges two hosts’ copies of the same occurrence', () => {
    // "cross-host copies of one occurrence still merge"
    const mirrored = makeEndeavor({
      ...reconciliationMocks.recurringEventMondayRow,
      hostedBy: [EndeavorHost.local],
      shadows: [
        makeShadow({
          originalTitle: 'Weekly sync',
          sourceIdentifier: 'meeting-series',
          kind: EndeavorKind.calendarEvent,
          source: EndeavorHost.googleCalendar,
          group: 'Work',
        }),
      ],
    })
    expect(
      representsSameEndeavor(
        reconciliationMocks.recurringEventMondayRow,
        mirrored,
      ),
    ).toBe(true)
  })

  it('does not scope a non-event row that happens to carry a start', () => {
    const task = makeEndeavor({
      id: 'task-with-start',
      title: 'Task',
      kind: EndeavorKind.task,
      start: utcAt(24, 15),
      hostedBy: [EndeavorHost.local],
    })
    expect(occurrenceScopedIdentifier('task-with-start', task)).toBe(
      'task-with-start',
    )
  })

  it('does not scope an event with no start to fall back on', () => {
    const undated = makeEndeavor({
      id: 'floating-event',
      title: 'Someday',
      kind: EndeavorKind.calendarEvent,
      hostedBy: [EndeavorHost.googleCalendar],
    })
    expect(occurrenceScopedIdentifier('floating-event', undated)).toBe(
      'floating-event',
    )
  })

  it('scopes a shadow identifier by the claiming row’s own occurrence', () => {
    const shadowed = makeEndeavor({
      id: 'local-copy',
      title: 'Weekly sync',
      kind: EndeavorKind.calendarEvent,
      start: utcAt(25, 15),
      hostedBy: [EndeavorHost.local],
      shadows: [
        appleShadow({
          sourceIdentifier: 'meeting-series',
          kind: EndeavorKind.calendarEvent,
        }),
      ],
    })
    const identities = identitiesOf(shadowed)
    expect(identities).toContainEqual(
      makeSourceIdentity(
        EndeavorHost.appleReminders,
        `meeting-series@${utcAt(25, 15).getTime()}`,
      ),
    )
  })
})
