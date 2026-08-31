/**
 * The auth surface's container, against a real store built with
 * `makeStore(stubbedThunkExtra)` (`RC-22`, `RC-35`).
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StoreProvider } from '../../../../library/StoreProvider'
import {
  type ThunkExtra,
  makeStore,
  stubbedThunkExtra,
} from '../../../../library/store'
import { makeStubbedAuthService } from '../../../../services/auth/AuthService'
import { authUserMocks } from '../../AuthMocks'
import { AuthExceptions } from '../../AuthException'
import { AuthSurfacePage, currentOrigin } from '../AuthSurfacePage'

afterEach(cleanup)

const renderPage = (
  extra: ThunkExtra = stubbedThunkExtra,
  onDismiss: () => void = () => {},
) => {
  const store = makeStore(extra)
  const view = render(
    <StoreProvider store={store}>
      <AuthSurfacePage redirectTo="https://kro.test" onDismiss={onDismiss} />
    </StoreProvider>,
  )
  return { store, view }
}

describe('the form is the slice, not local state', () => {
  it('records each field in the store rather than in the component', async () => {
    const { store } = renderPage()

    await userEvent.type(screen.getByLabelText('Email address'), 'ada@example.com')

    expect(store.getState().auth.form.email).toBe('ada@example.com')
  })

  it('keeps the typed email when the mode toggles — canon form survives it', async () => {
    const { store } = renderPage()

    await userEvent.type(screen.getByLabelText('Email address'), 'ada@example.com')
    await userEvent.click(screen.getByTestId('auth-toggle-mode'))

    expect(store.getState().auth.mode).toBe('signUp')
    expect(store.getState().auth.form.email).toBe('ada@example.com')
  })

  it('enables submit only once the current mode requirements are met', async () => {
    renderPage()

    expect((screen.getByTestId('auth-submit') as HTMLButtonElement).disabled).toBe(
      true,
    )

    await userEvent.type(screen.getByLabelText('Email address'), 'ada@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'secret')

    await waitFor(() => {
      expect(
        (screen.getByTestId('auth-submit') as HTMLButtonElement).disabled,
      ).toBe(false)
    })
  })
})

describe('email and password', () => {
  it('signs in through the injected service and lands a session', async () => {
    const { store } = renderPage({
      ...stubbedThunkExtra,
      authService: makeStubbedAuthService({}),
    })

    await userEvent.type(screen.getByLabelText('Email address'), 'ada@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'correct-horse')
    await userEvent.click(screen.getByTestId('auth-submit'))

    await waitFor(() => {
      expect(store.getState().auth.session.kind).toBe('signedIn')
    })
  })

  it('creates an account in sign-up mode rather than signing in', async () => {
    const invoked: string[] = []
    const authService = makeStubbedAuthService({})
    const spy = {
      ...authService,
      signUpWithEmail: async (...args: Parameters<typeof authService.signUpWithEmail>) => {
        invoked.push('signUp')
        return authService.signUpWithEmail(...args)
      },
    }
    renderPage({ ...stubbedThunkExtra, authService: spy })

    await userEvent.click(screen.getByTestId('auth-toggle-mode'))
    await userEvent.type(screen.getByLabelText('Full name'), 'Ada Lovelace')
    await userEvent.type(screen.getByLabelText('Email address'), 'ada@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'correct-horse')
    await userEvent.click(screen.getByTestId('auth-submit'))

    await waitFor(() => {
      expect(invoked).toEqual(['signUp'])
    })
  })

  it('shows derived copy for a rejected credential, never the raw message', async () => {
    const { store } = renderPage({
      ...stubbedThunkExtra,
      authService: makeStubbedAuthService({
        failures: { signInWithEmail: AuthExceptions.invalidCredentials() },
      }),
    })

    await userEvent.type(screen.getByLabelText('Email address'), 'ada@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'wrong')
    await userEvent.click(screen.getByTestId('auth-submit'))

    await waitFor(() => {
      expect(store.getState().auth.session.kind).toBe('failed')
    })
    expect(screen.getByRole('alert').textContent).toBe(
      'Incorrect email or password.',
    )
  })
})

describe('the provider buttons', () => {
  it('starts the Google redirect through the injected service', async () => {
    const urls: string[] = []
    const authService = makeStubbedAuthService({})
    renderPage({
      ...stubbedThunkExtra,
      authService: {
        ...authService,
        startOAuthRedirect: async (input) => {
          urls.push(`${input.provider}:${input.redirectTo}`)
          return authService.startOAuthRedirect(input)
        },
      },
    })

    await userEvent.click(screen.getByTestId('auth-google'))

    await waitFor(() => {
      expect(urls).toEqual(['google:https://kro.test'])
    })
  })

  it('takes Apple through the same redirect — the web has no native control', async () => {
    const providers: string[] = []
    const authService = makeStubbedAuthService({})
    renderPage({
      ...stubbedThunkExtra,
      authService: {
        ...authService,
        startOAuthRedirect: async (input) => {
          providers.push(input.provider)
          return authService.startOAuthRedirect(input)
        },
      },
    })

    await userEvent.click(screen.getByTestId('auth-apple'))

    await waitFor(() => {
      expect(providers).toEqual(['apple'])
    })
  })

  it('mints no Apple nonce, so no stale nonce can wait in state to be replayed', async () => {
    const { store } = renderPage({
      ...stubbedThunkExtra,
      authService: makeStubbedAuthService({}),
    })

    await userEvent.click(screen.getByTestId('auth-apple'))

    await waitFor(() => {
      expect(store.getState().auth.session.kind).not.toBe('unknown')
    })
    expect(store.getState().auth.appleRawNonce).toBeNull()
  })
})

describe('the unavailable deployment', () => {
  it('renders the honest state when no Supabase project is configured', async () => {
    const { store } = renderPage({
      ...stubbedThunkExtra,
      authService: makeStubbedAuthService({
        failures: {
          restoreSession: AuthExceptions.unavailable([
            'NEXT_PUBLIC_SUPABASE_URL',
          ]),
        },
      }),
    })

    // The launch restore is what discovers it; the surface only renders it.
    const { restoreSessionThunk } = await import('../../AuthProducer')
    await store.dispatch(restoreSessionThunk({ now: new Date() }))

    await waitFor(() => {
      expect(screen.getByTestId('auth-unavailable')).toBeTruthy()
    })
    expect((screen.getByTestId('auth-google') as HTMLButtonElement).disabled).toBe(
      true,
    )
  })

  it('is not shown for an ordinary credential failure', async () => {
    renderPage({
      ...stubbedThunkExtra,
      authService: makeStubbedAuthService({
        failures: { signInWithEmail: AuthExceptions.invalidCredentials() },
      }),
    })

    await userEvent.type(screen.getByLabelText('Email address'), 'ada@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'wrong')
    await userEvent.click(screen.getByTestId('auth-submit'))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy()
    })
    expect(screen.queryByTestId('auth-unavailable')).toBeNull()
  })
})

describe('dismissal and the redirect target', () => {
  it('reports Cancel to its presenter rather than closing itself', async () => {
    const onDismiss = vi.fn()
    renderPage(stubbedThunkExtra, onDismiss)

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('falls back to this document origin when no target is supplied', () => {
    expect(currentOrigin()).toBe(globalThis.location.origin)
  })

  it('renders for a signed-in user too — the presenter decides when to show it', () => {
    const { store } = renderPage({
      ...stubbedThunkExtra,
      authService: makeStubbedAuthService({ initialUser: authUserMocks.typical }),
    })

    expect(store.getState().auth.session.kind).toBe('unknown')
    expect(screen.getByTestId('auth-surface')).toBeTruthy()
  })
})
