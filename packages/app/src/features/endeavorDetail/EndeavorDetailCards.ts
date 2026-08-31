/**
 * The Detail **read** surface's data — canon's `EndeavorDetailSelectors.swift`
 * (`visibleFieldsBySectionSelector`, `visibleSectionsSelector`,
 * `relationManageAvailabilitySelector`) and the header derivations in
 * `KroUI/EndeavorDetail/EndeavorDetailView.swift`.
 *
 * Detail reads the matrix's **visibility** question; Edit reads its
 * **editability** one. v1 has no visible-but-locked non-relation field, so the
 * two happen to select the same fields today — they stay separate functions for
 * canon's own reason: Detail and Edit are independent surfaces, and the day a
 * field becomes visible-but-locked exactly one of them must change.
 *
 * Nothing here formats. A duration is seconds and a status is a status; turning
 * either into a string is `#30`'s, because this tier has no locale.
 */
import {
  type Endeavor,
  type EndeavorKind,
  type EndeavorRelation,
  type EndeavorStatus,
  type TimeIntervalSeconds,
  endeavorKindDisplayName,
  endeavorRelations,
  endeavorStatusDisplayName,
  isFieldVisible,
  isRelationEditable,
  isRelationVisible,
} from '@kro/core'
import type { EndeavorDetailSectionModel } from './EndeavorDetailEditing'
import {
  endeavorDetailSections,
  fieldsOfSection,
  sectionTitle,
} from './EndeavorDetailEditing'

/**
 * Every section with the fields **visible** for this kind, in display order.
 * Every section is present, with an empty array where nothing is relevant, so a
 * caller can look one up without an optional.
 */
export const visibleFieldsBySection = (
  kind: EndeavorKind,
): readonly EndeavorDetailSectionModel[] =>
  endeavorDetailSections.map((section) => ({
    section,
    title: sectionTitle(section),
    fields: fieldsOfSection(section).filter((field) =>
      isFieldVisible(field, kind),
    ),
  }))

/**
 * The sections worth a header — those with at least one visible field. A
 * section with none is omitted rather than shown empty, which is canon's rule.
 */
export const visibleSections = (
  kind: EndeavorKind,
): readonly EndeavorDetailSectionModel[] =>
  visibleFieldsBySection(kind).filter((model) => model.fields.length > 0)

/** One relation card on the read surface. */
export interface EndeavorRelationCard {
  readonly relation: EndeavorRelation
  /** Relations are always visible, whatever the kind (PO decision, 2026-07-10). */
  readonly isVisible: boolean
  /** Whether the manage affordance should be offered — per-kind, from the matrix. */
  readonly isManageable: boolean
  /** How many entries the endeavor currently holds for this relation. */
  readonly count: number
}

const relationCount = (
  endeavor: Endeavor,
  relation: EndeavorRelation,
): number => {
  switch (relation) {
    case 'performances':
      return endeavor.performances.length
    case 'defers':
      return endeavor.defers.length
    case 'hosts':
      return endeavor.hostedBy.length
    default:
      return (endeavor.shadows ?? []).length
  }
}

/**
 * Every relation, in declaration order, with whether its manage affordance is
 * live for this endeavor's kind.
 *
 * Visibility is unconditional and editability comes straight from
 * `isRelationEditable`, so the read surface and the reducer's own guard cannot
 * disagree about which relations are manageable.
 */
export const relationCards = (
  endeavor: Endeavor,
): readonly EndeavorRelationCard[] =>
  endeavorRelations.map((relation) => ({
    relation,
    isVisible: isRelationVisible(relation, endeavor.kind),
    isManageable: isRelationEditable(relation, endeavor.kind),
    count: relationCount(endeavor, relation),
  }))

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

/**
 * One header chip. Canon's header leads with the **kind** — *"the endeavor's
 * kind is its strongest identity signal"* — then the status, then the facts
 * that are set: duration, reward points, whether it repeats.
 *
 * The union carries values, never strings-for-display beyond the enum's own
 * canon label, so `#30` can render an icon and a tint per case without this
 * tier knowing what a colour is.
 */
export type EndeavorDetailBadge =
  | {
      readonly kind: 'kind'
      readonly value: EndeavorKind
      readonly label: string
    }
  | {
      readonly kind: 'status'
      readonly value: EndeavorStatus
      readonly label: string
    }
  | { readonly kind: 'duration'; readonly seconds: TimeIntervalSeconds }
  | { readonly kind: 'rewardPoints'; readonly points: number }
  | { readonly kind: 'repeats' }

/**
 * The header's badges, in canon's order.
 *
 * Kind and status are always present; the rest appear **only when set**, so a
 * sparse endeavor gets a compact header rather than a row of placeholders —
 * canon's own reasoning, preserved verbatim in behaviour.
 */
export const detailHeaderBadges = (
  endeavor: Endeavor,
): readonly EndeavorDetailBadge[] => {
  const badges: EndeavorDetailBadge[] = [
    {
      kind: 'kind',
      value: endeavor.kind,
      label: endeavorKindDisplayName(endeavor.kind),
    },
    {
      kind: 'status',
      value: endeavor.status,
      label: endeavorStatusDisplayName(endeavor.status),
    },
  ]
  if (endeavor.duration !== null) {
    badges.push({ kind: 'duration', seconds: endeavor.duration })
  }
  if (endeavor.sessionPoints !== null && endeavor.sessionPoints > 0) {
    badges.push({ kind: 'rewardPoints', points: endeavor.sessionPoints })
  }
  if (endeavor.repeatConfig !== null) {
    badges.push({ kind: 'repeats' })
  }
  return badges
}

/**
 * Canon's `displayTitle`: the trimmed title, or **"Untitled"** when it is blank.
 * A whitespace-only title is blank — otherwise the header would render an
 * invisible heading.
 */
export const detailDisplayTitle = (endeavor: Endeavor): string => {
  const trimmed = endeavor.title.trim()
  return trimmed.length === 0 ? 'Untitled' : trimmed
}
