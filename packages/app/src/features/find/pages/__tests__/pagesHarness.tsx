/**
 * The store harness the KC-IS-#30 surfaces' stories and tests share.
 *
 * ## Why a SEEDED store rather than a preloaded one
 *
 * `makeStore(extra)` takes no `preloadedState` (`RC-22`: one construction path,
 * one reducer map), so a story cannot hand a slice a canned `State`. It does
 * not need to: seeding the in-memory `LocalStore` with real `EndeavorRecord`s
 * and letting the surface's own fetch run produces the same state through the
 * **real** Producer, Shifter and reconcile pass — which is a stronger claim
 * than a preloaded object, because a mapping bug between the record and the
 * domain shows up here instead of hiding behind the fixture.
 *
 * The endeavors themselves are `#29`'s own `findEndeavorMocks` /
 * `detailEndeavorMocks`, so no scene shows data the slice could not produce
 * (`RC-31`).
 *
 * ## Why it lives under `__tests__/`
 *
 * It imports a Service module (`InMemoryLocalStore`), which `RC-6` allows only
 * from the store, from `services/**` and from test/preview files — and this is
 * the second of those. `check-uzf-boundaries.mjs` reads the same rule.
 */
import type {
  Endeavor,
  EndeavorCapabilities,
  EndeavorGroupingCriteria as EndeavorGroupingCriteriaType,
  Project,
} from '@kro/core'
import {
  EndeavorGroupingCriteria,
  EndeavorsVistas,
  type FeatureFlagService,
  FeatureFlags,
  deferRecordFromDefer,
  enabledAssignment,
  endeavorRecordFromEndeavor,
  epochMillisFromDate,
  projectRecordFromProject,
  makeHardcodedFeatureFlagService,
  performanceRecordFromPerform,
  resolveEndeavorCapabilities,
} from '@kro/core'
import type { ReactNode } from 'react'
import { StoreProvider } from '../../../../library/StoreProvider'
import { type AppStore, makeStore, stubbedThunkExtra } from '../../../../library/store'
import { makeInMemoryLocalStore } from '../../../../services/localStore/InMemoryLocalStore'
import { endeavorRowAdapters } from '../../FindAdapters'
import { groupEndeavors, limitGroups } from '../../FindGrouping'

/** The flag service a scene needs when it must show a dark-launched binding. */
export const detailEnabledFlags: FeatureFlagService =
  makeHardcodedFeatureFlagService({
    overrides: [enabledAssignment(FeatureFlags.endeavorDetail)],
  })

export interface HarnessOptions {
  /** The rows the surface fetches. Empty is a valid, meaningful scene. */
  readonly endeavors?: readonly Endeavor[]
  /** The Lists the shell loads — a list destination resolves its title here. */
  readonly projects?: readonly Project[]
  /** Defaults to the shipping baseline, where `endeavorDetail` is OFF. */
  readonly featureFlags?: FeatureFlagService
  /** The instant every record is stamped at, so a scene never reads a clock. */
  readonly now?: Date
}

/**
 * A store whose local database already holds `endeavors`, their defers and
 * their performances — the three tables `readStoredEndeavors` joins.
 */
export const makeSeededStore = ({
  endeavors = [],
  projects = [],
  featureFlags = stubbedThunkExtra.featureFlags,
  now = new Date(2026, 5, 18, 9, 40),
}: HarnessOptions = {}): AppStore => {
  const nowMillis = epochMillisFromDate(now)

  return makeStore({
    ...stubbedThunkExtra,
    featureFlags,
    localStore: makeInMemoryLocalStore({
      endeavors: endeavors.map((endeavor) =>
        endeavorRecordFromEndeavor(endeavor, { now }),
      ),
      projects: projects.map((project) =>
        projectRecordFromProject(project, { now }),
      ),
      defers: endeavors.flatMap((endeavor) =>
        endeavor.defers.map((entry) =>
          deferRecordFromDefer(entry, {
            endeavorId: endeavor.id,
            now,
            nowMillis,
          }),
        ),
      ),
      performances: endeavors.flatMap((endeavor) =>
        endeavor.performances.map((entry) =>
          performanceRecordFromPerform(entry, {
            endeavorId: endeavor.id,
            nowMillis,
          }),
        ),
      ),
    }),
  })
}

/** The provider every scene mounts under. */
export function Harness({
  store,
  children,
}: {
  readonly store: AppStore
  readonly children: ReactNode
}) {
  return <StoreProvider store={store}>{children}</StoreProvider>
}

/* ------------------------------------------------------------------------ */
/* Fragment scenes                                                           */
/* ------------------------------------------------------------------------ */

/**
 * The Find vista's capabilities, flag-resolved exactly as
 * `selectFindCapabilities` resolves them — so a Fragment scene shows the same
 * gesture set the running surface would.
 */
export const findCapabilitiesWith = (
  enabledFlags: readonly string[] = [],
): EndeavorCapabilities =>
  resolveEndeavorCapabilities(EndeavorsVistas.find.capabilities, (flag) =>
    enabledFlags.includes(flag),
  )

export const tasksCapabilitiesWith = (
  enabledFlags: readonly string[] = [],
): EndeavorCapabilities =>
  resolveEndeavorCapabilities(EndeavorsVistas.tasksDefault.capabilities, (flag) =>
    enabledFlags.includes(flag),
  )

/** Rows, adapted the way `selectFindRowAdapters` adapts them. */
export const adaptedRows = (
  endeavors: readonly Endeavor[],
  capabilities: EndeavorCapabilities,
) => endeavorRowAdapters(endeavors, capabilities)

/** Groups, grouped and limited the way `selectTasksGroups` does. */
export const adaptedGroups = (
  endeavors: readonly Endeavor[],
  capabilities: EndeavorCapabilities,
  options: {
    readonly grouping?: EndeavorGroupingCriteriaType
    readonly limit?: number | null
    readonly expandedGroupKey?: string | null
  } = {},
) =>
  limitGroups(
    groupEndeavors(endeavors, options.grouping ?? EndeavorGroupingCriteria.status),
    options.limit === undefined ? 7 : options.limit,
    options.expandedGroupKey ?? null,
  ).map((group) => ({
    group,
    rows: endeavorRowAdapters(group.endeavors, capabilities),
  }))
