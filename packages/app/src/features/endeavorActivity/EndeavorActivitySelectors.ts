/**
 * Derived reads for Endeavor Activity (`RC-5`, `UZF-11`) — the whole screen's
 * view model is one Selector, so the Page forwards it and derives nothing.
 */
import { assertNever } from '@kro/core'
import { endeavorActivityFailureCopy } from './EndeavorActivityException'
import { computedSymbol, displayTitle } from '../../design/endeavor'
import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../../library/store'
import {
  type ActivityRow,
  type ActivityTab,
  activityApplicability,
  activityTabLabel,
  recordCountLabel,
  rowsForTab,
} from './EndeavorActivityRows'

export interface ActivityHeader {
  readonly symbol: string
  readonly title: string
}

export interface ActivitySummary {
  readonly records: string
  readonly totalDuration: number
  readonly totalPoints: number
}

export type EndeavorActivityView =
  | { readonly kind: 'loading' }
  | { readonly kind: 'failed'; readonly message: string }
  | {
      readonly kind: 'unavailable'
      readonly header: ActivityHeader
      readonly title: string
      readonly message: string
    }
  | {
      readonly kind: 'loaded'
      readonly header: ActivityHeader
      readonly tab: ActivityTab
      readonly summary: ActivitySummary | null
      readonly rows: readonly ActivityRow[]
      readonly empty: {
        readonly title: string
        readonly message: string
      } | null
    }

const slice = (state: RootState) => state.endeavorActivity

export const selectActivityTab = createSelector([slice], (s) => s.tab)

export const selectActivitySummary = createSelector(
  [slice],
  (s): ActivitySummary | null => {
    if (s.load.kind !== 'loaded' || s.load.rows.length === 0) return null
    const rows = s.load.rows
    return {
      records: recordCountLabel(rows.length),
      totalDuration: rows.reduce(
        (sum, row) => sum + Math.max(0, row.duration),
        0,
      ),
      totalPoints: rows.reduce((sum, row) => sum + row.rewardPoints, 0),
    }
  },
)

export const selectEndeavorActivityView = createSelector(
  [slice, selectActivitySummary],
  (s, summary): EndeavorActivityView => {
    switch (s.load.kind) {
      case 'idle':
      case 'loading':
        return { kind: 'loading' }
      case 'failed':
        return {
          kind: 'failed',
          message: endeavorActivityFailureCopy(s.load.exception),
        }
      case 'loaded': {
        const { endeavor } = s.load
        // The same symbol resolution every card and Day Progress use: the
        // title's leading emoji, else canon's keyword table, else 📋.
        const header = {
          symbol: computedSymbol(endeavor.title),
          title: displayTitle(endeavor.title),
        }
        const applicability = activityApplicability(endeavor.kind)
        if (applicability === 'behavior') {
          return {
            kind: 'unavailable',
            header,
            title: 'Not supported yet',
            message:
              'Behavior session history will be available in a future update.',
          }
        }
        if (applicability === 'notApplicable') {
          return {
            kind: 'unavailable',
            header,
            title: 'Sessions don’t apply',
            message: 'This kind of endeavor doesn’t record session history.',
          }
        }
        const rows = rowsForTab(s.load.rows, s.tab)
        const empty =
          rows.length > 0
            ? null
            : s.tab === 'all'
              ? {
                  title: 'No activity yet',
                  message: 'Recorded activity will appear here.',
                }
              : {
                  title: `No ${activityTabLabel(s.tab).toLowerCase()} activity`,
                  message: 'Choose another resolution to see its records.',
                }
        return { kind: 'loaded', header, tab: s.tab, summary, rows, empty }
      }
      default:
        return assertNever(s.load)
    }
  },
)
