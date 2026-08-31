import { SettingGroup } from '@kro/core'
import type { ReactNode } from 'react'
import { SettingsMocks, defaultSettingValues } from '../SettingsMocks'
import { PreferencesSectionFragment } from './PreferencesSectionFragment'

/**
 * The schema-driven panes, one story per section plus the three states worth
 * seeing: the working-hours warning, the pre-load disabled form, and a section
 * tuned away from its defaults.
 *
 * Every row on screen comes from `settingOptionsByGroup`, so these stories are
 * also the visual proof of the acceptance criterion the render test asserts:
 * every declared option is offered, exactly once, with the control its declared
 * type implies.
 */
export default {
  title: 'Settings/Preferences',
  component: PreferencesSectionFragment,
  parameters: { layout: 'fullscreen' },
}

const noop = () => {}

function Stage({
  theme = 'light',
  width = 760,
  children,
}: {
  theme?: 'light' | 'dark'
  width?: number
  children: ReactNode
}) {
  return (
    <div
      data-theme={theme}
      style={{
        width,
        padding: 16,
        background: 'var(--kro-color-back)',
        border: '1px solid var(--kro-color-hairline)',
      }}
    >
      {children}
    </div>
  )
}

const pane = (
  overrides: Partial<Parameters<typeof PreferencesSectionFragment>[0]> = {},
) => (
  <PreferencesSectionFragment
    group={SettingGroup.general}
    values={defaultSettingValues}
    isLoaded
    onChangeSetting={noop}
    {...overrides}
  />
)

/** General, on canon's first-launch defaults. */
export const GeneralDefaults = {
  render: () => <Stage>{pane()}</Stage>,
}

/** General with the end before the start — canon's inline warning. */
export const GeneralInvalidWorkingHours = {
  render: () => (
    <Stage>
      {pane({
        values: SettingsMocks.generalPaneInvalidHours.values,
        isWorkingHoursValid: false,
      })}
    </Stage>
  ),
}

/** Session, tuned away from every default it can be. */
export const SessionTuned = {
  render: () => (
    <Stage>
      {pane({
        group: SettingGroup.session,
        values: SettingsMocks.sessionPaneTuned.values,
      })}
    </Stage>
  ),
}

/** Plan — three subgroups, two pickers and a stepper. */
export const PlanDefaults = {
  render: () => <Stage>{pane({ group: SettingGroup.plan })}</Stage>,
}

/** Do — the smallest pane, and the one whose stepper counts in hours. */
export const DoDefaults = {
  render: () => <Stage>{pane({ group: SettingGroup.do })}</Stage>,
}

/** Earn — the section with the most "declared, not yet consumed" rows. */
export const EarnDefaults = {
  render: () => <Stage>{pane({ group: SettingGroup.earn })}</Stage>,
}

/** Before the stored values arrive — canon's `.disabled(!isLoaded)`. */
export const NotLoadedYet = {
  render: () => (
    <Stage>{pane({ group: SettingGroup.session, isLoaded: false })}</Stage>
  ),
}

/** The store could not be read: defaults show and the form stays editable. */
export const LoadFailed = {
  render: () => (
    <Stage>
      {pane({
        errorCopy:
          'Your preferences could not be read on this device. Defaults are shown.',
      })}
    </Stage>
  ),
}

/** Both schemes at the section that exercises every control type. */
export const BothSchemes = {
  render: () => (
    <div style={{ display: 'flex', gap: 16 }}>
      <Stage theme="light" width={520}>
        {pane()}
      </Stage>
      <Stage theme="dark" width={520}>
        {pane()}
      </Stage>
    </div>
  ),
}

/** The handheld width, where the stacked controls have to fit. */
export const Handheld = {
  render: () => <Stage width={390}>{pane()}</Stage>,
}
