'use client'

/**
 * All Tasks' stateful container (`RC-37`) — canon's `TasksScreen`.
 *
 * One Page serves **three** destinations, because after the vista migration
 * they differ only in which `.tasks*` vista is installed: `/tasks` installs
 * `tasksDefault`, a Lists destination installs `tasksForList(id)`, and a seeded
 * search installs `tasksForSearch(query)`. `#29` modelled that as one surface
 * over a `TasksVistaSelection`, so the render tier gets one Page rather than
 * three near-copies — which is the same argument `FindState`'s own header makes
 * for one slice carrying two surfaces.
 *
 * ## Mount order, and the two races it avoids
 *
 * The restore and the fetch wait for `onViewLoaded`, and the lens is persisted
 * only once the restore has landed. Both are `FindPage`'s reasoning verbatim —
 * see its header — and both matter more here, because a Lists destination
 * re-runs this whole sequence every time the route's identity changes.
 *
 * ## The selection is re-declared whenever the route's identity changes
 *
 * `userDidSelectTasksVista` reseeds the lens from the new vista's defaults and
 * clears the expanded group, so navigating between two lists cannot leave the
 * previous list's grouping applied to the next one's rows. That is why the
 * effect is keyed on the selection's identity fields rather than the object.
 */
import type { EndeavorGroupingCriteria, EndeavorOperation } from '@kro/core'
import { useCallback, useEffect, useMemo } from 'react'
import type { InputCapability } from '../../../design/endeavor/useInputCapability'
import { useAppDispatch, useAppSelector } from '../../../library/hooks'
import { onDestinationRouteMounted } from '../../main/MainFeature'
import { selectProjects } from '../../main/MainSelectors'
import { DestinationKind } from '../../main/SidebarDestination'
import {
  onViewLoaded,
  userDidChangeSearchQuery,
  userDidSelectGrouping,
  userDidSelectTasksVista,
  userDidTapCollapseGroups,
  userDidTapExpandGroup,
} from '../FindFeature'
import { FindSurface } from '../FindOperations'
import {
  fetchFindEndeavorsThunk,
  performEndeavorOperationThunk,
  persistFindLensThunk,
  restoreFindLensThunk,
} from '../FindProducer'
import {
  selectTasksCapabilities,
  selectTasksEmptyState,
  selectTasksException,
  selectTasksExpandedGroupKey,
  selectTasksGroupAdapters,
  selectTasksGrouping,
  selectTasksHeading,
  selectTasksSearchQuery,
  selectTasksTitle,
  selectIsTasksLoading,
} from '../FindSelectors'
import { type TasksVistaSelection, tasksVistaIdFor } from '../FindState'
import { resolveCapabilityFlagsThunk } from './FindCapabilitiesProducer'
import { TasksFragment } from './TasksFragment'

/** The anchor before the first install — `FindSelectors`' own fallback. */
const EPOCH = new Date(0)

export interface TasksPageProps {
  /**
   * Which `.tasks*` vista to install. `/tasks` passes the default; a Lists
   * destination passes its own id and title.
   */
  readonly selection: TasksVistaSelection
  /** Canon's `TasksFeature.State.customTitle` — a caller-supplied heading. */
  readonly customTitle?: string | null
  readonly input?: InputCapability
  readonly locale?: string
}

export function TasksPage({
  selection,
  customTitle = null,
  input,
  locale,
}: TasksPageProps) {
  const dispatch = useAppDispatch()

  const heading = useAppSelector(selectTasksHeading)
  const subtitle = useAppSelector(selectTasksTitle)
  const query = useAppSelector(selectTasksSearchQuery)
  const grouping = useAppSelector(selectTasksGrouping)
  const groups = useAppSelector(selectTasksGroupAdapters)
  const expandedGroupKey = useAppSelector(selectTasksExpandedGroupKey)
  const capabilities = useAppSelector(selectTasksCapabilities)
  const emptyState = useAppSelector(selectTasksEmptyState)
  const isLoading = useAppSelector(selectIsTasksLoading)
  const exception = useAppSelector(selectTasksException)
  // O(1) field reads, exactly as `FindPage` does and for the same two reasons.
  const lens = useAppSelector((state) => state.find.tasks.lens)
  const clockAnchor = useAppSelector((state) => state.find.tasks.clockAnchor)
  const isLensRestored = useAppSelector(
    (state) => state.find.tasks.isLensRestored,
  )

  const listId = selection.kind === 'list' ? selection.listId : null
  const seededQuery = selection.kind === 'search' ? selection.query : null

  /*
    A list destination's route carries the id, never the name — the id is the
    identity and the title is presentation, which is the same split the shell's
    own `DestinationPage` made. So the title is looked up from the projects the
    shell already loaded, and an unresolved one stays `null` rather than being
    guessed: `selectTasksHeading` then falls through to "Tasks" instead of
    printing a name that would change under the reader a moment later.
  */
  const projects = useAppSelector(selectProjects)
  const listTitle =
    selection.kind !== 'list'
      ? null
      : (selection.listTitle ??
        projects.find((project) => project.id === selection.listId)?.title ??
        null)

  const resolvedSelection = useMemo<TasksVistaSelection>(
    () => (listId === null ? selection : { kind: 'list', listId, listTitle }),
    // The object is rebuilt on every render; its identity fields are the deps.
    // biome-ignore lint/correctness/useExhaustiveDependencies: `selection` is
    // derived — `kind`, `listId`, `listTitle` and the seeded query are its
    // identity.
    [selection.kind, listId, listTitle, seededQuery],
  )

  const vistaId = useMemo(
    () => tasksVistaIdFor(resolvedSelection),
    [resolvedSelection],
  )

  // The URL is the authority for the shell's selection (`RC-63`).
  useEffect(() => {
    dispatch(
      onDestinationRouteMounted({
        destination:
          listId === null
            ? { kind: DestinationKind.allTasks }
            : {
                kind: DestinationKind.list,
                listId,
                listTitle: listTitle ?? '',
              },
      }),
    )
  }, [dispatch, listId, listTitle])

  useEffect(() => {
    dispatch(
      userDidSelectTasksVista({ selection: resolvedSelection, customTitle }),
    )
  }, [dispatch, resolvedSelection, customTitle])

  useEffect(() => {
    let cancelled = false
    const flags = dispatch(resolveCapabilityFlagsThunk())
    // The two effects the flag read starts, so unmount can cancel them —
    // cancellation is the one silent exit (`UZF-14`).
    const started: { abort: () => void }[] = []

    void flags.then((action) => {
      if (cancelled) return
      const result = resolveCapabilityFlagsThunk.fulfilled.match(action)
        ? action.payload
        : null
      dispatch(
        onViewLoaded({
          surface: FindSurface.tasks,
          now: new Date(),
          enabledFlags: result !== null && result.ok ? result.value : [],
        }),
      )
      started.push(
        dispatch(restoreFindLensThunk({ surface: FindSurface.tasks, vistaId })),
        dispatch(
          fetchFindEndeavorsThunk({
            surface: FindSurface.tasks,
            now: new Date(),
          }),
        ),
      )
    })

    return () => {
      cancelled = true
      flags.abort()
      for (const effect of started) effect.abort()
    }
  }, [dispatch, vistaId])

  // Gated on the restore, exactly as `FindPage` is and for the same reason:
  // an ungated write saves the vista's defaults over the user's own filters.
  useEffect(() => {
    if (!isLensRestored) return
    const effect = dispatch(
      persistFindLensThunk({ surface: FindSurface.tasks, vistaId, lens }),
    )
    return () => effect.abort()
  }, [dispatch, isLensRestored, vistaId, lens])

  const onOperation = useCallback(
    (operation: EndeavorOperation, endeavorId: string) => {
      void dispatch(
        performEndeavorOperationThunk({
          surface: FindSurface.tasks,
          operation,
          endeavorId,
          now: new Date(),
        }),
      )
    },
    [dispatch],
  )

  /**
   * Canon's `onSelectTask`, answered with the Detail presentation.
   *
   * `viewDetail` is the operation the global overlay listens for, so raising it
   * through the same Producer keeps one path to Detail from every surface —
   * rather than a second, surface-local route that would drift the day the
   * intent queue grows a rule.
   */
  const onSelectEndeavor = useCallback(
    (endeavorId: string) => {
      void dispatch(
        performEndeavorOperationThunk({
          surface: FindSurface.tasks,
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
      fetchFindEndeavorsThunk({ surface: FindSurface.tasks, now: new Date() }),
    )
  }, [dispatch])

  return (
    <TasksFragment
      heading={heading}
      subtitle={subtitle}
      query={query}
      grouping={grouping}
      groups={groups}
      expandedGroupKey={expandedGroupKey}
      capabilities={capabilities}
      emptyState={emptyState}
      isLoading={isLoading}
      exception={exception}
      now={clockAnchor ?? EPOCH}
      input={input}
      locale={locale}
      onChangeQuery={(next) =>
        dispatch(
          userDidChangeSearchQuery({ surface: FindSurface.tasks, query: next }),
        )
      }
      onSelectGrouping={(next: EndeavorGroupingCriteria) =>
        dispatch(
          userDidSelectGrouping({ surface: FindSurface.tasks, grouping: next }),
        )
      }
      onExpandGroup={(groupKey) =>
        dispatch(
          userDidTapExpandGroup({ surface: FindSurface.tasks, groupKey }),
        )
      }
      onCollapseGroups={() =>
        dispatch(userDidTapCollapseGroups({ surface: FindSurface.tasks }))
      }
      onOperation={onOperation}
      onSelectEndeavor={onSelectEndeavor}
      onRetry={onRetry}
    />
  )
}
