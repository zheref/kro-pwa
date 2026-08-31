/**
 * The shell-wide profile control's container, against a real store built with
 * `makeStore(stubbedThunkExtra)` (`RC-22`, `RC-35`).
 *
 * The popover's *panel* is not opened here on purpose: mounting a Radix popper
 * under jsdom costs seconds (the measurement is in the design system's own
 * `radixEnvironment` note), and the panel's content is
 * `ProfilePopoverFragment`, which has its own render tests. What this suite
 * owns is the wiring — the trigger, the slot, and the two dialogs.
 */
import { epochMillisFromDate } from '@kro/core'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { StoreProvider } from '../../../../library/StoreProvider'
import {
  type ThunkExtra,
  makeStore,
  stubbedThunkExtra,
} from '../../../../library/store'
import {
  restoreSessionThunk,
  signInWithEmailThunk,
} from '../../../auth/AuthProducer'
import { makeStubbedAuthService } from '../../../../services/auth/AuthService'
import { makeInMemoryLocalStore } from '../../../../services/localStore/InMemoryLocalStore'
import { authUserMocks } from '../../../auth/AuthMocks'
import { ToolbarOutlet, ToolbarSlotsProvider } from '../../../main/ToolbarSlots'
import { userDidTapSignIn } from '../../SettingsFeature'
import { ProfileControlPage } from '../ProfileControlPage'

afterEach(cleanup)

const renderControl = (extra: ThunkExtra = stubbedThunkExtra) => {
  const store = makeStore(extra)
  const view = render(
    <StoreProvider store={store}>
      <ToolbarSlotsProvider>
        <ToolbarOutlet placement="profile" />
        <ProfileControlPage />
      </ToolbarSlotsProvider>
    </StoreProvider>,
  )
  return { store, view }
}

describe('the toolbar control', () => {
  it("fills the shell's profile slot rather than rendering in place", async () => {
    renderControl()

    const outlet = document.querySelector('[data-toolbar-outlet="profile"]')
    await waitFor(() => {
      expect(outlet?.querySelector('[data-testid="profile-control"]')).toBeTruthy()
    })
  })

  it('is labelled Profile, so the shell control keeps its accessible name', async () => {
    renderControl()

    expect(await screen.findByRole('button', { name: 'Profile' })).toBeTruthy()
  })

  it('draws the neutral glyph while signed out', async () => {
    renderControl()

    await screen.findByTestId('profile-control')
    expect(screen.getByTestId('avatar-signed-out')).toBeTruthy()
  })

  it('draws the initials avatar once a session exists', async () => {
    renderControl({
      ...stubbedThunkExtra,
      authService: makeStubbedAuthService({ initialUser: authUserMocks.typical }),
    })

    // No explicit dispatch: the control fires the launch restore itself, which
    // is the behaviour a reload depends on.
    await waitFor(() => {
      expect(screen.getByTestId('avatar-initials').textContent).toBe('AL')
    })
  })

  it('fires the launch restore itself, so a reload resolves the session', async () => {
    const { store } = renderControl({
      ...stubbedThunkExtra,
      authService: makeStubbedAuthService({}),
    })

    await waitFor(() => {
      expect(store.getState().auth.session.kind).not.toBe('unknown')
    })
  })
})

describe('the auth surface', () => {
  it('is absent until an entry point asks for it', async () => {
    renderControl()

    await screen.findByTestId('profile-control')
    expect(screen.queryByTestId('auth-modal')).toBeNull()
  })

  it('presents on the hub sign-in intent, from anywhere in the app', async () => {
    const { store } = renderControl()

    store.dispatch(userDidTapSignIn({ origin: 'settingsHub' }))

    expect(await screen.findByTestId('auth-surface')).toBeTruthy()
  })

  it('dismisses on Cancel', async () => {
    const { store } = renderControl()

    store.dispatch(userDidTapSignIn({ origin: 'profilePopover' }))
    await screen.findByTestId('auth-surface')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => {
      expect(store.getState().settings.authPresentation.kind).toBe('hidden')
    })
  })

  it('closes itself once a session exists rather than sitting over the app', async () => {
    const { store } = renderControl({
      ...stubbedThunkExtra,
      authService: makeStubbedAuthService({ initialUser: authUserMocks.typical }),
    })

    store.dispatch(userDidTapSignIn({ origin: 'profilePopover' }))
    await screen.findByTestId('auth-surface')

    await store.dispatch(restoreSessionThunk({ now: new Date() }))

    await waitFor(() => {
      expect(store.getState().settings.authPresentation.kind).toBe('hidden')
    })
  })
})

/**
 * The dialog is hosted here — not inside a destination — because a sign-in can
 * complete through an OAuth redirect that lands on any route. These drive a
 * real sign-in against a store seeded with anonymous rows, which is the only
 * way the dialog becomes reachable.
 */
describe('the existing-local-data dialog', () => {
  const NOW = new Date('2026-08-31T09:00:00.000Z')

  const anonymousRow = (id: string) => ({
    id,
    title: 'Local only',
    kind: 'task',
    status: 'planned',
    isDraft: false,
    tagsCsv: '',
    shadowsJson: null,
    repeatConfigJson: null,
    start: null,
    due: null,
    duration: null,
    minimumDuration: null,
    maximumDuration: null,
    projectId: null,
    ownerUserId: null,
    ownerGroupId: null,
    completed: null,
    createdAt: NOW,
    updatedAt: null,
    value: null,
    effort: null,
    expiry: null,
    associatedColor: null,
    sessionPoints: null,
    updatedAtEpochMillis: epochMillisFromDate(NOW),
    lastSyncedAtEpochMillis: null,
    deletedAtEpochMillis: null,
  })

  const signedInWithLocalData = async () => {
    const localStore = makeInMemoryLocalStore({
      endeavors: [anonymousRow('a'), anonymousRow('b')],
    })
    const context = renderControl({
      ...stubbedThunkExtra,
      localStore,
      authService: makeStubbedAuthService({}),
    })
    await context.store.dispatch(
      signInWithEmailThunk({
        email: 'ada@example.com',
        password: 'secret',
        now: NOW,
      }),
    )
    return { ...context, localStore }
  }

  it('is absent when nothing is pending', async () => {
    renderControl()

    await screen.findByTestId('profile-control')
    expect(screen.queryByTestId('local-data-dialog')).toBeNull()
  })

  it('appears after a sign-in that found local rows, with the count in it', async () => {
    await signedInWithLocalData()

    expect(await screen.findByTestId('local-data-dialog')).toBeTruthy()
    expect(screen.getByText(/You have 2 local endeavors/)).toBeTruthy()
  })

  it('adopts the rows when the user signs them to the account', async () => {
    const { store, localStore } = await signedInWithLocalData()

    await screen.findByTestId('local-data-dialog')
    await userEvent.click(screen.getByTestId('local-data-sign-all'))

    await waitFor(() => {
      expect(store.getState().auth.localData.kind).toBe('hidden')
    })
    expect(await localStore.endeavors.countAnonymous()).toBe(0)
  })

  it('clears the rows when the user starts over', async () => {
    const { store, localStore } = await signedInWithLocalData()

    await screen.findByTestId('local-data-dialog')
    await userEvent.click(screen.getByTestId('local-data-clear-all'))

    await waitFor(() => {
      expect(store.getState().auth.localData.kind).toBe('hidden')
    })
    expect(await localStore.endeavors.countAnonymous()).toBe(0)
    expect((await localStore.endeavors.all()).length).toBe(0)
  })

  it('leaves the rows unowned and untouched on Cancel', async () => {
    const { store, localStore } = await signedInWithLocalData()

    await screen.findByTestId('local-data-dialog')
    await userEvent.click(screen.getByTestId('local-data-cancel'))

    await waitFor(() => {
      expect(store.getState().auth.localData.kind).toBe('hidden')
    })
    expect(await localStore.endeavors.countAnonymous()).toBe(2)
  })
})
