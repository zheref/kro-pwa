/**
 * The exhaustive default-table snapshot — acceptance criterion 1 of #11: *"the
 * option table (keys, defaults, scopes) diffs empty against canon's list."*
 *
 * `CANON_TABLE` was **typed from
 * `KroCore/Domain/Constants/SettingOptions.swift` at `KroApple@2c1ee45`**, not
 * generated from `SettingOptions.ts`. That is the whole point: a
 * `toMatchSnapshot()` recorded from the code under test confirms only that the
 * code has not changed, whereas a hand-transcribed expectation confirms the
 * code matches *canon*. It lives in the diff rather than in a `.snap` file for
 * the same reason — comparing it against the Swift is a two-window job, and the
 * review needs it to be.
 *
 * It is a **text block**, one row per option, rather than an array of objects:
 * the columns line up so a reviewer can read down them, a failure prints a line
 * diff naming the row that moved, and — unlike an aligned array literal — a
 * formatter cannot explode it into 37 eight-line objects and destroy the
 * property that makes it reviewable.
 *
 * Columns: `key | type | glyph | default | scope | consumption`.
 * `null` in the glyph or default column means canon declares none.
 *
 * Re-transcribe the table when canon moves. If it and `SettingOptions.ts`
 * disagree, one of them mis-read the Swift, and the failure says which row.
 */
import { describe, expect, it } from 'vitest'
import type { SettingOption, SettingType } from '../SettingOption'
import {
  allPreferenceOptions,
  allSettingOptions,
  cloudSyncOptions,
  doOptions,
  earnOptions,
  generalOptions,
  nonPreferenceOptions,
  planOptions,
  sessionOptions,
} from '../SettingOptions'

/** `enumeration` renders with its cases, so a reordered picker fails the diff. */
const describeType = (type: SettingType): string =>
  type.kind === 'enumeration'
    ? `enumeration(${type.cases.join('|')})`
    : type.kind

const renderRow = (option: SettingOption): string =>
  [
    option.key,
    describeType(option.type),
    option.glyph ?? 'null',
    String(option.defaultValue),
    option.syncScope,
    option.consumption,
  ].join(' | ')

const renderTable = (options: readonly SettingOption[]): string =>
  options.map(renderRow).join('\n')

const CANON_TABLE = `
appleCalendar | bool | calendar | false | cloud | live
appleReminders | bool | checklist | false | cloud | live
nowVisibleTypes | string | eye | null | cloud | declared
general.timezone | string | globe | null | cloud | declared
general.workingHoursStart | timeOfDay | sunrise | 540 | cloud | declared
general.workingHoursEnd | timeOfDay | sunset | 1020 | cloud | declared
general.workingDays | daysSet | calendar | 31 | cloud | declared
general.morningPlanTime | timeOfDay | bell.badge | 480 | cloud | declared
general.streakReminders | bool | flame | true | cloud | declared
general.overdueAlerts | bool | exclamationmark.circle | true | cloud | live
general.appearance | enumeration(system|light|dark) | circle.lefthalf.filled | system | local | live
general.accentColor | enumeration(blue|purple|green|orange|pink|graphite) | paintpalette | blue | cloud | declared
general.weekStartDay | enumeration(monday|tuesday|wednesday|thursday|friday|saturday|sunday) | calendar.day.timeline.left | monday | cloud | declared
general.defaultLandingSection | enumeration(plan|doNow|earn) | house | plan | cloud | declared
general.haptics | bool | hand.tap | true | local | declared
general.palette | enumeration(purple|green|orange|red) | paintpalette | purple | local | live
plan.defaultSlotDuration | int | clock | 25 | cloud | declared
plan.autoCommitDrafts | bool | sparkles | false | cloud | declared
plan.dayViewRange | enumeration(full|waking|business) | arrow.up.and.down | full | cloud | live
plan.showCompletedInTimeline | bool | checkmark.circle | true | cloud | live
plan.listSort | enumeration(time|priority|title) | arrow.up.arrow.down | time | cloud | live
plan.listGrouping | enumeration(none|project|timeOfDay) | rectangle.3.group | none | cloud | live
do.showSuggestions | bool | sparkles | true | cloud | live
do.notifyOnOverdue | bool | exclamationmark.circle | true | cloud | live
do.nowThresholdHours | int | clock | 2 | cloud | live
do.autoAdvanceAfterComplete | bool | forward.end | false | cloud | live
earn.pointsFormula | enumeration(slidingScale|legacy) | function | slidingScale | cloud | live
earn.defaultRewardThreshold | int | target | 100 | cloud | live
earn.showWeeklyChallenge | bool | trophy | true | cloud | declared
earn.celebrateMilestones | bool | party.popper | true | cloud | declared
earn.milestoneHaptics | bool | hand.tap | true | local | declared
session.defaultDuration | int | timer | 20 | cloud | live
session.defaultBreakDuration | int | cup.and.saucer | 5 | cloud | live
session.enableStopwatch | bool | stopwatch | true | cloud | live
session.enableBreaks | bool | pause.circle | true | cloud | live
session.autoStartBreak | bool | arrow.triangle.2.circlepath | false | cloud | live
session.keepScreenAwake | bool | sun.max | true | local | live
session.soundOnEnd | bool | speaker.wave.2 | true | local | live
`.trim()

describe('the ported option table against canon', () => {
  it('reproduces every option canon declares, in canon order, field for field', () => {
    expect(renderTable(allSettingOptions)).toBe(CANON_TABLE)
  })

  it('declares 38 options — 3 non-preferences and 35 preferences', () => {
    expect(nonPreferenceOptions).toHaveLength(3)
    expect(allPreferenceOptions).toHaveLength(35)
    expect(allSettingOptions).toHaveLength(38)
  })

  it('splits the preferences across the five sections canon groups them into', () => {
    expect(generalOptions).toHaveLength(12)
    expect(planOptions).toHaveLength(6)
    expect(doOptions).toHaveLength(4)
    expect(earnOptions).toHaveLength(5)
    expect(sessionOptions).toHaveLength(7)
  })

  it('gives every option a distinct key — a collision would silently alias two preferences in one store', () => {
    const keys = allSettingOptions.map((option) => option.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('leaves exactly six preferences on the device, so 29 of 35 reach the account', () => {
    const localKeys = allPreferenceOptions
      .filter((option) => option.syncScope === 'local')
      .map((option) => option.key)

    expect(localKeys).toEqual([
      'general.appearance',
      'general.haptics',
      'general.palette',
      'earn.milestoneHaptics',
      'session.keepScreenAwake',
      'session.soundOnEnd',
    ])
    expect(cloudSyncOptions).toHaveLength(29)
  })

  it('marks the sixteen options no KroApple surface reads outside its own Preferences screen', () => {
    const declaredKeys = allSettingOptions
      .filter((option) => option.consumption === 'declared')
      .map((option) => option.key)

    expect(declaredKeys).toEqual([
      'nowVisibleTypes',
      'general.timezone',
      'general.workingHoursStart',
      'general.workingHoursEnd',
      'general.workingDays',
      'general.morningPlanTime',
      'general.streakReminders',
      'general.accentColor',
      'general.weekStartDay',
      'general.defaultLandingSection',
      'general.haptics',
      'plan.defaultSlotDuration',
      'plan.autoCommitDrafts',
      'earn.showWeeklyChallenge',
      'earn.celebrateMilestones',
      'earn.milestoneHaptics',
    ])
  })
})
