import { describe, expect, it } from 'vitest'
import { type Endeavor, makeEndeavor } from '../../endeavor/Endeavor'
import { EndeavorHost } from '../../endeavor/EndeavorHost'
import { EndeavorKind } from '../../endeavor/EndeavorKind'
import { makeShadow } from '../../endeavor/Shadow'
import { groupByIdentity } from '../IdentityIndex'
import {
  appleRow,
  localMirrorRow,
  reconciliationMocks,
} from '../__mocks__/Reconciliation.mocks'

const groupSizes = (endeavors: readonly Endeavor[]): readonly number[] =>
  groupByIdentity(endeavors).map((group) => group.memberIndices.length)

describe('grouping by identity', () => {
  it('leaves unrelated rows in singleton groups, in input order', () => {
    const rows = [
      reconciliationMocks.kroCitizenTask,
      reconciliationMocks.googleTouristEvent,
      reconciliationMocks.enhancedAppleTask,
    ]
    expect(groupByIdentity(rows).map((group) => group.memberIndices)).toEqual([
      [0],
      [1],
      [2],
    ])
  })

  it('groups a duplicate within one host by primary id', () => {
    const first = makeEndeavor({
      id: 'same',
      title: 'A',
      kind: EndeavorKind.task,
      hostedBy: [EndeavorHost.local],
    })
    const second = makeEndeavor({ ...first, title: 'B' })
    expect(groupSizes([first, second])).toEqual([2])
  })

  it('groups a duplicate across two hosts by shadow identity', () => {
    expect(
      groupSizes([
        localMirrorRow({ id: 'local', sourceIdentifier: 'apple-1' }),
        appleRow({ id: 'apple-1', priority: 0 }),
      ]),
    ).toEqual([2])
  })

  it('links a chain transitively through a bridging row', () => {
    // mirror ──(apple shadow)── apple row ──(id)── cloud copy.
    // The mirror and the cloud copy share no identity directly.
    const rows = [
      localMirrorRow({ id: 'local', sourceIdentifier: 'apple-1' }),
      appleRow({ id: 'apple-1', priority: 0 }),
      makeEndeavor({
        id: 'apple-1',
        title: 'Cloud',
        kind: EndeavorKind.task,
        hostedBy: [EndeavorHost.supabase],
      }),
    ]
    expect(groupByIdentity(rows)).toHaveLength(1)
    expect(groupByIdentity(rows)[0]?.memberIndices).toEqual([0, 1, 2])
  })

  it('links a chain whose bridge arrives last in the input', () => {
    // Order-independence: union-find must merge sets already built.
    const mirror = localMirrorRow({ id: 'local', sourceIdentifier: 'apple-1' })
    const cloud = makeEndeavor({
      id: 'apple-1',
      title: 'Cloud',
      kind: EndeavorKind.task,
      hostedBy: [EndeavorHost.supabase],
    })
    const bridge = appleRow({ id: 'apple-1', priority: 0 })
    expect(groupByIdentity([mirror, cloud, bridge])).toHaveLength(1)
  })

  it('links a four-row chain hop by hop', () => {
    const chain = [
      localMirrorRow({ id: 'a', sourceIdentifier: 'apple-x' }),
      appleRow({ id: 'apple-x', priority: 0 }),
      makeEndeavor({
        id: 'apple-x',
        title: 'Cloud',
        kind: EndeavorKind.task,
        hostedBy: [EndeavorHost.supabase],
        shadows: [
          makeShadow({
            originalTitle: 'Cloud',
            sourceIdentifier: 'google-x',
            kind: EndeavorKind.task,
            source: EndeavorHost.googleCalendar,
            group: null,
          }),
        ],
      }),
      makeEndeavor({
        id: 'google-x',
        title: 'Google',
        kind: EndeavorKind.task,
        hostedBy: [EndeavorHost.googleCalendar],
      }),
    ]
    expect(groupByIdentity(chain)).toHaveLength(1)
  })

  it('does not bridge two rows through an empty identifier', () => {
    const first = reconciliationMocks.emptyIdentifierShadowRow
    const second = makeEndeavor({ ...first, id: 'orphan-b' })
    expect(groupSizes([first, second])).toEqual([1, 1])
  })

  it('does not bridge two providers sharing an identifier string', () => {
    expect(
      groupSizes([
        reconciliationMocks.enrichedLocalMirror,
        reconciliationMocks.crossProviderTwinRow,
      ]),
    ).toEqual([1, 1])
  })

  it('keeps two occurrences of one recurring event apart', () => {
    expect(
      groupSizes([
        reconciliationMocks.recurringEventMondayRow,
        reconciliationMocks.recurringEventTuesdayRow,
      ]),
    ).toEqual([1, 1])
  })

  it('preserves first-appearance order of groups', () => {
    const rows = [
      reconciliationMocks.kroCitizenTask,
      localMirrorRow({ id: 'local', sourceIdentifier: 'apple-1' }),
      reconciliationMocks.googleTouristEvent,
      appleRow({ id: 'apple-1', priority: 0 }),
    ]
    const groups = groupByIdentity(rows)
    expect(groups.map((group) => group.memberIndices)).toEqual([
      [0],
      [1, 3],
      [2],
    ])
  })

  it('handles an empty input', () => {
    expect(groupByIdentity([])).toEqual([])
  })

  it('groups a long chain without exhausting the call stack', () => {
    // Path compression must be iterative: a 20k-long chain built worst-case
    // would blow a recursive `find`. A domain function that throws
    // RangeError on a big-but-legal input is not shippable.
    const length = 20_000
    const rows: Endeavor[] = []
    for (let index = 0; index < length; index += 1) {
      rows.push(
        makeEndeavor({
          id: `row-${index}`,
          title: `Row ${index}`,
          kind: EndeavorKind.task,
          hostedBy: [EndeavorHost.local],
          shadows: [
            makeShadow({
              originalTitle: `Row ${index}`,
              // Each row's shadow points at the next row's id, so every row is
              // linked to its neighbour and the whole set is one group.
              sourceIdentifier: `row-${index + 1}`,
              kind: EndeavorKind.task,
              source: EndeavorHost.local,
              group: null,
            }),
          ],
        }),
      )
    }
    const groups = groupByIdentity(rows)
    expect(groups).toHaveLength(1)
    expect(groups[0]?.memberIndices).toHaveLength(length)
  })

  it('keeps a large unrelated collection entirely separate', () => {
    // Canon's "Large unrelated reminder collections remain stable".
    const rows = Array.from({ length: 1000 }, (_, index) =>
      makeEndeavor({
        id: `task-${index}`,
        title: `Task ${index}`,
        kind: EndeavorKind.task,
        hostedBy: [EndeavorHost.local],
      }),
    )
    expect(groupByIdentity(rows)).toHaveLength(1000)
  })
})
