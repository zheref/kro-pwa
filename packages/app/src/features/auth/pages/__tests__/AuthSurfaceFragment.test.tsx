/**
 * The auth surface's render tests, mirroring `AuthSurfaceFragment.stories.tsx`
 * (`RC-11`).
 */
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthFlow, AuthMode } from '../../AuthState'
import { AuthSurfaceFragment } from '../AuthSurfaceFragment'

afterEach(cleanup)

const renderSurface = (
  overrides: Partial<Parameters<typeof AuthSurfaceFragment>[0]> = {},
) =>
  render(
    <AuthSurfaceFragment
      mode={AuthMode.signIn}
      email=""
      password=""
      name=""
      errorCopy={null}
      authenticatingFlow={null}
      isSubmitEnabled={false}
      isUnavailable={false}
      onChangeEmail={() => {}}
      onChangePassword={() => {}}
      onChangeName={() => {}}
      onSubmit={() => {}}
      onToggleMode={() => {}}
      onTapApple={() => {}}
      onTapGoogle={() => {}}
      onTapCancel={() => {}}
      {...overrides}
    />,
  )

describe('the sign-in ⇄ create toggle', () => {
  it('shows canon sign-in copy and no name field', () => {
    renderSurface()

    expect(screen.getByText('Welcome back')).toBeTruthy()
    expect(screen.getByTestId('auth-submit').textContent).toBe('Sign In')
    expect(screen.queryByLabelText('Full name')).toBeNull()
  })

  it('adds the name field and changes the copy in create mode', () => {
    renderSurface({ mode: AuthMode.signUp })

    expect(screen.getByText('Create your account')).toBeTruthy()
    expect(screen.getByLabelText('Full name')).toBeTruthy()
    expect(screen.getByTestId('auth-submit').textContent).toBe('Create Account')
  })

  it('reports the toggle rather than switching modes itself', async () => {
    const onToggleMode = vi.fn()
    renderSurface({ onToggleMode })

    await userEvent.click(screen.getByTestId('auth-toggle-mode'))

    expect(onToggleMode).toHaveBeenCalledTimes(1)
  })
})

describe('the email and password form', () => {
  it('reports each keystroke to its owner rather than holding it', async () => {
    const onChangeEmail = vi.fn()
    renderSurface({ onChangeEmail })

    await userEvent.type(screen.getByLabelText('Email address'), 'a')

    expect(onChangeEmail).toHaveBeenCalledWith('a')
  })

  it('masks the password field', () => {
    renderSurface()

    expect((screen.getByLabelText('Password') as HTMLInputElement).type).toBe(
      'password',
    )
  })

  it('disables submit on an empty form and names what blocks it', () => {
    renderSurface()

    expect(
      (screen.getByTestId('auth-submit') as HTMLButtonElement).disabled,
    ).toBe(true)
    expect(screen.getByTestId('auth-submit-hint').textContent).toContain(
      'Enter your email and password',
    )
  })

  it('names canon six-character minimum when the blocked form is a sign-up', () => {
    renderSurface({ mode: AuthMode.signUp })

    expect(screen.getByTestId('auth-submit-hint').textContent).toContain(
      'at least 6 characters',
    )
  })

  it('submits once the form is ready', async () => {
    const onSubmit = vi.fn()
    renderSurface({
      email: 'ada@example.com',
      password: 'correct-horse',
      isSubmitEnabled: true,
      onSubmit,
    })

    await userEvent.click(screen.getByTestId('auth-submit'))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('auth-submit-hint')).toBeNull()
  })

  it('shows the error banner as an alert, derived copy only', () => {
    renderSurface({ errorCopy: 'Incorrect email or password.' })

    expect(screen.getByRole('alert').textContent).toBe(
      'Incorrect email or password.',
    )
  })
})

describe('the provider buttons carry each provider own branding', () => {
  it('offers Sign in with Apple with the Apple mark', () => {
    renderSurface()

    const button = screen.getByTestId('auth-apple')
    expect(button.textContent).toContain('Sign in with Apple')
    expect(screen.getByTestId('apple-mark')).toBeTruthy()
  })

  it('offers Sign in with Google with the four-colour G', () => {
    renderSurface()

    const button = screen.getByTestId('auth-google')
    expect(button.textContent).toContain('Sign in with Google')
    expect(screen.getByTestId('google-mark')).toBeTruthy()
  })

  it('reports each provider tap to its own handler', async () => {
    const onTapApple = vi.fn()
    const onTapGoogle = vi.fn()
    renderSurface({ onTapApple, onTapGoogle })

    await userEvent.click(screen.getByTestId('auth-apple'))
    await userEvent.click(screen.getByTestId('auth-google'))

    expect(onTapApple).toHaveBeenCalledTimes(1)
    expect(onTapGoogle).toHaveBeenCalledTimes(1)
  })

  it('spins the provider that is running and locks the other', () => {
    renderSurface({ authenticatingFlow: AuthFlow.google })

    expect(screen.getByTestId('auth-google').textContent).toContain(
      'Signing in…',
    )
    expect(
      (screen.getByTestId('auth-apple') as HTMLButtonElement).disabled,
    ).toBe(true)
  })
})

describe('the honest unavailable state', () => {
  it('says the build has no cloud and that local use still works', () => {
    renderSurface({ isUnavailable: true })

    expect(screen.getByTestId('auth-unavailable').textContent).toContain(
      'Kro Cloud is not set up for this build',
    )
    expect(screen.getByTestId('auth-unavailable').textContent).toContain(
      'keep using Kro on this device',
    )
  })

  it('disables every route in rather than letting one fail opaquely', () => {
    renderSurface({ isUnavailable: true, isSubmitEnabled: true })

    expect(
      (screen.getByTestId('auth-submit') as HTMLButtonElement).disabled,
    ).toBe(true)
    expect(
      (screen.getByTestId('auth-apple') as HTMLButtonElement).disabled,
    ).toBe(true)
    expect(
      (screen.getByTestId('auth-google') as HTMLButtonElement).disabled,
    ).toBe(true)
    expect(
      (screen.getByLabelText('Email address') as HTMLInputElement).disabled,
    ).toBe(true)
  })

  it('does not also shout the same thing in red — the calm banner is enough', () => {
    renderSurface({
      isUnavailable: true,
      errorCopy: 'Kro Cloud is not set up for this build.',
    })

    expect(screen.getByTestId('auth-unavailable')).toBeTruthy()
    expect(screen.queryByTestId('auth-error')).toBeNull()
  })

  it('still offers Cancel, so the surface is never a trap', async () => {
    const onTapCancel = vi.fn()
    renderSurface({ isUnavailable: true, onTapCancel })

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onTapCancel).toHaveBeenCalledTimes(1)
  })
})
