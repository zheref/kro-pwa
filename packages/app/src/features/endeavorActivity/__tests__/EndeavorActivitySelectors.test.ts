import { describe, expect, it } from 'vitest'
import type { RootState } from '../../../library/store'
import type { EndeavorActivityState } from '../EndeavorActivityFeature'
import { EndeavorActivityMocks } from '../EndeavorActivityMocks'
import {
  selectActivitySummary,
  selectActivityTab,
  selectEndeavorActivityView,
} from '../EndeavorActivitySelectors'

const rootWith = (endeavorActivity: EndeavorActivityState) =>
  ({ endeavorActivity }) as unknown as RootState

describe('selectActivityTab', () => {
  it('starts on All', () =>
    expect(selectActivityTab(rootWith(EndeavorActivityMocks.idle))).toBe('all'))
  it('reads the chosen resolution', () =>
    expect(
      selectActivityTab(rootWith(EndeavorActivityMocks.loadedManyCompleteTab)),
    ).toBe('complete'))
  it('reads the tab even while loading', () =>
    expect(selectActivityTab(rootWith(EndeavorActivityMocks.loading))).toBe(
      'all',
    ))
})

describe('selectActivitySummary', () => {
  it('totals records, time and points', () => {
    expect(
      selectActivitySummary(rootWith(EndeavorActivityMocks.loadedMany)),
    ).toEqual({
      records: '4 records',
      totalDuration: 1500 + 3900 + 45,
      totalPoints: 40,
    })
  })
  it('uses the singular for one record', () =>
    expect(
      selectActivitySummary(rootWith(EndeavorActivityMocks.loadedSingle))
        ?.records,
    ).toBe('1 record'))
  it('is absent when there are no rows or nothing loaded', () => {
    expect(
      selectActivitySummary(rootWith(EndeavorActivityMocks.loadedEmpty)),
    ).toBeNull()
    expect(
      selectActivitySummary(rootWith(EndeavorActivityMocks.loading)),
    ).toBeNull()
  })
})

describe('selectEndeavorActivityView', () => {
  it('filters rows by the selected tab', () => {
    const view = selectEndeavorActivityView(
      rootWith(EndeavorActivityMocks.loadedManyCompleteTab),
    )
    expect(
      view.kind === 'loaded' && view.rows.map((r) => r.resolution),
    ).toEqual(['complete', 'complete'])
  })
  it('gives All-tab and filtered empty copy', () => {
    const all = selectEndeavorActivityView(
      rootWith(EndeavorActivityMocks.loadedEmpty),
    )
    const filtered = selectEndeavorActivityView(
      rootWith(EndeavorActivityMocks.abortedOnlyFinishedTab),
    )
    expect(all.kind === 'loaded' && all.empty?.title).toBe('No activity yet')
    expect(filtered.kind === 'loaded' && filtered.empty?.title).toBe(
      'No finished activity',
    )
  })
  it('explains unsupported kinds', () => {
    const reminder = selectEndeavorActivityView(
      rootWith(EndeavorActivityMocks.reminder),
    )
    const behavior = selectEndeavorActivityView(
      rootWith(EndeavorActivityMocks.behavior),
    )
    expect(reminder.kind === 'unavailable' && reminder.title).toBe(
      'Sessions don’t apply',
    )
    expect(behavior.kind === 'unavailable' && behavior.title).toBe(
      'Not supported yet',
    )
  })
  it('maps idle/loading to loading and a failure to its message', () => {
    expect(
      selectEndeavorActivityView(rootWith(EndeavorActivityMocks.idle)).kind,
    ).toBe('loading')
    const failed = selectEndeavorActivityView(
      rootWith(EndeavorActivityMocks.failed),
    )
    expect(failed.kind === 'failed' && failed.message).toContain('missing')
  })
  it('carries the header for a habit and a non-ASCII title', () => {
    const habit = selectEndeavorActivityView(
      rootWith(EndeavorActivityMocks.loadedHabit),
    )
    const unicode = selectEndeavorActivityView(
      rootWith(EndeavorActivityMocks.loadedUnicode),
    )
    // The shared symbol resolution: no leading emoji and no keyword match in
    // "Morning stretch" falls back to canon's 📋.
    expect(habit.kind === 'loaded' && habit.header.symbol).toBe('📋')
    expect(unicode.kind === 'loaded' && unicode.header.title).toBe(
      '日本語の勉強 🌸 Ñandú',
    )
  })
})
