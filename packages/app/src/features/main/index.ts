export {
  ALL_DO_SURFACE_IDIOMS,
  ALL_DO_SURFACE_WIDTHS,
  DoSurfaceIdiom,
  DoSurfaceWidth,
  POINTER_CONTROL_SIDE,
  POINTER_CONTROL_SPACING,
  REGULAR_WIDTH_BREAKPOINT,
  SSR_DEFAULT_SURFACE,
  TOUCH_CONTROL_SIDE,
  TOUCH_CONTROL_SPACING,
  type DoSurface,
  type DoSurfaceLayout,
  type PointerKind,
  type ShellShape,
  type SurfaceObservation,
  doSurfaceLayout,
  resolveDoSurface,
  shellShapeFor,
} from './DoSurfaceLayout'
export {
  ALL_SIMPLE_DESTINATIONS,
  DESTINATION_SF_SYMBOL,
  DestinationKind,
  type ListDestination,
  type SidebarDestination,
  type SimpleDestination,
  destinationBottomEnforced,
  destinationForKind,
  destinationHeading,
  destinationIcon,
  destinationId,
  destinationPath,
  destinationTabLabel,
  destinationTitle,
  isSameDestination,
} from './SidebarDestination'
export {
  type DestinationGates,
  type NavigationElement,
  type NavigationModelInput,
  type NavigationSection,
  closedDestinationGates,
  flattenSections,
  initialElement,
  listDestination,
  searchDestination,
  sidebarSections,
  tabBarElements,
} from './NavigationSections'
export {
  PRESENTATION_SIZE,
  type Presentation,
  type PresentationKind,
  type PresentationSize,
  PresentationSurface,
  presentationFor,
  presentationStyle,
} from './MainPresentation'
export { type MainException, MainExceptions } from './MainException'
export {
  type MainLoadState,
  type MainState,
  type PendingShellRoute,
  type ShellRouteContext,
  initialMainState,
  mainSlice,
  onDestinationRouteMounted,
  onShellMounted,
  onShellRouteContextConsumed,
  onSurfaceChanged,
  userDidCancelAddProject,
  userDidChangeSearchQuery,
  userDidEditDraftProjectTitle,
  userDidTapAddProject,
  userDidTapDestination,
  userDidToggleSidebar,
} from './MainFeature'
export {
  createProjectThunk,
  deleteProjectThunk,
  deliverCaptureRouteThunk,
  loadShellThunk,
  navigateToDestinationThunk,
} from './MainProducer'
export {
  selectCanManageProjects,
  selectDraftProjectTitle,
  selectIsAddingProject,
  selectIsSelectionReachable,
  selectIsShellLoading,
  selectIsSidebarVisible,
  selectLayout,
  selectPendingShellRoute,
  selectProjects,
  selectSearchQuery,
  selectSelectedDestination,
  selectSelectedHeading,
  selectSelectedTitle,
  selectShellException,
  selectShellOwnsProfileControls,
  selectShellRouteContext,
  selectShellShape,
  selectSidebarSections,
  selectSurface,
  selectTabBarElements,
} from './MainSelectors'
export {
  TOOLBAR_PLACEMENTS,
  type ToolbarPlacement,
  ToolbarOutlet,
  ToolbarSlot,
  ToolbarSlotsProvider,
  useToolbarOutletPresent,
} from './ToolbarSlots'
export {
  type MainShellPageProps,
  MainShellPage,
} from './MainShellPage'
export { type DestinationPageProps, DestinationPage } from './DestinationPage'
export {
  type DestinationPlaceholderFragmentProps,
  DestinationPlaceholderFragment,
} from './DestinationPlaceholderFragment'
export {
  type MainShellFragmentProps,
  MainShellFragment,
} from './MainShellFragment'
export {
  SIDEBAR_IDEAL_WIDTH,
  SIDEBAR_MIN_WIDTH,
  type SidebarFragmentProps,
  SidebarFragment,
} from './SidebarFragment'
export { type TabBarFragmentProps, TabBarFragment } from './TabBarFragment'
export { useSurfaceLayout } from './useSurfaceLayout'
