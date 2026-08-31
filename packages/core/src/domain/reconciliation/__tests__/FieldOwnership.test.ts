import { describe, expect, it } from 'vitest'
import { makeEndeavor } from '../../endeavor/Endeavor'
import { EndeavorHost } from '../../endeavor/EndeavorHost'
import { EndeavorKind } from '../../endeavor/EndeavorKind'
import { EndeavorStatus } from '../../endeavor/EndeavorStatus'
import { makeShadow } from '../../endeavor/Shadow'
import {
  carrierRank,
  hostAuthorityRank,
  hostNativeFields,
  kroOnlyFields,
  mergeHosts,
  mergeReconciled,
  mergeShadows,
  unmergedHostFields,
} from '../FieldOwnership'
import { makeReconciliationContext } from '../ReconciliationContext'
import { utcCalendar } from '../ReconciliationCalendar'
import {
  appleRow,
  appleShadow,
  localMirrorRow,
  recurrenceMocks,
  reconciliationMocks,
  utcAt,
} from '../__mocks__/Reconciliation.mocks'

const context = makeReconciliationContext({ calendar: utcCalendar })

describe('host authority', () => {
  it('ranks Kro’s own stores above every provider', () => {
    expect(hostAuthorityRank(EndeavorHost.local)).toBeLessThan(
      hostAuthorityRank(EndeavorHost.appleReminders),
    )
    expect(hostAuthorityRank(EndeavorHost.supabase)).toBeLessThan(
      hostAuthorityRank(EndeavorHost.googleCalendar),
    )
  })

  it('ranks local above supabase', () => {
    expect(hostAuthorityRank(EndeavorHost.local)).toBeLessThan(
      hostAuthorityRank(EndeavorHost.supabase),
    )
  })

  it('takes a row’s most authoritative host as its rank', () => {
    expect(carrierRank(reconciliationMocks.enhancedAppleTask)).toBe(
      hostAuthorityRank(EndeavorHost.local),
    )
  })

  it('ranks an unhosted row last', () => {
    const draft = makeEndeavor({
      id: 'draft',
      title: 'Draft',
      kind: EndeavorKind.task,
    })
    expect(carrierRank(draft)).toBe(Number.MAX_SAFE_INTEGER)
  })
})

describe('the field ownership catalogs', () => {
  it('names exactly the source-owned fields the merge writes', () => {
    expect([...hostNativeFields]).toEqual([
      'kind',
      'title',
      'status',
      'start',
      'due',
      'repeatConfig',
    ])
  })

  it('names the Kro-only enrichment the merge never writes', () => {
    expect([...kroOnlyFields]).toEqual([
      'sessionPoints',
      'value',
      'effort',
      'expiry',
      'associatedColor',
      'projectId',
    ])
  })

  it('keeps the two catalogs disjoint', () => {
    const overlap = (hostNativeFields as readonly string[]).filter((field) =>
      (kroOnlyFields as readonly string[]).includes(field),
    )
    expect(overlap).toEqual([])
  })

  it('records duration and completed as deliberately unmerged', () => {
    expect([...unmergedHostFields]).toEqual(['duration', 'completed'])
  })
})

describe('merging shadows', () => {
  it('unions two disjoint shadow lists', () => {
    const merged = mergeShadows(
      [appleShadow({ sourceIdentifier: 'a' })],
      [
        makeShadow({
          originalTitle: 'G',
          sourceIdentifier: 'g',
          kind: EndeavorKind.task,
          source: EndeavorHost.googleCalendar,
          group: null,
        }),
      ],
    )
    expect(merged).toHaveLength(2)
  })

  it('keys dedupe by the collision-safe identity key, not string concat', () => {
    // source is an enum today, so plain-space aliasing was only theoretical —
    // but the key now delegates to sourceIdentityKey so the invariant holds
    // even if a free-form provider ever appears. Spaced identifiers stay
    // distinct across providers and dedupe within one.
    const merged = mergeShadows(
      [appleShadow({ sourceIdentifier: 'a b' })],
      [appleShadow({ sourceIdentifier: 'a b' }), appleShadow({ sourceIdentifier: 'a' })],
    )
    expect(merged).toHaveLength(2)
  })

  it('deduplicates by provider and identifier', () => {
    const merged = mergeShadows(
      [appleShadow({ sourceIdentifier: 'a' })],
      [appleShadow({ sourceIdentifier: 'a' })],
    )
    expect(merged).toHaveLength(1)
  })

  it('upgrades a legacy shadow with freshly fetched priority evidence', () => {
    // "Fresh explicit no-priority metadata replaces an unknown cached shadow".
    const merged = mergeShadows(
      [appleShadow({ sourceIdentifier: 'a', priority: null })],
      [appleShadow({ sourceIdentifier: 'a', priority: 0 })],
    )
    expect(merged?.[0]?.appleReminderPriority).toBe(0)
  })

  it('never downgrades known evidence back to unknown', () => {
    const merged = mergeShadows(
      [appleShadow({ sourceIdentifier: 'a', priority: 5 })],
      [appleShadow({ sourceIdentifier: 'a', priority: null })],
    )
    expect(merged?.[0]?.appleReminderPriority).toBe(5)
  })

  it('returns null rather than an empty list when there are no shadows', () => {
    // The `null` vs `[]` distinction #7 preserves throughout.
    expect(mergeShadows(null, null)).toBeNull()
    expect(mergeShadows([], [])).toBeNull()
  })
})

describe('merging hosts', () => {
  it('unions without duplicating', () => {
    expect(
      mergeHosts(
        [EndeavorHost.local],
        [EndeavorHost.local, EndeavorHost.appleReminders],
      ),
    ).toEqual([EndeavorHost.local, EndeavorHost.appleReminders])
  })

  it('preserves first-appearance order', () => {
    expect(mergeHosts([EndeavorHost.supabase], [EndeavorHost.local])).toEqual([
      EndeavorHost.supabase,
      EndeavorHost.local,
    ])
  })

  it('handles an empty base', () => {
    expect(mergeHosts([], [EndeavorHost.local])).toEqual([EndeavorHost.local])
  })
})

describe('field-scoped ownership — the source direction', () => {
  it('lets fresh provider evidence win title, status and scheduling', () => {
    const mirror = localMirrorRow({
      id: 'local',
      sourceIdentifier: 'apple-1',
      title: 'Stale title',
    })
    const fresh = appleRow({
      id: 'apple-1',
      title: 'Fresh title',
      priority: 0,
      due: utcAt(27, 8),
    })
    const merged = mergeReconciled(mirror, fresh, context)
    expect(merged.title).toBe('Fresh title')
    expect(merged.due).toEqual(utcAt(27, 8))
  })

  it('lets fresh recurrence evidence reclassify a stale mirror', () => {
    // Canon: "Fresh daily Apple evidence enriches a stale local mirror".
    const merged = mergeReconciled(
      localMirrorRow({ id: 'local', sourceIdentifier: 'apple-1', value: 5 }),
      appleRow({
        id: 'apple-1',
        kind: EndeavorKind.reminder,
        recurrence: recurrenceMocks.daily,
        priority: 0,
      }),
      context,
    )
    expect(merged.kind).toBe(EndeavorKind.habit)
    expect(merged.repeatConfig).toEqual(recurrenceMocks.daily)
  })

  it('writes a due date onto a resolved habit, which a guarded setter would drop', () => {
    // The reason this lane does not route through #7's `withDue`: `due` is
    // matrix-irrelevant for a habit, so the guarded helper would no-op and the
    // provider's scheduling would be silently lost.
    const merged = mergeReconciled(
      localMirrorRow({ id: 'local', sourceIdentifier: 'apple-1' }),
      appleRow({
        id: 'apple-1',
        recurrence: recurrenceMocks.daily,
        priority: 0,
        due: utcAt(26, 6),
      }),
      context,
    )
    expect(merged.kind).toBe(EndeavorKind.habit)
    expect(merged.due).toEqual(utcAt(26, 6))
  })
})

describe('field-scoped ownership — the Kro direction', () => {
  it('keeps Kro-only enrichment when fresh provider evidence arrives', () => {
    const merged = mergeReconciled(
      localMirrorRow({
        id: 'local',
        sourceIdentifier: 'apple-1',
        value: 5,
        effort: 3,
      }),
      appleRow({
        id: 'apple-1',
        recurrence: recurrenceMocks.daily,
        priority: 0,
      }),
      context,
    )
    expect(merged.value).toBe(5)
    expect(merged.effort).toBe(3)
  })

  it('keeps every Kro overlay field, not merely value', () => {
    const enriched = makeEndeavor({
      ...localMirrorRow({ id: 'local', sourceIdentifier: 'apple-1' }),
      sessionPoints: 30,
      value: 4,
      effort: 2,
      expiry: utcAt(27, 23),
      associatedColor: '#4C6EF5',
      projectId: 'project-health',
    })
    const merged = mergeReconciled(
      enriched,
      appleRow({ id: 'apple-1', priority: 1 }),
      context,
    )
    expect(merged.sessionPoints).toBe(30)
    expect(merged.value).toBe(4)
    expect(merged.effort).toBe(2)
    expect(merged.expiry).toEqual(utcAt(27, 23))
    expect(merged.associatedColor).toBe('#4C6EF5')
    expect(merged.projectId).toBe('project-health')
  })

  it('keeps the Kro row as the carrier, not the provider row', () => {
    const merged = mergeReconciled(
      localMirrorRow({ id: 'local', sourceIdentifier: 'apple-1', value: 5 }),
      appleRow({ id: 'apple-1', priority: 0 }),
      context,
    )
    expect(merged.id).toBe('local')
  })

  it('keeps the Kro carrier whichever side it was passed on', () => {
    const mirror = localMirrorRow({
      id: 'local',
      sourceIdentifier: 'apple-1',
      value: 5,
    })
    const apple = appleRow({ id: 'apple-1', priority: 0 })
    expect(mergeReconciled(apple, mirror, context).id).toBe('local')
    expect(mergeReconciled(mirror, apple, context).id).toBe('local')
  })
})

describe('a late cached fetch cannot erase stronger evidence', () => {
  it('does not let a stale mirror downgrade an already-resolved habit', () => {
    // Canon: "A late stale local result cannot downgrade reconciled Apple
    // evidence". The stale row simply ranks lower and never supplies fields.
    const stale = localMirrorRow({ id: 'local', sourceIdentifier: 'apple-1' })
    const resolved = mergeReconciled(
      stale,
      appleRow({
        id: 'apple-1',
        kind: EndeavorKind.task,
        recurrence: recurrenceMocks.daily,
        priority: 7,
      }),
      context,
    )
    const afterLateFetch = mergeReconciled(resolved, stale, context)
    expect(afterLateFetch.kind).toBe(EndeavorKind.habit)
    expect(afterLateFetch.repeatConfig).toEqual(recurrenceMocks.daily)
  })

  it('prefers a provider-native row over a cached mirror’s evidence', () => {
    const cached = localMirrorRow({
      id: 'local',
      sourceIdentifier: 'apple-1',
      title: 'Cached title',
      priority: 1,
    })
    const native = appleRow({
      id: 'apple-1',
      title: 'Live title',
      priority: 0,
    })
    expect(mergeReconciled(cached, native, context).title).toBe('Live title')
  })

  it('leaves the carrier untouched when neither side has evidence', () => {
    // Two Kro-only rows: rank 0 both sides, so no source fields are written.
    const first = makeEndeavor({
      id: 'shared',
      title: 'Original',
      kind: EndeavorKind.task,
      hostedBy: [EndeavorHost.local],
      value: 3,
    })
    const second = makeEndeavor({
      ...first,
      title: 'Other',
      hostedBy: [EndeavorHost.supabase],
    })
    const merged = mergeReconciled(first, second, context)
    expect(merged.title).toBe('Original')
    expect(merged.value).toBe(3)
  })
})

describe('the same-origin update rule', () => {
  it('lets the incoming update win over the stale copy of one record', () => {
    // Identical id AND identical host set: one record at two points in time,
    // so completing a task must not be shadowed by the copy already in state.
    const stale = makeEndeavor({
      id: 'task-1',
      title: 'Buy milk',
      kind: EndeavorKind.task,
      status: EndeavorStatus.pending,
      hostedBy: [EndeavorHost.local],
    })
    const updated = makeEndeavor({
      ...stale,
      status: EndeavorStatus.closed,
      completed: utcAt(26, 10),
    })
    const merged = mergeReconciled(stale, updated, context)
    expect(merged.status).toBe(EndeavorStatus.closed)
    expect(merged.completed).toEqual(utcAt(26, 10))
  })

  it('does not apply when the host sets differ', () => {
    // Different host sets mean two competing sources, where authority decides.
    const local = makeEndeavor({
      id: 'task-1',
      title: 'Local',
      kind: EndeavorKind.task,
      hostedBy: [EndeavorHost.local],
    })
    const cloud = makeEndeavor({
      ...local,
      title: 'Cloud',
      hostedBy: [EndeavorHost.supabase],
    })
    expect(mergeReconciled(local, cloud, context).title).toBe('Local')
  })

  it('does not apply to two rows with an empty id', () => {
    const first = makeEndeavor({
      id: '',
      title: 'A',
      kind: EndeavorKind.task,
      hostedBy: [EndeavorHost.local],
    })
    const second = makeEndeavor({ ...first, title: 'B' })
    expect(mergeReconciled(first, second, context).title).toBe('A')
  })
})

describe('hosts and source routes are retained', () => {
  it('unions the hosts of both sides', () => {
    const merged = mergeReconciled(
      localMirrorRow({ id: 'local', sourceIdentifier: 'apple-1' }),
      appleRow({ id: 'apple-1', priority: 0 }),
      context,
    )
    expect(new Set(merged.hostedBy)).toEqual(
      new Set([EndeavorHost.local, EndeavorHost.appleReminders]),
    )
  })

  it('retains a source route from a row that lost every other field', () => {
    // "all known hosts and source routes are retained" — the losing side's
    // shadow is still how a mutation reaches that provider.
    const merged = mergeReconciled(
      makeEndeavor({
        id: 'local',
        title: 'Local',
        kind: EndeavorKind.task,
        hostedBy: [EndeavorHost.local],
        shadows: [
          makeShadow({
            originalTitle: 'Local',
            sourceIdentifier: 'google-1',
            kind: EndeavorKind.task,
            source: EndeavorHost.googleCalendar,
            group: null,
          }),
        ],
      }),
      appleRow({ id: 'local', priority: 0 }),
      context,
    )
    const sources = (merged.shadows ?? []).map((shadow) => shadow.source)
    expect(sources).toContain(EndeavorHost.googleCalendar)
    expect(sources).toContain(EndeavorHost.appleReminders)
  })

  it('carries the freshly learned priority evidence into the merged shadow', () => {
    const merged = mergeReconciled(
      localMirrorRow({
        id: 'local',
        sourceIdentifier: 'apple-1',
        priority: null,
      }),
      appleRow({ id: 'apple-1', priority: 0 }),
      context,
    )
    const appleShadowOut = (merged.shadows ?? []).find(
      (shadow) => shadow.source === EndeavorHost.appleReminders,
    )
    expect(appleShadowOut?.appleReminderPriority).toBe(0)
    expect(merged.kind).toBe(EndeavorKind.reminder)
  })
})
