import { act, cleanup, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { StoreProvider } from '../../../library/StoreProvider'
import { makeRecordedStore } from './recordedStore'
import { useEarlyAccess } from '../useEarlyAccess'

const mountHook = () => {
  const { store, services } = makeRecordedStore()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <StoreProvider store={store}>{children}</StoreProvider>
  )
  return { ...renderHook(() => useEarlyAccess(), { wrapper }), store, services }
}

afterEach(cleanup)

describe('useEarlyAccess', () => {
  it('starts as the empty form with nothing to submit', () => {
    const { result } = mountHook()
    expect(result.current.email).toBe('')
    expect(result.current.platform).toBe('ios')
    expect(result.current.submit).toEqual({ kind: 'idle' })
    expect(result.current.canSubmit).toBe(false)
    expect(result.current.emailError).toBeNull()
  })

  it('typing and picking reach the slice and make a likely address submittable', () => {
    const { result, store } = mountHook()
    act(() => result.current.onEmailChange('ada@example.com'))
    act(() => result.current.onPlatformChange('macos'))
    expect(store.getState().earlyAccess.email).toBe('ada@example.com')
    expect(result.current.platform).toBe('macos')
    expect(result.current.canSubmit).toBe(true)
  })

  it('leaving a bad address shows its error', () => {
    const { result } = mountHook()
    act(() => result.current.onEmailChange('ada@'))
    act(() => result.current.onEmailBlur())
    expect(result.current.emailError).toMatch(/does not look right/i)
  })

  it('submitting a good address joins and exposes the receipt', async () => {
    const { result, services } = mountHook()
    act(() => result.current.onEmailChange('ada@example.com'))
    await act(async () => result.current.onSubmit())
    expect(services.earlyAccess.calls).toHaveLength(1)
    expect(result.current.submit.kind).toBe('joined')
    expect(result.current.receipt?.email).toBe('ada@example.com')
  })

  it('a failed sign-up exposes the copy and retryability; dismiss returns to the form', async () => {
    const { result } = mountHook()
    act(() => result.current.onEmailChange('offline@kro.invalid'))
    await act(async () => result.current.onSubmit())
    expect(result.current.failureKind).toBe('offline')
    expect(result.current.failureCopy).toMatch(/offline/i)
    expect(result.current.failureIsRetryable).toBe(true)
    act(() => result.current.onDismissFailure())
    expect(result.current.submit.kind).toBe('idle')
  })

  it('start over empties a joined form; the honeypot is writable', async () => {
    const { result } = mountHook()
    act(() => result.current.onHoneypotChange('bot'))
    expect(result.current.website).toBe('bot')
    act(() => result.current.onHoneypotChange(''))
    act(() => result.current.onEmailChange('ada@example.com'))
    await act(async () => result.current.onSubmit())
    act(() => result.current.onStartOver())
    expect(result.current.email).toBe('')
    expect(result.current.submit.kind).toBe('idle')
  })
})
