/**
 * The schema-driven render contract.
 *
 * The first test is the issue's acceptance criterion in one assertion: **every
 * option the schema declares for a group appears exactly once** across that
 * group's rendered subgroups. It is written as a set comparison over
 * `settingOptionsByGroup` rather than against a list typed out here, because a
 * hand-typed expectation would only prove that two copies of the same mistake
 * agree.
 */
import {
  SettingGroup,
  accentColorOption,
  allPreferenceOptions,
  appearanceOption,
  doNowThresholdHoursOption,
  earnPointsFormulaOption,
  hapticsOption,
  overdueAlertsOption,
  planDefaultSlotDurationOption,
  sessionDefaultDurationOption,
  settingGroups,
  settingOptionsByGroup,
  timezoneOption,
  workingDaysOption,
  workingHoursStartOption,
} from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_STEPPER_BOUNDS,
  OTHER_SUBGROUP_ID,
  settingChoiceLabel,
  settingControlFor,
  settingElementsFor,
  settingLabel,
  settingSubgroupsFor,
  settingSubgroupsForAppearance,
} from '../SettingsElements'

describe('every declared option is rendered exactly once', () => {
  it.each(settingGroups)(
    'the %s pane offers each of its schema options once and nothing else',
    (group) => {
      const rendered = settingElementsFor(group).map(
        (element) => element.option.key,
      )
      const declared = settingOptionsByGroup[group].map((option) => option.key)

      expect([...rendered].sort()).toEqual([...declared].sort())
      expect(new Set(rendered).size).toBe(rendered.length)
    },
  )

  it('covers the whole preference schema across the five panes plus Appearance — nothing is orphaned', () => {
    const rendered = [
      ...settingGroups.flatMap((group) =>
        settingElementsFor(group).map((element) => element.option.key),
      ),
      ...settingSubgroupsForAppearance().flatMap((subgroup) =>
        subgroup.elements.map((element) => element.option.key),
      ),
    ]

    expect([...new Set(rendered)].sort()).toEqual(
      allPreferenceOptions.map((option) => option.key).sort(),
    )
  })

  it('excludes the three non-preference options — they describe the device, not the person', () => {
    const rendered = new Set(
      settingGroups.flatMap((group) =>
        settingElementsFor(group).map((element) => element.option.key),
      ),
    )

    expect(rendered.has('appleCalendar')).toBe(false)
    expect(rendered.has('appleReminders')).toBe(false)
    expect(rendered.has('nowVisibleTypes')).toBe(false)
  })

  it('needs no "Other" subgroup today — every option is placed by canon copy', () => {
    for (const group of settingGroups) {
      const ids = settingSubgroupsFor(group).map((subgroup) => subgroup.id)
      expect(ids).not.toContain(OTHER_SUBGROUP_ID)
    }
  })
})

describe('subgroups reproduce canon layout', () => {
  it('opens General with canon Working Hours section, in canon order', () => {
    const [first] = settingSubgroupsFor(SettingGroup.general)

    expect(first?.title).toBe('Working Hours')
    expect(first?.elements.map((element) => element.option.key)).toEqual([
      'general.workingHoursStart',
      'general.workingHoursEnd',
      'general.workingDays',
    ])
  })

  it("carries canon Session 'During & after' footer about device-local storage", () => {
    const subgroup = settingSubgroupsFor(SettingGroup.session).find(
      (candidate) => candidate.id === 'duringAndAfter',
    )

    expect(subgroup?.footnote).toBe(
      'Keep-awake and end sound are saved on this device only.',
    )
  })

  it('omits no Plan subgroup — Timeline, Lists and Drafts all render', () => {
    expect(settingSubgroupsFor(SettingGroup.plan).map((s) => s.title)).toEqual([
      'Timeline',
      'Lists',
      'Drafts',
    ])
  })
})

describe('the control is derived from the declared value shape', () => {
  it('renders a bool option as a toggle — overdue alerts', () => {
    expect(settingControlFor(overdueAlertsOption)).toEqual({ kind: 'toggle' })
  })

  it('renders a timeOfDay option as a time field — working-hours start', () => {
    expect(settingControlFor(workingHoursStartOption)).toEqual({ kind: 'time' })
  })

  it('renders a daysSet option as the weekday chips — working days', () => {
    expect(settingControlFor(workingDaysOption)).toEqual({ kind: 'days' })
  })

  it('carries canon Stepper range for an int option — session length is 5…120 by 5', () => {
    expect(settingControlFor(sessionDefaultDurationOption)).toEqual({
      kind: 'stepper',
      min: 5,
      max: 120,
      step: 5,
      unit: 'min',
    })
  })

  it("uses canon own unit for the Do 'now' window — hours, not minutes", () => {
    const control = settingControlFor(doNowThresholdHoursOption)
    expect(control.kind === 'stepper' && control.unit).toBe('h')
  })

  it('renders an enumeration as a picker whose choices are the declared cases', () => {
    const control = settingControlFor(earnPointsFormulaOption)

    expect(control.kind).toBe('choice')
    expect(
      control.kind === 'choice' && control.choices.map((c) => c.value),
    ).toEqual(
      earnPointsFormulaOption.type.kind === 'enumeration'
        ? [...earnPointsFormulaOption.type.cases]
        : [],
    )
  })

  it('draws the accent choice as canon swatch row rather than a dropdown', () => {
    expect(settingControlFor(accentColorOption).kind).toBe('swatches')
  })

  it('renders the one string preference as the timezone picker', () => {
    expect(settingControlFor(timezoneOption)).toEqual({ kind: 'timezone' })
  })

  it('falls back to a wide range for an int option canon has no Stepper for', () => {
    const invented = {
      ...sessionDefaultDurationOption,
      key: 'session.inventedForThisTest',
    }
    expect(settingControlFor(invented)).toEqual({
      kind: 'stepper',
      ...DEFAULT_STEPPER_BOUNDS,
    })
  })
})

describe('copy comes from canon, never from the key', () => {
  it("labels the Do 'now' window with canon curly quotes", () => {
    expect(settingLabel(doNowThresholdHoursOption)).toBe('“Now” window')
  })

  it('labels the working-hours start "Start", as canon DatePicker does', () => {
    expect(settingLabel(workingHoursStartOption)).toBe('Start')
  })

  it('spaces an unknown key into a readable label rather than dropping the row', () => {
    expect(
      settingLabel({ ...hapticsOption, key: 'general.someBrandNewThing' }),
    ).toBe('Some Brand New Thing')
  })

  it('delegates enumeration copy to the label function @kro/core exports', () => {
    expect(settingChoiceLabel('general.appearance', 'system')).toBe('System')
    expect(settingChoiceLabel('earn.pointsFormula', 'slidingScale')).toBe(
      'Sliding scale',
    )
  })

  it('capitalizes a weekday raw value, as canon Picker does', () => {
    expect(settingChoiceLabel('general.weekStartDay', 'monday')).toBe('Monday')
  })

  it('falls back to the raw value for an unmapped enumeration key', () => {
    expect(settingChoiceLabel('general.somethingElse', 'raw-value')).toBe(
      'raw-value',
    )
  })
})

describe('the schema decides the badges, not the row', () => {
  it('marks the theme option device-local — canon "On this device"', () => {
    const element = settingElementsFor(SettingGroup.general).find(
      (candidate) => candidate.option.key === appearanceOption.key,
    )

    expect(element?.isDeviceLocal).toBe(true)
  })

  it('marks a cloud-scoped option as not device-local — the slot duration', () => {
    const element = settingElementsFor(SettingGroup.plan).find(
      (candidate) => candidate.option.key === planDefaultSlotDurationOption.key,
    )

    expect(element?.isDeviceLocal).toBe(false)
  })

  it('reports overdue alerts and theme as consumed in General, and marks the rest declared', () => {
    const elements = settingElementsFor(SettingGroup.general)
    const consumed = elements.filter((element) => element.isConsumed)

    expect(consumed.map((element) => element.option.key).sort()).toEqual([
      appearanceOption.key,
      overdueAlertsOption.key,
    ])
  })
})

describe('the Appearance pane', () => {
  it('offers Theme then Palette, and nothing else', () => {
    expect(
      settingSubgroupsForAppearance().map((subgroup) => subgroup.id),
    ).toEqual(['theme', 'palette'])
  })

  it('draws the palette as a four-swatch grid rather than a dropdown', () => {
    const palette = settingSubgroupsForAppearance()
      .flatMap((subgroup) => subgroup.elements)
      .find((element) => element.option.key === 'general.palette')

    expect(palette?.control.kind).toBe('paletteSwatches')
  })

  it('drops Theme from General and hides the declared accent leftover', () => {
    const keys = settingElementsFor(SettingGroup.general, {
      isAppearanceThemesEnabled: true,
    }).map((element) => element.option.key)

    expect(keys).not.toContain('general.appearance')
    expect(keys).not.toContain('general.accentColor')
    expect(keys).toContain('general.overdueAlerts')
  })

  it('does not offer accent colour on Appearance — the palette highlight is the accent', () => {
    const keys = settingSubgroupsForAppearance().flatMap((subgroup) =>
      subgroup.elements.map((element) => element.option.key),
    )

    expect(keys).toEqual(['general.appearance', 'general.palette'])
    expect(keys).not.toContain('general.accentColor')
  })
})
