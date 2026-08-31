import type { ReactNode } from 'react'
import { AuthFlow, AuthMode } from '../AuthState'
import { AuthSurfaceFragment } from './AuthSurfaceFragment'

/**
 * The auth surface, in both modes and in every state it can report.
 *
 * The surface pins its own dark scheme (canon's
 * `.preferredColorScheme(.dark)`), so the light/dark pair below is deliberately
 * a pair of *stages*: what changes between them is the page behind the panel,
 * not the panel. That is the fact worth seeing — the surface reads the same on
 * a light desktop and a dark one.
 */
export default {
  title: 'Auth/Surface',
  component: AuthSurfaceFragment,
  parameters: { layout: 'centered' },
}

const noop = () => {}

function Stage({
  theme = 'light',
  children,
}: {
  theme?: 'light' | 'dark'
  children: ReactNode
}) {
  return (
    <div
      data-theme={theme}
      style={{
        width: 420,
        padding: 16,
        background: 'var(--kro-color-back)',
      }}
    >
      {children}
    </div>
  )
}

const surface = (
  overrides: Partial<Parameters<typeof AuthSurfaceFragment>[0]> = {},
) => (
  <AuthSurfaceFragment
    mode={AuthMode.signIn}
    email=""
    password=""
    name=""
    errorCopy={null}
    authenticatingFlow={null}
    isSubmitEnabled={false}
    isUnavailable={false}
    onChangeEmail={noop}
    onChangePassword={noop}
    onChangeName={noop}
    onSubmit={noop}
    onToggleMode={noop}
    onTapApple={noop}
    onTapGoogle={noop}
    onTapCancel={noop}
    {...overrides}
  />
)

/** Sign in, empty — the disabled submit names what blocks it. */
export const SignInEmpty = {
  render: () => <Stage>{surface()}</Stage>,
}

/** Sign in, ready to submit. */
export const SignInReady = {
  render: () => (
    <Stage>
      {surface({
        email: 'ada@example.com',
        password: 'correct-horse',
        isSubmitEnabled: true,
      })}
    </Stage>
  ),
}

/** Create an account — the name field appears and the copy changes. */
export const SignUp = {
  render: () => (
    <Stage>
      {surface({
        mode: AuthMode.signUp,
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        password: 'correct-horse',
        isSubmitEnabled: true,
      })}
    </Stage>
  ),
}

/** A rejected credential — derived copy, never the provider's message. */
export const CredentialRejected = {
  render: () => (
    <Stage>
      {surface({
        email: 'ada@example.com',
        password: 'wrong',
        isSubmitEnabled: true,
        errorCopy: 'Incorrect email or password.',
      })}
    </Stage>
  ),
}

/** A provider flow in flight — the running button spins, the other locks. */
export const GoogleInFlight = {
  render: () => (
    <Stage>{surface({ authenticatingFlow: AuthFlow.google })}</Stage>
  ),
}

/**
 * The honest unavailable state: no Supabase project is configured, every route
 * in is inert, and the copy says local use still works.
 */
export const CloudUnavailable = {
  render: () => <Stage>{surface({ isUnavailable: true })}</Stage>,
}

/** The same panel on a light page and a dark one. */
export const BothSchemes = {
  render: () => (
    <div style={{ display: 'flex', gap: 16 }}>
      <Stage theme="light">{surface()}</Stage>
      <Stage theme="dark">{surface()}</Stage>
    </div>
  ),
}
