/**
 * The global Detail overlay, against a real store over a seeded database
 * (`RC-22`, `RC-35`).
 *
 * Two of these are the issue's own acceptance criteria and neither can be read
 * from a screenshot: Detail **opens from another surface's row**, and the
 * editor's **dirty tracking** decides whether Save is offered at all.
 */
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { installRadixEnvironment } from '../../../design/system/primitives/__tests__/radixEnvironment'
import { findEndeavorMocks } from '../../find/FindMocks'
import { TasksPage } from '../../find/pages/TasksPage'
import {
  Harness,
  makeSeededStore,
} from '../../find/pages/__tests__/pagesHarness'
import type { AppStore } from '../../../library/store'
import { onShellMounted } from '../../main/MainFeature'
import { handheldSurface } from '../../main/MainMocks'
import {
  onDetailRequested,
  userDidChangeField,
  userDidChangeRelationDraft,
  userDidTapField,
  userDidTapManageRelation,
} from '../EndeavorDetailFeature'
import { detailEndeavorMocks } from '../EndeavorDetailMocks'
import { DetailOverlays } from './DetailOverlays'

let teardown: () => void

afterEach(() => {
  cleanup()
  teardown?.()
})

type Mock = (typeof detailEndeavorMocks)[keyof typeof detailEndeavorMocks]

const mountPresented = (
  endeavor: Mock,
  then?: (store: AppStore) => void,
): AppStore => {
  teardown = installRadixEnvironment()
  const store = makeSeededStore({ endeavors: [endeavor] })
  store.dispatch(onDetailRequested({ endeavor }))
  then?.(store)
  render(
    <Harness store={store}>
      <DetailOverlays locale="en-US" />
    </Harness>,
  )
  return store
}

describe('Detail opens from ANY surface, through the intent queue', () => {
  it('presents the endeavor an All Tasks row asked for', async () => {
    teardown = installRadixEnvironment()
    const store = makeSeededStore({
      endeavors: [findEndeavorMocks.morningTask],
    })

    render(
      <Harness store={store}>
        <TasksPage selection={{ kind: 'default' }} input="touch" locale="en-US" />
        <DetailOverlays locale="en-US" />
      </Harness>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('tasks-row-open')).toBeTruthy()
    })
    await userEvent.click(screen.getByTestId('tasks-row-open'))

    await waitFor(() => {
      expect(screen.getByTestId('detail-overlay')).toBeTruthy()
    })
    // Two headings carry the title: the sheet's own `sr-only` accessible name
    // and the Detail header's visible one. Both are correct; neither is the
    // claim, which is that the overlay is presenting THIS endeavor.
    expect(
      within(screen.getByTestId('detail-overlay')).getAllByRole('heading', {
        name: findEndeavorMocks.morningTask.title,
      }).length,
    ).toBeGreaterThan(0)
  })

  it('acknowledges the intent by id, so a re-render cannot replay it', async () => {
    teardown = installRadixEnvironment()
    const store = makeSeededStore({
      endeavors: [findEndeavorMocks.morningTask],
    })

    render(
      <Harness store={store}>
        <TasksPage selection={{ kind: 'default' }} input="touch" locale="en-US" />
        <DetailOverlays locale="en-US" />
      </Harness>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('tasks-row-open')).toBeTruthy()
    })
    await userEvent.click(screen.getByTestId('tasks-row-open'))

    await waitFor(() => {
      expect(store.getState().find.intents).toHaveLength(0)
    })
  })

  it('renders nothing at all while no endeavor is presented', () => {
    teardown = installRadixEnvironment()
    render(
      <Harness store={makeSeededStore()}>
        <DetailOverlays locale="en-US" />
      </Harness>,
    )

    expect(screen.queryByTestId('detail-overlay')).toBeNull()
  })
})

describe('the title bar', () => {
  it('offers Close on the read surface and no Save — there is nothing to save', () => {
    mountPresented(detailEndeavorMocks.task)

    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull()
  })

  it('dismisses the whole surface from the title bar, not the bottom of a scroll', async () => {
    const store = mountPresented(detailEndeavorMocks.task)

    await userEvent.click(screen.getByRole('button', { name: 'Close' }))

    await waitFor(() => {
      expect(store.getState().endeavorDetail.endeavor).toBeNull()
    })
  })

  it('swaps Close for Back once an editor is presented over Detail', async () => {
    const store = mountPresented(detailEndeavorMocks.task, (each) => {
      each.dispatch(userDidTapField({ field: 'status' }))
    })

    expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy()

    await userEvent.click(screen.getByRole('button', { name: 'Back' }))

    await waitFor(() => {
      expect(store.getState().endeavorDetail.destination).toBeNull()
    })
    // Back leaves Detail open; only Close dismisses it.
    expect(store.getState().endeavorDetail.endeavor).not.toBeNull()
  })

  it('names the endeavor\'s kind and state under the title', () => {
    mountPresented(detailEndeavorMocks.task)

    expect(screen.getByText(/Task · Pending/)).toBeTruthy()
  })
})

describe('dirty tracking decides whether Save is offered', () => {
  it('disables Save on a clean editor — there is nothing to write', () => {
    mountPresented(detailEndeavorMocks.task, (store) => {
      store.dispatch(userDidTapField({ field: 'status' }))
    })

    expect(
      screen.getByRole('button', { name: 'Save' }).hasAttribute('disabled'),
    ).toBe(true)
  })

  it('enables Save the moment the working copy differs from the saved one', async () => {
    mountPresented(detailEndeavorMocks.task, (store) => {
      store.dispatch(userDidTapField({ field: 'status' }))
      store.dispatch(
        userDidChangeField({ change: { field: 'status', value: 'blocked' } }),
      )
    })

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Save' }).hasAttribute('disabled'),
      ).toBe(false)
    })
  })

  it('persists the working copy and leaves the editor clean again', async () => {
    const store = mountPresented(detailEndeavorMocks.task, (each) => {
      each.dispatch(userDidTapField({ field: 'status' }))
      each.dispatch(
        userDidChangeField({ change: { field: 'status', value: 'blocked' } }),
      )
    })

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(store.getState().endeavorDetail.endeavor?.status).toBe('blocked')
    })
    // The baseline moved with the save, so nothing is left to write.
    const draft = store.getState().endeavorDetail.edit
    expect(draft?.working).toEqual(draft?.original)
  })

  it('refuses a change the matrix forbids, leaving the draft clean', async () => {
    mountPresented(detailEndeavorMocks.event, (store) => {
      store.dispatch(userDidTapField({ field: 'status' }))
      // A calendar event has no editable `due`; the domain's guarded helper
      // returns the same object, so the draft never becomes dirty.
      store.dispatch(
        userDidChangeField({
          change: { field: 'due', value: new Date(2026, 0, 1) },
        }),
      )
    })

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Save' }).hasAttribute('disabled'),
      ).toBe(true)
    })
  })
})

describe('the destinations the overlay presents', () => {
  it('opens the Duration profile from the Detail row that owns it', () => {
    mountPresented(detailEndeavorMocks.taskWithSessions, (store) => {
      store.dispatch(userDidTapField({ field: 'duration' }))
    })

    expect(screen.getByTestId('endeavor-duration')).toBeTruthy()
    expect(screen.getByTestId('observed-average')).toBeTruthy()
  })

  it('opens a relation screen from its Manage affordance', () => {
    mountPresented(detailEndeavorMocks.task, (store) => {
      store.dispatch(userDidTapManageRelation({ relation: 'hosts' }))
    })

    const relation = screen.getByTestId('endeavor-relation')
    expect(relation.dataset.relation).toBe('hosts')
    expect(within(relation).getByRole('heading', { name: 'Hosts' })).toBeTruthy()
  })

  it('offers no Save on a relation screen — each entry commits on its own', () => {
    mountPresented(detailEndeavorMocks.task, (store) => {
      store.dispatch(userDidTapManageRelation({ relation: 'defers' }))
    })

    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull()
  })

  it('presents a bottom SHEET on the tab-bar shell, not a centred dialog', () => {
    const store = mountPresented(detailEndeavorMocks.task, (each) => {
      each.dispatch(
        onShellMounted({ surface: handheldSurface, isDevelopment: false }),
      )
    })

    expect(store.getState().main.surface).toEqual(handheldSurface)
    expect(screen.getByTestId('detail-overlay').dataset.side).toBe('bottom')
  })
})

describe('a relation write commits on its own, through the real Producer', () => {
  it('adds a hand-logged performance and refreshes the presented endeavor', async () => {
    const store = mountPresented(detailEndeavorMocks.task, (each) => {
      each.dispatch(userDidTapManageRelation({ relation: 'performances' }))
      each.dispatch(
        userDidChangeRelationDraft({
          draft: {
            relation: 'performances',
            draft: {
              date: new Date(2026, 5, 18, 9),
              durationSeconds: 1500,
              resolution: 'complete',
              notes: 'Focused block',
              rewardPoints: 10,
              wasCompletedInSession: true,
              editingIndex: null,
            },
          },
        }),
      )
    })

    await userEvent.click(
      screen.getByRole('button', { name: 'Add Performance' }),
    )

    await waitFor(() => {
      expect(store.getState().endeavorDetail.endeavor?.performances).toHaveLength(
        1,
      )
    })
    expect(
      store.getState().endeavorDetail.endeavor?.performances[0]?.rewardPoints,
    ).toBe(10)
  })

  it('removes a recorded performance by its position', async () => {
    const store = mountPresented(
      detailEndeavorMocks.taskWithSessions,
      (each) => {
        each.dispatch(userDidTapManageRelation({ relation: 'performances' }))
      },
    )

    const removes = screen.getAllByRole('button', {
      name: /^Remove performance/,
    })
    await userEvent.click(removes[0] as HTMLElement)

    await waitFor(() => {
      expect(
        store.getState().endeavorDetail.endeavor?.performances,
      ).toHaveLength(2)
    })
  })

  it('adds a defer, which is two rows: the moved due date and its audit entry', async () => {
    const store = mountPresented(detailEndeavorMocks.task, (each) => {
      each.dispatch(userDidTapManageRelation({ relation: 'defers' }))
      each.dispatch(
        userDidChangeRelationDraft({
          draft: {
            relation: 'defers',
            draft: { target: new Date(2026, 5, 25, 9), reason: 'Blocked' },
          },
        }),
      )
    })

    await userEvent.click(screen.getByRole('button', { name: 'Add Defer' }))

    await waitFor(() => {
      expect(store.getState().endeavorDetail.endeavor?.defers).toHaveLength(1)
    })
    expect(store.getState().endeavorDetail.endeavor?.defers[0]?.reason).toBe(
      'Blocked',
    )
  })

  it('adds a shadow from the four identity columns', async () => {
    const store = mountPresented(detailEndeavorMocks.task, (each) => {
      each.dispatch(userDidTapManageRelation({ relation: 'shadows' }))
      each.dispatch(
        userDidChangeRelationDraft({
          draft: {
            relation: 'shadows',
            draft: {
              originalTitle: 'Mirrored',
              sourceIdentifier: 'rem-1',
              source: 'appleReminders',
              kind: 'task',
              group: '',
            },
          },
        }),
      )
    })

    await userEvent.click(screen.getByRole('button', { name: 'Add Shadow' }))

    await waitFor(() => {
      expect(store.getState().endeavorDetail.endeavor?.shadows).toHaveLength(1)
    })
  })

  it('offers no Attach control this build can honour, and says why per provider', () => {
    mountPresented(detailEndeavorMocks.event, (each) => {
      each.dispatch(userDidTapManageRelation({ relation: 'hosts' }))
    })

    // Every provider is listed rather than hidden — a hidden control makes the
    // gap invisible — and every one of them is disabled with its reason.
    const attach = screen.getAllByRole('button', { name: /^Attach / })
    expect(attach.length).toBeGreaterThan(0)
    for (const button of attach) {
      expect(button.hasAttribute('disabled')).toBe(true)
    }
    expect(
      screen.getByText('Outlook mirroring is off in this build.'),
    ).toBeTruthy()
  })

  it('refuses a DETACH this build has no adapter for, and surfaces the reason', async () => {
    const store = mountPresented(detailEndeavorMocks.event, (each) => {
      each.dispatch(userDidTapManageRelation({ relation: 'hosts' }))
    })

    // Detach is the one host control that is enabled today, so it is the one
    // that actually reaches the Producer — which refuses, because no provider
    // adapter is wired (KC-IS-#29 / KC-IS-#33).
    await userEvent.click(
      screen.getByRole('button', { name: 'Detach Google Calendar' }),
    )

    await waitFor(() => {
      expect(store.getState().endeavorDetail.save.kind).toBe('failed')
    })
    expect(
      screen.getByText('Google Calendar mirroring is not connected yet.'),
    ).toBeTruthy()
  })
})
