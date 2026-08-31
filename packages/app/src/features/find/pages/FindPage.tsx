'use client'

/**
 * Find's stateful container (`RC-37`) — canon's `FindScreen`.
 *
 * The only artifact on this surface that calls both `useAppSelector` and
 * `useAppDispatch`. It selects through named Selectors, dispatches intents, and
 * renders exactly one Fragment.
 *
 * ## Mount is three dispatches, in this order
 *
 * 1. **the capability flags** — resolved through a Producer, because a Service
 *    reaches a Producer and nothing else (`RC-6`), then handed to
 *    `onViewLoaded` so `selectFindCapabilities` can gate the vista's bindings
 *    without a Selector ever seeing a flag;
 * 2. **the persisted lens** — restored before the first paint is judged, which
 *    is what `isLensRestored` exists to let the surface wait for;
 * 3. **the fetch**.
 *
 * `onViewLoaded` is dispatched *after* the flag read resolves rather than
 * optimistically with an empty list, because installing the surface twice would
 * reset `clockAnchor` and re-stamp the lens mid-restore.
 *
 * ## The shell's sidebar field seeds this surface, once per value
 *
 * The desktop shell carries its own search field (`MainShellPage` →
 * `SidebarFragment`), and submitting it navigates here. That field writes the
 * **main** slice; this surface's field writes the **find lens**. They are
 * deliberately two values — a sidebar query is a navigation intent, a lens
 * query is a saved filter — so the seed runs on the shell value changing and
 * never the other way, which is what keeps typing here from fighting the
 * sidebar.
 *
 * ## The route bookkeeping is this Page's now
 *
 * `/search` used to mount the shell's `DestinationPage`, whose only job was to
 * dispatch `onDestinationRouteMounted` so the sidebar highlight follows the
 * URL. Replacing the placeholder means inheriting that dispatch — a Page is the
 * one artifact allowed to dispatch across slices (`RC-37`), and the alternative
 * (a route file that dispatches) is exactly what `RC-38` forbids.
 */
import { type EndeavorOperation, EndeavorsVistas } from '@kro/core'
import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../../library/hooks'
import { onDestinationRouteMounted } from '../../main/MainFeature'
import { selectSearchQuery } from '../../main/MainSelectors'
import { DestinationKind } from '../../main/SidebarDestination'
import {
  onViewLoaded,
  userDidChangeSearchQuery,
  userDidToggleFilter,
  userDidToggleShowArchived,
} from '../FindFeature'
import { FindSurface } from '../FindOperations'
import {
  fetchFindEndeavorsThunk,
  performBulkOperationThunk,
  performEndeavorOperationThunk,
  persistFindLensThunk,
  restoreFindLensThunk,
} from '../FindProducer'
import {
  selectFindCapabilities,
  selectFindEmptyState,
  selectFindException,
  selectFindRowAdapters,
  selectFindSearchQuery,
  selectFindSelectedHosts,
  selectFindSelectedKinds,
  selectFindSelectedStatuses,
  selectFindShowArchived,
  selectFindVisibleCount,
  selectFindVisibleIds,
  selectIsFindLoading,
} from '../FindSelectors'
import type { FindFilterToggle } from '../FindState'
import { resolveCapabilityFlagsThunk } from './FindCapabilitiesProducer'
import { FindFragment } from './FindFragment'
import type { InputCapability } from '../../../design/endeavor/useInputCapability'

/**
 * The stand-in anchor before the first install, matching `FindSelectors`'
 * own `anchorOf` fallback exactly. Nothing renders a caption against it: the
 * pool is empty until the fetch lands, so no row exists to date.
 */
const EPOCH = new Date(0)

export interface FindPageProps {
  /** Stories and tests pin the input grammar; production detects it. */
  readonly input?: InputCapability
  readonly locale?: string
}

export function FindPage({ input, locale }: FindPageProps) {
  const dispatch = useAppDispatch()

  const query = useAppSelector(selectFindSearchQuery)
  const rows = useAppSelector(selectFindRowAdapters)
  const capabilities = useAppSelector(selectFindCapabilities)
  const emptyState = useAppSelector(selectFindEmptyState)
  const selectedKinds = useAppSelector(selectFindSelectedKinds)
  const selectedHosts = useAppSelector(selectFindSelectedHosts)
  const selectedStatuses = useAppSelector(selectFindSelectedStatuses)
  const showArchived = useAppSelector(selectFindShowArchived)
  const visibleCount = useAppSelector(selectFindVisibleCount)
  const visibleIds = useAppSelector(selectFindVisibleIds)
  const isLoading = useAppSelector(selectIsFindLoading)
  const exception = useAppSelector(selectFindException)
  const shellQuery = useAppSelector(selectSearchQuery)
  // Two O(1) field reads, which is all `RC-5` allows here — the lens is stored
  // flat precisely so persisting it needs no derivation, and the anchor is the
  // instant the Selectors already classify against, so a row's "2 hours ago"
  // caption and the filter that let it through agree by construction.
  const lens = useAppSelector((state) => state.find.find.lens)
  const clockAnchor = useAppSelector((state) => state.find.find.clockAnchor)

  // The URL is the authority for the shell's selection (`RC-63`).
  useEffect(() => {
    dispatch(
      onDestinationRouteMounted({ destination: { kind: DestinationKind.search } }),
    )
  }, [dispatch])

  useEffect(() => {
    let cancelled = false
    const flags = dispatch(resolveCapabilityFlagsThunk())
    const lensRestore = dispatch(
      restoreFindLensThunk({
        surface: FindSurface.find,
        vistaId: EndeavorsVistas.find.id,
      }),
    )
    const fetch = dispatch(
      fetchFindEndeavorsThunk({ surface: FindSurface.find, now: new Date() }),
    )

    void flags.then((action) => {
      if (cancelled) return
      const result = resolveCapabilityFlagsThunk.fulfilled.match(action)
        ? action.payload
        : null
      dispatch(
        onViewLoaded({
          surface: FindSurface.find,
          now: new Date(),
          enabledFlags: result !== null && result.ok ? result.value : [],
        }),
      )
    })

    return () => {
      cancelled = true
      flags.abort()
      lensRestore.abort()
      fetch.abort()
    }
  }, [dispatch])

  // Seeded by the shell's own field, and only when that value changes.
  useEffect(() => {
    if (shellQuery.length === 0) return
    dispatch(
      userDidChangeSearchQuery({
        surface: FindSurface.find,
        query: shellQuery,
      }),
    )
  }, [dispatch, shellQuery])

  // Canon persists the lens whenever it changes; a failure is swallowed by the
  // Producer, so this never needs a result.
  useEffect(() => {
    const effect = dispatch(
      persistFindLensThunk({
        surface: FindSurface.find,
        vistaId: EndeavorsVistas.find.id,
        lens,
      }),
    )
    return () => effect.abort()
  }, [dispatch, lens])

  const onChangeQuery = useCallback(
    (next: string) => {
      dispatch(
        userDidChangeSearchQuery({ surface: FindSurface.find, query: next }),
      )
    },
    [dispatch],
  )

  const onToggleFilter = useCallback(
    (toggle: FindFilterToggle) => {
      dispatch(userDidToggleFilter({ surface: FindSurface.find, toggle }))
    },
    [dispatch],
  )

  const onOperation = useCallback(
    (operation: EndeavorOperation, endeavorId: string) => {
      void dispatch(
        performEndeavorOperationThunk({
          surface: FindSurface.find,
          operation,
          endeavorId,
          now: new Date(),
        }),
      )
    },
    [dispatch],
  )

  const onBulk = useCallback(
    (operation: 'delete' | 'archive') => {
      void dispatch(
        performBulkOperationThunk({
          surface: FindSurface.find,
          operation,
          endeavorIds: visibleIds,
          now: new Date(),
        }),
      )
    },
    [dispatch, visibleIds],
  )

  /**
   * The row's Open control, raised through the SAME Producer the vista's tap
   * would use — so there is one path to Detail from every surface, and the
   * global overlay has one intent shape to drain.
   */
  const onOpenDetail = useCallback(
    (endeavorId: string) => {
      void dispatch(
        performEndeavorOperationThunk({
          surface: FindSurface.find,
          operation: 'viewDetail',
          endeavorId,
          now: new Date(),
        }),
      )
    },
    [dispatch],
  )

  const onRetry = useCallback(() => {
    void dispatch(
      fetchFindEndeavorsThunk({ surface: FindSurface.find, now: new Date() }),
    )
  }, [dispatch])

  return (
    <FindFragment
      query={query}
      rows={rows}
      capabilities={capabilities}
      emptyState={emptyState}
      selectedKinds={selectedKinds}
      selectedHosts={selectedHosts}
      selectedStatuses={selectedStatuses}
      showArchived={showArchived}
      visibleCount={visibleCount}
      isLoading={isLoading}
      exception={exception}
      now={clockAnchor ?? EPOCH}
      input={input}
      locale={locale}
      onChangeQuery={onChangeQuery}
      onToggleFilter={onToggleFilter}
      onToggleShowArchived={() =>
        dispatch(userDidToggleShowArchived({ surface: FindSurface.find }))
      }
      onOperation={onOperation}
      onOpenDetail={onOpenDetail}
      onDeleteAllVisible={() => onBulk('delete')}
      onArchiveAllVisible={() => onBulk('archive')}
      onRetry={onRetry}
    />
  )
}
