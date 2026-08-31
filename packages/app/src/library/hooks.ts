/**
 * The only Redux ↔ React binding surface in the app (`RC-10`).
 *
 * Every Page, Fragment, Adapter and headless hook imports these two. A raw
 * `useSelector` / `useDispatch` from `react-redux` anywhere outside this file is
 * a finding — `scripts/check-uzf-boundaries.mjs` fails the lint task on it.
 *
 * `react-redux@9`'s `.withTypes<…>()` replaces the older `TypedUseSelectorHook`
 * annotation; it types the dispatch overloads for thunks as well, which the
 * annotation form could not.
 */
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from './store'

export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
