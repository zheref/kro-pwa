/**
 * The matrix board's render and interaction tests, mirroring
 * `PlanMatrixFragment.stories` (`RC-11`).
 *
 * Two acceptance criteria live here: the board **admits only what #18 admits**
 * (asserted by feeding it the same fixture list the admission suite uses, run
 * through the same Selector-side function), and each quadrant's add control
 * offers canon's two entries.
 */
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { planMatrixItems } from '../../../PlanMatrix'
import {
  PLAN_REFERENCE_NOW,
  planMatrixFixtureList,
  planMatrixFixtures,
} from '../../../PlanMocks'
import { PlanMatrixFragment } from '../PlanMatrixFragment'
import { PlanMatrixQuadrant } from '../planMatrixPresentation'

afterEach(cleanup)

/** Every fixture, admitted and classified exactly as the Selector would. */
const admitted = planMatrixItems(planMatrixFixtureList, {
  now: PLAN_REFERENCE_NOW,
})

const mount = (
  overrides: Partial<Parameters<typeof PlanMatrixFragment>[0]> = {},
) =>
  render(
    <PlanMatrixFragment
      items={admitted}
      onAddNew={() => {}}
      onAddExisting={() => {}}
      onTapItem={() => {}}
      {...overrides}
    />,
  )

const quadrant = (name: PlanMatrixQuadrant) =>
  screen
    .getAllByTestId('plan-matrix-quadrant')
    .find((box) => box.getAttribute('data-quadrant') === name)!

describe('PlanMatrixFragment — the board', () => {
  it('draws exactly four quadrants, in canon reading order', () => {
    mount()
    expect(
      screen
        .getAllByTestId('plan-matrix-quadrant')
        .map((box) => box.getAttribute('data-quadrant')),
    ).toEqual(['prioritize', 'schedule', 'delegate', 'archive'])
  })

  it('gives every quadrant its two-line header — name and caption', () => {
    mount()
    expect(screen.getByText('Prioritize')).toBeTruthy()
    expect(screen.getByText('Urgent · Important')).toBeTruthy()
    expect(screen.getAllByTestId('plan-matrix-caption')).toHaveLength(4)
  })

  it('lands a card in ALL FOUR quadrants from the shared fixture set', () => {
    mount()
    for (const name of ['prioritize', 'schedule', 'delegate', 'archive']) {
      const box = screen
        .getAllByTestId('plan-matrix-quadrant')
        .find((candidate) => candidate.getAttribute('data-quadrant') === name)!
      expect(Number(box.getAttribute('data-count'))).toBeGreaterThan(0)
    }
  })
})

describe('PlanMatrixFragment — admission', () => {
  it('draws only the rows #18 admits — never the untriaged or ineligible ones', () => {
    mount()
    const drawn = screen
      .getAllByTestId('plan-matrix-card')
      .map((card) => card.getAttribute('data-endeavor-id'))
    expect(new Set(drawn)).toEqual(new Set(admitted.map((item) => item.id)))
  })

  it('keeps a task with no VALUE off the board — untriaged is not "archive"', () => {
    mount()
    expect(
      screen.queryByLabelText(planMatrixFixtures.missingValue.title),
    ).toBeNull()
  })

  it('keeps a task with no DUE DATE off the board for the same reason', () => {
    mount()
    expect(
      screen.queryByLabelText(planMatrixFixtures.missingDue.title),
    ).toBeNull()
  })

  it('keeps a calendar event and a habit off the board whatever they carry', () => {
    mount()
    expect(
      screen.queryByLabelText(planMatrixFixtures.calendarEvent.title),
    ).toBeNull()
    expect(screen.queryByLabelText(planMatrixFixtures.habit.title)).toBeNull()
  })

  it('draws an EMPTY quadrant with its own two add buttons, not a blank box', () => {
    mount({ items: [] })
    expect(screen.getAllByTestId('plan-matrix-empty-add-new')).toHaveLength(4)
    expect(screen.getAllByTestId('plan-matrix-empty-add-existing')).toHaveLength(
      4,
    )
    expect(screen.queryAllByTestId('plan-matrix-card')).toHaveLength(0)
  })
})

describe('PlanMatrixFragment — the add flows', () => {
  it('offers Add new and Add existing behind one plus, per quadrant', async () => {
    mount()
    const box = quadrant(PlanMatrixQuadrant.schedule)
    const trigger = within(box).getByTestId('plan-matrix-add')

    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    await userEvent.click(trigger)

    const menu = within(box).getByTestId('plan-matrix-add-menu')
    expect(within(menu).getByText('Add new')).toBeTruthy()
    expect(within(menu).getByText('Add existing')).toBeTruthy()
  })

  it('raises Add new for the quadrant whose menu was opened', async () => {
    const onAddNew = vi.fn()
    mount({ onAddNew })

    const box = quadrant(PlanMatrixQuadrant.delegate)
    await userEvent.click(within(box).getByTestId('plan-matrix-add'))
    await userEvent.click(within(box).getByTestId('plan-matrix-menu-add-new'))

    expect(onAddNew).toHaveBeenCalledWith(PlanMatrixQuadrant.delegate)
  })

  it('raises Add existing for that quadrant, and closes the menu behind it', async () => {
    const onAddExisting = vi.fn()
    mount({ onAddExisting })

    const box = quadrant(PlanMatrixQuadrant.prioritize)
    await userEvent.click(within(box).getByTestId('plan-matrix-add'))
    await userEvent.click(
      within(box).getByTestId('plan-matrix-menu-add-existing'),
    )

    expect(onAddExisting).toHaveBeenCalledWith(PlanMatrixQuadrant.prioritize)
    expect(within(box).queryByTestId('plan-matrix-add-menu')).toBeNull()
  })

  it('closes the menu on Escape and returns focus to the plus that opened it', async () => {
    mount()
    const box = quadrant(PlanMatrixQuadrant.archive)
    const trigger = within(box).getByTestId('plan-matrix-add')

    await userEvent.click(trigger)
    await userEvent.keyboard('{Escape}')

    expect(within(box).queryByTestId('plan-matrix-add-menu')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('raises the empty quadrant own Add existing button too', async () => {
    const onAddExisting = vi.fn()
    mount({ items: [], onAddExisting })

    const box = quadrant(PlanMatrixQuadrant.schedule)
    await userEvent.click(
      within(box).getByTestId('plan-matrix-empty-add-existing'),
    )

    expect(onAddExisting).toHaveBeenCalledWith(PlanMatrixQuadrant.schedule)
  })
})

describe('PlanMatrixFragment — the cards', () => {
  it('opens Detail for the card the user pressed', async () => {
    const onTapItem = vi.fn()
    mount({ onTapItem })

    await userEvent.click(
      screen.getByLabelText(planMatrixFixtures.urgentImportant.title),
    )

    expect(onTapItem).toHaveBeenCalledWith('matrix-prioritize')
  })

  it('names each card by its full title, since the face is only a glyph', () => {
    mount()
    expect(
      screen.getByLabelText(planMatrixFixtures.futureImportant.title),
    ).toBeTruthy()
  })

  it('prints the quadrant count beside its name', () => {
    mount()
    const box = quadrant(PlanMatrixQuadrant.prioritize)
    expect(within(box).getByTestId('plan-matrix-count').textContent).toBe(
      box.getAttribute('data-count'),
    )
  })
})
