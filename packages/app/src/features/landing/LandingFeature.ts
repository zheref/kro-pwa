/**
 * The landing page's slice (`RC-1`, `RC-2`, `RC-24`, `RC-36`).
 *
 * The page's own interaction state, and nothing else: which section is in
 * view, which FAQ entry is open, the mobile menu, the theme the toggle shows.
 * The early-access form is its own slice (`features/earlyAccess`), so neither
 * imports the other's shape (`RC-20`).
 *
 * Events name intent or signal, never mechanism: `onViewLoaded`,
 * `onSectionViewed`, `userDidOpenFaq`, `userDidToggleNav`, `onThemeApplied`.
 * A theme change made by the toggle arrives through its Producer's completion
 * event, handled in `extraReducers` — never by a thunk dispatching a reducer.
 */
import { type PayloadAction, createSlice } from '@reduxjs/toolkit'
import { userDidToggleThemeThunk } from './LandingProducer'
import {
  withFaqClosed,
  withFaqOpened,
  withNavToggled,
  withSectionViewed,
  withTheme,
  withViewLoaded,
} from './LandingShifters'

export type LandingTheme = 'light' | 'dark'

export interface LandingState {
  readonly activeSectionId: string | null
  readonly faqOpenId: string | null
  readonly navOpen: boolean
  readonly theme: LandingTheme
  readonly viewedSectionIds: readonly string[]
  readonly hubUrl: string
}

/** The hub (the app itself) lives at `/my-day`; `apps/web` passes the real host. */
export const DEFAULT_HUB_URL = '/my-day'

export const initialLandingState: LandingState = {
  activeSectionId: null,
  faqOpenId: null,
  navOpen: false,
  theme: 'light',
  viewedSectionIds: [],
  hubUrl: DEFAULT_HUB_URL,
}

export const landingSlice = createSlice({
  name: 'landing',
  initialState: initialLandingState,
  reducers: {
    /** Lifecycle signal: the page mounted and knows its theme and hub link. */
    onViewLoaded(
      state,
      action: PayloadAction<{ theme: LandingTheme; hubUrl: string }>,
    ) {
      Object.assign(state, withViewLoaded(state, action.payload))
    },

    /** Lifecycle signal: a section crossed the viewport's middle band. */
    onSectionViewed(state, action: PayloadAction<{ id: string }>) {
      Object.assign(state, withSectionViewed(state, action.payload.id))
    },

    userDidOpenFaq(state, action: PayloadAction<{ id: string }>) {
      Object.assign(state, withFaqOpened(state, action.payload.id))
    },

    userDidCloseFaq(state) {
      Object.assign(state, withFaqClosed(state))
    },

    userDidToggleNav(state) {
      Object.assign(state, withNavToggled(state))
    },

    /** Lifecycle signal: the document's theme was read or changed elsewhere. */
    onThemeApplied(state, action: PayloadAction<{ theme: LandingTheme }>) {
      Object.assign(state, withTheme(state, action.payload.theme))
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(userDidToggleThemeThunk.fulfilled, (state, action) => {
        // The payload is a `Result`, never a bare value (`RC-26`). A failed
        // write leaves the toggle where it was: the page did not change.
        if (action.payload.ok) {
          Object.assign(state, withTheme(state, action.payload.value))
        }
      })
      // Defensive only — the payload creator catches everything. Nothing on
      // the page depends on the toggle, so there is no state to shift into.
      .addCase(userDidToggleThemeThunk.rejected, () => undefined)
  },
})

export const {
  onSectionViewed,
  onThemeApplied,
  onViewLoaded,
  userDidCloseFaq,
  userDidOpenFaq,
  userDidToggleNav,
} = landingSlice.actions
