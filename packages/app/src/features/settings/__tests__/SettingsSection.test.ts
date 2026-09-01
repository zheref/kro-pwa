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
} from '../SettingsSection'

describe('the hub groups match canon three sections', () => {
  it('lists Profile alone at the top, as canon unlabelled first Section does', () => {
    expect(
      settingsSectionsIn(SettingsHubGroup.profile).map((s) => s.id),
    ).toEqual([SettingsSectionId.profile])
  })

  it('lists the five preference panes under Preferences, in canon order', () => {
    expect(
      settingsSectionsIn(SettingsHubGroup.preferences).map((s) => s.title),
    ).toEqual([
      'General',
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
  it('covers every schema group exactly once across the five panes', () => {
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

  it('leaves the three non-schema sections without a group', () => {
    for (const id of ['profile', 'integrations', 'subscription']) {
      expect(settingsSectionForId(id)?.settingGroup).toBeNull()
    }
  })
})

describe('glyphs and titles are canon own', () => {
  it('uses canon person glyph for Profile and creditcard for Subscription', () => {
    expect(settingsSectionForId('profile')?.glyph).toBe('person.crop.circle')
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
