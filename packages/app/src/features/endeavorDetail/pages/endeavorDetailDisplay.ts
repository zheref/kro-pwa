/**
 * The Detail read surface's display mapping — the port of
 * `KroUI/EndeavorDetail/Endeavor+DetailDisplay.swift`.
 *
 * One field, one label, one glyph, one `PropertyRowValue`. Canon keeps this
 * local to the Detail surface rather than in a shared `Endeavor+UI`, and the
 * reason transfers exactly: these are *this* surface's presentation choices —
 * Edit formats the same properties as editable controls, and the two must be
 * free to differ.
 *
 * Everything here is pure and React-free, so the whole mapping is unit-tested
 * without mounting a surface. `#29`'s tier deliberately formats nothing ("a
 * duration is seconds and a status is a status; turning either into a string is
 * `#30`'s, because this tier has no locale"), which is precisely this file.
 *
 * ## Dates take their locale as an argument
 *
 * Canon pins `en_US_POSIX` on the formatter and leaves the time zone at the
 * system default. The web can do better on the first half — `Intl` already
 * knows the reader's locale — so `locale` is a parameter that defaults to the
 * runtime's, which is the same call the merged kit's `formatting.ts` made and
 * for the same reason: a `de-DE` browser printing "Jul 22, 2026" beside German
 * chrome is a bug the iOS app cannot have.
 *
 * ## Five SF Symbols canon names that neither symbol map carries
 *
 * `textformat`, `circle.lefthalf.filled`, `star.fill`, `flame.fill` and
 * `folder` are in neither `system/icons/icons.ts` nor the endeavor kit's map,
 * and both are merged lanes this issue does not own. Each row below therefore
 * carries the nearest mapped neighbour and names canon's own symbol beside it,
 * exactly as `findPresentation` does for the two empty states. Folding the real
 * rows upstream is a one-line-per-row follow-up.
 */
import {
  type Defer,
  type Endeavor,
  EndeavorField,
  type EndeavorHost,
  EndeavorRelation,
  type EndeavorTag,
  type Perform,
  PerformResolution,
  type RepeatConfig,
  type Shadow,
  type WeekDay,
  type Month,
  assertNever,
  endeavorHostDisplayName,
  weekDays,
} from '@kro/core'
import type {
  PropertyRowChip,
  PropertyRowValue,
} from '../../../design/endeavor/PropertyRow'
import { type ChipTint, colorTint, semanticTint } from '../../../design/endeavor/KroChip'
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
import { formatDuration } from '../../../design/endeavor/formatting'

/* ------------------------------------------------------------------------ */
/* Fields                                                                    */
/* ------------------------------------------------------------------------ */

/** `EndeavorField.detailLabel`, verbatim. */
export const fieldLabel = (field: EndeavorField): string => {
  switch (field) {
    case EndeavorField.title:
      return 'Title'
    case EndeavorField.status:
      return 'Status'
    case EndeavorField.due:
      return 'Due'
    case EndeavorField.start:
      return 'Start'
    case EndeavorField.duration:
      return 'Duration'
    case EndeavorField.sessionPoints:
      return 'Reward'
    case EndeavorField.value:
      return 'Value'
    case EndeavorField.effort:
      return 'Effort'
    case EndeavorField.expiry:
      return 'Expires'
    case EndeavorField.tags:
      return 'Tags'
    case EndeavorField.associatedColor:
      return 'Color'
    case EndeavorField.project:
      return 'Project'
    case EndeavorField.repeatConfig:
      return 'Repeats'
    default:
      return assertNever(field)
  }
}

/**
 * `EndeavorField.detailIcon`. Five rows carry a substitute; canon's own symbol
 * is named in the comment beside each, per the header note.
 */
export const fieldIcon = (field: EndeavorField): KitSymbolName => {
  switch (field) {
    case EndeavorField.title:
      return 'pencil' // canon: textformat
    case EndeavorField.status:
      return 'circle' // canon: circle.lefthalf.filled
    case EndeavorField.due:
      return 'calendar'
    case EndeavorField.start:
      return 'clock'
    case EndeavorField.duration:
      return 'timer'
    case EndeavorField.sessionPoints:
      return 'bolt.fill'
    case EndeavorField.value:
      return 'star' // canon: star.fill
    case EndeavorField.effort:
      return 'target' // canon: flame.fill
    case EndeavorField.expiry:
      return 'hourglass'
    case EndeavorField.tags:
      return 'tag'
    case EndeavorField.associatedColor:
      return 'paintpalette'
    case EndeavorField.project:
      return 'checklist' // canon: folder
    case EndeavorField.repeatConfig:
      return 'repeat'
    default:
      return assertNever(field)
  }
}

/** `Endeavor.Tag.detailLabel`, verbatim. */
export const tagLabel = (tag: EndeavorTag): string => {
  switch (tag) {
    case 'O':
      return 'On Desk'
    case 'D':
      return 'During Performance'
    case 'S':
      return 'Session'
    case 'R':
      return 'Replica'
    case 'P':
      return 'Passive'
    case 'E':
      return 'Engaging'
    default:
      return assertNever(tag)
  }
}

/**
 * The medium-date/short-time string canon prints, in the reader's locale.
 * Exported because both the Detail rows and the relation screens' row dates use
 * it, and two copies of a date format drift.
 */
export const detailDateTime = (date: Date, locale?: string): string =>
  new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)

/** Canon's `WeekDay.detailShortName` — "Mon", "Tue", … Exported so the Edit
 *  form's weekday toggles and the recurrence summary read the same three
 *  letters; two spellings of a weekday is exactly the drift this avoids. */
export const WEEKDAY_SHORT: Readonly<Record<WeekDay, string>> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
}

const MONTH_SHORT: Readonly<Record<Month, string>> = {
  1: 'Jan',
  2: 'Feb',
  3: 'Mar',
  4: 'Apr',
  5: 'May',
  6: 'Jun',
  7: 'Jul',
  8: 'Aug',
  9: 'Sep',
  10: 'Oct',
  11: 'Nov',
  12: 'Dec',
}

/**
 * `RepeatConfig.detailSummary` — "Daily", "Weekly on Mon, Wed, Fri",
 * "Monthly on day 1", plus the `every N units` suffix when `everyOther > 1`.
 *
 * Weekdays are ordered by `weekDays` (canon's Monday-first declaration order)
 * rather than by the set's own iteration order, which is canon's `detailOrder`
 * sort expressed as a lookup instead of a comparator.
 */
export const repeatSummary = (config: RepeatConfig): string => {
  const base = config.base
  let description: string
  let unit: string
  switch (base.type) {
    case 'daily':
      description = 'Daily'
      unit = 'day'
      break
    case 'weekly': {
      const names = weekDays
        .filter((day) => base.weekdays.includes(day))
        .map((day) => WEEKDAY_SHORT[day])
      description =
        names.length === 0 ? 'Weekly' : `Weekly on ${names.join(', ')}`
      unit = 'week'
      break
    }
    case 'monthly':
      description = `Monthly on day ${base.day}`
      unit = 'month'
      break
    case 'yearly':
      description = `Yearly on ${MONTH_SHORT[base.month]} ${base.day}`
      unit = 'year'
      break
    default:
      return assertNever(base)
  }
  return config.everyOther > 1
    ? `${description}, every ${config.everyOther} ${unit}s`
    : description
}

/**
 * `Endeavor.detailValue(for:)` — every case handled explicitly, no `default`,
 * so a new field earns a deliberate display choice rather than a blank row.
 */
export const fieldValue = (
  endeavor: Endeavor,
  field: EndeavorField,
  locale?: string,
): PropertyRowValue => {
  switch (field) {
    case EndeavorField.title:
      return { kind: 'text', text: endeavor.title }
    case EndeavorField.status:
      return {
        kind: 'chip',
        title: statusShortLabel(endeavor.status),
        icon: statusGlyph(endeavor.status),
        tint: semanticTint(statusTint(endeavor.status)),
      }
    case EndeavorField.due:
      return endeavor.due === null
        ? { kind: 'empty', placeholder: 'No due date' }
        : { kind: 'text', text: detailDateTime(endeavor.due, locale) }
    case EndeavorField.start:
      return endeavor.start === null
        ? { kind: 'empty', placeholder: 'No start time' }
        : { kind: 'text', text: detailDateTime(endeavor.start, locale) }
    case EndeavorField.duration:
      return endeavor.duration === null
        ? { kind: 'empty', placeholder: 'No duration set' }
        : { kind: 'emphasis', text: formatDuration(endeavor.duration) }
    case EndeavorField.sessionPoints:
      return endeavor.sessionPoints === null
        ? { kind: 'empty', placeholder: 'No reward set' }
        : { kind: 'emphasis', text: `${endeavor.sessionPoints} pts` }
    case EndeavorField.value:
      return endeavor.value === null
        ? { kind: 'empty', placeholder: 'Not rated' }
        : { kind: 'rating', value: endeavor.value, outOf: 5, symbol: 'star' }
    case EndeavorField.effort:
      return endeavor.effort === null
        ? { kind: 'empty', placeholder: 'Not rated' }
        : { kind: 'rating', value: endeavor.effort, outOf: 5, symbol: 'target' }
    case EndeavorField.expiry:
      return endeavor.expiry === null
        ? { kind: 'empty', placeholder: 'No expiry' }
        : { kind: 'text', text: detailDateTime(endeavor.expiry, locale) }
    case EndeavorField.tags:
      return { kind: 'tags', tags: (endeavor.tags ?? []).map(tagLabel) }
    case EndeavorField.associatedColor: {
      const hex = normalizedHex(endeavor.associatedColor)
      /*
        Canon draws a bordered swatch filled with the endeavor's own stored
        hex. `PropertyRowValue`'s `tint` case takes a `ChipTint`, which is a
        design-system token ROLE by construction — deliberately, so no caller
        can paint a colour that was never contrast-measured — and there is no
        token for "whatever the user picked". Rather than fork `PropertyRow`
        (a merged lane) or invent a second swatch, the row prints the
        normalized hex and the Detail header still carries the endeavor's
        identity through its kind chip. Named in the PR body as a cross-lane
        follow-up for whichever child next opens `PropertyRow`.
      */
      return hex === null
        ? { kind: 'empty', placeholder: 'No color' }
        : { kind: 'text', text: hex.toUpperCase() }
    }
    case EndeavorField.project: {
      const title = endeavor.list?.title.trim() ?? ''
      return title.length === 0
        ? { kind: 'empty', placeholder: 'No project' }
        : { kind: 'text', text: title }
    }
    case EndeavorField.repeatConfig:
      return endeavor.repeatConfig === null
        ? { kind: 'empty', placeholder: 'Does not repeat' }
        : { kind: 'text', text: repeatSummary(endeavor.repeatConfig) }
    default:
      return assertNever(field)
  }
}

/**
 * Canon's `Color(detailHex:)` guard, kept as a validity check: three or six hex
 * digits with an optional `#`. `null` for anything else, so a malformed stored
 * colour reads as "No color" rather than as a black swatch.
 */
export const normalizedHex = (raw: string | null): string | null => {
  if (raw === null) return null
  const value = raw.trim().replace(/^#+/, '')
  const expanded =
    value.length === 3
      ? [...value].map((digit) => `${digit}${digit}`).join('')
      : value
  return /^[0-9a-fA-F]{6}$/.test(expanded) ? `#${expanded}` : null
}

/* ------------------------------------------------------------------------ */
/* Relations                                                                 */
/* ------------------------------------------------------------------------ */

/** `EndeavorRelation.detailLabel`, verbatim. */
export const relationLabel = (relation: EndeavorRelation): string => {
  switch (relation) {
    case EndeavorRelation.performances:
      return 'Performances'
    case EndeavorRelation.defers:
      return 'Defers'
    case EndeavorRelation.hosts:
      return 'Hosts'
    case EndeavorRelation.shadows:
      return 'Shadows'
    default:
      return assertNever(relation)
  }
}

/** `EndeavorRelation.detailIcon`, with the substitutions the header names. */
export const relationIcon = (relation: EndeavorRelation): KitSymbolName => {
  switch (relation) {
    case EndeavorRelation.performances:
      return 'clock.arrow.circlepath'
    case EndeavorRelation.defers:
      return 'arrow.uturn.forward.circle' // canon: arrow.uturn.right
    case EndeavorRelation.hosts:
      return 'network' // canon: antenna.radiowaves.left.and.right
    case EndeavorRelation.shadows:
      return 'square.and.arrow.down' // canon: square.on.square
    default:
      return assertNever(relation)
  }
}

/** The relation screen's intro subtitle — canon's `ScreenIntroHeader` copy. */
export const relationSubtitle = (relation: EndeavorRelation): string => {
  switch (relation) {
    case EndeavorRelation.performances:
      return 'Every session logged against this endeavor.'
    case EndeavorRelation.defers:
      return "Every time this endeavor's due date was pushed back."
    case EndeavorRelation.hosts:
      return 'The external providers this endeavor is mirrored to.'
    case EndeavorRelation.shadows:
      return 'Where this endeavor was mirrored from an external source.'
    default:
      return assertNever(relation)
  }
}

/** `Endeavor.detailSummary(for:)` — the one-line summary a Detail card shows. */
export const relationSummary = (
  endeavor: Endeavor,
  relation: EndeavorRelation,
): PropertyRowValue => {
  switch (relation) {
    case EndeavorRelation.performances: {
      const count = endeavor.performances.length
      return count === 0
        ? { kind: 'empty', placeholder: 'No sessions logged' }
        : {
            kind: 'text',
            text: count === 1 ? '1 session logged' : `${count} sessions logged`,
          }
    }
    case EndeavorRelation.defers: {
      const count = endeavor.defers.length
      return count === 0
        ? { kind: 'empty', placeholder: 'Never deferred' }
        : {
            kind: 'text',
            text: count === 1 ? 'Deferred once' : `Deferred ${count} times`,
          }
    }
    case EndeavorRelation.hosts:
      return endeavor.hostedBy.length === 0
        ? { kind: 'empty', placeholder: 'Not synced' }
        : { kind: 'chips', chips: endeavor.hostedBy.map(hostChip) }
    case EndeavorRelation.shadows: {
      const count = endeavor.shadows?.length ?? 0
      return count === 0
        ? { kind: 'empty', placeholder: 'No external mirrors' }
        : {
            kind: 'text',
            text:
              count === 1 ? '1 external mirror' : `${count} external mirrors`,
          }
    }
    default:
      return assertNever(relation)
  }
}

/** One host, as the tinted chip both Detail and the Hosts screen draw. */
export const hostChip = (host: EndeavorHost): PropertyRowChip => ({
  id: host,
  title: endeavorHostDisplayName(host),
  icon: hostGlyph(host),
  tint: semanticTint(hostTint(host)),
})

/* ------------------------------------------------------------------------ */
/* Header chips                                                              */
/* ------------------------------------------------------------------------ */

/**
 * The header's at-a-glance facts, in canon's order and with canon's rule:
 * status is always present, the rest only when set, so a sparse endeavor gets a
 * compact header rather than a row of placeholders.
 *
 * The **kind** is not here — canon draws it above the title as a prominent
 * chip, and `#29`'s `detailHeaderBadges` already leads with it. This is the
 * second row.
 */
export const headerChips = (endeavor: Endeavor): readonly PropertyRowChip[] => {
  const chips: PropertyRowChip[] = [
    {
      id: 'status',
      title: statusShortLabel(endeavor.status),
      icon: statusGlyph(endeavor.status),
      tint: semanticTint(statusTint(endeavor.status)),
    },
  ]
  if (endeavor.duration !== null) {
    chips.push({
      id: 'duration',
      title: formatDuration(endeavor.duration),
      icon: 'timer',
      tint: semanticTint('chipNeutral'),
    })
  }
  if (endeavor.sessionPoints !== null && endeavor.sessionPoints > 0) {
    chips.push({
      id: 'reward',
      title: `${endeavor.sessionPoints} pts`,
      icon: 'bolt.fill',
      tint: colorTint('badgeOrange'),
    })
  }
  if (endeavor.repeatConfig !== null) {
    chips.push({
      id: 'repeats',
      title: 'Repeats',
      icon: 'repeat',
      tint: colorTint('badgePurple'),
    })
  }
  return chips
}

/** The prominent kind chip canon leads the header with. */
export const kindChip = (endeavor: Endeavor): PropertyRowChip => ({
  id: 'kind',
  title: kindShortLabel(endeavor.kind),
  icon: kindGlyph(endeavor.kind),
  tint: semanticTint(kindTint(endeavor.kind)),
})

/* ------------------------------------------------------------------------ */
/* Relation rows                                                             */
/* ------------------------------------------------------------------------ */

/** Canon's `resolutionTitle`. */
export const resolutionLabel = (resolution: PerformResolution): string => {
  switch (resolution) {
    case PerformResolution.complete:
      return 'Complete'
    case PerformResolution.aborted:
      return 'Aborted'
    case PerformResolution.finished:
      return 'Finished early'
    default:
      return assertNever(resolution)
  }
}

/** Canon's `resolutionGlyph`, with `xmark`/`flag` standing in for the two fills. */
export const resolutionIcon = (
  resolution: PerformResolution,
): KitSymbolName => {
  switch (resolution) {
    case PerformResolution.complete:
      return 'checkmark.circle.fill'
    case PerformResolution.aborted:
      return 'xmark' // canon: xmark.circle.fill
    case PerformResolution.finished:
      return 'flag' // canon: flag.checkered
    default:
      return assertNever(resolution)
  }
}

/** Canon's `resolutionTint`, as contrast-verified badge roles. */
export const resolutionTint = (resolution: PerformResolution): ChipTint => {
  switch (resolution) {
    case PerformResolution.complete:
      return colorTint('badgeGreen')
    case PerformResolution.aborted:
      return colorTint('badgeRed')
    case PerformResolution.finished:
      return colorTint('badgeBlue')
    default:
      return assertNever(resolution)
  }
}

/** Canon's `rowChips` — resolution, duration, reward, for one performance. */
export const performanceChips = (
  performance: Perform,
): readonly PropertyRowChip[] => [
  {
    id: 'resolution',
    title: resolutionLabel(performance.resolution),
    icon: resolutionIcon(performance.resolution),
    tint: resolutionTint(performance.resolution),
  },
  {
    id: 'duration',
    title: formatDuration(performance.duration),
    icon: 'timer',
    tint: semanticTint('chipNeutral'),
  },
  {
    id: 'points',
    title: `${performance.rewardPoints} pts`,
    icon: 'bolt.fill',
    tint: colorTint('badgeOrange'),
  },
]

/** Canon's `summaryChips` — sessions, total time, total points. */
export const performanceSummaryChips = (
  performances: readonly Perform[],
): readonly PropertyRowChip[] => {
  const totalDuration = performances.reduce(
    (total, entry) => total + entry.duration,
    0,
  )
  const totalPoints = performances.reduce(
    (total, entry) => total + entry.rewardPoints,
    0,
  )
  return [
    {
      id: 'sessions',
      title:
        performances.length === 1
          ? '1 session'
          : `${performances.length} sessions`,
      icon: 'checklist', // canon: list.bullet
      tint: semanticTint('chipNeutral'),
    },
    {
      id: 'time',
      title: formatDuration(totalDuration),
      icon: 'timer',
      tint: colorTint('badgeTeal'),
    },
    {
      id: 'points',
      title: `${totalPoints} pts`,
      icon: 'bolt.fill',
      tint: colorTint('badgeOrange'),
    },
  ]
}

/** Canon's `shadowChips` — source, kind, and the group when it has one. */
export const shadowChips = (shadow: Shadow): readonly PropertyRowChip[] => {
  const chips: PropertyRowChip[] = [
    {
      id: 'source',
      title: shadow.source,
      icon: 'arrow.down.circle', // canon: arrow.down.left.circle
      tint: colorTint('badgeTeal'),
    },
    {
      id: 'kind',
      title: kindShortLabel(shadow.kind),
      icon: kindGlyph(shadow.kind),
      tint: semanticTint(kindTint(shadow.kind)),
    },
  ]
  const group = shadow.group
  if (group !== null && group.length > 0) {
    chips.push({
      id: 'group',
      title: group,
      icon: 'checklist', // canon: folder
      tint: semanticTint('chipNeutral'),
    })
  }
  return chips
}

/** Canon's `shadowTitle` — the mirrored title, or its source identifier. */
export const shadowTitle = (shadow: Shadow): string =>
  shadow.originalTitle.trim().length === 0
    ? shadow.sourceIdentifier
    : shadow.originalTitle

/** Canon's defer row heading: the date the endeavor was pushed to. */
export const deferTitle = (entry: Defer, locale?: string): string =>
  detailDateTime(entry.target, locale)
