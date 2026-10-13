/**
 * Canned `LandingState` variants and Fragment props (`RC-31`, `UZF-18`).
 *
 * Stories, render tests and selector tests read from here; the page's `State`
 * is never built inline. `makeLandingStore` is the one way a story or test
 * gets a store: through `makeStore`, never a second `configureStore` (`RC-22`).
 */
import { makeEarlyAccessStore } from '../earlyAccess/EarlyAccessMocks'
import { LANDING_SECTION_IDS } from './LandingSections'
import { type LandingState, initialLandingState } from './LandingFeature'

export const landingStateMocks = {
  /** First paint, before the page has seen anything. */
  initial: initialLandingState,

  /** A reader part-way down: three sections seen, a FAQ entry open. */
  midPage: {
    ...initialLandingState,
    activeSectionId: LANDING_SECTION_IDS.platforms,
    faqOpenId: 'free',
    viewedSectionIds: [
      LANDING_SECTION_IDS.top,
      LANDING_SECTION_IDS.loop,
      LANDING_SECTION_IDS.platforms,
    ],
  } satisfies LandingState,

  /** The mobile menu open. */
  navOpen: {
    ...initialLandingState,
    navOpen: true,
    activeSectionId: LANDING_SECTION_IDS.focus,
    viewedSectionIds: [LANDING_SECTION_IDS.top, LANDING_SECTION_IDS.focus],
  } satisfies LandingState,

  /** Dark theme, with the hub on its own origin. */
  dark: {
    ...initialLandingState,
    theme: 'dark',
    hubUrl: 'https://app.kro.example',
  } satisfies LandingState,
}

const noop = (): void => undefined

/** Every callback as a no-op — a story's starting point. */
export const noopLandingCallbacks = {
  onToggleTheme: noop,
  onOpenHub: noop,
  onGetEarlyAccess: noop,
  onPickPlatform: noop,
  onVotePlatform: noop,
  onFaqOpen: noop,
  onFaqClose: noop,
  onOutbound: noop,
  onNavigate: noop,
  onOpenMenu: noop,
}

/** The Fragment's value props, read from a state mock. */
export const landingValueProps = (state: LandingState) => ({
  activeSectionId: state.activeSectionId,
  faqOpenId: state.faqOpenId,
  theme: state.theme,
  hubUrl: state.hubUrl,
})

/**
 * The landing's store: the early-access form's store (the page composes it),
 * on the stubbed extra. A test that asserts on what was sent passes recording
 * doubles through `overrides`.
 */
export const makeLandingStore = makeEarlyAccessStore
