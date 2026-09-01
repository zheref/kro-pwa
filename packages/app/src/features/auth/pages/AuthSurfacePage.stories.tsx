import { StoreProvider } from '../../../library/StoreProvider'
import {
  type ThunkExtra,
  makeStore,
  stubbedThunkExtra,
} from '../../../library/store'
import { makeStubbedAuthService } from '../../../services/auth/AuthService'
import { AuthExceptions } from '../AuthException'
import {
  userDidChangeEmail,
  userDidChangePassword,
  userDidTapToggleMode,
} from '../AuthFeature'
import { restoreSessionThunk } from '../AuthProducer'
import { AuthSurfacePage } from './AuthSurfacePage'

/**
 * The auth surface wired to a real store (`RC-22`) over fixture-backed Services
 * (`RC-35`).
 *
 * Where the Fragment stories set every value as a prop, these drive the slice —
 * so what they show is the surface a user gets, including the fact that the
 * form survives a mode toggle.
 */
export default {
  title: 'Auth/Surface (wired)',
  component: AuthSurfacePage,
  parameters: { layout: 'centered' },
}

function Stage({
  theme = 'light',
  extra = stubbedThunkExtra,
  prime,
}: {
  theme?: 'light' | 'dark'
  extra?: ThunkExtra
  prime?: (store: ReturnType<typeof makeStore>) => void
}) {
  const store = makeStore(extra)
  prime?.(store)

  return (
    <div
      data-theme={theme}
      style={{ width: 420, padding: 16, background: 'var(--kro-color-back)' }}
    >
      <StoreProvider store={store}>
        <AuthSurfacePage
          redirectTo="https://kro.example"
          onDismiss={() => {}}
        />
      </StoreProvider>
    </div>
  )
}

/** Sign in, empty. */
export const SignIn = {
  render: () => <Stage />,
}

/** Sign up, after the toggle — the form carried over. */
export const SignUp = {
  render: () => (
    <Stage
      prime={(store) => {
        store.dispatch(userDidChangeEmail('ada@example.com'))
        store.dispatch(userDidTapToggleMode())
      }}
    />
  ),
}

/** Ready to submit. */
export const Ready = {
  render: () => (
    <Stage
      prime={(store) => {
        store.dispatch(userDidChangeEmail('ada@example.com'))
        store.dispatch(userDidChangePassword('correct-horse'))
      }}
    />
  ),
}

/** No Supabase project configured — the honest unavailable state, end to end. */
export const CloudUnavailable = {
  render: () => (
    <Stage
      extra={{
        ...stubbedThunkExtra,
        authService: makeStubbedAuthService({
          failures: {
            restoreSession: AuthExceptions.unavailable([
              'NEXT_PUBLIC_SUPABASE_URL',
              'NEXT_PUBLIC_SUPABASE_ANON_KEY',
            ]),
          },
        }),
      }}
      prime={(store) => {
        // The launch restore is what discovers it; the surface only renders it.
        void store.dispatch(restoreSessionThunk({ now: new Date() }))
      }}
    />
  ),
}

/** Both schemes. */
export const BothSchemes = {
  render: () => (
    <div style={{ display: 'flex', gap: 16 }}>
      <Stage theme="light" />
      <Stage theme="dark" />
    </div>
  ),
}
