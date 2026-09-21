/**
 * `useEndeavorSyncRefresh` — re-read the local store after a cloud sweep lands.
 *
 * Every destination reads endeavors from the local store on mount. A sweep that
 * pulls the account's rows in (a fresh sign-in, a launch restore, a second
 * device's edits) writes to that store *after* the mount read, so without this
 * the cards appear only on the next navigation. Canon's `loadCoreData` refresh
 * after the pull is this hook: one effect, keyed on the sweep's landing instant
 * (`selectEndeavorSyncLandedAt`), calling the surface's own reload.
 *
 * It fires only when the landing instant *moves while the surface is mounted*.
 * A surface mounted after a sweep already landed has read the store itself and
 * reloads zero times; a new `reload` identity (a re-render, a view-mode change)
 * never re-fires it, because the callback is read through a ref.
 *
 * Headless (`UZF-4`): no `useState`, no markup. It composes across features
 * through a root-level Selector (`RC-20`), never by reaching into the auth
 * slice's shape, and it dispatches nothing itself — the surface hands it the
 * reload it already owns, so the Page stays the one place that dispatches.
 */
import { useEffect, useRef } from 'react'
import { useAppSelector } from '../../library/hooks'
import { selectEndeavorSyncLandedAt } from './AuthSelectors'

export const useEndeavorSyncRefresh = (reload: (landedAt: Date) => void) => {
  const landedAt = useAppSelector(selectEndeavorSyncLandedAt)
  const reloadRef = useRef(reload)
  reloadRef.current = reload
  const seenAt = useRef<number | null>(landedAt?.getTime() ?? null)
  useEffect(() => {
    const stamp = landedAt?.getTime() ?? null
    if (stamp === null || stamp === seenAt.current) return
    seenAt.current = stamp
    reloadRef.current(landedAt as Date)
  }, [landedAt])
}
