/**
 * The Edit form's render tests, mirroring its stories (`RC-11`).
 *
 * The acceptance criterion this file exists for is the matrix one: a field the
 * domain marks non-editable for a kind is ABSENT from the form, so a change the
 * domain would silently refuse cannot even be expressed.
 */
import {
  EndeavorKind,
  endeavorFields,
  isFieldEditable,
  makeProject,
} from '@kro/core'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { editableSections } from '../EndeavorDetailEditing'
import { EndeavorDetailExceptions } from '../EndeavorDetailException'
import { detailEndeavorMocks } from '../EndeavorDetailMocks'
import { fieldLabel } from './endeavorDetailDisplay'
import { EndeavorEditFragment } from './EndeavorEditFragment'

afterEach(cleanup)

const projects = [
  makeProject({ id: 'proj-1', title: 'Household' }),
  makeProject({ id: 'proj-2', title: 'Work' }),
]

type Mock = (typeof detailEndeavorMocks)[keyof typeof detailEndeavorMocks]

const mount = (
  endeavor: Mock,
  overrides: {
    isSaving?: boolean
    isValid?: boolean
    exception?: ReturnType<typeof EndeavorDetailExceptions.localPersistenceFailed> | null
    onChangeField?: (change: unknown) => void
    onOpenDuration?: () => void
  } = {},
) =>
  render(
    <EndeavorEditFragment
      working={endeavor}
      sections={editableSections(endeavor.kind)}
      isValid={overrides.isValid ?? endeavor.title.trim().length > 0}
      isSaving={overrides.isSaving ?? false}
      exception={overrides.exception ?? null}
      projects={projects}
      onChangeField={overrides.onChangeField ?? (() => {})}
      onOpenDuration={overrides.onOpenDuration ?? (() => {})}
    />,
  )

describe('the form is the matrix, rendered', () => {
  it('offers exactly the fields the matrix marks editable for a task', () => {
    mount(detailEndeavorMocks.task)

    for (const field of endeavorFields) {
      const label = fieldLabel(field)
      const isPresent =
        screen.queryAllByText(label, { exact: true }).length > 0 ||
        screen.queryAllByLabelText(label).length > 0
      expect({ field, isPresent }).toEqual({
        field,
        isPresent: isFieldEditable(field, EndeavorKind.task),
      })
    }
  })

  it('drops Start, Duration and Reward for a meta kind rather than disabling them', () => {
    mount(detailEndeavorMocks.blueprint)

    expect(screen.queryByLabelText('Start')).toBeNull()
    expect(screen.queryByText('Duration')).toBeNull()
    expect(screen.queryByLabelText('Reward')).toBeNull()
    expect(screen.getByLabelText('Title')).toBeTruthy()
  })

  it('drops the Due row for a calendar event, whose due date the matrix denies', () => {
    mount(detailEndeavorMocks.event)

    expect(screen.queryByLabelText('Due')).toBeNull()
    expect(screen.getByLabelText('Start')).toBeTruthy()
  })
})

describe('editing reports one change at a time', () => {
  it('reports a title edit as the domain\'s own field change', async () => {
    const onChangeField = vi.fn()
    mount(detailEndeavorMocks.task, { onChangeField })

    await userEvent.type(screen.getByLabelText('Title'), '!')

    expect(onChangeField).toHaveBeenLastCalledWith({
      field: 'title',
      value: `${detailEndeavorMocks.task.title}!`,
    })
  })

  it('reports a status pick, not a status index', async () => {
    const onChangeField = vi.fn()
    mount(detailEndeavorMocks.task, { onChangeField })

    await userEvent.selectOptions(screen.getByLabelText('Status'), 'blocked')

    expect(onChangeField).toHaveBeenCalledWith({
      field: 'status',
      value: 'blocked',
    })
  })

  it('toggles a tag by its own letter — canon\'s `applyTagToggled`', async () => {
    const onChangeField = vi.fn()
    mount(detailEndeavorMocks.task, { onChangeField })

    await userEvent.click(screen.getByRole('button', { name: /Engaging/ }))

    expect(onChangeField).toHaveBeenCalledWith({
      field: 'tagToggled',
      value: 'E',
    })
  })

  it('assigns a project by picking a list, and clears it back to none', async () => {
    const onChangeField = vi.fn()
    mount(detailEndeavorMocks.task, { onChangeField })

    await userEvent.selectOptions(screen.getByLabelText('Project'), 'proj-2')
    expect(onChangeField).toHaveBeenCalledWith({
      field: 'project',
      value: projects[1],
    })

    await userEvent.selectOptions(screen.getByLabelText('Project'), '')
    expect(onChangeField).toHaveBeenCalledWith({ field: 'project', value: null })
  })

  it('hands the duration profile to its own screen rather than editing one number', async () => {
    const onOpenDuration = vi.fn()
    mount(detailEndeavorMocks.task, { onOpenDuration })

    await userEvent.click(screen.getByRole('button', { name: 'Edit profile' }))

    expect(onOpenDuration).toHaveBeenCalledTimes(1)
  })
})

describe('recurrence', () => {
  it('starts at "Does not repeat" and builds a whole config when a base is picked', async () => {
    const onChangeField = vi.fn()
    mount(detailEndeavorMocks.task, { onChangeField })

    await userEvent.selectOptions(screen.getByLabelText('Repeats'), 'weekly')

    expect(onChangeField).toHaveBeenCalledWith({
      field: 'repeatConfig',
      value: { base: { type: 'weekly', weekdays: [] }, everyOther: 1 },
    })
  })

  it('clears the whole rule when the user picks "Does not repeat"', async () => {
    const onChangeField = vi.fn()
    const repeating = {
      ...detailEndeavorMocks.task,
      repeatConfig: { base: { type: 'daily' as const }, everyOther: 1 },
    }
    mount(repeating, { onChangeField })

    await userEvent.selectOptions(screen.getByLabelText('Repeats'), '')

    expect(onChangeField).toHaveBeenCalledWith({
      field: 'repeatConfig',
      value: null,
    })
  })

  it('offers the weekday toggles only for a weekly rule', () => {
    const weekly = {
      ...detailEndeavorMocks.task,
      repeatConfig: {
        base: { type: 'weekly' as const, weekdays: ['monday' as const] },
        everyOther: 1,
      },
    }
    mount(weekly)

    expect(screen.getByRole('button', { name: 'Mon' })).toBeTruthy()
    expect(screen.getByText('Weekly on Mon')).toBeTruthy()
  })
})

describe('validity and in-flight saves', () => {
  it('says what blocks the save rather than only greying the control', () => {
    mount(detailEndeavorMocks.untitled, { isValid: false })

    expect(
      screen.getByText('Give this endeavor a title before saving.'),
    ).toBeTruthy()
  })

  it('disables every control while a save is in flight', () => {
    mount(detailEndeavorMocks.task, { isSaving: true })

    expect(screen.getByLabelText('Title').hasAttribute('disabled')).toBe(true)
    expect(screen.getByLabelText('Status').hasAttribute('disabled')).toBe(true)
  })

  it('surfaces the failure that left the working copy dirty', () => {
    mount(detailEndeavorMocks.task, {
      exception: EndeavorDetailExceptions.localPersistenceFailed('disk full'),
    })

    expect(
      screen.getByText("Couldn't save your changes: disk full"),
    ).toBeTruthy()
  })
})
