/**
 * The hub's information architecture — canon `SettingsFeature.Section` and the
 * three groups `SettingsHubScreen` sorts them into.
 */
import { SettingGroup, settingGroups } from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  SettingsHubGroup,
  SettingsPaneKind,
  SettingsSectionId,
  settingsPaneKind,
  settingsSectionForId,
  settingsSectionTitle,
  settingsSections,
  settingsSectionsIn,
  preferencesHubSectionsFor,
} from '../SettingsSection'

describe('the hub groups match canon three sections', () => {
  it('lists Profile alone at the top, as canon unlabelled first Section does', () => {
    expect(
      settingsSectionsIn(SettingsHubGroup.profile).map((s) => s.id),
    ).toEqual([SettingsSectionId.profile])
  })

  it('lists the six preference panes under Preferences, Appearance after General', () => {
    expect(
      settingsSectionsIn(SettingsHubGroup.preferences).map((s) => s.title),
    ).toEqual([
      'General',
      'Appearance',
      'Plan Preferences',
      'Do Preferences',
      'Earn Preferences',
      'Session Preferences',
    ])
  })

  it('lists Integrations then Subscription in the account group', () => {
    expect(
      settingsSectionsIn(SettingsHubGroup.account).map((s) => s.id),
    ).toEqual([SettingsSectionId.integrations, SettingsSectionId.subscription])
  })

  it('places every declared section in exactly one group', () => {
    const grouped = [
      ...settingsSectionsIn(SettingsHubGroup.profile),
      ...settingsSectionsIn(SettingsHubGroup.preferences),
      ...settingsSectionsIn(SettingsHubGroup.account),
    ]

    expect(grouped.map((s) => s.id).sort()).toEqual(
      settingsSections.map((s) => s.id).sort(),
    )
  })
})

describe('a preferences section names the schema group it renders', () => {
  it('covers every schema group exactly once across the five schema panes', () => {
    const covered = settingsSections
      .map((section) => section.settingGroup)
      .filter((group): group is SettingGroup => group !== null)

    expect([...covered].sort()).toEqual([...settingGroups].sort())
  })

  it('points the General pane at the general group', () => {
    expect(settingsSectionForId('general')?.settingGroup).toBe(
      SettingGroup.general,
    )
  })

  it('leaves the four non-schema sections without a group', () => {
    for (const id of [
      'profile',
      'appearance',
      'integrations',
      'subscription',
    ]) {
      expect(settingsSectionForId(id)?.settingGroup).toBeNull()
    }
  })
})

describe('glyphs and titles are canon own', () => {
  it('uses canon person glyph for Profile, lefthalf circle for Appearance, creditcard for Subscription', () => {
    expect(settingsSectionForId('profile')?.glyph).toBe('person.crop.circle')
    expect(settingsSectionForId('appearance')?.glyph).toBe(
      'circle.lefthalf.filled',
    )
    expect(settingsSectionForId('subscription')?.glyph).toBe('creditcard')
  })

  it('titles a pane with the same string its hub row shows', () => {
    expect(settingsSectionTitle(SettingsSectionId.sessionPreferences)).toBe(
      'Session Preferences',
    )
  })

  it('answers null for an id nothing declares', () => {
    expect(settingsSectionForId('notASection')).toBeNull()
  })
})

describe('pane kinds route the surface', () => {
  it('routes the five schema panes to the preferences renderer', () => {
    for (const id of [
      SettingsSectionId.general,
      SettingsSectionId.planPreferences,
      SettingsSectionId.doPreferences,
      SettingsSectionId.earnPreferences,
      SettingsSectionId.sessionPreferences,
    ]) {
      expect(settingsPaneKind(id)).toBe(SettingsPaneKind.preferences)
    }
  })

  it('routes Appearance to its own renderer', () => {
    expect(settingsPaneKind(SettingsSectionId.appearance)).toBe(
      SettingsPaneKind.appearance,
    )
  })

  it('routes Integrations to its own renderer', () => {
    expect(settingsPaneKind(SettingsSectionId.integrations)).toBe(
      SettingsPaneKind.integrations,
    )
  })

  it('routes Profile and Subscription to the account renderer', () => {
    expect(settingsPaneKind(SettingsSectionId.profile)).toBe(
      SettingsPaneKind.profile,
    )
    expect(settingsPaneKind(SettingsSectionId.subscription)).toBe(
      SettingsPaneKind.subscription,
    )
  })
})

describe('preferencesHubSectionsFor', () => {
  it('lists Appearance immediately after General when the flag is on', () => {
    expect(
      preferencesHubSectionsFor(true).map((section) => section.id),
    ).toEqual([
      SettingsSectionId.general,
      SettingsSectionId.appearance,
      SettingsSectionId.planPreferences,
      SettingsSectionId.doPreferences,
      SettingsSectionId.earnPreferences,
      SettingsSectionId.sessionPreferences,
    ])
  })

  it('hides Appearance when the flag is off, leaving the five shipping rows', () => {
    expect(
      preferencesHubSectionsFor(false).map((section) => section.id),
    ).toEqual([
      SettingsSectionId.general,
      SettingsSectionId.planPreferences,
      SettingsSectionId.doPreferences,
      SettingsSectionId.earnPreferences,
      SettingsSectionId.sessionPreferences,
    ])
  })

  it('does not reorder the remaining preference rows when Appearance drops out', () => {
    const without = preferencesHubSectionsFor(false).map((s) => s.id)
    const withFlag = preferencesHubSectionsFor(true)
      .filter((s) => s.id !== SettingsSectionId.appearance)
      .map((s) => s.id)

    expect(without).toEqual(withFlag)
  })
})
