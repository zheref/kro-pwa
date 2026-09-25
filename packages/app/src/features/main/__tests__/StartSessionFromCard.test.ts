/**
 * Execute on a card: one Producer prepares the launch, then raises the
 * session surface named after what the preparation read (`RC-3`, `RC-7`).
 * Driven through the real thunk against stubbed Services (`RC-54`, `RC-35`).
 */
import { endeavorMocks } from '@kro/core/mocks'
import { describe, expect, it } from 'vitest'
import { makeRecordingNavigationService } from '../../../services/navigation/NavigationService'
import { makePaneHostStore } from '../../endeavorDetail/pages/__tests__/paneHarness'
import { makeSeededStore } from '../../find/pages/__tests__/pagesHarness'
import { startSessionThunk } from '../../session/SessionProducer'
import { startSessionFromCardThunk } from '../MainProducer'

const task = endeavorMocks.plannedTask

const paneStore = async () => {
  const store = makePaneHostStore({ endeavors: [task] })
  await Promise.resolve()
  await Promise.resolve()
  return store
}

describe('startSessionFromCardThunk', () => {
  it('opens the pane on the card named after the prepared session (Mac sidebar)', async () => {
    const store = await paneStore()

    const action = await store.dispatch(
      startSessionFromCardThunk({ endeavorId: task.id, sessionId: 's-1' }),
    )

    expect(action.payload).toEqual({
      ok: true,
      value: { kind: 'pane', endeavor: { id: task.id, title: task.title } },
    })
    expect(store.getState().main.detailPane.segment).toBe('sessionSetup')
    expect(store.getState().main.detailPane.endeavor).toEqual({
      id: task.id,
      title: task.title,
    })
  })

  it('navigates to Execute where this window hosts no pane (phone width)', async () => {
    const navigation = makeRecordingNavigationService()
    const store = makeSeededStore({
      endeavors: [task],
      extra: { navigation },
    })

    const action = await store.dispatch(
      startSessionFromCardThunk({ endeavorId: task.id, sessionId: 's-1' }),
    )

    const payload = action.payload as { ok: boolean; value: { kind: string } }
    expect(payload.ok).toBe(true)
    expect(payload.value.kind).toBe('route')
    expect(navigation.calls).toHaveLength(1)
  })

  it('still opens the pane with the fallback title when preparation fails (row gone)', async () => {
    const store = await paneStore()

    const action = await store.dispatch(
      startSessionFromCardThunk({
        endeavorId: 'missing',
        sessionId: 's-1',
        fallbackTitle: 'Card title',
      }),
    )

    expect(action.type).toContain('fulfilled')
    expect(store.getState().main.detailPane.endeavor).toEqual({
      id: 'missing',
      title: 'Card title',
    })
  })

  it('skips the preparation while a session is already running, so setup never sticks loading', async () => {
    const store = await paneStore()
    await store.dispatch(
      startSessionFromCardThunk({ endeavorId: task.id, sessionId: 's-1' }),
    )
    await store.dispatch(startSessionThunk({ now: new Date() }))
    expect(store.getState().session.phase).toBe('running')

    await store.dispatch(
      startSessionFromCardThunk({ endeavorId: 'other', sessionId: 's-2' }),
    )

    expect(store.getState().session.load.kind).not.toBe('loading')
    expect(store.getState().main.detailPane.segment).toBe('sessionSetup')
    expect(store.getState().main.detailPane.endeavor?.id).toBe(task.id)
  })
})
