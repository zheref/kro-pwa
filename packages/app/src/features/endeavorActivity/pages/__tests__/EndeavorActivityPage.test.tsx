import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { activityEndeavorMocks } from '../../EndeavorActivityMocks'
import { EndeavorActivityPage } from '../EndeavorActivityPage'
import { ActivityHarness, activityStore } from './endeavorActivityScenes'

afterEach(cleanup)

describe('EndeavorActivityPage — mirrors its stories', () => {
  it('loads a task’s history on mount and filters it by tab', async () => {
    const store = activityStore()
    render(
      <ActivityHarness store={store}>
        <EndeavorActivityPage endeavorId={activityEndeavorMocks.many.id} />
      </ActivityHarness>,
    )
    expect(await screen.findByText('4 records')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Complete' }))
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(store.getState().endeavorActivity.tab).toBe('complete')
  })

  it('lists a habit’s sessions', async () => {
    render(
      <ActivityHarness store={activityStore()}>
        <EndeavorActivityPage endeavorId={activityEndeavorMocks.habit.id} />
      </ActivityHarness>,
    )
    expect(await screen.findByText('2 records')).toBeTruthy()
  })

  it('says behavior history is not supported yet', async () => {
    render(
      <ActivityHarness store={activityStore()}>
        <EndeavorActivityPage endeavorId={activityEndeavorMocks.behavior.id} />
      </ActivityHarness>,
    )
    expect(await screen.findByText('Not supported yet')).toBeTruthy()
  })

  it('surfaces not-found for an endeavor that is not stored', async () => {
    render(
      <ActivityHarness store={activityStore()}>
        <EndeavorActivityPage endeavorId="missing" />
      </ActivityHarness>,
    )
    expect((await screen.findByRole('alert')).textContent).toContain(
      'no longer on this device',
    )
  })

  it('aborts the in-flight load on unmount without painting an exception', async () => {
    const store = activityStore()
    const { unmount } = render(
      <ActivityHarness store={store}>
        <EndeavorActivityPage endeavorId={activityEndeavorMocks.many.id} />
      </ActivityHarness>,
    )
    unmount()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(store.getState().endeavorActivity.load.kind).not.toBe('failed')
  })
})
