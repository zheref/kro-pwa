/**
 * The render tier's presentation mapping for Find and All Tasks — the port of
 * the display decisions that live inside `KroUI/Find/FindView.swift` and
 * `KroUI/Tasks/TasksView.swift` themselves.
 *
 * Everything here is pure and has no React in it, so the three chip rows, the
 * four empty states and the row projection are unit-testable without mounting a
 * surface. That split is deliberate: canon's `FindView` hardcodes six kind
 * chips, six host chips and nine status chips inline, and a hardcoded list is
 * exactly what drifts from the domain the day a kind is added.
 *
 * ## The chips are DERIVED, not transcribed
 *
 * Canon lists its chips literally. Here each row is built by mapping
 * `@kro/core`'s own `endeavorKinds` / `endeavorHosts` / `endeavorStatuses`
 * through the merged kit's projections (`kindShortLabel`, `kindGlyph`,
 * `kindTint`, …), so a new kind arrives with a chip and a contrast-verified
 * tint rather than silently missing one. The one place canon's literal list and
 * the domain disagree is `reminder`: canon's Find has no Reminder chip because
 * iOS folds reminders into tasks at the source. The web fetches the same
 * domain, so the chip is present and the test says why.
 *
 * ## Canon's `badgeColor` is NOT ported
 *
 * `FindView`'s `FilterChip` paints `.blue`, `.red`, `Color(white: 0.8)` — the
 * raw system tints the kit's `endeavorProjections` header already refuses,
 * because canon's own comment calls them unreadable (2.0–3.5:1). The chips here
 * carry the contrast-verified semantic roles instead, which is the same
 * substitution the merged kit made for the row badges.
 *
 * ## The two substituted symbols are gone (KC-IS-#71 item 13)
 *
 * `line.3.horizontal.decrease.circle` and `slider.horizontal.3` were in neither
 * symbol map when this file was written, so the two empty states drew the
 * nearest mapped neighbours and said so here. Both rows are in
 * `system/icons/icons.ts` now, and the states below name canon's own symbols.
 */
import {
  type Endeavor,
  type EndeavorComputedState,
  type EndeavorHost,
  type EndeavorKind,
  type EndeavorStatus,
  assertNever,
  endeavorHostDisplayName,
  endeavorHosts,
  endeavorKinds,
  endeavorStatuses,
} from '@kro/core'
import type {
  EndeavorRowBadge,
  EndeavorRowTimeInfo,
} from '../../../design/endeavor/EndeavorRow'
import { type ChipTint, semanticTint } from '../../../design/endeavor/KroChip'
import type { KitSymbolName } from '../../../design/endeavor/endeavorIcons'
import {
  hostGlyph,
  hostTint,
  kindGlyph,
  kindShortLabel,
  kindTint,
  statusGlyph,
  statusShortLabel,
  statusTint,
} from '../../../design/endeavor/endeavorProjections'
import type { FindEmptyState, FindFilterToggle } from '../FindState'

/* ------------------------------------------------------------------------ */
/* Filter chips                                                              */
/* ------------------------------------------------------------------------ */

/** One chip in one of Find's filter rows. */
export interface FindFilterChip {
  /** Stable key — the raw domain value, or `'archived'` for the odd one out. */
  readonly id: string
  readonly label: string
  readonly icon: KitSymbolName
  readonly tint: ChipTint
  /**
   * What flipping the chip dispatches, or `null` for Show Archived — which is
   * its own event because it is a lens *flag*, not a hidden-set membership.
   */
  readonly toggle: FindFilterToggle | null
}

/** One labelled row of chips. Canon renders three horizontal scrollers. */
export interface FindFilterRow {
  readonly id: 'kind' | 'host' | 'status'
  /** The row's accessible name. Canon's rows are unlabelled visually. */
  readonly label: string
  readonly chips: readonly FindFilterChip[]
}

const kindChip = (kind: EndeavorKind): FindFilterChip => ({
  id: kind,
  label: kindShortLabel(kind),
  icon: kindGlyph(kind),
  tint: semanticTint(kindTint(kind)),
  toggle: { axis: 'kind', value: kind },
})

const hostChip = (host: EndeavorHost): FindFilterChip => ({
  id: host,
  label: endeavorHostDisplayName(host),
  icon: hostGlyph(host),
  tint: semanticTint(hostTint(host)),
  toggle: { axis: 'host', value: host },
})

const statusChip = (status: EndeavorStatus): FindFilterChip => ({
  id: status,
  label: statusShortLabel(status),
  icon: statusGlyph(status),
  tint: semanticTint(statusTint(status)),
  toggle: { axis: 'status', value: status },
})

/**
 * Canon's Archived chip: the last chip of the status row, and the only one that
 * is not a status. It flips the lens's `showArchived` flag, so it carries no
 * `toggle`; the surface dispatches `userDidToggleShowArchived` for it.
 */
export const ARCHIVED_CHIP: FindFilterChip = {
  id: 'archived',
  label: 'Archived',
  icon: 'archivebox',
  tint: semanticTint('chipNeutral'),
  toggle: null,
}

/**
 * The three rows Find shows, in canon's order: kinds, hosts, statuses (+ the
 * Archived flag riding at the end of the status row, exactly as canon does).
 */
export const findFilterRows: readonly FindFilterRow[] = [
  { id: 'kind', label: 'Kinds', chips: endeavorKinds.map(kindChip) },
  { id: 'host', label: 'Sources', chips: endeavorHosts.map(hostChip) },
  {
    id: 'status',
    label: 'Statuses',
    chips: [...endeavorStatuses.map(statusChip), ARCHIVED_CHIP],
  },
]

/**
 * Whether a chip reads as selected.
 *
 * The lens stores what is HIDDEN, so a chip is selected when its value is
 * absent from the hidden set — canon's `selectedKinds.contains(...)` read from
 * the other end. Show Archived is the flag itself.
 */
export const isFilterChipSelected = (
  chip: FindFilterChip,
  selected: {
    readonly kinds: readonly EndeavorKind[]
    readonly hosts: readonly EndeavorHost[]
    readonly statuses: readonly EndeavorStatus[]
    readonly computedStates?: readonly EndeavorComputedState[]
    readonly showArchived: boolean
  },
): boolean => {
  const toggle = chip.toggle
  if (toggle === null) return selected.showArchived
  switch (toggle.axis) {
    case 'kind':
      return selected.kinds.includes(toggle.value)
    case 'host':
      return selected.hosts.includes(toggle.value)
    case 'status':
      return selected.statuses.includes(toggle.value)
    case 'computedState':
      return (selected.computedStates ?? []).includes(toggle.value)
    case 'calendar':
      return false
    default:
      return assertNever(toggle)
  }
}

/* ------------------------------------------------------------------------ */
/* Rows                                                                      */
/* ------------------------------------------------------------------------ */

/**
 * A leading emoji in the title, canon's `EndeavorCardModel` rule: the first
 * grapheme is the row symbol when it is an emoji, and the title loses it.
 *
 * Re-derived here rather than reached for through `endeavorCardModelFrom`,
 * because that seam builds a whole card model (urgency, reward, due bands) the
 * Find row does not render, and building one per row per keystroke of the
 * search field is the cost this avoids.
 */
const EMOJI_LEAD =
  /^(\p{Extended_Pictographic}(️|‍\p{Extended_Pictographic})*)\s*/u

/** The row's symbol and the title with a leading emoji stripped. */
export const findRowSymbol = (
  title: string,
): {
  readonly symbol: string
  readonly isGeneric: boolean
  readonly title: string
} => {
  const match = EMOJI_LEAD.exec(title)
  const lead = match?.[1]
  if (match === null || lead === undefined) {
    return { symbol: 'checkmark.circle', isGeneric: true, title: title.trim() }
  }
  return {
    symbol: lead,
    isGeneric: false,
    title: title.slice(match[0].length).trim(),
  }
}

/**
 * What a Find row prints about time. Canon's `find` row preset shows time info,
 * and an endeavor with a `start` reads as a range when it also has a duration.
 */
export const findRowTimeInfo = (
  endeavor: Endeavor,
): EndeavorRowTimeInfo | undefined => {
  if (endeavor.start !== null && endeavor.duration !== null) {
    return {
      kind: 'timeRange',
      start: endeavor.start,
      end: new Date(endeavor.start.getTime() + endeavor.duration * 1000),
    }
  }
  if (endeavor.due !== null) {
    return { kind: 'dueTime', date: endeavor.due, duration: endeavor.duration }
  }
  if (endeavor.duration !== null) {
    return { kind: 'duration', seconds: endeavor.duration }
  }
  return undefined
}

/**
 * The two trailing badges the `find` row preset carries: the kind and the
 * status. Canon's Find row shows exactly those two, which is why the preset
 * puts badges on the trailing edge rather than under the title.
 */
export const findRowBadges = (
  endeavor: Endeavor,
): readonly EndeavorRowBadge[] => [
  { kind: 'endeavorKind', value: endeavor.kind },
  { kind: 'status', value: endeavor.status },
]

/* ------------------------------------------------------------------------ */
/* Empty states                                                              */
/* ------------------------------------------------------------------------ */

/** Canon's `placeholderView` content, verbatim, for each of the four states. */
export interface FindEmptyCopy {
  readonly icon: KitSymbolName
  readonly title: string
  readonly message: string
}

/**
 * The four messages `FindView.mainContent` branches between, in canon's words.
 *
 * They are four different sentences because they are four different problems:
 * nothing fetched, everything filtered out by the chips, a search that matched
 * nothing, and filters that hid what was there. Collapsing any two would be the
 * regression `#29`'s `FindEmptyState` union exists to prevent.
 */
export const findEmptyCopy = (state: FindEmptyState): FindEmptyCopy => {
  switch (state.kind) {
    case 'noData':
      return {
        icon: 'tray',
        title: 'No Endeavors Yet',
        message: "Add tasks, events, or habits and they'll appear here.",
      }
    case 'noFilters':
      return {
        icon: 'line.3.horizontal.decrease.circle',
        title: 'No Filters Selected',
        message: 'Select at least one filter above to browse your endeavors.',
      }
    case 'noResults':
      return {
        icon: 'magnifyingglass',
        title: 'No Results',
        message: `No endeavors match "${state.query}" with the current filters.`,
      }
    case 'filteredOut':
      return {
        icon: 'slider.horizontal.3',
        title: 'Nothing Here',
        message: 'Try adjusting your filters to see more endeavors.',
      }
    default:
      return assertNever(state)
  }
}

/* ------------------------------------------------------------------------ */
/* The ellipsis menu                                                         */
/* ------------------------------------------------------------------------ */

/** One entry of Find's overflow menu. */
export interface FindOverflowEntry {
  readonly id: 'deleteAllVisible' | 'archiveAllVisible'
  readonly label: string
  readonly icon: KitSymbolName
  readonly isDestructive: boolean
}

/**
 * Canon's two bulk entries, with canon's counted labels.
 *
 * Canon's menu also carries Sources and Settings; both are the *shell's*
 * destinations here (`MainShellFragment` already renders the Settings gear on
 * every non-primary tab, and Sources is Settings → Integrations), so repeating
 * them inside a feature's menu would be the second copy of a control the
 * container already owns — the ownership rule the shell's own header states.
 *
 * There is deliberately **no confirmation step**: `FindProducer`'s own note
 * rules that canon applies both immediately and optimistically, and that adding
 * a confirm dialog "would be a new business rule". The destructive *role* on
 * Delete is the affordance, which is what the kit's `DropdownMenuItem`
 * destructive treatment and this flag carry.
 */
export const findOverflowEntries = (
  visibleCount: number,
): readonly FindOverflowEntry[] => [
  {
    id: 'deleteAllVisible',
    label: `Delete all visible (${visibleCount})`,
    icon: 'trash',
    isDestructive: true,
  },
  {
    id: 'archiveAllVisible',
    label: `Archive all visible (${visibleCount})`,
    icon: 'archivebox',
    isDestructive: false,
  },
]
