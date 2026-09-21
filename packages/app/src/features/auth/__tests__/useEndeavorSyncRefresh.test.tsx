import { act, cleanup, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StoreProvider } from '../../../library/StoreProvider'
import {
  type AppStore,
  type ThunkExtra,
  makeStore,
  stubbedThunkExtra,
} from '../../../library/store'
import {
  type EndeavorSyncReport,
  makeStubbedEndeavorSyncService,
} from '../../../services/sync/EndeavorSyncService'
import { synchronizeEndeavorsThunk } from '../AuthProducer'
import { useEndeavorSyncRefresh } from '../useEndeavorSyncRefresh'

afterEach(cleanup)

const NOW = new Date('2026-08-31T10:00:00.000Z')

function wrapperFor(store: AppStore) {
  return ({ children }: { children: ReactNode }) => (
    <StoreProvider store={store}>{children}</StoreProvider>
  )
}

const report = (
  overrides: Partial<EndeavorSyncReport> = {},
): EndeavorSyncReport => ({
  status: 'synchronized',
  pushed: [],
  deleted: [],
  deferred: [],
  pulled: [],
  localWins: [],
  skipped: [],
  ...overrides,
})

const storeWith = (sweep: EndeavorSyncReport) =>
  makeStore({
    ...stubbedThunkExtra,
    endeavorSync: makeStubbedEndeavorSyncService({ report: sweep }),
  } satisfies ThunkExtra)

describe('useEndeavorSyncRefresh', () => {
  it('does not reload on mount — the surface already read the store itself', () => {
    const reload = vi.fn()
    renderHook(() => useEndeavorSyncRefresh(reload), {
      wrapper: wrapperFor(makeStore(stubbedThunkExtra)),
    })
    expect(reload).not.toHaveBeenCalled()
  })

  it('reloads once, with the landing instant, when a sweep pulls rows in (first sign-in on this device)', async () => {
    const reload = vi.fn()
    const store = storeWith(report({ pulled: ['a', 'b'] }))
    renderHook(() => useEndeavorSyncRefresh(reload), {
      wrapper: wrapperFor(store),
    })

    await act(async () => {
      await store.dispatch(synchronizeEndeavorsThunk({ now: NOW }))
    })

    expect(reload).toHaveBeenCalledTimes(1)
    expect(reload).toHaveBeenCalledWith(NOW)
  })

  it('stays quiet when the sweep only pushed local edits up — nothing on this device changed', async () => {
    const reload = vi.fn()
    const store = storeWith(report({ pushed: ['a'] }))
    renderHook(() => useEndeavorSyncRefresh(reload), {
      wrapper: wrapperFor(store),
    })

    await act(async () => {
      await store.dispatch(synchronizeEndeavorsThunk({ now: NOW }))
    })

    expect(reload).not.toHaveBeenCalled()
  })

  it('reloads when a sweep deleted rows another device removed', async () => {
    const reload = vi.fn()
    const store = storeWith(report({ deleted: ['gone'] }))
    renderHook(() => useEndeavorSyncRefresh(reload), {
      wrapper: wrapperFor(store),
    })

    await act(async () => {
      await store.dispatch(synchronizeEndeavorsThunk({ now: NOW }))
    })

    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('reloads zero times when mounted after a sweep already landed — the mount read already saw the rows', async () => {
    const reload = vi.fn()
    const store = storeWith(report({ pulled: ['a'] }))
    await store.dispatch(synchronizeEndeavorsThunk({ now: NOW }))

    renderHook(() => useEndeavorSyncRefresh(reload), {
      wrapper: wrapperFor(store),
    })

    expect(reload).not.toHaveBeenCalled()
  })

  it('does not re-fire when the reload callback changes identity (a view-mode switch re-renders the page)', async () => {
    const store = storeWith(report({ pulled: ['a'] }))
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = renderHook(
      ({ cb }: { cb: (at: Date) => void }) => useEndeavorSyncRefresh(cb),
      { wrapper: wrapperFor(store), initialProps: { cb: first } },
    )
    await act(async () => {
      await store.dispatch(synchronizeEndeavorsThunk({ now: NOW }))
    })
    expect(first).toHaveBeenCalledTimes(1)

    rerender({ cb: second })

    expect(second).not.toHaveBeenCalled()
  })
})
