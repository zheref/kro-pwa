/**
 * The schema-driven pane's render tests, mirroring
 * `PreferencesSectionFragment.stories.tsx` (`RC-11`).
 *
 * The first block is the acceptance criterion rendered: every option the schema
 * declares for a group is on screen, exactly once, with the control its
 * declared type implies.
 */
import { SettingGroup, settingGroups, settingOptionsByGroup } from '@kro/core'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SettingsMocks, defaultSettingValues } from '../../SettingsMocks'
import { PreferencesSectionFragment } from '../PreferencesSectionFragment'

afterEach(cleanup)

const renderPane = (
  overrides: Partial<Parameters<typeof PreferencesSectionFragment>[0]> = {},
) =>
  render(
    <PreferencesSectionFragment
      group={SettingGroup.general}
      values={defaultSettingValues}
      isLoaded
      onChangeSetting={() => {}}
      {...overrides}
    />,
  )

describe('every schema option renders exactly once', () => {
  it.each(settingGroups)('renders one row per declared %s option', (group) => {
    renderPane({ group })

    const rows = screen.getAllByTestId('setting-row')
    const keys = rows.map((row) => row.getAttribute('data-setting-key'))

    expect(keys.sort()).toEqual(
      settingOptionsByGroup[group].map((option) => option.key).sort(),
    )
  })

  it('gives each row canon copy rather than the key', () => {
    renderPane({ group: SettingGroup.do })

    expect(screen.getByText('“Now” window')).toBeTruthy()
    expect(screen.getByText('Auto-advance after complete')).toBeTruthy()
  })

  it('groups them into canon sections, with canon footers', () => {
    renderPane({ group: SettingGroup.session })

    expect(screen.getByText('Durations')).toBeTruthy()
    expect(screen.getByText('Modes')).toBeTruthy()
    expect(
      screen.getByText(
        'Stopwatch and breaks also depend on their feature flags being enabled.',
      ),
    ).toBeTruthy()
  })
})

describe('the control matches the declared value shape', () => {
  it('renders a bool as a switch and reports the flip', async () => {
    const onChangeSetting = vi.fn()
    renderPane({ onChangeSetting })

    const toggle = screen.getByRole('switch', { name: 'Overdue alerts' })
    expect(toggle.getAttribute('aria-checked')).toBe('true')

    await userEvent.click(toggle)
    expect(onChangeSetting).toHaveBeenCalledWith('general.overdueAlerts', false)
  })

  it('renders a timeOfDay as a time field showing canon default', () => {
    renderPane()

    const start = screen.getByLabelText('Start') as HTMLInputElement
    expect(start.type).toBe('time')
    expect(start.value).toBe('09:00')
  })

  it('renders a daysSet as seven pressable chips with the default week selected', () => {
    renderPane()

    const group = screen.getByRole('group', { name: 'Working days' })
    const chips = within(group).getAllByRole('button')

    expect(chips).toHaveLength(7)
    expect(
      within(group)
        .getByRole('button', { name: 'Monday' })
        .getAttribute('aria-pressed'),
    ).toBe('true')
    expect(
      within(group)
        .getByRole('button', { name: 'Sunday' })
        .getAttribute('aria-pressed'),
    ).toBe('false')
  })

  it('adds a day to the mask when a chip is pressed', async () => {
    const onChangeSetting = vi.fn()
    renderPane({ onChangeSetting })

    await userEvent.click(screen.getByRole('button', { name: 'Saturday' }))

    const [key, value] = onChangeSetting.mock.calls[0] ?? []
    expect(key).toBe('general.workingDays')
    expect(typeof value).toBe('number')
    expect(value).not.toBe(defaultSettingValues['general.workingDays'])
  })

  it('renders an int as canon Stepper, stepping by canon step', async () => {
    const onChangeSetting = vi.fn()
    renderPane({ group: SettingGroup.session, onChangeSetting })

    expect(screen.getAllByTestId('stepper-value')[0]?.textContent).toBe(
      '20 min',
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Increase Session' }),
    )

    expect(onChangeSetting).toHaveBeenCalledWith('session.defaultDuration', 25)
  })

  it('renders an enumeration as a picker whose options carry canon labels', async () => {
    const onChangeSetting = vi.fn()
    renderPane({ group: SettingGroup.earn, onChangeSetting })

    const picker = screen.getByRole('combobox', { name: 'Points formula' })
    expect(within(picker).getByText('Sliding scale')).toBeTruthy()

    await userEvent.selectOptions(picker, 'legacy')
    expect(onChangeSetting).toHaveBeenCalledWith('earn.pointsFormula', 'legacy')
  })

  it('renders the accent choice as canon swatch radio group', () => {
    renderPane()

    const swatches = screen.getByRole('radiogroup', { name: 'Accent color' })
    expect(within(swatches).getAllByRole('radio')).toHaveLength(6)
    expect(
      within(swatches)
        .getByRole('radio', { name: 'Blue' })
        .getAttribute('aria-checked'),
    ).toBe('true')
  })
})

describe('the working-hours warning', () => {
  it('is silent on a valid day', () => {
    renderPane({ isWorkingHoursValid: true })
    expect(screen.queryByTestId('working-hours-warning')).toBeNull()
  })

  it('shows canon sentence when the end is not after the start', () => {
    renderPane({
      values: SettingsMocks.generalPaneInvalidHours.values,
      isWorkingHoursValid: false,
    })

    expect(screen.getByTestId('working-hours-warning').textContent).toContain(
      'End time must be after start time.',
    )
  })

  it('leaves both entered values on screen while it warns', () => {
    renderPane({
      values: SettingsMocks.generalPaneInvalidHours.values,
      isWorkingHoursValid: false,
    })

    expect((screen.getByLabelText('Start') as HTMLInputElement).value).toBe(
      '18:00',
    )
    expect((screen.getByLabelText('End') as HTMLInputElement).value).toBe(
      '09:00',
    )
  })
})

describe('the schema drives the badges', () => {
  it('marks the device-local options with canon On this device', () => {
    renderPane()

    const themeRow = screen
      .getAllByTestId('setting-row')
      .find(
        (row) => row.getAttribute('data-setting-key') === 'general.appearance',
      )

    expect(
      within(themeRow as HTMLElement).getByTestId('scope-badge'),
    ).toBeTruthy()
  })

  it('does not badge a cloud-scoped option', () => {
    renderPane({ group: SettingGroup.plan })

    const row = screen
      .getAllByTestId('setting-row')
      .find(
        (candidate) =>
          candidate.getAttribute('data-setting-key') === 'plan.listSort',
      )

    expect(within(row as HTMLElement).queryByTestId('scope-badge')).toBeNull()
  })

  it('says out loud which options canon stores but never reads', () => {
    renderPane({ group: SettingGroup.earn })

    const row = screen
      .getAllByTestId('setting-row')
      .find(
        (candidate) =>
          candidate.getAttribute('data-setting-key') ===
          'earn.showWeeklyChallenge',
      )

    expect(
      within(row as HTMLElement).getByTestId('declared-badge'),
    ).toBeTruthy()
  })
})

describe('the pre-load guard', () => {
  it('disables every control until the values arrive — canon disabled(!isLoaded)', () => {
    renderPane({ isLoaded: false })

    expect(
      (
        screen.getByRole('switch', {
          name: 'Overdue alerts',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true)
    expect((screen.getByLabelText('Start') as HTMLInputElement).disabled).toBe(
      true,
    )
  })

  it('re-enables them once loaded', () => {
    renderPane({ isLoaded: true })

    expect(
      (
        screen.getByRole('switch', {
          name: 'Overdue alerts',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false)
  })

  it('surfaces a failure banner above the form without hiding it', () => {
    renderPane({
      errorCopy: 'Your preferences could not be read on this device.',
    })

    expect(
      screen.getByText('Your preferences could not be read on this device.'),
    ).toBeTruthy()
    expect(screen.getAllByTestId('setting-row').length).toBeGreaterThan(0)
  })
})
