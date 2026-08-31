/**
 * The add-existing picker's render and interaction tests, mirroring
 * `PickEndeavorFragment.stories` (`RC-11`).
 *
 * The acceptance criteria in here are the cap being **visibly** enforced and
 * Confirm being disabled until there is at least one selection, with the
 * blocker named — a disabled control that does not say what blocks it is the
 * failure this repo's own rule exists to prevent.
 */
import { PlanListGrouping } from '@kro/core'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PickEndeavorFragment } from '../PickEndeavorFragment'
import { PICK_ENDEAVOR_SELECTION_LIMIT } from '../planPickerModel'
import {
  PLAN_PICKER_NOW,
  planPickerAdmissionPool,
  planPickerPool,
} from '../planPickerMocks'

afterEach(cleanup)

const mount = (
  overrides: Partial<Parameters<typeof PickEndeavorFragment>[0]> = {},
) =>
  render(
    <PickEndeavorFragment
      quadrant="prioritize"
      endeavors={planPickerPool}
      grouping={PlanListGrouping.none}
      now={PLAN_PICKER_NOW}
      onConfirm={() => {}}
      onDismiss={() => {}}
      onViewDetail={() => {}}
      {...overrides}
    />,
  )

const toggles = () => screen.getAllByTestId('pick-endeavor-toggle')

describe('PickEndeavorFragment — what it shows', () => {
  it('names the quadrant it is adding to, and repeats canon subtitle', () => {
    mount({ quadrant: 'schedule' })
    expect(screen.getByText('Add to Schedule')).toBeTruthy()
    expect(screen.getByTestId('pick-endeavor-subtitle').textContent).toContain(
      'Choose up to seven tasks',
    )
  })

  it('sections the pool Today → Has triage data → No triage data', () => {
    mount()
    expect(
      screen
        .getAllByTestId('pick-endeavor-section')
        .map((section) => section.getAttribute('aria-label')),
    ).toEqual(['Today', 'Has triage data', 'No triage data'])
  })

  it('offers only tasks and tickets — never a habit, reminder or event', () => {
    mount({ endeavors: planPickerAdmissionPool })
    expect(screen.queryByLabelText('Stretch')).toBeNull()
    expect(screen.queryByLabelText('Call mum')).toBeNull()
    expect(screen.queryByLabelText('Dentist')).toBeNull()
  })

  it('shows the "no matches" state when the search finds nothing', async () => {
    mount()
    await userEvent.type(
      screen.getByTestId('pick-endeavor-search'),
      'zzzz-nothing',
    )
    expect(
      screen.getByTestId('pick-endeavor-empty').getAttribute('data-empty-kind'),
    ).toBe('noMatches')
  })

  it('shows the "no tasks" state when the pool itself is empty', () => {
    mount({ endeavors: [] })
    expect(
      screen.getByTestId('pick-endeavor-empty').getAttribute('data-empty-kind'),
    ).toBe('noTasks')
  })
})

describe('PickEndeavorFragment — the seven cap', () => {
  it('counts the selection as the user builds it', async () => {
    mount()
    await userEvent.click(toggles()[0]!)
    await userEvent.click(toggles()[1]!)
    expect(screen.getByTestId('pick-endeavor-count').textContent).toBe(
      '2 of 7 selected',
    )
  })

  it('DISABLES every unselected row once seven are chosen, and says why', async () => {
    mount()
    const rows = toggles()
    for (let index = 0; index < PICK_ENDEAVOR_SELECTION_LIMIT; index += 1) {
      await userEvent.click(rows[index]!)
    }

    expect(screen.getByTestId('pick-endeavor-cap-notice').textContent).toContain(
      '7 tasks at a time',
    )
    const remaining = toggles().filter(
      (row) => row.getAttribute('aria-checked') === 'false',
    )
    expect(remaining.length).toBeGreaterThan(0)
    for (const row of remaining) {
      expect((row as HTMLButtonElement).disabled).toBe(true)
    }
  })

  it('keeps the seven CHOSEN rows pressable, so a swap is one deselect away', async () => {
    mount()
    const rows = toggles()
    for (let index = 0; index < PICK_ENDEAVOR_SELECTION_LIMIT; index += 1) {
      await userEvent.click(rows[index]!)
    }

    const chosen = toggles().filter(
      (row) => row.getAttribute('aria-checked') === 'true',
    )
    expect(chosen).toHaveLength(PICK_ENDEAVOR_SELECTION_LIMIT)
    for (const row of chosen) {
      expect((row as HTMLButtonElement).disabled).toBe(false)
    }
  })

  it('lets the eighth row in again as soon as one is deselected', async () => {
    mount()
    const rows = toggles()
    for (let index = 0; index < PICK_ENDEAVOR_SELECTION_LIMIT; index += 1) {
      await userEvent.click(rows[index]!)
    }
    await userEvent.click(toggles()[0]!)

    expect(screen.queryByTestId('pick-endeavor-cap-notice')).toBeNull()
    expect(
      toggles().every((row) => !(row as HTMLButtonElement).disabled),
    ).toBe(true)
  })

  it('confirms at most seven ids even when the pool is larger', async () => {
    const onConfirm = vi.fn()
    mount({ onConfirm })
    const rows = toggles()
    for (let index = 0; index < PICK_ENDEAVOR_SELECTION_LIMIT; index += 1) {
      await userEvent.click(rows[index]!)
    }
    await userEvent.click(screen.getByTestId('pick-endeavor-confirm'))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onConfirm.mock.calls[0]?.[0]).toHaveLength(
      PICK_ENDEAVOR_SELECTION_LIMIT,
    )
  })
})

describe('PickEndeavorFragment — Confirm', () => {
  it('is disabled with nothing selected, and NAMES what blocks it', () => {
    mount()
    const confirm = screen.getByTestId('pick-endeavor-confirm')
    expect((confirm as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByTestId('pick-endeavor-blocker').textContent).toBe(
      'Select at least one task to add.',
    )
    expect(confirm.getAttribute('aria-describedby')).toBe(
      screen.getByTestId('pick-endeavor-blocker').id,
    )
  })

  it('enables on the first selection and drops the blocker line', async () => {
    mount()
    await userEvent.click(toggles()[0]!)
    expect(
      (screen.getByTestId('pick-endeavor-confirm') as HTMLButtonElement).disabled,
    ).toBe(false)
    expect(screen.queryByTestId('pick-endeavor-blocker')).toBeNull()
  })

  it('hands back exactly the ids that were selected', async () => {
    const onConfirm = vi.fn()
    mount({ onConfirm })

    const first = toggles()[0]!
    const chosenId = first
      .closest('[data-testid="pick-endeavor-row"]')!
      .getAttribute('data-endeavor-id')
    await userEvent.click(first)
    await userEvent.click(screen.getByTestId('pick-endeavor-confirm'))

    expect(onConfirm).toHaveBeenCalledWith([chosenId])
  })
})

describe('PickEndeavorFragment — the other two exits', () => {
  it('dismisses without confirming anything', async () => {
    const onDismiss = vi.fn()
    const onConfirm = vi.fn()
    mount({ onDismiss, onConfirm })

    await userEvent.click(screen.getByTestId('pick-endeavor-close'))

    expect(onDismiss).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('opens Detail for a row without selecting it', async () => {
    const onViewDetail = vi.fn()
    mount({ onViewDetail })

    const row = screen.getAllByTestId('pick-endeavor-row')[0]!
    await userEvent.click(within(row).getByTestId('pick-endeavor-detail'))

    expect(onViewDetail).toHaveBeenCalledWith(
      row.getAttribute('data-endeavor-id'),
    )
    expect(screen.getByTestId('pick-endeavor-count').textContent).toBe(
      '0 of 7 selected',
    )
  })

  it('clears the search from the field own control', async () => {
    mount()
    const field = screen.getByTestId('pick-endeavor-search')
    await userEvent.type(field, 'garage')
    await userEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    expect((field as HTMLInputElement).value).toBe('')
  })
})
