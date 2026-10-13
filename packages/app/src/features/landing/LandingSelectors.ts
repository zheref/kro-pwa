/**
 * Derived reads of the landing slice (`RC-5`, `UZF-11`). `RootState` is the
 * only input; nothing here reads a clock, a Service or the DOM.
 */
import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../../library/store'

const slice = (state: RootState) => state.landing

export const selectActiveSectionId = createSelector(
  [slice],
  (s) => s.activeSectionId,
)

export const selectFaqOpenId = createSelector([slice], (s) => s.faqOpenId)

export const selectIsNavOpen = createSelector([slice], (s) => s.navOpen)

export const selectTheme = createSelector([slice], (s) => s.theme)

/** The latest platform the visitor asked for, or `null` before any ask. */
export const selectPlatformRequest = createSelector(
  [slice],
  (s) => s.platformRequest,
)

export const selectHubUrl = createSelector([slice], (s) => s.hubUrl)

/** How many distinct sections the visitor has scrolled through. */
export const selectViewedCount = createSelector(
  [slice],
  (s) => s.viewedSectionIds.length,
)
