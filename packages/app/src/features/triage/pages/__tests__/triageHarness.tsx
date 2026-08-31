/**
 * The scaffolding every Triage story and suite sits on.
 *
 * Under `__tests__/` rather than beside the surfaces for the same reason
 * `capture/pages/__tests__/captureHarness.tsx` is: it is test scaffolding, not
 * shipped code — and, unlike shipped code, it is allowed to reach a Service
 * module directly (`check-uzf-boundaries.mjs` exempts test and story files,
 * `RC-6`).
 *
 * Two things it deliberately does **not** do:
 *
 *   · **It constructs no `TriageState`.** Every state comes from
 *     `triageStateMocks`, which #25 builds by running the real Shifters — a
 *     hand-assembled mock could describe a state the reducer can never produce
 *     (`RC-31`).
 *   · **It builds no second store.** `makeStore(extra)` is the one construction
 *     path (`RC-22`); a seeded in-memory `LocalStore` is how a Page gets a pool,
 *     so the rows arrive through the real Producer, the real Shifter and the
 *     real reconcile pass rather than a preloaded slice.
 *
 * `triageFormProps` is the third piece: it runs the **real Selectors** over a
 * mock state and hands back exactly the props `TriageFormFragment` takes, so a
 * story and its mirroring render test consume one source (`RC-11`).
 */

import { type ReactNode, useEffect } from 'react'
import type { EndeavorRecord } from '@kro/core'
import { StoreProvider } from '../../../../library/StoreProvider'
import {
  type ThunkExtra,
  makeStore,
  stubbedThunkExtra,
} from '../../../../library/store'
import type { RootState } from '../../../../library/store'
import { makeInMemoryLocalStore } from '../../../../services/localStore/InMemoryLocalStore'
import { initialAuthState } from '../../../auth/AuthState'
import {
  initialCaptureState,
  userDidTapTriage,
} from '../../../capture/CaptureFeature'
import { loadCaptureContextThunk } from '../../../capture/CaptureProducer'
import { initialDoState } from '../../../do/DoFeature'
import { initialEarnState } from '../../../earn/EarnFeature'
import { initialEndeavorDetailState } from '../../../endeavorDetail/EndeavorDetailState'
import { initialFindState } from '../../../find/FindState'
import { greetingStateMocks } from '../../../greeting/GreetingMocks'
import {
  initialMainState,
  onDestinationRouteMounted,
  onShellMounted,
} from '../../../main/MainFeature'
import type { DoSurface } from '../../../main/DoSurfaceLayout'
import { desktopSurface, handheldSurface } from '../../../main/MainMocks'
import {
  DestinationKind,
  type SidebarDestination,
} from '../../../main/SidebarDestination'
import { initialPlanState } from '../../../plan/PlanState'
import { initialPlatformState } from '../../../platform/PlatformFeature'
import { initialSessionState } from '../../../session/SessionState'
import { initialSettingsState } from '../../../settings/SettingsState'
import { initialThirstState } from '../../../thirst/ThirstFeature'
import { EisenhowerQuadrant } from '@kro/core'
import type { TriageState } from '../../TriageFeature'
import { initialTriageState } from '../../TriageFeature'
import {
  TRIAGE_MOCK_NOW,
  triageEndeavorFixtures,
  triageFixtureRecords,
  triageMockAt,
  triageSessionSeed,
  triageStateMocks,
} from '../../TriageMocks'
import {
  withDurationPicked,
  withExpiryPicked,
  withFetchStarted,
  withQuadrantPicked,
  withRewardPointsPicked,
  withSessionOpened,
  withValueRatingTapped,
} from '../../TriageShifters'
import {
  selectCanClearTriageExpiry,
  selectCanConfirmTriage,
  selectIsTriageEditReachable,
  selectIsTriageExpiryCustom,
  selectIsTriageSaving,
  selectTriageBlockedReason,
  selectTriageDueDate,
  selectTriageDurationChips,
  selectTriageEffortRating,
  selectTriageExpiry,
  selectTriageExpiryScrollNonce,
  selectTriageExpiryTokens,
  selectTriageHeading,
  selectTriagePrimaryActionLabel,
  selectTriagePushNotice,
  selectTriageQuadrantTiles,
  selectTriageRewardPoints,
  selectTriageSaveException,
  selectTriageSecondaryAction,
  selectTriageSelectedExpiryToken,
  selectTriageValueRating,
} from '../../TriageSelectors'
import type { TriageFormFragmentProps } from '../TriageFormFragment'

export { desktopSurface, handheldSurface }
export { TRIAGE_MOCK_NOW }

/**
 * jsdom implements neither `matchMedia` nor `crypto.randomUUID` reliably, and
 * both sit on the path of every surface here — the first through the Inbox
 * row's `useInputCapability`, the second through the shell's own bookkeeping.
 * Installed per suite, torn down after, so no file leaks a stub into the next.
 */
export function installTriageEnvironment(options?: {
  readonly pointer?: 'coarse' | 'fine'
}): () => void {
  const pointer = options?.pointer ?? 'fine'
  const originalMatchMedia = window.matchMedia
  const originalUuid = globalThis.crypto?.randomUUID

  window.matchMedia = ((query: string) =>
    ({
      matches:
        query.includes('pointer: fine') || query.includes('any-pointer: fine')
          ? pointer === 'fine'
          : query.includes('min-width'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => true,
      onchange: null,
    }) as unknown as MediaQueryList) as typeof window.matchMedia

  let counter = 0
  if (globalThis.crypto !== undefined) {
    Object.defineProperty(globalThis.crypto, 'randomUUID', {
      configurable: true,
      writable: true,
      value: () => `triage-${(counter += 1)}` as `${string}-${string}`,
    })
  }

  return () => {
    window.matchMedia = originalMatchMedia
    if (globalThis.crypto !== undefined && originalUuid !== undefined) {
      Object.defineProperty(globalThis.crypto, 'randomUUID', {
        configurable: true,
        writable: true,
        value: originalUuid,
      })
    }
  }
}

export interface TriageStoreOptions {
  /** Stored rows the pool is built from. Defaults to the whole fixture set. */
  readonly endeavors?: readonly EndeavorRecord[]
  /** Which row of the ported decision table the shell resolves to. */
  readonly surface?: DoSurface
  readonly destination?: SidebarDestination
  /** Anything else a suite wants to swap — a flag service with `endeavorDetail` on, say. */
  readonly extra?: Partial<ThunkExtra>
}

/**
 * A store wired to an in-memory `LocalStore` holding `endeavors`, with the
 * shell already measured at `surface` and standing on `destination`.
 */
export function makeTriageStore(options: TriageStoreOptions = {}) {
  const store = makeStore({
    ...stubbedThunkExtra,
    localStore: makeInMemoryLocalStore({
      endeavors: [...(options.endeavors ?? triageFixtureRecords())],
    }),
    ...options.extra,
  })
  store.dispatch(
    onShellMounted({
      surface: options.surface ?? handheldSurface,
      isDevelopment: false,
    }),
  )
  store.dispatch(
    onDestinationRouteMounted({
      destination: options.destination ?? { kind: DestinationKind.inbox },
    }),
  )
  return store
}

export type TriageStore = ReturnType<typeof makeTriageStore>

/**
 * The Inbox's own hand-off, driven through the real Producers.
 *
 * `withTriageRequested` **no-ops on an unknown row id**, so the pool has to
 * land before the tap: that is why this awaits `loadCaptureContextThunk` rather
 * than dispatching both in one breath. It is also why a story and a test can
 * share it — neither is allowed to fake the request into the slice.
 */
export async function seedTriageRequest(
  store: TriageStore,
  endeavorId: string,
  now: Date = TRIAGE_MOCK_NOW,
): Promise<void> {
  await store.dispatch(loadCaptureContextThunk({ now }))
  store.dispatch(userDidTapTriage({ endeavorId, now }))
}

/** The provider wrapper every Page story and Page test renders inside. */
export function TriageStoreStage({
  store,
  children,
}: {
  readonly store: TriageStore
  readonly children: ReactNode
}) {
  return <StoreProvider store={store}>{children}</StoreProvider>
}

/**
 * A scheme, applied where a portal can see it.
 *
 * The Inbox presentations are Radix dialogs and a dialog portals to
 * `document.body` — outside any story container — so the attribute has to go on
 * the document element or the panel renders in the light palette no matter what
 * the story asked for. Restored on unmount so one story cannot leave the next
 * one dark.
 */
export function ThemeScope({
  theme,
  children,
}: {
  readonly theme: 'light' | 'dark'
  readonly children: ReactNode
}) {
  useEffect(() => {
    const root = document.documentElement
    const previous = root.getAttribute('data-theme')
    root.setAttribute('data-theme', theme)
    return () => {
      if (previous === null) root.removeAttribute('data-theme')
      else root.setAttribute('data-theme', previous)
    }
  }, [theme])

  return (
    <div
      data-theme={theme}
      style={{
        minHeight: 640,
        background: 'var(--kro-color-back)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {children}
    </div>
  )
}

/**
 * A root state carrying one Triage slice.
 *
 * Every other slice is its own `initial…State`: `RootState` names them all, and
 * nothing on this surface reads them. Same shape `TriageSelectors.test.ts`
 * uses, for the same reason — a Selector is exercised against a hand-built root
 * state, never through a live store.
 */
export const triageRootWith = (slice: TriageState): RootState => ({
  greeting: greetingStateMocks.idle,
  do: initialDoState,
  capture: initialCaptureState,
  triage: slice,
  plan: initialPlanState,
  find: initialFindState,
  endeavorDetail: initialEndeavorDetailState,
  earn: initialEarnState,
  platform: initialPlatformState,
  session: initialSessionState,
  settings: initialSettingsState,
  auth: initialAuthState,
  main: initialMainState,
  thirst: initialThirstState,
})

/**
 * The four render-tier states `TriageMocks` does not carry, produced the same
 * way it produces its own: by running the **real** Shifters.
 *
 * They live here rather than in `TriageMocks` because they exist for the render
 * tier alone — the secondary-button branches, the value-promotion highlight,
 * the Custom expiry pill and the dark-launched Edit row are all things only a
 * view distinguishes, and `features/triage/TriageMocks.ts` is KC-IS-#25's lane.
 * They are still a single source consumed by both the stories and the render
 * tests, which is what `RC-31` is protecting: **no `TriageState` is assembled
 * by hand anywhere in this folder.**
 */
const openedWith = (
  overrides: Parameters<typeof triageSessionSeed>[0] = {},
): TriageState =>
  withSessionOpened(
    withFetchStarted(initialTriageState),
    triageSessionSeed(overrides),
  )

export const triagePageStateMocks = {
  /**
   * Delegate picked on a 15-minute task — the Share branch, and the only
   * quadrant whose secondary keeps the screen mounted.
   */
  delegatePicked: withQuadrantPicked(
    withDurationPicked(openedWith(), 15),
    EisenhowerQuadrant.delegate,
    TRIAGE_MOCK_NOW,
  ),

  /**
   * A 4-rocket value on a pristine form.
   *
   * Acceptance criterion 2, exactly: *"picking value 4 moves the quadrant
   * highlight"* — the rating promotes the quadrant into the Important row and
   * defaults to Schedule, **without** seeding a date, so the confirm gate is
   * still closed and now names the date rather than the quadrant.
   */
  valuePromotedToSchedule: withValueRatingTapped(openedWith(), 4),

  /**
   * A bespoke expiry: the scheduled form's expiry dialled two minutes off the
   * hour, so no preset matches and the informational Custom pill lights and
   * jumps to the head of the row.
   */
  customExpiry: withExpiryPicked(
    triageStateMocks.scheduled,
    triageMockAt(24, 11, 9),
  ),

  /** The reward stepper at canon's floor — its minus control is spent. */
  rewardAtFloor: withRewardPointsPicked(openedWith(), 1),

  /** And at canon's ceiling — its plus control is spent. */
  rewardAtCeiling: withRewardPointsPicked(openedWith(), 999),

  /** The dark-launched inline Edit affordance, reachable. */
  editReachable: withQuadrantPicked(
    openedWith({
      endeavor: triageEndeavorFixtures.fullyPrefilled,
      isEditReachable: true,
    }),
    EisenhowerQuadrant.prioritize,
    TRIAGE_MOCK_NOW,
  ),
} as const

/** The callbacks a story or a render test does not care about. */
const noop = () => {}

/**
 * The Fragment's props, derived from a mock state through the **real**
 * Selectors.
 *
 * This is what keeps a story honest: it cannot show a chip order, a blocked
 * reason or a secondary button the shipped Selectors would not produce, because
 * it never gets to choose them. Overrides exist only for the callbacks and the
 * two view-only flags a story pins.
 */
export function triageFormProps(
  slice: TriageState,
  overrides: Partial<TriageFormFragmentProps> = {},
): TriageFormFragmentProps {
  const root = triageRootWith(slice)
  const heading = selectTriageHeading(root)
  const saveException = selectTriageSaveException(root)

  return {
    endeavorTitle: heading?.title ?? '',
    endeavorSymbol: heading?.symbol ?? '',
    rewardPoints: selectTriageRewardPoints(root) ?? 0,
    durationChips: selectTriageDurationChips(root),
    quadrantTiles: selectTriageQuadrantTiles(root),
    value: selectTriageValueRating(root) ?? { rating: null, label: null },
    effort: selectTriageEffortRating(root) ?? { rating: null, label: null },
    dueDate: selectTriageDueDate(root),
    expiry: selectTriageExpiry(root),
    expiryTokens: selectTriageExpiryTokens(root),
    selectedExpiryToken: selectTriageSelectedExpiryToken(root),
    isExpiryCustom: selectIsTriageExpiryCustom(root),
    canClearExpiry: selectCanClearTriageExpiry(root),
    expiryScrollNonce: selectTriageExpiryScrollNonce(root),
    canConfirm: selectCanConfirmTriage(root),
    blockedReason: selectTriageBlockedReason(root),
    primaryActionLabel: selectTriagePrimaryActionLabel(root),
    secondaryAction: selectTriageSecondaryAction(root),
    isEditReachable: selectIsTriageEditReachable(root),
    isSaving: selectIsTriageSaving(root),
    saveExceptionMessage: saveException === null ? null : saveException.message,
    notice: selectTriagePushNotice(root),
    locale: 'en-US',
    onTapCancel: noop,
    onSelectQuadrant: noop,
    onSelectDuration: noop,
    onSelectDueDate: noop,
    onSelectExpiry: noop,
    onTapExpiryPreset: noop,
    onStepReward: noop,
    onTapValueRating: noop,
    onTapEffortRating: noop,
    onTapConfirm: noop,
    onTapStartNow: noop,
    onTapShare: noop,
    onTapArchive: noop,
    onTapEdit: noop,
    ...overrides,
  }
}
