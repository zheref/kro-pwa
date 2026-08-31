/**
 * The relation screens' render tests, mirroring their stories (`RC-11`).
 *
 * The two claims this file exists for are the copy ones: a read-only relation
 * says WHY instead of showing a form, and its empty state changes with it —
 * "log one below by hand" is a lie on a surface that has no form.
 */
import { EndeavorKind, EndeavorRelation, PerformResolution } from '@kro/core'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { detailEndeavorMocks } from '../EndeavorDetailMocks'
import { EndeavorDetailExceptions } from '../EndeavorDetailException'
import {
  type RelationDraft,
  attachedHostsOf,
  hostAttachCandidatesOf,
  relationEmptyState,
  relationReadOnlyReason,
} from '../EndeavorRelations'
import {
  EndeavorRelationFragment,
  relationEntryFromDraft,
} from './EndeavorRelationFragment'

afterEach(cleanup)

const NOW = new Date(2026, 5, 18, 9, 40)
type Mock = (typeof detailEndeavorMocks)[keyof typeof detailEndeavorMocks]

const mount = (
  endeavor: Mock,
  relation: EndeavorRelation,
  overrides: {
    draft?: RelationDraft | null
    isDraftCommittable?: boolean
    isSaving?: boolean
    exception?: ReturnType<typeof EndeavorDetailExceptions.relationSyncFailed> | null
    onChangeDraft?: (draft: RelationDraft | null) => void
    onCommitDraft?: () => void
    onRemoveEntry?: (index: number) => void
    onAttachHost?: (host: string) => void
    onDetachHost?: (host: string) => void
  } = {},
) =>
  render(
    <EndeavorRelationFragment
      relation={relation}
      endeavor={endeavor}
      readOnlyReason={relationReadOnlyReason(relation, endeavor.kind)}
      emptyState={relationEmptyState(relation, endeavor.kind)}
      isSaving={overrides.isSaving ?? false}
      exception={overrides.exception ?? null}
      draft={overrides.draft ?? null}
      isDraftCommittable={overrides.isDraftCommittable ?? false}
      attachedHosts={attachedHostsOf(endeavor)}
      hostCandidates={hostAttachCandidatesOf(endeavor)}
      now={NOW}
      locale="en-US"
      onChangeDraft={overrides.onChangeDraft ?? (() => {})}
      onCommitDraft={overrides.onCommitDraft ?? (() => {})}
      onRemoveEntry={overrides.onRemoveEntry ?? (() => {})}
      onAttachHost={overrides.onAttachHost ?? (() => {})}
      onDetachHost={overrides.onDetachHost ?? (() => {})}
    />,
  )

describe('the shared layout', () => {
  it('introduces every relation with its own title and subtitle', () => {
    mount(detailEndeavorMocks.task, EndeavorRelation.defers)

    expect(screen.getByRole('heading', { name: 'Defers' })).toBeTruthy()
    expect(
      screen.getByText("Every time this endeavor's due date was pushed back."),
    ).toBeTruthy()
  })

  it('totals the performances log in its header rather than making you add rows up', () => {
    mount(detailEndeavorMocks.taskWithSessions, EndeavorRelation.performances)

    expect(screen.getByText('3 sessions')).toBeTruthy()
  })

  it('surfaces a relation write failure above the list', () => {
    mount(detailEndeavorMocks.task, EndeavorRelation.defers, {
      exception: EndeavorDetailExceptions.relationSyncFailed('offline'),
    })

    expect(screen.getByText("Couldn't save that entry: offline")).toBeTruthy()
  })
})

describe('a read-only relation says WHY, and its empty state changes with it', () => {
  it('replaces the add form with the kind\'s own reason', () => {
    mount(detailEndeavorMocks.event, EndeavorRelation.performances)

    expect(
      screen.getByText("This endeavor's kind can't record sessions."),
    ).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Add Performance' })).toBeNull()
  })

  it('says sessions WILL appear here, never "log one below by hand"', () => {
    mount(detailEndeavorMocks.event, EndeavorRelation.performances)

    expect(
      screen.getByText(
        'Sessions logged against this endeavor will appear here.',
      ),
    ).toBeTruthy()
  })

  it('invites the hand-log only where the form actually exists', () => {
    mount(detailEndeavorMocks.task, EndeavorRelation.performances)

    expect(
      screen.getByText(
        'Start a session on this endeavor, or log one below by hand.',
      ),
    ).toBeTruthy()
  })

  it('offers no remove control on a read-only list that still has rows', () => {
    // Rows can outlive editability: a mirrored item resolves to a kind whose
    // matrix forbids recording sessions, and the three it already carries do
    // not vanish. They render — and offer nothing.
    mount(
      {
        ...detailEndeavorMocks.event,
        performances: detailEndeavorMocks.taskWithSessions.performances,
      },
      EndeavorRelation.performances,
    )

    expect(screen.getByText('3 sessions')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Remove performance/ })).toBeNull()
  })
})

describe('the add forms', () => {
  it('keeps the submit disabled until the draft says enough', () => {
    mount(detailEndeavorMocks.task, EndeavorRelation.performances)

    expect(
      screen
        .getByRole('button', { name: 'Add Performance' })
        .hasAttribute('disabled'),
    ).toBe(true)
  })

  it('reports every field edit as a whole draft, so the reducer sees one shape', async () => {
    const onChangeDraft = vi.fn()
    mount(detailEndeavorMocks.task, EndeavorRelation.defers, { onChangeDraft })

    await userEvent.type(screen.getByLabelText('Reason (optional)'), 'x')

    expect(onChangeDraft).toHaveBeenLastCalledWith({
      relation: 'defers',
      draft: { target: NOW, reason: 'x' },
    })
  })

  it('commits a committable draft on submit', async () => {
    const onCommitDraft = vi.fn()
    mount(detailEndeavorMocks.task, EndeavorRelation.defers, {
      draft: { relation: 'defers', draft: { target: NOW, reason: '' } },
      isDraftCommittable: true,
      onCommitDraft,
    })

    await userEvent.click(screen.getByRole('button', { name: 'Add Defer' }))

    expect(onCommitDraft).toHaveBeenCalledTimes(1)
  })

  it('removes an entry by its position, which is its identity here', async () => {
    const onRemoveEntry = vi.fn()
    mount(detailEndeavorMocks.taskWithSessions, EndeavorRelation.performances, {
      onRemoveEntry,
    })

    const removes = screen.getAllByRole('button', { name: /^Remove performance/ })
    await userEvent.click(removes[0] as HTMLElement)

    expect(onRemoveEntry).toHaveBeenCalledWith(0)
  })
})

describe('hosts cannot be attached in this build, and the screen says so', () => {
  it('lists every candidate rather than hiding the gap', () => {
    mount(detailEndeavorMocks.task, EndeavorRelation.hosts)

    expect(
      screen.getByText('Google Calendar mirroring is not connected yet.'),
    ).toBeTruthy()
    // Both Apple providers give the same reason, so there are two of them.
    expect(
      screen.getAllByText('Apple Calendar and Reminders have no web equivalent.'),
    ).toHaveLength(2)
  })

  it('renders the Attach control disabled rather than absent', () => {
    mount(detailEndeavorMocks.task, EndeavorRelation.hosts)

    const attach = screen.getAllByRole('button', { name: /^Attach / })
    expect(attach.length).toBeGreaterThan(0)
    for (const button of attach) {
      expect(button.hasAttribute('disabled')).toBe(true)
    }
  })

  it('shows the endeavor is mirrored nowhere, with the editable invitation', () => {
    mount(detailEndeavorMocks.task, EndeavorRelation.hosts)

    expect(screen.getByText('Not mirrored anywhere')).toBeTruthy()
    expect(
      screen.getByText(
        'Attach a provider below to keep this endeavor in sync outside Kro.',
      ),
    ).toBeTruthy()
  })
})

describe('relationEntryFromDraft', () => {
  it('builds a performance, normalising a blank note to null', () => {
    const entry = relationEntryFromDraft(
      {
        relation: 'performances',
        draft: {
          date: NOW,
          durationSeconds: 1500,
          resolution: PerformResolution.complete,
          notes: '   ',
          rewardPoints: 5,
          wasCompletedInSession: true,
          editingIndex: null,
        },
      },
      NOW,
    )

    expect(entry).toMatchObject({
      duration: 1500,
      notes: null,
      rewardPoints: 5,
      wasCompletedInSession: true,
    })
  })

  it('stamps a defer\'s `made` from the caller\'s clock, never its own', () => {
    const entry = relationEntryFromDraft(
      { relation: 'defers', draft: { target: NOW, reason: 'later' } },
      new Date(2026, 0, 1),
    )

    expect(entry).toMatchObject({
      made: new Date(2026, 0, 1),
      reason: 'later',
      target: NOW,
    })
  })

  it('trims a shadow\'s identity columns and drops an empty group', () => {
    const entry = relationEntryFromDraft(
      {
        relation: 'shadows',
        draft: {
          originalTitle: ' Team sync ',
          sourceIdentifier: ' gcal-1 ',
          source: ' googleCalendar ',
          kind: EndeavorKind.calendarEvent,
          group: '  ',
        },
      },
      NOW,
    )

    expect(entry).toMatchObject({
      originalTitle: 'Team sync',
      sourceIdentifier: 'gcal-1',
      source: 'googleCalendar',
      group: null,
    })
  })

  it('builds nothing for hosts, which attach rather than adding a row', () => {
    expect(
      relationEntryFromDraft({ relation: 'hosts', host: 'googleCalendar' }, NOW),
    ).toBeNull()
  })
})

describe('the hosts list', () => {
  it('lists an attached provider with a named detach control', async () => {
    const onDetachHost = vi.fn()
    mount(detailEndeavorMocks.event, EndeavorRelation.hosts, { onDetachHost })

    await userEvent.click(
      screen.getByRole('button', { name: 'Detach Google Calendar' }),
    )

    expect(onDetachHost).toHaveBeenCalledWith('googleCalendar')
  })

  it('drops an attached provider out of the candidate list', () => {
    mount(detailEndeavorMocks.event, EndeavorRelation.hosts)

    expect(
      screen.queryByRole('button', { name: 'Attach Google Calendar' }),
    ).toBeNull()
    expect(
      screen.getByRole('button', { name: 'Attach Outlook Calendar' }),
    ).toBeTruthy()
  })

  it('says "All set" when every provider is already attached', () => {
    const everywhere = {
      ...detailEndeavorMocks.event,
      hostedBy: [
        'appleCalendar' as const,
        'appleReminders' as const,
        'googleCalendar' as const,
        'outlookCalendar' as const,
      ],
    }
    mount(everywhere, EndeavorRelation.hosts)

    expect(screen.getByText('All set')).toBeTruthy()
    expect(screen.getByText('Every provider is already attached.')).toBeTruthy()
  })
})

describe('the shadows list', () => {
  it('names each mirror and chips its source and kind', () => {
    mount(detailEndeavorMocks.event, EndeavorRelation.shadows)

    expect(screen.getByText('Team sync')).toBeTruthy()
    expect(screen.getByText('googleCalendar')).toBeTruthy()
    expect(screen.getAllByText('Event').length).toBeGreaterThan(0)
  })

  it('collects the four identity columns a mirror is matched on', async () => {
    const onChangeDraft = vi.fn()
    mount(detailEndeavorMocks.event, EndeavorRelation.shadows, { onChangeDraft })

    await userEvent.type(screen.getByLabelText('Original title'), 'A')
    expect(onChangeDraft).toHaveBeenLastCalledWith({
      relation: 'shadows',
      draft: {
        originalTitle: 'A',
        sourceIdentifier: '',
        source: '',
        kind: EndeavorKind.task,
        group: '',
      },
    })

    await userEvent.selectOptions(screen.getByLabelText('Kind'), 'habit')
    expect(onChangeDraft).toHaveBeenLastCalledWith({
      relation: 'shadows',
      draft: expect.objectContaining({ kind: 'habit' }),
    })
  })

  it('removes a mirror by its position', async () => {
    const onRemoveEntry = vi.fn()
    mount(detailEndeavorMocks.event, EndeavorRelation.shadows, { onRemoveEntry })

    await userEvent.click(
      screen.getByRole('button', { name: 'Remove Team sync' }),
    )

    expect(onRemoveEntry).toHaveBeenCalledWith(0)
  })
})

describe('the performance form collects the user-meaningful subset', () => {
  it('reports the duration in seconds, though it is typed in minutes', async () => {
    const onChangeDraft = vi.fn()
    mount(detailEndeavorMocks.task, EndeavorRelation.performances, {
      onChangeDraft,
    })

    // `fireEvent.change` rather than typing: the draft is the store's, so an
    // uncontrolled keystroke-by-keystroke type would re-read the same seed on
    // every character and only the last one would survive.
    fireEvent.change(screen.getByLabelText('Duration (minutes)'), {
      target: { value: '4' },
    })

    expect(onChangeDraft).toHaveBeenLastCalledWith({
      relation: 'performances',
      draft: expect.objectContaining({ durationSeconds: 240 }),
    })
  })

  it('reports the resolution the user picked', async () => {
    const onChangeDraft = vi.fn()
    mount(detailEndeavorMocks.task, EndeavorRelation.performances, {
      onChangeDraft,
    })

    await userEvent.selectOptions(screen.getByLabelText('Resolution'), 'aborted')

    expect(onChangeDraft).toHaveBeenLastCalledWith({
      relation: 'performances',
      draft: expect.objectContaining({ resolution: PerformResolution.aborted }),
    })
  })

  it('only claims a whole focus session when the user says so', async () => {
    const onChangeDraft = vi.fn()
    mount(detailEndeavorMocks.task, EndeavorRelation.performances, {
      onChangeDraft,
    })

    await userEvent.click(
      screen.getByLabelText('This was a whole focus session'),
    )

    expect(onChangeDraft).toHaveBeenLastCalledWith({
      relation: 'performances',
      draft: expect.objectContaining({ wasCompletedInSession: true }),
    })
  })

  it('carries the notes and the reward points into the draft', async () => {
    const onChangeDraft = vi.fn()
    mount(detailEndeavorMocks.task, EndeavorRelation.performances, {
      onChangeDraft,
    })

    await userEvent.type(screen.getByLabelText('Notes (optional)'), 'n')
    expect(onChangeDraft).toHaveBeenLastCalledWith({
      relation: 'performances',
      draft: expect.objectContaining({ notes: 'n' }),
    })

    fireEvent.change(screen.getByLabelText('Reward points'), {
      target: { value: '15' },
    })
    expect(onChangeDraft).toHaveBeenLastCalledWith({
      relation: 'performances',
      draft: expect.objectContaining({ rewardPoints: 15 }),
    })
  })

  it('prints the notes a recorded performance carries', () => {
    const first = detailEndeavorMocks.taskWithSessions.performances[0]
    if (first === undefined) throw new Error('no seeded performance')
    mount(
      {
        ...detailEndeavorMocks.task,
        performances: [{ ...first, notes: 'Made good progress' }],
      },
      EndeavorRelation.performances,
    )

    expect(screen.getByText('Made good progress')).toBeTruthy()
  })

  it('announces a write in flight and disables the controls with it', () => {
    mount(detailEndeavorMocks.taskWithSessions, EndeavorRelation.performances, {
      isSaving: true,
    })

    expect(screen.getByRole('status').textContent).toBe('Saving…')
    for (const button of screen.getAllByRole('button', {
      name: /^Remove performance/,
    })) {
      expect(button.hasAttribute('disabled')).toBe(true)
    }
  })
})

describe('the defer list', () => {
  it('leads each row with the date it was pushed TO, and states why', () => {
    mount(
      {
        ...detailEndeavorMocks.task,
        defers: [
          {
            made: new Date(2026, 5, 18, 9),
            reason: 'Waiting on finance',
            target: new Date(2026, 5, 20, 9),
          },
        ],
      },
      EndeavorRelation.defers,
    )

    expect(screen.getByText('Waiting on finance')).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Remove defer to/ })).toBeTruthy()
  })
})
