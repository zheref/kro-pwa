/**
 * Per-group behaviour of the ported table. The exhaustive field-for-field diff
 * against canon lives in `SettingOptionsSnapshot.test.ts`; this file asserts the
 * *properties* each section has to hold, so a future edit that keeps the rows
 * but breaks an invariant (a group array losing an option, a section leaking a
 * key from another prefix) still fails.
 */
import { describe, expect, it } from 'vitest'
import { PointsFormula } from '../../domain/session/PointsFormula'
import {
  DayViewRange,
  PlanListGrouping,
  PlanListSort,
} from '../PlanSettingChoices'
import { AccentChoice, AppearanceMode, LandingChoice } from '../SettingChoices'
import { SettingConsumption, SettingSyncScope } from '../SettingOption'
import {
  SettingGroup,
  allPreferenceOptions,
  allSettingOptions,
  appleCalendarOption,
  appleRemindersOption,
  doNowThresholdHoursOption,
  doOptions,
  earnDefaultRewardThresholdOption,
  earnMilestoneHapticsOption,
  earnOptions,
  earnPointsFormulaOption,
  generalOptions,
  hapticsOption,
  nonPreferenceOptions,
  nowVisibleTypesOption,
  planDayViewRangeOption,
  planListGroupingOption,
  planListSortOption,
  planOptions,
  sessionDefaultBreakDurationOption,
  sessionDefaultDurationOption,
  sessionOptions,
  settingGroups,
  settingOptionForKey,
  settingOptionsByGroup,
  timezoneOption,
  workingHoursEndOption,
  workingHoursStartOption,
} from '../SettingOptions'

describe('General preferences', () => {
  it('opens the working day at 09:00 and closes it at 17:00, in minutes from midnight', () => {
    expect(workingHoursStartOption.defaultValue).toBe(540)
    expect(workingHoursEndOption.defaultValue).toBe(1020)
  })

  it('leaves the timezone unset so a first launch falls back to the device zone', () => {
    expect(timezoneOption.defaultValue).toBeNull()
    expect(timezoneOption.type.kind).toBe('string')
  })

  it('keeps theme and haptics on the device while the rest of the section syncs', () => {
    const localKeys = generalOptions
      .filter((option) => option.syncScope === SettingSyncScope.local)
      .map((option) => option.key)
    expect(localKeys).toEqual(['general.appearance', 'general.haptics'])
    expect(hapticsOption.defaultValue).toBe(true)
  })

  it('offers each picker exactly the cases canon declares, in display order', () => {
    const casesFor = (key: string) => {
      const option = settingOptionForKey(key)
      return option !== null && option.type.kind === 'enumeration'
        ? option.type.cases
        : null
    }
    expect(casesFor('general.appearance')).toEqual([
      AppearanceMode.system,
      AppearanceMode.light,
      AppearanceMode.dark,
    ])
    expect(casesFor('general.accentColor')?.[0]).toBe(AccentChoice.blue)
    expect(casesFor('general.defaultLandingSection')).toEqual([
      LandingChoice.plan,
      LandingChoice.doNow,
      LandingChoice.earn,
    ])
  })

  it('namespaces every key under general. so no section can collide with another', () => {
    for (const option of generalOptions) {
      expect(option.key.startsWith('general.')).toBe(true)
    }
  })
})

describe('Plan preferences', () => {
  it('shows the whole day on the timeline until the user narrows it', () => {
    expect(planDayViewRangeOption.defaultValue).toBe(DayViewRange.full)
  })

  it('sorts a Plan list by time and groups it not at all, out of the box', () => {
    expect(planListSortOption.defaultValue).toBe(PlanListSort.time)
    expect(planListGroupingOption.defaultValue).toBe(PlanListGrouping.none)
  })

  it('carries the two draft/slot options that KroApple stores but nothing reads', () => {
    const declaredKeys = planOptions
      .filter((option) => option.consumption === SettingConsumption.declared)
      .map((option) => option.key)
    expect(declaredKeys).toEqual([
      'plan.defaultSlotDuration',
      'plan.autoCommitDrafts',
    ])
  })

  it('syncs the whole section — no Plan preference is device-local', () => {
    for (const option of planOptions) {
      expect(option.syncScope).toBe(SettingSyncScope.cloud)
    }
  })
})

describe('Do preferences', () => {
  it('counts the next two hours as "now" until the user widens the window', () => {
    expect(doNowThresholdHoursOption.defaultValue).toBe(2)
    expect(doNowThresholdHoursOption.type.kind).toBe('int')
  })

  it('starts every Do toggle where canon starts it — suggestions and overdue on, auto-advance off', () => {
    const defaults = Object.fromEntries(
      doOptions.map((option) => [option.key, option.defaultValue]),
    )
    expect(defaults).toEqual({
      'do.showSuggestions': true,
      'do.notifyOnOverdue': true,
      'do.nowThresholdHours': 2,
      'do.autoAdvanceAfterComplete': false,
    })
  })

  it('has a consumer for every one of its four options', () => {
    for (const option of doOptions) {
      expect(option.consumption).toBe(SettingConsumption.live)
    }
  })

  it('models no visible-types preference — the Do lens owns that filter', () => {
    expect(doOptions.map((option) => option.key)).not.toContain(
      'do.visibleTypes',
    )
    expect(nowVisibleTypesOption.consumption).toBe(SettingConsumption.declared)
  })
})

describe('Earn preferences', () => {
  it('scores on the sliding scale until the user picks the legacy formula', () => {
    expect(earnPointsFormulaOption.defaultValue).toBe(
      PointsFormula.slidingScale,
    )
  })

  it('pre-fills a new reward at 100 points', () => {
    expect(earnDefaultRewardThresholdOption.defaultValue).toBe(100)
  })

  it('keeps milestone haptics on the device even though the rest of Earn syncs', () => {
    expect(earnMilestoneHapticsOption.syncScope).toBe(SettingSyncScope.local)
    const cloudCount = earnOptions.filter(
      (option) => option.syncScope === SettingSyncScope.cloud,
    ).length
    expect(cloudCount).toBe(4)
  })

  it('models no streak-reminder toggle — General already owns it', () => {
    expect(earnOptions.map((option) => option.key)).not.toContain(
      'earn.streakReminders',
    )
  })
})

describe('Session preferences', () => {
  it('starts a focus session at 20 minutes and a break at 5', () => {
    expect(sessionDefaultDurationOption.defaultValue).toBe(20)
    expect(sessionDefaultBreakDurationOption.defaultValue).toBe(5)
  })

  it('keeps the screen awake and the end sound on the device', () => {
    const localKeys = sessionOptions
      .filter((option) => option.syncScope === SettingSyncScope.local)
      .map((option) => option.key)
    expect(localKeys).toEqual(['session.keepScreenAwake', 'session.soundOnEnd'])
  })

  it('wants stopwatch and breaks available, leaving the flag as the rollout gate', () => {
    expect(settingOptionForKey('session.enableStopwatch')?.defaultValue).toBe(
      true,
    )
    expect(settingOptionForKey('session.enableBreaks')?.defaultValue).toBe(true)
  })

  it('does not auto-start a break unless the user asks for it', () => {
    expect(settingOptionForKey('session.autoStartBreak')?.defaultValue).toBe(
      false,
    )
  })
})

describe('groups and lookup', () => {
  it('lists the five sections in hub order and maps each to its own array', () => {
    expect(settingGroups).toEqual([
      SettingGroup.general,
      SettingGroup.plan,
      SettingGroup.do,
      SettingGroup.earn,
      SettingGroup.session,
    ])
    expect(settingOptionsByGroup[SettingGroup.session]).toBe(sessionOptions)
  })

  it('concatenates the five sections into allPreferenceOptions, in that order', () => {
    expect(allPreferenceOptions).toEqual([
      ...generalOptions,
      ...planOptions,
      ...doOptions,
      ...earnOptions,
      ...sessionOptions,
    ])
  })

  it('keeps the two integration toggles and the Do filter out of the preference set', () => {
    const preferenceKeys = allPreferenceOptions.map((option) => option.key)
    expect(preferenceKeys).not.toContain(appleCalendarOption.key)
    expect(preferenceKeys).not.toContain(appleRemindersOption.key)
    expect(preferenceKeys).not.toContain(nowVisibleTypesOption.key)
    expect(nonPreferenceOptions).toHaveLength(3)
  })

  it('resolves a stored key back to its option, and nothing for an unknown key', () => {
    expect(settingOptionForKey('session.defaultDuration')).toBe(
      sessionDefaultDurationOption,
    )
    expect(settingOptionForKey('general.timezone')).toBe(timezoneOption)
    expect(settingOptionForKey('general.thereIsNoSuchSetting')).toBeNull()
  })

  it('reaches every declared option through the lookup', () => {
    for (const option of allSettingOptions) {
      expect(settingOptionForKey(option.key)).toBe(option)
    }
  })
})
