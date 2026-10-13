/**
 * The landing page's slice (`RC-1`, `RC-2`, `RC-24`, `RC-36`).
 *
 * The page's own interaction state, and nothing else: which section is in
 * view, which FAQ entry is open, the mobile menu, the theme the toggle shows.
 * The early-access form is its own slice (`features/earlyAccess`), so neither
 * imports the other's shape (`RC-20`).
 *
 * Events name intent or signal, never mechanism: `onViewLoaded`,
 * `onSectionViewed`, `userDidOpenFaq`, `userDidOpenNav`, `userDidFollowNavLink`,
 * `userDidRequestPlatform`. A theme change made by the toggle arrives through
 * its Producer's completion event, handled in `extraReducers` — never by a
 * thunk dispatching a reducer.
 *
 * The landing never writes the early-access slice (`RC-1`): a platform the
 * visitor picks is recorded here as a `platformRequest`, and the form's own
 * hook reacts to it by dispatching its own event.
 */
import type { KroPlatform } from '@kro/core'
import { type PayloadAction, createSlice } from '@reduxjs/toolkit'
import { userDidToggleThemeThunk } from './LandingProducer'
import {
  withFaqClosed,
  withFaqOpened,
  withNavClosed,
  withNavOpened,
  withPlatformRequested,
  withSectionViewed,
  withTheme,
  withViewLoaded,
} from './LandingShifters'

export type LandingTheme = 'light' | 'dark'

/**
 * A visitor asked for a platform (a vote, or a pick in the platforms band).
 * `seq` counts the requests, so asking for the same platform twice is two
 * distinct requests a listener can tell apart.
 */
export interface PlatformRequest {
  readonly platform: KroPlatform
  readonly seq: number
}

export interface LandingState {
  readonly activeSectionId: string | null
  readonly faqOpenId: string | null
  readonly navOpen: boolean
  // Redundancy: the document theme as read at mount (onViewLoaded) and after each toggle; a preference changed from another tab is not mirrored until the next mount.
  readonly theme: LandingTheme
  readonly platformRequest: PlatformRequest | null
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
  platformRequest: null,
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

    userDidOpenNav(state) {
      Object.assign(state, withNavOpened(state))
    },

    /** User intent: a link in the menu was followed — the menu closes. */
    userDidFollowNavLink(state) {
      Object.assign(state, withNavClosed(state))
    },

    /** User intent: a platform was voted for or picked in the platforms band. */
    userDidRequestPlatform(
      state,
      action: PayloadAction<{ platform: KroPlatform }>,
    ) {
      Object.assign(
        state,
        withPlatformRequested(state, action.payload.platform),
      )
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
  onViewLoaded,
  userDidCloseFaq,
  userDidFollowNavLink,
  userDidOpenFaq,
  userDidOpenNav,
  userDidRequestPlatform,
} = landingSlice.actions
