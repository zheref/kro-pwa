/**
 * The four relation surfaces' data — the port of
 * `EndeavorPerformancesFeature` / `EndeavorDefersFeature` /
 * `EndeavorHostsFeature` / `EndeavorShadowsFeature` (their Selectors and their
 * add-form state), plus the empty/read-only **copy discipline** their Views
 * carry.
 *
 * ## The read-only rule states WHY, per relation
 *
 * Canon never disables an affordance silently. When a relation is not editable
 * for the endeavor's kind, its screen replaces the add form with an info banner
 * naming the reason — *"This endeavor's kind can't record sessions."* — and the
 * empty state's message changes with it, because "log one below by hand" is a
 * lie on a surface that has no form. Both strings live here, keyed by relation
 * and by editability, so `#30` cannot invent a different reason and cannot omit
 * one.
 *
 * The editability answer itself is never restated: it is
 * `EndeavorFieldRelevance.isRelationEditable`, the same call the domain's
 * guarded `with…` helpers make before refusing a mutation.
 *
 * ## Hosts have no web binding yet, and that is said out loud
 *
 * Attaching or detaching a host is a **provider** lifecycle call — canon routes
 * it through `EndeavorMutationHostClient.attach`/`.detach`. This repo has no
 * provider adapter (Apple Calendar and Apple Reminders are impossible on the
 * web at all; Google Calendar arrives with `#33`), so every candidate reports
 * `isAttachable: false` with a reason, and the reducer refuses the mutation with
 * a typed exception instead of pretending it worked. Named here and in the PR
 * body rather than quietly dropped.
 */
import {
  type Defer,
  type Endeavor,
  type EndeavorHost,
  type EndeavorKind,
  EndeavorRelation,
  type EndeavorTag,
  type Perform,
  type PerformResolution,
  type Shadow,
  type TimeIntervalSeconds,
  assertNever,
  endeavorHostDisplayName,
  endeavorHosts,
  isKroOwnedHost,
  isRelationEditable,
} from '@kro/core'

/**
 * Why a relation is read-only for this kind, or `null` when it is editable.
 *
 * Verbatim from each relation screen's info banner. The strings are canon's
 * user-facing copy, so a reviewer can diff them against the Swift.
 */
export const relationReadOnlyReason = (
  relation: EndeavorRelation,
  kind: EndeavorKind,
): string | null => {
  if (isRelationEditable(relation, kind)) return null
  switch (relation) {
    case EndeavorRelation.performances:
      return "This endeavor's kind can't record sessions."
    case EndeavorRelation.defers:
      return "This endeavor's kind can't record defers."
    case EndeavorRelation.hosts:
      return "This endeavor's kind can't change where it's mirrored."
    case EndeavorRelation.shadows:
      return "This endeavor's kind can't change its external mirrors."
    default:
      return assertNever(relation)
  }
}

/** A relation list with nothing in it — canon's `EmptyStateCard` content. */
export interface RelationEmptyState {
  readonly title: string
  readonly message: string
}

/**
 * The empty state for one relation.
 *
 * The message depends on editability wherever canon's does: a read-only
 * Performances list says sessions *will appear here*, an editable one invites
 * the user to log one.
 */
export const relationEmptyState = (
  relation: EndeavorRelation,
  kind: EndeavorKind,
): RelationEmptyState => {
  const isEditable = isRelationEditable(relation, kind)
  switch (relation) {
    case EndeavorRelation.performances:
      return {
        title: 'No sessions yet',
        message: isEditable
          ? 'Start a session on this endeavor, or log one below by hand.'
          : 'Sessions logged against this endeavor will appear here.',
      }
    case EndeavorRelation.defers:
      return {
        title: 'Never deferred',
        message: 'This endeavor has kept every due date it was given.',
      }
    case EndeavorRelation.hosts:
      return {
        title: 'Not mirrored anywhere',
        message: isEditable
          ? 'Attach a provider below to keep this endeavor in sync outside Kro.'
          : 'This endeavor lives only in Kro.',
      }
    case EndeavorRelation.shadows:
      return {
        title: 'No shadows yet',
        message:
          'A shadow appears when this endeavor is mirrored from a calendar, reminders list, or another source.',
      }
    default:
      return assertNever(relation)
  }
}

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

/** Canon's `performancesSelector` — already a non-optional array. */
export const performancesOf = (endeavor: Endeavor): readonly Perform[] =>
  endeavor.performances

/** Canon's `defersSelector`, in `defers` order — the audit history. */
export const defersOf = (endeavor: Endeavor): readonly Defer[] =>
  endeavor.defers

/** Canon's `shadowsSelector` — `shadows` normalised to a non-optional array. */
export const shadowsOf = (endeavor: Endeavor): readonly Shadow[] =>
  endeavor.shadows ?? []

/**
 * Whether a host is an external provider. Kro's own two stores (`supabase`,
 * `local`) have nothing to attach to, which is canon's `isExternal` inverted
 * through the host taxonomy this repo already ships.
 */
export const isExternalHost = (host: EndeavorHost): boolean =>
  !isKroOwnedHost(host)

/** Canon's `attachedHostsSelector` — the external hosts this endeavor is on. */
export const attachedHostsOf = (endeavor: Endeavor): readonly EndeavorHost[] =>
  endeavor.hostedBy.filter(isExternalHost)

/**
 * One attach candidate, and whether this build can actually attach it.
 *
 * `isAttachable` is **false for every host today** — see the module note. The
 * candidate is still listed, with its reason, because hiding it would make the
 * gap invisible to the user and to the next reader.
 */
export interface HostAttachCandidate {
  readonly host: EndeavorHost
  readonly label: string
  readonly isAttachable: boolean
  /** Why not, when `isAttachable` is false. */
  readonly unavailableReason: string | null
}

/** Why this build cannot attach a given provider. `null` once one is wired. */
export const hostAdapterUnavailableReason = (
  host: EndeavorHost,
): string | null => {
  switch (host) {
    case 'appleCalendar':
    case 'appleReminders':
      return 'Apple Calendar and Reminders have no web equivalent.'
    case 'googleCalendar':
      return 'Google Calendar mirroring is not connected yet.'
    case 'outlookCalendar':
      return 'Outlook mirroring is off in this build.'
    default:
      return 'This provider has no web adapter yet.'
  }
}

/** Canon's `availableHostsToAttachSelector`, each with its web availability. */
export const hostAttachCandidatesOf = (
  endeavor: Endeavor,
): readonly HostAttachCandidate[] =>
  endeavorHosts
    .filter((host) => isExternalHost(host) && !endeavor.hostedBy.includes(host))
    .map((host) => ({
      host,
      label: endeavorHostDisplayName(host),
      isAttachable: false,
      unavailableReason: hostAdapterUnavailableReason(host),
    }))

// ---------------------------------------------------------------------------
// Add forms
// ---------------------------------------------------------------------------

/**
 * The hand-logged performance form. Canon's `EndeavorPerformancesView` keeps
 * these as view `@State`; `RC-4` forbids the `useState` equivalent, and the
 * confirm has to read them from somewhere the Producer can also see, so they
 * are feature state here.
 */
export interface PerformanceDraft {
  readonly date: Date
  readonly durationSeconds: TimeIntervalSeconds
  readonly resolution: PerformResolution
  readonly notes: string
  readonly rewardPoints: number
  /**
   * Whether this was a whole focus session. A hand-logged entry says **true**
   * only when the user says so: `empiricalDuration` counts only whole sessions,
   * so defaulting it to `true` would let a typo teach the recommendation.
   */
  readonly wasCompletedInSession: boolean
  /** The row being edited in place, or `null` when this is a new entry. */
  readonly editingIndex: number | null
}

/** The defer form: where the endeavor is pushed to, and optionally why. */
export interface DeferDraft {
  readonly target: Date
  readonly reason: string
}

/** The shadow form — the four identity columns a mirror is matched on. */
export interface ShadowDraft {
  readonly originalTitle: string
  readonly sourceIdentifier: string
  readonly source: string
  readonly kind: EndeavorKind
  readonly group: string
}

/** Whichever add form is open, or `null` when none is. */
export type RelationDraft =
  | { readonly relation: 'performances'; readonly draft: PerformanceDraft }
  | { readonly relation: 'defers'; readonly draft: DeferDraft }
  | { readonly relation: 'shadows'; readonly draft: ShadowDraft }
  | { readonly relation: 'hosts'; readonly host: EndeavorHost | null }

/**
 * Whether the open form can be committed.
 *
 * Every relation has one rule, and each is the smallest thing that makes the
 * row meaningful: a performance needs a positive duration, a shadow needs both
 * halves of its identity, a host needs a selection. A defer always can — its
 * target defaults to a real moment and its reason is optional by design.
 */
export const isRelationDraftCommittable = (draft: RelationDraft): boolean => {
  switch (draft.relation) {
    case 'performances':
      return draft.draft.durationSeconds > 0
    case 'defers':
      return true
    case 'shadows':
      return (
        draft.draft.originalTitle.trim().length > 0 &&
        draft.draft.sourceIdentifier.trim().length > 0
      )
    default:
      return draft.host !== null
  }
}

/** The tags a `tagToggled` change can name — re-exported for the add forms. */
export type { EndeavorTag }
