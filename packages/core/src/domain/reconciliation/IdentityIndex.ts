/**
 * The transitive linker — canon's one indexed pass and its `UnionFind`.
 *
 * `docs/Features/SourceReconciliation.md`: *"Identity groups are constructed
 * in one indexed pass, including transitive links across several hosts, so
 * reconciliation remains responsive for large provider collections."*
 *
 * ## Why transitivity is not optional
 *
 * Take three rows: a local mirror `local` whose shadow points at `apple`, the
 * Apple-native row with id `apple`, and a cloud copy also carrying id `apple`.
 * The mirror and the cloud copy share **no** identity directly — the mirror
 * claims `(appleReminders, apple)`, the cloud copy claims `(supabase,
 * apple)`. They are one endeavor only because the Apple row bridges them.
 * Pairwise matching would emit two rows; union-find emits one.
 *
 * ## Why union-find rather than a hash-join
 *
 * Grouping by a single key cannot express "these two keys turned out to name
 * one thing". Identities merge *as rows arrive*, so the structure has to
 * support union after the fact. Union-find does it in near-constant amortized
 * time, which is what keeps the pass linear over a few hundred reminders —
 * canon replaced a quadratic pairwise scan with precisely this because the
 * old one *"became visible UI work"*.
 *
 * The implementation is iterative rather than canon's recursive `find`: a
 * pathological chain would otherwise be bounded by the JS call stack, and a
 * domain function that throws `RangeError` on a large-enough input is not one
 * this tier should ship.
 */
import type { Endeavor } from '../endeavor/Endeavor'
import {
  identitiesOf,
  primaryIdentifierOf,
  sourceIdentityKey,
} from './SourceIdentity'

/**
 * Disjoint-set forest with union by rank and full path compression.
 * Not exported: it is an implementation detail of the grouping, and a
 * general-purpose one belongs in `library/` if anything else ever needs it.
 */
class UnionFind {
  private readonly parents: number[]
  private readonly ranks: number[]

  constructor(count: number) {
    this.parents = Array.from({ length: count }, (_, index) => index)
    this.ranks = new Array<number>(count).fill(0)
  }

  /** The representative of `index`'s set, compressing the path walked. */
  find(index: number): number {
    let root = index
    while (this.parents[root] !== root) {
      root = this.parents[root] as number
    }
    let cursor = index
    while (this.parents[cursor] !== root) {
      const next = this.parents[cursor] as number
      this.parents[cursor] = root
      cursor = next
    }
    return root
  }

  union(lhs: number, rhs: number): void {
    const lhsRoot = this.find(lhs)
    const rhsRoot = this.find(rhs)
    if (lhsRoot === rhsRoot) return
    const lhsRank = this.ranks[lhsRoot] as number
    const rhsRank = this.ranks[rhsRoot] as number
    if (lhsRank < rhsRank) {
      this.parents[lhsRoot] = rhsRoot
    } else if (lhsRank > rhsRank) {
      this.parents[rhsRoot] = lhsRoot
    } else {
      this.parents[rhsRoot] = lhsRoot
      this.ranks[lhsRoot] = lhsRank + 1
    }
  }
}

/**
 * One identity group: the indices of every row that turned out to be the same
 * logical endeavor, in the order those rows appeared in the input.
 */
export interface IdentityGroup {
  readonly memberIndices: readonly number[]
}

/**
 * Group `endeavors` by logical identity in one indexed pass.
 *
 * Two indexes are built as the rows are walked — one over occurrence-scoped
 * primary identifiers, one over `(source, identifier)` identities — and the
 * first row to claim a key becomes its owner. Any later claimant is unioned
 * with that owner, which is where transitivity comes from: a row claiming two
 * keys owned by two different sets merges those sets.
 *
 * **Group order is first-appearance order, and so is member order.** The spec
 * requires *"unrelated rows remain separate and stable"*, and a reconciliation
 * that reordered the day's list would repaint every surface for no reason.
 */
export const groupByIdentity = (
  endeavors: readonly Endeavor[],
): readonly IdentityGroup[] => {
  const groups = new UnionFind(endeavors.length)
  const primaryOwners = new Map<string, number>()
  const identityOwners = new Map<string, number>()

  for (const [index, endeavor] of endeavors.entries()) {
    const primary = primaryIdentifierOf(endeavor)
    if (primary !== null) {
      const owner = primaryOwners.get(primary)
      if (owner === undefined) {
        primaryOwners.set(primary, index)
      } else {
        groups.union(index, owner)
      }
    }

    for (const identity of identitiesOf(endeavor)) {
      const key = sourceIdentityKey(identity)
      const owner = identityOwners.get(key)
      if (owner === undefined) {
        identityOwners.set(key, index)
      } else {
        groups.union(index, owner)
      }
    }
  }

  const order: number[] = []
  const membersByRoot = new Map<number, number[]>()
  for (let index = 0; index < endeavors.length; index += 1) {
    const root = groups.find(index)
    const members = membersByRoot.get(root)
    if (members === undefined) {
      order.push(root)
      membersByRoot.set(root, [index])
    } else {
      members.push(index)
    }
  }

  return order.map((root) => ({
    memberIndices: membersByRoot.get(root) ?? [],
  }))
}
