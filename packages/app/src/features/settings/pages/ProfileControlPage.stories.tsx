import { StoreProvider } from '../../../library/StoreProvider'
import { type ThunkExtra, makeStore, stubbedThunkExtra } from '../../../library/store'
import { makeStubbedAuthService } from '../../../services/auth/AuthService'
import { authUserMocks } from '../../auth/AuthMocks'
import { ToolbarOutlet, ToolbarSlotsProvider } from '../../main/ToolbarSlots'
import { userDidTapSignIn } from '../SettingsFeature'
import { ProfileControlPage } from './ProfileControlPage'

/**
 * The shell-wide profile control, in the slot it fills.
 *
 * The stage renders the shell's own `profile` outlet so the control appears
 * where the app puts it rather than floating on its own — which is also the
 * proof that the slot mechanism works end to end.
 */
export default {
  title: 'Settings/Profile control',
  component: ProfileControlPage,
  parameters: { layout: 'centered' },
}

function Stage({
  theme = 'light',
  extra = stubbedThunkExtra,
  presentsAuth = false,
}: {
  theme?: 'light' | 'dark'
  extra?: ThunkExtra
  presentsAuth?: boolean
}) {
  const store = makeStore(extra)
  if (presentsAuth) {
    store.dispatch(userDidTapSignIn({ origin: 'profilePopover' }))
  }

  return (
    <div
      data-theme={theme}
      style={{
        width: 420,
        minHeight: 220,
        padding: 16,
        background: 'var(--kro-color-back)',
        border: '1px solid var(--kro-color-hairline)',
      }}
    >
      <StoreProvider store={store}>
        <ToolbarSlotsProvider>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: 8,
              background: 'var(--kro-color-absolute)',
              borderRadius: 'var(--kro-radius-small)',
            }}
          >
            <span style={{ color: 'var(--kro-color-fore-secondary)' }}>
              Toolbar →
            </span>
            <ToolbarOutlet placement="profile" />
          </div>
          <ProfileControlPage />
        </ToolbarSlotsProvider>
      </StoreProvider>
    </div>
  )
}

/** Signed out: the neutral glyph in the shell's slot. */
export const SignedOut = {
  render: () => <Stage />,
}

/** Signed in: the initials avatar replaces the glyph. */
export const SignedIn = {
  render: () => (
    <Stage
      extra={{
        ...stubbedThunkExtra,
        authService: makeStubbedAuthService({ initialUser: authUserMocks.typical }),
      }}
    />
  ),
}

/** The auth surface, presented from the popover's sign-in entry. */
export const AuthPresented = {
  render: () => <Stage presentsAuth />,
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
