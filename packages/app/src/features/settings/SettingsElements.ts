/**
 * The preference schema, arranged for rendering — canon's five
 * `…PreferencesView`s expressed as data over `@kro/core`'s `SettingOption`
 * table instead of five hand-written forms.
 *
 * ## Why this is data and not five components
 *
 * KC-IS-#11 ported canon's `SettingOptions.swift` option for option: every
 * key, value shape, glyph, default and sync scope. Canon's *views* then restate
 * that list a second time, in Swift, as `@Binding`s — which is why a canon
 * option can exist with no row (and did: `nowVisibleTypes`). Here the rows are
 * **derived** from the schema, so an option cannot be declared and then
 * silently not offered. `__tests__/SettingsElements.test.ts` pins that as an
 * exact set equality over `allPreferenceOptions`.
 *
 * What is *not* derived is the copy: a row's label, its section header, its
 * footer and an `int` option's bounds are canon's own strings and numbers,
 * transcribed here per key. Deriving a label from a key would produce
 * "Now Threshold Hours" where canon says `“Now” window`. So:
 *
 * - **which options exist, and in which group** — the schema's, always.
 * - **how each is rendered** — derived from `option.type` (`RC-24`'s closed
 *   union), with two documented per-key refinements (stepper bounds; the accent
 *   swatch row).
 * - **what each is called** — canon's copy, keyed by the schema's own key.
 *
 * An option the copy table does not name still renders, under a fallback label
 * derived from its key and in a trailing "Other" subgroup. That is deliberate:
 * a schema addition must show up as an unpolished row, never as a missing one.
 */
import {
  type SettingGroup,
  type SettingOption,
  accentColorOption,
  appearanceModeLabel,
  accentChoiceLabel,
  assertNever,
  dayViewRangeLabel,
  landingChoiceLabel,
  planListGroupingLabel,
  planListSortLabel,
  pointsFormulaLabel,
  SettingConsumption,
  settingOptionsByGroup,
  SettingSyncScope,
} from '@kro/core'

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

/** One option of a picker: the raw value the schema stores, and its copy. */
export interface SettingChoice {
  readonly value: string
  readonly label: string
}

/**
 * How one option is edited. Derived from `SettingOption['type']`, which is the
 * closed union KC-IS-#11 ported, so a new value shape is a compile error here
 * rather than a row that renders nothing.
 */
export type SettingControl =
  /** `bool` — canon's `Toggle`. */
  | { readonly kind: 'toggle' }
  /** `timeOfDay` — canon's `DatePicker(displayedComponents: .hourAndMinute)`. */
  | { readonly kind: 'time' }
  /** `daysSet` — canon's seven-chip `WeekDayPicker`. */
  | { readonly kind: 'days' }
  /** `int` — canon's `Stepper`, with its `in:`/`step:` range. */
  | {
      readonly kind: 'stepper'
      readonly min: number
      readonly max: number
      readonly step: number
      /** The unit canon interpolates into the stepper's title (`min`, `h`). */
      readonly unit: string | null
    }
  /** `enumeration` — canon's `Picker`. */
  | { readonly kind: 'choice'; readonly choices: readonly SettingChoice[] }
  /** `enumeration`, drawn as canon's `AccentColorPicker` swatch row. */
  | { readonly kind: 'swatches'; readonly choices: readonly SettingChoice[] }
  /** `string` — canon's timezone `Picker` over the known identifiers. */
  | { readonly kind: 'timezone' }

// ---------------------------------------------------------------------------
// Copy, keyed by the schema's own key
// ---------------------------------------------------------------------------

/** Canon's row label per option key. */
const OPTION_LABELS: Readonly<Record<string, string>> = {
  // General — `GeneralPreferencesView`
  'general.workingHoursStart': 'Start',
  'general.workingHoursEnd': 'End',
  'general.workingDays': 'Working days',
  'general.timezone': 'Time Zone',
  'general.morningPlanTime': 'Morning plan',
  'general.streakReminders': 'Streak reminders',
  'general.overdueAlerts': 'Overdue alerts',
  'general.appearance': 'Theme',
  'general.accentColor': 'Accent color',
  'general.weekStartDay': 'Week starts on',
  'general.defaultLandingSection': 'Open to',
  'general.haptics': 'Haptics',
  // Plan — `PlanPreferencesView`
  'plan.dayViewRange': 'Visible hours',
  'plan.showCompletedInTimeline': 'Show completed',
  'plan.defaultSlotDuration': 'Default slot',
  'plan.listSort': 'Sort by',
  'plan.listGrouping': 'Group by',
  'plan.autoCommitDrafts': 'Auto-commit AI drafts',
  // Do — `DoPreferencesView`
  'do.nowThresholdHours': '“Now” window',
  'do.showSuggestions': 'Show suggestions',
  'do.autoAdvanceAfterComplete': 'Auto-advance after complete',
  'do.notifyOnOverdue': 'Notify when overdue',
  // Earn — `EarnPreferencesView`
  'earn.pointsFormula': 'Points formula',
  'earn.defaultRewardThreshold': 'New reward cost',
  'earn.showWeeklyChallenge': 'Show weekly challenge',
  'earn.celebrateMilestones': 'Celebrate milestones',
  'earn.milestoneHaptics': 'Milestone haptics',
  // Session — `SessionPreferencesView`
  'session.defaultDuration': 'Session',
  'session.defaultBreakDuration': 'Break',
  'session.enableStopwatch': 'Enable stopwatch mode',
  'session.enableBreaks': 'Enable breaks',
  'session.autoStartBreak': 'Auto-start break after session',
  'session.keepScreenAwake': 'Keep screen awake',
  'session.soundOnEnd': 'Sound on session end',
}

/**
 * Canon's `Stepper(… in: … step: …)` bounds per `int` option, plus the unit its
 * title interpolates.
 *
 * An `int` option with no entry falls back to a wide, coarse range rather than
 * to no control at all — see `settingControlFor`.
 */
const STEPPER_BOUNDS: Readonly<
  Record<
    string,
    { min: number; max: number; step: number; unit: string | null }
  >
> = {
  'plan.defaultSlotDuration': { min: 5, max: 120, step: 5, unit: 'min' },
  'do.nowThresholdHours': { min: 1, max: 12, step: 1, unit: 'h' },
  'earn.defaultRewardThreshold': { min: 10, max: 1000, step: 10, unit: null },
  'session.defaultDuration': { min: 5, max: 120, step: 5, unit: 'min' },
  'session.defaultBreakDuration': { min: 1, max: 30, step: 1, unit: 'min' },
}

/** The fallback range for an `int` option the table above does not name. */
export const DEFAULT_STEPPER_BOUNDS = {
  min: 0,
  max: 1000,
  step: 1,
  unit: null,
} as const

/**
 * The copy for one raw case of an `enumeration` option.
 *
 * Every branch delegates to the label function `@kro/core` already exports for
 * that choice type, so the web and canon cannot disagree about what "Sliding
 * scale" is called. A key with no branch falls back to the raw value, which is
 * ugly and readable — the two properties a fallback needs.
 */
export const settingChoiceLabel = (optionKey: string, raw: string): string => {
  switch (optionKey) {
    case 'general.appearance':
      return appearanceModeLabel(
        raw as Parameters<typeof appearanceModeLabel>[0],
      )
    case 'general.accentColor':
      return accentChoiceLabel(raw as Parameters<typeof accentChoiceLabel>[0])
    case 'general.defaultLandingSection':
      return landingChoiceLabel(raw as Parameters<typeof landingChoiceLabel>[0])
    case 'general.weekStartDay':
      // Canon: `Text(day.rawValue.capitalized)`.
      return raw.charAt(0).toUpperCase() + raw.slice(1)
    case 'plan.dayViewRange':
      return dayViewRangeLabel(raw as Parameters<typeof dayViewRangeLabel>[0])
    case 'plan.listSort':
      return planListSortLabel(raw as Parameters<typeof planListSortLabel>[0])
    case 'plan.listGrouping':
      return planListGroupingLabel(
        raw as Parameters<typeof planListGroupingLabel>[0],
      )
    case 'earn.pointsFormula':
      return pointsFormulaLabel(raw as Parameters<typeof pointsFormulaLabel>[0])
    default:
      return raw
  }
}

/**
 * The label a row shows. Canon's copy when the key is known; otherwise the
 * key's last segment, spaced and sentence-cased, so a newly declared option is
 * legible before anyone writes copy for it.
 */
export const settingLabel = (option: SettingOption): string => {
  const known = OPTION_LABELS[option.key]
  if (known !== undefined) return known
  const tail = option.key.split('.').at(-1) ?? option.key
  const spaced = tail.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

/**
 * How an option is edited, derived from its declared value shape.
 *
 * Two refinements sit on top of the type dispatch, both of them canon's:
 * `general.accentColor` is a swatch row rather than a dropdown
 * (`AccentColorPicker`), and each `int` carries the range canon's `Stepper`
 * declares.
 */
export const settingControlFor = (option: SettingOption): SettingControl => {
  switch (option.type.kind) {
    case 'bool':
      return { kind: 'toggle' }
    case 'timeOfDay':
      return { kind: 'time' }
    case 'daysSet':
      return { kind: 'days' }
    case 'string':
      return { kind: 'timezone' }
    case 'int': {
      const bounds = STEPPER_BOUNDS[option.key] ?? DEFAULT_STEPPER_BOUNDS
      return { kind: 'stepper', ...bounds }
    }
    case 'enumeration': {
      const choices = option.type.cases.map((value) => ({
        value,
        label: settingChoiceLabel(option.key, value),
      }))
      return option.key === accentColorOption.key
        ? { kind: 'swatches', choices }
        : { kind: 'choice', choices }
    }
    default:
      return assertNever(option.type)
  }
}

// ---------------------------------------------------------------------------
// Elements and subgroups
// ---------------------------------------------------------------------------

/** One rendered preference row. */
export interface SettingElement {
  readonly option: SettingOption
  readonly label: string
  readonly control: SettingControl
  /**
   * Canon's *"On this device"* badge — shown for a `local` option, which is
   * read straight off the schema rather than from a per-row flag.
   */
  readonly isDeviceLocal: boolean
  /**
   * Whether canon has a surface reading this value today. `false` is canon's
   * *"declared, not yet consumed"*, which the surface says out loud rather than
   * pretending the control does something.
   */
  readonly isConsumed: boolean
}

/** One `Section { … } header: … footer: …` of a canon preferences form. */
export interface SettingSubgroup {
  readonly id: string
  /** Canon's `header:`. `null` for a headerless section. */
  readonly title: string | null
  /** Canon's `footer:`. `null` when it has none. */
  readonly footnote: string | null
  readonly elements: readonly SettingElement[]
}

/** The subgroup layout of one preferences pane, as canon lays it out. */
interface SubgroupSpec {
  readonly id: string
  readonly title: string | null
  readonly footnote: string | null
  readonly keys: readonly string[]
}

const SUBGROUPS: Readonly<Record<SettingGroup, readonly SubgroupSpec[]>> = {
  general: [
    {
      id: 'workingHours',
      title: 'Working Hours',
      // Canon's footer is the end-≤-start warning, which is conditional and
      // therefore rendered by the surface, not carried here.
      footnote: null,
      keys: [
        'general.workingHoursStart',
        'general.workingHoursEnd',
        'general.workingDays',
      ],
    },
    {
      id: 'timezone',
      title: 'Time Zone',
      footnote: null,
      keys: ['general.timezone'],
    },
    {
      id: 'notifications',
      title: 'Notifications',
      footnote: null,
      keys: [
        'general.morningPlanTime',
        'general.streakReminders',
        'general.overdueAlerts',
      ],
    },
    {
      id: 'appearance',
      title: 'Appearance',
      footnote:
        'Theme is saved on this device only. Accent color syncs with your account.',
      keys: ['general.appearance', 'general.accentColor'],
    },
    {
      id: 'general',
      title: 'General',
      footnote: null,
      keys: [
        'general.weekStartDay',
        'general.defaultLandingSection',
        'general.haptics',
      ],
    },
  ],
  plan: [
    {
      id: 'timeline',
      title: 'Timeline',
      footnote: null,
      keys: [
        'plan.dayViewRange',
        'plan.showCompletedInTimeline',
        'plan.defaultSlotDuration',
      ],
    },
    {
      id: 'lists',
      title: 'Lists',
      footnote: null,
      keys: ['plan.listSort', 'plan.listGrouping'],
    },
    {
      id: 'drafts',
      title: 'Drafts',
      footnote: null,
      keys: ['plan.autoCommitDrafts'],
    },
  ],
  do: [
    { id: 'now', title: 'Now', footnote: null, keys: ['do.nowThresholdHours'] },
    {
      id: 'cards',
      title: 'Cards',
      footnote: null,
      keys: ['do.showSuggestions', 'do.autoAdvanceAfterComplete'],
    },
    {
      id: 'notifications',
      title: 'Notifications',
      footnote: null,
      keys: ['do.notifyOnOverdue'],
    },
  ],
  earn: [
    {
      id: 'scoring',
      title: 'Scoring',
      footnote:
        'The formula decides how points are awarded when you finish a session.',
      keys: ['earn.pointsFormula', 'earn.defaultRewardThreshold'],
    },
    {
      id: 'goals',
      title: 'Goals',
      footnote: null,
      keys: ['earn.showWeeklyChallenge'],
    },
    {
      id: 'feedback',
      title: 'Feedback',
      footnote: 'Milestone haptics are saved on this device only.',
      keys: ['earn.celebrateMilestones', 'earn.milestoneHaptics'],
    },
  ],
  session: [
    {
      id: 'durations',
      title: 'Durations',
      footnote: null,
      keys: ['session.defaultDuration', 'session.defaultBreakDuration'],
    },
    {
      id: 'modes',
      title: 'Modes',
      footnote:
        'Stopwatch and breaks also depend on their feature flags being enabled.',
      keys: [
        'session.enableStopwatch',
        'session.enableBreaks',
        'session.autoStartBreak',
      ],
    },
    {
      id: 'duringAndAfter',
      title: 'During & after',
      footnote: 'Keep-awake and end sound are saved on this device only.',
      keys: ['session.keepScreenAwake', 'session.soundOnEnd'],
    },
  ],
}

/** The subgroup id an unspecified option lands in. */
export const OTHER_SUBGROUP_ID = 'other'

const elementFor = (option: SettingOption): SettingElement => ({
  option,
  label: settingLabel(option),
  control: settingControlFor(option),
  isDeviceLocal: option.syncScope === SettingSyncScope.local,
  isConsumed: option.consumption === SettingConsumption.live,
})

/**
 * One preferences pane's subgroups, in canon's display order.
 *
 * The group's schema list is the authority for *membership*: every option the
 * schema declares for the group appears exactly once, and any option no
 * subgroup names is appended in a trailing "Other" subgroup rather than
 * dropped. An empty subgroup is omitted — canon omits a `Section` with no rows
 * for the same reason (it would still draw a header and footer over nothing).
 */
export const settingSubgroupsFor = (
  group: SettingGroup,
): readonly SettingSubgroup[] => {
  const options = settingOptionsByGroup[group]
  const byKey = new Map(options.map((option) => [option.key, option]))
  const placed = new Set<string>()

  const named = SUBGROUPS[group]
    .map((spec) => {
      const elements = spec.keys.flatMap((key) => {
        const option = byKey.get(key)
        if (option === undefined) return []
        placed.add(key)
        return [elementFor(option)]
      })
      return {
        id: spec.id,
        title: spec.title,
        footnote: spec.footnote,
        elements,
      }
    })
    .filter((subgroup) => subgroup.elements.length > 0)

  const leftovers = options.filter((option) => !placed.has(option.key))
  if (leftovers.length === 0) return named

  return [
    ...named,
    {
      id: OTHER_SUBGROUP_ID,
      title: 'Other',
      footnote: null,
      elements: leftovers.map(elementFor),
    },
  ]
}

/** Every element of a pane, flattened — what a completeness check counts. */
export const settingElementsFor = (
  group: SettingGroup,
): readonly SettingElement[] =>
  settingSubgroupsFor(group).flatMap((subgroup) => subgroup.elements)
