/**
 * The quick-action Page's render tests, mirroring
 * `CaptureQuickActionPage.stories` (`RC-11`).
 *
 * It reads one thing — which destination the shell has selected — and
 * dispatches one intent.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { onDestinationRouteMounted } from '../../../main/MainFeature'
import { DestinationKind } from '../../../main/SidebarDestination'
import { CaptureKind } from '../../CaptureRules'
import { CaptureQuickActionPage } from '../CaptureQuickActionPage'
import {
  type CaptureStore,
  CaptureStoreStage,
  installCaptureEnvironment,
  makeCaptureStore,
} from './captureHarness'

let teardownCapture: () => void

beforeEach(() => {
  teardownCapture = installCaptureEnvironment()
})

afterEach(() => {
  cleanup()
  teardownCapture()
})

const mount = (store: CaptureStore) =>
  render(
    <CaptureStoreStage store={store}>
      <CaptureQuickActionPage />
    </CaptureStoreStage>,
  )

describe('it follows the selected destination', () => {
  it('draws the disc where no other child owns a FAB', () => {
    mount(
      makeCaptureStore({
        endeavors: [],
        destination: { kind: DestinationKind.allTasks },
      }),
    )

    expect(screen.getByRole('button', { name: 'Quick add' })).toBeTruthy()
  })

  it("stands down on Plan, whose own menu is KC-IS-#19's", () => {
    mount(
      makeCaptureStore({
        endeavors: [],
        destination: { kind: DestinationKind.plan },
      }),
    )

    expect(screen.queryByRole('button', { name: 'Quick add' })).toBeNull()
  })

  it('follows a later selection rather than the one it mounted on', async () => {
    const store = makeCaptureStore({
      endeavors: [],
      destination: { kind: DestinationKind.allTasks },
    })
    mount(store)
    expect(screen.getByRole('button', { name: 'Quick add' })).toBeTruthy()

    store.dispatch(
      onDestinationRouteMounted({
        destination: { kind: DestinationKind.plan },
      }),
    )

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Quick add' })).toBeNull()
    })
  })
})

describe('the intent it carries', () => {
  it('opens the capture prompt on Task — canon\'s plus / "Quick Add" pairing', async () => {
    const store = makeCaptureStore({
      endeavors: [],
      destination: { kind: DestinationKind.allTasks },
    })
    mount(store)

    await userEvent.click(screen.getByRole('button', { name: 'Quick add' }))

    expect(store.getState().capture.prompt?.draft.kind).toBe(CaptureKind.task)
  })

  it('opens the draft unscheduled — only the Plan timeline seeds a start', async () => {
    const store = makeCaptureStore({
      endeavors: [],
      destination: { kind: DestinationKind.allTasks },
    })
    mount(store)

    await userEvent.click(screen.getByRole('button', { name: 'Quick add' }))

    expect(store.getState().capture.prompt?.draft.hasTime).toBe(false)
    expect(store.getState().capture.prompt?.draft.hasEndTime).toBe(false)
  })

  it('seeds the draft with the remembered hosting destination', async () => {
    const store = makeCaptureStore({
      endeavors: [],
      destination: { kind: DestinationKind.allTasks },
    })
    mount(store)

    await userEvent.click(screen.getByRole('button', { name: 'Quick add' }))

    expect(store.getState().capture.prompt?.draft.destination).toBe(
      store.getState().capture.lastUsedDestination,
    )
  })
})
