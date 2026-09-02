/**
 * The Settings feature (KC-IS-#32) — the hub, the five schema-driven preference
 * panes, Integrations, the two Account panes, the profile popover and the auth
 * surface's presentation.
 *
 * A pure re-export barrel. Everything it names is defined in this folder; the
 * only thing that reaches beyond it is `apps/web`'s `/adjust` route, which
 * mounts `SettingsHubPage`.
 */
export {
  SettingsHubGroup,
  SettingsPaneKind,
  SettingsSectionId,
  type SettingsSection,
  settingsPaneKind,
  settingsSectionForId,
  settingsSectionTitle,
  settingsSections,
  settingsSectionsIn,
  preferencesHubSectionsFor,
} from './SettingsSection'
export {
  DEFAULT_STEPPER_BOUNDS,
  OTHER_SUBGROUP_ID,
  type SettingChoice,
  type SettingControl,
  type SettingElement,
  type SettingSubgroup,
  settingChoiceLabel,
  settingControlFor,
  settingElementsFor,
  settingLabel,
  settingSubgroupsFor,
  settingSubgroupsForAppearance,
} from './SettingsElements'
export {
  IntegrationAction,
  IntegrationId,
  type IntegrationRow,
  type IntegrationRowsInput,
  googleIntegrationSubtitle,
  integrationRows,
} from './SettingsIntegrations'
export {
  type SettingsException,
  SettingsExceptions,
} from './SettingsException'
export {
  SUBSCRIPTION_PLAN_NAME,
  type AuthPresentationState,
  type GoogleConnectionState,
  type GoogleIntegrationState,
  type SettingsLoadState,
  type SettingsPaneState,
  type SettingsState,
  initialSettingsState,
} from './SettingsState'
export {
  childAuthDelegatedSignedIn,
  settingsSlice,
  userDidDismissAuth,
  userDidTapBackToHub,
  userDidTapSection,
  userDidTapSignIn,
} from './SettingsFeature'
export {
  type SettingWriteResult,
  type SettingsSnapshot,
  connectGoogleThunk,
  disconnectGoogleThunk,
  loadGoogleConnectionThunk,
  loadSettingsThunk,
  updateSettingThunk,
} from './SettingsProducer'
export {
  type SettingsSyncFooter,
  accountHubSections,
  preferencesHubSections,
  profileHubSection,
  selectAuthPresentation,
  selectGoogleIntegration,
  selectIntegrationRows,
  selectIsAuthPresented,
  selectIsAppearanceThemesEnabled,
  selectIsSettingsEditable,
  selectIsSettingsLoaded,
  selectOpenSection,
  selectPreferencesHubSections,
  selectSettingValues,
  selectSettingsErrorCopy,
  selectSettingsException,
  selectSettingsLoad,
  selectSettingsPane,
  selectSettingsSyncFooter,
  selectWorkingHoursValid,
  settingValueIn,
} from './SettingsSelectors'
export { applyStoredAppearance } from './applyStoredAppearance'
export { SettingsMocks, defaultSettingValues } from './SettingsMocks'

// --- the render tier -------------------------------------------------------
export { SettingsHubPage } from './pages/SettingsHubPage'
export { ProfileControlPage } from './pages/ProfileControlPage'
export {
  type SettingsHubFragmentProps,
  SettingsHubFragment,
} from './pages/SettingsHubFragment'
export {
  type PreferencesSectionFragmentProps,
  PreferencesSectionFragment,
} from './pages/PreferencesSectionFragment'
export {
  type IntegrationsSectionFragmentProps,
  IntegrationsSectionFragment,
} from './pages/IntegrationsSectionFragment'
export {
  type AccountPane,
  type AccountSectionFragmentProps,
  AccountSectionFragment,
} from './pages/AccountSectionFragment'
export {
  type ProfilePopoverFragmentProps,
  ProfilePopoverFragment,
} from './pages/ProfilePopoverFragment'
