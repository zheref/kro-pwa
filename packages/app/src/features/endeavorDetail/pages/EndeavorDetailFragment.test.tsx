/**
 * The Detail read surface's render tests, mirroring its stories (`RC-11`).
 *
 * The claims worth making are the per-kind ones: a field the matrix hides is
 * ABSENT, a relation the matrix locks says "Read only" and offers no Manage,
 * and the title is drawn once — by the header, never twice.
 */
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  detailDisplayTitle,
  relationCards,
  visibleSections,
} from '../EndeavorDetailCards'
import { detailEndeavorMocks } from '../EndeavorDetailMocks'
import { EndeavorDetailFragment } from './EndeavorDetailFragment'

afterEach(cleanup)

type Mock = (typeof detailEndeavorMocks)[keyof typeof detailEndeavorMocks]

const mount = (
  endeavor: Mock,
  handlers: {
    onEditField?: (field: string) => void
    onManageRelation?: (relation: string) => void
  } = {},
) =>
  render(
    <EndeavorDetailFragment
      endeavor={endeavor}
      title={detailDisplayTitle(endeavor)}
      sections={visibleSections(endeavor.kind)}
      relations={relationCards(endeavor)}
      locale="en-US"
      onEditField={handlers.onEditField ?? (() => {})}
      onManageRelation={handlers.onManageRelation ?? (() => {})}
    />,
  )

describe('the header', () => {
  it('leads with the kind chip, which is the endeavor\'s strongest identity signal', () => {
    mount(detailEndeavorMocks.task)
    expect(screen.getByText('Task')).toBeTruthy()
  })

  it('renders a blank title as "Untitled" rather than an invisible heading', () => {
    mount(detailEndeavorMocks.untitled)
    expect(screen.getByRole('heading', { name: 'Untitled' })).toBeTruthy()
  })

  it('draws the title ONCE — the Core section does not repeat it', () => {
    mount(detailEndeavorMocks.task)
    expect(screen.queryByText('Title')).toBeNull()
    expect(screen.getByRole('button', { name: 'Edit title' })).toBeTruthy()
  })

  it('carries the facts that are set, and only those', () => {
    mount(detailEndeavorMocks.task)
    const header = screen.getByTestId('detail-header')

    // Duration and reward are set on this fixture; recurrence is not, so the
    // header stays compact rather than showing a row of placeholders. Scoped
    // to the header because "Repeats" is also the Recurrence ROW's label.
    expect(within(header).getByText('30m')).toBeTruthy()
    expect(within(header).getByText('8 pts')).toBeTruthy()
    expect(within(header).queryByText('Repeats')).toBeNull()
  })
})

describe('the matrix decides which rows exist', () => {
  it('gives a task a Due row', () => {
    mount(detailEndeavorMocks.task)
    expect(screen.getByText('Due')).toBeTruthy()
  })

  it('gives a calendar event NO Due row — absent, not disabled', () => {
    mount(detailEndeavorMocks.event)
    expect(screen.queryByText('Due')).toBeNull()
    expect(screen.getByText('Start')).toBeTruthy()
  })

  it('drops the fields a meta kind has no use for, rather than disabling them', () => {
    mount(detailEndeavorMocks.blueprint)
    // A blueprint is one of the three meta kinds: no Start, no Duration, no
    // Reward. Absent, not greyed out — the matrix decides, and the surface
    // renders its answer.
    expect(screen.queryByText('Start')).toBeNull()
    expect(screen.queryByText('Duration')).toBeNull()
    expect(screen.queryByText('Reward')).toBeNull()
    expect(screen.getByText('Status')).toBeTruthy()
  })

  it('opens the field\'s editor through a named control', async () => {
    const onEditField = vi.fn()
    mount(detailEndeavorMocks.task, { onEditField })

    await userEvent.click(screen.getByRole('button', { name: 'Edit status' }))

    expect(onEditField).toHaveBeenCalledWith('status')
  })
})

describe('relations', () => {
  it('always shows all four cards, whatever the kind', () => {
    mount(detailEndeavorMocks.event)
    for (const label of ['Performances', 'Defers', 'Hosts', 'Shadows']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    }
  })

  it('offers Manage only where the kind allows editing that relation', async () => {
    const onManageRelation = vi.fn()
    mount(detailEndeavorMocks.task, { onManageRelation })

    const manage = screen.getAllByRole('button', { name: 'Manage' })
    expect(manage.length).toBeGreaterThan(0)
    await userEvent.click(manage[0] as HTMLElement)

    expect(onManageRelation).toHaveBeenCalled()
  })

  it('marks a locked relation "Read only" instead of rendering an inert header', () => {
    mount(detailEndeavorMocks.event)

    const performances = screen.getByTestId('endeavor-detail')
    expect(within(performances).getAllByText('Read only').length).toBeGreaterThan(0)
  })

  it('summarises an empty relation with WHY it is empty', () => {
    mount(detailEndeavorMocks.task)
    expect(screen.getAllByText('Never deferred').length).toBeGreaterThan(0)
  })

  it('counts a relation that has entries', () => {
    mount(detailEndeavorMocks.taskWithSessions)
    expect(screen.getAllByText('3 sessions logged').length).toBeGreaterThan(0)
  })
})
