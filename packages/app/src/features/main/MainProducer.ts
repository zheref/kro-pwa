/**
 * The shell's Producers (`RC-3`, `RC-6`, `RC-7`, `RC-17`, `RC-25`).
 *
 * Seven thunks, one shape: reach a Service only through `extra`, never throw,
 * always resolve a `Result`. None reads a clock and none mints an id — `now`
 * and `id` are arguments, the same rule `CaptureProducer` states for exactly
 * the same reason (identity is the composition root's to supply, and a
 * reproducible test needs both pinned).
 *
 * **This is the only place the shell navigates.** `RC-17`/`RC-63`: the router
 * is a Service, invoked from a Producer, never from a component. A sidebar row
 * dispatches `navigateToDestinationThunk`; it does not know a URL exists.
 */
import {
  FeatureFlags,
  type Project,
  type Result,
  epochMillisFromDate,
  err,
  makeProject,
  ok,
  projectFromRecord,
  projectRecordFromProject,
} from '@kro/core'
import { createAsyncThunk } from '@reduxjs/toolkit'
import type { RootState, ThunkExtra } from '../../library/store'
import { prepareSessionLaunchThunk } from '../session/SessionProducer'
import type { DetailPaneEndeavor } from './DetailPane'
import type { PendingShellRoute } from './MainFeature'
import { type MainException, MainExceptions } from './MainException'
import type { ShellConfiguration } from './MainShifters'
import type { DestinationGates } from './NavigationSections'
import {
  selectInFlightSessionPaneTarget,
  selectIsDetailPaneAvailable,
} from './MainSelectors'
import {
  DestinationKind,
  type SidebarDestination,
  destinationPath,
} from './SidebarDestination'

const reasonOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

/**
 * Resolves the flag gates the navigation model needs.
 *
 * Canon reads `Flags.shared.enabledResolver(...)` at each `section.add`; the
 * flags are injected here (`RC-6`), so they are read once, in one place, and
 * the model itself stays a pure function of the answers.
 */
const gatesFrom = (extra: ThunkExtra): DestinationGates => {
  const flags = extra.featureFlags

  return {
    tasks: flags.isEnabled(FeatureFlags.tasks),
    matrix: flags.isEnabled(FeatureFlags.matrix),
    day: flags.isEnabled(FeatureFlags.day),
    habits: flags.isEnabled(FeatureFlags.habits),
    session: flags.isEnabled(FeatureFlags.session),
    board: flags.isEnabled(FeatureFlags.board),
    rewards: flags.isEnabled(FeatureFlags.rewards),
    blueprints: flags.isEnabled(FeatureFlags.blueprints),
    settings: flags.isEnabled(FeatureFlags.settings),
    lists: flags.isEnabled(FeatureFlags.lists),
    now: flags.isEnabled(FeatureFlags.now),
  }
}

/** The Lists rows, newest-title-last, as canon renders them. */
const readProjects = async (extra: ThunkExtra): Promise<readonly Project[]> => {
  const records = await extra.localStore.projects.all()
  return records.map(projectFromRecord)
}

/**
 * The shell's mount effect: the gates plus the Lists rows.
 *
 * The flag read cannot fail (the service is synchronous and total), so the
 * only failure this can resolve is the storage read — which is why a failed
 * load still carries gates: the sidebar renders what the flags allow even when
 * the Lists section could not be read.
 */
export const loadShellThunk = createAsyncThunk<
  Result<ShellConfiguration, MainException>,
  void,
  { extra: ThunkExtra }
>('main/onShellLoadCompleted', async (_argument, { extra }) => {
  const gates = gatesFrom(extra)
  const isDetailPaneEnabled = extra.featureFlags.isEnabled(
    FeatureFlags.macDetailPane,
  )

  if (!gates.lists) {
    // The Lists section is off, so the store is never touched — canon does not
    // read `store.lists` when the flag is down either.
    return ok({ gates, projects: [], isDetailPaneEnabled })
  }

  try {
    return ok({
      gates,
      projects: await readProjects(extra),
      isDetailPaneEnabled,
    })
  } catch (error) {
    // The gates already resolved, so they still apply: a Lists read failure
    // must never leave the sidebar and tab bar with no destinations at all.
    return ok({
      gates,
      projects: [],
      listsFailure: MainExceptions.listsLoadFailed(reasonOf(error)),
      isDetailPaneEnabled,
    })
  }
})

/**
 * The inline "New project…" row, committed.
 *
 * Resolves the whole new row set rather than the created project alone: the
 * sidebar renders a list, and re-reading it after the write is what keeps the
 * order the store decides rather than one this thunk invents.
 */
export const createProjectThunk = createAsyncThunk<
  Result<readonly Project[], MainException>,
  { id: string; title: string; now: Date },
  { extra: ThunkExtra }
>('main/onProjectCreateCompleted', async ({ id, title, now }, { extra }) => {
  const trimmed = title.trim()
  if (trimmed.length === 0) return err(MainExceptions.projectTitleEmpty())

  try {
    await extra.localStore.projects.put(
      projectRecordFromProject(makeProject({ id, title: trimmed }), { now }),
    )
    return ok(await readProjects(extra))
  } catch (error) {
    return err(MainExceptions.projectCreateFailed(reasonOf(error)))
  }
})

/**
 * A project row, removed.
 *
 * `softDelete`, never `remove`: the hard delete belongs to the sign-out wipe,
 * and a user-facing removal has to leave a tombstone the sync engine can push.
 */
export const deleteProjectThunk = createAsyncThunk<
  Result<readonly Project[], MainException>,
  { id: string; now: Date },
  { extra: ThunkExtra }
>('main/onProjectDeleteCompleted', async ({ id, now }, { extra }) => {
  try {
    await extra.localStore.projects.softDelete(id, epochMillisFromDate(now))
    return ok(await readProjects(extra))
  } catch (error) {
    return err(MainExceptions.projectDeleteFailed(reasonOf(error)))
  }
})

/**
 * Navigation — the one-shot (`RC-17`).
 *
 * Resolves the path it navigated to so a test asserts on an outcome rather
 * than on a spy's call log, and so the caller has something to log.
 */
export const navigateToDestinationThunk = createAsyncThunk<
  Result<string, MainException>,
  { destination: SidebarDestination },
  { extra: ThunkExtra }
>(
  'main/onDestinationNavigationCompleted',
  async ({ destination }, { extra }) => {
    const path = destinationPath(destination)
    try {
      extra.navigation.navigate(path)
      return ok(path)
    } catch (error) {
      return err(MainExceptions.unknown(reasonOf(error)))
    }
  },
)

/** Where `openSessionSurfaceThunk` put the session surface. */
export type SessionSurfaceHost =
  | { readonly kind: 'pane'; readonly endeavor: DetailPaneEndeavor | null }
  | { readonly kind: 'route'; readonly path: string }

/**
 * "Show me the session" — Execute on a card, a Plan block's Start Session, the
 * FAB's Start Session, the pill.
 *
 * Canon (#517): on the Mac, starting or resuming a session raises Session Setup
 * in the window's trailing pane (`applySessionSetupPresentation`). Where this
 * window hosts the pane, this resolves `pane` and the slice points the pane's
 * Session segment at `endeavor` (`null` = a new, arbitrary task). Everywhere
 * else it navigates to the Execute destination exactly as before — the router
 * stays a Service, called here and nowhere in a component (`RC-17`).
 */
export const openSessionSurfaceThunk = createAsyncThunk<
  Result<SessionSurfaceHost, MainException>,
  { endeavor: DetailPaneEndeavor | null },
  { extra: ThunkExtra; state: RootState }
>(
  'main/onSessionSurfaceOpenCompleted',
  async ({ endeavor }, { extra, getState }) => {
    if (selectIsDetailPaneAvailable(getState())) {
      // A session already in flight owns the pane: point it at that session,
      // not at the card that asked, so the header never mislabels it.
      const inFlight = selectInFlightSessionPaneTarget(getState())
      return ok({ kind: 'pane', endeavor: inFlight?.endeavor ?? endeavor })
    }
    const path = destinationPath({ kind: DestinationKind.session })
    try {
      extra.navigation.navigate(path)
      return ok({ kind: 'route', path })
    } catch (error) {
      return err(MainExceptions.unknown(reasonOf(error)))
    }
  },
)

/**
 * Execute on a card — a Plan row's Start Session, a Do card's Execute.
 *
 * One Producer for the two effects the view used to sequence itself (`RC-3`,
 * `RC-7`): prepare the session's launch for the card's endeavor, then raise the
 * session surface named after what the preparation read. The surface opens
 * only once the preparation settled, so the pane or Execute never paints a
 * frame of the anonymous session first.
 *
 * A failed preparation still opens the surface — a control that goes to the
 * right screen is honest, one that appears to do nothing is not — carrying
 * `fallbackTitle` (empty when the caller has none). The final step dispatches
 * `openSessionSurfaceThunk`, so the slice's existing arm points the pane and an
 * in-flight session still wins it.
 */
export const startSessionFromCardThunk = createAsyncThunk<
  Result<SessionSurfaceHost, MainException>,
  {
    readonly endeavorId: string
    /** The new session's id. Callers mint ids, never this tier. */
    readonly sessionId: string
    readonly fallbackTitle?: string
  },
  { extra: ThunkExtra; state: RootState }
>(
  'main/onSessionFromCardStartCompleted',
  async (
    { endeavorId, sessionId, fallbackTitle = '' },
    { dispatch, getState },
  ) => {
    try {
      // A session already in flight owns the surface: preparing another
      // launch now would leave the session slice loading forever (the
      // preparation is refused while a session is live), so skip straight to
      // raising the surface, which points at the running session.
      if (selectInFlightSessionPaneTarget(getState()) !== null) {
        const opened = await dispatch(
          openSessionSurfaceThunk({
            endeavor: { id: endeavorId, title: fallbackTitle },
          }),
        )
        return openSessionSurfaceThunk.fulfilled.match(opened)
          ? opened.payload
          : err(MainExceptions.unknown('The session surface did not open'))
      }
      const prepared = await dispatch(
        prepareSessionLaunchThunk({ endeavorId, sessionId }),
      )
      const title =
        prepareSessionLaunchThunk.fulfilled.match(prepared) &&
        prepared.payload.ok
          ? prepared.payload.value.identity.title
          : fallbackTitle
      const opened = await dispatch(
        openSessionSurfaceThunk({ endeavor: { id: endeavorId, title } }),
      )
      return openSessionSurfaceThunk.fulfilled.match(opened)
        ? opened.payload
        : err(MainExceptions.unknown('The session surface did not open'))
    } catch (error) {
      return err(MainExceptions.unknown(reasonOf(error)))
    }
  },
)

/**
 * The capture slice's routing one-shot, performed.
 *
 * Canon waits `deliverAfterMs` and then navigates. There is no timer here: the
 * capture slice already decided *what* and *when* (`decidedAt +
 * deliverAfterMs`), `selectPendingShellRoute` reshapes that into a
 * shell-owned `PendingShellRoute` carrying an absolute `deliverAtMs`, and this
 * thunk compares it against the `now` its caller ticks with. A premature tick
 * resolves `ok(null)` — nothing was due — which is the common case, not a
 * failure.
 *
 * The cross-slice read happens where `RC-20` puts it: a Selector composed at
 * the root (`MainSelectors`), never a slice importing another slice's shape.
 * By the time the intent reaches this thunk it is already a shell type.
 *
 * DELIVERING IS NOT ALWAYS NAVIGATING. `context.autoNavigates` is `false` for
 * the branch the capture rules say never auto-navigates — everything that is
 * not a timed event. That route is still delivered, because consuming the
 * one-shot is what opens the Inbox with its Just Created row; it just does not
 * call the router, so the user stays on the surface they captured from. See
 * `ShellRouteContext.autoNavigates`.
 */
export const deliverCaptureRouteThunk = createAsyncThunk<
  Result<PendingShellRoute['context'] | null, MainException>,
  { pending: PendingShellRoute | null; now: Date },
  { extra: ThunkExtra }
>(
  'main/onCaptureRouteDeliveryCompleted',
  async ({ pending, now }, { extra }) => {
    if (pending === null || now.getTime() < pending.deliverAtMs) return ok(null)
    if (!pending.context.autoNavigates) return ok(pending.context)

    try {
      extra.navigation.navigate(destinationPath(pending.context.destination))
      return ok(pending.context)
    } catch (error) {
      return err(MainExceptions.unknown(reasonOf(error)))
    }
  },
)
