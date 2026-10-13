/**
 * Pure state transitions for the landing slice (`RC-4`, `UZF-10`). Each returns
 * a brand-new object; none reads a clock, the DOM or a Service. The reducer
 * applies one as `Object.assign(state, withThing(state, args))`.
 */
import type { LandingState, LandingTheme } from './LandingFeature'

/** The first paint: the resolved theme and the hub link the page was given. */
export function withViewLoaded(
  state: LandingState,
  args: { readonly theme: LandingTheme; readonly hubUrl: string },
): LandingState {
  return { ...state, theme: args.theme, hubUrl: args.hubUrl }
}

/**
 * A section crossed the middle of the viewport. It becomes the active one, and
 * is remembered as viewed the first time only — the list never holds an id
 * twice, which is what keeps `section_view` once-per-section.
 */
export function withSectionViewed(
  state: LandingState,
  id: string,
): LandingState {
  return {
    ...state,
    activeSectionId: id,
    viewedSectionIds: state.viewedSectionIds.includes(id)
      ? state.viewedSectionIds
      : [...state.viewedSectionIds, id],
  }
}

/** One FAQ entry open at a time: opening another replaces the first. */
export function withFaqOpened(state: LandingState, id: string): LandingState {
  return { ...state, faqOpenId: id }
}

export function withFaqClosed(state: LandingState): LandingState {
  return { ...state, faqOpenId: null }
}

export function withNavToggled(state: LandingState): LandingState {
  return { ...state, navOpen: !state.navOpen }
}

/** The theme the document now shows. */
export function withTheme(
  state: LandingState,
  theme: LandingTheme,
): LandingState {
  return { ...state, theme }
}
