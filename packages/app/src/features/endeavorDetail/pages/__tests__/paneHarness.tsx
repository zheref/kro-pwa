/**
 * The trailing detail pane around `DetailOverlays`, for its stories and render
 * tests: a store with `macDetailPane` on and a desktop surface, and the
 * shell's panel reduced to what hosts Detail — the glass surface and the
 * `detailPane` outlet, reading the shell's own Selectors.
 *
 * Not the whole shell on purpose: the sidebar, the toolbars and the
 * destinations are the shell's stories' subject, and mounting them here would
 * make every Detail story depend on every shell control.
 */
import {
  FeatureFlags,
  enabledAssignment,
  makeHardcodedFeatureFlagService,
} from '@kro/core'
import type { ReactNode } from 'react'
import { TrailingDetailPanel } from '../../../../design/chrome/panel/TrailingDetailPanel'
import { useAppDispatch, useAppSelector } from '../../../../library/hooks'
import type { AppStore } from '../../../../library/store'
import { makeSeededStore } from '../../../find/pages/__tests__/pagesHarness'
import {
  onShellMounted,
  userDidDismissDetailPane,
  userDidTapDetailPaneBack,
} from '../../../main/MainFeature'
import { desktopSurface } from '../../../main/MainMocks'
import { loadShellThunk } from '../../../main/MainProducer'
import {
  selectCanDetailPaneGoBack,
  selectDetailPaneDepth,
  selectDetailPaneLocationKey,
  selectDetailPaneSubtitle,
  selectDetailPaneTitle,
  selectIsDetailPanePresented,
} from '../../../main/MainSelectors'
import {
  ToolbarOutlet,
  ToolbarSlotsProvider,
  useToolbarSlotFilled,
} from '../../../main/ToolbarSlots'

type SeedOptions = Parameters<typeof makeSeededStore>[0]

/**
 * A seeded store on the desktop sidebar with the pane flag on. The shell load
 * resolves on the next microtask; a test awaits `waitFor` on what it renders.
 */
export function makePaneHostStore(options: SeedOptions = {}): AppStore {
  const store = makeSeededStore({
    ...options,
    featureFlags: makeHardcodedFeatureFlagService({
      overrides: [enabledAssignment(FeatureFlags.macDetailPane)],
    }),
  })
  store.dispatch(
    onShellMounted({ surface: desktopSurface, isDevelopment: false }),
  )
  void store.dispatch(loadShellThunk())
  return store
}

/** The panel, hosting whatever portals into the `detailPane` outlet. */
function PaneHost() {
  const dispatch = useAppDispatch()
  const isPresented = useAppSelector(selectIsDetailPanePresented)
  const title = useAppSelector(selectDetailPaneTitle)
  const subtitle = useAppSelector(selectDetailPaneSubtitle)
  const isTitleSlotted = useToolbarSlotFilled('detailPaneTitle')
  const isLeadingSlotted = useToolbarSlotFilled('detailPaneLeading')
  const canGoBack = useAppSelector(selectCanDetailPaneGoBack)
  const depth = useAppSelector(selectDetailPaneDepth)
  const locationKey = useAppSelector(selectDetailPaneLocationKey)
  return (
    <TrailingDetailPanel
      isPresented={isPresented}
      title={title ?? ''}
      subtitle={subtitle}
      onDismiss={() => dispatch(userDidDismissDetailPane())}
      onBack={canGoBack ? () => dispatch(userDidTapDetailPaneBack()) : null}
      navigationDepth={depth}
      navigationKey={locationKey}
      titleContent={
        isTitleSlotted ? (
          <ToolbarOutlet
            placement="detailPaneTitle"
            className="flex items-center"
          />
        ) : null
      }
      backdrop={<ToolbarOutlet placement="detailPaneBackdrop" />}
      leadingAccessory={
        isLeadingSlotted ? (
          <ToolbarOutlet
            placement="detailPaneLeading"
            className="flex items-center"
          />
        ) : undefined
      }
      trailingAccessory={
        <ToolbarOutlet
          placement="detailPaneTrailing"
          className="flex items-center"
        />
      }
    >
      <ToolbarOutlet placement="detailPane" className="flex flex-1 flex-col" />
    </TrailingDetailPanel>
  )
}

export function PaneFrame({ children }: { readonly children: ReactNode }) {
  return (
    <ToolbarSlotsProvider>
      <div style={{ position: 'relative', height: 720, overflow: 'hidden' }}>
        <PaneHost />
        {children}
      </div>
    </ToolbarSlotsProvider>
  )
}
