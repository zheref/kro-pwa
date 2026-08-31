'use client'

/**
 * The minimal store binding for a React tree.
 *
 * It takes an **instance**, it never builds one: the host decides when to call
 * `makeStore(...)` and with which `ThunkExtra` (`RC-22`). `apps/web`'s root
 * layout builds the live store once per browser session and hands it here; a
 * test hands in `makeStore(stubbedThunkExtra)`; a story hands in a preview store.
 *
 * The `'use client'` directive is what lets a Next.js Server Component render
 * this without the package importing anything from `next/*` (`RC-50`'s
 * framework-blind boundary, held even though this package is app-tier).
 */
import type { ReactNode } from 'react'
import { Provider } from 'react-redux'
import type { AppStore } from './store'

export interface StoreProviderProps {
  readonly store: AppStore
  readonly children: ReactNode
}

export function StoreProvider({ store, children }: StoreProviderProps) {
  return <Provider store={store}>{children}</Provider>
}
